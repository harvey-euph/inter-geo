import type { Feature, Geometry } from 'geojson';
import type { CountryData } from '../types/geo';
import type { L2SubdivisionDetail, MunicipalityDetail } from '../types/lod';
import type { RoadPathData } from '../data/roadsMeta';
import { findCountry } from '../data/countries';
import { L2_MANIFEST } from '../data/l2Manifest';
import { ROADS_MANIFEST } from '../data/roadsManifest';

// World copies rendered side-by-side for infinite continuous periodic wrapping
export const WORLD_COPIES = [-1, 0, 1, 2, 3];

export const L2_COUNTRY_BBOX_MAP = new Map<string, { minX: number; maxX: number; minY: number; maxY: number }>();
for (let i = 0; i < L2_MANIFEST.length; i++) {
  const c = L2_MANIFEST[i];
  L2_COUNTRY_BBOX_MAP.set(c.iso2, c.bbox);
}

export function getCountryBBox(iso2: string): { minX: number; maxX: number; minY: number; maxY: number } | null {
  return ROADS_MANIFEST[iso2]?.bbox || L2_COUNTRY_BBOX_MAP.get(iso2) || null;
}

export interface WorldCountryProperties {
  id?: string;
  name: string;
}

export type GeoFeature = Feature<Geometry, WorldCountryProperties> & { id: string };

export interface CountryPathData {
  path2D: Path2D;
  bbox: [number, number, number, number];
  countryMeta: CountryData | undefined;
  id: string;
  name: string;
  centroid: [number, number];
}

export interface L2SubdivisionPathData {
  path2D: Path2D;
  bbox: [number, number, number, number];
  id: number | string;
  iso2: string;
  name: string;
  nameEn: string;
  nameZh: string;
  typeEn: string;
  code: string;
  postal: string;
  centroid: [number, number];
}

export interface L3SubdivisionPathData {
  path2D: Path2D;
  bbox: [number, number, number, number];
  id: string;
  iso2: string;
  name: string;
  nameEn: string;
  nameZh: string;
  typeEn: string;
  parentName: string;
  parentCode: string;
  code: string;
}

export interface ActiveL3ParentInfo {
  iso2: string;
  id: string | number;
  name: string;
  code?: string;
  bbox: [number, number, number, number];
  path2D: Path2D;
}

export interface ExtFeatureItem {
  layerId: string;
  id: string;
  name: string;
  label: string;
  color: string;
  bbox: [number, number, number, number];
  attributes?: Record<string, string>;
}

export interface ExtFeatureRenderItem extends ExtFeatureItem {
  fillColor: string;
  hoverFillColor: string;
  polygonPath2D: Path2D;
  innerGridPath2D?: Path2D;
  centroid: [number, number];
  corners?: {
    sw: [number, number];
    se: [number, number];
    ne: [number, number];
    nw: [number, number];
  };
  innerGrid?: string;
}

export interface RoadBundle {
  roads: RoadPathData[];
  interstatesPath2D: Path2D;
  usRoutesPath2D: Path2D;
}

export interface CrossingBadgeBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  iso2: string;
}

export type HitFeature =
  | { type: 'road'; data: RoadPathData }
  | { type: 'municipality'; data: MunicipalityDetail; path?: L3SubdivisionPathData }
  | { type: 'activeParentInterior'; data: ActiveL3ParentInfo }
  | { type: 'l2Subdivision'; data: L2SubdivisionPathData }
  | { type: 'country'; data: CountryPathData }
  | { type: 'extFeature'; data: ExtFeatureItem };

export function normParentKey(iso2: string, text: string): string {
  return `${(iso2 || '').toLowerCase()}-${String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_~]+/g, '')}`;
}

export function makeUnknownCountry(
  id: string,
  iso2: string,
  name: string,
  nameZh = name,
  keyHints: string[] = []
): CountryData {
  return {
    id,
    iso2,
    iso3: '',
    name,
    nameZh,
    flag: '🌐',
    continent: 'Asia',
    region: '無官方街景覆蓋',
    drivingSide: 'right',
    coverage: 'none',
    cameraGens: [],
    plateType: 'white',
    plateDesc: '無街景',
    roadLines: ['white_dashed'],
    roadLinesDesc: '無街景',
    carMeta: ['none'],
    carMetaDesc: '無街景',
    poleDesc: '無資料',
    bollardDesc: '無資料',
    language: '當地語言',
    tld: '',
    keyHints
  };
}

export function toL2Detail(sub: L2SubdivisionPathData): L2SubdivisionDetail {
  const cMeta = findCountry(sub.iso2);
  return {
    id: sub.id,
    iso2: sub.iso2,
    name: sub.name,
    nameEn: sub.nameEn,
    nameZh: sub.nameZh,
    typeEn: sub.typeEn,
    code: sub.code,
    postal: sub.postal,
    countryName: cMeta?.name || sub.nameEn,
    countryNameZh: cMeta?.nameZh || sub.nameZh,
    countryFlag: cMeta?.flag || '🌐'
  };
}
