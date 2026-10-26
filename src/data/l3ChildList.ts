import { decodeGeo } from '../map/geoWorkerClient';
import { getDataUrl } from './dataSource';
import type { MunicipalityDetail } from '../types/lod';
import { findCountry } from './countries';
import { findL3Partition, type L3PartitionMeta } from './l3Manifest';

const loadedByFile = new Map<string, Promise<MunicipalityDetail[]>>();

function childLabel(item: MunicipalityDetail): string {
  return item.city || item.nameZh || item.code;
}

function toChild(props: Record<string, unknown>, fallbackIso2: string): MunicipalityDetail {
  const iso2 = String(props.iso2 || fallbackIso2 || '');
  const country = iso2 ? findCountry(iso2) : undefined;
  const name = String(props.name || '');
  const nameZh = String(props.name_zh || name);
  const parentName = String(props.parent_name || '');
  const id = props.id !== undefined && props.id !== null ? String(props.id) : '';
  const code = String(props.code || id || name);
  return {
    code: id || code,
    pref: parentName,
    city: name || nameZh,
    nameZh: nameZh || name,
    iso2,
    countryName: country?.name || '',
    countryNameZh: country?.nameZh || '',
    countryFlag: country?.flag || '🌐',
    typeEn: String(props.type_en || ''),
    parentName,
    parentCode: String(props.parent_code || '')
  };
}

/**
 * Names of the next admin level for one L2 subdivision.
 * The FlatGeobuf is decoded once per partition and kept for the session.
 */
export function loadL3Children(
  iso2: string,
  parts: { id?: string | number; code?: string; name?: string; nameEn?: string; nameZh?: string }
): Promise<MunicipalityDetail[]> {
  const partition: L3PartitionMeta | undefined = findL3Partition(iso2, parts);
  if (!partition) return Promise.resolve([]);

  const cached = loadedByFile.get(partition.file);
  if (cached) return cached;

  const pending = decodeGeo(getDataUrl(partition.file), 'l3')
    .then((result) => {
      const rows = result.features.map((feature) => toChild(feature.props || {}, iso2));
      rows.sort((a, b) => childLabel(a).localeCompare(childLabel(b), 'zh-Hant'));
      return rows;
    })
    .catch((err) => {
      loadedByFile.delete(partition.file);
      throw err;
    });

  loadedByFile.set(partition.file, pending);
  return pending;
}
