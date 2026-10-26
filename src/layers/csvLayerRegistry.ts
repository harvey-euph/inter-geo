import { getDataUrl } from '../data/dataSource';
import { loadLayersIndex, type LayerMeta } from '../data/geoIndexClient';
import {
  getAssignableRegionList,
  parseEffectiveRange,
  type AssignableRegionList
} from './assignableRegions';
import {
  parseLayerDataCsv,
  type CsvLayerKVRow,
  type CsvLayerMetadata,
  type CsvLayerType,
  type ParsedCsvLayerData
} from './csvLayerParser';

export interface RegisteredCsvLayer {
  /** Final resolved layer ID (e.g. 'flag', 'drivingSide') */
  id: string;
  /** Public relative path in data repo (e.g. 'layers/flags.csv') */
  path: string;
  /** Display name in Traditional Chinese */
  nameZh: string;
  /** Display name in English */
  nameEn: string;
  /** Short badge text for toolbar pills */
  shortBadge: string;
  /** Theme accent color */
  accentColor: string;
  /** Default layer color if specified */
  defaultColor?: string;
  /** Description in Traditional Chinese */
  descriptionZh: string;
  /** Raw effective range string (e.g. 'International', 'Nationwide:IN|LK|BD') */
  effectiveRange: string;
  /** Range kind */
  rangeKind: 'International' | 'Nationwide';
  /** Primary target ISO-2 code or '*' */
  targetIso2: string;
  /** Target ISO-2 list */
  targetIso2s: string[];
  /** Resolved assignable list */
  assignableList: AssignableRegionList;
  /** Layer type */
  type: CsvLayerType;
  /** Layer category group for accordion UI */
  group: 'fill-region' | 'fill-region-with-color' | 'ext-object' | 'global-label' | 'area-label';
  /** Display order */
  order: number;
  /** Loading timing ('on-demand' or 'init') */
  loadedTiming: string;
  /** Optional camera goto query string */
  goto?: string;
  /** Optional target object ID to focus */
  focusTarget?: string;
  /** Optional legend definitions */
  legend?: Array<{ key: string; color: string; labelZh: string }>;
  /** Optional FGB geometry path */
  fgb?: string;
  /** Optional inner grid specification */
  innerGrid?: string;
  /** Sample target keys from layer index */
  targetKeys?: string[];
  /** Whether the full CSV data has been fetched and parsed */
  loaded: boolean;
  /** Parsed K-V data (populated after `loadOnDemandCsvLayer`) */
  data: ParsedCsvLayerData | null;
  /** Raw metadata */
  meta: CsvLayerMetadata;
}

export type RegisteredCsvFilter = RegisteredCsvLayer;

function metaToRegisteredLayer(lm: LayerMeta): RegisteredCsvLayer {
  const effectiveRange = lm.effectiveRange || 'International';
  const { kind: rangeKind, targetIso2, targetIso2s } = parseEffectiveRange(effectiveRange);
  const assignableList = getAssignableRegionList(effectiveRange);
  const rawGroup = lm.group || 'global-label';
  const group = rawGroup === 'fill-region-with-color' ? 'fill-region' : rawGroup;

  return {
    id: lm.id,
    path: lm.file,
    nameZh: lm.nameZh,
    nameEn: lm.nameEn,
    shortBadge: lm.shortBadge || lm.nameZh,
    accentColor: lm.accentColor || '#38bdf8',
    defaultColor: lm.defaultColor || undefined,
    descriptionZh: lm.descriptionZh || `${lm.nameZh} (${effectiveRange})`,
    effectiveRange,
    rangeKind,
    targetIso2,
    targetIso2s,
    assignableList,
    type: (lm.type as CsvLayerType) || 'Text',
    group,
    order: lm.order ?? 999,
    loadedTiming: lm.loadedTiming || 'on-demand',
    goto: lm.goto || undefined,
    focusTarget: lm.focusTarget || undefined,
    legend: lm.legend ? lm.legend.map((item) => ({ key: item.key, color: item.color, labelZh: item.labelZh })) : undefined,
    fgb: lm.fgb || undefined,
    innerGrid: lm.innerGrid || undefined,
    targetKeys: lm.targetKeys || [],
    loaded: false,
    data: null,
    meta: {
      id: lm.id,
      nameZh: lm.nameZh,
      nameEn: lm.nameEn,
      shortBadge: lm.shortBadge || undefined,
      accentColor: lm.accentColor || undefined,
      defaultColor: lm.defaultColor || undefined,
      descriptionZh: lm.descriptionZh || undefined,
      effectiveRange,
      type: (lm.type as CsvLayerType) || 'Text',
      group: lm.group,
      order: lm.order,
      goto: lm.goto || undefined,
      focusTarget: lm.focusTarget || undefined,
      legend: lm.legend ? lm.legend.map((item) => ({ key: item.key, color: item.color, labelZh: item.labelZh })) : undefined,
      fgb: lm.fgb || undefined,
      innerGrid: lm.innerGrid || undefined,
      targetKeys: lm.targetKeys || []
    }
  };
}

