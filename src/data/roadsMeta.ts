import type { CountryData } from '../types/geo';

export type RoadShieldType =
  | 'interstate'
  | 'us-route'
  | 'autobahn'
  | 'bundesstrasse'
  | 'jp-expressway'
  | 'jp-national'
  | 'tw-freeway'
  | 'tw-provincial'
  | 'gb-motorway'
  | 'gb-aroad'
  | 'fr-autoroute'
  | 'e-road'
  | 'generic-expressway'
  | 'generic-route';

export interface RoadPathData {
  name: string;
  class: 'Interstate' | 'Federal';
  number: string;
  prefix: string;
  type: string;
  scalerank: number;
  bbox: [number, number, number, number];
  path2D?: Path2D;
  iso2?: string;
}

export interface RoadSystemMeta {
  flag: string;
  countryNameZh: string;
  countryNameEn: string;
  systemZh: string;
  systemEn: string;
  classBadge: string;
  classColor: string;
  corridorClue: string;
  subClue: string;
}

export function getRoadSystemMeta(road: RoadPathData, country?: CountryData): RoadSystemMeta {
  const isInterstate = road.class === 'Interstate';
  const iso = (road.iso2 || country?.iso2 || '').toUpperCase();

  if (iso === 'US') {
    const num = parseInt(road.number, 10);
    const isEven = !isNaN(num) && num % 2 === 0;
    return {
      flag: '🇺🇸',
      countryNameZh: '美國',
      countryNameEn: 'United States',
      systemZh: isInterstate ? '美國州際公路' : '美國國道系統',
      systemEn: isInterstate ? 'Interstate Highway System' : 'U.S. Numbered Highway System',
      classBadge: isInterstate ? 'Interstate' : 'U.S. Route',
      classColor: isInterstate ? '#38bdf8' : '#fbbf24',
      corridorClue: !isNaN(num) ? (isEven ? '東西走向 (E-W)' : '南北走向 (N-S)') : '',
      subClue: isInterstate && road.number ? (road.number.length <= 2 ? '主要跨州幹線' : '輔助/環城支線') : ''
    };
  }
  if (iso === 'DE') {
    const num = parseInt(road.number, 10);
    const isEven = !isNaN(num) && num % 2 === 0;
    return {
      flag: '🇩🇪',
      countryNameZh: '德國',
      countryNameEn: 'Germany',
      systemZh: isInterstate ? '德國聯邦高速公路 (Autobahn)' : '德國聯邦公路 (Bundesstraße)',
      systemEn: isInterstate ? 'Bundesautobahn' : 'Bundesstraße',
      classBadge: isInterstate ? 'Autobahn' : 'Bundesstraße',
      classColor: isInterstate ? '#38bdf8' : '#fbbf24',
      corridorClue: !isNaN(num) ? (isEven ? '東西走向 (E-W)' : '南北走向 (N-S)') : '',
      subClue: isInterstate && road.number ? (road.number.length === 1 ? '全國骨幹幹線' : '區域跨線/支線') : ''
    };
  }
  if (iso === 'JP') {
    return {
      flag: '🇯🇵',
      countryNameZh: '日本',
      countryNameEn: 'Japan',
      systemZh: isInterstate ? '日本高速自動車國道' : '日本一般國道',
      systemEn: isInterstate ? 'National Expressway' : 'National Highway',
      classBadge: isInterstate ? 'Expressway' : '一般國道',
      classColor: isInterstate ? '#38bdf8' : '#fbbf24',
      corridorClue: road.name.startsWith('C') ? '都市環狀線 (Loop)' : (isInterstate ? '高速幹線' : '主要國道'),
      subClue: isInterstate ? '綠底標牌 · 藍底路線盾' : '藍底倒三角盾牌'
    };
  }
  if (iso === 'TW') {
    return {
      flag: '🇹🇼',
      countryNameZh: '台灣',
      countryNameEn: 'Taiwan',
      systemZh: isInterstate ? '台灣國道高速公路' : '台灣省道公路系統',
      systemEn: isInterstate ? 'National Freeway' : 'Provincial Highway',
      classBadge: isInterstate ? '國道高速' : '省道幹道',
      classColor: isInterstate ? '#38bdf8' : '#fbbf24',
      corridorClue: isInterstate ? '縱貫南北主動脈 (國1/國3)' : (road.name.includes('6') || road.name.includes('7') || road.name.includes('8') ? '東西向快速公路' : '省道主幹'),
      subClue: isInterstate ? '綠底梅花標誌' : '藍/紅底盾牌標誌'
    };
  }
  if (iso === 'GB') {
    return {
      flag: '🇬🇧',
      countryNameZh: '英國',
      countryNameEn: 'United Kingdom',
      systemZh: isInterstate ? '英國高速公路 (Motorway)' : '英國主要幹道 (A-Road)',
      systemEn: isInterstate ? 'Motorway Network' : 'Primary A-Road',
      classBadge: isInterstate ? 'Motorway' : 'A-Road',
      classColor: isInterstate ? '#38bdf8' : '#fbbf24',
      corridorClue: isInterstate ? '藍底白字高速公路' : '綠底白字主要幹道',
      subClue: road.number ? `分區號碼 ${road.number[0]} 區` : ''
    };
  }
  if (iso === 'FR') {
    return {
      flag: '🇫🇷',
      countryNameZh: '法國',
      countryNameEn: 'France',
      systemZh: isInterstate ? '法國國家高速公路 (Autoroute)' : '法國國道主要幹道 (Route Nationale)',
      systemEn: isInterstate ? 'Autoroute' : 'Route Nationale',
      classBadge: isInterstate ? 'Autoroute' : 'Nationale',
      classColor: isInterstate ? '#38bdf8' : '#fbbf24',
      corridorClue: isInterstate ? '藍底白字標牌 (A 開頭)' : '紅底白字頂部標牌 (N 開頭)',
      subClue: isInterstate ? '高速路網' : '省際國道'
    };
  }
  if (iso === 'CA') {
    return {
      flag: '🇨🇦',
      countryNameZh: '加拿大',
      countryNameEn: 'Canada',
      systemZh: isInterstate ? '加拿大橫貫／主要高速公路' : '加拿大省道一級幹道',
      systemEn: isInterstate ? 'Trans-Canada / Freeway' : 'Provincial Highway',
      classBadge: isInterstate ? 'Freeway' : 'Provincial',
      classColor: isInterstate ? '#38bdf8' : '#fbbf24',
      corridorClue: isInterstate ? '橫貫／大都會走廊' : '省級主要公路',
      subClue: ''
    };
  }
  if (iso === 'AU') {
    return {
      flag: '🇦🇺',
      countryNameZh: '澳洲',
      countryNameEn: 'Australia',
      systemZh: isInterstate ? '澳洲國家高速公路 (Motorway)' : '澳洲主要國道公路 (Highway)',
      systemEn: isInterstate ? 'National Motorway' : 'National Highway',
      classBadge: isInterstate ? 'Motorway' : 'Highway',
      classColor: isInterstate ? '#38bdf8' : '#fbbf24',
      corridorClue: isInterstate ? 'M 字頭高速幹線' : 'A/B 字頭主要幹道',
      subClue: ''
    };
  }

  if (road.name.startsWith('E ') || road.name.startsWith('E-') || road.name.match(/^E\d+/)) {
    return {
      flag: country?.flag || '🇪🇺',
      countryNameZh: country?.nameZh || iso,
      countryNameEn: country?.name || iso,
      systemZh: '歐洲 E 級國際公路 (European Route)',
      systemEn: 'International E-road Network',
      classBadge: 'E-Road',
      classColor: '#10b981',
      corridorClue: '綠底白字矩形路牌 · 跨國骨幹',
      subClue: isInterstate ? '高速公路規格' : '主要跨國幹道'
    };
  }

  const cNameZh = country?.nameZh || iso;
  const cNameEn = country?.name || iso;
  const flag = country?.flag || '🛣️';
  return {
    flag,
    countryNameZh: cNameZh,
    countryNameEn: cNameEn,
    systemZh: isInterstate ? `${cNameZh} 主要高速公路` : `${cNameZh} 主要國道幹道`,
    systemEn: isInterstate ? `${cNameEn} Major Expressway` : `${cNameEn} Primary National Route`,
    classBadge: isInterstate ? 'Expressway' : 'Primary Route',
    classColor: isInterstate ? '#38bdf8' : '#fbbf24',
    corridorClue: road.number ? `編號 ${road.number}` : (road.type || ''),
    subClue: ''
  };
}
