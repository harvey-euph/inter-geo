import {
  getL3ManifestSync,
  getL3PartitionsByKeySync,
  findL3Partition,
  hasL3ForSubdivision,
  onDataIndexLoaded,
  type L3PartitionMeta,
  type L3CountryMeta
} from './geoIndexClient';

export type { L3PartitionMeta, L3CountryMeta };
export { findL3Partition, hasL3ForSubdivision };

export const L3_MANIFEST: L3CountryMeta[] = [];
export const L3_PARTITIONS_BY_KEY: Record<string, L3PartitionMeta> = {};
export const L3_PARTITIONS_BY_COUNTRY: Record<string, L3PartitionMeta[]> = {};

function syncL3() {
  const list = getL3ManifestSync();
  if (list.length > 0 && L3_MANIFEST.length !== list.length) {
    L3_MANIFEST.length = 0;
    L3_MANIFEST.push(...list);

    for (const c of list) {
      L3_PARTITIONS_BY_COUNTRY[c.iso2] = c.partitions;
    }

    const keyMap = getL3PartitionsByKeySync();
    for (const key of Object.keys(L3_PARTITIONS_BY_KEY)) {
      delete L3_PARTITIONS_BY_KEY[key];
    }
    Object.assign(L3_PARTITIONS_BY_KEY, keyMap);
  }
}

syncL3();
onDataIndexLoaded(syncL3);
