import type { PrefectureDetail } from '../types/lod';

export const JAPAN_PREFECTURES: Record<number, PrefectureDetail> = {
  1: {
    id: 1,
    nameJa: '北海道',
    nameZh: '北海道',
    nameEn: 'Hokkaido',
    region: '北海道地方',
    capital: '札幌市',
    areaCode: '011 (札幌), 012x~016x',
    plates: ['札幌', '函館', '旭川', '室蘭', '釧路', '帯広', '北見', '苫小牧', '知床'],
    proClues: [
      '【代表特徵】固定式視線誘導標：紅白相間下向箭頭『矢羽』防暴風雪標記！',
      '電線桿頂部帶有黑色圓環或反光圓片',
      '房屋幾乎全為金屬平頂無傾斜屋瓦（防厚重積雪滑落破壞）',
      '路邊常見白樺樹林、大片牧草卷與歐式大型紅頂穀倉'
    ],
    landscapeDesc: '廣袤平原、白樺林、無瓦屋頂平房、壯麗雪山'
  },
  2: {
    id: 2,
    nameJa: '青森県',
    nameZh: '青森縣',
    nameEn: 'Aomori',
    region: '東北地方',
    capital: '青森市',
    areaCode: '017',
    plates: ['青森', '八戸', '弘前'],
    proClues: [
      '本州最北端，津輕海峽海風與日本第一之蘋果果園密度！',
      '直立式紅綠燈（縱型信號燈）極多以減緩積雪重量',
      '市外局番以 017 開頭，岩木山獨立火山錐'
    ],
    landscapeDesc: '雪國丘陵、蘋果果園、岩木山與津輕平原'
  },
  3: {
    id: 3,
    nameJa: '岩手県',
    nameZh: '岩手縣',
    nameEn: 'Iwate',
    region: '東北地方',
    capital: '盛岡市',
    areaCode: '019',
    plates: ['岩手', '盛岡', '平泉'],
    proClues: [
      '面積日本本州第一大縣，海岸線為典型三陸斷崖峽灣 (Ria coast)',
      '市外局番 019，內陸為北上盆地與北上川平原'
    ],
    landscapeDesc: '宏偉早池峰山、三陸海蝕斷崖海岸、森林盆地'
  },
  4: {
    id: 4,
    nameJa: '宮城県',
    nameZh: '宮城縣',
    nameEn: 'Miyagi',
    region: '東北地方',
    capital: '仙台市',
    areaCode: '022',
    plates: ['宮城', '仙台'],
    proClues: [
      '東北最大都會區（杜之都 仙台），市外局番為 022',
      '東北新幹線與國道4號樞紐，市區隨處可見仙台七夕祭裝飾招牌'
    ],
    landscapeDesc: '松島海灣奇石、仙台都會高樓群、藏王連峰'
  },
  5: {
    id: 5,
    nameJa: '秋田県',
    nameZh: '秋田縣',
    nameEn: 'Akita',
    region: '東北地方',
    capital: '秋田市',
    areaCode: '018',
    plates: ['秋田'],
    proClues: [
      '豪雪地帶，消雪噴水管道與超高反光防雪桿',
      '秋田杉林、竿燈祭標誌、市外局番 018'
    ],
    landscapeDesc: '日本海沿岸防風黑松林、八郎潟乾拓地、雪國農村'
  },
  6: {
    id: 6,
    nameJa: '山形県',
    nameZh: '山形縣',
    nameEn: 'Yamagata',
    region: '東北地方',
    capital: '山形市',
    areaCode: '023',
    plates: ['山形', '庄内'],
    proClues: [
      '盆地與櫻桃王國，出羽三山與藏王樹冰',
      '市外局番 023，道路旁常見水果直銷所與葡萄架'
    ],
    landscapeDesc: '四面環山之內陸盆地、最上川河谷、梯田'
  },
  7: {
    id: 7,
    nameJa: '福島県',
    nameZh: '福島縣',
    nameEn: 'Fukushima',
    region: '東北地方',
    capital: '福島市',
    areaCode: '024',
    plates: ['福島', '会津', 'いわき', '郡山', '白河'],
    proClues: [
      '分為會津、中通、濱通三大區，市外局番 024',
      '會津若松紅瓦城池、磐梯山火山口地貌'
    ],
    landscapeDesc: '豬苗代湖、磐梯高原火山地形、廣袤果園平原'
  },
  8: {
    id: 8,
    nameJa: '茨城県',
    nameZh: '茨城縣',
    nameEn: 'Ibaraki',
    region: '關東地方',
    capital: '水戶市',
    areaCode: '029',
    plates: ['水戸', '土浦', 'つくば'],
    proClues: [
      '霞浦湖（霞ヶ浦）日本第二大湖，筑波山平原孤峰',
      '市外局番 029，日立工業港口區與農業平原交錯'
    ],
    landscapeDesc: '筑波山聳立平原、霞浦寬闊水域、平坦菜園溫室'
  },
  9: {
    id: 9,
    nameJa: '栃木県',
    nameZh: '栃木縣',
    nameEn: 'Tochigi',
    region: '關東地方',
    capital: '宇都宮市',
    areaCode: '028',
    plates: ['宇都宮', 'とちぎ', '那須'],
    proClues: [
      '日光東照宮、鬼怒川溫泉、市外局番 028',
      '餃子之都宇都宮、北側為那須高原連峰'
    ],
    landscapeDesc: '日光杉並木道、男體山火山湖、關東平原北緣'
  },
  10: {
    id: 10,
    nameJa: '群馬県',
    nameZh: '群馬縣',
    nameEn: 'Gunma',
    region: '關東地方',
    capital: '前橋市',
    areaCode: '027',
    plates: ['群馬', '前橋', '高崎'],
    proClues: [
      '《頭文字D》榛名山（秋名山）、赤城山陡峭髮夾彎山道！',
      '冬季強烈「赤城落風 (赤城おろし)」，市外局番 027，達摩不倒翁'
    ],
    landscapeDesc: '嶙峋奇險妙義山、火山溫泉地熱、陡峭山道公路'
  },
  11: {
    id: 11,
    nameJa: '埼玉県',
    nameZh: '埼玉縣',
    nameEn: 'Saitama',
    region: '關東地方',
    capital: '埼玉市',
    areaCode: '048, 049',
    plates: ['大宮', '所沢', '熊谷', '春日部', '川越'],
    proClues: [
      '東京北側超大衛星城，川越藏造老街（小江戶）',
      '市外局番 048，住宅密集街巷平坦'
    ],
    landscapeDesc: '秩父群山峽谷、荒川沖積平原、密集住宅聚落'
  },
  12: {
    id: 12,
    nameJa: '千葉県',
    nameZh: '千葉縣',
    nameEn: 'Chiba',
    region: '關東地方',
    capital: '千葉市',
    areaCode: '043, 047',
    plates: ['千葉', '成田', '習志野', '袖ヶ浦', '野田', '柏', '松戸', '市川', '船橋', '市原'],
    proClues: [
      '房總半島，成田國際機場與東京迪士尼度假區！',
      '九十九里濱漫長太平洋沙灘、道路兩旁椰子樹休閒風'
    ],
    landscapeDesc: '房總丘陵波浪農田、九十九里漫長海灘、東京灣工業港'
  },
  13: {
    id: 13,
    nameJa: '東京都',
    nameZh: '東京都',
    nameEn: 'Tokyo',
    region: '關東地方',
    capital: '新宿區',
    areaCode: '03 (23區), 042 (多摩)',
    plates: ['品川', '世田谷', '練馬', '杉並', '足立', '葛飾', '江東', '八王子', '多摩'],
    proClues: [
      '【代表特徵】全球最密集都會！六角盾牌寫著『都道 xxx』！',
      '市外局番 03（23區直轄）與 042（多摩地區）',
      '首都高立體高架橋穿梭摩天樓縫隙、全世界最高密度便利商店與鐵路'
    ],
    landscapeDesc: '超密集摩天大樓、首都高立體高架橋、多摩丘陵與奧多摩峽谷'
  },
  14: {
    id: 14,
    nameJa: '神奈川県',
    nameZh: '神奈川縣',
    nameEn: 'Kanagawa',
    region: '關東地方',
    capital: '橫濱市',
    areaCode: '045 (橫濱), 044 (川崎), 046',
    plates: ['横浜', '川崎', '相模', '湘南'],
    proClues: [
      '橫濱港未來21、湘南海岸江之島、箱根溫泉山道',
      '市外局番 045（橫濱）、044（川崎）、046（湘南/小田原）'
    ],
    landscapeDesc: '橫濱海港地標塔、湘南平直海岸公路、箱根火山山嶺'
  },
  15: {
    id: 15,
    nameJa: '新潟県',
    nameZh: '新潟縣',
    nameEn: 'Niigata',
    region: '中部地方',
    capital: '新潟市',
    areaCode: '025',
    plates: ['新潟', '長岡', '上越'],
    proClues: [
      '日本第一越光米與雪國舞台，信濃川出海口',
      '道路中央自動噴水消雪孔極其密集！市外局番 025'
    ],
    landscapeDesc: '越後平原無邊稻田、信濃川寬大河面、日本海防風林'
  },
  16: {
    id: 16,
    nameJa: '富山県',
    nameZh: '富山縣',
    nameEn: 'Toyama',
    region: '中部地方',
    capital: '富山市',
    areaCode: '076',
    plates: ['富山'],
    proClues: [
      '立山黑部阿爾卑斯山脈、富山灣螢火魷',
      '房屋多為深黑光澤釉面瓦（能登黑瓦），市外局番 076'
    ],
    landscapeDesc: '立山連峰雄偉雪壁、富山深水海灣、散居村散落農田'
  },
  17: {
    id: 17,
    nameJa: '石川県',
    nameZh: '石川縣',
    nameEn: 'Ishikawa',
    region: '中部地方',
    capital: '金澤市',
    areaCode: '076',
    plates: ['石川', '金沢'],
    proClues: [
      '能登半島、兼六園金澤古都、白山連峰',
      '漆黑發亮能登瓦、白壁土藏、日本海浪濤拍岸'
    ],
    landscapeDesc: '能登半島險峻海角、金澤古都茶屋街、白山山脈'
  },
  18: {
    id: 18,
    nameJa: '福井県',
    nameZh: '福井縣',
    nameEn: 'Fukui',
    region: '中部地方',
    capital: '福井市',
    areaCode: '0776',
    plates: ['福井'],
    proClues: [
      '東尋坊柱狀節理斷崖！恐龍化石王國',
      '市外局番 0776，若狹灣三方五湖'
    ],
    landscapeDesc: '東尋坊柱狀節理懸崖、若狹灣深邃峽灣、九頭龍川平原'
  },
  19: {
    id: 19,
    nameJa: '山梨県',
    nameZh: '山梨縣',
    nameEn: 'Yamanashi',
    region: '中部地方',
    capital: '甲府市',
    areaCode: '055',
    plates: ['山梨', '富士山'],
    proClues: [
      '富士山北麓富士五湖！葡萄與水蜜桃果園棚架',
      '甲府盆地四面高山環抱，市外局番 055，富士山車牌！'
    ],
    landscapeDesc: '富士山雪冠雄姿、甲府盆地葡萄棚架、清里高山牧場'
  },
  20: {
    id: 20,
    nameJa: '長野県',
    nameZh: '長野縣',
    nameEn: 'Nagano',
    region: '中部地方',
    capital: '長野市',
    areaCode: '026',
    plates: ['長野', '松本', '諏訪'],
    proClues: [
      '日本屋脊！北、中、南阿爾卑斯交匯之高山王國',
      '松本城、白馬滑雪場、市外局番 026，深山落葉松林'
    ],
    landscapeDesc: '日本阿爾卑斯鋸齒冰斗山峰、諏訪湖、高原輕井澤落葉松'
  },
  21: {
    id: 21,
    nameJa: '岐阜県',
    nameZh: '岐阜縣',
    nameEn: 'Gifu',
    region: '中部地方',
    capital: '岐阜市',
    areaCode: '058, 057x',
    plates: ['岐阜', '飛騨'],
    proClues: [
      '白川鄉合掌造深山聚落！飛驒高山古老木造老街',
      '市外局番 058，長良川鵜飼捕魚、濃尾平原北緣'
    ],
    landscapeDesc: '合掌造茅草陡頂、長良川清澈巨石急流、飛驒深谷山林'
  },
  22: {
    id: 22,
    nameJa: '静岡県',
    nameZh: '靜岡縣',
    nameEn: 'Shizuoka',
    region: '中部地方',
    capital: '靜岡市',
    areaCode: '054 (靜岡), 053 (濱松)',
    plates: ['静岡', '浜松', '沼津', '伊豆', '富士山'],
    proClues: [
      '富士山南麓與駿河灣！滿山梯田階梯式綠茶茶園（茶畑）！',
      '市外局番 054（靜岡）、053（濱松），伊豆半島溫泉海岸'
    ],
    landscapeDesc: '修剪整齊的丘陵綠茶田、駿河灣蔚藍海岸、富士山南坡'
  },
  23: {
    id: 23,
    nameJa: '愛知県',
    nameZh: '愛知縣',
    nameEn: 'Aichi',
    region: '中部地方',
    capital: '名古屋市',
    areaCode: '052 (名古屋), 056x',
    plates: ['名古屋', '豊橋', '三河', '岡崎', '豊田', '一宮', '春日井'],
    proClues: [
      '豐田汽車（Toyota）大本營與名古屋都會圈！',
      '市外局番 052，極為寬闊的多線道道路（久屋大通100米道路）'
    ],
    landscapeDesc: '濃尾平原廣大都會、三河灣沿海工業基地、豐田車廠聚落'
  },
  24: {
    id: 24,
    nameJa: '三重県',
    nameZh: '三重縣',
    nameEn: 'Mie',
    region: '近畿地方',
    capital: '津市',
    areaCode: '059',
    plates: ['三重', '鈴鹿', '伊勢志摩', '四日市'],
    proClues: [
      '伊勢神宮巨大木造鳥居、鈴鹿賽道（F1）、志摩珍珠養殖海灣',
      '市外局番 059，英虞灣複雜谷灣海面浮排'
    ],
    landscapeDesc: '英虞灣珍珠養殖筏、伊勢古杉林神域、鈴鹿連峰'
  },
  25: {
    id: 25,
    nameJa: '滋賀県',
    nameZh: '滋賀縣',
    nameEn: 'Shiga',
    region: '近畿地方',
    capital: '大津市',
    areaCode: '077',
    plates: ['滋賀'],
    proClues: [
      '日本第一大湖『琵琶湖』佔據地理中心！環湖景觀公路',
      '市外局番 077，常有水鳥保護區牌與水上摩托浮標'
    ],
    landscapeDesc: '浩瀚無際的琵琶湖面、比叡山延曆寺山峰、近江八幡水鄉'
  },
  26: {
    id: 26,
    nameJa: '京都府',
    nameZh: '京都府',
    nameEn: 'Kyoto',
    region: '近畿地方',
    capital: '京都市',
    areaCode: '075',
    plates: ['京都'],
    proClues: [
      '千年古都！棋盤狀街巷（條坊制）、木造京町家格子窗',
      '市外局番 075，天橋立沙洲景觀，嚴格禁止戶外招牌鮮豔色彩（京都市景觀條例）'
    ],
    landscapeDesc: '古剎林立棋盤古都、鴨川河畔櫻柳、天橋立日本海白沙青松'
  },
  27: {
    id: 27,
    nameJa: '大阪府',
    nameZh: '大阪府',
    nameEn: 'Osaka',
    region: '近畿地方',
    capital: '大阪市',
    areaCode: '06 (大阪市), 072',
    plates: ['なにわ', '大阪', '和泉', '堺'],
    proClues: [
      '水之都大阪！市外局番 06！特有平假名車牌『なにわ (Naniwa)』！',
      '阪神高速立體環狀線穿梭摩天樓之間、道頓堀巨型立體看板'
    ],
    landscapeDesc: '阪神高速立體高架網絡、大和川與淀川河口、生駒山麓住宅'
  },
  28: {
    id: 28,
    nameJa: '兵庫県',
    nameZh: '兵庫縣',
    nameEn: 'Hyogo',
    region: '近畿地方',
    capital: '神戶市',
    areaCode: '078 (神戶), 079',
    plates: ['神戸', '姫路'],
    proClues: [
      '北臨日本海、南臨瀨戶內海！白鷺城姬路城、神戶六甲山夜景',
      '市外局番 078（神戶）、079（姬路/播磨），明石海峽大橋'
    ],
    landscapeDesc: '六甲山背山面海斜坡港市、播磨平原農田、但馬日本海峽灣'
  },
  29: {
    id: 29,
    nameJa: '奈良県',
    nameZh: '奈良縣',
    nameEn: 'Nara',
    region: '近畿地方',
    capital: '奈良市',
    areaCode: '074',
    plates: ['奈良', '飛鳥'],
    proClues: [
      '奈良公園放養小鹿！東大寺大佛、吉野山千本櫻',
      '市外局番 074，道路旁常見『注意鹿跳出 (鹿飛出注意)』警示牌！'
    ],
    landscapeDesc: '鹿群悠遊古寺草坪、吉野山櫻花覆蓋山巒、飛鳥古古墳丘'
  },
  30: {
    id: 30,
    nameJa: '和歌山県',
    nameZh: '和歌山縣',
    nameEn: 'Wakayama',
    region: '近畿地方',
    capital: '和歌山市',
    areaCode: '073',
    plates: ['和歌山'],
    proClues: [
      '紀伊半島群山、高野山真言宗聖地、熊野古道石板路',
      '市外局番 073，路旁漫山遍野之溫州蜜柑與南高梅果園！'
    ],
    landscapeDesc: '白濱白良濱沙灘、熊野那智瀑布深谷、密柑梯田'
  },
  31: {
    id: 31,
    nameJa: '鳥取県',
    nameZh: '鳥取縣',
    nameEn: 'Tottori',
    region: '中國地方',
    capital: '鳥取市',
    areaCode: '0857',
    plates: ['鳥取'],
    proClues: [
      '日本唯一之巨型『鳥取砂丘』！人口最少縣',
      '市外局番 0857，屋頂清一色為石州紅瓦（赤瓦），大山火山雄姿'
    ],
    landscapeDesc: '起伏壯闊黃金砂丘、日本海巨浪波濤、大山獨立雪峰'
  },
  32: {
    id: 32,
    nameJa: '島根県',
    nameZh: '島根縣',
    nameEn: 'Shimane',
    region: '中國地方',
    capital: '松江市',
    areaCode: '0852',
    plates: ['島根', '出雲'],
    proClues: [
      '出雲大社巨大注連繩（しめ縄）、神話之國',
      '市外局番 0852，宍道湖夕陽、極高密度之石州紅褐瓦屋頂'
    ],
    landscapeDesc: '宍道湖濕地水景、石州赤瓦純樸漁村、隱岐群島海蝕崖'
  },
  33: {
    id: 33,
    nameJa: '岡山県',
    nameZh: '岡山縣',
    nameEn: 'Okayama',
    region: '中國地方',
    capital: '岡山市',
    areaCode: '086',
    plates: ['岡山', '倉敷'],
    proClues: [
      '晴天之國（降雨最少）、倉敷美觀地區白壁黑瓦運河',
      '市外局番 086，瀨戶大橋引道、白桃與麝香葡萄果園'
    ],
    landscapeDesc: '瀨戶內海平靜海面、倉敷白壁水鄉柳樹、吉備高原'
  },
  34: {
    id: 34,
    nameJa: '広島県',
    nameZh: '廣島縣',
    nameEn: 'Hiroshima',
    region: '中國地方',
    capital: '廣島市',
    areaCode: '082 (廣島), 084 (福山)',
    plates: ['広島', '福山'],
    proClues: [
      '嚴島神社海上紅色巨大鳥居！廣島路面電車（廣電）遍布市區',
      '市外局番 082（廣島）、084（福山），瀨戶內島波海道跨海斜張橋'
    ],
    landscapeDesc: '宮島海上神社鳥居、島波海道跨島長橋、太田川三角洲路面電車'
  },
  35: {
    id: 35,
    nameJa: '山口県',
    nameZh: '山口縣',
    nameEn: 'Yamaguchi',
    region: '中國地方',
    capital: '山口市',
    areaCode: '083',
    plates: ['山口', '下関'],
    proClues: [
      '【全日本獨特設計】公路金屬護欄『全部塗成亮黃色（夏蜜柑黃）』，為山口縣於 1963 年國體舉辦時確立的縣道特色！',
      '秋吉台喀斯特石灰岩地貌、角島大橋蔚藍淺海、市外局番 083'
    ],
    landscapeDesc: '秋吉台羊群般石灰岩白色岩柱、角島翡翠綠跨海長橋、亮黃色公路護欄'
  },
  36: {
    id: 36,
    nameJa: '徳島県',
    nameZh: '德島縣',
    nameEn: 'Tokushima',
    region: '四國地方',
    capital: '德島市',
    areaCode: '088',
    plates: ['徳島'],
    proClues: [
      '鳴門海峽漩渦（鳴門渦潮）！阿波舞祭典雕像',
      '大鳴門橋、吉野川寬廣河床、市外局番 088'
    ],
    landscapeDesc: '鳴門海峽湍急漩渦、祖谷溪深谷藤蔓編織吊橋（かずら橋）'
  },
  37: {
    id: 37,
    nameJa: '香川県',
    nameZh: '香川縣',
    nameEn: 'Kagawa',
    region: '四國地方',
    capital: '高松市',
    areaCode: '087',
    plates: ['香川'],
    proClues: [
      '烏龍麵之國（讚岐烏龍麵店密度爆表！）日本面積最小縣',
      '市外局番 087，平原上密密麻麻的小型圓錐火山丘（飯野山/讚岐富士）與蓄水池'
    ],
    landscapeDesc: '讚岐平原無數星羅棋布蓄水池、讚岐富士圓錐孤山、瀨戶大橋終點'
  },
  38: {
    id: 38,
    nameJa: '愛媛県',
    nameZh: '愛媛縣',
    nameEn: 'Ehime',
    region: '四國地方',
    capital: '松山市',
    areaCode: '089',
    plates: ['愛媛'],
    proClues: [
      '日本最古老道後溫泉本館！島波海道終點，蜜柑（みかん）雕塑隨處可見',
      '市外局番 089，石鎚山西日本最高峰、路面電車穿梭松山市區'
    ],
    landscapeDesc: '松山城聳立山頭、瀨戶內島嶼柑橘梯田、石鎚山陡壁石筍'
  },
  39: {
    id: 39,
    nameJa: '高知県',
    nameZh: '高知縣',
    nameEn: 'Kochi',
    region: '四國地方',
    capital: '高知市',
    areaCode: '088',
    plates: ['高知'],
    proClues: [
      '四萬十川（日本最後之清流，無欄杆之『沉下橋』）！',
      '阪本龍馬桂濱銅像、太平洋強烈黑潮大浪、市外局番 088'
    ],
    landscapeDesc: '桂濱弧形防波堤與太平洋洶湧波濤、四萬十川無護欄水泥沉下橋'
  },
  40: {
    id: 40,
    nameJa: '福岡県',
    nameZh: '福岡縣',
    nameEn: 'Fukuoka',
    region: '九州地方',
    capital: '福岡市',
    areaCode: '092 (福岡), 093 (北九州)',
    plates: ['福岡', '北九州', '久留米', '筑豊'],
    proClues: [
      '九州第一大都會！博多中洲屋台（路邊小吃攤）、豚骨拉麵招牌',
      '市外局番 092（福岡市）、093（北九州市），太宰府天滿宮'
    ],
    landscapeDesc: '博多海灣繁華都會、北九州若戶大橋工業港、筑紫平原農田'
  },
  41: {
    id: 41,
    nameJa: '佐賀県',
    nameZh: '佐賀縣',
    nameEn: 'Saga',
    region: '九州地方',
    capital: '佐賀市',
    areaCode: '0952',
    plates: ['佐賀'],
    proClues: [
      '有田燒與伊萬里燒瓷器故鄉！吉野里歷史遺跡干欄式木造建築',
      '市外局番 0952，有明海潮差高達6公尺之廣闊泥灘（有明海潟湖）'
    ],
    landscapeDesc: '有明海廣袤泥灘灘塗、吉野里干欄式古代木建築、佐賀平原稻田'
  },
  42: {
    id: 42,
    nameJa: '長崎県',
    nameZh: '長崎縣',
    nameEn: 'Nagasaki',
    region: '九州地方',
    capital: '長崎市',
    areaCode: '095',
    plates: ['長崎', '佐世保'],
    proClues: [
      '島嶼數量日本第一大縣！長崎稻佐山斜坡洋房、路面電車',
      '佐世保美軍基地英文招牌、市外局番 095，平戶荷蘭商館南蠻風格'
    ],
    landscapeDesc: '長崎港三面環抱極陡峭住宅山坡、九十九島翡翠綠碎島、教堂十字架尖頂'
  },
  43: {
    id: 43,
    nameJa: '熊本県',
    nameZh: '熊本縣',
    nameEn: 'Kumamoto',
    region: '九州地方',
    capital: '熊本市',
    areaCode: '096',
    plates: ['熊本'],
    proClues: [
      '阿蘇火山世界最大破火山口（Aso Caldera）！熊本城武者返石垣',
      '吉祥物熊本熊（Kumamon）路邊招牌極高密度！市外局番 096'
    ],
    landscapeDesc: '阿蘇破火山口廣闊綠色草浪、米塚休眠小火山口、天草五橋群島海景'
  },
  44: {
    id: 44,
    nameJa: '大分県',
    nameZh: '大分縣',
    nameEn: 'Oita',
    region: '九州地方',
    capital: '大分市',
    areaCode: '097',
    plates: ['大分'],
    proClues: [
      '日本第一溫泉縣（別府地獄溫泉、由布院）！白霧地熱蒸汽自路邊水溝冒出',
      '市外局番 097，由布岳雙耳錐形火山姿態優美'
    ],
    landscapeDesc: '別府街道處處裊裊升起之白溫泉蒸氣、由布岳綠油油雙峰、耶馬溪石柱'
  },
  45: {
    id: 45,
    nameJa: '宮崎県',
    nameZh: '宮崎縣',
    nameEn: 'Miyazaki',
    region: '九州地方',
    capital: '宮崎市',
    areaCode: '0985',
    plates: ['宮崎'],
    proClues: [
      '日南海岸公路沿途種滿巨型鳳凰椰子樹（Canary Date Palm）！熱帶南國風情爆棚',
      '鬼之洗衣板（鬼の洗濯板）海蝕波狀岩層、市外局番 0985'
    ],
    landscapeDesc: '高聳鳳凰木與華盛頓椰子樹公路、鬼之洗濯板階梯波浪岩礁、高千穗峽玄武岩峭壁'
  },
  46: {
    id: 46,
    nameJa: '鹿児島県',
    nameZh: '鹿兒島縣',
    nameEn: 'Kagoshima',
    region: '九州地方',
    capital: '鹿兒島市',
    areaCode: '099',
    plates: ['鹿児島', '奄美'],
    proClues: [
      '櫻島活火山矗立錦江灣！道路兩旁常見收集落灰之『克灰袋』黃色塑膠袋與水泥防火山噴石避難亭！',
      '市外局番 099，黑豚拉麵、熱帶沙蒸溫泉指宿'
    ],
    landscapeDesc: '櫻島火山不時冒煙壯麗山景、錦江灣渡輪航線、開聞岳（薩摩富士）圓錐海角'
  },
  47: {
    id: 47,
    nameJa: '沖縄県',
    nameZh: '沖繩縣',
    nameEn: 'Okinawa',
    region: '九州地方',
    capital: '那霸市',
    areaCode: '098',
    plates: ['沖縄'],
    proClues: [
      '【琉球文化特色】屋頂純紅琉球紅瓦（赤瓦）、石門口兩尊『風獅爺（シーサー）』！',
      '道路為珊瑚石灰岩白化路面、路旁扶桑花與甘蔗田、美軍基地帶有英文告示路標、市外局番 098'
    ],
    landscapeDesc: '白沙綠海珊瑚礁潟湖、琉球石灰岩矮牆石屋、赤瓦風獅爺屋頂、美軍鐵絲網圍欄'
  }
};
