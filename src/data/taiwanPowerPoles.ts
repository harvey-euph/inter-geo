/**
 * Taiwan Taipower Pole Coordinate Grid System (台電圖號座標系統)
 *
 * Each Taipower utility pole or transformer box in Taiwan has a blue plaque
 * or yellow sign showing a 9-to-11-character code (e.g., "B8230 AA93").
 *
 * - 1st character (Letter A-Z, omitting I): 80km × 50km macro-grid block indicating the region.
 * - Digits 2-5 (XXYY): Percentage coordinates within the block!
 *   - XX (00-99): Horizontal distance percentage from West boundary (XX × 800m).
 *   - YY (00-99): Vertical distance percentage from South boundary (YY × 500m).
 * - Characters 6-7 (AA-HE): 100m subgrid within the 800m×500m block.
 * - Digits 8-9 (00-99): 10m precision within the 100m subgrid.
 */

export interface TaipowerZoneDef {
  letter: string;
  nameZh: string;
  nameEn: string;
  subdivisionsZh: string[];
  x0: number; // TWD67 TM2 West Origin (m)
  y0: number; // TWD67 TM2 South Origin (m)
  color: string;
  fillWithColor: string;
  examplePoleCode: string;
  descriptionZh: string;
  // Corners in [lon, lat] (WGS84)
  sw: [number, number];
  se: [number, number];
  ne: [number, number];
  nw: [number, number];
  center: [number, number];
}

/**
 * High-precision TWD67 TM2 (121 E meridian) to WGS84 conversion
 */
export function twd67ToWgs84(x: number, y: number): [number, number] {
  const a = 6378206.4;
  const b = 6356583.8;
  const lon0 = (121.0 * Math.PI) / 180.0;
  const k0 = 0.9999;
  const dx = 250000.0;
  const x_tm = x - dx;
  const y_tm = y;

  const e = Math.sqrt(1 - (b * b) / (a * a));
  const e2 = (e * e) / (1 - e * e);
  const M = y_tm / k0;
  const mu = M / (a * (1 - (e * e) / 4 - (3 * Math.pow(e, 4)) / 64 - (5 * Math.pow(e, 6)) / 256));
  const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));

  const J1 = (3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32;
  const J2 = (21 * Math.pow(e1, 2)) / 16 - (55 * Math.pow(e1, 4)) / 32;
  const J3 = (151 * Math.pow(e1, 3)) / 96;
  const J4 = (1097 * Math.pow(e1, 4)) / 512;

  const fp =
    mu +
    J1 * Math.sin(2 * mu) +
    J2 * Math.sin(4 * mu) +
    J3 * Math.sin(6 * mu) +
    J4 * Math.sin(8 * mu);

  const C1 = e2 * Math.pow(Math.cos(fp), 2);
  const T1 = Math.pow(Math.tan(fp), 2);
  const R1 = (a * (1 - e * e)) / Math.pow(1 - e * e * Math.pow(Math.sin(fp), 2), 1.5);
  const N1 = a / Math.sqrt(1 - e * e * Math.pow(Math.sin(fp), 2));
  const D = x_tm / (N1 * k0);

  const lat67 =
    fp -
    ((N1 * Math.tan(fp)) / R1) *
      (Math.pow(D, 2) / 2 -
        (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e2) * (Math.pow(D, 4) / 24) +
        (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * e2 - 3 * Math.pow(C1, 2)) *
          (Math.pow(D, 6) / 720));

  const lon67 =
    lon0 +
    (D -
      (1 + 2 * T1 + C1) * (Math.pow(D, 3) / 6) +
      (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e2 + 24 * Math.pow(T1, 2)) *
        (Math.pow(D, 5) / 120)) /
      Math.cos(fp);

  const lonWgs = (lon67 * 180) / Math.PI + 0.00828595;
  const latWgs = (lat67 * 180) / Math.PI - 0.00195655;

  return [Number(lonWgs.toFixed(5)), Number(latWgs.toFixed(5))];
}

