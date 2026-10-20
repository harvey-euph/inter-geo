export type LODLevel = 'L1' | 'L2' | 'L3';

export interface LODThreshold {
  level: LODLevel;
  minK: number;
  maxK: number;
  labelZh: string;
  sublabelZh: string;
  color: string;
}

export const MIN_ZOOM_K = 1.0;
export const MAX_ZOOM_K = 120.0;

export const LOD_THRESHOLDS: LODThreshold[] = [
  {
    level: 'L1',
    minK: 1.0,
    maxK: 6.0,
    labelZh: 'L1 · 國家模式',
    sublabelZh: '以 L2 輪廓為基礎描繪 · 點選與懸停以國家為單位',
    color: '#38bdf8'
  },
  {
    level: 'L2',
    minK: 6.0,
    maxK: MAX_ZOOM_K,
    labelZh: 'L2 · 行政區模式',
    sublabelZh: '點選與懸停以 L2 行政區為單位 · 顯示獨立情報卡',
    color: '#10b981'
  },
  {
    level: 'L3',
    minK: Infinity,
    maxK: MAX_ZOOM_K,
    labelZh: 'L3 · 二級行政區',
    sublabelZh: '細部行政區 (預設關閉)',
    color: '#f59e0b'
  }
];

export interface CustomLODThresholds {
  l2Threshold: number;
  l3Threshold: number;
}

export const DEFAULT_LOD_THRESHOLDS: CustomLODThresholds = {
  l2Threshold: 6.0,
  l3Threshold: Infinity
};

export const LOD_LEVEL_ORDER: Record<LODLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3
};

export function getLODLevel(
  k: number,
  thresholds: CustomLODThresholds = DEFAULT_LOD_THRESHOLDS
): LODLevel {
  const eps = 0.05;
  if (k >= thresholds.l3Threshold - eps) return 'L3';
  if (k >= thresholds.l2Threshold - eps) return 'L2';
  return 'L1';
}

export interface L2SubdivisionDetail {
  id: number | string;
  iso2: string;
  name: string;
  nameEn: string;
  nameZh: string;
  typeEn: string;
  code: string;
  postal: string;
  countryName: string;
  countryNameZh: string;
  countryFlag: string;
}

export interface PrefectureDetail {
  id: number;
  nameJa: string;
  nameZh: string;
  nameEn: string;
  region: string;
  capital: string;
  areaCode: string;
  plates: string[];
  proClues: string[];
  landscapeDesc: string;
}

export interface MunicipalityDetail {
  code: string;
  pref: string;
  prefId?: number;
  gun?: string;
  city: string;
  nameZh: string;
  iso2?: string;
  countryName?: string;
  countryNameZh?: string;
  countryFlag?: string;
  typeEn?: string;
  parentName?: string;
  parentCode?: string;
}

export type L3SubdivisionDetail = MunicipalityDetail;
