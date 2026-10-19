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
    maxK: 3.2,
    labelZh: 'L1 · 國家層級',
    sublabelZh: '全球國家與巨觀特徵',
    color: '#38bdf8'
  },
  {
    level: 'L2',
    minK: 3.2,
    maxK: 6.5,
    labelZh: 'L2 · 第一級行政區',
    sublabelZh: '全球 91 國省/州/省份、日本都道府縣',
    color: '#10b981'
  },
  {
    level: 'L3',
    minK: 6.5,
    maxK: MAX_ZOOM_K,
    labelZh: 'L3 · 市區町村',
    sublabelZh: '1900+ 市町村細緻行政區與海岸線',
    color: '#f59e0b'
  }
];

export interface CustomLODThresholds {
  l2Threshold: number;
  l3Threshold: number;
}

export const DEFAULT_LOD_THRESHOLDS: CustomLODThresholds = {
  l2Threshold: 3.2,
  l3Threshold: 6.5
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
}
