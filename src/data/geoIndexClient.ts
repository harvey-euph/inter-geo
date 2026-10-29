import { getIndexUrl, getDataUrl } from './dataSource';
import { parseCountriesCsv } from './countriesParser';
import type { CountryData } from '../types/geo';

export interface L2CountryMeta {
  iso2: string;
  countryId: string;
  name: string;
  nameZh: string;
  subdivisionCount: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface L3PartitionMeta {
  key: string;
  iso2: string;
  parentName: string;
  parentCode: string;
  file: string;
  subdivisionCount: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface L3CountryMeta {
  iso2: string;
  countryId: string;
  name: string;
  nameZh: string;
  unitNameZh: string;
  subdivisionCount: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  partitions: L3PartitionMeta[];
}

export interface RoadCountryManifest {
  iso2: string;
  name: string;
  nameZh: string;
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
  featureCount: number;
}

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
  l2Manifest?: L2CountryMeta[];
  l3Manifest?: L3CountryMeta[];
  roadsManifest?: Record<string, RoadCountryManifest>;
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
  group: 'fill-region' | 'fill-region-with-color' | 'global-label' | 'area-feature';
  order: number;
  accentColor: string | null;
  defaultColor: string | null;
  defaultStyle?: string | null;
  descriptionZh: string | null;
  effectiveRange?: string | null;
  loadedTiming?: string | null;
  focusTarget?: string | null;
  goto: string | null;
  legend?: Array<{ key: string; color: string; labelZh: string }> | null;
  fgb?: string | null;
  innerGrid?: string | null;
  columns?: string[];
  rowCount: number;
  targetKeys: string[];
}

export interface LayersIndex {
  files: string[];
  totalLayers: number;
  groups: {
    fillRegion: LayerMeta[];
    globalLabel: LayerMeta[];
    areaFeature: LayerMeta[];
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

export interface CountriesIndex {
  total: number;
  countries: CountryData[];
  centroids: Record<string, [number, number]>;
}

let cachedDataIndex: DataIndex | null = null;
let dataIndexPromise: Promise<DataIndex> | null = null;
const dataIndexListeners = new Set<() => void>();

let cachedLayersIndex: LayersIndex | null = null;
let layersIndexPromise: Promise<LayersIndex> | null = null;

let cachedInfoTargetsIndex: InfoTargetsIndex | null = null;
let infoTargetsPromise: Promise<InfoTargetsIndex> | null = null;

let cachedCountriesIndex: CountriesIndex | null = null;
let countriesIndexPromise: Promise<CountriesIndex> | null = null;
const countriesIndexListeners = new Set<() => void>();

// In-memory indexing caches for instant lookups
const countriesByIso2 = new Map<string, CountryData>();
const countriesByIso3 = new Map<string, CountryData>();
const countriesById = new Map<string, CountryData>();
const countriesByNameLower = new Map<string, CountryData>();
const countriesByNameZh = new Map<string, CountryData>();

const cachedL2CountryMap: Record<string, L2CountryMeta> = {};
const cachedL3PartitionsByCountry: Record<string, L3PartitionMeta[]> = {};
const cachedL3PartitionsByKey: Record<string, L3PartitionMeta> = {};
let cachedRoadsManifest: Record<string, RoadCountryManifest> = {};

function normKey(str: string): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_~]+/g, '');
}

/**
 * Standard country name aliases for loose lookup
 */
