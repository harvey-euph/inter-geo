/**
 * Capital Subdivisions Registry for Nationwide Filter
 *
 * Maps ISO-2 country codes to their respective capital subdivision
 * identifiers, codes, or names for L2 nationwide highlight coloring.
 */

export interface CapitalSubdivisionInfo {
  iso2: string;
  capitalNameZh: string;
  capitalNameEn: string;
  subdivisionCode?: string; // e.g. "DC", "13", "DF", "IDF"
  subdivisionId?: string | number;
  subdivisionNameZh: string;
  subdivisionNameEn: string;
  geoGuessrMetaZh: string;
}

export const CAPITAL_SUBDIVISIONS: Record<string, CapitalSubdivisionInfo> = {
  US: {
    iso2: 'US',
    capitalNameZh: '華盛頓特區',
    capitalNameEn: 'Washington, D.C.',
    subdivisionCode: 'DC',
    subdivisionId: 'US-DC',
    subdivisionNameZh: '哥倫比亞特區',
    subdivisionNameEn: 'District of Columbia',
    geoGuessrMetaZh: '美國聯邦直轄首都特區，車牌印有「End Taxation Without Representation」，路牌帶有象徵性星條標誌。'
  },
  JP: {
    iso2: 'JP',
    capitalNameZh: '東京',
    capitalNameEn: 'Tokyo',
    subdivisionCode: '13',
    subdivisionId: 13,
    subdivisionNameZh: '東京都',
    subdivisionNameEn: 'Tokyo',
    geoGuessrMetaZh: '日本首都，市外局番電話為「03」，JIS 代碼 13，車牌地名包含品川、練馬、足立、八王子等。'
  },
  BR: {
    iso2: 'BR',
    capitalNameZh: '巴西利亞',
    capitalNameEn: 'Brasília',
    subdivisionCode: 'DF',
    subdivisionId: 'BR-DF',
    subdivisionNameZh: '聯邦區',
    subdivisionNameEn: 'Distrito Federal',
    geoGuessrMetaZh: '巴西聯邦首都，DDD 電話區號為「61」，奧斯卡·尼邁耶前衛曲線現代主義建築與飛機形都市規劃。'
  },
  FR: {
    iso2: 'FR',
    capitalNameZh: '巴黎',
    capitalNameEn: 'Paris',
    subdivisionCode: 'IDF',
    subdivisionId: 'FR-IDF',
    subdivisionNameZh: '法蘭西島大區',
    subdivisionNameEn: 'Île-de-France',
    geoGuessrMetaZh: '法國首都所在大區，電話區碼為「01」，巴黎省編號為「75」，奧斯曼風格石造建築與經典地鐵標誌。'
  },
  GB: {
    iso2: 'GB',
    capitalNameZh: '倫敦',
    capitalNameEn: 'London',
    subdivisionCode: 'ENG',
    subdivisionId: 'GB-ENG',
    subdivisionNameZh: '英格蘭 / 大倫敦',
    subdivisionNameEn: 'England / Greater London',
    geoGuessrMetaZh: '英國首都，電話區號「020」，黑色計程車 (Black Cab)、紅色雙層巴士與標誌性地鐵紅藍圓形標 (Roundel)。'
  },
  DE: {
    iso2: 'DE',
    capitalNameZh: '柏林',
    capitalNameEn: 'Berlin',
    subdivisionCode: 'BE',
    subdivisionId: 'DE-BE',
    subdivisionNameZh: '柏林直轄市邦',
    subdivisionNameEn: 'Berlin',
    geoGuessrMetaZh: '德國聯邦首都，車牌前綴為單字母「B」，經典紅綠燈小人 (Ampelmännchen) 與柏林熊雕像。'
  },
  IT: {
    iso2: 'IT',
    capitalNameZh: '羅馬',
    capitalNameEn: 'Rome',
    subdivisionCode: '62',
    subdivisionId: 'IT-62',
    subdivisionNameZh: '拉齊奧大區',
    subdivisionNameEn: 'Lazio',
    geoGuessrMetaZh: '義大利首都，歐盟車牌右側省份藍條為「RM」，隨處可見 SPQR 徽章人孔蓋與古羅馬古蹟。'
  },
  ES: {
    iso2: 'ES',
    capitalNameZh: '馬德里',
    capitalNameEn: 'Madrid',
    subdivisionCode: 'MD',
    subdivisionId: 'ES-MD',
    subdivisionNameZh: '馬德里自治區',
    subdivisionNameEn: 'Comunidad de Madrid',
    geoGuessrMetaZh: '西班牙首都，環城公路為 M-30/M-40，郵遞區號前兩碼「28」，市徽為草莓樹與熊。'
  },
  IN: {
    iso2: 'IN',
    capitalNameZh: '新德里',
    capitalNameEn: 'New Delhi',
    subdivisionCode: 'DL',
    subdivisionId: 'IN-DL',
    subdivisionNameZh: '德里國家首都轄區',
    subdivisionNameEn: 'National Capital Territory of Delhi',
    geoGuessrMetaZh: '印度國家首都轄區，官方路牌必為印地語、英語、旁遮普語、烏爾都語四語並列！'
  },
  AU: {
    iso2: 'AU',
    capitalNameZh: '坎培拉',
    capitalNameEn: 'Canberra',
    subdivisionCode: 'ACT',
    subdivisionId: 'AU-ACT',
    subdivisionNameZh: '澳洲首都領地',
    subdivisionNameEn: 'Australian Capital Territory',
    geoGuessrMetaZh: '澳洲聯邦首都領地，車牌標語「Canberra - The Nation\'s Capital」，電話 STD 區號為「02」。'
  },
  CA: {
    iso2: 'CA',
    capitalNameZh: '渥太華',
    capitalNameEn: 'Ottawa',
    subdivisionCode: 'ON',
    subdivisionId: 'CA-ON',
    subdivisionNameZh: '安大略省',
    subdivisionNameEn: 'Ontario',
    geoGuessrMetaZh: '加拿大首都渥太華所在地，藍字白底安大略車牌，帶有官方英法雙語路牌。'
  },
  MX: {
    iso2: 'MX',
    capitalNameZh: '墨西哥城',
    capitalNameEn: 'Mexico City',
    subdivisionCode: 'CMX',
    subdivisionId: 'MX-CMX',
    subdivisionNameZh: '墨西哥城聯邦直轄區',
    subdivisionNameEn: 'Ciudad de México (CDMX)',
    geoGuessrMetaZh: '墨西哥首都，電話區號為「55」，粉紅白相間計程車，超密集都市天際線。'
  },
  AR: {
    iso2: 'AR',
    capitalNameZh: '布宜諾斯艾利斯',
    capitalNameEn: 'Buenos Aires',
    subdivisionCode: 'C',
    subdivisionId: 'AR-C',
    subdivisionNameZh: '布宜諾斯艾利斯自治市',
    subdivisionNameEn: 'Ciudad Autónoma de Buenos Aires (CABA)',
    geoGuessrMetaZh: '阿根廷首都自治市，電話區碼「011」，黑身黃頂計程車，七月九日大道與方尖碑。'
  },
  RU: {
    iso2: 'RU',
    capitalNameZh: '莫斯科',
    capitalNameEn: 'Moscow',
    subdivisionCode: 'MOW',
    subdivisionId: 'RU-MOW',
    subdivisionNameZh: '莫斯科聯邦直轄市',
    subdivisionNameEn: 'Moscow',
    geoGuessrMetaZh: '俄羅斯聯邦首都，電話號碼為「495 / 499」，車牌地區代碼「77, 99, 177, 777, 799」。'
  },
  TH: {
    iso2: 'TH',
    capitalNameZh: '曼谷',
    capitalNameEn: 'Bangkok',
    subdivisionCode: '10',
    subdivisionId: 'TH-10',
    subdivisionNameZh: '曼谷特別行政區',
    subdivisionNameEn: 'Bangkok',
    geoGuessrMetaZh: '泰國首都，電話區號為「02」，粉紅色/黃綠色計程車，湄南河高架快速道路。'
  },
  ID: {
    iso2: 'ID',
    capitalNameZh: '雅加達',
    capitalNameEn: 'Jakarta',
    subdivisionCode: 'JK',
    subdivisionId: 'ID-JK',
    subdivisionNameZh: '雅加達首都特區',
    subdivisionNameEn: 'DKI Jakarta',
    geoGuessrMetaZh: '印尼首都，電話區號為「021」，車牌首字母為「B」，TransJakarta 專用公車捷運。'
  },
  TW: {
    iso2: 'TW',
    capitalNameZh: '台北',
    capitalNameEn: 'Taipei',
    subdivisionCode: 'TPE',
    subdivisionId: 'TPE',
    subdivisionNameZh: '台北市',
    subdivisionNameEn: 'Taipei City',
    geoGuessrMetaZh: '台灣首都，市話區碼「02」，台北 101 與棋盤狀八縱八橫林蔭大道。'
  },
  KR: {
    iso2: 'KR',
    capitalNameZh: '首爾',
    capitalNameEn: 'Seoul',
    subdivisionCode: '11',
    subdivisionId: 'KR-11',
    subdivisionNameZh: '首爾特別市',
    subdivisionNameEn: 'Seoul Special City',
    geoGuessrMetaZh: '南韓首都，市話區號為「02」，橙色/銀色首爾計程車，漢江兩側高樓。'
  },
  PL: {
    iso2: 'PL',
    capitalNameZh: '華沙',
    capitalNameEn: 'Warsaw',
    subdivisionCode: 'MZ',
    subdivisionId: 'PL-MZ',
    subdivisionNameZh: '馬佐夫舍省',
    subdivisionNameEn: 'Masovian Voivodeship',
    geoGuessrMetaZh: '波蘭首都所在省，車牌首字母為「W」（華沙各區為 WI, WA, WB, WX 等）。'
  },
  SE: {
    iso2: 'SE',
    capitalNameZh: '斯德哥爾摩',
    capitalNameEn: 'Stockholm',
    subdivisionCode: 'AB',
    subdivisionId: 'SE-AB',
    subdivisionNameZh: '斯德哥爾摩省',
    subdivisionNameEn: 'Stockholm County',
    geoGuessrMetaZh: '瑞典首都群島，早期車牌字母「A/AA」，SL 紅色大眾交通網絡。'
  },
  NO: {
    iso2: 'NO',
    capitalNameZh: '奧斯陸',
    capitalNameEn: 'Oslo',
    subdivisionCode: '03',
    subdivisionId: 'NO-03',
    subdivisionNameZh: '奧斯陸市/郡',
    subdivisionNameEn: 'Oslo',
    geoGuessrMetaZh: '挪威首都峽灣城市，車牌前綴為「DA ~ DR」。'
  },
  FI: {
    iso2: 'FI',
    capitalNameZh: '赫爾辛基',
    capitalNameEn: 'Helsinki',
    subdivisionCode: '18',
    subdivisionId: 'FI-18',
    subdivisionNameZh: '新地區',
    subdivisionNameEn: 'Uusimaa',
    geoGuessrMetaZh: '芬蘭首都所在大區，HSL 綠藍色路面電車與海港花崗岩建築。'
  },
  PE: {
    iso2: 'PE',
    capitalNameZh: '利馬',
    capitalNameEn: 'Lima',
    subdivisionCode: 'LIM',
    subdivisionId: 'PE-LIM',
    subdivisionNameZh: '利馬省 / 利馬大區',
    subdivisionNameEn: 'Lima',
    geoGuessrMetaZh: '秘魯首都，超過 6,000 家 Chifa 中餐館所在地，沿海灰濛陰天乾燥氣候。'
  },
  CL: {
    iso2: 'CL',
    capitalNameZh: '聖地牙哥',
    capitalNameEn: 'Santiago',
    subdivisionCode: 'RM',
    subdivisionId: 'CL-RM',
    subdivisionNameZh: '聖地牙哥首都大區',
    subdivisionNameEn: 'Región Metropolitana de Santiago',
    geoGuessrMetaZh: '智利首都大區，四周安地斯巍峨雪山環抱，現代化玻璃摩天樓。'
  },
  CO: {
    iso2: 'CO',
    capitalNameZh: '波哥大',
    capitalNameEn: 'Bogotá',
    subdivisionCode: 'DC',
    subdivisionId: 'CO-DC',
    subdivisionNameZh: '波哥大首都特區',
    subdivisionNameEn: 'Bogotá D.C.',
    geoGuessrMetaZh: '哥倫比亞首都，海拔 2,600 公尺高山盆地，TransMilenio 紅色雙節公車系統。'
  }
};

