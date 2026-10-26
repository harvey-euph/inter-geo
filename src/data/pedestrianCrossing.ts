import { getCsvLayerById } from '../layers/csvLayerRegistry';

export interface CrossingSignMeta {
  iso2: string;
  nameZh: string;
  nameEn: string;
  imagePath: string;
  stripes: number;
  direction: 'left' | 'right';
  shape: 'blue_square' | 'yellow_diamond' | 'red_triangle' | 'yellow_triangle';
  descriptionZh: string;
}

/**
 * European Pedestrian Crossing Signs (Zebra Crossing Signs) Meta Registry
 *
 * Meticulously verified against public/images/eu-crossing-signs.jpg, official European
 * traffic sign standards (StVO, Code de la route, Prawo o ruchu drogowym, Vegagerðin, etc.),
 * and Wikimedia Commons official vector diagrams.
 */
export const EUROPEAN_CROSSING_SIGNS: Record<string, CrossingSignMeta> = {
  // --- Western Europe ---
  DE: {
    iso2: 'DE',
    nameZh: '德國',
    nameEn: 'Germany',
    imagePath: '/images/crossing/de.svg',
    stripes: 4,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '標準 StVO 350-10 標誌：藍底白三角，行人向左行，4 條粗斑馬線。與西歐多數 5 條國家區隔的關鍵特徵。'
  },
  ES: {
    iso2: 'ES',
    nameZh: '西班牙',
    nameEn: 'Spain',
    imagePath: '/images/crossing/es.svg',
    stripes: 8,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '西班牙 S-13 標誌：全歐洲斑馬線條數最多的設計（共 8 條），行人朝左邁步。'
  },
  AD: {
    iso2: 'AD',
    nameZh: '安道爾',
    nameEn: 'Andorra',
    imagePath: '/images/crossing/ad.svg',
    stripes: 8,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '安道爾沿用西班牙 S-13 標誌規範：藍底白三角，8 條粗斑馬線，行人向左行。'
  },
  FR: {
    iso2: 'FR',
    nameZh: '法國',
    nameEn: 'France',
    imagePath: '/images/crossing/fr.svg',
    stripes: 5,
    direction: 'right',
    shape: 'blue_square',
    descriptionZh: '法國 C20a 標誌：外環厚白圓角方框，行人向右邁步（右腳在前），5 條斑馬線。'
  },
  PT: {
    iso2: 'PT',
    nameZh: '葡萄牙',
    nameEn: 'Portugal',
    imagePath: '/images/crossing/pt.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '葡萄牙 H7 標誌：藍底白三角，行人向左行，5 條斑馬線（與法國向右走呈鮮明對比）。'
  },
  IT: {
    iso2: 'IT',
    nameZh: '義大利',
    nameEn: 'Italy',
    imagePath: '/images/crossing/it.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '義大利標誌：藍底白三角，行人向左行，5 條斑馬線（下方帶有微小基座橫線）。'
  },
  SM: {
    iso2: 'SM',
    nameZh: '聖馬利諾',
    nameEn: 'San Marino',
    imagePath: '/images/crossing/sm.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '聖馬利諾沿用義大利規範：藍底白三角，行人向左行，5 條斑馬線。'
  },
  BE: {
    iso2: 'BE',
    nameZh: '比利時',
    nameEn: 'Belgium',
    imagePath: '/images/crossing/be.svg',
    stripes: 0,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '比利時 F49 標誌：行人朝左邁步，底部以兩條水平點狀虛線表示行人穿越道範圍（無垂直斑馬線條）。'
  },
  NL: {
    iso2: 'NL',
    nameZh: '荷蘭',
    nameEn: 'Netherlands',
    imagePath: '/images/crossing/nl.svg',
    stripes: 5,
    direction: 'right',
    shape: 'blue_square',
    descriptionZh: '荷蘭 L2 標誌：藍底白三角，行人向右邁步，5 條斑馬線（與鄰國德國 4 條向左走明顯不同）。'
  },
  LU: {
    iso2: 'LU',
    nameZh: '盧森堡',
    nameEn: 'Luxembourg',
    imagePath: '/images/crossing/lu.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '盧森堡 E,11a 標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },
  AT: {
    iso2: 'AT',
    nameZh: '奧地利',
    nameEn: 'Austria',
    imagePath: '/images/crossing/at.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '奧地利 Hinweiszeichen 2a：行人戴有經典便帽（帽子特徵），向左行，5 條斑馬線。'
  },
  CH: {
    iso2: 'CH',
    nameZh: '瑞士',
    nameEn: 'Switzerland',
    imagePath: '/images/crossing/ch.svg',
    stripes: 5,
    direction: 'right',
    shape: 'blue_square',
    descriptionZh: '瑞士特殊直式長條高牌：上方為白三角行人向右走、5 條斑馬線，下方為大片藍色空白（供標記距離或備註）。'
  },

  // --- British Isles ---
  GB: {
    iso2: 'GB',
    nameZh: '英國',
    nameEn: 'United Kingdom',
    imagePath: '/images/crossing/gb.svg',
    stripes: 0,
    direction: 'left',
    shape: 'red_triangle',
    descriptionZh: '英國紅白三角形警示牌（Traffic sign 544）：行人向左行，腳下為虛線斑馬線；另有藍底長方 Pedestrian crossing point 告示。'
  },
  IE: {
    iso2: 'IE',
    nameZh: '愛爾蘭',
    nameEn: 'Ireland',
    imagePath: '/images/crossing/ie.svg',
    stripes: 0,
    direction: 'right',
    shape: 'yellow_diamond',
    descriptionZh: '愛爾蘭 W-140A 標誌：美洲風黃底黑邊菱形警告牌（Yellow Diamond），黑人向右跨步，虛線橫道，全歐極罕見。'
  },

  // --- Nordic Region ---
  IS: {
    iso2: 'IS',
    nameZh: '冰島',
    nameEn: 'Iceland',
    imagePath: '/images/crossing/is.svg',
    stripes: 4,
    direction: 'right',
    shape: 'yellow_triangle',
    descriptionZh: '冰島 D02.11 標誌：藍色外方框內包「黃色三角形」，黑人向右邁步，4 條黑色斑馬線，全歐洲獨一無二！'
  },
  NO: {
    iso2: 'NO',
    nameZh: '挪威',
    nameEn: 'Norway',
    imagePath: '/images/crossing/no.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '挪威 516.H 標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },
  SE: {
    iso2: 'SE',
    nameZh: '瑞典',
    nameEn: 'Sweden',
    imagePath: '/images/crossing/se.svg',
    stripes: 4,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '瑞典 B3-1 標誌：傳奇紳士「Herr Gårman」（頭戴紳士禮帽），向左行，4 條斑馬線！偶見 Fru Gårman（穿裙女性）。'
  },
  FI: {
    iso2: 'FI',
    nameZh: '芬蘭',
    nameEn: 'Finland',
    imagePath: '/images/crossing/fi.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '芬蘭 E1-1 標誌（Suojatie）：藍底白三角，行人向左行，5 條斑馬線（與瑞典 4 條紳士帽可明確區分）。'
  },
  DK: {
    iso2: 'DK',
    nameZh: '丹麥',
    nameEn: 'Denmark',
    imagePath: '/images/crossing/dk.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '丹麥 E17 標誌：藍底白三角，圓頭人向左行，5 條斑馬線。'
  },

  // --- Central & Eastern Europe ---
  PL: {
    iso2: 'PL',
    nameZh: '波蘭',
    nameEn: 'Poland',
    imagePath: '/images/crossing/pl.svg',
    stripes: 0,
    direction: 'right',
    shape: 'blue_square',
    descriptionZh: '波蘭 Znak D-6 標誌：藍底白三角，行人朝右邁步，底部為白色實線橫道基底（無垂直分格條紋）。'
  },
  CZ: {
    iso2: 'CZ',
    nameZh: '捷克',
    nameEn: 'Czechia',
    imagePath: '/images/crossing/cz.svg',
    stripes: 4,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '捷克 IP-6 標誌：行人頭戴禮帽（帽子特徵），向左行，4 條斑馬線。'
  },
  SK: {
    iso2: 'SK',
    nameZh: '斯洛伐克',
    nameEn: 'Slovakia',
    imagePath: '/images/crossing/sk.svg',
    stripes: 4,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '斯洛伐克 325-10 標誌：簡約現代人偶剪影，向左行，4 條粗斑馬線。'
  },
  HU: {
    iso2: 'HU',
    nameZh: '匈牙利',
    nameEn: 'Hungary',
    imagePath: '/images/crossing/hu.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '匈牙利 E-038 標誌：深藍色底白三角，行人向左行，5 條斑馬線。'
  },
  RO: {
    iso2: 'RO',
    nameZh: '羅馬尼亞',
    nameEn: 'Romania',
    imagePath: '/images/crossing/ro.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '羅馬尼亞 G01 標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },
  MD: {
    iso2: 'MD',
    nameZh: '摩爾多瓦',
    nameEn: 'Moldova',
    imagePath: '/images/crossing/md.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '摩爾多瓦 5.50.1 標誌：藍底白三角，醒目的「螢光黃綠色外框」（Fluorescent border），行人向左行，5 條斑馬線。'
  },
  BG: {
    iso2: 'BG',
    nameZh: '保加利亞',
    nameEn: 'Bulgaria',
    imagePath: '/images/crossing/bg.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '保加利亞 Д17 標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },
  UA: {
    iso2: 'UA',
    nameZh: '烏克蘭',
    nameEn: 'Ukraine',
    imagePath: '/images/crossing/ua.svg',
    stripes: 5,
    direction: 'right',
    shape: 'blue_square',
    descriptionZh: '烏克蘭 5.38.1 標誌：藍底白三角，行人向右邁步（右腳跨前），5 條斑馬線。'
  },
  BY: {
    iso2: 'BY',
    nameZh: '白俄羅斯',
    nameEn: 'Belarus',
    imagePath: '/images/crossing/by.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '白俄羅斯 5.19.1 標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },
  RU: {
    iso2: 'RU',
    nameZh: '俄羅斯',
    nameEn: 'Russia',
    imagePath: '/images/crossing/ru.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '俄羅斯 5.19.1 標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },

  // --- Baltic States ---
  EE: {
    iso2: 'EE',
    nameZh: '愛沙尼亞',
    nameEn: 'Estonia',
    imagePath: '/images/crossing/ee.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '愛沙尼亞 544 標誌：淺天藍色方框底，白三角，行人向左邁步，5 條斑馬線。'
  },
  LV: {
    iso2: 'LV',
    nameZh: '拉脫維亞',
    nameEn: 'Latvia',
    imagePath: '/images/crossing/lv.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '拉脫維亞 535 標誌：藍底白三角，行人身形動態前傾向左邁大步，5 條斑馬線。'
  },
  LT: {
    iso2: 'LT',
    nameZh: '立陶宛',
    nameEn: 'Lithuania',
    imagePath: '/images/crossing/lt.svg',
    stripes: 5,
    direction: 'right',
    shape: 'blue_square',
    descriptionZh: '立陶宛 533 標誌：波羅的海三國中唯一行人朝右邁步的設計，右腳在前、搭配 5 條斑馬線。'
  },

  // --- Southern Europe & Balkans ---
  GR: {
    iso2: 'GR',
    nameZh: '希臘',
    nameEn: 'Greece',
    imagePath: '/images/crossing/gr.svg',
    stripes: 0,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '希臘 P-21 / Π-21 標誌：行人朝左邁步，腳下為單條水平虛線（無垂直斑馬線條）。'
  },
  CY: {
    iso2: 'CY',
    nameZh: '塞浦路斯',
    nameEn: 'Cyprus',
    imagePath: '/images/crossing/cy.svg',
    stripes: 0,
    direction: 'right',
    shape: 'blue_square',
    descriptionZh: '塞浦路斯標誌：英聯邦傳承，行人向右行，腳下為「兩排水平點狀/虛線道」，無垂直斑馬線。'
  },
  MT: {
    iso2: 'MT',
    nameZh: '馬爾他',
    nameEn: 'Malta',
    imagePath: '/images/crossing/mt.svg',
    stripes: 0,
    direction: 'right',
    shape: 'blue_square',
    descriptionZh: '馬爾他 II.E8 標誌：藍底白三角，行人向右行，腳下為水平虛線標記，無垂直斑馬線。'
  },
  HR: {
    iso2: 'HR',
    nameZh: '克羅埃西亞',
    nameEn: 'Croatia',
    imagePath: '/images/crossing/hr.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '克羅埃西亞 C02 標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },
  SI: {
    iso2: 'SI',
    nameZh: '斯洛維尼亞',
    nameEn: 'Slovenia',
    imagePath: '/images/crossing/si.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '斯洛維尼亞 III-6 標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },
  BA: {
    iso2: 'BA',
    nameZh: '波士尼亞與赫塞哥維納',
    nameEn: 'Bosnia and Herzegovina',
    imagePath: '/images/crossing/ba.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '波士尼亞與赫塞哥維納標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },
  RS: {
    iso2: 'RS',
    nameZh: '塞爾維亞',
    nameEn: 'Serbia',
    imagePath: '/images/crossing/rs.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '塞爾維亞 III-6 標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },
  ME: {
    iso2: 'ME',
    nameZh: '蒙特內哥羅',
    nameEn: 'Montenegro',
    imagePath: '/images/crossing/me.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '蒙特內哥羅（黑山）標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },
  MK: {
    iso2: 'MK',
    nameZh: '北馬其頓',
    nameEn: 'North Macedonia',
    imagePath: '/images/crossing/mk.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '北馬其頓 302.1 標誌：藍底白三角，行人向左行，5 條斑馬線。'
  },
  AL: {
    iso2: 'AL',
    nameZh: '阿爾巴尼亞',
    nameEn: 'Albania',
    imagePath: '/images/crossing/al.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '阿爾巴尼亞標誌：沿用義大利標準，藍底白三角，行人向左行，5 條斑馬線。'
  },
  TR: {
    iso2: 'TR',
    nameZh: '土耳其',
    nameEn: 'Turkey',
    imagePath: '/images/crossing/tr.svg',
    stripes: 5,
    direction: 'left',
    shape: 'blue_square',
    descriptionZh: '土耳其 B-14a 標誌：藍底白三角，行人向左行，5 條斑馬線。'
  }
};

export const ALL_EUROPEAN_CROSSING_ISO2S = Object.keys(EUROPEAN_CROSSING_SIGNS);

export function getCrossingSign(iso2: string): CrossingSignMeta | null {
  const upper = iso2.toUpperCase();
  const layer = getCsvLayerById('pedestrian-crossing') || getCsvLayerById('eu-pedestrian-crossing');
  if (layer?.data?.rowMap) {
    const row = layer.data.rowMap.get(upper);
    if (row) {
      return {
        iso2: upper,
        nameZh: row.attributes.nameZh || row.label || '',
        nameEn: row.attributes.nameEn || '',
        imagePath: row.value || row.attributes.image || '',
        stripes: parseInt(row.attributes.stripes || '0', 10),
        direction: (row.attributes.direction as 'left' | 'right') || 'left',
        shape: (row.attributes.shape as CrossingSignMeta['shape']) || 'blue_square',
        descriptionZh: row.attributes.descriptionZh || row.label || ''
      };
    }
  }
  return EUROPEAN_CROSSING_SIGNS[upper] || null;
}
