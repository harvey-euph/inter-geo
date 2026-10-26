import { getDataUrl } from '../data/dataSource';
import { loadLayersIndex } from '../data/geoIndexClient';
import {
  getAssignableRegionList,
  parseEffectiveRange
} from './assignableRegions';
import {
  parseFilterDataCsv,
  type CsvFilterRegistryEntry,
  type CsvFilterStub,
  type ParsedCsvFilterData
} from './csvFilterParser';

export interface RegisteredCsvFilter extends CsvFilterRegistryEntry {
  /** Final resolved filter ID (prefers `@id` directive or registry `Id` column, falls back to filename) */
  id: string;
  /** Display name in Traditional Chinese */
  nameZh: string;
  /** Display name in English */
  nameEn: string;
  /** Short badge text for toolbar pills */
  shortBadge: string;
  /** Theme accent color */
  accentColor: string;
  /** Description in Traditional Chinese */
  descriptionZh: string;
  /** Whether the CSV data has been loaded and parsed */
  loaded: boolean;
  /** Optional camera goto query string (lat=...&lon=...&ratio=...) */
  goto?: string;
  /** Parsed K-V data (populated after `loadOnDemandCsvFilter` fetches the CSV) */
  data: ParsedCsvFilterData | null;
}

const INITIAL_CSV_LAYER_STUBS: CsvFilterStub[] = [
  {
    id: 'flag',
    path: 'layers/flags.csv',
    loadedTiming: 'on-demand',
    effectiveRange: 'International',
    type: 'Text',
    order: 1,
    meta: {
      id: 'flag',
      nameZh: '國旗',
      nameEn: 'National Flag',
      shortBadge: '🏳️ 國旗',
      accentColor: '#f8fafc',
      defaultColor: '#f8fafc',
      descriptionZh: '顯示全球各國國旗符號（可與國碼、網域或貨幣並列顯示，如 🇹🇼 +886）',
      effectiveRange: 'International',
      type: 'Text',
      group: 'global-label',
      order: 1
    }
  },
  {
    id: 'callingCode',
    path: 'layers/country-code.csv',
    loadedTiming: 'on-demand',
    effectiveRange: 'International',
    type: 'Text',
    order: 2,
    meta: {
      id: 'callingCode',
      nameZh: '電話國碼',
      nameEn: 'Calling Code',
      shortBadge: '📞 國碼',
      accentColor: '#34d399',
      defaultColor: '#34d399',
      descriptionZh: '顯示全球各國國際電話區號（如 +886、+81、+1、+44 等）',
      effectiveRange: 'International',
      type: 'Text',
      group: 'global-label',
      order: 2
    }
  },
  {
    id: 'tld',
    path: 'layers/tld.csv',
    loadedTiming: 'on-demand',
    effectiveRange: 'International',
    type: 'Text',
    order: 3,
    meta: {
      id: 'tld',
      nameZh: '頂級網域名稱',
      nameEn: 'Country Code TLD',
      shortBadge: '🌐 網域',
      accentColor: '#38bdf8',
      defaultColor: '#38bdf8',
      descriptionZh: '顯示全球各國國家及地區頂級域名（如 .tw、.jp、.uk 等）',
      effectiveRange: 'International',
      type: 'Text',
      group: 'global-label',
      order: 3
    }
  },
  {
    id: 'currency',
    path: 'layers/currency.csv',
    loadedTiming: 'on-demand',
    effectiveRange: 'International',
    type: 'Text',
    order: 4,
    meta: {
      id: 'currency',
      nameZh: '國家貨幣',
      nameEn: 'Currency',
      shortBadge: '💰 貨幣',
      accentColor: '#fbbf24',
      defaultColor: '#fbbf24',
      descriptionZh: '顯示各國貨幣符號與代碼（如 NT$ / TWD、¥ / JPY、$ / USD 等）',
      effectiveRange: 'International',
      type: 'Text',
      group: 'global-label',
      order: 4
    }
  },
  {
    id: 'distinctiveLetters',
    path: 'layers/distinctive-letters.csv',
    loadedTiming: 'on-demand',
    effectiveRange: 'International',
    type: 'Text',
    order: 5,
    meta: {
      id: 'distinctiveLetters',
      nameZh: '特色字母',
      nameEn: 'Distinctive Letters',
      shortBadge: '🔤 字母',
      accentColor: '#a855f7',
      defaultColor: '#a855f7',
      descriptionZh: '顯示該國語言中具有高辨識度之特殊字母（如 ø, æ, ł, đ, ã, ő, ę, ň 等）',
      effectiveRange: 'International',
      type: 'Text',
      group: 'area-label',
      order: 5
    }
  },
  {
    id: 'streetWords',
    path: 'layers/street-words.csv',
    loadedTiming: 'on-demand',
    effectiveRange: 'International',
    type: 'Text',
    order: 6,
    meta: {
      id: 'streetWords',
      nameZh: '路牌「街/路」用詞',
      nameEn: 'Street / Road Sign Words',
      shortBadge: '🪧 路名',
      accentColor: '#10b981',
      defaultColor: '#10b981',
      descriptionZh: '顯示各國路標路牌最常見之「路/街」縮寫或單詞（如 Str., gade, ul., ulica, utca, calle 等）',
      effectiveRange: 'International',
      type: 'Text',
      group: 'area-label',
      order: 6
    }
  },
  {
    id: 'indiaScripts',
    path: 'layers/india-scripts.csv',
    loadedTiming: 'on-demand',
    effectiveRange: 'Nationwide:IN|LK|BD',
    type: 'Text',
    order: 7,
    meta: {
      id: 'indiaScripts',
      nameZh: '南亞文字特徵 (印/斯/孟)',
      nameEn: 'South Asia Scripts (IN/LK/BD)',
      shortBadge: '🇮🇳 南亞文字',
      accentColor: '#f97316',
      defaultColor: '#f97316',
      descriptionZh: '印度各邦官方文字與斯里蘭卡、孟加拉文字特徵（如天城文、孟加拉文、坦米爾文、泰盧固文等）',
      effectiveRange: 'Nationwide:IN|LK|BD',
      type: 'Text',
      group: 'area-label',
      order: 7
    }
  },
  {
    id: 'drivingSide',
    path: 'layers/driving-side.csv',
    loadedTiming: 'on-demand',
    effectiveRange: 'International',
    type: 'FillWithColor',
    order: 8,
    meta: {
      id: 'drivingSide',
      nameZh: '行駛方向 (左右行)',
      nameEn: 'Driving Side',
      shortBadge: '🚦 方向',
      accentColor: '#3b82f6',
      defaultColor: '#3b82f6',
      descriptionZh: '全球各國道路通行方向（靠左行駛與靠右行駛）制度分布',
      effectiveRange: 'International',
      type: 'FillWithColor',
      group: 'fill-region',
      order: 8
    }
  },
  {
    id: 'coverage',
    path: 'layers/coverage.csv',
    loadedTiming: 'on-demand',
    effectiveRange: 'International',
    type: 'FillWithColor',
    order: 9,
    meta: {
      id: 'coverage',
      nameZh: '街景全覽',
      nameEn: 'Street View Coverage',
      shortBadge: '🌍 街景',
      accentColor: '#38bdf8',
      defaultColor: '#38bdf8',
      descriptionZh: '顯示全球具備 Google 街景官方覆蓋之國家',
      effectiveRange: 'International',
      type: 'FillWithColor',
      group: 'fill-region',
      order: 9
    }
  },
  {
    id: 'roadMarkings',
    path: 'layers/road-markings.csv',
    loadedTiming: 'on-demand',
    effectiveRange: 'International',
    type: 'FillWithColor',
    order: 10,
    meta: {
      id: 'roadMarkings',
      nameZh: '道路標線 (邊線/中線)',
      nameEn: 'Road Markings (Edge / Center)',
      shortBadge: '🛣️ 標線',
      accentColor: '#f59e0b',
      defaultColor: '#f1f5f9:#f59e0b',
      descriptionZh: '顯示全球各國道路邊線與中心線顏色規格（#外框邊線:#中心車道線）',
      effectiveRange: 'International',
      type: 'FillWithColor',
      group: 'fill-region',
      order: 10
    }
  }
];

