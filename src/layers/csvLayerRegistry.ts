import { getDataUrl } from '../data/dataSource';
import { loadLayersIndex, type LayerMeta } from '../data/geoIndexClient';
import {
  getAssignableRegionList,
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
  /** Default text style if specified (CSS string or preset) */
  defaultStyle?: string;
  /** Description in Traditional Chinese */
  descriptionZh: string;
  /** Optional effective range string (derived or legacy) */
  effectiveRange?: string;
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
  group: 'fill-region' | 'fill-region-with-color' | 'global-label' | 'area-feature';
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

function metaToRegisteredLayer(lm: LayerMeta): RegisteredCsvLayer {
  // Extract target ISO-2 codes automatically from targetKeys if present
  const targetIso2Set = new Set<string>();
  if (lm.fgb) {
    const roadMatch = lm.fgb.match(/\/([A-Z]{2})-roads\.fgb/i);
    if (roadMatch) targetIso2Set.add(roadMatch[1].toUpperCase());
  }
  if (lm.id.startsWith('us-')) {
    targetIso2Set.add('US');
  }
  if (lm.targetKeys) {
    for (const rawKey of lm.targetKeys) {
      for (const key of rawKey.split('|').map((s) => s.trim()).filter(Boolean)) {
        if (key.includes('::')) {
          targetIso2Set.add(key.split('::')[0].toUpperCase());
        } else if (key.includes('-') && !key.startsWith('I-')) {
          targetIso2Set.add(key.split('-')[0].toUpperCase());
        } else if (/^[A-Z]{2}$/i.test(key)) {
          targetIso2Set.add(key.toUpperCase());
        }
      }
    }
  }
  const targetIso2s = Array.from(targetIso2Set);
  const targetIso2 = targetIso2s.length === 1 ? targetIso2s[0] : (targetIso2s.length > 0 ? targetIso2s[0] : '*');
  const rawGroup = lm.group || 'global-label';
  const group = rawGroup === 'fill-region-with-color' ? 'fill-region' : rawGroup;
  const rangeKind = group === 'global-label' || targetIso2s.length > 5 || targetIso2s.length === 0 ? 'International' : 'Nationwide';
  const effectiveRange = lm.effectiveRange || (rangeKind === 'Nationwide' && targetIso2 !== '*' ? `Nationwide:${targetIso2s.join('|')}` : 'International');
  const assignableList = getAssignableRegionList(effectiveRange);
  const layerType = (lm.type as CsvLayerType) || (group === 'fill-region' ? 'FillWithColor' : 'TextWithStyle');

  return {
    id: lm.id,
    path: lm.file,
    nameZh: lm.nameZh,
    nameEn: lm.nameEn,
    shortBadge: lm.shortBadge || lm.nameZh,
    accentColor: lm.accentColor || '#38bdf8',
    defaultColor: lm.defaultColor || undefined,
    defaultStyle: lm.defaultStyle || undefined,
    descriptionZh: lm.descriptionZh || lm.nameZh,
    effectiveRange,
    rangeKind,
    targetIso2,
    targetIso2s,
    assignableList,
    type: layerType,
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
      defaultStyle: lm.defaultStyle || undefined,
      descriptionZh: lm.descriptionZh || undefined,
      effectiveRange,
      type: layerType,
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

    const areaCodeAliases: Record<string, string> = {
      'area-codes-BR': 'br-ddd-codes',
      'area-codes-JP': 'jp-area-codes',
      'area-codes-AU': 'au-area-codes',
      'area-codes-FR': 'fr-area-codes',
      'area-codes-RU': 'ru-area-codes',
      'area-codes-TH': 'th-area-codes',
      'area-codes-ID': 'id-area-codes',
      'area-codes-MX': 'mx-area-codes',
      'area-codes-AR': 'ar-area-codes',
      'area-codes-GB': 'gb-area-codes',
      'area-codes-US': 'us-area-codes'
    };
    for (const [alias, targetId] of Object.entries(areaCodeAliases)) {
      if (byId.has(targetId) && !byId.has(alias)) {
        byId.set(alias, byId.get(targetId)!);
      }
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
  const areaCodeAliases: Record<string, string> = {
    'area-codes-BR': 'br-ddd-codes',
    'area-codes-JP': 'jp-area-codes',
    'area-codes-AU': 'au-area-codes',
    'area-codes-FR': 'fr-area-codes',
    'area-codes-RU': 'ru-area-codes',
    'area-codes-TH': 'th-area-codes',
    'area-codes-ID': 'id-area-codes',
    'area-codes-MX': 'mx-area-codes',
    'area-codes-AR': 'ar-area-codes',
    'area-codes-GB': 'gb-area-codes',
    'area-codes-US': 'us-area-codes'
  };
  if (areaCodeAliases[id]) {
    return cachedLayersById?.get(areaCodeAliases[id]);
  }
  return undefined;
}

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
 * Looks up an L2 subdivision's full row in a Nationwide CSV layer.
 */
export function getCsvSubdivisionRow(
  layerId: string,
  sub: {
    id?: string | number;
    code?: string;
    postal?: string;
    name?: string;
    nameEn?: string;
    nameZh?: string;
  }
): CsvLayerKVRow | undefined {
  const layer = getCsvLayerById(layerId);
  if (!layer || !layer.data) return undefined;

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
    const row = getCsvLayerRow(layerId, raw);
    if (row !== undefined) return row;
  }
  return undefined;
}

/**
 * Returns the pure numeric code for a subdivision, stripping any regional prefix abbreviation.
 */
export function getCsvSubdivisionCode(
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
  const row = getCsvSubdivisionRow(layerId, sub);
  if (row) {
    const raw = row.attributes?.code || row.value || '';
    if (raw) {
      return raw.includes('·') ? raw.split('·').pop()!.trim() : raw.trim();
    }
  }
  const rawVal = getCsvSubdivisionValue(layerId, sub);
  if (!rawVal) return null;
  return rawVal.includes('·') ? rawVal.split('·').pop()!.trim() : rawVal.trim();
}

/**
 * Exports a plain `Record<string, string>` dictionary for a given CSV layer ID.
 */
export function getCsvLayerRecord(layerId: string): Record<string, string> {
  const layer = getCsvLayerById(layerId);
  const record: Record<string, string> = {};
  if (!layer || !layer.data) return record;

  for (const row of layer.data.rows) {
    const members = row.unionMembers || [row.regionId];
    for (const memberId of members) {
      const keys = layer.assignableList.normalizeId(memberId);
      for (const k of keys) {
        record[k] = row.value;
      }
    }
  }
  return record;
}

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

      if (layer.effectiveRange && layer.effectiveRange !== 'International' && parsed.invalidRegionIds.length > 0) {
        console.warn(
          `[CSV Layer] "${layer.path}" contains region-ids outside assignable list "${layer.assignableList.rangeKey}":`,
          parsed.invalidRegionIds
        );
      }

      layer.loaded = true;
      layer.data = parsed;
      if (parsed.meta.goto) {
        layer.goto = parsed.meta.goto;
        layer.meta.goto = parsed.meta.goto;
      }
      if (parsed.meta.focusTarget) {
        layer.focusTarget = parsed.meta.focusTarget;
        layer.meta.focusTarget = parsed.meta.focusTarget;
      }
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