export const COUNTRY_NAME_ALIASES: Record<string, string> = {
  usa: '840',
  us: '840',
  'united states': '840',
  'united states of america': '840',
  uk: '826',
  gb: '826',
  'united kingdom': '826',
  greatbritain: '826',
  russia: '643',
  'russian federation': '643',
  southkorea: '410',
  korea: '410',
  'republic of korea': '410',
  northkorea: '408',
  taiwan: '158',
  czechia: '203',
  'czech republic': '203',
  uae: '784',
  'united arab emirates': '784',
  vietnam: '704',
  'viet nam': '704',
  turkey: '792',
  turkiye: '792',
  'türkiye': '792',
  cyprus: '196',
  'n. cyprus': '196',
  'northern cyprus': '196',
  laos: '418',
  'lao pdr': '418',
  malta: '470'
};

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

        // Populate L2 Map
        if (Array.isArray(data.l2Manifest)) {
          for (const item of data.l2Manifest) {
            cachedL2CountryMap[item.iso2] = item;
          }
        }

        // Populate L3 Maps
        if (Array.isArray(data.l3Manifest)) {
          for (const country of data.l3Manifest) {
            cachedL3PartitionsByCountry[country.iso2] = country.partitions;
            for (const p of country.partitions) {
              const iso = country.iso2;
              cachedL3PartitionsByKey[`${iso}:${p.key}`] = p;
              cachedL3PartitionsByKey[`${iso}:${normKey(p.key)}`] = p;
              if (p.parentName) {
                cachedL3PartitionsByKey[`${iso}:${normKey(p.parentName)}`] = p;
              }
              if (p.parentCode) {
                cachedL3PartitionsByKey[`${iso}:${normKey(p.parentCode)}`] = p;
              }
            }
          }
        }

        // Populate Roads Manifest
        if (data.roadsManifest) {
          cachedRoadsManifest = data.roadsManifest;
        }

        for (const cb of dataIndexListeners) {
          try {
            cb();
          } catch (e) {
            console.error(e);
          }
        }

        return data;
      })
      .catch((err) => {
        console.warn('[geoIndexClient] Failed to load remote data-index.json:', err);
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

export function onDataIndexLoaded(cb: () => void): () => void {
  if (cachedDataIndex) {
    cb();
    return () => {};
  }
  dataIndexListeners.add(cb);
  return () => {
    dataIndexListeners.delete(cb);
  };
}

export function getL2ManifestSync(): L2CountryMeta[] {
  return cachedDataIndex?.l2Manifest || [];
}

export function getL2CountryMapSync(): Record<string, L2CountryMeta> {
  return cachedL2CountryMap;
}

export function getL3ManifestSync(): L3CountryMeta[] {
  return cachedDataIndex?.l3Manifest || [];
}

export function getL3PartitionsByKeySync(): Record<string, L3PartitionMeta> {
  return cachedL3PartitionsByKey;
}

export function getRoadsManifestSync(): Record<string, RoadCountryManifest> {
  return cachedRoadsManifest;
}

export function findL3Partition(
  iso2: string,
  parts: { id?: string | number; code?: string; name?: string; nameEn?: string; nameZh?: string }
): L3PartitionMeta | undefined {
  const upper = (iso2 || '').toUpperCase();
  if (!upper || !cachedL3PartitionsByCountry[upper]) return undefined;
  const raw = [parts.code, parts.id, parts.name, parts.nameEn, parts.nameZh];
  for (const value of raw) {
    if (value === undefined || value === null || String(value) === '') continue;
    const text = String(value);
    const hit =
      cachedL3PartitionsByKey[`${upper}:${text}`] || cachedL3PartitionsByKey[`${upper}:${normKey(text)}`];
    if (hit) return hit;
  }
  return undefined;
}

export function hasL3ForSubdivision(
  iso2: string,
  parts: { id?: string | number; code?: string; name?: string; nameEn?: string; nameZh?: string }
): boolean {
  return findL3Partition(iso2, parts) !== undefined;
}

/**
 * Checks whether an L2 file exists for country iso2.
 */
export function hasCountryL2Sync(iso2: string): boolean {
  if (!cachedDataIndex) return true;
  const upper = iso2.toUpperCase();
  return cachedDataIndex.l2Countries.includes(upper);
}

/**
 * Resolves child subdivision file path if it exists.
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
 * Resolves an external object FGB file path from an object tag or prefix.
 * External objects MUST follow the 'ISO-Ext::LocalId' or 'ISO-Ext' format (e.g. 'TW-powerpoles::A').
 * Country ISO-2 codes or admin boundaries (e.g. 'DE', 'US', 'JP') are never external objects.
 */
export function resolveExtObjectFileSync(tagOrPrefix: string): string | null {
  if (!cachedDataIndex) return null;
  const tag = tagOrPrefix.trim();
  if (!tag) return null;

  const prefix = tag.includes('::') ? tag.split('::')[0].trim() : tag;
  // External datasets must have a hyphen (e.g. TW-powerpoles); bare country codes (e.g. DE, JP) are excluded
  if (!prefix.includes('-')) return null;

  const dashIdx = prefix.indexOf('-');
  const iso = prefix.slice(0, dashIdx).toUpperCase();
  const ext = prefix.slice(dashIdx + 1).toLowerCase();

  // 1. Look up in extByCountry from data-index.json (excluding roads)
  const byCountry = cachedDataIndex.extByCountry?.[iso];
  if (byCountry) {
    if (byCountry[ext] && !byCountry[ext].endsWith('-roads.fgb')) return byCountry[ext];
    const extClean = ext.replace(/[-_]/g, '');
    for (const [k, v] of Object.entries(byCountry)) {
      if (k === 'roads' || v.endsWith('-roads.fgb')) continue;
      if (k.toLowerCase() === ext || k.toLowerCase().replace(/[-_]/g, '') === extClean) {
        return v;
      }
    }
  }

  // 2. Direct match against data/XX-YYYY.fgb in dataIndex.files (excluding roads)
  const expectedPath = `data/${prefix}.fgb`.toLowerCase();
  if (!expectedPath.endsWith('-roads.fgb')) {
    for (const f of cachedDataIndex.files) {
      if (f.toLowerCase() === expectedPath) return f;
    }
  }

  return null;
}

export async function resolveExtObjectFile(tagOrPrefix: string): Promise<string | null> {
  await loadDataIndex();
  return resolveExtObjectFileSync(tagOrPrefix);
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
          groups: { fillRegion: [], globalLabel: [], areaFeature: [] },
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

export function queryTargetCardsSync(targetKey: string): InfoTargetCardEntry[] {
  if (!cachedInfoTargetsIndex) return [];
  const upper = targetKey.toUpperCase().trim();
  const direct = cachedInfoTargetsIndex[upper];
  if (direct) return direct;

  const colonNormalized = upper.replace(/^(COUNTRY|SUBDIVISION|MUNICIPALITY|ROAD|GRID):/, '');
  return cachedInfoTargetsIndex[colonNormalized] || [];
}

/**
 * Loads and caches countries index.
 * First tries countries-index.json from index branch, with seamless fallback
 * to fetching and parsing data/countries.csv directly.
 */
export async function loadCountriesIndex(): Promise<CountriesIndex> {
  if (cachedCountriesIndex) return cachedCountriesIndex;
  if (!countriesIndexPromise) {
    countriesIndexPromise = (async () => {
      let data: CountriesIndex | null = null;
      try {
        const res = await fetch(getIndexUrl('countries-index.json'));
        if (res.ok) {
          data = await res.json();
        }
      } catch {
        // Fall back to direct CSV
      }

      if (!data) {
        try {
          const csvRes = await fetch(getDataUrl('data/countries.csv'));
          if (csvRes.ok) {
            const csvText = await csvRes.text();
            const parsedCountries = parseCountriesCsv(csvText);
            data = {
              total: parsedCountries.length,
              countries: parsedCountries,
              centroids: {}
            };
          }
        } catch (e) {
          console.warn('[geoIndexClient] Failed to load data/countries.csv directly:', e);
        }
      }

      if (!data) {
        data = { total: 0, countries: [], centroids: {} };
      }

      cachedCountriesIndex = data;
      countriesByIso2.clear();
      countriesByIso3.clear();
      countriesById.clear();
      countriesByNameLower.clear();
      countriesByNameZh.clear();

      for (const c of data.countries) {
        if (c.iso2) countriesByIso2.set(c.iso2.toUpperCase(), c);
        if (c.iso3) countriesByIso3.set(c.iso3.toUpperCase(), c);
        if (c.id) {
          countriesById.set(String(c.id), c);
          const num = parseInt(c.id, 10);
          if (!isNaN(num)) countriesById.set(String(num), c);
        }
        if (c.name) countriesByNameLower.set(c.name.toLowerCase(), c);
        if (c.nameZh) countriesByNameZh.set(c.nameZh, c);
      }

      for (const cb of countriesIndexListeners) {
        try {
          cb();
        } catch (e) {
          console.error(e);
        }
      }

      return data;
    })();
  }
  return countriesIndexPromise;
}

export { parseCountriesCsv };

export function getCountriesIndexSync(): CountriesIndex | null {
  return cachedCountriesIndex;
}

export function getAllCountriesSync(): CountryData[] {
  return cachedCountriesIndex?.countries || [];
}

export function onCountriesIndexLoaded(cb: () => void): () => void {
  if (cachedCountriesIndex) {
    cb();
    return () => {};
  }
  countriesIndexListeners.add(cb);
  return () => {
    countriesIndexListeners.delete(cb);
  };
}

export function getCountryCentroidSync(iso2: string): [number, number] | undefined {
  if (!cachedCountriesIndex?.centroids) return undefined;
  return cachedCountriesIndex.centroids[iso2.toUpperCase()];
}

export function getAllCentroidsSync(): Record<string, [number, number]> {
  return cachedCountriesIndex?.centroids || {};
}

/**
 * Flexible lookup helper: matches numeric ISO, names, Alpha codes, or aliases.
 */
export function findCountry(idOrName: string | number | undefined): CountryData | undefined {
  if (!idOrName) return undefined;

  const rawStr = String(idOrName).trim();
  const cleanStr = rawStr.toLowerCase();
  const upper = rawStr.toUpperCase();

  // 1. Direct ISO2 / ISO3 / ID match
  const hitIso2 = countriesByIso2.get(upper);
  if (hitIso2) return hitIso2;
  const hitIso3 = countriesByIso3.get(upper);
  if (hitIso3) return hitIso3;
  const hitId = countriesById.get(rawStr);
  if (hitId) return hitId;

  // 2. Direct numeric ISO comparison
  const queryNum = parseInt(rawStr, 10);
  if (!isNaN(queryNum)) {
    const numHit = countriesById.get(String(queryNum));
    if (numHit) return numHit;
  }

  // 3. Name or Chinese name match
  const nameHit = countriesByNameLower.get(cleanStr);
  if (nameHit) return nameHit;
  const zhHit = countriesByNameZh.get(rawStr);
  if (zhHit) return zhHit;

  // 4. Check alias map
  const aliasTargetId = COUNTRY_NAME_ALIASES[cleanStr] || COUNTRY_NAME_ALIASES[normKey(cleanStr)];
  if (aliasTargetId) {
    const aliasHit = countriesById.get(aliasTargetId);
    if (aliasHit) return aliasHit;
  }

  // 5. Fallback loose search over all countries
  if (cachedCountriesIndex) {
    const normQ = cleanStr.replace(/[^a-z]/g, '');
    for (const c of cachedCountriesIndex.countries) {
      if (c.name.toLowerCase() === cleanStr) return c;
      if (c.nameZh === rawStr) return c;
      if (c.iso2.toLowerCase() === cleanStr) return c;
      if (c.iso3.toLowerCase() === cleanStr) return c;
      const normC = c.name.toLowerCase().replace(/[^a-z]/g, '');
      if (normC && normQ && normC === normQ) return c;
    }
  }

  return undefined;
}

// Auto-trigger background loading of indexes when running in browser
if (typeof window !== 'undefined') {
  void loadCountriesIndex();
  void loadDataIndex();
  void loadLayersIndex();
}