let cachedFilters: RegisteredCsvFilter[] | null = null;
let cachedFiltersById: Map<string, RegisteredCsvFilter> | null = null;
let cachedFiltersByPath: Map<string, RegisteredCsvFilter> | null = null;
const inFlightLoads = new Map<string, Promise<RegisteredCsvFilter | undefined>>();

function buildRegisteredFilter(
  entry: CsvFilterRegistryEntry,
  parsedData: ParsedCsvFilterData | null
): RegisteredCsvFilter {
  const fileMeta = parsedData?.meta || {};
  const regMeta = entry.meta;

  const id = fileMeta.id || regMeta.id || entry.id;
  const nameZh = fileMeta.nameZh || regMeta.nameZh || id;
  const nameEn = fileMeta.nameEn || regMeta.nameEn || id;
  const shortBadge = fileMeta.shortBadge || regMeta.shortBadge || nameZh;
  const accentColor = fileMeta.accentColor || regMeta.accentColor || '#38bdf8';
  const descriptionZh =
    fileMeta.descriptionZh ||
    regMeta.descriptionZh ||
    `${nameZh} (${entry.effectiveRange} · ${entry.type})`;

  return {
    ...entry,
    id,
    nameZh,
    nameEn,
    shortBadge,
    accentColor,
    descriptionZh,
    goto: fileMeta.goto || regMeta.goto,
    meta: { ...regMeta, ...fileMeta },
    loaded: parsedData !== null,
    data: parsedData
  };
}

