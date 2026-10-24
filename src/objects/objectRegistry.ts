import catalog from 'virtual:object-index';
import type { CountryRoot, GeoObjectKind, GeoObjectRecord, ObjectCatalog } from './types';

export type { CountryRoot, GeoObjectKind, GeoObjectRecord, ObjectCatalog };

const objectsById = new Map<string, GeoObjectRecord>();
const childrenByParent = new Map<string, GeoObjectRecord[]>();
const countriesByIso = new Map<string, CountryRoot>();

for (const country of catalog.countries) {
  countriesByIso.set(country.iso2.toUpperCase(), country);
}

for (const obj of catalog.objects) {
  objectsById.set(obj.id.toUpperCase(), obj);
  if (!obj.parentId) continue;
  const key = obj.parentId.toUpperCase();
  const list = childrenByParent.get(key);
  if (list) list.push(obj);
  else childrenByParent.set(key, [obj]);
}

export const OBJECT_CATALOG: ObjectCatalog = catalog;

export function getCountryRoot(iso2: string): CountryRoot | undefined {
  return countriesByIso.get(iso2.trim().toUpperCase());
}

export function getObject(id: string): GeoObjectRecord | undefined {
  return objectsById.get(id.trim().toUpperCase());
}

export function objectsByParent(iso2: string, kind?: GeoObjectKind): GeoObjectRecord[] {
  const list = childrenByParent.get(iso2.trim().toUpperCase()) || [];
  return kind ? list.filter((obj) => obj.kind === kind) : list;
}

export function isCountryId(id: string): boolean {
  return countriesByIso.has(id.trim().toUpperCase());
}