const RAW_ZONES: Array<{
  letter: string;
  nameZh: string;
  nameEn: string;
  subdivisionsZh: string[];
  x0: number;
  y0: number;
  color: string;
  fillWithColor: string;
  examplePoleCode: string;
  descriptionZh: string;
}> = [
  {
    letter: 'A',
    nameZh: '新竹北沿海 / 富貴角海邊',
    nameEn: 'Hsinchu North Coast / Fuguijiao',
    subdivisionsZh: ['新竹市北側海線', '新北富貴角極北海岸'],
    x0: 170000,
    y0: 2750000,
    color: '#0ea5e9',
    fillWithColor: 'rgba(14, 165, 233, 0.22)',
    examplePoleCode: 'A0590 AA12',
    descriptionZh: '台灣極西北海岸角與新竹外海'
  },
  {
    letter: 'B',
    nameZh: '大台北 / 基隆 / 北桃園',
    nameEn: 'Greater Taipei / Keelung / North Taoyuan',
    subdivisionsZh: ['台北市', '新北市', '基隆市', '桃園市北部'],
    x0: 250000,
    y0: 2750000,
    color: '#3b82f6',
    fillWithColor: 'rgba(59, 130, 246, 0.28)',
    examplePoleCode: 'B8230 AA93',
    descriptionZh: '大台北都會區、基隆市及桃園大園/蘆竹/龜山'
  },
  {
    letter: 'C',
    nameZh: '東北角 / 三貂角海域',
    nameEn: 'Northeast Cape / Sandiaojiao',
    subdivisionsZh: ['新北貢寮三貂角', '龜山島東北外海'],
    x0: 330000,
    y0: 2750000,
    color: '#6366f1',
    fillWithColor: 'rgba(99, 102, 241, 0.22)',
    examplePoleCode: 'C1045 AB01',
    descriptionZh: '台灣本島極東三貂角陸地與東部海域'
  },
  {
    letter: 'D',
    nameZh: '桃竹苗海線 / 通霄苑裡',
    nameEn: 'Taoyuan / Hsinchu / Miaoli Coast',
    subdivisionsZh: ['桃園觀音/新屋', '新竹竹北/新豐', '苗栗竹南/後龍/通霄'],
    x0: 170000,
    y0: 2700000,
    color: '#10b981',
    fillWithColor: 'rgba(16, 185, 129, 0.25)',
    examplePoleCode: 'D2450 CA32',
    descriptionZh: '桃竹苗濱海走廊、西濱快速道路沿線'
  },
  {
    letter: 'E',
    nameZh: '桃竹苗山線 / 宜蘭山區',
    nameEn: 'Taoyuan / Hsinchu / Miaoli Hills & Yilan Mountains',
    subdivisionsZh: ['桃園中壢/龍潭', '新竹竹東/關西/五峰', '苗栗大湖/三義', '新北烏來'],
    x0: 250000,
    y0: 2700000,
    color: '#8b5cf6',
    fillWithColor: 'rgba(139, 92, 246, 0.28)',
    examplePoleCode: 'E4560 DE54',
    descriptionZh: '桃竹苗客家山莊、雪霸山脈北段與雪山山脈'
  },
  {
    letter: 'F',
    nameZh: '宜蘭平原 / 蘇澳沿海',
    nameEn: 'Yilan Plain / Suao Coast',
    subdivisionsZh: ['宜蘭市', '羅東鎮', '頭城鎮', '蘇澳鎮'],
    x0: 330000,
    y0: 2700000,
    color: '#06b6d4',
    fillWithColor: 'rgba(6, 182, 212, 0.25)',
    examplePoleCode: 'F3020 BC87',
    descriptionZh: '蘭陽平原水田、蘇花公路起點與蘇澳港'
  },
  {
    letter: 'G',
    nameZh: '台中市 / 彰化北 / 南投西',
    nameEn: 'Taichung / North Changhua / West Nantou',
    subdivisionsZh: ['台中市全境', '彰化市/鹿港', '南投市/草屯'],
    x0: 170000,
    y0: 2650000,
    color: '#f59e0b',
    fillWithColor: 'rgba(245, 158, 11, 0.28)',
    examplePoleCode: 'G3540 EA21',
    descriptionZh: '大台中盆地、清泉崗、彰化北部農田與八卦台地'
  },
  {
    letter: 'H',
    nameZh: '南投合歡山 / 花蓮太魯閣',
    nameEn: 'Nantou Hehuanshan / Hualien Taroko',
    subdivisionsZh: ['南投埔里/仁愛/合歡山', '花蓮秀林/天祥/太魯閣'],
    x0: 250000,
    y0: 2650000,
    color: '#d97706',
    fillWithColor: 'rgba(217, 119, 6, 0.25)',
    examplePoleCode: 'H5050 DD11',
    descriptionZh: '台灣屋脊中央山脈、中橫公路與合歡山'
  },
  {
    letter: 'J',
    nameZh: '澎湖北 / 雲林麥寮外海',
    nameEn: 'North Penghu / Yunlin Offshore',
    subdivisionsZh: ['澎湖白沙/西嶼/吉貝', '雲林六輕台西沿海'],
    x0: 90000,
    y0: 2600000,
    color: '#14b8a6',
    fillWithColor: 'rgba(20, 184, 166, 0.22)',
    examplePoleCode: 'J4030 CC20',
    descriptionZh: '澎湖群島北部島嶼及濁水溪出海口海域'
  },
  {
    letter: 'K',
    nameZh: '彰化南 / 雲林 / 嘉義西',
    nameEn: 'South Changhua / Yunlin / West Chiayi',
    subdivisionsZh: ['彰化員林/二林', '雲林斗六/虎尾/北港', '嘉義朴子/太保'],
    x0: 170000,
    y0: 2600000,
    color: '#84cc16',
    fillWithColor: 'rgba(132, 204, 22, 0.25)',
    examplePoleCode: 'K6520 BD88',
    descriptionZh: '嘉南平原糧倉北部、濁水溪南岸農田'
  },
  {
    letter: 'L',
    nameZh: '花蓮市 / 吉安 / 中央山脈中段',
    nameEn: 'Hualien City / Ji-an / Central Range',
    subdivisionsZh: ['花蓮市', '吉安鄉', '壽豐鄉', '萬榮鄉'],
    x0: 250000,
    y0: 2600000,
    color: '#ec4899',
    fillWithColor: 'rgba(236, 72, 153, 0.25)',
    examplePoleCode: 'L4025 AA15',
    descriptionZh: '花蓮核心縱谷平原、花東海岸台 11 線北端'
  },
  {
    letter: 'M',
    nameZh: '澎湖南 / 馬公 / 台南海線',
    nameEn: 'South Penghu / Magong / Tainan Offshore',
    subdivisionsZh: ['澎湖馬公市/湖西/望安/七美', '台南七股/北門海線'],
    x0: 90000,
    y0: 2550000,
    color: '#22d3ee',
    fillWithColor: 'rgba(34, 211, 238, 0.22)',
    examplePoleCode: 'M2580 CB90',
    descriptionZh: '澎湖馬公本島與七美嶼、台南鹽田潟湖區'
  },
  {
    letter: 'N',
    nameZh: '嘉義阿里山 / 台南市 / 北高雄',
    nameEn: 'Chiayi Alishan / Tainan City / North Kaohsiung',
    subdivisionsZh: ['嘉義阿里山/中埔', '台南市安南/永康/新營', '高雄湖內/茄萣'],
    x0: 170000,
    y0: 2550000,
    color: '#eab308',
    fillWithColor: 'rgba(234, 179, 8, 0.28)',
    examplePoleCode: 'N5230 EA45',
    descriptionZh: '文化古都台南市區、嘉義阿里山公路森林'
  },
  {
    letter: 'O',
    nameZh: '花蓮南 / 台東北 / 成功玉里',
    nameEn: 'South Hualien / North Taitung / Yuli / Chenggong',
    subdivisionsZh: ['花蓮光復/玉里/富里', '台東長濱/成功/池上/關山'],
    x0: 250000,
    y0: 2550000,
    color: '#f43f5e',
    fillWithColor: 'rgba(244, 63, 94, 0.25)',
    examplePoleCode: 'O3570 DA23',
    descriptionZh: '花東縱谷池上關山米鄉、成功三仙台海岸'
  },
  {
    letter: 'P',
    nameZh: '高雄西南外海',
    nameEn: 'Kaohsiung Southwest Offshore',
    subdivisionsZh: ['台灣海峽南部漁場'],
    x0: 90000,
    y0: 2500000,
    color: '#64748b',
    fillWithColor: 'rgba(100, 116, 139, 0.18)',
    examplePoleCode: 'P1010 AA01',
    descriptionZh: '高雄港外錨泊區海域'
  },
  {
    letter: 'Q',
    nameZh: '高雄都會區 / 屏東北 / 旗山美濃',
    nameEn: 'Kaohsiung Metro / North Pingtung / Qishan Meinong',
    subdivisionsZh: ['高雄市苓雅/三民/鳳山/旗山/美濃', '屏東市/潮州/里港'],
    x0: 170000,
    y0: 2500000,
    color: '#ef4444',
    fillWithColor: 'rgba(239, 68, 68, 0.28)',
    examplePoleCode: 'Q4060 BB33',
    descriptionZh: '大高雄都會中心區、愛河、屏東平原高屏溪沿線'
  },
  {
    letter: 'R',
    nameZh: '台東市 / 卑南 / 綠島',
    nameEn: 'Taitung City / Beinan / Green Island',
    subdivisionsZh: ['台東市', '卑南鄉', '太麻里鄉', '綠島鄉'],
    x0: 250000,
    y0: 2500000,
    color: '#a855f7',
    fillWithColor: 'rgba(168, 85, 247, 0.28)',
    examplePoleCode: 'R1998 EE79',
    descriptionZh: '台東黑森林卑南溪口、太麻里金針山與綠島'
  },
  {
    letter: 'T',
    nameZh: '屏東南 / 恆春半島 / 墾丁',
    nameEn: 'South Pingtung / Hengchun / Kenting',
    subdivisionsZh: ['屏東枋寮/枋山/車城/恆春/滿州', '小琉球'],
    x0: 170000,
    y0: 2450000,
    color: '#f97316',
    fillWithColor: 'rgba(249, 115, 22, 0.28)',
    examplePoleCode: 'T3050 CD44',
    descriptionZh: '國境之南恆春古城、墾丁國家公園與佳鵝公路'
  },
  {
    letter: 'U',
    nameZh: '蘭嶼鄉海域',
    nameEn: 'Orchid Island (Lanyu)',
    subdivisionsZh: ['台東縣蘭嶼鄉'],
    x0: 250000,
    y0: 2450000,
    color: '#0284c7',
    fillWithColor: 'rgba(2, 132, 199, 0.25)',
    examplePoleCode: 'U1580 AA05',
    descriptionZh: '達悟族拼板舟故鄉蘭嶼與東清灣'
  },
  {
    letter: 'V',
    nameZh: '鵝鑾鼻以南海峽',
    nameEn: 'South of Eluanbi / Bashi Channel',
    subdivisionsZh: ['巴士海峽北部海域'],
    x0: 170000,
    y0: 2400000,
    color: '#475569',
    fillWithColor: 'rgba(71, 85, 105, 0.18)',
    examplePoleCode: 'V2020 AA01',
    descriptionZh: '台灣本島極南鵝鑾鼻燈塔南方巴士海峽'
  },
  {
    letter: 'W',
    nameZh: '台東東南海域',
    nameEn: 'Southeast Offshore Basin',
    subdivisionsZh: ['太平洋深海盆地'],
    x0: 250000,
    y0: 2400000,
    color: '#334155',
    fillWithColor: 'rgba(51, 65, 85, 0.18)',
    examplePoleCode: 'W1010 AA01',
    descriptionZh: '蘭嶼南方太平洋航道海域'
  }
];

