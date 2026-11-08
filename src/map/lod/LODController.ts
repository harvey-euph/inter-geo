import type { Map as MapLibreMap } from 'maplibre-gl';
import type { GeographicDataManager } from '../data/GeographicDataManager';
import { FeatureRegistry, type CanonicalFeatureProperties } from '../data/FeatureRegistry';
import { hasCountryL2Sync } from '../../data/geoIndexClient';
import { hasL3ForSubdivision, isSouthAmerica } from '../../data/l3Manifest';
import { getCsvLayerById } from '../../layers/csvLayerRegistry';
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

export interface ActiveEntityConstraints {
  lockedAdm0Countries: Set<string>;
  lockedAdm1Subdivisions: Set<string>;
  lockedAdm2Municipalities: Set<string>;
}

/**
 * Determines whether a layer displays visual labels/badges (Text, TextWithStyle, Image, ExtObject),
 * which requires locking administrative levels so that detailed child polygons do not replace or hide the labels.
 *
 * User rule:
 * "當我開啟的 layer 屬於 '有 label 的'，那就不要展示細節行政區，但如果是只有著色的，就要細化行政區，並且繼承母區塊顏色"
 *
 * If a layer is pure coloring (FillWithColor), it does NOT lock levels: detailed administrative divisions
 * will expand normally upon zooming in, inheriting the mother region's color.
 */
export function isLabelLayer(layer: { type?: string; group?: string }): boolean {
  if (
    layer.type === 'Text' ||
    layer.type === 'TextWithStyle' ||
    layer.type === 'Image' ||
    layer.type === 'ExtObject'
  ) {
    return true;
  }
  if (layer.type === 'FillWithColor') {
    return false;
  }
  if (layer.group === 'global-label') {
    return true;
  }
  return false;
}

/**
 * Parses all active layers (activeFilterId, activeTextFilters, activeRegionalFilters, activeInternationalImageFilter)
 * and resolves per-entity level lock constraints.
 *
 * User rule:
 * "當我們用 AMD{x} 的標籤時 (要注意，同一組標籤所顯示的層級可能不同，要以各自的單體角度去思考)
 * 當放大時不可以切換到 AMD{y} 其中 y > x ，這樣我要看的 layer 才會保持顯示。
 * 當開啟的 layer 屬於 '有 label 的'，那就不要展示細節行政區，但如果是只有著色的，就要細化行政區，並且繼承母區塊顏色"
 *
 * - An entity targeted at ADM0 in a label layer (e.g. LK, BD in india-scripts, or TW, US in flags) must NOT switch to ADM1 or ADM2 (y > 0) upon zooming in.
 * - An entity targeted at ADM1 in a label layer (e.g. IN::TN in india-scripts, or JP::13 in jp-area-codes) allows its parent to expand to ADM1,
 *   but must NOT switch to ADM2 (y > 1) upon zooming in.
 * - Coloring layers (FillWithColor) do NOT lock levels, allowing natural LOD expansion with inherited colors.
 */
