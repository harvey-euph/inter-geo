/**
 * Capital Subdivisions Helper
 *
 * Dynamically resolves capital subdivisions from inter-geo-data's
 * layers/area-feature/nationwide-capital.csv via csvLayerRegistry.
 */

import { getCsvLayerById } from '../layers/csvLayerRegistry';

export interface CapitalSubdivisionInfo {
  iso2: string;
  capitalNameZh: string;
  capitalNameEn: string;
  subdivisionCode?: string;
  subdivisionId?: string | number;
  subdivisionNameZh: string;
  subdivisionNameEn: string;
  geoGuessrMetaZh: string;
}

export const CAPITAL_SUBDIVISIONS: Record<string, CapitalSubdivisionInfo> = {};

/**
 * Checks whether an L2 subdivision is the capital region for its country.
 * Reads dynamically from the nationwide-capital CSV layer in inter-geo-data.
 */
export function isCapitalSubdivision(
  iso2: string,
  sub: { id?: string | number; code?: string; name?: string; nameEn?: string; nameZh?: string; postal?: string }
): boolean {
  if (!iso2) return false;
  const upper = iso2.toUpperCase();
  const layer = getCsvLayerById('nationwide-capital');
  if (!layer?.data?.rowMap) return false;

  const code = (sub.code || '').toUpperCase().trim();
  const idStr = String(sub.id || '').toUpperCase().trim();
  const postal = (sub.postal || '').toUpperCase().trim();
  const nameEn = (sub.nameEn || sub.name || '').toLowerCase().trim();
  const nameZh = (sub.nameZh || '').trim();

  // 1. Direct match with target keys (e.g. US::DC, JP::13)
  const candidates = [
    `${upper}::${code}`,
    `${upper}::${idStr}`,
    `${upper}::${postal}`,
    `${upper}::${upper}-${code}`,
    `${upper}::${upper}-${idStr}`
  ];
  for (const c of candidates) {
    if (layer.data.rowMap.has(c)) return true;
  }

  // 2. Loose match against attributes
  for (const [key, row] of layer.data.rowMap.entries()) {
    if (!key.startsWith(`${upper}::`)) continue;
    const attrs = row.attributes;
    if (code && key.endsWith(`::${code}`)) return true;
    if (idStr && key.endsWith(`::${idStr}`)) return true;
    if (attrs.capitalNameEn && nameEn.includes(attrs.capitalNameEn.toLowerCase())) return true;
    if (attrs.subdivisionNameEn && nameEn.includes(attrs.subdivisionNameEn.toLowerCase())) return true;
    if (attrs.capitalNameZh && (nameZh.includes(attrs.capitalNameZh) || (attrs.subdivisionNameZh && attrs.subdivisionNameZh.includes(nameZh)))) {
      return true;
    }
  }

  return false;
}