/**
 * Checks whether an L2 subdivision is the capital region for its country
 */
export function isCapitalSubdivision(
  iso2: string,
  sub: { id?: string | number; code?: string; name?: string; nameEn?: string; nameZh?: string; postal?: string }
): boolean {
  if (!iso2) return false;
  const cap = CAPITAL_SUBDIVISIONS[iso2.toUpperCase()];
  if (!cap) return false;

  const code = (sub.code || '').toUpperCase().trim();
  const idStr = String(sub.id || '').toUpperCase().trim();
  const postal = (sub.postal || '').toUpperCase().trim();
  const nameEn = (sub.nameEn || sub.name || '').toLowerCase().trim();
  const nameZh = (sub.nameZh || '').trim();

  // Match by code/id/postal
  if (cap.subdivisionCode) {
    const capCode = cap.subdivisionCode.toUpperCase();
    if (code === capCode || code.endsWith(`-${capCode}`) || postal === capCode) return true;
  }
  if (cap.subdivisionId !== undefined) {
    const capIdStr = String(cap.subdivisionId).toUpperCase();
    if (idStr === capIdStr || idStr.endsWith(`-${capIdStr}`)) return true;
  }

  // Match by name
  const capEn = cap.capitalNameEn.toLowerCase();
  const subEn = cap.subdivisionNameEn.toLowerCase();
  if (nameEn.includes(capEn) || nameEn.includes(subEn) || subEn.includes(nameEn)) return true;

  if (cap.capitalNameZh && (nameZh.includes(cap.capitalNameZh) || cap.subdivisionNameZh.includes(nameZh))) {
    return true;
  }

  return false;
}