function stubToRegistryEntry(stub: CsvFilterStub): CsvFilterRegistryEntry {
  const effectiveRange = stub.effectiveRange || stub.meta.effectiveRange || 'International';
  const { kind: rangeKind, targetIso2, targetIso2s } = parseEffectiveRange(effectiveRange);
  const assignableList = getAssignableRegionList(effectiveRange);

  return {
    id: stub.id,
    loadedTiming: stub.loadedTiming || stub.meta.loadedTiming || 'on-demand',
    effectiveRange,
    rangeKind,
    targetIso2,
    targetIso2s,
    assignableList,
    path: stub.path,
    type: stub.type || stub.meta.type || 'Text',
    meta: stub.meta
  };
}

function initCsvFilterRegistry(): void {
  if (cachedFilters !== null) return;

  const list: RegisteredCsvFilter[] = [];
  const byId = new Map<string, RegisteredCsvFilter>();
  const byPath = new Map<string, RegisteredCsvFilter>();

  for (const stub of INITIAL_CSV_LAYER_STUBS) {
    const entry = stubToRegistryEntry(stub);
    // At init time, only use the lightweight header metadata from initial stubs
    const filter = buildRegisteredFilter(entry, null);
    list.push(filter);
    byId.set(filter.id, filter);
    byPath.set(filter.path, filter);

    // Register by filename without .csv extension for easy URL matching (?layer=file-name)
    const filename = filter.path.split('/').pop()?.replace(/\.csv$/, '');
    if (filename && !byId.has(filename)) {
      byId.set(filename, filter);
    }

    // If a filter is explicitly marked 'init', trigger background fetch immediately
    if (entry.loadedTiming === 'init') {
      void loadOnDemandCsvFilter(filter.id);
    }
  }

  cachedFilters = list;
  cachedFiltersById = byId;
  cachedFiltersByPath = byPath;
}

export async function syncFromRemoteLayersIndex(): Promise<void> {
  try {
    const layersData = await loadLayersIndex();
    if (!layersData || !layersData.layers) return;
    initCsvFilterRegistry();
    if (!cachedFilters || !cachedFiltersById || !cachedFiltersByPath) return;

    for (const lm of layersData.layers) {
      if (!cachedFiltersById.has(lm.id)) {
        const stub: CsvFilterStub = {
          id: lm.id,
          path: lm.file,
          loadedTiming: lm.loadedTiming as 'on-demand' | 'init',
          effectiveRange: lm.effectiveRange || 'International',
          type: lm.type as 'Text' | 'FillWithColor',
          order: lm.order,
          meta: {
            id: lm.id,
            nameZh: lm.nameZh,
            nameEn: lm.nameEn,
            shortBadge: lm.shortBadge || lm.nameZh,
            accentColor: lm.accentColor || '#64748b',
            defaultColor: lm.defaultColor || '#64748b',
            descriptionZh: lm.descriptionZh || '',
            effectiveRange: lm.effectiveRange || 'International',
            type: lm.type as 'Text' | 'FillWithColor',
            group: lm.group,
            order: lm.order
          }
        };
        const entry = stubToRegistryEntry(stub);
        const filter = buildRegisteredFilter(entry, null);
        cachedFilters.push(filter);
        cachedFiltersById.set(filter.id, filter);
        cachedFiltersByPath.set(filter.path, filter);
      }
    }
  } catch (err) {
    console.warn('[CSV Filter] Failed to sync remote layers:', err);
  }
}

