/**
 * Shared Data Source Configuration for Inter-Geo
 *
 * Points directly to raw content in the https://github.com/harvey-euph/inter-geo-data repository.
 */

export const DATA_RAW_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DATA_BASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.DEV
    ? '/inter-geo/@geo-data'
    : 'https://raw.githubusercontent.com/harvey-euph/inter-geo-data/refs/heads');

export const DATA_BRANCH = 'main';
export const INDEX_BRANCH = 'index';

/**
 * Normalizes legacy asset paths to the new inter-geo-data file structure:
 * - data/countries-110m.fgb -> data/COUNTRY.fgb
 * - data/l2/XX.fgb -> data/XX.fgb
 * - data/l3/XX/YY.fgb -> data/XX/YY.fgb
 * - data/roads/XX.fgb -> data/XX-roads.fgb
 * - public/layers/... -> layers/...
 * - public/info/... -> info/...
 * - public/images/... -> images/...
 */
export function normalizeDataPath(rawPath: string): string {
  let p = rawPath.replace(/^\/+/, '');
  p = p.replace(/^public\//, '');

  if (p === 'data/countries-110m.fgb' || p === 'countries-110m.fgb') {
    return 'data/COUNTRY.fgb';
  }
  if (p.startsWith('data/l2/')) {
    return p.replace(/^data\/l2\//, 'data/');
  }
  if (p.startsWith('data/l3/')) {
    return p.replace(/^data\/l3\//, 'data/');
  }
  if (p.startsWith('data/roads/')) {
    return p.replace(/^data\/roads\/([A-Za-z0-9_-]+)\.fgb$/, 'data/$1-roads.fgb');
  }
  if (p.startsWith('layers/fill-region/') && !p.startsWith('layers/fill-region-with-color/')) {
    p = p.replace(/^layers\/fill-region\//, 'layers/fill-region-with-color/');
  }
  if (p.startsWith('layers/area-label/distinctive-letters.csv')) {
    return 'layers/global-label/distinctive-letters.csv';
  }
  if (p.startsWith('layers/area-label/street-words.csv')) {
    return 'layers/global-label/street-words.csv';
  }
  if (p.startsWith('layers/') && !p.includes('/', 7)) {
    const fn = p.slice(7);
    const camelToKebab: Record<string, string> = {
      drivingside: 'driving-side',
      carmeta: 'car-meta',
      platetype: 'plate-type',
      roadmarkings: 'road-markings',
      countrycode: 'country-code',
      distinctiveletters: 'distinctive-letters',
      indiascripts: 'india-scripts',
      streetwords: 'street-words',
      taiwanpowerpoles: 'taiwan-power-poles'
    };
    const baseKey = fn.replace(/\.csv$/, '').toLowerCase().replace(/[-_]/g, '');
    const canonicalFn = (camelToKebab[baseKey] || fn.replace(/\.csv$/, '')) + '.csv';

    const fillRegionFiles = [
      'base.csv',
      'car-meta.csv',
      'coverage.csv',
      'driving-side.csv',
      'plate-type.csv',
      'poles.csv',
      'road-markings.csv'
    ];
    const extObjectFiles = ['taiwan-power-poles.csv'];
    const globalLabelFiles = [
      'country-code.csv',
      'currency.csv',
      'flags.csv',
      'tld.csv',
      'distinctive-letters.csv',
      'street-words.csv'
    ];
    const areaLabelFiles = ['india-scripts.csv'];
    if (fillRegionFiles.includes(canonicalFn)) return `layers/fill-region-with-color/${canonicalFn}`;
    if (extObjectFiles.includes(canonicalFn)) return `layers/ext-object/${canonicalFn}`;
    if (globalLabelFiles.includes(canonicalFn)) return `layers/global-label/${canonicalFn}`;
    if (areaLabelFiles.includes(canonicalFn)) return `layers/area-label/${canonicalFn}`;
  }
  return p;
}

/**
 * Returns full URL to an asset in inter-geo-data main branch
 * e.g. getDataUrl('data/COUNTRY.fgb')
 *   -> 'https://raw.githubusercontent.com/harvey-euph/inter-geo-data/refs/heads/main/data/COUNTRY.fgb'
 */
export function getDataUrl(relativePath: string, branch = DATA_BRANCH): string {
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const normalized = normalizeDataPath(relativePath);
  const cleanBase = DATA_RAW_BASE.replace(/\/+$/, '');
  const cleanPath = normalized.replace(/^\/+/, '');
  return `${cleanBase}/${branch}/${cleanPath}`;
}

/**
 * Returns full URL to an index file in inter-geo-data index branch
 * e.g. getIndexUrl('index.json')
 *   -> 'https://raw.githubusercontent.com/harvey-euph/inter-geo-data/refs/heads/index/index.json'
 */
export function getIndexUrl(indexFilename: string): string {
  return getDataUrl(indexFilename, INDEX_BRANCH);
}
