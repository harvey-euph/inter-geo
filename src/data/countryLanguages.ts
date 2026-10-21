/**
 * Worldwide Country Languages, Scripts & GeoGuessr Alphabet Nuances
 */

export interface CountryLanguageMeta {
  iso2: string;
  nameZh: string;
  languages: string[];
  scriptFamily: string;
  nativeSample: string;
  distinctiveLetters?: string[];
  geoGuessrMetaZh: string;
}

export const COUNTRY_LANGUAGE_METAS: Record<string, CountryLanguageMeta> = {
  // Eastern Europe / Cyrillic
  UA: {
    iso2: 'UA',
    nameZh: '烏克蘭',
    languages: ['烏克蘭語 (Ukrainian)'],
    scriptFamily: '西里爾字母 (Cyrillic)',
    nativeSample: 'Україна',
    distinctiveLetters: ['і', 'ї', 'є', 'ґ'],
    geoGuessrMetaZh: '【秒殺字母】看到帶兩點的「ї」、單點的「і」、帶橫線的「є」或帶頂勾的「ґ」，100% 為烏克蘭語！烏克蘭語絕不使用俄語的「ы」、「э」、「ъ」！'
  },
  RU: {
    iso2: 'RU',
    nameZh: '俄羅斯',
    languages: ['俄語 (Russian)'],
    scriptFamily: '西里爾字母 (Cyrillic)',
    nativeSample: 'Россия',
    distinctiveLetters: ['ы', 'э', 'ъ'],
    geoGuessrMetaZh: '【秒殺字母】常用「ы」、「э」與硬音符號「ъ」。絕不使用烏克蘭語的「і」、「ї」、「є」！全俄路標字型規範統一，藍底白字國道大路牌。'
  },
  BG: {
    iso2: 'BG',
    nameZh: '保加利亞',
    languages: ['保加利亞語 (Bulgarian)'],
    scriptFamily: '西里爾字母 (Cyrillic)',
    nativeSample: 'България',
    distinctiveLetters: ['ъ'],
    geoGuessrMetaZh: '西里爾字母的發源地。歐盟唯一的西里爾字母國（帶歐盟車牌藍條＋西里爾路標！）。極度頻繁使用「ъ」（如 България、град），絕無「ы」、「э」。'
  },
  RS: {
    iso2: 'RS',
    nameZh: '塞爾維亞',
    languages: ['塞爾維亞語 (Serbian)'],
    scriptFamily: '西里爾字母與拉丁字母雙軌並行',
    nativeSample: 'Србија / Srbija',
    distinctiveLetters: ['ђ', 'љ', 'њ', 'ћ', 'џ', 'đ', 'ž', 'ć', 'č', 'š'],
    geoGuessrMetaZh: '【雙軌並行】官方路牌常同時並列西里爾文與拉丁文！西里爾特有字母「ђ」、「љ」、「њ」、「ћ」、「џ」；拉丁字母則帶有「đ」、「ć」、「č」、「ž」。'
  },
  MK: {
    iso2: 'MK',
    nameZh: '北馬其頓',
    languages: ['馬其頓語 (Macedonian)', '阿爾巴尼亞語'],
    scriptFamily: '西里爾字母 (Cyrillic)',
    nativeSample: 'Македонија',
    distinctiveLetters: ['ѓ', 'ѕ', 'ќ', 'џ'],
    geoGuessrMetaZh: '【秒殺特徵】帶尖音符號的「ѓ」、「ќ」，以及獨特的「ѕ」（發dz音，外觀極似拉丁字母 S）！看到西里爾文裡夾雜「S」即為北馬其頓。'
  },
  MN: {
    iso2: 'MN',
    nameZh: '蒙古',
    languages: ['蒙古語 (Mongolian)'],
    scriptFamily: '蒙古西里爾字母 (Mongolian Cyrillic)',
    nativeSample: 'Монгол Улс',
    distinctiveLetters: ['Ө', 'Ү'],
    geoGuessrMetaZh: '【秒殺特徵】西里爾字母帶有兩個特有母音「Ө」（帶橫線的O）與「Ү」（外觀似拉丁V的直筆字母）！配合車頂露出的金屬行李橫桿與帳篷 (Tent/Roof rack)，100% 蒙古！'
  },
  GR: {
    iso2: 'GR',
    nameZh: '希臘',
    languages: ['希臘語 (Greek)'],
    scriptFamily: '希臘字母 (Greek Alphabet)',
    nativeSample: 'Ελλάδα',
    distinctiveLetters: ['Ω', 'Ψ', 'Δ', 'Σ', 'λ', 'ξ', 'θ', 'φ'],
    geoGuessrMetaZh: '全球唯一的官方希臘文字母國家！幾何大寫標誌如「Δ」、「Σ」、「Ω」、「Ψ」。路牌常為希臘字母與黃色底拉丁轉寫並列。'
  },

  // Southeast Asia
  TH: {
    iso2: 'TH',
    nameZh: '泰國',
    languages: ['泰語 (Thai)'],
    scriptFamily: '泰文字母 (Thai Script)',
    nativeSample: 'ประเทศไทย',
    distinctiveLetters: ['ก', 'ข', 'ด', 'ม', 'ร'],
    geoGuessrMetaZh: '【秒殺特徵】字母頭部帶有顯著的「小圓圈圓環（Little Loops）」與縱向垂直直線（如 ก, ข, ด, ม）。靠左行駛！與柬埔寨文相比線條筆直簡潔，無高低鋸齒懸垂。'
  },
  KH: {
    iso2: 'KH',
    nameZh: '柬埔寨',
    languages: ['高棉語 (Khmer)'],
    scriptFamily: '高棉字母 (Khmer Script)',
    nativeSample: 'ព្រះរាជាណាចក្រកម្ពុជា',
    distinctiveLetters: ['ក', 'ខ', 'គ', 'ង'],
    geoGuessrMetaZh: '【秒殺特徵】高棉文字形極其「繁複捲曲、帶羽冠梳齒與波浪下沉弧」（如 ព្រ, ក, ្រ）。比泰文更為繁複密集，常見紅色高腳屋、木柱高架吊腳樓與啤酒遮陽傘。'
  },
  LA: {
    iso2: 'LA',
    nameZh: '寮國',
    languages: ['寮語 (Lao)'],
    scriptFamily: '寮文字母 (Lao Script)',
    nativeSample: 'ປະເທດລາວ',
    distinctiveLetters: ['ກ', 'ຂ', 'ຄ', 'ງ'],
    geoGuessrMetaZh: '【秒殺特徵】外形近泰文，但「整體筆劃柔和圓滑、無泰文的銳利直角折痕」（如 ລ, ດ, ປ）。靠右行駛（與泰國靠左相反！）。'
  },

  // East Asia
  TW: {
    iso2: 'TW',
    nameZh: '台灣',
    languages: ['繁體中文 (Traditional Chinese)', '台灣台語', '客語', '原住民族語'],
    scriptFamily: '繁體漢字 (Traditional Chinese Characters)',
    nativeSample: '臺灣 · 台灣',
    distinctiveLetters: ['國', '邊', '臺', '觀', '發'],
    geoGuessrMetaZh: '街道招牌一律使用「繁體正體漢字（無簡體字）」，配合全黑白相間斜紋電線桿黃黑反光漆、雙黃線、超密集 7-Eleven 與全家超商。'
  },
  JP: {
    iso2: 'JP',
    nameZh: '日本',
    languages: ['日語 (Japanese)'],
    scriptFamily: '漢字、平假名、片假名三合一 (Kanji, Hiragana & Katakana)',
    nativeSample: '日本 · にほん · ニホン',
    distinctiveLetters: ['の', 'は', 'を', 'カ', 'ス', 'ル'],
    geoGuessrMetaZh: '漢字夾雜柔和圓弧之「平假名（の, は, を, す）」與幾何直角之「片假名（ア, カ, ロ, ス）」。靠左行駛，黃色輕型車牌 (Kei car) 與低鏡頭 Low Cam。'
  },
  KR: {
    iso2: 'KR',
    nameZh: '南韓',
    languages: ['韓語 (Korean)'],
    scriptFamily: '諺文方塊字 (Hangul)',
    nativeSample: '대한민국',
    distinctiveLetters: ['ㅇ', 'ㄱ', 'ㄴ', 'ㄷ', 'ㅂ', 'ㅎ'],
    geoGuessrMetaZh: '【秒殺字形】幾何積木方塊結構！滿大街充滿「正圓形圈圈（ㅇ）」與平直線角（ㄱ, ㄴ, ㅂ, ㄹ）。世界唯一的方塊拼音文字，靠右行駛。'
  },

  // Middle East & West Asia
  IL: {
    iso2: 'IL',
    nameZh: '以色列',
    languages: ['希伯來語 (Hebrew)', '阿拉伯語', '英語'],
    scriptFamily: '希伯來字母 (Hebrew Script)',
    nativeSample: 'ישראל',
    distinctiveLetters: ['א', 'ב', 'ג', 'ש', 'ת'],
    geoGuessrMetaZh: '【秒殺字形】方塊狀希伯來字母（Square Script，如 ש, מ, ל, א），由右至左書寫。標準路標必為「希伯來文＋阿拉伯文＋英文」三語並排！黃色反光車牌。'
  },
  AE: {
    iso2: 'AE',
    nameZh: '阿拉伯聯合大公國',
    languages: ['阿拉伯語 (Arabic)', '英語 (English)'],
    scriptFamily: '阿拉伯字母 (Arabic Script)',
    nativeSample: 'الإمارات العربية المتحدة',
    distinctiveLetters: ['ا', 'ل', 'ع', 'ر', 'ب'],
    geoGuessrMetaZh: '流線連寫阿拉伯草書，由右至左書寫；大公國路標一律阿拉伯文在上、英文在下，高架公路與極現代化摩天樓。'
  },

  // Central Europe & Nordics
  PL: {
    iso2: 'PL',
    nameZh: '波蘭',
    languages: ['波蘭語 (Polish)'],
    scriptFamily: '拉丁字母 (特殊波蘭變音符號)',
    nativeSample: 'Polska',
    distinctiveLetters: ['ł', 'ą', 'ę', 'ć', 'ń', 'ś', 'ź', 'ż', 'sz', 'cz', 'rz', 'dz'],
    geoGuessrMetaZh: '【秒殺字母】帶斜劃的「ł」（發w音）、尾巴鼻音「ą」「ę」，極高頻率之子音群「sz」「cz」「rz」「wz」；波蘭語『絕不使用拉丁字母 V、Q、X』！路邊電線桿多階梯鏤空洞洞桿。'
  },
  CZ: {
    iso2: 'CZ',
    nameZh: '捷克',
    languages: ['捷克語 (Czech)'],
    scriptFamily: '拉丁字母 (帶抑揚符 Háček)',
    nativeSample: 'Česká republika',
    distinctiveLetters: ['ř', 'ů', 'č', 'š', 'ž', 'ď', 'ť', 'ň'],
    geoGuessrMetaZh: '【秒殺字母】全球獨有的帶抑揚符的「ř」（發擦顫音 r+zh），以及帶圓圈的「ů」！'
  },
  HU: {
    iso2: 'HU',
    nameZh: '匈牙利',
    languages: ['匈牙利語 (Hungarian)'],
    scriptFamily: '烏拉爾語系拉丁字母 (帶雙銳音符)',
    nativeSample: 'Magyarország',
    distinctiveLetters: ['ő', 'ű', 'sz', 'gy', 'ty', 'ny', 'cs'],
    geoGuessrMetaZh: '【秒殺字母】世界唯一使用「雙尖銳音符（Double Acute）」的國家：「ő」與「ű」！街景路名必帶「út」（路）或「utca」（街）。'
  },
  RO: {
    iso2: 'RO',
    nameZh: '羅馬尼亞',
    languages: ['羅馬尼亞語 (Romanian)'],
    scriptFamily: '羅曼語族拉丁字母 (帶逗號符號)',
    nativeSample: 'România',
    distinctiveLetters: ['ș', 'ț', 'ă', 'î', 'â'],
    geoGuessrMetaZh: '【秒殺字母】字母底部帶有下逗號之「ș」（發sh）與「ț」（發ts），以及「ă」「î」「â」；東歐唯一的拉丁語系國家，房屋外常有精緻鐵皮雕花圍牆。'
  },
  IS: {
    iso2: 'IS',
    nameZh: '冰島',
    languages: ['冰島語 (Icelandic)'],
    scriptFamily: '古諾斯語拉丁字母',
    nativeSample: 'Ísland',
    distinctiveLetters: ['ð', 'þ', 'æ', 'ö'],
    geoGuessrMetaZh: '【秒殺字母】保留古維京字母：橫劃「ð」(Eth) 與刺字母「þ」(Thorn)！極端荒涼苔原熔岩火山地貌，黃色警示標牌為獨特「黃色三角形外紅框」。'
  },
  NO: {
    iso2: 'NO',
    nameZh: '挪威',
    languages: ['挪威語 (Norwegian)'],
    scriptFamily: '北日耳曼拉丁字母',
    nativeSample: 'Norge / Noreg',
    distinctiveLetters: ['æ', 'ø', 'å'],
    geoGuessrMetaZh: '使用「æ」與帶斜線的「ø」，絕無瑞典芬蘭的「ä」「ö」！道路標線秒殺：全歐罕見的「黃色路外邊線＋白色車道虛線」！商用車常掛綠色車牌。'
  },
  SE: {
    iso2: 'SE',
    nameZh: '瑞典',
    languages: ['瑞典語 (Swedish)'],
    scriptFamily: '日耳曼拉丁字母',
    nativeSample: 'Sverige',
    distinctiveLetters: ['å', 'ä', 'ö'],
    geoGuessrMetaZh: '使用「å」、「ä」、「ö」（與丹麥/挪威的 æ/ø 形成強烈對比）；路牌背景為獨特的淡乳黃色，紅色法倫木造房屋 (Falu red)。'
  },
  FI: {
    iso2: 'FI',
    nameZh: '芬蘭',
    languages: ['芬蘭語 (Finnish)', '瑞典語'],
    scriptFamily: '芬蘭-烏戈爾語系拉丁字母',
    nativeSample: 'Suomi',
    distinctiveLetters: ['ää', 'öö', 'kk', 'tt', 'pp'],
    geoGuessrMetaZh: '【秒殺語音】大量雙重疊母音與疊子音（如 -ää, -öö, -kk-, -tt-，如 tie, katu, kauppa）；路牌為醒目的亮黃色底黑字，無字母 B/C/F/G 開頭本土字。'
  },
  TR: {
    iso2: 'TR',
    nameZh: '土耳其',
    languages: ['土耳其語 (Turkish)'],
    scriptFamily: '土耳其拉丁字母',
    nativeSample: 'Türkiye',
    distinctiveLetters: ['ı', 'İ', 'ğ', 'ş', 'ç', 'ö', 'ü'],
    geoGuessrMetaZh: '【秒殺字母】區分「無點的小寫 ı」與「帶點的大寫 İ」，以及軟g「ğ」與「ş」「ç」；隨處可見土耳其國旗與紅色停車標誌「DUR」（非 STOP）。'
  },
  VN: {
    iso2: 'VN',
    nameZh: '越南',
    languages: ['越南語 (Vietnamese)'],
    scriptFamily: '國語字拉丁字母 (Quốc ngữ)',
    nativeSample: 'Việt Nam',
    distinctiveLetters: ['đ', 'ơ', 'ư', 'ả', 'ạ', 'ắ', 'ế', 'ồ'],
    geoGuessrMetaZh: '【秒殺聲調】帶有最密集複雜的聲調符號與角標母音（如 đ, ơ, ư, ă, ê, ô + 問號勾, 重音點, 波浪符）；窄長深間開間透天厝、戴斗笠的機車大軍。'
  }
};

export function getCountryLanguageMeta(iso2: string): CountryLanguageMeta | null {
  if (!iso2) return null;
  return COUNTRY_LANGUAGE_METAS[iso2.toUpperCase()] || null;
}
