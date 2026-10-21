/**
 * India State-Level Languages & Scripts Registry for GeoGuessr
 *
 * In GeoGuessr, Indian scripts are one of the most vital clues to narrow down
 * which state or union territory you are in.
 */

export interface IndiaStateLanguageInfo {
  code: string; // ISO 3166-2:IN code, e.g. "IN-MH"
  nameZh: string; // "馬哈拉施特拉邦"
  nameEn: string; // "Maharashtra"
  officialLanguages: string[]; // ["馬拉地語 (Marathi)"]
  primaryScript: string; // "天城文 (Devanagari)"
  scriptNativeSample: string; // "मराठी"
  sampleSentence?: string; // "महाराष्ट्र शासन" (Government of Maharashtra)
  scriptTipsZh: string; // GeoGuessr recognition features
  additionalLanguages?: string[];
  capitalZh: string;
}

export const INDIA_STATE_LANGUAGES: Record<string, IndiaStateLanguageInfo> = {
  // Western & Central
  'IN-MH': {
    code: 'IN-MH',
    nameZh: '馬哈拉施特拉邦',
    nameEn: 'Maharashtra',
    officialLanguages: ['馬拉地語 (Marathi)'],
    primaryScript: '天城文 (Devanagari)',
    scriptNativeSample: 'मराठी · महाराष्ट्र',
    sampleSentence: 'महाराष्ट्र शासन (Maharashtra Govt)',
    scriptTipsZh: '使用天城文（帶頂部水平通線），但帶有馬拉地語特有捲舌濁邊近音字母「ळ」(Lha)；街景看板常同時出現馬拉地文與英文。',
    capitalZh: '孟買 (Mumbai)'
  },
  'IN-GJ': {
    code: 'IN-GJ',
    nameZh: '古吉拉特邦',
    nameEn: 'Gujarat',
    officialLanguages: ['古吉拉特語 (Gujarati)'],
    primaryScript: '古吉拉特文 (Gujarati Script)',
    scriptNativeSample: 'ગુજરાતી · ગુજરાત',
    sampleSentence: 'ગુજરાત સરકાર (Gujarat Govt)',
    scriptTipsZh: '【秒殺特徵】字型結構極像天城文（印地語），但『完全沒有頂部的水平通線（No Shirorekha）』！筆劃上方全開口，看到像印地文卻無頂線 100% 鎖定古吉拉特邦！',
    capitalZh: '甘地訥格爾 (Gandhinagar)'
  },
  'IN-GA': {
    code: 'IN-GA',
    nameZh: '果阿邦',
    nameEn: 'Goa',
    officialLanguages: ['孔卡尼語 (Konkani)', '馬拉地語'],
    primaryScript: '天城文與拉丁字母 (Devanagari & Latin)',
    scriptNativeSample: 'कोंकणी · Konknni · गोंय',
    scriptTipsZh: '前葡萄牙殖民地。路名大量使用葡萄牙語「Rua」（街道）、「Praia」（海灘），許多天主教堂與歐式彩色別墅，路標普遍使用拉丁字母孔卡尼語及英文。',
    capitalZh: '帕納吉 (Panaji)'
  },
  'IN-MP': {
    code: 'IN-MP',
    nameZh: '中央邦',
    nameEn: 'Madhya Pradesh',
    officialLanguages: ['印地語 (Hindi)'],
    primaryScript: '天城文 (Devanagari)',
    scriptNativeSample: 'हिन्दी · मध्य प्रदेश',
    scriptTipsZh: '標準印地語核心印地語帶（Hindi Belt），天城文頂線貫穿，道路里程碑上半部常塗黃色/綠色。',
    capitalZh: '博帕爾 (Bhopal)'
  },
  'IN-CT': {
    code: 'IN-CT',
    nameZh: '恰蒂斯加爾邦',
    nameEn: 'Chhattisgarh',
    officialLanguages: ['恰蒂斯加爾語', '印地語 (Hindi)'],
    primaryScript: '天城文 (Devanagari)',
    scriptNativeSample: 'छत्तीसगढ़ी · हिन्दी',
    scriptTipsZh: '印地語天城文為主，森林茂密丘陵地形，部落文化豐富。',
    capitalZh: '賴普爾 (Raipur)'
  },

  // Southern India (Dravidian Scripts)
  'IN-TN': {
    code: 'IN-TN',
    nameZh: '坦米爾納德邦',
    nameEn: 'Tamil Nadu',
    officialLanguages: ['坦米爾語 (Tamil)'],
    primaryScript: '坦米爾文 (Tamil Script)',
    scriptNativeSample: 'தமிழ் · தமிழ்நாடு',
    sampleSentence: 'தமிழ்நாடு அரசு (Tamil Nadu Govt)',
    scriptTipsZh: '【秒殺特徵】文字線條方圓折角分明，無頂線，大量平底橫直折線（如 க, த, ட, ன, ற）。絕無泰盧固/卡納達語的頂部勾勾「✓」，形狀硬朗好認！',
    capitalZh: '清奈 (Chennai)'
  },
  'IN-KL': {
    code: 'IN-KL',
    nameZh: '喀拉拉邦',
    nameEn: 'Kerala',
    officialLanguages: ['馬拉雅拉姆語 (Malayalam)'],
    primaryScript: '馬拉雅拉姆文 (Malayalam Script)',
    scriptNativeSample: 'മലയാളം · കേരളം',
    sampleSentence: 'കേരള സർക്കാർ (Kerala Govt)',
    scriptTipsZh: '【秒殺特徵】全印度最圓潤「泡泡字」！幾無銳角與平直線，字型充滿圓弧雙圈（如 ക, ല, മ, യ, ഴ）。街景伴隨椰子樹、熱帶水鄉回水流域與共產黨鐮刀鐵錘旗幟！',
    capitalZh: '錫魯萬納塔普拉姆 (Thiruvananthapuram)'
  },
  'IN-KA': {
    code: 'IN-KA',
    nameZh: '卡納塔克邦',
    nameEn: 'Karnataka',
    officialLanguages: ['卡納達語 (Kannada)'],
    primaryScript: '卡納達文 (Kannada Script)',
    scriptNativeSample: 'ಕನ್ನಡ · ಕರ್ನಾಟಕ',
    sampleSentence: 'ಕರ್ನಾಟಕ ಸರ್ಕಾರ (Karnataka Govt)',
    scriptTipsZh: '【秒殺特徵】字母頂部帶有顯眼的「向上朝右勾勾 / 打勾記號（Tick mark ✓）」與圓形開口（如 ಕ, ಗ, ಚ, ತ）。與泰盧固文相似，但卡納達文環形更封閉且頂勾清晰。',
    capitalZh: '邦加羅爾 (Bengaluru)'
  },
  'IN-AP': {
    code: 'IN-AP',
    nameZh: '安得拉邦',
    nameEn: 'Andhra Pradesh',
    officialLanguages: ['泰盧固語 (Telugu)'],
    primaryScript: '泰盧固文 (Telugu Script)',
    scriptNativeSample: 'తెలుగు · ఆంధ్రప్రదేశ్',
    sampleSentence: 'ఆంధ్రప్రదేశ్ ప్రభుత్వం (AP Govt)',
    scriptTipsZh: '【秒殺特徵】字母頂端普遍帶有波浪狀「小勾記號（✓/V形頭）」（如 త, ప, క, ర），字體下身圓潤開闊；與卡納達文同源，但泰盧固文頂部開口更大且轉折弧度柔順。',
    capitalZh: '阿馬拉瓦蒂 (Amaravati)'
  },
  'IN-TG': {
    code: 'IN-TG',
    nameZh: '特倫甘納邦',
    nameEn: 'Telangana',
    officialLanguages: ['泰盧固語 (Telugu)', '烏爾都語 (Urdu)'],
    primaryScript: '泰盧固文與波斯-阿拉伯文 (Telugu & Urdu)',
    scriptNativeSample: 'తెలుగు · تلنگانہ',
    sampleSentence: 'తెలంగాణ ప్రభుత్వం (Telangana Govt)',
    scriptTipsZh: '首府海德拉巴是歷史伊斯蘭王國，街景招牌常為「泰盧固文 + 烏爾都文（阿拉伯草書） + 英文」三語並列，建築可見波斯風格拱門與清真寺尖塔。',
    capitalZh: '海德拉巴 (Hyderabad)'
  },

  // Eastern & Northeast
  'IN-WB': {
    code: 'IN-WB',
    nameZh: '西孟加拉邦',
    nameEn: 'West Bengal',
    officialLanguages: ['孟加拉語 (Bengali)'],
    primaryScript: '孟加拉文 (Bengali Script)',
    scriptNativeSample: 'বাংলা · পশ্চিমবঙ্গ',
    sampleSentence: 'পশ্চিমবঙ্গ সরকার (West Bengal Govt)',
    scriptTipsZh: '【秒殺特徵】帶頂部連續橫線，字型極富「三角形折角與懸垂感」（如 ব, র, ক, ম, ত）。招牌常有大三角字形；加爾各答街景有黃色計程車 (Ambassador Taxi) 與藍白相間路緣石！',
    capitalZh: '加爾各答 (Kolkata)'
  },
  'IN-AS': {
    code: 'IN-AS',
    nameZh: '阿薩姆邦',
    nameEn: 'Assam',
    officialLanguages: ['阿薩姆語 (Assamese)', '孟加拉語'],
    primaryScript: '阿薩姆文 (Assamese Script)',
    scriptNativeSample: 'অসমীয়া · অসম',
    sampleSentence: 'অসম চৰকাৰ (Govt of Assam)',
    scriptTipsZh: '【秒殺特徵】外觀極像孟加拉文，但擁有阿薩姆特有字母：帶斜線的「ৰ」(Ra) 以及「ৱ」(Wa)！孟加拉文無此兩字（孟加拉文為 র）。街景隨處可見一望無際的綠色茶園與竹編房屋。',
    capitalZh: '迪斯普爾 (Dispur)'
  },
  'IN-OR': {
    code: 'IN-OR',
    nameZh: '奧里薩邦',
    nameEn: 'Odisha',
    officialLanguages: ['奧里亞語 (Odia)'],
    primaryScript: '奧里亞文 (Odia Script)',
    scriptNativeSample: 'ଓଡ଼ିଆ · ଓଡ଼ିଶା',
    sampleSentence: 'ଓଡ଼ିଶା ସରକାର (Odisha Govt)',
    scriptTipsZh: '【秒殺特徵】「圓形陽傘字」！每一個字母頂部都頂著一個大大的「半圓弧蓋子 / 雨傘罩」（如 କ, ଗ, ଚ, ତ, ପ）。極為獨特，絕不可能與其他印度文字混淆！',
    capitalZh: '布巴內什瓦爾 (Bhubaneswar)'
  },
  'IN-BR': {
    code: 'IN-BR',
    nameZh: '比哈爾邦',
    nameEn: 'Bihar',
    officialLanguages: ['印地語 (Hindi)', '烏爾都語 (Urdu)', '邁蒂利語 (Maithili)'],
    primaryScript: '天城文 (Devanagari)',
    scriptNativeSample: 'हिन्दी · मैथिली · बिहार',
    scriptTipsZh: '天城文印地語為主。人口極其密集、農村三輪車與平原農田遍佈。',
    capitalZh: '巴特那 (Patna)'
  },
  'IN-JH': {
    code: 'IN-JH',
    nameZh: '賈坎德邦',
    nameEn: 'Jharkhand',
    officialLanguages: ['印地語 (Hindi)', '桑塔利語 (Santali)'],
    primaryScript: '天城文與奧奇基文 (Devanagari & Ol Chiki)',
    scriptNativeSample: 'हिन्दी · ᱥᱟᱱᱛᱟᱲᱤ · झारखंड',
    scriptTipsZh: '煤礦工業與山林高原區，天城文為主流，部落區偶見獨特的奧奇基文 (Ol Chiki ᱚᱞ ᱪᱤᱠᱤ)。',
    capitalZh: '蘭契 (Ranchi)'
  },
  'IN-SK': {
    code: 'IN-SK',
    nameZh: '錫金邦',
    nameEn: 'Sikkim',
    officialLanguages: ['尼泊爾語 (Nepali)', '錫金語 (Bhutia)', '雷布查語', '英文'],
    primaryScript: '天城文與藏文 (Devanagari & Tibetan)',
    scriptNativeSample: 'नेपाली · འབྲས་ལྗོངས། · सिक्किम',
    scriptTipsZh: '喜馬拉雅山高山陡坡，路標常見尼泊爾天城文與藏文懸掛，隨處可見藏傳佛教五彩經幡、佛塔。',
    capitalZh: '甘托克 (Gangtok)'
  },
  'IN-TR': {
    code: 'IN-TR',
    nameZh: '特里普拉邦',
    nameEn: 'Tripura',
    officialLanguages: ['孟加拉語 (Bengali)', '科克波羅克語 (Kokborok)'],
    primaryScript: '孟加拉文 (Bengali Script)',
    scriptNativeSample: 'বাংলা · ককবরক · ত্রিপুরা',
    scriptTipsZh: '文字與西孟加拉完全相同使用孟加拉文，丘陵竹林環繞孟加拉國。',
    capitalZh: '阿加爾塔拉 (Agartala)'
  },
  'IN-ML': {
    code: 'IN-ML',
    nameZh: '梅加拉亞邦',
    nameEn: 'Meghalaya',
    officialLanguages: ['英語 (English)', '卡西語 (Khasi)', '加羅語 (Garo)'],
    primaryScript: '拉丁字母 (Latin Alphabet)',
    scriptNativeSample: 'English · Khasi · Garo',
    scriptTipsZh: '【東北邦秒殺】全邦以基督教與英語為主流！招牌幾乎全為「英文與拉丁字母（羅馬化卡西語）」，高山雲霧林雨量冠絕全球（乞拉朋齊），房屋帶斜鐵皮屋頂。',
    capitalZh: '錫隆 (Shillong)'
  },
  'IN-NL': {
    code: 'IN-NL',
    nameZh: '那加蘭邦',
    nameEn: 'Nagaland',
    officialLanguages: ['英語 (English)'],
    primaryScript: '拉丁字母 (Latin Alphabet)',
    scriptNativeSample: 'English · Nagaland',
    scriptTipsZh: '唯一的官方語言為英語！所有路標、告示、商店看板均為純英語與拉丁字母，山地崇山峻嶺。',
    capitalZh: '科希馬 (Kohima)'
  },
  'IN-MZ': {
    code: 'IN-MZ',
    nameZh: '米佐拉姆邦',
    nameEn: 'Mizoram',
    officialLanguages: ['米佐語 (Mizo)', '英語 (English)'],
    primaryScript: '拉丁字母 (Latin Alphabet)',
    scriptNativeSample: 'Mizo ṭawng · English · Mizoram',
    scriptTipsZh: '使用帶有特殊音調字符的拉丁字母米佐語（如 ṭ, â, ê），滿街英文告示，高山竹屋梯田。',
    capitalZh: '艾藻爾 (Aizawl)'
  },
  'IN-MN': {
    code: 'IN-MN',
    nameZh: '曼尼普爾邦',
    nameEn: 'Manipur',
    officialLanguages: ['曼尼普爾語 (Meitei)'],
    primaryScript: '梅泰文與孟加拉文 (Meitei Mayek & Bengali)',
    scriptNativeSample: 'ꯃꯩꯇꯩꯂꯣꯟ · মনিপুরী',
    scriptTipsZh: '復興古代梅泰文 (Meitei Mayek ꯃꯩꯇꯩ)，與孟加拉文並用，山間盆地湖泊景觀。',
    capitalZh: '因帕爾 (Imphal)'
  },
  'IN-AR': {
    code: 'IN-AR',
    nameZh: '阿魯納恰爾邦',
    nameEn: 'Arunachal Pradesh',
    officialLanguages: ['英語 (English)'],
    primaryScript: '拉丁字母與天城文 (English & Devanagari)',
    scriptNativeSample: 'English · हिन्दी',
    scriptTipsZh: '印度東北最邊陲喜馬拉雅山區，官方語言為英語，邊境軍事檢查站多。',
    capitalZh: '伊塔那葛 (Itanagar)'
  },

  // Northern & Hindi Belt
  'IN-PB': {
    code: 'IN-PB',
    nameZh: '旁遮普邦',
    nameEn: 'Punjab',
    officialLanguages: ['旁遮普語 (Punjabi)'],
    primaryScript: '古木基文 (Gurmukhi Script)',
    scriptNativeSample: 'ਪੰਜਾਬੀ · ਪੰਜਾਬ',
    sampleSentence: 'ਪੰਜਾਬ ਸਰਕਾਰ (Punjab Govt)',
    scriptTipsZh: '【秒殺特徵】錫克教聖地！文字使用古木基文（帶頂線但線段平直粗壯，字母多為直角方形框如 ਕ, ਸ, ਤ, ਪ）。男子多包錫克頭巾 (Dastar) 並蓄長鬚，拖拉機與綠油油麥田遍布。',
    capitalZh: '昌迪加爾 (Chandigarh)'
  },
  'IN-HR': {
    code: 'IN-HR',
    nameZh: '哈里亞納邦',
    nameEn: 'Haryana',
    officialLanguages: ['印地語 (Hindi)', '旁遮普語'],
    primaryScript: '天城文 (Devanagari)',
    scriptNativeSample: 'हिन्दी · ਪੰਜਾਬੀ · हरियाणा',
    scriptTipsZh: '圍繞德里，農業繁榮平原，天城文為主，臨近旁遮普地區可見古木基文。',
    capitalZh: '昌迪加爾 (Chandigarh)'
  },
  'IN-RJ': {
    code: 'IN-RJ',
    nameZh: '拉賈斯坦邦',
    nameEn: 'Rajasthan',
    officialLanguages: ['印地語 (Hindi)', '拉賈斯坦語'],
    primaryScript: '天城文 (Devanagari)',
    scriptNativeSample: 'हिन्दी · राजस्थानी · राजस्थान',
    scriptTipsZh: '塔爾沙漠地貌、土黃色乾旱乾燥景觀、男子常見鮮艷紅色/黃色大頭巾 (Safas)、沙石城堡碉堡。',
    capitalZh: '齋浦爾 (Jaipur)'
  },
  'IN-UP': {
    code: 'IN-UP',
    nameZh: '北方邦',
    nameEn: 'Uttar Pradesh',
    officialLanguages: ['印地語 (Hindi)', '烏爾都語 (Urdu)'],
    primaryScript: '天城文與波斯-阿拉伯文 (Devanagari & Urdu)',
    scriptNativeSample: 'हिन्दी · اردو · उत्तर प्रदेश',
    scriptTipsZh: '全印人口第一大邦，恆河平原平坦農村，招牌常見「天城文印地語 + 烏爾都語」雙語。',
    capitalZh: '勒克瑙 (Lucknow)'
  },
  'IN-UT': {
    code: 'IN-UT',
    nameZh: '北阿坎德邦',
    nameEn: 'Uttarakhand',
    officialLanguages: ['印地語 (Hindi)', '梵語 (Sanskrit)'],
    primaryScript: '天城文 (Devanagari)',
    scriptNativeSample: 'हिन्दी · संस्कृतम् · उत्तराखण्ड',
    scriptTipsZh: '喜馬拉雅山麓恆河源頭山區，松樹林陡坡、急流峽谷、印度教聖地朝聖路牌。',
    capitalZh: '德拉敦 (Dehradun)'
  },
  'IN-HP': {
    code: 'IN-HP',
    nameZh: '喜馬偕爾邦',
    nameEn: 'Himachal Pradesh',
    officialLanguages: ['印地語 (Hindi)'],
    primaryScript: '天城文 (Devanagari)',
    scriptNativeSample: 'हिन्दी · हिमाचल प्रदेश',
    scriptTipsZh: '喜馬拉雅高山峻嶺、蘋果園、英國殖民避暑山莊風格木建築（如達蘭薩拉、西姆拉）。',
    capitalZh: '西姆拉 (Shimla)'
  },
  'IN-JK': {
    code: 'IN-JK',
    nameZh: '查謨-克什米爾',
    nameEn: 'Jammu and Kashmir',
    officialLanguages: ['烏爾都語 (Urdu)', '克什米爾語', '多格拉語', '印地語'],
    primaryScript: '波斯-阿拉伯文 (Nastaliq Urdu) & 天城文',
    scriptNativeSample: 'اردو · كٲشُر · جموں و کشمیر',
    scriptTipsZh: '【秒殺特徵】招牌普遍首選「烏爾都語納斯塔利克草書 (Nastaliq Urdu)」，柳樹與楊樹成行，木造克什米爾傳統民居與希臘核桃樹。',
    capitalZh: '斯利那加 / 查謨 (Srinagar / Jammu)'
  },
  'IN-LA': {
    code: 'IN-LA',
    nameZh: '拉達克',
    nameEn: 'Ladakh',
    officialLanguages: ['拉達克語', '烏爾都語', '藏文', '印地語'],
    primaryScript: '藏文 (Tibetan Script) & 烏爾都文',
    scriptNativeSample: 'ལ་དྭགས། · اردو · लद्दाख़',
    scriptTipsZh: '【秒殺特徵】「小西藏」極高海拔乾旱冷荒漠（海拔 3,000 公尺以上）！無樹木裸露雪山，滿街藏文石刻、白塔與藏傳佛教紅衣喇嘛僧侶。',
    capitalZh: '列城 (Leh)'
  },

  // Union Territories
  'IN-DL': {
    code: 'IN-DL',
    nameZh: '德里國家首都轄區',
    nameEn: 'Delhi (NCT)',
    officialLanguages: ['印地語 (Hindi)', '英語 (English)', '旁遮普語', '烏爾都語'],
    primaryScript: '天城文、拉丁文、古木基文與烏爾都文 (四語路標)',
    scriptNativeSample: 'हिन्दी · English · ਪੰਜਾਬੀ · اردو',
    scriptTipsZh: '【秒殺特徵】標準官方路牌必為「四語並列」：上印地文，右英文，下旁遮普古木基文與烏爾都文！都會大道寬敞整潔，綠底指路大牌。',
    capitalZh: '新德里 (New Delhi)'
  },
  'IN-CH': {
    code: 'IN-CH',
    nameZh: '昌迪加爾',
    nameEn: 'Chandigarh',
    officialLanguages: ['英語 (English)', '印地語', '旁遮普語'],
    primaryScript: '拉丁文、天城文與古木基文',
    scriptNativeSample: 'English · हिन्दी · ਪੰਜਾਬੀ',
    scriptTipsZh: '柯比意規劃之網格花園城市，圓環極多，街道劃分為 Sector 1~60。',
    capitalZh: '昌迪加爾 (Chandigarh)'
  },
  'IN-PY': {
    code: 'IN-PY',
    nameZh: '本地治里',
    nameEn: 'Puducherry',
    officialLanguages: ['坦米爾語 (Tamil)', '法語 (French)', '英語 (English)'],
    primaryScript: '坦米爾文、拉丁字母 (法語)',
    scriptNativeSample: 'தமிழ் · Français · Puducherry',
    scriptTipsZh: '前法屬印度殖民地總部！街道名為法語「Rue de la Marine」等藍底白字法式琺瑯路牌，黃色南法殖民別墅，警察戴紅色圓形法式扁帽 (Képi)。',
    capitalZh: '本地治里 (Puducherry)'
  },
  'IN-AN': {
    code: 'IN-AN',
    nameZh: '安達曼-尼科巴群島',
    nameEn: 'Andaman and Nicobar Islands',
    officialLanguages: ['印地語 (Hindi)', '英語 (English)', '孟加拉語', '坦米爾語'],
    primaryScript: '天城文與拉丁文',
    scriptNativeSample: 'हिन्दी · English · अण्डमान',
    scriptTipsZh: '孟加拉灣外海熱帶海島，茂密紅樹林與熱帶雨林，海灘椰林。',
    capitalZh: '布萊爾港 (Port Blair)'
  },
  'IN-LD': {
    code: 'IN-LD',
    nameZh: '拉克沙群島',
    nameEn: 'Lakshadweep',
    officialLanguages: ['馬拉雅拉姆語 (Malayalam)', '英語 (English)'],
    primaryScript: '馬拉雅拉姆文',
    scriptNativeSample: 'മലയാളം · ലക്ഷദ്വീപ്',
    scriptTipsZh: '阿拉伯海珊瑚環礁群島，馬拉雅拉姆語圓潤字體。',
    capitalZh: '卡瓦拉蒂 (Kavaratti)'
  },
  'IN-DH': {
    code: 'IN-DH',
    nameZh: '達德拉-納加爾哈維利和達曼-第烏',
    nameEn: 'Dadra and Nagar Haveli and Daman and Diu',
    officialLanguages: ['古吉拉特語 (Gujarati)', '印地語 (Hindi)'],
    primaryScript: '古吉拉特文與天城文',
    scriptNativeSample: 'ગુજરાતી · हिन्दी',
    scriptTipsZh: '前葡屬印度港口，古吉拉特文無頂線字形與海濱堡壘。',
    capitalZh: '達曼 (Daman)'
  }
};

/**
 * Returns India state language information for a given subdivision code or name
 */
export function getIndiaStateLanguageInfo(codeOrName: string): IndiaStateLanguageInfo | null {
  if (!codeOrName) return null;
  const upper = codeOrName.toUpperCase().trim();

  // Try direct code match, e.g. "IN-MH", "MH"
  if (INDIA_STATE_LANGUAGES[upper]) {
    return INDIA_STATE_LANGUAGES[upper];
  }
  const prefixed = `IN-${upper}`;
  if (INDIA_STATE_LANGUAGES[prefixed]) {
    return INDIA_STATE_LANGUAGES[prefixed];
  }

  // Try searching by nameEn or nameZh
  for (const info of Object.values(INDIA_STATE_LANGUAGES)) {
    if (
      info.code === upper ||
      info.nameEn.toUpperCase() === upper ||
      info.nameZh === codeOrName ||
      codeOrName.includes(info.nameZh.replace('邦', '')) ||
      upper.includes(info.nameEn.toUpperCase())
    ) {
      return info;
    }
  }

  return null;
}
