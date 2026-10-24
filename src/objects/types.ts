/** Canonical map object. Country ids are bare ISO2 (`US`). Children are `ISO::LOCAL` (`US::DC`, `IN::TG`, `JP::26`, `US::I-10`, `TW::TP-H`). */
export type GeoObjectKind = 'country' | 'subdivision' | 'road' | 'grid' | 'object';

export interface GeoObjectRecord {
  id: string;
  kind: GeoObjectKind;
  parentId: string | null;
  name: string;
  nameEn: string;
  nameZh: string;
  /** Local code, the part after `::`. */
  code: string;
  /** Logical source, e.g. `US.l2.fgb`, `US.roads.fgb`, `TW.grid`. */
  sourceKey: string;
  /** Physical path relative to the project root. Loaders keep their own URLs. */
  sourceFile: string;
  /** Extra lookup strings that cannot be derived from the fields above. */
  aliases?: string[];
}

/** Top-level country table. Children live in files matching `{iso2}.*`. */
export interface CountryRoot {
  iso2: string;
  name: string;
  nameZh: string;
  sourceKeys: string[];
}

export interface ObjectCatalog {
  countries: CountryRoot[];
  objects: GeoObjectRecord[];
}