export function resolveActiveLayerConstraints(
  activeFilterId: string,
  activeTextFilters: Set<string>,
  activeRegionalFilters: Set<string>,
  activeImageFilter: string | null
): ActiveEntityConstraints {
  const lockedAdm0Countries = new Set<string>();
  const lockedAdm1Subdivisions = new Set<string>();
  const lockedAdm2Municipalities = new Set<string>();

  const activeLayerIds = new Set<string>();
  if (activeFilterId && activeFilterId !== 'base' && activeFilterId !== 'none') {
    activeLayerIds.add(activeFilterId);
  }
  if (activeTextFilters) {
    for (const id of activeTextFilters) activeLayerIds.add(id);
  }
  if (activeRegionalFilters) {
    for (const id of activeRegionalFilters) activeLayerIds.add(id);
  }
  if (activeImageFilter) {
    activeLayerIds.add(activeImageFilter);
  }

  for (const layerId of activeLayerIds) {
    const layer = getCsvLayerById(layerId);
    if (!layer || !isLabelLayer(layer)) continue;

    // Collect all raw targets from loaded CSV rows or pre-indexed targetKeys
    const rawTargets: string[] = [];
    if (layer.data && layer.data.rows && layer.data.rows.length > 0) {
      for (const row of layer.data.rows) {
        if (row.unionMembers && row.unionMembers.length > 0) {
          rawTargets.push(...row.unionMembers);
        } else if (row.regionId) {
          if (row.regionId.includes('|')) {
            rawTargets.push(...row.regionId.split('|').map((s) => s.trim()).filter(Boolean));
          } else {
            rawTargets.push(row.regionId);
          }
        }
      }
    } else if (layer.targetKeys && layer.targetKeys.length > 0) {
      for (const k of layer.targetKeys) {
        if (k.includes('|')) {
          rawTargets.push(...k.split('|').map((s) => s.trim()).filter(Boolean));
        } else {
          rawTargets.push(k.trim());
        }
      }
    }

    for (const raw of rawTargets) {
      const isWildcard = /^[A-Z]{2}(::|-)\*$/i.test(raw.trim());
      const clean = isWildcard ? raw.trim().toUpperCase() : raw.trim().replace(/\*+$/, '').trim();
      if (!clean) continue;

      if (isWildcard) {
        const iso = clean.slice(0, 2);
        lockedAdm1Subdivisions.add(`${iso}::*`);
        lockedAdm1Subdivisions.add(`${iso}-*`);
        continue;
      }

      const colonCount = (clean.match(/::/g) || []).length;

      if (colonCount === 0) {
        // Check if this is an ISO-SUB format (e.g. IN-TN, JP-01, US-CA)
        const dashMatch = clean.match(/^([A-Z]{2})-([A-Za-z0-9_-]+)$/);
        if (dashMatch && !clean.startsWith('I-')) {
          const iso = dashMatch[1].toUpperCase();
          const sub = dashMatch[2];
          const upperSub = sub.toUpperCase();

          lockedAdm1Subdivisions.add(`${iso}::${sub}`);
          lockedAdm1Subdivisions.add(`${iso}::${upperSub}`);
          lockedAdm1Subdivisions.add(`${iso}-${sub}`);
          lockedAdm1Subdivisions.add(`${iso}-${upperSub}`);
          lockedAdm1Subdivisions.add(sub);
          lockedAdm1Subdivisions.add(upperSub);
          lockedAdm1Subdivisions.add(FeatureRegistry.createId(1, iso, sub));
          lockedAdm1Subdivisions.add(FeatureRegistry.createId(1, iso, upperSub));

          if (/^\d+$/.test(sub)) {
            const num = String(parseInt(sub, 10));
            const padded = num.padStart(2, '0');
            for (const variant of [num, padded]) {
              lockedAdm1Subdivisions.add(`${iso}::${variant}`);
              lockedAdm1Subdivisions.add(`${iso}-${variant}`);
              lockedAdm1Subdivisions.add(variant);
              lockedAdm1Subdivisions.add(FeatureRegistry.createId(1, iso, variant));
            }
          }
          continue;
        }

        // Check if this is an ADM0 country code or a nationwide subdivision
        const upper = clean.toUpperCase();
        if (/^[A-Z]{2}$/.test(upper)) {
          // If the layer is strictly Nationwide for a single country (e.g. US), and key is CA (California),
          // it's an ADM1 subdivision of US.
          const isNationwideSub =
            layer.rangeKind === 'Nationwide' &&
            layer.targetIso2 &&
            layer.targetIso2 !== '*' &&
            layer.targetIso2 !== upper &&
            (!layer.targetIso2s || layer.targetIso2s.length === 1) &&
            !(layer.targetIso2s && layer.targetIso2s.includes(upper));

          if (isNationwideSub) {
            const iso = layer.targetIso2.toUpperCase();
            lockedAdm1Subdivisions.add(`${iso}::${upper}`);
            lockedAdm1Subdivisions.add(`${iso}-${upper}`);
            lockedAdm1Subdivisions.add(upper);
            lockedAdm1Subdivisions.add(FeatureRegistry.createId(1, iso, upper));
          } else {
            // It is an ADM0 country (e.g. LK, BD, TW, US)
            lockedAdm0Countries.add(upper);
          }
        } else if (layer.targetIso2 && layer.targetIso2 !== '*') {
          // Non-2-letter code in a nationwide layer (e.g. numeric "13" in JP) -> ADM1
          const iso = layer.targetIso2.toUpperCase();
          lockedAdm1Subdivisions.add(`${iso}::${upper}`);
          lockedAdm1Subdivisions.add(`${iso}-${upper}`);
          lockedAdm1Subdivisions.add(upper);
          lockedAdm1Subdivisions.add(FeatureRegistry.createId(1, iso, upper));
        }
      } else if (colonCount === 1) {
        // ADM1 subdivision: e.g. IN::TN or JP::01
        const [targetIso, rawSub] = clean.split('::');
        const iso = targetIso.trim().toUpperCase();
        const sub = rawSub.trim();
        const upperSub = sub.toUpperCase();

        lockedAdm1Subdivisions.add(`${iso}::${sub}`);
        lockedAdm1Subdivisions.add(`${iso}::${upperSub}`);
        lockedAdm1Subdivisions.add(`${iso}-${sub}`);
        lockedAdm1Subdivisions.add(`${iso}-${upperSub}`);
        lockedAdm1Subdivisions.add(sub);
        lockedAdm1Subdivisions.add(upperSub);
        lockedAdm1Subdivisions.add(FeatureRegistry.createId(1, iso, sub));
        lockedAdm1Subdivisions.add(FeatureRegistry.createId(1, iso, upperSub));

        // If sub is code like "IN-TN", also add stripped "TN"
        if (upperSub.startsWith(`${iso}-`)) {
          const stripped = upperSub.slice(iso.length + 1);
          lockedAdm1Subdivisions.add(`${iso}::${stripped}`);
          lockedAdm1Subdivisions.add(stripped);
          lockedAdm1Subdivisions.add(FeatureRegistry.createId(1, iso, stripped));
        } else {
          // If sub is "TN", also add prefixed "IN-TN"
          const prefixed = `${iso}-${upperSub}`;
          lockedAdm1Subdivisions.add(prefixed);
          lockedAdm1Subdivisions.add(FeatureRegistry.createId(1, iso, prefixed));
        }

        // Numeric padding variants (e.g. 1 vs 01)
        if (/^\d+$/.test(sub)) {
          const num = String(parseInt(sub, 10));
          const padded = num.padStart(2, '0');
          for (const variant of [num, padded]) {
            lockedAdm1Subdivisions.add(`${iso}::${variant}`);
            lockedAdm1Subdivisions.add(`${iso}-${variant}`);
            lockedAdm1Subdivisions.add(variant);
            lockedAdm1Subdivisions.add(FeatureRegistry.createId(1, iso, variant));
          }
        }
      } else if (colonCount >= 2) {
        // ADM2 municipality: e.g. ISO::SUB::MUNI
        lockedAdm2Municipalities.add(clean);
      }
    }
  }

  return {
    lockedAdm0Countries,
    lockedAdm1Subdivisions,
    lockedAdm2Municipalities
  };
}

