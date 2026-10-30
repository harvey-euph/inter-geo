/**
 * Shared Data Source Configuration for Inter-Geo
 *
 * Points directly to raw content in the https://github.com/harvey-euph/inter-geo-data repository.
 */

export const DATA_RAW_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DATA_BASE_URL) ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.endsWith('.local'))
    ? '/inter-geo/@geo-data'
    : (typeof import.meta !== 'undefined' && import.meta.env?.DEV
      ? '/inter-geo/@geo-data'
      : 'https://raw.githubusercontent.com/harvey-euph/inter-geo-data/refs/heads'));

export const DATA_BRANCH = 'main';
export const INDEX_BRANCH = 'index';

/**
 * Returns full URL to an asset in inter-geo-data.
 * Any path provided must be exact; legacy or invalid paths are not rewritten.
 * e.g. getDataUrl('data/COUNTRY.fgb')
 *   -> 'https://raw.githubusercontent.com/harvey-euph/inter-geo-data/refs/heads/main/data/COUNTRY.fgb'
 */
export function getDataUrl(relativePath: string, branch = DATA_BRANCH): string {
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const cleanBase = DATA_RAW_BASE.replace(/\/+$/, '');
  const cleanPath = relativePath.replace(/^\/+/, '');
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
