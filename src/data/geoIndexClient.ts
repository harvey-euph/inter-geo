import { getIndexUrl } from './dataSource';

export interface DataIndex {
  root: string;
  counts: {
    total: number;
    l2: number;
    subdivisionParents: number;
    roads: number;
    extObjects: number;
  };
  l2Countries: string[];
  childrenByParent: Record<string, string[]>;
  subdivisionsByCountry: Record<string, string[]>;
  roadsByCountry: Record<string, string>;
  extByCountry: Record<string, Record<string, string>>;
  files: string[];
}

export interface LayerMeta {
  id: string;
  filename: string;
  file: string;
  nameZh: string;
  nameEn: string;
  shortBadge: string | null;
  type: string;
  group: 'fill-region' | 'ext-object' | 'global-label' | 'area-label';
  order: number;
  accentColor: string | null;
  defaultColor: string | null;
  descriptionZh: string | null;
  effectiveRange: string | null;
  loadedTiming: string;
  focusTarget: string | null;
  goto: string | null;
  legend?: Array<{ key: string; color: string; labelZh: string }> | null;
  fgb?: string | null;
  innerGrid?: string | null;
  rowCount: number;
  targetKeys: string[];
}

export interface LayersIndex {
  files: string[];
  totalLayers: number;
  groups: {
    fillRegion: LayerMeta[];
    extObject: LayerMeta[];
    globalLabel: LayerMeta[];
    areaLabel: LayerMeta[];
  };
  layers: LayerMeta[];
  byFilename: Record<string, LayerMeta>;
  byId: Record<string, LayerMeta>;
}

export interface InfoTargetCardEntry {
  id: string;
  title: string;
  file: string;
  sectionIndex: number;
  targets: string[];
  priority: number;
  icon?: string | null;
  accent?: string | null;
  tags?: string[] | null;
  type?: string | null;
  display?: boolean;
  comparison?: string[] | null;
  image?: string | null;
  imageSize?: string | null;
  imagePosition?: string | null;
  imageAlt?: string | null;
  preview?: string | null;
}

export type InfoTargetsIndex = Record<string, InfoTargetCardEntry[]>;

let cachedDataIndex: DataIndex | null = null;
let dataIndexPromise: Promise<DataIndex> | null = null;

let cachedLayersIndex: LayersIndex | null = null;
let layersIndexPromise: Promise<LayersIndex> | null = null;

let cachedInfoTargetsIndex: InfoTargetsIndex | null = null;
let infoTargetsPromise: Promise<InfoTargetsIndex> | null = null;

/**
 * Loads and caches data-index.json from the index branch.
 */
export async function loadDataIndex(): Promise<DataIndex> {
  if (cachedDataIndex) return cachedDataIndex;
  if (!dataIndexPromise) {
    dataIndexPromise = fetch(getIndexUrl('data-index.json'))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} when fetching data-index.json`);
        return res.json();
      })
      .then((data: DataIndex) => {
        cachedDataIndex = data;
        return data;
      })
      .catch((err) => {
        console.warn('[geoIndexClient] Failed to load remote data-index.json:', err);
        // Fallback minimal index
        return {
          root: 'data/COUNTRY.fgb',
          counts: { total: 0, l2: 0, subdivisionParents: 0, roads: 0, extObjects: 0 },
          l2Countries: [],
          childrenByParent: {},
          subdivisionsByCountry: {},
          roadsByCountry: {},
          extByCountry: {},
          files: []
        };
      });
  }
  return dataIndexPromise;
}

export function getDataIndexSync(): DataIndex | null {
  return cachedDataIndex;
}

/**
 * Checks whether an L2 file (data/XX.fgb) exists for country iso2.
 */
export function hasCountryL2Sync(iso2: string): boolean {
  if (!cachedDataIndex) return true; // optimistic if not loaded yet
  const upper = iso2.toUpperCase();
  return cachedDataIndex.l2Countries.includes(upper);
}

/**
 * Resolves child subdivision file path if it exists (e.g. data/XX/YY.fgb).
 */
export function resolveSubdivisionFileSync(parentPath: string, childId: string): string | null {
  if (!cachedDataIndex) return null;
  const target1 = `data/${parentPath}/${childId}.fgb`.toLowerCase();
  const target2 = `data/${parentPath}/${parentPath}-${childId}.fgb`.toLowerCase();
  for (const f of cachedDataIndex.files) {
    const fLower = f.toLowerCase();
    if (fLower === target1 || fLower === target2) return f;
  }
  return null;
}

/**
 * Loads and caches layers-index.json from the index branch.
 */
export async function loadLayersIndex(): Promise<LayersIndex> {
  if (cachedLayersIndex) return cachedLayersIndex;
  if (!layersIndexPromise) {
    layersIndexPromise = fetch(getIndexUrl('layers-index.json'))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} when fetching layers-index.json`);
        return res.json();
      })
      .then((data: LayersIndex) => {
        cachedLayersIndex = data;
        return data;
      })
      .catch((err) => {
        console.warn('[geoIndexClient] Failed to load remote layers-index.json:', err);
        return {
          files: [],
          totalLayers: 0,
          groups: { fillRegion: [], extObject: [], globalLabel: [], areaLabel: [] },
          layers: [],
          byFilename: {},
          byId: {}
        };
      });
  }
  return layersIndexPromise;
}

export function getLayersIndexSync(): LayersIndex | null {
  return cachedLayersIndex;
}

/**
 * Loads and caches info-targets.json from the index branch.
 */
export async function loadInfoTargetsIndex(): Promise<InfoTargetsIndex> {
  if (cachedInfoTargetsIndex) return cachedInfoTargetsIndex;
  if (!infoTargetsPromise) {
    infoTargetsPromise = fetch(getIndexUrl('info-targets.json'))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} when fetching info-targets.json`);
        return res.json();
      })
      .then((data: InfoTargetsIndex) => {
        cachedInfoTargetsIndex = data;
        return data;
      })
      .catch((err) => {
        console.warn('[geoIndexClient] Failed to load remote info-targets.json:', err);
        return {};
      });
  }
  return infoTargetsPromise;
}

export function getInfoTargetsSync(): InfoTargetsIndex | null {
  return cachedInfoTargetsIndex;
}

/**
 * Queries info target card entries synchronously for a given object key (e.g. 'JP', 'TW', 'US-CA').
 * Returns entries sorted strictly by priority 0..139.
 */
export function queryTargetCardsSync(targetKey: string): InfoTargetCardEntry[] {
  if (!cachedInfoTargetsIndex) return [];
  const upper = targetKey.toUpperCase().trim();
  const direct = cachedInfoTargetsIndex[upper];
  if (direct) return direct;

  const colonNormalized = upper.replace(/^(COUNTRY|SUBDIVISION|MUNICIPALITY|ROAD|GRID):/, '');
  return cachedInfoTargetsIndex[colonNormalized] || [];
}
