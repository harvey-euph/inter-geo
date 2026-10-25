import csvFilterStubs from 'virtual:csv-filter-index';
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
  /** Parsed K-V data (populated after `loadOnDemandCsvFilter` fetches the CSV) */
  data: ParsedCsvFilterData | null;
}

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

  for (const stub of csvFilterStubs) {
    const entry = stubToRegistryEntry(stub);
    // At init time, only use the lightweight header metadata from virtual:csv-filter-index
    const filter = buildRegisteredFilter(entry, null);
    list.push(filter);
    byId.set(filter.id, filter);
    byPath.set(filter.path, filter);

    // If a filter is explicitly marked 'init', trigger background fetch immediately
    if (entry.loadedTiming === 'init') {
      void loadOnDemandCsvFilter(filter.id);
    }
  }

  cachedFilters = list;
  cachedFiltersById = byId;
  cachedFiltersByPath = byPath;
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
      const resolvedUrl = `${import.meta.env.BASE_URL.replace(/\/+$/, '')}/${filter.path.replace(/^\/+/, '')}`;
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
