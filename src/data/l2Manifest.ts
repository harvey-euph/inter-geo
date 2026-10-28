import {
  getL2ManifestSync,
  getL2CountryMapSync,
  onDataIndexLoaded,
  type L2CountryMeta
} from './geoIndexClient';

export type { L2CountryMeta };

export const L2_MANIFEST: L2CountryMeta[] = [];
export const L2_COUNTRY_MAP: Record<string, L2CountryMeta> = {};

function syncL2() {
  const list = getL2ManifestSync();
  if (list.length > 0 && L2_MANIFEST.length !== list.length) {
    L2_MANIFEST.length = 0;
    L2_MANIFEST.push(...list);
    const map = getL2CountryMapSync();
    for (const key of Object.keys(L2_COUNTRY_MAP)) {
      delete L2_COUNTRY_MAP[key];
    }
    Object.assign(L2_COUNTRY_MAP, map);
  }
}

syncL2();
onDataIndexLoaded(syncL2);
