/**
 * Worldwide Domestic Telephone Area Codes Registry
 *
 * Essential GeoGuessr telephone metadata for subdivisions:
 * - Brazil: DDD 2-digit codes (1x to 9x clockwise spiral distribution)
 * - Japan: 市外局番 (01~09 geographical block prefixes)
 * - Australia: 1-digit STD regional codes (02, 03, 07, 08)
 * - France: 5 regional telecommunication zones (01 to 05)
 * - Russia: City dialing prefixes (495 Moscow, 812 SPb, 843 Kazan, etc.)
 * - Thailand: Regional codes (02 Bangkok, 053 Chiang Mai, 038 Chonburi, etc.)
 * - Indonesia: Regional prefixes (021 Jakarta, 022 Bandung, 031 Surabaya, 0361 Bali, etc.)
 * - Mexico: LADA area codes (55 CDMX, 33 Guadalajara, 81 Monterrey, 998 Cancun, etc.)
 * - Argentina: Interurban codes (011 Buenos Aires, 0351 Córdoba, 0341 Rosario, etc.)
 * - United Kingdom: STD codes (020 London, 0121 Birmingham, 0161 Manchester, etc.)
 * - United States: Famous regional state NPA codes (212 NYC, 213 LA, 312 Chicago, etc.)
 */

export const BRAZIL_DDD_CODES: Record<string, string> = {
  SP: '11~19',
  RJ: '21, 22, 24',
  ES: '27, 28',
  MG: '31~38',
  PR: '41~46',
  SC: '47~49',
  RS: '51~55',
  DF: '61',
  GO: '62, 64',
  TO: '63',
  MT: '65, 66',
  MS: '67',
  AC: '68',
  RO: '69',
  BA: '71~77',
  SE: '79',
  PE: '81, 87',
  AL: '82',
  PB: '83',
  RN: '84',
  CE: '85, 88',
  PI: '86, 89',
  PA: '91, 93, 94',
  AM: '92, 97',
  RR: '95',
  AP: '96',
  MA: '98, 99'
};

export const JAPAN_AREA_CODES: Record<number, string> = {
  1: '011',    // 北海道 (札幌)
  2: '017',    // 青森
  3: '019',    // 岩手
  4: '022',    // 宮城 (仙台)
  5: '018',    // 秋田
  6: '023',    // 山形
  7: '024',    // 福島
  8: '029',    // 茨城
  9: '028',    // 栃木
  10: '027',   // 群馬
  11: '048',   // 埼玉
  12: '043',   // 千葉
  13: '03',    // 東京 (23區)
  14: '045',   // 神奈川 (橫濱)
  15: '025',   // 新潟
  16: '076',   // 富山
  17: '076',   // 石川 (金澤)
  18: '0776',  // 福井
  19: '055',   // 山梨
  20: '026',   // 長野
  21: '058',   // 岐阜
  22: '054',   // 靜岡
  23: '052',   // 愛知 (名古屋)
  24: '059',   // 三重
  25: '077',   // 滋賀
  26: '075',   // 京都
  27: '06',    // 大阪
  28: '078',   // 兵庫 (神戶)
  29: '074',   // 奈良
  30: '073',   // 和歌山
  31: '0857',  // 鳥取
  32: '0852',  // 島根
  33: '086',   // 岡山
  34: '082',   // 廣島
  35: '083',   // 山口
  36: '088',   // 德島
  37: '087',   // 香川
  38: '089',   // 愛媛
  39: '088',   // 高知
  40: '092',   // 福岡
  41: '0952',  // 佐賀
  42: '095',   // 長崎
  43: '096',   // 熊本
  44: '097',   // 大分
  45: '0985',  // 宮崎
  46: '099',   // 鹿兒島
  47: '098'    // 沖繩
};

export const AUSTRALIA_AREA_CODES: Record<string, string> = {
  NSW: '02',
  ACT: '02',
  VIC: '03',
  TAS: '03',
  QLD: '07',
  WA: '08',
  SA: '08',
  NT: '08'
};

export const FRANCE_AREA_CODES: Record<string, string> = {
  IDF: '01',
  BRE: '02',
  NOR: '02',
  PDL: '02',
  CVL: '02',
  HDF: '03',
  GES: '03',
  BFC: '03',
  ARA: '04',
  PAC: '04',
  COR: '04',
  NAQ: '05',
  OCC: '05'
};