if (typeof window !== 'undefined') {
  void syncFromRemoteLayersIndex();
}

/**
 * Returns all filters indexed from CSV files in `public/layers/`.
 */
export function getRegisteredCsvFilters(): RegisteredCsvFilter[] {
  initCsvFilterRegistry();
  return cachedFilters || [];
}

/**
 * Looks up a registered CSV filter by its ID (e.g. `'callingCode'`, `'tld'`) or filename.
 */
export function getCsvFilterById(id: string): RegisteredCsvFilter | undefined {
  initCsvFilterRegistry();
  return cachedFiltersById?.get(id);
}

/**
 * Looks up a region's value in a registered CSV filter (O(1) Map lookup).
 */
export function getCsvFilterValue(filterId: string, regionId: string): string | null {
  if (!regionId) return null;
  initCsvFilterRegistry();
  const filter = cachedFiltersById?.get(filterId);
  if (!filter || !filter.data) return null;

  const upper = regionId.trim().toUpperCase();
  const direct = filter.data.valueMap.get(upper);
  if (direct !== undefined) return direct;

  for (const key of filter.assignableList.normalizeId(upper)) {
    const val = filter.data.valueMap.get(key);
    if (val !== undefined) return val;
  }
  return null;
}

/**
 * Looks up an L2 subdivision's value in a Nationwide CSV filter by checking
 * code, postal, id, English name, local name, and Chinese name.
 */
export function getCsvSubdivisionValue(
  filterId: string,
  sub: {
    id?: string | number;
    code?: string;
    postal?: string;
    name?: string;
    nameEn?: string;
    nameZh?: string;
  }
): string | null {
  initCsvFilterRegistry();
  const filter = cachedFiltersById?.get(filterId);
  if (!filter || !filter.data) return null;

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
    const val = getCsvFilterValue(filterId, raw);
    if (val !== null) return val;
  }
  return null;
}

/**
 * Exports a plain `Record<string, string>` dictionary for a given CSV filter ID.
 */
export function getCsvFilterRecord(filterId: string): Record<string, string> {
  initCsvFilterRegistry();
  const filter = cachedFiltersById?.get(filterId);
  const record: Record<string, string> = {};
  if (!filter || !filter.data) return record;

  for (const row of filter.data.rows) {
    const keys = filter.assignableList.normalizeId(row.regionId);
    for (const k of keys) {
      record[k] = row.value;
    }
  }
  return record;
}

/**
 * Fetches and parses a CSV filter over HTTP on demand when needed.
 */
export async function loadOnDemandCsvFilter(
  filterIdOrPath: string
): Promise<RegisteredCsvFilter | undefined> {
  initCsvFilterRegistry();
  const filter =
    cachedFiltersById?.get(filterIdOrPath) || cachedFiltersByPath?.get(filterIdOrPath);
  if (!filter) return undefined;
  if (filter.loaded && filter.data) return filter;

  const existingPromise = inFlightLoads.get(filter.id);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    try {
      const resolvedUrl = getDataUrl(filter.path);
      const res = await fetch(resolvedUrl);
      if (!res.ok) {
        console.warn(`[CSV Filter] HTTP ${res.status} when fetching ${resolvedUrl}`);
        return filter;
      }
      const rawCsv = await res.text();
      const parsed = parseFilterDataCsv(rawCsv, filter.effectiveRange);

      if (parsed.invalidRegionIds.length > 0) {
        console.warn(
          `[CSV Filter] "${filter.path}" contains region-ids outside assignable list "${filter.assignableList.rangeKey}":`,
          parsed.invalidRegionIds
        );
      }

      const updated = buildRegisteredFilter(filter, parsed);
      filter.id = updated.id;
      filter.nameZh = updated.nameZh;
      filter.nameEn = updated.nameEn;
      filter.shortBadge = updated.shortBadge;
      filter.accentColor = updated.accentColor;
      filter.descriptionZh = updated.descriptionZh;
      filter.meta = updated.meta;
      filter.loaded = true;
      filter.data = parsed;

      cachedFiltersById?.set(filter.id, filter);
      return filter;
    } catch (err) {
      console.warn(`[CSV Filter] Failed to fetch on-demand CSV at ${filter.path}:`, err);
      return filter;
    } finally {
      inFlightLoads.delete(filter.id);
    }
  })();

  inFlightLoads.set(filter.id, promise);
  return promise;
}