export const TAIWAN_POWER_POLE_ZONES: TaipowerZoneDef[] = RAW_ZONES.map((z) => {
  const sw = twd67ToWgs84(z.x0, z.y0);
  const se = twd67ToWgs84(z.x0 + 80000, z.y0);
  const ne = twd67ToWgs84(z.x0 + 80000, z.y0 + 50000);
  const nw = twd67ToWgs84(z.x0, z.y0 + 50000);
  const center = twd67ToWgs84(z.x0 + 40000, z.y0 + 25000);

  return {
    ...z,
    sw,
    se,
    ne,
    nw,
    center
  };
});

export const TAIWAN_POWER_POLE_ZONES_BY_LETTER: Record<string, TaipowerZoneDef> = {};
for (const z of TAIWAN_POWER_POLE_ZONES) {
  TAIWAN_POWER_POLE_ZONES_BY_LETTER[z.letter] = z;
}

/**
 * Decodes a 9-11 character Taipower pole code into approximate WGS84 lat/lon.
 * e.g., "B8230 AA93" -> [121.664, 25.008]
 */
export function decodeTaipowerCode(code: string): { lon: number; lat: number; zone: TaipowerZoneDef; xPercent: number; yPercent: number } | null {
  const clean = code.toUpperCase().replace(/[\s\-_]+/g, '');
  if (clean.length < 5) return null;

  const letter = clean[0];
  const zone = TAIWAN_POWER_POLE_ZONES_BY_LETTER[letter];
  if (!zone) return null;

  const pp = parseInt(clean.substring(1, 3), 10);
  const qq = parseInt(clean.substring(3, 5), 10);
  if (isNaN(pp) || isNaN(qq)) return null;

  let rOffset = 0;
  let sOffset = 0;
  if (clean.length >= 7) {
    const rChar = clean[5];
    const sChar = clean[6];
    if (rChar >= 'A' && rChar <= 'H') rOffset = (rChar.charCodeAt(0) - 'A'.charCodeAt(0)) * 100;
    if (sChar >= 'A' && sChar <= 'E') sOffset = (sChar.charCodeAt(0) - 'A'.charCodeAt(0)) * 100;
  }

  let tOffset = 0;
  let uOffset = 0;
  if (clean.length >= 9) {
    const tNum = parseInt(clean[7], 10) || 0;
    const uNum = parseInt(clean[8], 10) || 0;
    tOffset = tNum * 10;
    uOffset = uNum * 10;
  }

  const tm2X = zone.x0 + pp * 800 + rOffset + tOffset;
  const tm2Y = zone.y0 + qq * 500 + sOffset + uOffset;
  const [lon, lat] = twd67ToWgs84(tm2X, tm2Y);

  return {
    lon,
    lat,
    zone,
    xPercent: pp,
    yPercent: qq
  };
}