/**
 * Checks whether an ADM1 feature has active features/labels locking it to ADM1,
 * which prevents it from expanding to ADM2 (y > 1) upon zooming in.
 */
export function isAdm1SubdivisionLocked(
  iso: string,
  p: CanonicalFeatureProperties,
  lockedAdm1Subdivisions: Set<string>
): boolean {
  if (lockedAdm1Subdivisions.size === 0) return false;

  const upperIso = iso?.toUpperCase();
  if (
    upperIso &&
    (lockedAdm1Subdivisions.has(`${upperIso}::*`) || lockedAdm1Subdivisions.has(`${upperIso}-*`))
  ) {
    return true;
  }

  const candidates: string[] = [];
  if (p.feature_id) candidates.push(p.feature_id);
  if (p.code) {
    candidates.push(p.code);
    candidates.push(`${iso}::${p.code}`);
    candidates.push(p.code.toUpperCase());
    candidates.push(`${iso}::${p.code.toUpperCase()}`);
  }
  if (p.postal) {
    candidates.push(p.postal);
    candidates.push(`${iso}::${p.postal}`);
    candidates.push(p.postal.toUpperCase());
    candidates.push(`${iso}::${p.postal.toUpperCase()}`);
  }
  if (p.id) {
    const sId = String(p.id);
    candidates.push(sId);
    candidates.push(`${iso}::${sId}`);
  }
  if (p.pref_id) {
    const sPref = String(p.pref_id);
    candidates.push(sPref);
    candidates.push(`${iso}::${sPref}`);
  }

  return candidates.some((c) => lockedAdm1Subdivisions.has(c));
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

      // Resolve per-entity level lock constraints from active layers
      const { lockedAdm0Countries, lockedAdm1Subdivisions } = resolveActiveLayerConstraints(
        this.dataManager.getActiveFilterId(),
        this.dataManager.getActiveTextFilters(),
        this.dataManager.getActiveRegionalFilters(),
        this.dataManager.getActiveInternationalImageFilter()
      );

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

          // Clamping: If this country has active ADM0 labels/features,
          // do NOT switch it to ADM1 (y > 0) upon zooming in.
          if (lockedAdm0Countries.has(iso)) continue;

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

          // Clamping: If this subdivision has active ADM1 labels/features,
          // do NOT switch it to ADM2 (y > 1) upon zooming in.
          if (isAdm1SubdivisionLocked(iso, p, lockedAdm1Subdivisions)) continue;

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
      // unless locked at a coarser level by an active layer
      if (this.focusedCountryIso && hasCountryL2Sync(this.focusedCountryIso) && !lockedAdm0Countries.has(this.focusedCountryIso)) {
        activeAdm1Set.add(this.focusedCountryIso);
        await this.dataManager.ensureAdm1(this.focusedCountryIso);
      }
      if (this.focusedCountryIso && this.focusedSubdivisionCode) {
        const parentId = FeatureRegistry.createId(1, this.focusedCountryIso, this.focusedSubdivisionCode);
        const subMockProps = {
          code: this.focusedSubdivisionCode,
          feature_id: parentId
        } as CanonicalFeatureProperties;
        if (
          !isAdm1SubdivisionLocked(this.focusedCountryIso, subMockProps, lockedAdm1Subdivisions) &&
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
