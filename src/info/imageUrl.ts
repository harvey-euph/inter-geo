import { getDataUrl } from '../data/dataSource';

/**
 * Resolve Info image sources. Remote HTTP(S) URLs are used as-is; local assets
 * are resolved under inter-geo-data repository path.
 */
export function resolveInfoImageUrl(source: string): string {
  const value = source.trim();
  if (!value) return '';

  if (/^(https?:)?\/\//i.test(value)) return value;

  return getDataUrl(value);
}