export const RUSSIA_AREA_CODES: Record<string, string> = {
  MOW: '495, 499',   // 莫斯科
  MOS: '496',        // 莫斯科州
  SPE: '812',        // 聖彼得堡
  LEN: '813',        // 列寧格勒州
  TA: '843',         // 韃靼斯坦 (喀山)
  SVE: '343',        // 斯維爾德洛夫斯克 (葉卡捷琳堡)
  NVS: '383',        // 新西伯利亞
  NIZ: '831',        // 下諾夫哥羅德
  KDA: '861',        // 克拉斯諾達爾
  ROS: '863',        // 羅斯托夫
  SAM: '846',        // 薩馬拉
  KYA: '391',        // 克拉斯諾亞爾斯克
  CHE: '351',        // 車里雅賓斯克
  VGG: '8442',       // 伏爾加格勒
  OMS: '3812',       // 鄂木斯克
  BA: '347',         // 巴什科爾托斯坦 (烏法)
  PER: '342',        // 彼爾姆
  PRI: '423',        // 濱海邊疆區 (海參崴)
  KHA: '4212'        // 哈巴羅夫斯克 (伯力)
};

export const THAILAND_AREA_CODES: Record<string, string> = {
  '10': '02',  // 曼谷都會區
  '50': '053', // 清邁
  '57': '053', // 清萊
  '20': '038', // 春武里 (芭達雅)
  '21': '038', // 羅勇
  '30': '044', // 呵叻
  '83': '076', // 普吉
  '90': '074', // 宋卡 (合艾)
  '40': '043', // 孔敬
  '52': '054', // 南邦
  '84': '077', // 素叻他尼 (蘇美島)
  '77': '077', // 春蓬
  '70': '032', // 叻丕
  '76': '032', // 碧差汶
  '73': '034', // 佛統
  '14': '035', // 大城 (阿瑜陀耶)
  '65': '055', // 彭世洛
  '60': '056', // 那空沙旺
  '41': '042', // 烏隆他尼
  '34': '045'  // 烏汶
};

export const INDONESIA_AREA_CODES: Record<string, string> = {
  JK: '021',   // 雅加達 (Jabodetabek)
  JB: '022',   // 西爪哇 (萬隆)
  JI: '031',   // 東爪哇 (泗水)
  JT: '024',   // 中爪哇 (三寶瓏)
  YO: '0274',  // 日惹
  SU: '061',   // 北蘇門答臘 (棉蘭)
  BA: '0361',  // 峇里島 (登巴薩)
  SN: '0411',  // 南蘇拉威西 (望加錫)
  SS: '0711',  // 南蘇門答臘 (巨港)
  SB: '0751',  // 西蘇門答臘 (巴東)
  RI: '0761',  // 廖內 (北干巴魯)
  KR: '0778',  // 廖內群島 (巴淡島)
  KI: '0542',  // 東加里曼丹 (巴厘巴板)
  KS: '0511',  // 南加里曼丹 (馬辰)
  SA: '0431',  // 北蘇拉威西 (萬鴉老)
  NB: '0370',  // 西努沙登加拉 (龍目島)
  NT: '0380',  // 東努沙登加拉 (古邦)
  PA: '0967'   // 巴布亞 (查亞普拉)
};

export const MEXICO_AREA_CODES: Record<string, string> = {
  CMX: '55',   // 墨西哥城 (CDMX)
  MEX: '55/722', // 墨西哥州
  JAL: '33',   // 哈利斯科 (瓜達拉哈拉)
  NLE: '81',   // 新萊昂 (蒙特雷)
  PUE: '222',  // 普埃布拉
  QUE: '442',  // 克雷塔羅
  ROO: '998',  // 金塔納羅奧 (坎昆)
  BCN: '664',  // 下加利福尼亞 (提華納)
  YUC: '999',  // 猶加敦 (梅里達)
  GUA: '477',  // 瓜納華托 (萊昂)
  CHH: '656/614', // 奇瓦瓦
  SLP: '444',  // 聖路易斯波托西
  MOR: '777',  // 莫雷洛斯 (庫埃納瓦卡)
  GRO: '744',  // 格雷羅 (阿卡普爾科)
  CHP: '961',  // 恰帕斯
  OAX: '951',  // 瓦哈卡
  SIN: '667',  // 錫那羅亞 (庫利亞坎)
  SON: '662',  // 索諾拉
  VER: '229'   // 維拉克魯斯
};

