import type { Map as MapLibreMap } from 'maplibre-gl';
import type { GeographicDataManager } from '../data/GeographicDataManager';
import { FeatureRegistry } from '../data/FeatureRegistry';
import { hasCountryL2Sync } from '../../data/geoIndexClient';
import { hasL3ForSubdivision, isSouthAmerica } from '../../data/l3Manifest';
import { AdministrativeLODManager } from './AdministrativeLODManager';

/**
 * Zoom level thresholds and hysteresis for hierarchical administrative expansion.
 * - Zoom < 3.6: Level 0 (ADM0 National overview)
 * - Zoom 3.6 - 6.8: Level 1 (ADM1 Subdivisions for visible viewport countries)
 * - Zoom >= 6.8: Level 2 (ADM2 Municipalities for visible viewport subdivisions)
 * Hysteresis buffers prevent rapid toggling near thresholds.
 */
export const ADM1_ZOOM_THRESHOLD = 3.6;
export const ADM1_ZOOM_HYSTERESIS = 0.3;
export const ADM2_ZOOM_THRESHOLD = 6.8;
export const ADM2_ZOOM_HYSTERESIS = 0.3;

/**
 * Default viewport margin ratio outward from screen bounds.
 * A margin ratio of 0.8 expands 80% screen width horizontally on each side
 * and 80% screen height vertically on each side (total buffer is 2.6x screen width x 2.6x screen height).
 * This ensures that regions entering the screen during panning are pre-loaded and expanded well in advance,
 * completely eliminating sudden popping or coarseness shifts.
 */
export const DEFAULT_VIEWPORT_MARGIN_RATIO = 0.8;

/**
 * Checks whether a feature's geographic bounding box [minLng, minLat, maxLng, maxLat]
 * intersects the screen viewport bounds [west, south, east, north].
 * Accurately handles world copies (-720, -360, 0, 360, 720) and 2D/3D projections.
 */
export function bboxIntersectsViewport(
  fBbox: [number, number, number, number] | undefined | null,
  west: number,
  south: number,
  east: number,
  north: number
): boolean {
  if (!fBbox || fBbox.length < 4) return false;
  const [fMinX, fMinY, fMaxX, fMaxY] = fBbox;

  // 1. Latitude check
  if (fMinY > north || fMaxY < south) return false;

  // 2. Full world longitude coverage check
  if (east - west >= 360) return true;

  // 3. Normalized longitude overlap across wrapped world copies
  for (const copy of [-720, -360, 0, 360, 720]) {
    const minX = fMinX + copy;
    const maxX = fMaxX + copy;
    if (minX <= east && maxX >= west) {
      return true;
    }
  }

  return false;
}

/**
 * LODController manages camera-driven administrative LOD expansion.
 *
 * Requirements:
 * 1. "有比較細的就要顯示細的": Displays finest available resolution for each region.
 * 2. "應該要用放大倍率來決定是否展開": Driven by zoom scale thresholds with hysteresis.
 * 3. "並且只考慮 bbox 和螢幕有交集的": Only loads and expands regions intersecting the screen viewport.
 * 4. "把螢幕往外 margin 加的範圍都納入": Includes a generous outward buffer margin to prevent sudden popping during movement.
 */
export class LODController {
  private map: MapLibreMap | null = null;
  private dataManager: GeographicDataManager;
  private adminLOD: AdministrativeLODManager;

  private focusedCountryIso: string | null = null;
  private focusedSubdivisionCode: string | null = null;

  private marginRatio = DEFAULT_VIEWPORT_MARGIN_RATIO;
  private wasAdm1Active = false;
  private wasAdm2Active = false;

  private debounceTimer: number | null = null;
  private isSyncing = false;
  private needsResync = false;
  private lastMoveSyncTime = 0;

  private boundOnCameraChange = () => this.scheduleSync(50);
  private boundOnCameraMove = () => {
    const now = Date.now();
    // Throttle during active camera dragging to at most once every 200ms
    if (now - this.lastMoveSyncTime > 200) {
      this.lastMoveSyncTime = now;
      this.scheduleSync(30);
    }
  };

  constructor(dataManager: GeographicDataManager) {
    this.dataManager = dataManager;
    this.adminLOD = new AdministrativeLODManager(dataManager);
  }

  public setMarginRatio(ratio: number): void {
    this.marginRatio = Math.max(0, ratio);
    this.scheduleSync(10);
  }

  public getMarginRatio(): number {
    return this.marginRatio;
  }

  public setMap(map: MapLibreMap | null): void {
    if (this.map) {
      this.map.off('moveend', this.boundOnCameraChange);
      this.map.off('move', this.boundOnCameraMove);
    }
    this.map = map;
    if (this.map) {
      this.map.on('moveend', this.boundOnCameraChange);
      this.map.on('move', this.boundOnCameraMove);
      this.scheduleSync(100);
    }
  }

  public getAdminLODManager(): AdministrativeLODManager {
    return this.adminLOD;
  }

  public setFocusedCountry(iso2: string | null): void {
    this.focusedCountryIso = iso2 ? iso2.toUpperCase() : null;
    this.adminLOD.setFocusedCountry(iso2);
    this.scheduleSync(10);
  }

  public setFocusedSubdivision(iso2: string, code: string | number): void {
    this.focusedCountryIso = iso2.toUpperCase();
    this.focusedSubdivisionCode = String(code);
    this.adminLOD.setFocusedSubdivision(iso2, code);
    this.scheduleSync(10);
  }

  public clearFocusedSubdivision(): void {
    this.focusedSubdivisionCode = null;
    this.scheduleSync(10);
  }

