import type { Feature, Geometry } from 'geojson';

export type AdminLevel = 0 | 1 | 2;

export interface CanonicalFeatureProperties {
  feature_id: string;
  numeric_id: number;
  admin_level: AdminLevel;
  country_code: string;
  parent_id?: string;
  name: string;
  name_en?: string;
  name_zh?: string;
  code?: string;
  postal?: string;
  pref_id?: number | string;
  city?: string;
  pref?: string;
  fillColor?: string;
  bbox?: [number, number, number, number];
  center?: [number, number];
  [key: string]: unknown;
}

export type CanonicalFeature = Feature<Geometry, CanonicalFeatureProperties>;

/**
 * FeatureRegistry maintains an in-memory catalog of all loaded geographic features.
 * Provides stable canonical IDs across 2D/3D projections and LOD levels.
 */
export class FeatureRegistry {
  private static nextNumericId = 1;
  private featuresById = new Map<string, CanonicalFeature>();
  private numericIdToFeatureId = new Map<number, string>();
  private featuresByLevel = new Map<AdminLevel, Set<string>>([
    [0, new Set()],
    [1, new Set()],
    [2, new Set()]
  ]);
  private childrenByParentId = new Map<string, Set<string>>();

  /**
   * Generates a stable canonical string ID for administrative features.
   */
  public static createId(level: AdminLevel, countryCode: string, codeOrId: string | number): string {
    const cc = countryCode.toUpperCase();
    const sub = String(codeOrId).trim();
    if (level === 0) return `ADM0_${cc}`;
    if (level === 1) return `ADM1_${cc}_${sub}`;
    return `ADM2_${cc}_${sub}`;
  }

  /**
   * Registers a canonical feature in the registry.
   */
  public register(feature: CanonicalFeature): void {
    const id = feature.properties.feature_id;
    if (!feature.properties.numeric_id) {
      feature.properties.numeric_id = FeatureRegistry.nextNumericId++;
    }
    feature.id = feature.properties.numeric_id;

    this.featuresById.set(id, feature);
    this.numericIdToFeatureId.set(feature.properties.numeric_id, id);

    const level = feature.properties.admin_level;
    this.featuresByLevel.get(level)?.add(id);

    const parentId = feature.properties.parent_id;
    if (parentId) {
      if (!this.childrenByParentId.has(parentId)) {
        this.childrenByParentId.set(parentId, new Set());
      }
      this.childrenByParentId.get(parentId)!.add(id);
    }
  }

  /**
   * Registers an array of canonical features.
   */
  public registerAll(features: CanonicalFeature[]): void {
    for (const f of features) {
      this.register(f);
    }
  }

  public getById(id: string): CanonicalFeature | undefined {
    return this.featuresById.get(id);
  }

  public getByNumericId(numericId: number): CanonicalFeature | undefined {
    const id = this.numericIdToFeatureId.get(numericId);
    return id ? this.featuresById.get(id) : undefined;
  }

  public getChildren(parentId: string): CanonicalFeature[] {
    const ids = this.childrenByParentId.get(parentId);
    if (!ids) return [];
    const list: CanonicalFeature[] = [];
    for (const id of ids) {
      const f = this.featuresById.get(id);
      if (f) list.push(f);
    }
    return list;
  }

  public getByLevel(level: AdminLevel): CanonicalFeature[] {
    const ids = this.featuresByLevel.get(level);
    if (!ids) return [];
    const list: CanonicalFeature[] = [];
    for (const id of ids) {
      const f = this.featuresById.get(id);
      if (f) list.push(f);
    }
    return list;
  }

  public has(id: string): boolean {
    return this.featuresById.has(id);
  }

  public clearLevel(level: AdminLevel): void {
    const ids = this.featuresByLevel.get(level);
    if (!ids) return;
    for (const id of ids) {
      const f = this.featuresById.get(id);
      if (f?.properties.numeric_id) {
        this.numericIdToFeatureId.delete(f.properties.numeric_id);
      }
      this.featuresById.delete(id);
    }
    ids.clear();
  }

  public clearAll(): void {
    this.featuresById.clear();
    this.numericIdToFeatureId.clear();
    this.featuresByLevel.get(0)?.clear();
    this.featuresByLevel.get(1)?.clear();
    this.featuresByLevel.get(2)?.clear();
    this.childrenByParentId.clear();
  }
}
