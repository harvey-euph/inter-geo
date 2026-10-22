import {
  parseFilterRegistryCsv,
  parseFilterDataCsv,
  type CsvFilterRegistryEntry,
  type ParsedCsvFilterData
} from './csvFilterParser';

/**
 * Raw CSV files in `/src/content/filters/` bundled via Vite's glob import.
 * `init` filters are parsed at startup; `on-demand` filters defer parsing (or fetch from public/) until requested.
 */
const bundledCsvFiles = import.meta.glob('/src/content/filters/**/*.csv', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const REGISTRY_CSV_PATH = '/src/content/filters/filter-reg.csv';

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
  /** Parsed K-V data (populated immediately for `init`, or after `loadCsvFilter` for `on-demand`) */
  data: ParsedCsvFilterData | null;
}

let cachedFilters: RegisteredCsvFilter[] | null = null;
let cachedFiltersById: Map<string, RegisteredCsvFilter> | null = null;
let cachedFiltersByPath: Map<string, RegisteredCsvFilter> | null = null;

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
    loaded: parsedData !== null,
    data: parsedData
  };
}

function initCsvFilterRegistry(): void {
  if (cachedFilters !== null) return;

  const regRaw = bundledCsvFiles[REGISTRY_CSV_PATH] || '';
  const entries = parseFilterRegistryCsv(regRaw);

  const list: RegisteredCsvFilter[] = [];
  const byId = new Map<string, RegisteredCsvFilter>();
  const byPath = new Map<string, RegisteredCsvFilter>();

  for (const entry of entries) {
    let parsedData: ParsedCsvFilterData | null = null;

    if (entry.loadedTiming === 'init') {
      const rawCsv = bundledCsvFiles[entry.path];
      if (rawCsv !== undefined) {
        parsedData = parseFilterDataCsv(rawCsv, entry.effectiveRange);
        if (parsedData.invalidRegionIds.length > 0) {
          console.warn(
            `[CSV Filter] "${entry.path}" contains region-ids outside assignable list "${entry.assignableList.rangeKey}":`,
            parsedData.invalidRegionIds
          );
        }
      } else {
        console.warn(`[CSV Filter] Registered CSV file not found at path: ${entry.path}`);
      }
    }

    const filter = buildRegisteredFilter(entry, parsedData);
    list.push(filter);
    byId.set(filter.id, filter);
    byPath.set(filter.path, filter);
  }

  cachedFilters = list;
  cachedFiltersById = byId;
  cachedFiltersByPath = byPath;
}

/**
 * Returns all filters registered in `src/content/filters/filter-reg.csv`.
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
 * Loads an `on-demand` CSV filter asynchronously when needed.
 */
export async function loadOnDemandCsvFilter(filterIdOrPath: string): Promise<RegisteredCsvFilter | undefined> {
  initCsvFilterRegistry();
  const filter = cachedFiltersById?.get(filterIdOrPath) || cachedFiltersByPath?.get(filterIdOrPath);
  if (!filter) return undefined;
  if (filter.loaded && filter.data) return filter;

  let rawCsv = bundledCsvFiles[filter.path];
  if (rawCsv === undefined) {
    const res = await fetch(filter.path);
    if (res.ok) {
      rawCsv = await res.text();
    }
  }
  if (rawCsv === undefined) {
    console.warn(`[CSV Filter] Failed to load on-demand CSV at ${filter.path}`);
    return filter;
  }

  const parsed = parseFilterDataCsv(rawCsv, filter.effectiveRange);
  const updated = buildRegisteredFilter(filter, parsed);

  filter.id = updated.id;
  filter.nameZh = updated.nameZh;
  filter.nameEn = updated.nameEn;
  filter.shortBadge = updated.shortBadge;
  filter.accentColor = updated.accentColor;
  filter.descriptionZh = updated.descriptionZh;
  filter.loaded = true;
  filter.data = parsed;

  cachedFiltersById?.set(filter.id, filter);
  return filter;
}
