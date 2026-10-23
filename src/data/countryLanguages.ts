/**
 * Worldwide Country Languages, Scripts & Alphabet Nuances
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
    geoGuessrMetaZh: '【代表字母】擁有帶兩點的「ї」、單點的「і」、帶橫線的「є」與帶頂勾的「ґ」；烏克蘭語不使用俄語的「ы」、「э」、「ъ」。'
  },
  RU: {
    iso2: 'RU',
    nameZh: '俄羅斯',
    languages: ['俄語 (Russian)'],
    scriptFamily: '西里爾字母 (Cyrillic)',
    nativeSample: 'Россия',
    distinctiveLetters: ['ы', 'э', 'ъ'],
    geoGuessrMetaZh: '【代表字母】常用「ы」、「э」與硬音符號「ъ」，不使用烏克蘭語的「і」、「ї」、「є」。全俄路標字型規範統一，採用藍底白字國道大路牌。'
  },
  BG: {
    iso2: 'BG',
    nameZh: '保加利亞',
    languages: ['保加利亞語 (Bulgarian)'],
    scriptFamily: '西里爾字母 (Cyrillic)',
    nativeSample: 'България',
    distinctiveLetters: ['ъ'],
    geoGuessrMetaZh: '西里爾字母的發源地，也是歐盟唯一的西里爾字母國（兼具歐盟車牌藍條與西里爾路標）。頻繁使用「ъ」（如 България、град），無「ы」、「э」。'
  },
  RS: {
    iso2: 'RS',
    nameZh: '塞爾維亞',
    languages: ['塞爾維亞語 (Serbian)'],
    scriptFamily: '西里爾字母與拉丁字母雙軌並行',
    nativeSample: 'Србија / Srbija',
    distinctiveLetters: ['ђ', 'љ', 'њ', 'ћ', 'џ', 'đ', 'ž', 'ć', 'č', 'š'],
    geoGuessrMetaZh: '【雙軌並行】官方路牌常同時並列西里爾文與拉丁文。西里爾特有字母包含「ђ」、「љ」、「њ」、「ћ」、「џ」；拉丁字母則帶有「đ」、「ć」、「č」、「ž」。'
  },
  MK: {
    iso2: 'MK',
    nameZh: '北馬其頓',
    languages: ['馬其頓語 (Macedonian)', '阿爾巴尼亞語'],
    scriptFamily: '西里爾字母 (Cyrillic)',
    nativeSample: 'Македонија',
    distinctiveLetters: ['ѓ', 'ѕ', 'ќ', 'џ'],
    geoGuessrMetaZh: '【主要特徵】擁有帶尖音符號的「ѓ」、「ќ」，以及獨特的「ѕ」（發 dz 音，外觀如拉丁字母 S），是西里爾字母體系中少見使用「S」形字母的語言。'
  },
  MN: {
    iso2: 'MN',
    nameZh: '蒙古',
    languages: ['蒙古語 (Mongolian)'],
    scriptFamily: '蒙古西里爾字母 (Mongolian Cyrillic)',
    nativeSample: 'Монгол Улс',
    distinctiveLetters: ['Ө', 'Ү'],
    geoGuessrMetaZh: '【主要特徵】西里爾字母帶有兩個特有母音「Ө」（帶橫線的 O）與「Ү」（直筆 V 形字母），為蒙古語書寫的重要標誌。'
  },
  GR: {
    iso2: 'GR',
    nameZh: '希臘',
    languages: ['希臘語 (Greek)'],
    scriptFamily: '希臘字母 (Greek Alphabet)',
    nativeSample: 'Ελλάδα',
    distinctiveLetters: ['Ω', 'Ψ', 'Δ', 'Σ', 'λ', 'ξ', 'θ', 'φ'],
    geoGuessrMetaZh: '歐洲歷史悠久的希臘文字母體系，常見幾何大寫字母如「Δ」、「Σ」、「Ω」、「Ψ」。路牌通常以希臘字母與黃底拉丁轉寫並列。'
  },

  // Southeast Asia
  TH: {
    iso2: 'TH',
    nameZh: '泰國',
    languages: ['泰語 (Thai)'],
    scriptFamily: '泰文字母 (Thai Script)',
    nativeSample: 'ประเทศไทย',
    distinctiveLetters: ['ก', 'ข', 'ด', 'ม', 'ร'],
    geoGuessrMetaZh: '【字形特徵】字母起筆處帶有明顯的「小圓圈圓環（Little Loops）」與縱向垂直直線（如 ก, ข, ด, ม），與高棉文相比線條較為筆直簡潔。'
  },
  KH: {
    iso2: 'KH',
    nameZh: '柬埔寨',
    languages: ['高棉語 (Khmer)'],
    scriptFamily: '高棉字母 (Khmer Script)',
    nativeSample: 'ព្រះរាជាណាចក្រកម្ពុជា',
    distinctiveLetters: ['ក', 'ខ', 'គ', 'ង'],
    geoGuessrMetaZh: '【字形特徵】高棉文字形帶有繁複捲曲的羽冠折角與下標疊字結構（如 ព្រ, ក, ្រ），筆劃密度高於泰文與寮文。'
  },
  LA: {
    iso2: 'LA',
    nameZh: '寮國',
    languages: ['寮語 (Lao)'],
    scriptFamily: '寮文字母 (Lao Script)',
    nativeSample: 'ປະເທດລາວ',
    distinctiveLetters: ['ກ', 'ຂ', 'ຄ', 'ງ'],
    geoGuessrMetaZh: '【字形特徵】與泰文同源，但整體筆劃更為柔和圓滑，較少泰文的銳利直角折痕（如 ລ, ດ, ປ），且寮國採靠右行駛制度。'
  },

  // East Asia
  TW: {
    iso2: 'TW',
    nameZh: '台灣',
    languages: ['繁體中文 (Traditional Chinese)', '台灣台語', '客語', '原住民族語'],
    scriptFamily: '繁體漢字 (Traditional Chinese Characters)',
    nativeSample: '臺灣 · 台灣',
    distinctiveLetters: ['國', '邊', '臺', '觀', '發'],
    geoGuessrMetaZh: '街道招牌與路標全面採用繁體正體漢字，搭配道路雙黃線、電線桿黃黑防撞斜紋與高密度的便利商店景觀。'
  },
  JP: {
    iso2: 'JP',
    nameZh: '日本',
    languages: ['日語 (Japanese)'],
    scriptFamily: '漢字、平假名、片假名三合一 (Kanji, Hiragana & Katakana)',
    nativeSample: '日本 · にほん · ニホン',
    distinctiveLetters: ['の', 'は', 'を', 'カ', 'ス', 'ル'],
    geoGuessrMetaZh: '由漢字搭配圓弧流暢的「平假名（の, は, を, す）」與方折俐落的「片假名（ア, カ, ロ, ス）」混合書寫。'
  },
  KR: {
    iso2: 'KR',
    nameZh: '南韓',
    languages: ['韓語 (Korean)'],
    scriptFamily: '諺文方塊字 (Hangul)',
    nativeSample: '대한민국',
    distinctiveLetters: ['ㅇ', 'ㄱ', 'ㄴ', 'ㄷ', 'ㅂ', 'ㅎ'],
    geoGuessrMetaZh: '【字形特徵】採音素組合成方塊字的諺文結構，字形中頻繁出現正圓形「ㅇ」與水平垂直直角筆劃（ㄱ, ㄴ, ㅂ, ㄹ）。'
  },

  // Middle East & West Asia
  IL: {
    iso2: 'IL',
    nameZh: '以色列',
    languages: ['希伯來語 (Hebrew)', '阿拉伯語', '英語'],
    scriptFamily: '希伯來字母 (Hebrew Script)',
    nativeSample: 'ישראל',
    distinctiveLetters: ['א', 'ב', 'ג', 'ש', 'ת'],
    geoGuessrMetaZh: '【字形特徵】方塊狀希伯來字母（如 ש, מ, ל, א），由右至左書寫。標準公路路標通常為「希伯來文＋阿拉伯文＋英文」三語並列。'
  },
  AE: {
    iso2: 'AE',
    nameZh: '阿拉伯聯合大公國',
    languages: ['阿拉伯語 (Arabic)', '英語 (English)'],
    scriptFamily: '阿拉伯字母 (Arabic Script)',
    nativeSample: 'الإمارات العربية المتحدة',
    distinctiveLetters: ['ا', 'ل', 'ع', 'ر', 'ب'],
    geoGuessrMetaZh: '流線連寫的阿拉伯字母，由右至左書寫；公路指示牌多採阿拉伯文與英文上下雙語並陳。'
  },

  // Central Europe & Nordics
  PL: {
    iso2: 'PL',
    nameZh: '波蘭',
    languages: ['波蘭語 (Polish)'],
    scriptFamily: '拉丁字母 (特殊波蘭變音符號)',
    nativeSample: 'Polska',
    distinctiveLetters: ['ł', 'ą', 'ę', 'ć', 'ń', 'ś', 'ź', 'ż', 'sz', 'cz', 'rz', 'dz'],
    geoGuessrMetaZh: '【代表字母】擁有帶斜劃的「ł」、鼻音字母「ą」「ę」，以及高頻率複合子音「sz」「cz」「rz」「wz」；本土詞彙極少使用拉丁字母 V、Q、X。'
  },
  CZ: {
    iso2: 'CZ',
    nameZh: '捷克',
    languages: ['捷克語 (Czech)'],
    scriptFamily: '拉丁字母 (帶抑揚符 Háček)',
    nativeSample: 'Česká republika',
    distinctiveLetters: ['ř', 'ů', 'č', 'š', 'ž', 'ď', 'ť', 'ň'],
    geoGuessrMetaZh: '【代表字母】最具代表性的字母為帶抑揚符的「ř」（擦顫音）以及上方帶小圓圈的長母音「ů」。'
  },
  HU: {
    iso2: 'HU',
    nameZh: '匈牙利',
    languages: ['匈牙利語 (Hungarian)'],
    scriptFamily: '烏拉爾語系拉丁字母 (帶雙銳音符)',
    nativeSample: 'Magyarország',
    distinctiveLetters: ['ő', 'ű', 'sz', 'gy', 'ty', 'ny', 'cs'],
    geoGuessrMetaZh: '【代表字母】擁有獨特的「雙尖銳音符（Double Acute）」長母音字母「ő」與「ű」，路名牌普遍帶有「út」（路）或「utca」（街）。'
  },
  RO: {
    iso2: 'RO',
    nameZh: '羅馬尼亞',
    languages: ['羅馬尼亞語 (Romanian)'],
    scriptFamily: '羅曼語族拉丁字母 (帶逗號符號)',
    nativeSample: 'România',
    distinctiveLetters: ['ș', 'ț', 'ă', 'î', 'â'],
    geoGuessrMetaZh: '【代表字母】字母底部帶有下逗號的「ș」與「ț」，以及帶短音符與揚抑符的「ă」「î」「â」，為東歐具代表性的羅曼語族語言。'
  },
  IS: {
    iso2: 'IS',
    nameZh: '冰島',
    languages: ['冰島語 (Icelandic)'],
    scriptFamily: '古諾斯語拉丁字母',
    nativeSample: 'Ísland',
    distinctiveLetters: ['ð', 'þ', 'æ', 'ö'],
    geoGuessrMetaZh: '【代表字母】保留古諾斯語字母：橫劃「ð」(Eth) 與「þ」(Thorn)，展現深厚的北歐古語傳統。'
  },
  NO: {
    iso2: 'NO',
    nameZh: '挪威',
    languages: ['挪威語 (Norwegian)'],
    scriptFamily: '北日耳曼拉丁字母',
    nativeSample: 'Norge / Noreg',
    distinctiveLetters: ['æ', 'ø', 'å'],
    geoGuessrMetaZh: '使用「æ」、「ø」、「å」三個北歐母音字母（不使用瑞典與芬蘭的「ä」、「ö」）。'
  },
  SE: {
    iso2: 'SE',
    nameZh: '瑞典',
    languages: ['瑞典語 (Swedish)'],
    scriptFamily: '日耳曼拉丁字母',
    nativeSample: 'Sverige',
    distinctiveLetters: ['å', 'ä', 'ö'],
    geoGuessrMetaZh: '使用「å」、「ä」、「ö」三個母音字母（與丹麥及挪威使用的 æ、ø 不同），路牌常採淡黃底配色。'
  },
  FI: {
    iso2: 'FI',
    nameZh: '芬蘭',
    languages: ['芬蘭語 (Finnish)', '瑞典語'],
    scriptFamily: '芬蘭-烏戈爾語系拉丁字母',
    nativeSample: 'Suomi',
    distinctiveLetters: ['ää', 'öö', 'kk', 'tt', 'pp'],
    geoGuessrMetaZh: '【語音拼寫】屬於烏拉爾語系，詞彙中常見長母音與雙子音連寫（如 -ää, -öö, -kk-, -tt-，例如 tie, katu, kauppa）。'
  },
  TR: {
    iso2: 'TR',
    nameZh: '土耳其',
    languages: ['土耳其語 (Turkish)'],
    scriptFamily: '土耳其拉丁字母',
    nativeSample: 'Türkiye',
    distinctiveLetters: ['ı', 'İ', 'ğ', 'ş', 'ç', 'ö', 'ü'],
    geoGuessrMetaZh: '【代表字母】嚴格區分「無點的小寫 ı」與「帶點的大寫 İ」，並包含軟 g「ğ」與「ş」「ç」；道路停車標誌寫作「DUR」。'
  },
  VN: {
    iso2: 'VN',
    nameZh: '越南',
    languages: ['越南語 (Vietnamese)'],
    scriptFamily: '國語字拉丁字母 (Quốc ngữ)',
    nativeSample: 'Việt Nam',
    distinctiveLetters: ['đ', 'ơ', 'ư', 'ả', 'ạ', 'ắ', 'ế', 'ồ'],
    geoGuessrMetaZh: '【聲調符號】拉丁字母結合豐富的六聲調號與母音變音符號（如 đ, ơ, ư, ă, ê, ô），形成極具特色的拉丁化書寫系統。'
  }
};

export function getCountryLanguageMeta(iso2: string): CountryLanguageMeta | null {
  if (!iso2) return null;
  return COUNTRY_LANGUAGE_METAS[iso2.toUpperCase()] || null;
}
