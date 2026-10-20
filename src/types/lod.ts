export type LODLevel = 'L1' | 'L2_OUTLINE' | 'L2_REGION' | 'L3';

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
    maxK: 1.5,
    labelZh: 'L1 · 國家輪廓',
    sublabelZh: '全球國家巨觀特徵與輪廓',
    color: '#38bdf8'
  },
  {
    level: 'L2_OUTLINE',
    minK: 1.5,
    maxK: 6.0,
    labelZh: 'L2 · 行政區輪廓',
    sublabelZh: '全球 91 國省/州/省份輪廓線',
    color: '#34d399'
  },
  {
    level: 'L2_REGION',
    minK: 6.0,
    maxK: MAX_ZOOM_K,
    labelZh: 'L2 · 行政區區域',
    sublabelZh: '省/州/都道府縣細部獨立區域',
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
  l2OutlineThreshold: number;
  l2RegionThreshold: number;
  l3Threshold: number;
}

export const DEFAULT_LOD_THRESHOLDS: CustomLODThresholds = {
  l2OutlineThreshold: 1.5,
  l2RegionThreshold: 6.0,
  l3Threshold: Infinity
};

export const LOD_LEVEL_ORDER: Record<LODLevel, number> = {
  L1: 1,
  L2_OUTLINE: 2,
  L2_REGION: 3,
  L3: 4
};

export function getLODLevel(
  k: number,
  thresholds: CustomLODThresholds = DEFAULT_LOD_THRESHOLDS
): LODLevel {
  const eps = 0.05;
  if (k >= thresholds.l3Threshold - eps) return 'L3';
  if (k >= thresholds.l2RegionThreshold - eps) return 'L2_REGION';
  if (k >= thresholds.l2OutlineThreshold - eps) return 'L2_OUTLINE';
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
  iso2?: string;
  countryName?: string;
  countryNameZh?: string;
  countryFlag?: string;
  typeEn?: string;
  parentName?: string;
  parentCode?: string;
}

export type L3SubdivisionDetail = MunicipalityDetail;
