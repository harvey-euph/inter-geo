/**
 * Resolve Info image sources. Remote HTTP(S) URLs are used as-is; local assets
 * are resolved under Vite's base path so the app also works from a subpath.
 */
export function resolveInfoImageUrl(source: string): string {
  const value = source.trim();
  if (!value) return '';

  if (/^(https?:)?\/\//i.test(value)) return value;

  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${base}/${value.replace(/^\/+/, '')}`;
}