let cachedLayers: RegisteredCsvLayer[] | null = null;
let cachedLayersById: Map<string, RegisteredCsvLayer> | null = null;
let cachedLayersByPath: Map<string, RegisteredCsvLayer> | null = null;
let isLoaded = false;
const inFlightLoads = new Map<string, Promise<RegisteredCsvLayer | undefined>>();
const listeners = new Set<() => void>();

export function onLayersIndexLoaded(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function isLayersIndexLoaded(): boolean {
  return isLoaded;
}

export async function initCsvLayerRegistry(): Promise<RegisteredCsvLayer[]> {
  if (cachedLayers !== null && isLoaded) return cachedLayers;

  try {
    const layersIndex = await loadLayersIndex();
    const list: RegisteredCsvLayer[] = [];
    const byId = new Map<string, RegisteredCsvLayer>();
    const byPath = new Map<string, RegisteredCsvLayer>();

    for (const lm of layersIndex.layers) {
      const existing = cachedLayersById?.get(lm.id);
      const reg = existing || metaToRegisteredLayer(lm);
      list.push(reg);
      byId.set(reg.id, reg);
      byPath.set(reg.path, reg);

      const filename = reg.path.split('/').pop()?.replace(/\.csv$/, '');
      if (filename && !byId.has(filename)) {
        byId.set(filename, reg);
      }

      if (reg.loadedTiming === 'init' && !reg.loaded) {
        void loadOnDemandCsvLayer(reg.id);
      }
    }

    if (byId.has('pedestrian-crossing') && !byId.has('eu-pedestrian-crossing')) {
      byId.set('eu-pedestrian-crossing', byId.get('pedestrian-crossing')!);
    }

    cachedLayers = list;
    cachedLayersById = byId;
    cachedLayersByPath = byPath;
    isLoaded = true;

    for (const cb of listeners) {
      try {
        cb();
      } catch (err) {
        console.error(err);
      }
    }
    return list;
  } catch (err) {
    console.warn('[csvLayerRegistry] Failed to load layers index:', err);
    if (!cachedLayers) {
      cachedLayers = [];
      cachedLayersById = new Map();
      cachedLayersByPath = new Map();
    }
    return cachedLayers;
  }
}

if (typeof window !== 'undefined') {
  void initCsvLayerRegistry();
}

/**
 * Returns all layers indexed from remote layers-index.json.
 */
export function getRegisteredCsvLayers(): RegisteredCsvLayer[] {
  if (cachedLayers === null) {
    cachedLayers = [];
    cachedLayersById = new Map();
    cachedLayersByPath = new Map();
    void initCsvLayerRegistry();
  }
  return cachedLayers;
}
export const getRegisteredCsvFilters = getRegisteredCsvLayers;

/**
 * Looks up a registered CSV layer by ID or filename.
 */
export function getCsvLayerById(id: string): RegisteredCsvLayer | undefined {
  if (cachedLayersById === null) {
    getRegisteredCsvLayers();
  }
  const direct = cachedLayersById?.get(id);
  if (direct) return direct;
  if (id === 'eu-pedestrian-crossing') {
    return cachedLayersById?.get('pedestrian-crossing');
  }
  if (id === 'pedestrian-crossing') {
    return cachedLayersById?.get('eu-pedestrian-crossing');
  }
  return undefined;
}
export const getCsvFilterById = getCsvLayerById;

/**
 * Looks up a region's value in a registered CSV layer (O(1) Map lookup).
 */
export function getCsvLayerValue(layerId: string, regionId: string): string | null {
  if (!regionId) return null;
  const layer = getCsvLayerById(layerId);
  if (!layer || !layer.data) return null;

  const upper = regionId.trim().toUpperCase();
  const direct = layer.data.valueMap.get(upper);
  if (direct !== undefined) return direct;

  for (const key of layer.assignableList.normalizeId(upper)) {
    const val = layer.data.valueMap.get(key);
    if (val !== undefined) return val;
  }
  return null;
}
export const getCsvFilterValue = getCsvLayerValue;

/**
 * Returns the full CsvLayerKVRow object with all custom column attributes.
 */
export function getCsvLayerRow(layerId: string, regionId: string): CsvLayerKVRow | undefined {
  if (!regionId) return undefined;
  const layer = getCsvLayerById(layerId);
  if (!layer || !layer.data) return undefined;

  const upper = regionId.trim().toUpperCase();
  const direct = layer.data.rowMap.get(upper);
  if (direct !== undefined) return direct;

  for (const key of layer.assignableList.normalizeId(upper)) {
    const r = layer.data.rowMap.get(key);
    if (r !== undefined) return r;
  }
  return undefined;
}

/**
 * Looks up an L2 subdivision's value in a Nationwide CSV layer.
 */
export function getCsvSubdivisionValue(
  layerId: string,
  sub: {
    id?: string | number;
    code?: string;
    postal?: string;
    name?: string;
    nameEn?: string;
    nameZh?: string;
  }
): string | null {
  const layer = getCsvLayerById(layerId);
  if (!layer || !layer.data) return null;

  const candidates = [
    sub.code,
    sub.postal,
    sub.id !== undefined ? String(sub.id) : undefined,
    sub.nameEn,
    sub.name,
    sub.nameZh
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const val = getCsvLayerValue(layerId, raw);
    if (val !== null) return val;
  }
  return null;
}

/**
 * Exports a plain `Record<string, string>` dictionary for a given CSV layer ID.
 */
export function getCsvLayerRecord(layerId: string): Record<string, string> {
  const layer = getCsvLayerById(layerId);
  const record: Record<string, string> = {};
  if (!layer || !layer.data) return record;

  for (const row of layer.data.rows) {
    const keys = layer.assignableList.normalizeId(row.regionId);
    for (const k of keys) {
      record[k] = row.value;
    }
  }
  return record;
}
export const getCsvFilterRecord = getCsvLayerRecord;

/**
 * Fetches and parses a CSV layer over HTTP on demand when activated.
 */
export async function loadOnDemandCsvLayer(
  layerIdOrPath: string
): Promise<RegisteredCsvLayer | undefined> {
  let layer = getCsvLayerById(layerIdOrPath) || cachedLayersByPath?.get(layerIdOrPath);
  if (!layer) {
    await initCsvLayerRegistry();
    layer = getCsvLayerById(layerIdOrPath) || cachedLayersByPath?.get(layerIdOrPath);
  }
  if (!layer) return undefined;
  if (layer.loaded && layer.data) return layer;

  const existingPromise = inFlightLoads.get(layer.id);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    try {
      const resolvedUrl = getDataUrl(layer.path);
      const res = await fetch(resolvedUrl);
      if (!res.ok) {
        console.warn(`[CSV Layer] HTTP ${res.status} when fetching ${resolvedUrl}`);
        return layer;
      }
      const rawCsv = await res.text();
      const parsed = parseLayerDataCsv(rawCsv, layer.effectiveRange);

      if (parsed.invalidRegionIds.length > 0) {
        console.warn(
          `[CSV Layer] "${layer.path}" contains region-ids outside assignable list "${layer.assignableList.rangeKey}":`,
          parsed.invalidRegionIds
        );
      }

      layer.loaded = true;
      layer.data = parsed;
      if (parsed.meta.defaultColor) {
        layer.defaultColor = parsed.meta.defaultColor;
        layer.meta.defaultColor = parsed.meta.defaultColor;
      }
      if (parsed.meta.legend) {
        layer.legend = parsed.meta.legend;
        layer.meta.legend = parsed.meta.legend;
      }
      return layer;
    } catch (err) {
      console.warn(`[CSV Layer] Failed to fetch on-demand CSV at ${layer.path}:`, err);
      return layer;
    } finally {
      inFlightLoads.delete(layer.id);
    }
  })();

  inFlightLoads.set(layer.id, promise);
  return promise;
}
export const loadOnDemandCsvFilter = loadOnDemandCsvLayer;
