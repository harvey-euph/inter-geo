import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point, Geometry, LineString } from 'geojson';
import * as flatgeobuf from 'flatgeobuf';
import { FlatGeobufLoader } from './FlatGeobufLoader';
import { FeatureRegistry, type CanonicalFeature } from './FeatureRegistry';
import { normalizeAntimeridianGeometry } from '../geo/antimeridian';
import { AdministrativeHierarchy, cleanAdminText } from './AdministrativeHierarchy';
import {
  getCsvLayerById,
  getCsvLayerValue,
  getCsvLayerRow,
  getCsvSubdivisionValue,
  getCsvSubdivisionRow,
  getCsvSubdivisionCode,
  loadOnDemandCsvLayer,
  type RegisteredCsvLayer
} from '../../layers/csvLayerRegistry';
import { findCountry } from '../../data/countries';
import { isSouthAmerica, resolveExtObjectFile } from '../../data/geoIndexClient';
import { getCombinedTextOverlay } from '../../data/globalLayers';
import { getCrossingSign } from '../../data/pedestrianCrossing';
import { getDataUrl } from '../../data/dataSource';
import { resolveAdminCenter } from '../geo/adminCenterAnchors';
import { MAP_COLORS } from '../theme';

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex;
  }
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(56, 189, 248, ${alpha})`;
}

export interface DataManagerOptions {
  onDataLoaded?: (level: 0 | 1 | 2, count: number) => void;
}

/**
 * GeographicDataManager manages data ingestion, layer sources,
 * and data-driven attribute decoration for MapLibre GL JS.
 */
export class GeographicDataManager {
  private loader: FlatGeobufLoader;
  private registry: FeatureRegistry;
  private map: MapLibreMap | null = null;
  private loadedAdm1Countries = new Set<string>();
  private loadedAdm2Subdivisions = new Set<string>();
  private activeAdm1Countries = new Set<string>();
  private activeAdm2ParentIds = new Set<string>();
  private activeFilterId = 'base';
  private activeTextFilters = new Set<string>();
  private activeInternationalImageFilter: string | null = null;
  private activeRegionalFilters = new Set<string>();
  private showRoads = false;
  private loadedRoadFeatures = new Map<string, Feature[]>();
  private loadedImageIcons = new Set<string>();
  private loadedExtFeatures = new Map<
    string,
    { polygons: CanonicalFeature[]; innerGrids: Feature<LineString>[]; labels: Feature<Point>[] }
  >();
  private activeExtPolygons: CanonicalFeature[] = [];
  private activeExtInnerGrids: Feature<LineString>[] = [];
  private activeExtLabels: Feature<Point>[] = [];
  private onDataLoaded?: (level: 0 | 1 | 2, count: number) => void;
  private onLayersChanged?: () => void;

  constructor(options?: DataManagerOptions) {
    this.loader = new FlatGeobufLoader();
    this.registry = new FeatureRegistry();
    this.onDataLoaded = options?.onDataLoaded;
  }

  public setMap(map: MapLibreMap | null): void {
    this.map = map;
    if (this.map) {
      this.refreshAllSources();
      this.updateExtSources();
      void this.updateTextMarkers();
      void this.updateImageMarkers();
    }
  }

  public getRegistry(): FeatureRegistry {
    return this.registry;
  }

  public getLoader(): FlatGeobufLoader {
    return this.loader;
  }

  /**
   * Initializes ADM0 global countries.
   */
  public async loadAdm0(): Promise<void> {
    const features = await this.loader.loadAdm0();
    this.registry.registerAll(features);
    this.updateSource('adm0-source', 0);
    this.updateLabelSource();
    void this.updateTextMarkers();
    void this.updateImageMarkers();
    this.onDataLoaded?.(0, features.length);
  }

  /**
   * Loads ADM1 for a country if not already loaded.
   */
  public async ensureAdm1(iso2: string): Promise<CanonicalFeature[]> {
    const cleanIso = iso2.toUpperCase();
    if (this.loadedAdm1Countries.has(cleanIso)) {
      return this.registry.getByLevel(1).filter((f) => f.properties.country_code === cleanIso);
    }

    try {
      const features = await this.loader.loadAdm1(cleanIso);
      this.registry.registerAll(features);
      this.loadedAdm1Countries.add(cleanIso);
      this.updateSource('adm0-source', 0);
      this.updateSource('adm1-source', 1);
      this.updateLabelSource();
      void this.updateTextMarkers();
      void this.updateImageMarkers();
      this.onDataLoaded?.(1, features.length);
      return features;
    } catch (err) {
      console.warn(`[GeographicDataManager] Failed to load ADM1 for ${cleanIso}:`, err);
      return [];
    }
  }

  /**
   * Loads ADM2 for a subdivision if not already loaded.
   */
  public async ensureAdm2(iso2: string, subIdOrCode: string | number): Promise<CanonicalFeature[]> {
    const cleanIso = iso2.toUpperCase();
    if (isSouthAmerica(cleanIso)) return [];
    const sub = String(subIdOrCode).trim();
    const key = `${cleanIso}_${sub}`;
    if (this.loadedAdm2Subdivisions.has(key)) {
      const parentId = FeatureRegistry.createId(1, cleanIso, sub);
      return this.registry.getChildren(parentId);
    }

    try {
      const features = await this.loader.loadAdm2(cleanIso, sub);
      this.loadedAdm2Subdivisions.add(key);
      if (features.length > 0) {
        this.registry.registerAll(features);
        this.updateSource('adm1-source', 1);
        this.updateSource('adm2-source', 2);
        this.updateLabelSource();
        void this.updateTextMarkers();
        this.onDataLoaded?.(2, features.length);
      }
      return features;
    } catch (err) {
      console.warn(`[GeographicDataManager] Failed to load ADM2 for ${cleanIso}/${sub}:`, err);
      return [];
    }
  }

  /**
   * Loads and displays roads for a country.
   */
  public async ensureRoads(iso2: string): Promise<void> {
    const cleanIso = iso2.toUpperCase();
    if (this.loadedRoadFeatures.has(cleanIso)) {
      const features = this.loadedRoadFeatures.get(cleanIso)!;
      if (this.map) {
        const source = this.map.getSource('roads-source') as GeoJSONSource | undefined;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features
          });
        }
        if (this.map.getLayer('roads-line')) {
          this.map.setLayoutProperty('roads-line', 'visibility', this.showRoads ? 'visible' : 'none');
        }
      }
      return;
    }

    try {
      const url = getDataUrl(`data/${cleanIso}-roads.fgb`);
      const res = await fetch(url);
      if (!res.ok) {
        this.clearRoads();
        return;
      }
      const buffer = await res.arrayBuffer();
      const it = (await import('flatgeobuf')).geojson.deserialize(new Uint8Array(buffer));
      const features: Feature[] = [];
      let roadIdx = 0;
      for await (const feat of it) {
        if (feat.geometry) {
          feat.geometry = normalizeAntimeridianGeometry(feat.geometry);
        }
        feat.id = roadIdx++;
        features.push(feat);
      }
      this.loadedRoadFeatures.set(cleanIso, features);
      if (this.map) {
        const source = this.map.getSource('roads-source') as GeoJSONSource | undefined;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features
          });
        }
        if (this.map.getLayer('roads-line')) {
          this.map.setLayoutProperty('roads-line', 'visibility', this.showRoads ? 'visible' : 'none');
        }
      }
    } catch (err) {
      console.warn(`[GeographicDataManager] Failed to load roads for ${cleanIso}:`, err);
      this.clearRoads();
    }
  }

  /**
   * Clears currently rendered road network.
   */
  public clearRoads(): void {
    if (this.map) {
      const source = this.map.getSource('roads-source') as GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: []
        });
      }
    }
  }

  /**
   * Filters displayed road classes based on active road layers (e.g. freeways vs provincial).
   */
  public updateRoadFilter(activeRegionalFilters: Set<string>, countryIso2: string): void {
    if (!this.map || !this.map.getLayer('roads-line')) return;
    const cleanIso = countryIso2.toUpperCase();
    const lower = countryIso2.toLowerCase();

    const hasInterstate =
      activeRegionalFilters.has(`${lower}-interstates`) ||
      activeRegionalFilters.has(`roads-${cleanIso}-expressway`) ||
      activeRegionalFilters.has(`roads-${cleanIso}-interstates`) ||
      (cleanIso === 'US' && activeRegionalFilters.has('us-interstates'));

    const hasHighway =
      activeRegionalFilters.has(`${lower}-highways`) ||
      activeRegionalFilters.has(`roads-${cleanIso}-primary`) ||
      activeRegionalFilters.has(`roads-${cleanIso}-highways`) ||
      (cleanIso === 'US' && (activeRegionalFilters.has('us-numbered-highways') || activeRegionalFilters.has('us-routes')));

    const hasGeneral =
      activeRegionalFilters.has(`roads-${cleanIso}`) ||
      activeRegionalFilters.has(`roads-${lower}`) ||
      activeRegionalFilters.has('roads-highways') ||
      activeRegionalFilters.has('roads-numbered') ||
      activeRegionalFilters.has('roads');

    if (hasGeneral || (hasInterstate && hasHighway)) {
      this.map.setFilter('roads-line', null);
    } else if (hasInterstate) {
      this.map.setFilter('roads-line', ['==', ['get', 'class'], 'Interstate']);
    } else if (hasHighway) {
      this.map.setFilter('roads-line', ['!=', ['get', 'class'], 'Interstate']);
    } else {
      this.map.setFilter('roads-line', null);
    }
  }

  public setOnLayersChanged(cb: () => void): void {
    this.onLayersChanged = cb;
  }

  public getActiveFilterId(): string {
    return this.activeFilterId;
  }

  public getActiveTextFilters(): Set<string> {
    return this.activeTextFilters;
  }

  public getActiveRegionalFilters(): Set<string> {
    return this.activeRegionalFilters;
  }

  public getActiveInternationalImageFilter(): string | null {
    return this.activeInternationalImageFilter;
  }

  /**
   * Sets active filter id and updates fill colors.
   */
  public async setActiveFilterId(filterId: string): Promise<void> {
    this.activeFilterId = filterId;
    if (filterId && filterId !== 'base' && filterId !== 'none') {
      try {
        await loadOnDemandCsvLayer(filterId);
      } catch (err) {
        console.warn(`[GeographicDataManager] Failed to load CSV for ${filterId}:`, err);
      }
    }
    this.refreshAllSources();
    this.onLayersChanged?.();
  }

  /**
   * Sets active global text filters (calling codes, tld, etc.) and updates text badges.
   */
  public async setActiveTextFilters(filters: Set<string>): Promise<void> {
    this.activeTextFilters = new Set(filters);
    for (const id of filters) {
      try {
        await loadOnDemandCsvLayer(id);
      } catch (err) {
        console.warn(`[GeographicDataManager] Failed to load text filter CSV for ${id}:`, err);
      }
    }
    await this.updateTextMarkers();
    this.onLayersChanged?.();
  }

  /**
   * Sets active regional filters (area codes, nationwide features).
   */
  public async setActiveRegionalFilters(filters: Set<string>): Promise<void> {
    this.activeRegionalFilters = new Set(filters);
    for (const id of filters) {
      try {
        await loadOnDemandCsvLayer(id);
      } catch (err) {
        console.warn(`[GeographicDataManager] Failed to load regional filter CSV for ${id}:`, err);
      }
    }
    await this.updateExtFeatures();
    this.refreshAllSources();
    await this.updateTextMarkers();
    this.onLayersChanged?.();
  }

  /**
   * Sets active international image filter (e.g. pedestrian crossing signs).
   */
  public async setActiveInternationalImageFilter(filterId: string | null): Promise<void> {
    this.activeInternationalImageFilter = filterId;
    if (filterId) {
      try {
        await loadOnDemandCsvLayer(filterId);
      } catch (err) {
        console.warn(`[GeographicDataManager] Failed to load image filter CSV for ${filterId}:`, err);
      }
    }
    await this.updateImageMarkers();
    this.onLayersChanged?.();
  }

  /**
   * Controls road layer visibility.
   */
  public setShowRoads(show: boolean): void {
    this.showRoads = show;
    if (this.map && this.map.getLayer('roads-line')) {
      this.map.setLayoutProperty('roads-line', 'visibility', show ? 'visible' : 'none');
    }
  }

  /**
   * Resolves fill color for a feature based on active filter.
   * Matches main branch theme: solid color with MAP_COLORS.defaultFill (#232a38).
   */
  private resolveFillColor(feature: CanonicalFeature): string {
    const p = feature.properties;
    const iso2 = p.country_code;

    const extractColor = (
      csvLayer: RegisteredCsvLayer,
      raw: string | null | undefined,
      explicitInterior?: string
    ): string | null => {
      if (explicitInterior) {
        if (explicitInterior.startsWith('#') || explicitInterior.startsWith('rgb')) return explicitInterior;
        if (csvLayer.legend && csvLayer.legend.length > 0) {
          const match = csvLayer.legend.find((l) => l.key.toLowerCase() === explicitInterior.toLowerCase());
          if (match && match.color) return match.color;
        }
        return explicitInterior;
      }
      if (!raw) return null;
      const trimmed = raw.trim();
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        const col = (parts[1] || parts[0]).trim();
        if (csvLayer.legend && csvLayer.legend.length > 0) {
          const match = csvLayer.legend.find((l) => l.key.toLowerCase() === col.toLowerCase());
          if (match && match.color) return match.color;
        }
        return col;
      }
      if (trimmed.startsWith('#') || trimmed.startsWith('rgb')) {
        return trimmed;
      }
      if (csvLayer.legend && csvLayer.legend.length > 0) {
        const match = csvLayer.legend.find((l) => l.key.toLowerCase() === trimmed.toLowerCase());
        if (match && match.color) return match.color;
      }
      return trimmed;
    };

    // 1. Check primary activeFilterId
    const csvLayer = getCsvLayerById(this.activeFilterId);
    if (csvLayer && csvLayer.data) {
      if (p.admin_level === 0) {
        const row = getCsvLayerRow(csvLayer.id, iso2);
        const col = extractColor(csvLayer, row?.value || getCsvLayerValue(csvLayer.id, iso2), row?.colorInterior);
        if (col) return col;
      } else if (p.admin_level === 1) {
        const subId = p.code || p.postal || String(p.pref_id || '');
        const subRow = getCsvSubdivisionRow(csvLayer.id, {
          id: subId,
          iso2,
          code: subId,
          postal: p.postal,
          name: p.name,
          nameEn: p.name_en,
          nameZh: p.name_zh
        });
        const countryRow = getCsvLayerRow(csvLayer.id, iso2);
        const val = subRow?.value || countryRow?.value || getCsvLayerValue(csvLayer.id, iso2);
        const explicit = subRow?.colorInterior || countryRow?.colorInterior;
        const col = extractColor(csvLayer, val, explicit);
        if (col) return col;
      } else if (p.admin_level === 2) {
        const muniCode = p.code || String(p.id || '');
        const parentFeature = p.parent_id ? this.registry.getById(p.parent_id) : undefined;
        const parentSubId =
          String(p.pref_id || p.parent_code || '') ||
          parentFeature?.properties?.code ||
          parentFeature?.properties?.postal ||
          (p.parent_id ? p.parent_id.split('_').slice(2).join('_') : '');

        const muniRow = getCsvSubdivisionRow(csvLayer.id, {
          id: muniCode,
          iso2,
          code: muniCode,
          name: p.name,
          nameEn: p.name_en,
          nameZh: p.name_zh
        });
        const parentRow = parentSubId
          ? getCsvSubdivisionRow(csvLayer.id, {
              id: parentSubId,
              iso2,
              code: parentSubId,
              postal: parentFeature?.properties?.postal,
              name: parentFeature?.properties?.name,
              nameEn: parentFeature?.properties?.name_en,
              nameZh: parentFeature?.properties?.name_zh
            })
          : undefined;
        const countryRow = getCsvLayerRow(csvLayer.id, iso2);

        const val =
          muniRow?.value ||
          parentRow?.value ||
          countryRow?.value ||
          getCsvLayerValue(csvLayer.id, iso2);
        const explicit = muniRow?.colorInterior || parentRow?.colorInterior || countryRow?.colorInterior;
        const col = extractColor(csvLayer, val, explicit);
        if (col) return col;
        if (parentFeature?.properties?.fillColor && parentFeature.properties.fillColor !== MAP_COLORS.defaultFill) {
          return parentFeature.properties.fillColor;
        }
      }
      const defCol =
        csvLayer.defaultColorInterior ||
        csvLayer.meta.defaultColorInterior ||
        csvLayer.meta.defaultColor ||
        csvLayer.defaultColor ||
        ((csvLayer.meta as Record<string, unknown>)['default-color-interior'] as string | undefined) ||
        ((csvLayer.meta as Record<string, unknown>)['default-color'] as string | undefined);
      if (defCol) return defCol;
    }

    // 2. Check activeRegionalFilters for fill layers
    if (this.activeRegionalFilters.size > 0) {
      for (const regId of this.activeRegionalFilters) {
        const regLayer = getCsvLayerById(regId);
        if (regLayer && regLayer.data && regLayer.type === 'FillWithColor') {
          if (p.admin_level === 0) {
            const row = getCsvLayerRow(regId, iso2);
            const val = row?.value || getCsvLayerValue(regId, iso2) || regLayer.data.rowMap.get(iso2)?.value;
            const col = extractColor(regLayer, val, row?.colorInterior);
            if (col) return col;
          } else if (p.admin_level === 1) {
            const subId = p.code || p.postal || String(p.pref_id || '');
            const subRow = getCsvSubdivisionRow(regId, {
              id: subId,
              iso2,
              code: subId,
              postal: p.postal,
              name: p.name,
              nameEn: p.name_en,
              nameZh: p.name_zh
            });
            const countryRow = getCsvLayerRow(regId, iso2);
            const val = subRow?.value || countryRow?.value || getCsvLayerValue(regId, iso2);
            const col = extractColor(regLayer, val, subRow?.colorInterior || countryRow?.colorInterior);
            if (col) return col;
          } else if (p.admin_level === 2) {
            const muniCode = p.code || String(p.id || '');
            const parentFeature = p.parent_id ? this.registry.getById(p.parent_id) : undefined;
            const parentSubId =
              String(p.pref_id || p.parent_code || '') ||
              parentFeature?.properties?.code ||
              parentFeature?.properties?.postal ||
              (p.parent_id ? p.parent_id.split('_').slice(2).join('_') : '');

            const muniRow = getCsvSubdivisionRow(regId, {
              id: muniCode,
              iso2,
              code: muniCode,
              name: p.name,
              nameEn: p.name_en,
              nameZh: p.name_zh
            });
            const parentRow = parentSubId
              ? getCsvSubdivisionRow(regId, {
                  id: parentSubId,
                  iso2,
                  code: parentSubId,
                  postal: parentFeature?.properties?.postal,
                  name: parentFeature?.properties?.name,
                  nameEn: parentFeature?.properties?.name_en,
                  nameZh: parentFeature?.properties?.name_zh
                })
              : undefined;
            const countryRow = getCsvLayerRow(regId, iso2);

            const val =
              muniRow?.value ||
              parentRow?.value ||
              countryRow?.value ||
              getCsvLayerValue(regId, iso2);
            const explicit = muniRow?.colorInterior || parentRow?.colorInterior || countryRow?.colorInterior;
            const col = extractColor(regLayer, val, explicit);
            if (col) return col;
            if (parentFeature?.properties?.fillColor && parentFeature.properties.fillColor !== MAP_COLORS.defaultFill) {
              return parentFeature.properties.fillColor;
            }
          }
        }
      }
    }

    // Default base fill color matching main branch MAP_COLORS.defaultFill
    return MAP_COLORS.defaultFill;
  }

  /**
   * Resolves boundary stroke color for a feature based on active filter.
   * Supports ColorBoundary and @default-color-boundary directives.
   * If not defined by active filter, returns undefined so standard hairline boundary draws.
   */
  private resolveBoundaryColor(feature: CanonicalFeature): string | undefined {
    const p = feature.properties;
    const iso2 = p.country_code;

    const extractBoundary = (
      csvLayer: RegisteredCsvLayer,
      rowVal: string | null | undefined,
      explicitBoundary?: string
    ): string | null => {
      if (explicitBoundary) {
        if (explicitBoundary.startsWith('#') || explicitBoundary.startsWith('rgb')) return explicitBoundary;
        if (csvLayer.legend && csvLayer.legend.length > 0) {
          const match = csvLayer.legend.find((l) => l.key.toLowerCase() === explicitBoundary.toLowerCase());
          if (match && match.color) return match.color;
        }
        return explicitBoundary;
      }
      if (!rowVal) return null;
      const trimmed = rowVal.trim();
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        const b = parts[0].trim();
        if (b.startsWith('#') || b.startsWith('rgb')) return b;
        if (csvLayer.legend && csvLayer.legend.length > 0) {
          const match = csvLayer.legend.find((l) => l.key.toLowerCase() === b.toLowerCase());
          if (match && match.color) return match.color;
        }
        return b;
      }
      return null;
    };

    // 1. Check primary activeFilterId
    const csvLayer = getCsvLayerById(this.activeFilterId);
    if (csvLayer && csvLayer.data) {
      if (p.admin_level === 0) {
        const row = getCsvLayerRow(csvLayer.id, iso2);
        const col = extractBoundary(csvLayer, row?.value, row?.colorBoundary);
        if (col) return col;
      } else if (p.admin_level === 1) {
        const subId = p.code || p.postal || String(p.pref_id || '');
        const subRow = getCsvSubdivisionRow(csvLayer.id, {
          id: subId,
          iso2,
          code: subId,
          postal: p.postal,
          name: p.name,
          nameEn: p.name_en,
          nameZh: p.name_zh
        });
        const countryRow = getCsvLayerRow(csvLayer.id, iso2);
        const col =
          extractBoundary(csvLayer, subRow?.value, subRow?.colorBoundary) ||
          extractBoundary(csvLayer, countryRow?.value, countryRow?.colorBoundary);
        if (col) return col;
      } else if (p.admin_level === 2) {
        const muniCode = p.code || String(p.id || '');
        const parentFeature = p.parent_id ? this.registry.getById(p.parent_id) : undefined;
        const parentSubId =
          String(p.pref_id || p.parent_code || '') ||
          parentFeature?.properties?.code ||
          parentFeature?.properties?.postal ||
          (p.parent_id ? p.parent_id.split('_').slice(2).join('_') : '');

        const muniRow = getCsvSubdivisionRow(csvLayer.id, {
          id: muniCode,
          iso2,
          code: muniCode,
          name: p.name,
          nameEn: p.name_en,
          nameZh: p.name_zh
        });
        const parentRow = parentSubId
          ? getCsvSubdivisionRow(csvLayer.id, {
              id: parentSubId,
              iso2,
              code: parentSubId,
              postal: parentFeature?.properties?.postal,
              name: parentFeature?.properties?.name,
              nameEn: parentFeature?.properties?.name_en,
              nameZh: parentFeature?.properties?.name_zh
            })
          : undefined;
        const countryRow = getCsvLayerRow(csvLayer.id, iso2);

        const col =
          extractBoundary(csvLayer, muniRow?.value, muniRow?.colorBoundary) ||
          extractBoundary(csvLayer, parentRow?.value, parentRow?.colorBoundary) ||
          extractBoundary(csvLayer, countryRow?.value, countryRow?.colorBoundary);
        if (col) return col;
      }

      const defBoundary =
        csvLayer.defaultColorBoundary ||
        csvLayer.meta.defaultColorBoundary ||
        ((csvLayer.meta as Record<string, unknown>)['default-color-boundary'] as string | undefined);
      if (defBoundary) return defBoundary;
    }

    // 2. Check activeRegionalFilters for fill layers with boundary definitions
    if (this.activeRegionalFilters.size > 0) {
      for (const regId of this.activeRegionalFilters) {
        const regLayer = getCsvLayerById(regId);
        if (regLayer && regLayer.data && regLayer.type === 'FillWithColor') {
          if (p.admin_level === 0) {
            const row = getCsvLayerRow(regId, iso2);
            const col = extractBoundary(regLayer, row?.value, row?.colorBoundary);
            if (col) return col;
          } else if (p.admin_level === 1) {
            const subId = p.code || p.postal || String(p.pref_id || '');
            const subRow = getCsvSubdivisionRow(regId, {
              id: subId,
              iso2,
              code: subId,
              postal: p.postal,
              name: p.name,
              nameEn: p.name_en,
              nameZh: p.name_zh
            });
            const countryRow = getCsvLayerRow(regId, iso2);
            const col =
              extractBoundary(regLayer, subRow?.value, subRow?.colorBoundary) ||
              extractBoundary(regLayer, countryRow?.value, countryRow?.colorBoundary);
            if (col) return col;
          } else if (p.admin_level === 2) {
            const muniCode = p.code || String(p.id || '');
            const parentFeature = p.parent_id ? this.registry.getById(p.parent_id) : undefined;
            const parentSubId =
              String(p.pref_id || p.parent_code || '') ||
              parentFeature?.properties?.code ||
              parentFeature?.properties?.postal ||
              (p.parent_id ? p.parent_id.split('_').slice(2).join('_') : '');

            const muniRow = getCsvSubdivisionRow(regId, {
              id: muniCode,
              iso2,
              code: muniCode,
              name: p.name,
              nameEn: p.name_en,
              nameZh: p.name_zh
            });
            const parentRow = parentSubId
              ? getCsvSubdivisionRow(regId, {
                  id: parentSubId,
                  iso2,
                  code: parentSubId,
                  postal: parentFeature?.properties?.postal,
                  name: parentFeature?.properties?.name,
                  nameEn: parentFeature?.properties?.name_en,
                  nameZh: parentFeature?.properties?.name_zh
                })
              : undefined;
            const countryRow = getCsvLayerRow(regId, iso2);

            const col =
              extractBoundary(regLayer, muniRow?.value, muniRow?.colorBoundary) ||
              extractBoundary(regLayer, parentRow?.value, parentRow?.colorBoundary) ||
              extractBoundary(regLayer, countryRow?.value, countryRow?.colorBoundary);
            if (col) return col;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Refreshes all MapLibre sources.
   */
  public refreshAllSources(): void {
    this.updateSource('adm0-source', 0);
    this.updateSource('adm1-source', 1);
    this.updateSource('adm2-source', 2);
    this.updateLabelSource();
  }

  /**
   * Sets which administrative levels are actively displayed in MapLibre sources.
   * - ADM0 is always displayed.
   * - ADM1 displays features for countries in activeAdm1Countries.
   * - ADM2 displays features for subdivisions in activeAdm2ParentIds.
   */
  public async setActiveDisplayLevels(activeAdm1: string[], activeAdm2Parents: string[]): Promise<void> {
    const nextAdm1 = new Set(activeAdm1.map((c) => c.toUpperCase()));
    const nextAdm2 = new Set(activeAdm2Parents);

    const adm1Same =
      nextAdm1.size === this.activeAdm1Countries.size &&
      [...nextAdm1].every((c) => this.activeAdm1Countries.has(c));
    const adm2Same =
      nextAdm2.size === this.activeAdm2ParentIds.size &&
      [...nextAdm2].every((p) => this.activeAdm2ParentIds.has(p));

    if (adm1Same && adm2Same) return;

    this.activeAdm1Countries = nextAdm1;
    this.activeAdm2ParentIds = nextAdm2;

    // Ensure any newly active ADM1 countries are loaded
    for (const iso of this.activeAdm1Countries) {
      if (!this.loadedAdm1Countries.has(iso)) {
        await this.ensureAdm1(iso);
      }
    }

    // Ensure any newly active ADM2 parent subdivisions are loaded
    for (const parentId of this.activeAdm2ParentIds) {
      const parts = parentId.split('_');
      if (parts.length >= 3) {
        const iso = parts[1];
        if (isSouthAmerica(iso)) continue;
        const sub = parts.slice(2).join('_');
        const key = `${iso}_${sub}`;
        if (!this.loadedAdm2Subdivisions.has(key)) {
          await this.ensureAdm2(iso, sub);
        }
      }
    }

    this.updateSource('adm0-source', 0);
    this.updateSource('adm1-source', 1);
    this.updateSource('adm2-source', 2);
    this.updateLabelSource();
    await this.updateTextMarkers();
    await this.updateImageMarkers();
  }

  /**
   * Checks whether ADM1 subdivisions are actively loaded and displayed for a country.
   */
  public isAdm1DisplayedForCountry(countryCode: string): boolean {
    const cc = countryCode.toUpperCase();
    if (!this.activeAdm1Countries.has(cc)) return false;
    const adm0Id = FeatureRegistry.createId(0, cc, '');
    return this.registry.hasChildren(adm0Id);
  }

  /**
   * Finds the active ADM2 parentId that matches an ADM1 feature, if any.
   */
  private getMatchingActiveAdm2ParentId(f: CanonicalFeature): string | null {
    if (this.activeAdm2ParentIds.size === 0) return null;
    const p = f.properties;
    if (this.activeAdm2ParentIds.has(p.feature_id)) {
      return p.feature_id;
    }
    const iso = (p.country_code || '').toUpperCase();
    const candidates = [p.code, p.postal, p.id, p.pref_id].filter(
      (v): v is string | number => v !== undefined && v !== null && String(v).trim().length > 0
    );
    for (const c of candidates) {
      const str = String(c).trim();
      const id1 = FeatureRegistry.createId(1, iso, str);
      if (this.activeAdm2ParentIds.has(id1)) return id1;
      if (/^\d+$/.test(str)) {
        const id2 = FeatureRegistry.createId(1, iso, str.padStart(2, '0'));
        if (this.activeAdm2ParentIds.has(id2)) return id2;
        const id3 = FeatureRegistry.createId(1, iso, String(parseInt(str, 10)));
        if (this.activeAdm2ParentIds.has(id3)) return id3;
      }
    }
    return null;
  }

  /**
   * Checks whether ADM2 municipalities are actively loaded and displayed for an ADM1 subdivision.
   */
  public isAdm2DisplayedForSubdivision(f: CanonicalFeature): boolean {
    const parentId = this.getMatchingActiveAdm2ParentId(f);
    if (!parentId) return false;
    return this.registry.hasChildren(parentId) || this.registry.hasChildren(f.properties.feature_id);
  }

  /**
   * Updates a specific administrative polygon source in MapLibre.
   */
  public updateSource(sourceId: string, level: 0 | 1 | 2): void {
    if (!this.map) return;
    const source = this.map.getSource(sourceId) as GeoJSONSource | undefined;
    if (!source) return;

    let rawFeatures: CanonicalFeature[] = [];
    if (level === 0) {
      // High-res ADM1 replaces coarse ADM0 for active countries to display fine details
      rawFeatures = this.registry
        .getByLevel(0)
        .filter((f) => !this.isAdm1DisplayedForCountry(f.properties.country_code));
    } else if (level === 1) {
      // High-res ADM2 replaces ADM1 for active subdivisions to display fine details
      rawFeatures = this.registry
        .getByLevel(1)
        .filter(
          (f) =>
            this.activeAdm1Countries.has(f.properties.country_code) &&
            !this.isAdm2DisplayedForSubdivision(f)
        );
    } else if (level === 2) {
      rawFeatures = this.registry
        .getByLevel(2)
        .filter((f) => Boolean(f.properties.parent_id && this.activeAdm2ParentIds.has(f.properties.parent_id)));
    }

    const decoratedFeatures = rawFeatures.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        fillColor: this.resolveFillColor(f),
        boundaryColor: this.resolveBoundaryColor(f)
      }
    }));

    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: decoratedFeatures
    };

    source.setData(fc);
  }

  /**
   * Updates label point source in MapLibre.
   */
  public updateLabelSource(): void {
    if (!this.map) return;
    const source = this.map.getSource('admin-labels-source') as GeoJSONSource | undefined;
    if (!source) return;

    const adm0 = this.registry
      .getByLevel(0)
      .filter((f) => !this.isAdm1DisplayedForCountry(f.properties.country_code));
    const adm1 = this.registry
      .getByLevel(1)
      .filter(
        (f) =>
          this.activeAdm1Countries.has(f.properties.country_code) &&
          !this.isAdm2DisplayedForSubdivision(f)
      );
    const adm2 = this.registry
      .getByLevel(2)
      .filter((f) => Boolean(f.properties.parent_id && this.activeAdm2ParentIds.has(f.properties.parent_id)));

    const allFeatures = [...adm0, ...adm1, ...adm2];

    const labelFeatures = allFeatures
      .map((f) => {
        const p = f.properties;
        const country = findCountry(p.country_code);
        const nameZh = cleanAdminText(p.name_zh) || cleanAdminText(country?.nameZh) || cleanAdminText(p.name);
        const nameEn = cleanAdminText(p.name_en) || cleanAdminText(country?.name) || cleanAdminText(p.name);
        const displayName = nameZh || nameEn;

        const center = resolveAdminCenter(f, this.registry);
        if (!center || (center[0] === 0 && center[1] === 0) || !displayName) return null;

        return {
          type: 'Feature' as const,
          id: p.numeric_id,
          geometry: {
            type: 'Point' as const,
            coordinates: center
          },
          properties: {
            feature_id: p.feature_id,
            numeric_id: p.numeric_id,
            admin_level: p.admin_level,
            country_code: p.country_code,
            nameZh,
            nameEn,
            displayName
          }
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    const fc: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: labelFeatures
    };

    source.setData(fc);
  }

  /**
   * Updates text badge markers on countries and subdivisions.
   */
  public async updateTextMarkers(): Promise<void> {
    if (!this.map) return;
    const source = this.map.getSource('text-markers-source') as GeoJSONSource | undefined;
    if (!source) return;

    const markerFeatures: Feature<Point>[] = [];

    // 1. Global Text Filters on ADM0 Countries (e.g. callingCode, tld, currency)
    if (this.activeTextFilters.size > 0) {
      const countries = this.registry
        .getByLevel(0)
        .filter((f) => !this.isAdm1DisplayedForCountry(f.properties.country_code));
      for (const f of countries) {
        const country = AdministrativeHierarchy.toCountryData(f);
        if (!country) continue;

        const badgeText = getCombinedTextOverlay(country, this.activeTextFilters);
        if (!badgeText) continue;

        const center = resolveAdminCenter(f, this.registry);
        if (!center || (center[0] === 0 && center[1] === 0)) continue;

        markerFeatures.push({
          type: 'Feature',
          id: f.properties.numeric_id,
          geometry: {
            type: 'Point',
            coordinates: center
          },
          properties: {
            id: f.properties.feature_id,
            text: badgeText,
            textColor: '#f8fafc',
            adminLevel: 0
          }
        });
      }
    }

    // 2. Regional / Area Code Filters on Entities (e.g. india-scripts, jp-area-codes, us-area-codes)
    if (this.activeRegionalFilters.size > 0) {
      for (const regId of this.activeRegionalFilters) {
        const layer = getCsvLayerById(regId);
        if (!layer || !layer.data) continue;

        if (layer.type === 'Text' || layer.type === 'TextWithStyle' || layer.type === 'ExtObject') {
          // 2a. ADM0 Countries (e.g. LK, BD in india-scripts)
          const countries = this.registry
            .getByLevel(0)
            .filter((f) => !this.isAdm1DisplayedForCountry(f.properties.country_code));
          for (const c of countries) {
            const iso2 = c.properties.country_code;
            const row = layer.data.rowMap.get(iso2) || layer.data.rowMap.get(iso2.toLowerCase());
            const code =
              row?.label ||
              row?.value ||
              getCsvLayerValue(regId, iso2) ||
              layer.data.labelMap?.get(iso2) ||
              layer.data.valueMap?.get(iso2);

            if (code) {
              const center = resolveAdminCenter(c, this.registry);
              if (!center || (center[0] === 0 && center[1] === 0)) continue;

              markerFeatures.push({
                type: 'Feature',
                id: c.properties.numeric_id,
                geometry: {
                  type: 'Point',
                  coordinates: center
                },
                properties: {
                  id: c.properties.feature_id,
                  text: code,
                  textColor: layer.accentColor || '#10b981',
                  adminLevel: 0
                }
              });
            }
          }

          // 2b. ADM1 Subdivisions (e.g. IN::TN in india-scripts, JP::13 in jp-area-codes)
          const subs = this.registry
            .getByLevel(1)
            .filter(
              (f) =>
                this.activeAdm1Countries.has(f.properties.country_code) &&
                !this.isAdm2DisplayedForSubdivision(f)
            );
          for (const s of subs) {
            const p = s.properties;
            const subParam = {
              id: String(p.code || p.id || ''),
              iso2: p.country_code,
              code: String(p.code || ''),
              postal: p.postal,
              name: p.name,
              nameEn: p.name_en,
              nameZh: p.name_zh
            };
            const code = getCsvSubdivisionCode(regId, subParam) || getCsvSubdivisionValue(regId, subParam);

            if (code) {
              const center = resolveAdminCenter(s, this.registry);
              if (!center || (center[0] === 0 && center[1] === 0)) continue;

              markerFeatures.push({
                type: 'Feature',
                id: p.numeric_id,
                geometry: {
                  type: 'Point',
                  coordinates: center
                },
                properties: {
                  id: p.feature_id,
                  text: code,
                  textColor: layer.accentColor || '#10b981',
                  adminLevel: 1
                }
              });
            }
          }

          // 2c. ADM2 Municipalities (if any active)
          if (this.activeAdm2ParentIds.size > 0) {
            const munis = this.registry
              .getByLevel(2)
              .filter((f) => Boolean(f.properties.parent_id && this.activeAdm2ParentIds.has(f.properties.parent_id)));
            for (const m of munis) {
              const p = m.properties;
              const muniParam = {
                id: String(p.code || p.id || ''),
                iso2: p.country_code,
                code: String(p.code || ''),
                name: p.name,
                nameEn: p.name_en,
                nameZh: p.name_zh
              };
              const code = getCsvSubdivisionCode(regId, muniParam) || getCsvSubdivisionValue(regId, muniParam);

              if (code) {
                const center = resolveAdminCenter(m, this.registry);
                if (!center || (center[0] === 0 && center[1] === 0)) continue;

                markerFeatures.push({
                  type: 'Feature',
                  id: p.numeric_id,
                  geometry: {
                    type: 'Point',
                    coordinates: center
                  },
                  properties: {
                    id: p.feature_id,
                    text: code,
                    textColor: layer.accentColor || '#10b981',
                    adminLevel: 2
                  }
                });
              }
            }
          }
        }
      }
    }

    source.setData({
      type: 'FeatureCollection',
      features: markerFeatures
    });
  }

  /**
   * Updates image markers (e.g. pedestrian crossing signs) on countries.
   */
  public async updateImageMarkers(): Promise<void> {
    if (!this.map) return;
    const source = this.map.getSource('image-markers-source') as GeoJSONSource | undefined;
    if (!source) return;

    const imageFeatures: Feature<Point>[] = [];

    if (this.activeInternationalImageFilter) {
      const filterId = this.activeInternationalImageFilter;
      const isCrossing = filterId === 'pedestrian-crossing' || filterId === 'eu-pedestrian-crossing';

      if (isCrossing) {
        await loadOnDemandCsvLayer('pedestrian-crossing');
        const countries = this.registry
          .getByLevel(0)
          .filter((f) => !this.isAdm1DisplayedForCountry(f.properties.country_code));
        for (const f of countries) {
          const iso2 = f.properties.country_code;
          const sign = getCrossingSign(iso2);
          if (!sign || !sign.imagePath) continue;

          const iconId = `crossing-${iso2.toLowerCase()}`;
          if (!this.loadedImageIcons.has(iconId)) {
            const url = getDataUrl(sign.imagePath);
            const loaded = await this.loadIconToMap(iconId, url);
            if (loaded) this.loadedImageIcons.add(iconId);
          }

          if (!this.loadedImageIcons.has(iconId)) continue;

          const center = resolveAdminCenter(f, this.registry);
          if (!center || (center[0] === 0 && center[1] === 0)) continue;

          imageFeatures.push({
            type: 'Feature',
            id: f.properties.numeric_id,
            geometry: {
              type: 'Point',
              coordinates: center
            },
            properties: {
              id: `image-${iso2}`,
              icon: iconId,
              name: sign.nameZh || f.properties.name
            }
          });
        }
      } else {
        // Generic CSV Image layer (e.g. flag or any external image layer)
        await loadOnDemandCsvLayer(filterId);
        const layer = getCsvLayerById(filterId);
        if (layer && layer.data) {
          const countries = this.registry
            .getByLevel(0)
            .filter((f) => !this.isAdm1DisplayedForCountry(f.properties.country_code));
          for (const f of countries) {
            const iso2 = f.properties.country_code;
            const imagePath =
              layer.data.labelMap?.get(iso2) ||
              layer.data.valueMap?.get(iso2) ||
              layer.data.rowMap?.get(iso2)?.label ||
              layer.data.rowMap?.get(iso2)?.value;
            if (!imagePath) continue;

            const iconId = `${filterId}-${iso2.toLowerCase()}`;
            if (!this.loadedImageIcons.has(iconId)) {
              const url = imagePath.startsWith('http://') || imagePath.startsWith('https://')
                ? imagePath
                : getDataUrl(imagePath);
              const loaded = await this.loadIconToMap(iconId, url);
              if (loaded) this.loadedImageIcons.add(iconId);
            }

            if (!this.loadedImageIcons.has(iconId)) continue;

            const center = resolveAdminCenter(f, this.registry);
            if (!center || (center[0] === 0 && center[1] === 0)) continue;

            imageFeatures.push({
              type: 'Feature',
              id: f.properties.numeric_id,
              geometry: {
                type: 'Point',
                coordinates: center
              },
              properties: {
                id: `image-${iso2}`,
                icon: iconId,
                name: f.properties.name
              }
            });
          }
        }
      }
    }

    source.setData({
      type: 'FeatureCollection',
      features: imageFeatures
    });
  }

  /**
   * Helper to load an external image, downscale it to a crisp base size (32px at pixelRatio: 2),
   * and add it to MapLibre.
   */
  private async loadIconToMap(iconId: string, url: string): Promise<boolean> {
    if (!this.map || this.map.hasImage(iconId)) return true;
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;

    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) {
        console.warn(`[GeographicDataManager] Failed to fetch icon ${iconId} from ${url}: HTTP ${resp.status}`);
        return false;
      }

      const contentType = resp.headers.get('content-type') || '';
      const isSvg = url.toLowerCase().endsWith('.svg') || contentType.includes('svg');

      let dataUri: string;
      if (isSvg) {
        let svgText = await resp.text();
        // Remove external DOCTYPE declarations (prevents DTD fetch blocking in be.svg / at.svg)
        svgText = svgText.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
        // Remove XML declaration if present
        svgText = svgText.replace(/<\?xml[\s\S]*?\?>/gi, '');
        // Remove foreignObject tags (both block and self-closing, prevents canvas taint in bg.svg / mk.svg)
        svgText = svgText.replace(/<foreignObject\b[\s\S]*?(?:<\/foreignObject>|\/>)/gi, '');
        // Remove script tags
        svgText = svgText.replace(/<script\b[\s\S]*?(?:<\/script>|\/>)/gi, '');

        // Ensure viewBox exists so SVG scales cleanly to target canvas size
        const svgMatch = svgText.match(/<svg([^>]*?)>/i);
        if (svgMatch) {
          const attrs = svgMatch[1];
          const hasViewBox = /viewBox\s*=/i.test(attrs);
          const widthMatch = attrs.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)/i);
          const heightMatch = attrs.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)/i);
          let newAttrs = attrs;

          if (!hasViewBox && widthMatch && heightMatch) {
            newAttrs += ` viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}"`;
          }
          // Set explicit width and height on root <svg> to TARGET_SIZE (64)
          newAttrs = newAttrs.replace(/\bwidth\s*=\s*["'][^"']*["']/gi, '').replace(/\bheight\s*=\s*["'][^"']*["']/gi, '');
          newAttrs += ' width="64" height="64"';
          svgText = svgText.replace(svgMatch[0], `<svg${newAttrs}>`);
        }

        // Use base64 data URI instead of blob: URL to prevent Chrome canvas taint
        const base64 = btoa(unescape(encodeURIComponent(svgText)));
        dataUri = `data:image/svg+xml;base64,${base64}`;
      } else {
        const buffer = await resp.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        const mime = contentType || 'image/png';
        dataUri = `data:${mime};base64,${btoa(binary)}`;
      }

      const img = new Image();
      img.src = dataUri;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
      });

      if (!this.map || this.map.hasImage(iconId)) return true;

      const TARGET_SIZE = 64; // Logical 32px at pixelRatio: 2
      const canvas = document.createElement('canvas');
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      const w = img.naturalWidth || TARGET_SIZE;
      const h = img.naturalHeight || TARGET_SIZE;
      const scale = Math.min(TARGET_SIZE / w, TARGET_SIZE / h);
      const dw = Math.max(1, Math.round(w * scale));
      const dh = Math.max(1, Math.round(h * scale));
      const dx = Math.round((TARGET_SIZE - dw) / 2);
      const dy = Math.round((TARGET_SIZE - dh) / 2);

      ctx.drawImage(img, dx, dy, dw, dh);

      try {
        const imgData = ctx.getImageData(0, 0, TARGET_SIZE, TARGET_SIZE);
        if (!this.map || this.map.hasImage(iconId)) return true;
        this.map.addImage(iconId, imgData, { pixelRatio: 2 });
        return true;
      } catch (taintErr) {
        console.warn(`[GeographicDataManager] getImageData failed for ${iconId}:`, taintErr);
        if (this.map && !this.map.hasImage(iconId)) {
          this.map.addImage(iconId, { width: 1, height: 1, data: new Uint8Array(4) });
        }
        return false;
      }
    } catch (err) {
      console.warn(`[GeographicDataManager] Failed to load icon ${iconId} from ${url}:`, err);
      return false;
    }
  }

  /**
   * Loads and updates external overlay features (e.g. Taiwan Taipower Grid TW-powerpoles.fgb).
   */
  public async updateExtFeatures(): Promise<void> {
    const activeExtLayerIds = Array.from(this.activeRegionalFilters).filter((id) => {
      const layer = getCsvLayerById(id);
      if (!layer || layer.meta.fgb?.includes('-roads.fgb')) return false;
      return (
        layer.id === 'taiwan-power-poles' ||
        layer.type === 'ExtObject' ||
        (layer.type === 'TextWithStyle' && (Boolean(layer.meta.fgb) || Boolean(layer.meta.targetKeys?.some((k) => k.includes('::'))))) ||
        Boolean(layer.meta.fgb)
      );
    });

    if (activeExtLayerIds.length === 0) {
      this.activeExtPolygons = [];
      this.activeExtInnerGrids = [];
      this.activeExtLabels = [];
      this.updateExtSources();
      return;
    }

    const allPolygons: CanonicalFeature[] = [];
    const allInnerGrids: Feature<LineString>[] = [];
    const allLabels: Feature<Point>[] = [];

    for (const layerId of activeExtLayerIds) {
      const csvLayer = getCsvLayerById(layerId);
      if (!csvLayer) continue;

      let cached = this.loadedExtFeatures.get(layerId);
      if (!cached) {
        cached = (await this.loadExtObjectDataset(csvLayer)) || undefined;
        if (cached) {
          this.loadedExtFeatures.set(layerId, cached);
        }
      }

      if (cached) {
        allPolygons.push(...cached.polygons);
        allInnerGrids.push(...cached.innerGrids);
        allLabels.push(...cached.labels);
      }
    }

    this.activeExtPolygons = allPolygons;
    this.activeExtInnerGrids = allInnerGrids;
    this.activeExtLabels = allLabels;
    this.updateExtSources();
  }

  private async loadExtObjectDataset(
    csvLayer: RegisteredCsvLayer
  ): Promise<{ polygons: CanonicalFeature[]; innerGrids: Feature<LineString>[]; labels: Feature<Point>[] } | null> {
    try {
      if (!csvLayer.loaded) {
        await loadOnDemandCsvLayer(csvLayer.id);
      }

      let fgbRelPath =
        csvLayer.meta.fgb ||
        ((csvLayer as unknown as Record<string, unknown>).fgb as string | undefined);

      if (!fgbRelPath) {
        if (csvLayer.id === 'taiwan-power-poles') {
          fgbRelPath = 'data/TW-powerpoles.fgb';
        } else {
          const sampleTag =
            csvLayer.data?.rows?.[0]?.regionId ||
            csvLayer.meta.targetKeys?.[0];
          if (sampleTag && sampleTag.includes('::')) {
            fgbRelPath = (await resolveExtObjectFile(sampleTag)) || undefined;
          }
        }
      }

      if (!fgbRelPath) return null;

      const url = getDataUrl(fgbRelPath);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[GeographicDataManager] HTTP ${res.status} when fetching ${url}`);
        return null;
      }

      const buffer = await res.arrayBuffer();
      const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));

      const polygons: CanonicalFeature[] = [];
      const innerGrids: Feature<LineString>[] = [];
      const labels: Feature<Point>[] = [];

      const sampleTag =
        csvLayer.data?.rows?.[0]?.regionId ||
        csvLayer.meta.targetKeys?.[0] ||
        '';
      const samplePrefix = sampleTag.includes('::')
        ? sampleTag.split('::')[0]
        : (csvLayer.id === 'taiwan-power-poles' ? 'TW-powerpoles' : '');

      const isPercentageGrid =
        csvLayer.meta.innerGrid === 'percentage' ||
        (csvLayer.meta as Record<string, unknown>)['inner-grid'] === 'percentage';

      for await (const rawFeature of it) {
        const f = rawFeature as Feature<Geometry, Record<string, unknown>>;
        if (!f || !f.geometry) continue;

        const props = (f.properties || {}) as Record<string, unknown>;
        const rawId = String(props.id ?? props.code ?? props.name ?? f.id ?? '').trim();
        if (!rawId) continue;

        const subId = rawId.includes('::') ? rawId.split('::').pop()!.trim() : rawId;
        const objectTag = rawId.includes('::')
          ? rawId
          : (samplePrefix ? `${samplePrefix}::${subId}` : rawId);

        const row =
          csvLayer.data?.rowMap.get(rawId.toUpperCase()) ||
          csvLayer.data?.rowMap.get(subId.toUpperCase()) ||
          csvLayer.data?.rowMap.get(objectTag.toUpperCase()) ||
          csvLayer.data?.rowMap.get(rawId) ||
          csvLayer.data?.rowMap.get(subId);

        const nameZh =
          row?.attributes?.NameZh ||
          row?.attributes?.nameZh ||
          (props.nameZh as string) ||
          (props.name as string) ||
          subId;

        const nameEn =
          row?.attributes?.NameEn ||
          row?.attributes?.nameEn ||
          (props.nameEn as string) ||
          subId;

        const color =
          row?.color ||
          row?.value ||
          (props.color as string) ||
          csvLayer.accentColor ||
          '#38bdf8';

        const fillColor = hexToRgba(color, 0.22);
        const hoverFillColor = hexToRgba(color, 0.45);
        const borderColor = color;

        const labelText = row?.label || subId;

        const geometry = normalizeAntimeridianGeometry(f.geometry);
        const center = AdministrativeHierarchy.calculateCenter(geometry);
        const bbox = AdministrativeHierarchy.calculateBBox(geometry);

        const examplePoleCode =
          row?.attributes?.ExamplePoleCode ||
          row?.attributes?.examplePoleCode ||
          (props.examplePoleCode as string);

        const subdivisions =
          row?.attributes?.Subdivisions ||
          row?.attributes?.subdivisions ||
          (props.subdivisions as string);

        const description =
          row?.attributes?.Description ||
          row?.attributes?.description ||
          (props.description as string);

        const canonical: CanonicalFeature = {
          type: 'Feature',
          id: undefined,
          geometry,
          properties: {
            feature_id: objectTag,
            numeric_id: 0,
            admin_level: 1,
            country_code: samplePrefix.split('-')[0] || 'TW',
            objectTag,
            name: nameZh,
            name_zh: nameZh,
            name_en: nameEn,
            code: subId,
            label: labelText,
            color,
            fillColor,
            hoverFillColor,
            borderColor,
            examplePoleCode,
            subdivisions,
            description,
            layerId: csvLayer.id,
            bbox,
            center,
            attributes: {
              ...row?.attributes,
              examplePoleCode,
              subdivisions,
              description
            }
          }
        };

        this.registry.register(canonical);
        polygons.push(canonical);

        // Generate inner percentage grid lines if specified (20%, 40%, 60%, 80%)
        if (isPercentageGrid && geometry.type === 'Polygon') {
          const coords = geometry.coordinates[0];
          if (coords && coords.length >= 4) {
            const pSW = coords[0];
            const pSE = coords[1];
            const pNE = coords[2];
            const pNW = coords[3];

            for (const pct of [0.2, 0.4, 0.6, 0.8]) {
              const bX = (1 - pct) * pSW[0] + pct * pSE[0];
              const bY = (1 - pct) * pSW[1] + pct * pSE[1];
              const tX = (1 - pct) * pNW[0] + pct * pNE[0];
              const tY = (1 - pct) * pNW[1] + pct * pNE[1];

              innerGrids.push({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [bX, bY],
                    [tX, tY]
                  ]
                },
                properties: {
                  parent_id: objectTag
                }
              });

              const lX = (1 - pct) * pSW[0] + pct * pNW[0];
              const lY = (1 - pct) * pSW[1] + pct * pNW[1];
              const rX = (1 - pct) * pSE[0] + pct * pNE[0];
              const rY = (1 - pct) * pSE[1] + pct * pNE[1];

              innerGrids.push({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [lX, lY],
                    [rX, rY]
                  ]
                },
                properties: {
                  parent_id: objectTag
                }
              });
            }
          }
        }

        // Generate center label point
        if (center && (center[0] !== 0 || center[1] !== 0)) {
          labels.push({
            type: 'Feature',
            id: canonical.properties.numeric_id,
            geometry: {
              type: 'Point',
              coordinates: center
            },
            properties: {
              feature_id: objectTag,
              label: labelText,
              color,
              textColor: '#ffffff'
            }
          });
        }
      }

      return { polygons, innerGrids, labels };
    } catch (err) {
      console.warn(`[GeographicDataManager] Failed to load ext dataset for ${csvLayer.id}:`, err);
      return null;
    }
  }

  private updateExtSources(): void {
    if (!this.map) return;

    const fillSource = this.map.getSource('ext-fill-source') as GeoJSONSource | undefined;
    if (fillSource) {
      fillSource.setData({
        type: 'FeatureCollection',
        features: this.activeExtPolygons
      });
    }

    const gridSource = this.map.getSource('ext-inner-grid-source') as GeoJSONSource | undefined;
    if (gridSource) {
      gridSource.setData({
        type: 'FeatureCollection',
        features: this.activeExtInnerGrids
      });
    }

    const labelsSource = this.map.getSource('ext-labels-source') as GeoJSONSource | undefined;
    if (labelsSource) {
      labelsSource.setData({
        type: 'FeatureCollection',
        features: this.activeExtLabels
      });
    }
  }
}