  public clearFocus(): void {
    this.focusedCountryIso = null;
    this.focusedSubdivisionCode = null;
    this.adminLOD.clearFocus();
    this.scheduleSync(10);
  }

  public scheduleSync(delay = 50): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      void this.syncLODWithViewport();
    }, delay);
  }

  /**
   * Synchronizes active ADM levels with current viewport bounds (including outward margin) and zoom scale.
   */
  public async syncLODWithViewport(): Promise<void> {
    if (!this.map) return;
    if (this.isSyncing) {
      this.needsResync = true;
      return;
    }

    this.isSyncing = true;
    try {
      const zoom = this.map.getZoom();
      const bounds = this.map.getBounds();
      const rawWest = bounds.getWest();
      const south = bounds.getSouth();
      const rawEast = bounds.getEast();
      const north = bounds.getNorth();

      // Handle longitude span unwrapping and apply outward buffer margin
      const unwrappedEast = rawEast < rawWest ? rawEast + 360 : rawEast;
      const lonSpan = Math.max(0.1, unwrappedEast - rawWest);
      const latSpan = Math.max(0.1, north - south);

      const lonMargin = lonSpan * this.marginRatio;
      const latMargin = latSpan * this.marginRatio;

      const west = rawWest - lonMargin;
      const east = unwrappedEast + lonMargin;
      const bufferedSouth = Math.max(-85, south - latMargin);
      const bufferedNorth = Math.min(85, north + latMargin);

      const activeAdm1Set = new Set<string>();
      const activeAdm2ParentSet = new Set<string>();

      // 1. Zoom >= ADM1 threshold: expand visible countries in buffered viewport to ADM1
      const adm1Threshold = this.wasAdm1Active
        ? ADM1_ZOOM_THRESHOLD - ADM1_ZOOM_HYSTERESIS
        : ADM1_ZOOM_THRESHOLD;

      if (zoom >= adm1Threshold) {
        const adm0List = this.dataManager.getRegistry().getByLevel(0);
        const visibleIso2s: string[] = [];

        for (const f of adm0List) {
          const iso = f.properties.country_code;
          if (!hasCountryL2Sync(iso)) continue;
          if (bboxIntersectsViewport(f.properties.bbox, west, bufferedSouth, east, bufferedNorth)) {
            visibleIso2s.push(iso);
            activeAdm1Set.add(iso);
          }
        }

        // Ensure ADM1 datasets are loaded in parallel for visible countries
        if (visibleIso2s.length > 0) {
          await Promise.all(visibleIso2s.map((iso) => this.dataManager.ensureAdm1(iso)));
        }
      }

      // 2. Zoom >= ADM2 threshold: expand visible subdivisions in buffered viewport to ADM2
      const adm2Threshold = this.wasAdm2Active
        ? ADM2_ZOOM_THRESHOLD - ADM2_ZOOM_HYSTERESIS
        : ADM2_ZOOM_THRESHOLD;

      if (zoom >= adm2Threshold && activeAdm1Set.size > 0) {
        const adm1List = this.dataManager.getRegistry().getByLevel(1);
        const visibleSubs: { iso: string; code: string }[] = [];

        for (const f of adm1List) {
          const p = f.properties;
          const iso = p.country_code;
          if (!activeAdm1Set.has(iso) || isSouthAmerica(iso)) continue;
          const subId = String(p.code || p.postal || p.id || '');
          if (!subId) continue;

          if (bboxIntersectsViewport(p.bbox, west, bufferedSouth, east, bufferedNorth)) {
            if (
              hasL3ForSubdivision(iso, {
                id: p.id as string | number | undefined,
                code: p.code,
                name: p.name,
                nameEn: p.name_en,
                nameZh: p.name_zh
              })
            ) {
              visibleSubs.push({ iso, code: subId });
              const parentId = FeatureRegistry.createId(1, iso, subId);
              activeAdm2ParentSet.add(parentId);
            }
          }
        }

        // Ensure ADM2 datasets are loaded in parallel for visible subdivisions
        if (visibleSubs.length > 0) {
          await Promise.all(visibleSubs.map((s) => this.dataManager.ensureAdm2(s.iso, s.code)));
        }
      }

      // 3. Selection focus pins: if user explicitly selected a country or subdivision, ensure it stays expanded
      if (this.focusedCountryIso && hasCountryL2Sync(this.focusedCountryIso)) {
        activeAdm1Set.add(this.focusedCountryIso);
        await this.dataManager.ensureAdm1(this.focusedCountryIso);
      }
      if (this.focusedCountryIso && this.focusedSubdivisionCode) {
        const parentId = FeatureRegistry.createId(1, this.focusedCountryIso, this.focusedSubdivisionCode);
        if (
          hasL3ForSubdivision(this.focusedCountryIso, {
            id: this.focusedSubdivisionCode,
            code: this.focusedSubdivisionCode
          })
        ) {
          activeAdm2ParentSet.add(parentId);
          await this.dataManager.ensureAdm2(this.focusedCountryIso, this.focusedSubdivisionCode);
        }
      }

      this.wasAdm1Active = activeAdm1Set.size > 0;
      this.wasAdm2Active = activeAdm2ParentSet.size > 0;

      // Apply to GeographicDataManager
      await this.dataManager.setActiveDisplayLevels(
        Array.from(activeAdm1Set),
        Array.from(activeAdm2ParentSet)
      );
    } catch (err) {
      console.warn('[LODController] syncLODWithViewport error:', err);
    } finally {
      this.isSyncing = false;
      if (this.needsResync) {
        this.needsResync = false;
        this.scheduleSync(20);
      }
    }
  }
}
