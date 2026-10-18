export type LODLevel = 'L1' | 'L2' | 'L3';

export interface LODThreshold {
  level: LODLevel;
  minK: number;
  maxK: number;
  labelZh: string;
  sublabelZh: string;
  color: string;
}

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
    labelZh: 'L2 · 都道府縣',
    sublabelZh: '47 都道府縣、市外局番、專屬路牌',
    color: '#10b981'
  },
  {
    level: 'L3',
    minK: 6.5,
    maxK: 14.0,
    labelZh: 'L3 · 市區町村',
    sublabelZh: '1900+ 市町村細緻行政區與海岸線',
    color: '#f59e0b'
  }
];

export function getLODLevel(k: number): LODLevel {
  if (k >= 6.5) return 'L3';
  if (k >= 3.2) return 'L2';
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
  gun?: string;
  city: string;
  nameZh: string;
}