export const ARGENTINA_AREA_CODES: Record<string, string> = {
  C: '011',    // 布宜諾斯艾利斯自治市 (CABA)
  B: '0221',   // 布宜諾斯艾利斯省 (拉普拉塔)
  X: '0351',   // 哥多華
  S: '0341',   // 聖塔菲 (羅薩里奧)
  M: '0261',   // 門多薩
  T: '0381',   // 圖庫曼
  A: '0387',   // 薩爾塔
  Q: '0299',   // 內烏肯
  W: '0379',   // 科連特斯
  H: '0362',   // 查科
  J: '0264',   // 聖胡安
  Y: '0388',   // 胡胡伊
  Z: '02966',  // 聖克魯斯 (里奧加耶戈斯)
  V: '02901'   // 火地島 (烏斯懷亞)
};

export const UK_AREA_CODES: Record<string, string> = {
  ENG: '020/0121', // 倫敦 020、伯明罕 0121、曼城 0161
  SCT: '0141/0131', // 格拉斯哥 0141、愛丁堡 0131
  WLS: '029',      // 卡迪夫 029
  NIR: '028'       // 貝爾法斯特 028
};

export const US_AREA_CODES: Record<string, string> = {
  NY: '212, 718, 917',
  CA: '213, 310, 415',
  TX: '512, 214, 713',
  FL: '305, 407, 813',
  IL: '312, 773, 847',
  WA: '206, 425',
  DC: '202',
  MA: '617, 857',
  GA: '404, 770',
  CO: '303, 720',
  PA: '215, 412',
  AZ: '602, 480',
  NV: '702, 775'
};

export interface SubdivisionAreaCodeInput {
  id?: number | string;
  postal?: string;
  code?: string;
  name?: string;
  nameEn?: string;
  nameZh?: string;
}

/**
 * Returns raw area code string for a subdivision in supported countries
 */
export function getSubdivisionAreaCode(iso2: string, sub: SubdivisionAreaCodeInput): string | null {
  const upper = iso2.toUpperCase();
  const codeRaw = (sub.code || '').toUpperCase().trim();
  const postal = (sub.postal || codeRaw.replace(new RegExp(`^${upper}-`), '') || '').toUpperCase().trim();

  if (upper === 'BR') {
    return BRAZIL_DDD_CODES[postal] || null;
  }
  if (upper === 'JP') {
    const prefId = Number(sub.id || sub.code);
    if (!isNaN(prefId) && JAPAN_AREA_CODES[prefId]) {
      return JAPAN_AREA_CODES[prefId];
    }
    return null;
  }
  if (upper === 'AU') {
    return AUSTRALIA_AREA_CODES[postal] || null;
  }
  if (upper === 'FR') {
    return FRANCE_AREA_CODES[postal] || null;
  }
  if (upper === 'RU') {
    const subdivisionCode = codeRaw.replace(new RegExp(`^${upper}-`), '');
    return RUSSIA_AREA_CODES[subdivisionCode] || RUSSIA_AREA_CODES[postal] || null;
  }
  if (upper === 'TH') {
    return THAILAND_AREA_CODES[postal] || null;
  }
  if (upper === 'ID') {
    return INDONESIA_AREA_CODES[postal] || null;
  }
  if (upper === 'MX') {
    return MEXICO_AREA_CODES[postal] || null;
  }
  if (upper === 'AR') {
    return ARGENTINA_AREA_CODES[postal] || null;
  }
  if (upper === 'GB') {
    return UK_AREA_CODES[postal] || null;
  }
  if (upper === 'US') {
    return US_AREA_CODES[postal] || null;
  }
  return null;
}

/**
 * Returns formatted text badge for rendering on the map canvas
 * e.g., 'SP · 11~19', '東京 · 03', 'NSW · 02', 'IDF · 01', 'MOW · 495', 'BKK · 02'
 */
export function getSubdivisionAreaCodeBadge(iso2: string, sub: SubdivisionAreaCodeInput): string | null {
  const code = getSubdivisionAreaCode(iso2, sub);
  if (!code) return null;

  const upper = iso2.toUpperCase();
  const codeRaw = (sub.code || '').toUpperCase().trim();
  const postal = (sub.postal || codeRaw.replace(new RegExp(`^${upper}-`), '') || '').toUpperCase().trim();

  if (upper === 'JP') {
    const rawZh = sub.nameZh || sub.name || '';
    const cleanZh = rawZh.replace(/[縣府道都]/g, '');
    return cleanZh ? `${cleanZh} · ${code}` : code;
  }
  if (upper === 'RU') {
    const subdivisionCode = codeRaw.replace(new RegExp(`^${upper}-`), '');
    return `${subdivisionCode || postal} · ${code}`;
  }
  if (postal) {
    return `${postal} · ${code}`;
  }
  return code;
}
