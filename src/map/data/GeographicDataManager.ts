import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { FlatGeobufLoader } from './FlatGeobufLoader';
import { FeatureRegistry, type CanonicalFeature } from './FeatureRegistry';
import { AdministrativeHierarchy } from './AdministrativeHierarchy';
import { getCsvLayerById, getCsvLayerValue, getCsvSubdivisionValue } from '../../layers/csvLayerRegistry';
import { findCountry } from '../../data/countries';

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
  private activeFilterId = 'base';
  private onDataLoaded?: (level: 0 | 1 | 2, count: number) => void;

  constructor(options?: DataManagerOptions) {
    this.loader = new FlatGeobufLoader();
    this.registry = new FeatureRegistry();
    this.onDataLoaded = options?.onDataLoaded;
  }

  public setMap(map: MapLibreMap | null): void {
    this.map = map;
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
      this.updateSource('adm1-source', 1);
      this.updateLabelSource();
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
    const sub = String(subIdOrCode).trim();
    const key = `${cleanIso}_${sub}`;
    if (this.loadedAdm2Subdivisions.has(key)) {
      const parentId = FeatureRegistry.createId(1, cleanIso, sub);
      return this.registry.getChildren(parentId);
    }

    try {
      const features = await this.loader.loadAdm2(cleanIso, sub);
      this.registry.registerAll(features);
      this.loadedAdm2Subdivisions.add(key);
      this.updateSource('adm2-source', 2);
      this.updateLabelSource();
      this.onDataLoaded?.(2, features.length);
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
    try {
      const url = `/inter-geo/@geo-data/main/data/${cleanIso}-roads.fgb`;
      const res = await fetch(url);
      if (!res.ok) return;
      const buffer = await res.arrayBuffer();
      const it = (await import('flatgeobuf')).geojson.deserialize(new Uint8Array(buffer));
      const features: any[] = [];
      for await (const feat of it) {
        features.push(feat);
      }
      if (this.map) {
        const source = this.map.getSource('roads-source') as GeoJSONSource | undefined;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features
          });
        }
      }
    } catch (err) {
      console.warn(`[GeographicDataManager] Failed to load roads for ${cleanIso}:`, err);
    }
  }

  /**
   * Sets active filter id and updates fill colors.
   */
  public setActiveFilterId(filterId: string): void {
    if (this.activeFilterId === filterId) return;
    this.activeFilterId = filterId;
    this.refreshAllSources();
  }

  /**
   * Resolves fill color for a feature based on active filter.
   */
  private resolveFillColor(feature: CanonicalFeature): string {
    const p = feature.properties;
    const iso2 = p.country_code;

    // Check CSV layer
    const csvLayer = getCsvLayerById(this.activeFilterId);
    if (csvLayer) {
      if (p.admin_level === 0) {
        const val = getCsvLayerValue(csvLayer.id, iso2);
        if (val) return val;
      } else if (p.admin_level === 1) {
        const subId = p.code || p.postal || String(p.pref_id || '');
        const val = getCsvSubdivisionValue(csvLayer.id, { id: subId, iso2, code: subId }) || getCsvLayerValue(csvLayer.id, iso2);
        if (val) return val;
      }
      const defCol =
        csvLayer.meta.defaultColor ||
        csvLayer.defaultColor ||
        ((csvLayer.meta as Record<string, unknown>)['default-color'] as string | undefined);
      if (defCol) return defCol;
    }

    // Default base fill color
    if (p.admin_level === 0) {
      return '#1e293b'; // slate-800
    }
    if (p.admin_level === 1) {
      return '#1e293b';
    }
    return '#1e293b';
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
   * Updates a specific administrative polygon source in MapLibre.
   */
  public updateSource(sourceId: string, level: 0 | 1 | 2): void {
    if (!this.map) return;
    const source = this.map.getSource(sourceId) as GeoJSONSource | undefined;
    if (!source) return;

    const rawFeatures = this.registry.getByLevel(level);
    const decoratedFeatures = rawFeatures.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        fillColor: this.resolveFillColor(f)
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

    const allFeatures = [
      ...this.registry.getByLevel(0),
      ...this.registry.getByLevel(1),
      ...this.registry.getByLevel(2)
    ];

    const labelFeatures = allFeatures
      .map((f) => {
        const center = f.properties.center || AdministrativeHierarchy.calculateCenter(f.geometry);
        if (!center || (center[0] === 0 && center[1] === 0)) return null;

        const p = f.properties;
        const country = findCountry(p.country_code);
        const nameZh = p.name_zh || country?.nameZh || p.name || '';
        const nameEn = p.name_en || country?.name || p.name || '';

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
            displayName: nameZh || nameEn
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
}
