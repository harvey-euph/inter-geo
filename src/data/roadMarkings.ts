/**
 * Worldwide Road Markings Specification for GeoGuessr
 *
 * Provides outer road edge line color and center line color for custom tri-part
 * segmented choropleth rendering (Left 1/3 outer, Middle 1/3 center, Right 1/3 outer).
 */

export interface CountryRoadMarking {
  iso2: string;
  nameZh: string;
  /** Outer road edge line color (邊線顏色, e.g. white '#f8fafc', yellow '#eab308') */
  outerColor: string;
  /** Center median road line color (車道中線顏色, e.g. white '#f8fafc', yellow '#eab308') */
  centerColor: string;
  outerType: 'white' | 'yellow' | 'none';
  centerType: 'white' | 'yellow' | 'none';
  summaryZh: string;
  descriptionZh: string;
}

export const ROAD_COLOR_WHITE = '#f1f5f9'; // Crisp bright white
export const ROAD_COLOR_YELLOW = '#f59e0b'; // High-visibility road amber/yellow

/**
 * Standard classification for countries with Street View coverage
 */
export const ROAD_MARKINGS: Record<string, CountryRoadMarking> = {
  // 1. White Outer + Yellow Center (美洲多數、台灣、日本、紐西蘭、菲律賓等)
  US: {
    iso2: 'US',
    nameZh: '美國',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央雙黃線',
    descriptionZh: '標準 MUTCD 規格：中央為雙黃線或虛黃線，外側邊線為實白線。'
  },
  CA: {
    iso2: 'CA',
    nameZh: '加拿大',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央雙黃線',
    descriptionZh: '中央雙黃線，外側實白線，冬季有橘色/黃色反光標兵桿。'
  },
  TW: {
    iso2: 'TW',
    nameZh: '台灣',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 (15cm) + 中央雙黃實線/單黃虛線',
    descriptionZh: '標準中央雙黃線（分向限制線），外側為 15 公分路面邊線白實線。'
  },
  MX: {
    iso2: 'MX',
    nameZh: '墨西哥',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央雙黃線',
    descriptionZh: '中央雙黃線或單黃虛線，外側白線，常有無鋪裝路肩與減速丘 (Topes)。'
  },
  BR: {
    iso2: 'BR',
    nameZh: '巴西',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央雙黃線',
    descriptionZh: '中央雙黃線，路側白線，常見紅色土壤路肩。'
  },
  CO: {
    iso2: 'CO',
    nameZh: '哥倫比亞',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央雙黃線',
    descriptionZh: '中央雙黃實線，安地斯山區狹窄山道，路牌背面帶金屬十字架。'
  },
  PE: {
    iso2: 'PE',
    nameZh: '秘魯',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央雙黃線',
    descriptionZh: '中央雙黃線，沿海乾旱沙漠路段路肩碎石常無外邊線。'
  },
  EC: {
    iso2: 'EC',
    nameZh: '厄瓜多',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央雙黃線',
    descriptionZh: '中央雙黃線，多山路彎道黃黑箭頭標誌。'
  },
  BO: {
    iso2: 'BO',
    nameZh: '玻利維亞',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央雙黃線',
    descriptionZh: '柏油幹道中央為雙黃線，許多高山未鋪裝碎石路。'
  },
  UY: {
    iso2: 'UY',
    nameZh: '烏拉圭',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央黃線',
    descriptionZh: '與阿根廷全白線不同，烏拉圭道路中央為黃線！'
  },
  JP: {
    iso2: 'JP',
    nameZh: '日本',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央禁止超車黃實線 / 白虛線',
    descriptionZh: '靠左行駛。禁止超車路段中央為亮黃實線，一般路段為白虛線。'
  },
  NZ: {
    iso2: 'NZ',
    nameZh: '紐西蘭',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央禁超黃實線 / 白虛線',
    descriptionZh: '靠左行駛。禁止超車路段為雙黃線或單黃線，其餘為白線。'
  },
  KR: {
    iso2: 'KR',
    nameZh: '南韓',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央雙黃實線',
    descriptionZh: '標準中央雙黃實線，路側白線，公車專用道為藍線。'
  },
  TH: {
    iso2: 'TH',
    nameZh: '泰國',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央黃線',
    descriptionZh: '靠左行駛，公路中央為黃色實線或雙黃線。'
  },
  PH: {
    iso2: 'PH',
    nameZh: '菲律賓',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 中央雙黃線',
    descriptionZh: '受美國規範影響，中央雙黃線，路側白線。'
  },
  ID: {
    iso2: 'ID',
    nameZh: '印尼',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'white',
    centerType: 'yellow',
    summaryZh: '左右白邊線 + 國道中央黃線 / 白線',
    descriptionZh: '靠左行駛，自 2019 年起國道（Jalan Nasional）中線統一改漆黃色！'
  },
  MY: {
    iso2: 'MY',
    nameZh: '馬來西亞',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線 (或局部黃線)',
    descriptionZh: '靠左行駛，聯邦公路普遍為全白線，特定危險路段塗黃。'
  },
  AU: {
    iso2: 'AU',
    nameZh: '澳洲',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線 (雪區/特例為黃)',
    descriptionZh: '靠左行駛，絕大多數公路中央與外側均為白線；阿爾卑斯雪區公路為黃線。'
  },

  // 2. Yellow Outer + White Center (挪威、南非、波札那、史瓦帝尼、賴索托)
  NO: {
    iso2: 'NO',
    nameZh: '挪威',
    outerColor: ROAD_COLOR_YELLOW,
    centerColor: ROAD_COLOR_YELLOW,
    outerType: 'yellow',
    centerType: 'yellow',
    summaryZh: '【秒殺標線】左右外側白邊線/黃虛線 + 中央黃實線/虛線',
    descriptionZh: '【北歐秒殺】挪威道路中線為亮黃色（禁止超車為雙黃實線，一般為長黃虛線），與瑞典/芬蘭的全白標線形成強烈對比！外側邊線通常為白線，特定山道為黃。'
  },
  ZA: {
    iso2: 'ZA',
    nameZh: '南非',
    outerColor: ROAD_COLOR_YELLOW,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'yellow',
    centerType: 'white',
    summaryZh: '【非洲秒殺】左右黃色路肩外邊線 + 中央白色虛線/實線',
    descriptionZh: '靠左行駛。南非極具辨識度：最外側路肩線一律為黃色實線（Yellow shoulder line），中央車道線為白色！'
  },
  BW: {
    iso2: 'BW',
    nameZh: '波札那',
    outerColor: ROAD_COLOR_YELLOW,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'yellow',
    centerType: 'white',
    summaryZh: '左右黃色外邊線 + 中央白色標線',
    descriptionZh: '靠左行駛。沿襲南非規格：左右外側路肩為黃線，中央中線為白線。'
  },
  SZ: {
    iso2: 'SZ',
    nameZh: '史瓦帝尼',
    outerColor: ROAD_COLOR_YELLOW,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'yellow',
    centerType: 'white',
    summaryZh: '左右黃色外邊線 + 中央白色標線',
    descriptionZh: '靠左行駛。標準南非南部非洲關稅同盟規格：外側黃邊線＋中央白線。'
  },
  LS: {
    iso2: 'LS',
    nameZh: '賴索托',
    outerColor: ROAD_COLOR_YELLOW,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'yellow',
    centerType: 'white',
    summaryZh: '左右黃色外邊線 + 中央白色標線',
    descriptionZh: '靠左行駛。高山峻嶺公路，外側為黃色邊線，中央為白色標線。'
  },
  IL: {
    iso2: 'IL',
    nameZh: '以色列',
    outerColor: ROAD_COLOR_YELLOW,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'yellow',
    centerType: 'white',
    summaryZh: '左右黃色外邊線 + 中央白色虛線/雙白實線',
    descriptionZh: '高速公路與城際幹道右側外邊線常漆為黃色實線，中央為白色標線。'
  },

  // 3. White Outer + White Center (全白標線：歐洲普遍、智利、阿根廷、俄羅斯等)
  GB: {
    iso2: 'GB',
    nameZh: '英國',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白色虛線 (靠左行駛)',
    descriptionZh: '靠左行駛。道路標線全為白線（市區路緣黃線代表禁止停車）。'
  },
  IE: {
    iso2: 'IE',
    nameZh: '愛爾蘭',
    outerColor: ROAD_COLOR_YELLOW,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'yellow',
    centerType: 'white',
    summaryZh: '左右黃色外側虛線 + 中央白色標線 (靠左行駛)',
    descriptionZh: '靠左行駛。外側路肩線為黃色虛線（Broken yellow line），中央車道線為白色！'
  },
  FR: {
    iso2: 'FR',
    nameZh: '法國',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白色長虛線/實線',
    descriptionZh: '歐洲標準全白線，中央虛線為經典法式長虛線（線長 3m、間隔 10m）。'
  },
  DE: {
    iso2: 'DE',
    nameZh: '德國',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右粗實白線 + 中央白虛線',
    descriptionZh: '高品質全白線，無限速高速 (Autobahn) 外側帶有厚重白實線。'
  },
  ES: {
    iso2: 'ES',
    nameZh: '西班牙',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央雙白實線/白虛線',
    descriptionZh: '全白線，禁超車路段為雙白實線（絕無黃線）。'
  },
  IT: {
    iso2: 'IT',
    nameZh: '義大利',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央雙白實線/白虛線',
    descriptionZh: '全白線，禁止超車為連續白實線或雙白線。'
  },
  PT: {
    iso2: 'PT',
    nameZh: '葡萄牙',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央雙白實線/白虛線',
    descriptionZh: '全白標線，中央禁止超車為雙白實線。'
  },
  SE: {
    iso2: 'SE',
    nameZh: '瑞典',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 (密集短虛線) + 中央白長虛線',
    descriptionZh: '【秒殺標線】外側邊線通常由極度密集的「短白虛線 (1m線/1m空)」組成！'
  },
  FI: {
    iso2: 'FI',
    nameZh: '芬蘭',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白色實線/虛線 + 中央白色虛線/黃線已淘汰',
    descriptionZh: '全白標線，早期中央黃線自 2020 年新法規起已全數改為全白標線。'
  },
  IS: {
    iso2: 'IS',
    nameZh: '冰島',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 (兩側黃色警示桿) + 中央白虛線',
    descriptionZh: '道路全白線，兩側路邊每隔固定距離立有黃色反光柱。'
  },
  DK: {
    iso2: 'DK',
    nameZh: '丹麥',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線/實線',
    descriptionZh: '標準歐洲全白線，自行車道邊線常有短白虛線。'
  },
  NL: {
    iso2: 'NL',
    nameZh: '荷蘭',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央雙白線 (中央常夾綠色實心塗漆)',
    descriptionZh: '【秒殺特徵】省道 100km/h 道路中央常有「雙白實線中間塗滿綠色樹脂」！'
  },
  BE: {
    iso2: 'BE',
    nameZh: '比利時',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線',
    descriptionZh: '歐洲標準全白線，高速公路路燈密集。'
  },
  CH: {
    iso2: 'CH',
    nameZh: '瑞士',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白實線/短虛線',
    descriptionZh: '歐洲標準全白線，黃色通常僅用於行人穿越道（斑馬線為亮黃色！）。'
  },
  AT: {
    iso2: 'AT',
    nameZh: '奧地利',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線/實線',
    descriptionZh: '全白標線，阿爾卑斯山道護欄邊有黑白反光桿。'
  },
  PL: {
    iso2: 'PL',
    nameZh: '波蘭',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線/雙白實線',
    descriptionZh: '全白標線，禁止超車為雙白實線。'
  },
  CZ: {
    iso2: 'CZ',
    nameZh: '捷克',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線/雙白實線',
    descriptionZh: '全白標線，中線白虛線間距勻稱。'
  },
  SK: {
    iso2: 'SK',
    nameZh: '斯洛伐克',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線',
    descriptionZh: '標準歐洲全白標線。'
  },
  HU: {
    iso2: 'HU',
    nameZh: '匈牙利',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線',
    descriptionZh: '全白標線，路邊常見紅頂白色反光柱。'
  },
  RO: {
    iso2: 'RO',
    nameZh: '羅馬尼亞',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線/雙白線',
    descriptionZh: '全白標線，路緣常有無鋪裝或水泥側溝。'
  },
  BG: {
    iso2: 'BG',
    nameZh: '保加利亞',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線',
    descriptionZh: '全白標線。'
  },
  GR: {
    iso2: 'GR',
    nameZh: '希臘',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央雙白實線/白虛線',
    descriptionZh: '全白標線，海島與山區彎道常有雙白實線。'
  },
  TR: {
    iso2: 'TR',
    nameZh: '土耳其',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線/雙白實線',
    descriptionZh: '標準全白標線，路面品質普遍極新且寬敞。'
  },
  RU: {
    iso2: 'RU',
    nameZh: '俄羅斯',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央雙白實線/白虛線 (極罕見黃)',
    descriptionZh: '歐洲至西伯利亞幹道中央均為白線（禁超車雙白實線），偶見實驗性黃色中線。'
  },
  UA: {
    iso2: 'UA',
    nameZh: '烏克蘭',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線/雙白實線',
    descriptionZh: '全白標線。'
  },
  EE: {
    iso2: 'EE',
    nameZh: '愛沙尼亞',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線',
    descriptionZh: '全白標線，路況良好平整。'
  },
  LV: {
    iso2: 'LV',
    nameZh: '拉脫維亞',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線',
    descriptionZh: '全白標線，森林幹道路面筆直。'
  },
  LT: {
    iso2: 'LT',
    nameZh: '立陶宛',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白虛線',
    descriptionZh: '全白標線，高速公路標牌為藍底或綠底。'
  },
  CL: {
    iso2: 'CL',
    nameZh: '智利',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '【南美特例】左右白邊線 + 中央白色虛線/實線 (無黃線！)',
    descriptionZh: '【南美秒殺】與巴西/秘魯/哥倫比亞的雙黃線不同，智利道路標線為「全白標線」，完全無黃色中線！'
  },
  AR: {
    iso2: 'AR',
    nameZh: '阿根廷',
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '【南美特例】左右白邊線 + 中央白線 (國道中線普遍為全白！)',
    descriptionZh: '【南美秒殺】絕大多數國道為全白標線（中央白色長虛線或雙白實線），僅極少數省級公路塗黃，是區分巴西與秘魯的重要特徵！'
  }
};

/**
 * Returns road marking color spec for a country, defaulting to standard white/white
 */
export function getCountryRoadMarking(iso2: string): CountryRoadMarking {
  const upper = iso2.toUpperCase();
  if (ROAD_MARKINGS[upper]) {
    return ROAD_MARKINGS[upper];
  }
  // Default fallback for streetview countries
  return {
    iso2: upper,
    nameZh: upper,
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白線',
    descriptionZh: '標準全白道路標線。'
  };
}
