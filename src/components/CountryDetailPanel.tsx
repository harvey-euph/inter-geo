import React from 'react';
import { X, ChevronLeft, Navigation, Car, Shield, Lightbulb, Globe, Layers, AlertCircle, Phone, MapPin, Search, Compass } from 'lucide-react';
import type { CountryData } from '../types/geo';
import type { PrefectureDetail, MunicipalityDetail, L2SubdivisionDetail } from '../types/lod';
import { getRoadSystemMeta, type RoadPathData } from '../data/roadsMeta';
import { getCountryCallingCode, getCountryTld } from '../data/globalFilters';
import { getSubdivisionAreaCode } from '../data/domesticAreaCodes';
import { getIndiaStateLanguageInfo } from '../data/indiaLanguages';
import { getCountryLanguageMeta } from '../data/countryLanguages';
import { findCountry } from '../data/countries';
import { MarkdownLoreCards } from './MarkdownLoreCard';

interface CountryDetailPanelProps {
  country: CountryData | null;
  subdivision?: L2SubdivisionDetail | null;
  prefecture?: PrefectureDetail | null;
  municipality?: MunicipalityDetail | null;
  road?: RoadPathData | null;
  onClose: () => void;
  onNavigateBack?: () => void;
  onNavigateToCountry?: (country: CountryData) => void;
  onSelectCountryName?: (name: string) => void;
  onZoomToPrefecture?: (prefId: number) => void;
}

export const CountryDetailPanel: React.FC<CountryDetailPanelProps> = React.memo(({
  country,
  subdivision,
  prefecture,
  municipality,
  road,
  onClose,
  onNavigateBack,
  onNavigateToCountry,
  onSelectCountryName,
  onZoomToPrefecture
}) => {
  // 0. Highway & Route Detail (Roads Mode)
  if (road) {
    const isInterstate = road.class === 'Interstate';
    const roadCountry = (road.iso2 ? findCountry(road.iso2) : undefined) || country || undefined;
    const parentCountryName = roadCountry?.nameZh || road.iso2 || '國家';
    const roadMeta = getRoadSystemMeta(road, roadCountry);
    const isUS = (road.iso2 || 'US').toUpperCase() === 'US';

    const handleBack = () => {
      if (roadCountry && onNavigateToCountry) {
        onNavigateToCountry(roadCountry);
      } else if (onNavigateBack) {
        onNavigateBack();
      }
    };

    // US-specific road classification logic
    const num = parseInt(road.number, 10);
    const hasNum = !isNaN(num);
    const isEven = hasNum && num % 2 === 0;
    const isOdd = hasNum && num % 2 !== 0;
    const isMajor = hasNum && road.number.length <= 2 && (num % 5 === 0 || num % 10 === 0);
    const isAuxiliary = hasNum && road.number.length === 3;
    const firstDigit = isAuxiliary ? parseInt(road.number[0], 10) : 0;
    const isBeltway = isAuxiliary && firstDigit % 2 === 0;

    let usNumberingRule = '';
    let usLocationClue = '';
    if (isUS) {
      if (isInterstate) {
        if (isEven) {
          usNumberingRule = '偶數編號為東西走向 (East-West)。全美號碼自南向北遞增（I-10 橫貫最南方美墨邊界/墨西哥灣，I-90 橫貫最北方加拿大邊界）。';
          if (num <= 20) usLocationClue = '號碼偏小（如 I-10, I-20）：位於美國南部陽光地帶（加州、德州、佛羅里達等）。';
          else if (num <= 40) usLocationClue = '號碼居中（如 I-40）：橫貫美國南部偏中帶（北卡、田納西、奧克拉荷馬、新墨西哥、亞利桑那）。';
          else if (num <= 70) usLocationClue = '號碼偏中上（如 I-70）：橫貫美國心臟地帶（馬里蘭、俄亥俄、堪薩斯、科羅拉多、猶他）。';
          else usLocationClue = '號碼偏大（如 I-80, I-90, I-94）：橫貫美國中北部及五大湖區（紐約、芝加哥、明尼蘇達、華盛頓州西雅圖）。';
        } else {
          usNumberingRule = '奇數編號為南北走向 (North-South)。全美號碼自西向東遞增（I-5 緊貼西海岸太平洋，I-95 緊貼東海岸大西洋）。';
          if (num <= 15) usLocationClue = '號碼偏小（如 I-5, I-15）：縱貫美國西部與太平洋沿岸（加州、奧勒岡、華盛頓州、內華達、猶他）。';
          else if (num <= 35) usLocationClue = '號碼居中（如 I-25, I-35）：縱貫大平原與中西部（德州、堪薩斯、內布拉斯加、新墨西哥）。';
          else if (num <= 65) usLocationClue = '號碼偏中東（如 I-55, I-65, I-75）：縱貫密西西比河流域至五大湖（芝加哥、印第安納、肯塔基、田納西、阿拉巴馬）。';
          else usLocationClue = '號碼偏大（如 I-85, I-95）：縱貫美國大西洋東海岸（波士頓、紐約、費城、DC、北卡、佛羅里達）。';
        }
      } else {
        if (isEven) {
          usNumberingRule = '偶數編號為東西走向 (East-West)。重要：國道號碼走向與州際相反！號碼自北向南遞增（US 2 沿加拿大邊境，US 90/98 位於最南端墨西哥灣）。';
          if (num <= 30) usLocationClue = '號碼偏小（如 US 2, US 20, US 30）：位於美國中北部偏向加拿大與五大湖。';
          else if (num <= 60) usLocationClue = '號碼居中（如 US 40, US 50, US 60）：橫貫美國中部俄亥俄河流域至內華達沙漠。';
          else usLocationClue = '號碼偏大（如 US 80, US 90, US 98）：位於美國南部墨西哥灣沿岸與美墨邊界。';
        } else {
          usNumberingRule = '奇數編號為南北走向 (North-South)。重要：國道號碼走向與州際相反！號碼自東向西遞增（US 1 沿大西洋東岸，US 101 沿太平洋西岸）。';
          if (num <= 31) usLocationClue = '號碼偏小（如 US 1, US 13, US 17, US 23）：緊貼美國東海岸大西洋與新英格蘭地區。';
          else if (num <= 61) usLocationClue = '號碼居中（如 US 31, US 41, US 51, US 61）：縱貫美國中西部密西西比河流域（如經典藍調公路 US 61）。';
          else usLocationClue = '號碼偏大（如 US 75, US 83, US 95, US 101）：縱貫美國大平原以西至太平洋沿岸（US 101 為西海岸經典風景線）。';
        }
      }
    }

    let usAuxClue = '';
    if (isUS && isAuxiliary) {
      if (isBeltway) {
        usAuxClue = `三位數首位為偶數 (${firstDigit})：此為「環城公路或雙頭聯絡道 (Loop / Beltway)」，兩端皆銜接母幹線 I-${road.number.slice(1)}，通常環繞大都會區（如洛杉磯 I-405、亞特蘭大 I-285）。`;
      } else {
        usAuxClue = `三位數首位為奇數 (${firstDigit})：此為「單頭分支支線 (Spur Route)」，僅有一端銜接母幹線 I-${road.number.slice(1)}，通常深入市中心、港口或機場（如舊金山 I-280 支線、DC I-395）。`;
      }
    }

    // International road intelligence
    const iso = (road.iso2 || '').toUpperCase();
    const isERoad = road.name.startsWith('E ') || road.name.startsWith('E-') || /^E\d+/.test(road.name);
    let intlNumberingRule = '';
    let intlCorridorClue = '';
    let intlMetaTips: Array<{ title: string; desc: string }> = [];

    if (!isUS) {
      if (iso === 'DE') {
        intlNumberingRule = '【德國高速公路編號法則】單數位（A 1 ~ A 9）為貫穿德國全境之骨幹動脈；雙數位（A 10 ~ A 99）為跨邦區域幹線；三數位為大都會區支線與環線。';
        if (hasNum) {
          if (num % 2 !== 0) {
            intlCorridorClue = '奇數編號為南北縱貫走向：號碼自西向東遞增（A 1 位於西德魯爾區至漢堡，A 9 縱貫東部連接柏林與慕尼黑）。';
          } else {
            intlCorridorClue = '偶數編號為東西橫貫走向：號碼自北向南遞增（A 2 連接魯爾區與柏林，A 8 連接卡斯魯爾至慕尼黑與奧地利）。';
          }
        }
        intlMetaTips = [
          { title: '藍底白字高速公路牌', desc: '德國 Autobahn 採用極具識別度的深藍底白字指標與藍底白字盾牌，與聯邦公路（黃底黑字）形成強烈對比。' },
          { title: '速度限制與行車文化', desc: '絕大多數 Autobahn 路段未設法定速限（建議速限 130 km/h），最內側車道僅供超車，嚴禁右側超車。' },
          { title: '護欄與反光防撞桿', desc: '黑白配色的 Leitpfosten 反光防撞標桿（右側為長條反光條，左側為雙點圓形反光條）。' }
        ];
      } else if (iso === 'JP') {
        intlNumberingRule = '【日本高速公路路線編號】以「E + 兩位數」表示主要高速公路（Expressway）；以「C + 兩位數」表示都市環狀線（Circular，如 C1 都心環狀線、C2 中央環狀線、C3 東京外環道）。';
        intlCorridorClue = road.name.startsWith('C')
          ? '大都會環狀公路（Loop/Beltway），有效引導穿越車流避開市中心樞紐。'
          : (isInterstate ? '跨區域高速自動車國道（如 E1 東名/名神高速、E4 東北道），為日本經濟大動脈。' : '日本一般國道（1號~507號），以藍底倒三角形盾牌標示。');
        intlMetaTips = [
          { title: '標牌配色系統', desc: '高速公路一律使用深綠底白字路標；一般國道與主要都道府縣道採用藍底白字盾牌與路標。' },
          { title: '靠左行駛與道路線條', desc: '日本為左側通行（車道靠左），車道中線白色虛線代表可變換車道，黃色實線代表禁止變換/超車。' },
          { title: 'ETC 收費站與防撞標桿', desc: '出入口與交流道均有紫色 ETC 專用車道牌；路側常有箭頭朝下的紅色防雪反光引導桿（雪國特徵）。' }
        ];
      } else if (iso === 'TW') {
        intlNumberingRule = '【台灣公路路網編號系統】國道高速公路以綠底「梅花」圖案標示；省道快速公路以紅底「盾牌」標示；一般省道以藍底「盾牌」標示。';
        intlCorridorClue = isInterstate
          ? '奇數國道為南北縱貫（國1 中山高、國3 福爾摩沙高、國5 蔣渭水高）；偶數國道為東西橫貫聯絡道（國2 桃機、國4 台中、國6 南投、國8 台南、國10 高雄）。'
          : (road.name.includes('6') || road.name.includes('7') || road.name.includes('8') ? '省道快速公路（台61 西濱、台62、台64、台66、台74、台76、台84 等），速限多為 80~90 km/h。' : '一級縱貫省道（台1線、台3線、台9線環島大動脈）。');
        intlMetaTips = [
          { title: '梅花 vs 盾牌辨識法', desc: '看見梅花圖案必定為國道高速公路；看見紅底盾牌為省道快速公路（禁行機車但開放大型重機）；藍底盾牌為普通省道。' },
          { title: '行車方向與標線', desc: '靠右行駛。路面中央雙黃實線代表禁止跨越對向車道，路側常有白底黑字之省道路牌與台電電力座標桿。' }
        ];
      } else if (iso === 'GB') {
        intlNumberingRule = '【英國公路放射分區法則】以倫敦為中心順時針劃分 1~4 號區；以愛丁堡為中心順時針劃分 7~9 號區。高速公路以 M 開頭，主要幹道以 A 開頭。';
        intlCorridorClue = isInterstate
          ? '藍底白字 Motorway 高速公路網（如 M1 連接倫敦與里茲、M4 橫貫威爾斯與倫敦、M25 倫敦大外環）。'
          : '綠底白字 Primary A-Road 主要幹道（如 A1 歷史經典大北路 Great North Road）。';
        intlMetaTips = [
          { title: '左側駕駛與經典車牌', desc: '全英靠左行駛。車輛前車牌為白底黑字、後車牌為黃底黑字，為街景最經典必殺特徵。' },
          { title: '路標配色原則', desc: '藍底代表 Motorway 高速公路；綠底代表 Primary Route 主要幹道；白底黑字代表非主要公路（B-Roads）。' }
        ];
      } else if (iso === 'FR') {
        intlNumberingRule = '【法國公路分類網格】A 開頭代表 Autoroute 高速公路（藍底紅框標籤）；N 開頭代表 Route Nationale 國道（紅底標籤）；D 開頭代表 Route Départementale 省道（黃底標籤）。';
        intlCorridorClue = isInterstate
          ? '法國全封閉收費高速公路網（A 1 連接巴黎與里爾、A 6/A 7 陽光高速公路直達地中海）。'
          : '跨大區的重要國道幹道（如歷史知名的 N 7 巴黎直達尼斯蔚藍海岸）。';
        intlMetaTips = [
          { title: '頂部小方塊標籤 (Cartouche)', desc: '法國路標指示牌頂部會有紅底 (A/N)、黃底 (D)、綠底 (E) 的小矩形標註路線號碼。' },
          { title: '右方車輛優先 (Priorité à Droite)', desc: '鄉間或無號誌路口若無黃色菱形主幹道優先標誌，一律由右側來車優先通行。' }
        ];
      } else if (isERoad) {
        intlNumberingRule = '【歐洲國際 E 級公路網 (European Route)】由聯合國歐洲經濟委員會制定之跨國公路系統，使用綠底白字矩形路牌。';
        intlCorridorClue = '以 0 結尾的雙位數為東西橫貫主要走廊（E10~E90，自北向南遞增）；以 5 結尾為南北縱貫主要走廊（E05~E125，自西向東遞增）。如 E40 橫貫西歐至中亞！';
        intlMetaTips = [
          { title: '綠底白字跨國路牌', desc: '歐洲各國的高速公路上常同時標註本國公路號碼與綠底白字的 E 級公路號碼。' },
          { title: '長程洲際走廊', desc: 'E 級公路常橫跨多個國家與申根邊境，從大西洋沿岸一路延伸至烏拉山脈乃至中亞。' }
        ];
      } else {
        intlNumberingRule = `【${roadMeta.countryNameZh} 公路系統】${roadMeta.systemZh}（${roadMeta.systemEn}）。`;
        intlCorridorClue = road.number ? `主要路線編號：${road.number}` : (road.type ? `道路等級：${road.type}` : '國家主要運輸動脈');
        intlMetaTips = [
          { title: '行車方向與標線', desc: `${roadCountry?.nameZh || '該國'}為${roadCountry?.drivingSide === 'left' ? '靠左行駛 (LHT)' : '靠右行駛 (RHT)'}。${roadCountry?.roadLinesDesc ? `道路中央標線：${roadCountry.roadLinesDesc}` : ''}` },
          { title: '車載與街景特徵', desc: roadCountry?.carMetaDesc || '全球重要國家骨幹路網，為跨區長途物流與城際交通動脈。' }
        ];
      }
    }

    return (
      <aside className="country-drawer">
        <div className="drawer-header">
          <div className="drawer-country-title">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 800,
                background: isInterstate
                  ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                  : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff',
                boxShadow: isInterstate
                  ? '0 0 12px rgba(56, 189, 248, 0.45)'
                  : '0 0 12px rgba(251, 191, 36, 0.45)',
                letterSpacing: 0.5
              }}
            >
              {road.name}
            </span>
            <div>
              <div className="drawer-name-zh">
                {roadMeta.flag} {road.name} · {roadMeta.systemZh}
              </div>
              <div className="drawer-name-en">
                {roadMeta.systemEn}
              </div>
            </div>
          </div>
          <div className="drawer-header-actions">
            <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-content">
          {/* Breadcrumbs Navigation */}
          <div className="drawer-breadcrumbs">
            {roadCountry && (
              <>
                <span
                  className="drawer-breadcrumb-link"
                  onClick={handleBack}
                  title={`查看 ${parentCountryName} 國家情報`}
                >
                  {roadCountry.flag} {roadCountry.nameZh}
                </span>
                <span className="drawer-breadcrumb-sep">›</span>
              </>
            )}
            <span className="drawer-breadcrumb-current">
              {road.name} · {roadMeta.systemZh}
            </span>
            {(onNavigateToCountry || onNavigateBack) && (
              <button
                className="drawer-breadcrumb-back-btn"
                onClick={handleBack}
                title={`回上一頁：${parentCountryName}`}
              >
                <ChevronLeft size={13} />
                <span>回上一頁</span>
              </button>
            )}
          </div>

          {/* Quick Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <div
              className="intel-tag highlight"
              style={{
                backgroundColor: isInterstate ? 'rgba(56, 189, 248, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                borderColor: isInterstate ? '#38bdf8' : '#fbbf24',
                color: isInterstate ? '#38bdf8' : '#fbbf24',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px'
              }}
            >
              🛣️ {roadMeta.classBadge}
            </div>

            {roadCountry && (
              <div
                className="intel-tag"
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  borderColor: 'rgba(99, 102, 241, 0.4)',
                  color: '#a5b4fc',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px'
                }}
              >
                {roadCountry.flag} {roadCountry.nameZh} ({roadCountry.iso2})
              </div>
            )}

            {isUS ? (
              <>
                <div
                  className="intel-tag"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    borderColor: 'rgba(59, 130, 246, 0.4)',
                    color: '#60a5fa',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px'
                  }}
                >
                  {isEven ? '↔️ 東西走向 (E-W)' : isOdd ? '↕️ 南北走向 (N-S)' : '🔄 環狀／特殊走向'}
                </div>

                {isMajor && (
                  <div
                    className="intel-tag"
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      borderColor: 'rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px'
                    }}
                  >
                    🌟 全美主要橫貫／縱貫大動脈
                  </div>
                )}

                {isAuxiliary && (
                  <div
                    className="intel-tag"
                    style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.15)',
                      borderColor: 'rgba(168, 85, 247, 0.4)',
                      color: '#c084fc',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px'
                    }}
                  >
                    {isBeltway ? '🔄 環城雙頭聯絡道 (Beltway)' : '📍 單頭市區支線 (Spur)'}
                  </div>
                )}
              </>
            ) : (
              <>
                {road.number && (
                  <div
                    className="intel-tag"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      borderColor: 'rgba(59, 130, 246, 0.4)',
                      color: '#60a5fa',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px'
                    }}
                  >
                    🔢 號碼：{road.number}
                  </div>
                )}
                {roadCountry && (
                  <div
                    className="intel-tag"
                    style={{
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      borderColor: 'rgba(34, 197, 94, 0.4)',
                      color: '#4ade80',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px'
                    }}
                  >
                    🚗 {roadCountry.drivingSide === 'left' ? '靠左通行 (LHT)' : '靠右通行 (RHT)'}
                  </div>
                )}
              </>
            )}
          </div>

          {/* System Numbering Grid Rule */}
          <div className="intel-card" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', backgroundColor: 'rgba(14, 25, 42, 0.6)' }}>
            <div className="intel-card-header">
              <Compass size={16} color="#38bdf8" />
              <span>{isUS ? '全美號碼走向網格法則 (Grid Orientation)' : '公路系統與編號法則 (Route Classification)'}</span>
            </div>
            <div className="intel-card-body" style={{ color: '#e2e8f0', lineHeight: 1.5 }}>
              {isUS ? usNumberingRule : intlNumberingRule}
            </div>
          </div>

          {/* Location / Corridor Clue */}
          {(isUS ? usLocationClue : intlCorridorClue) && (
            <div className="intel-card">
              <div className="intel-card-header">
                <MapPin size={16} color="#4ade80" />
                <span style={{ color: '#4ade80' }}>地理區間與路線定位 (Geographic Corridor)</span>
              </div>
              <div className="intel-card-body" style={{ fontSize: 13, lineHeight: 1.5 }}>
                {isUS ? usLocationClue : intlCorridorClue}
              </div>
            </div>
          )}

          {/* US 3-digit Auxiliary Clue */}
          {isUS && usAuxClue && (
            <div className="intel-card">
              <div className="intel-card-header">
                <Layers size={16} color="#c084fc" />
                <span style={{ color: '#c084fc' }}>三位數支線編號規則 (3-Digit Auxiliary)</span>
              </div>
              <div className="intel-card-body" style={{ fontSize: 13, lineHeight: 1.5 }}>
                {usAuxClue}
              </div>
            </div>
          )}

          {/* Highway & Road Culture Details */}
          <div className="intel-card">
            <div className="intel-card-header">
              <Lightbulb size={16} color="#facc15" />
              <span style={{ color: '#facc15' }}>道路標誌與系統特色 (Highway System Notes)</span>
            </div>
            {isUS ? (
              <ul className="hints-list">
                <li className="hint-item">
                  <strong>出口編號對應里程標牌：</strong>全美絕大多數州的州際公路 Exit 編號代表該州起點之英里里程數 (Mile Marker)，里程自南向北、自西向東累加。
                </li>
                <li className="hint-item">
                  <strong>路牌盾牌特徵：</strong>州際公路為經典紅白藍三色盾牌；舊美國國道 (U.S. Routes) 為白底黑字黑邊盾牌。
                </li>
                <li className="hint-item">
                  <strong>末碼為 0 或 5：</strong>兩位數且以 0 結尾的州際公路貫穿全美東西（如 I-10, I-40, I-80, I-90）；以 5 結尾貫穿全美南北（如 I-5, I-15, I-35, I-75, I-95）。
                </li>
              </ul>
            ) : (
              <ul className="hints-list">
                {intlMetaTips.map((tip, idx) => (
                  <li key={idx} className="hint-item">
                    <strong>{tip.title}：</strong>{tip.desc}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Dynamic Highway Markdown Lore Cards */}
          <MarkdownLoreCards
            query={{
              roadName: road.name,
              roadClass: road.class,
              countryIso2: road.iso2
            }}
          />
        </div>
      </aside>
    );
  }

  // 1. Prefecture Detail (L2)
  if (prefecture) {
    return (
      <aside className="country-drawer">
        <div className="drawer-header">
          <div className="drawer-country-title">
            <span className="drawer-flag" role="img" aria-label="prefecture">🗾</span>
            <div>
              <div className="drawer-name-zh">{prefecture.nameZh} ({prefecture.nameJa})</div>
              <div className="drawer-name-en">
                {prefecture.nameEn} · 日本 {prefecture.region} (首府: {prefecture.capital})
              </div>
            </div>
          </div>
          <div className="drawer-header-actions">
            <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-content">
          {/* Breadcrumbs Navigation */}
          <div className="drawer-breadcrumbs">
            <span
              className="drawer-breadcrumb-link"
              onClick={onNavigateBack}
              title="查看 日本 國家情報"
            >
              🇯🇵 日本
            </span>
            <span className="drawer-breadcrumb-sep">›</span>
            <span className="drawer-breadcrumb-current">{prefecture.nameZh}</span>
            {onNavigateBack && (
              <button
                className="drawer-breadcrumb-back-btn"
                onClick={onNavigateBack}
                title="回上一頁：日本"
              >
                <ChevronLeft size={13} />
                <span>回上一頁</span>
              </button>
            )}
          </div>

          {/* Quick Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <div
              className="intel-tag highlight"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: '#10b981',
                color: '#34d399',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px'
              }}
            >
              📞 市外局番：{prefecture.areaCode}
            </div>

            <div
              className="intel-tag"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderColor: 'rgba(59, 130, 246, 0.4)',
                color: '#60a5fa',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px'
              }}
            >
              🗾 {prefecture.region}
            </div>

            <div className="intel-tag" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '4px 10px' }}>
              JIS 代碼：#{String(prefecture.id).padStart(2, '0')}
            </div>
          </div>

          {/* Prefecture Features */}
          <div className="intel-card" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', backgroundColor: 'rgba(14, 25, 42, 0.6)' }}>
            <div className="intel-card-header">
              <Lightbulb size={16} color="#38bdf8" />
              <span>都道府縣人文與地景特色 (Prefecture Highlights)</span>
            </div>
            <ul className="hints-list">
              {prefecture.proClues.map((clue, idx) => (
                <li key={idx} className="hint-item">
                  {clue}
                </li>
              ))}
            </ul>
          </div>

          {/* Area Telephone Codes */}
          <div className="intel-card">
            <div className="intel-card-header">
              <Phone size={16} color="#22c55e" />
              <span style={{ color: '#4ade80' }}>市外局番電話區號 (Telephone Codes)</span>
            </div>
            <div className="intel-card-body" style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>
              {prefecture.areaCode}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              日本市外局番依地理區塊由北（01）往南（09）依序編排，常見於街頭招牌與公共設施標示。
            </div>
          </div>

          {/* License Plate Prefixes */}
          <div className="intel-card">
            <div className="intel-card-header">
              <Car size={16} color="#ec4899" />
              <span style={{ color: '#f472b6' }}>地方車牌名錄 (Plate Prefixes / ご当地ナンバー)</span>
            </div>
            <div className="intel-tag-row">
              {prefecture.plates.map((plate) => (
                <span
                  key={plate}
                  className="intel-tag"
                  style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.3)', color: '#fbcfe8' }}
                >
                  🚗 {plate}
                </span>
              ))}
            </div>
          </div>

          {/* Landscape and Roads */}
          <div className="intel-card">
            <div className="intel-card-header">
              <Navigation size={16} color="#38bdf8" />
              <span style={{ color: '#38bdf8' }}>地形與道路風貌 (Landscape & Roads)</span>
            </div>
            <div className="intel-card-body">{prefecture.landscapeDesc}</div>
          </div>

          {/* Dynamic Prefecture Markdown Lore Cards */}
          <MarkdownLoreCards
            query={{
              countryIso2: 'JP',
              subdivisionCode: String(prefecture.id).padStart(2, '0'),
              subdivisionId: prefecture.id
            }}
          />

          {/* Zoom to Municipalities Button */}
          {onZoomToPrefecture && (
            <button
              className="btn-primary"
              style={{ width: '100%', padding: '10px 14px', marginTop: 8, justifyContent: 'center' }}
              onClick={() => onZoomToPrefecture(prefecture.id)}
            >
              <Search size={16} />
              <span>放大查看 {prefecture.nameZh} L3 市區町村細分</span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  // 2. Municipality / L3 Subdivision Detail
  if (municipality) {
    const isJapan = !municipality.iso2 || municipality.iso2 === 'JP';
    const flag = municipality.countryFlag || (isJapan ? '🗾' : '🏙️');
    const countryNameZh = municipality.countryNameZh || (isJapan ? '日本' : '');
    const countryNameEn = municipality.countryName || (isJapan ? 'Japan' : '');
    const parentL2Name = municipality.pref || municipality.parentName || (isJapan ? '都道府縣' : '一級行政區');
    const unitType = municipality.typeEn || (isJapan ? '市區町村' : '二級行政區');

    let metaTip = '此區域為二級／三級地方行政單位，各城鎮常在路名牌、公車站牌與市政設施上呈現地方名稱。';
    if (isJapan) {
      metaTip = '日本各市區町村通常擁有專屬自治體章（市章／町章），廣泛設計於彩繪人孔蓋（マンホールの蓋）、消防栓與路旁指示牌。';
    } else if (municipality.iso2 === 'US') {
      metaTip = '美國各郡（County）常設有藍底黃字的五角形郡道盾牌（County Route），且地方治安官（County Sheriff）巡邏車與路牌角標會標註郡名。';
    } else if (municipality.iso2 === 'FR') {
      metaTip = '法國各省（Département）的省道以 D 開頭（黃頂路標如 D906），且法國 5 碼郵遞區號的前兩碼即對應省份編號（01~95）。';
    } else if (municipality.iso2 === 'DE') {
      metaTip = '德國各縣市（Landkreis / Kreisfreie Stadt）擁有專屬的 1~3 位車牌前綴字母（大城市多為單字母如 B 柏林、M 慕尼黑，周邊郡縣多為雙或三字母）。';
    } else if (municipality.iso2 === 'IT') {
      metaTip = '義大利各省（Provincia）擁有標準的兩位字母縮寫（如 RM 羅馬、MI 米蘭、NA 那不勒斯、FI 佛羅倫斯），常見於地址與車牌右側藍條。';
    } else if (municipality.iso2 === 'ES') {
      metaTip = '西班牙各省（Provincia）的地方公路常以省份縮寫開頭（如 M 馬德里、B 巴塞隆納、SE 塞維亞），郵遞區號前兩碼亦對應省份編號。';
    } else if (municipality.iso2 === 'PL') {
      metaTip = '波蘭各縣（Powiat）在車牌前綴中以第 1 字母代表省份（Województwo），第 2～3 字母代表所屬縣市（如 DW 弗羅茨瓦夫、KR 克拉科夫）。';
    }

    return (
      <aside className="country-drawer">
        <div className="drawer-header">
          <div className="drawer-country-title">
            <span className="drawer-flag" role="img" aria-label="city">{flag}</span>
            <div>
              <div className="drawer-name-zh">{municipality.pref} · {municipality.city}</div>
              <div className="drawer-name-en">
                {countryNameZh ? `${countryNameZh} · ` : ''}{unitType} · 代碼：{municipality.code || municipality.city}
              </div>
            </div>
          </div>
          <div className="drawer-header-actions">
            <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-content">
          {/* Breadcrumbs Navigation */}
          <div className="drawer-breadcrumbs">
            <span
              className="drawer-breadcrumb-link"
              onClick={() => {
                const c = findCountry(municipality.iso2 || 'JP');
                if (c && onNavigateToCountry) onNavigateToCountry(c);
              }}
              title={`查看 ${countryNameZh || '國家'} 國家情報`}
            >
              {isJapan ? '🇯🇵' : (municipality.countryFlag || '🌐')} {countryNameZh || (isJapan ? '日本' : '國家')}
            </span>
            <span className="drawer-breadcrumb-sep">›</span>
            <span
              className="drawer-breadcrumb-link"
              onClick={onNavigateBack}
              title={`查看 ${parentL2Name} 行政區情報`}
            >
              {parentL2Name}
            </span>
            <span className="drawer-breadcrumb-sep">›</span>
            <span className="drawer-breadcrumb-current">{municipality.city}</span>
            {onNavigateBack && (
              <button
                className="drawer-breadcrumb-back-btn"
                onClick={onNavigateBack}
                title={`回上一頁：${parentL2Name}`}
              >
                <ChevronLeft size={13} />
                <span>回上一頁</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <div
              className="intel-tag highlight"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                borderColor: '#f59e0b',
                color: '#fbbf24',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px'
              }}
            >
              <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
              {municipality.pref}
            </div>

            <div
              className="intel-tag"
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                borderColor: 'rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px'
              }}
            >
              🏛️ {unitType}
            </div>

            {municipality.code && (
              <div className="intel-tag" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '4px 10px' }}>
                代碼：{municipality.code}
              </div>
            )}
          </div>

          <div className="intel-card">
            <div className="intel-card-header">
              <Shield size={16} color="#38bdf8" />
              <span style={{ color: '#38bdf8' }}>行政區劃詳細情報 (Subdivision Info)</span>
            </div>
            <div className="intel-card-body">
              {countryNameZh && (
                <>
                  <strong>所屬國家：</strong>{countryNameZh} ({countryNameEn})<br />
                </>
              )}
              <strong>上級行政區 (L2)：</strong>{municipality.pref}<br />
              {municipality.gun && <><strong>所屬郡／支廳：</strong>{municipality.gun}<br /></>}
              <strong>本級區域名稱 (L3)：</strong>{municipality.city}<br />
              <strong>行政單位級別：</strong>{unitType}<br />
              {municipality.code && (
                <>
                  <strong>官方行政區代碼：</strong>{municipality.code}
                </>
              )}
            </div>
          </div>

          <div className="intel-card">
            <div className="intel-card-header">
              <Lightbulb size={16} color="#eab308" />
              <span style={{ color: '#facc15' }}>地方制度與生活標記 (Local Highlights)</span>
            </div>
            <div className="intel-card-body" style={{ lineHeight: 1.5 }}>
              {metaTip}
            </div>
          </div>

          {/* Dynamic L3 Municipality Markdown Lore Cards */}
          <MarkdownLoreCards
            query={{
              countryIso2: municipality.iso2,
              municipalityCode: municipality.code
            }}
          />
        </div>
      </aside>
    );
  }

  // 2b. Worldwide L2 Subdivision Detail
  if (subdivision) {
    const flag = subdivision.countryFlag || '🌐';
    const cMeta = country || findCountry(subdivision.iso2);

    return (
      <aside className="country-drawer">
        <div className="drawer-header">
          <div className="drawer-country-title">
            <span className="drawer-flag" role="img" aria-label="flag">{flag}</span>
            <div>
              <div className="drawer-name-zh">{subdivision.nameZh}</div>
              <div className="drawer-name-en">
                {subdivision.nameEn && subdivision.nameEn !== subdivision.nameZh ? `${subdivision.nameEn} · ` : ''}
                {subdivision.countryNameZh} ({subdivision.countryName}) · {subdivision.typeEn || '一級行政區'}
              </div>
            </div>
          </div>
          <div className="drawer-header-actions">
            <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-content">
          {/* Breadcrumbs Navigation */}
          <div className="drawer-breadcrumbs">
            <span
              className="drawer-breadcrumb-link"
              onClick={onNavigateBack}
              title={`查看 ${subdivision.countryNameZh} 國家情報`}
            >
              {subdivision.countryFlag || '🌐'} {subdivision.countryNameZh}
            </span>
            <span className="drawer-breadcrumb-sep">›</span>
            <span className="drawer-breadcrumb-current">{subdivision.nameZh}</span>
            {onNavigateBack && (
              <button
                className="drawer-breadcrumb-back-btn"
                onClick={onNavigateBack}
                title={`回上一頁：${subdivision.countryNameZh}`}
              >
                <ChevronLeft size={13} />
                <span>回上一頁</span>
              </button>
            )}
          </div>

          {/* Quick Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <div
              className="intel-tag highlight"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: '#10b981',
                color: '#34d399',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px'
              }}
            >
              🏛️ {subdivision.typeEn || '一級行政區'}
            </div>

            {subdivision.code && (
              <div
                className="intel-tag"
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px'
                }}
              >
                代碼：#{subdivision.code}
              </div>
            )}

            {subdivision.postal && (
              <div
                className="intel-tag"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  color: '#fbbf24',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px'
                }}
              >
                📮 郵遞簡碼：{subdivision.postal}
              </div>
            )}

            {(() => {
              const domCode = getSubdivisionAreaCode(subdivision.iso2, subdivision);
              if (!domCode) return null;
              return (
                <div
                  className="intel-tag"
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    borderColor: 'rgba(34, 197, 94, 0.4)',
                    color: '#4ade80',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px'
                  }}
                >
                  📞 國內區碼：{domCode}
                </div>
              );
            })()}

            <div className="intel-tag" style={{ fontSize: 12, padding: '4px 10px' }}>
              🌐 {subdivision.countryNameZh} ({subdivision.iso2})
            </div>
          </div>

          {/* Dynamic Markdown Lore & Dossier Cards */}
          <MarkdownLoreCards
            query={{
              countryIso2: subdivision.iso2,
              subdivisionCode: subdivision.code,
              subdivisionId: subdivision.id
            }}
          />

          {/* Region / Country Intel if available */}
          {cMeta && (
            <>
              {/* Driving & Coverage */}
              <div className="intel-grid">
                <div className="intel-card">
                  <div className="intel-card-header">
                    <Navigation size={16} />
                    <span>通行方向 (Driving Side)</span>
                  </div>
                  <div className="intel-card-body">
                    <span className="badge-highlight">
                      {cMeta.drivingSide === 'left' ? '🚗 左側通行 (Left-hand Drive)' : '🚙 右側通行 (Right-hand Drive)'}
                    </span>
                  </div>
                </div>

                <div className="intel-card">
                  <div className="intel-card-header">
                    <Car size={16} />
                    <span>街景車鏡頭 (Camera Gen)</span>
                  </div>
                  <div className="intel-card-body">
                    <div className="intel-tag-row">
                      {cMeta.cameraGens.map((gen) => (
                        <span key={gen} className="intel-tag">
                          {gen}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* License Plate info */}
              <div className="intel-card">
                <div className="intel-card-header">
                  <Car size={16} color="#ec4899" />
                  <span style={{ color: '#f472b6' }}>國家車牌特徵 (License Plates)</span>
                </div>
                <div className="intel-card-body">{cMeta.plateDesc}</div>
              </div>

              {/* Road lines & Street view car */}
              <div className="intel-card">
                <div className="intel-card-header">
                  <Shield size={16} color="#38bdf8" />
                  <span style={{ color: '#38bdf8' }}>標線與車載特徵 (Road Lines & Car Meta)</span>
                </div>
                <div className="intel-card-body">
                  <div><strong>道路標線：</strong>{cMeta.roadLinesDesc}</div>
                  <div style={{ marginTop: 6 }}><strong>車載特徵：</strong>{cMeta.carMetaDesc}</div>
                </div>
              </div>

              {/* Utility Poles & Bollards */}
              <div className="intel-card">
                <div className="intel-card-header">
                  <Lightbulb size={16} color="#facc15" />
                  <span style={{ color: '#facc15' }}>電線桿與護欄防撞桿 (Poles & Bollards)</span>
                </div>
                <div className="intel-card-body">
                  <div><strong>電線桿：</strong>{cMeta.poleDesc}</div>
                  <div style={{ marginTop: 6 }}><strong>防撞桿：</strong>{cMeta.bollardDesc}</div>
                </div>
              </div>

              {/* India State-Level Language & Script Meta */}
              {subdivision.iso2 === 'IN' && (() => {
                const stateInfo = getIndiaStateLanguageInfo(subdivision.code || subdivision.nameEn || subdivision.nameZh);
                if (!stateInfo) return null;
                return (
                  <div
                    className="intel-card"
                    style={{
                      borderColor: 'rgba(168, 85, 247, 0.45)',
                      backgroundColor: 'rgba(168, 85, 247, 0.08)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    <div className="intel-card-header">
                      <span style={{ fontSize: 16 }}>🇮🇳</span>
                      <span style={{ color: '#c084fc', fontWeight: 700 }}>
                        {stateInfo.nameZh} 官方語言與文字辨識 (State Script Meta)
                      </span>
                    </div>
                    <div className="intel-card-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
                      <div><strong>官方語言：</strong>{stateInfo.officialLanguages.join('、')}</div>
                      <div><strong>主導字型：</strong>{stateInfo.primaryScript}</div>
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong>文字樣例：</strong>
                        <span
                          style={{
                            fontSize: 16,
                            color: '#38bdf8',
                            fontWeight: 700,
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            padding: '2px 8px',
                            borderRadius: 4
                          }}
                        >
                          {stateInfo.scriptNativeSample}
                        </span>
                      </div>
                      {stateInfo.sampleSentence && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
                          <strong>政府/公營標牌：</strong>{stateInfo.sampleSentence}
                        </div>
                      )}
                      <div style={{ marginTop: 8, color: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.1)', padding: '6px 10px', borderRadius: 6 }}>
                        <strong>💡 文字與地方風貌：</strong>{stateInfo.scriptTipsZh}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Key Hints */}
              {cMeta.keyHints && cMeta.keyHints.length > 0 && (
                <div className="intel-card" style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                  <div className="intel-card-header">
                    <Lightbulb size={16} color="#38bdf8" />
                    <span>國家地景與人文特色 (Regional Highlights)</span>
                  </div>
                  <ul className="hints-list">
                    {cMeta.keyHints.map((hint, idx) => (
                      <li key={idx} className="hint-item">
                        {hint}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    );
  }

  // 3. Country Detail (L1)
  if (!country) return null;

  return (
    <aside className="country-drawer">
      {/* Drawer Header */}
      <div className="drawer-header">
        <div className="drawer-country-title">
          <span className="drawer-flag">{country.flag}</span>
          <div>
            <div className="drawer-name-zh">{country.nameZh}</div>
            <div className="drawer-name-en">
              {country.name} · {country.iso2} ({country.region} / {country.continent})
            </div>
          </div>
        </div>
        <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
          <X size={20} />
        </button>
      </div>

      {/* Drawer Body Content */}
      <div className="drawer-content">
        {/* Breadcrumbs Navigation */}
        <div className="drawer-breadcrumbs">
          <span className="drawer-breadcrumb-current">
            {country.flag} {country.nameZh} ({country.name}) · {country.continent} / {country.region}
          </span>
        </div>

        {/* Core Quick Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <div
            className={`intel-tag highlight`}
            style={{
              backgroundColor: country.drivingSide === 'left' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              borderColor: country.drivingSide === 'left' ? '#f59e0b' : '#3b82f6',
              color: country.drivingSide === 'left' ? '#f59e0b' : '#60a5fa',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px'
            }}
          >
            {country.drivingSide === 'left' ? '🚗 靠左行駛 (Left Drive)' : '🚙 靠右行駛 (Right Drive)'}
          </div>

          <div
            className="intel-tag"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px'
            }}
          >
            {country.coverage === 'official' ? '✅ 官方車載街景覆蓋' : '⚠️ 局部或特殊覆蓋'}
          </div>

          {(getCountryTld(country.iso2) || country.tld) && (
            <div className="intel-tag" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '4px 10px' }}>
              網域名稱：{getCountryTld(country.iso2) || country.tld}
            </div>
          )}

          {(country.callingCode || getCountryCallingCode(country.iso2)) && (
            <div className="intel-tag" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '4px 10px', color: '#34d399' }}>
              電話國碼：{country.callingCode || getCountryCallingCode(country.iso2)}
            </div>
          )}
        </div>

        {/* Dynamic Markdown Lore & Dossier Cards */}
        <MarkdownLoreCards
          query={{
            countryIso2: country.iso2
          }}
        />

        {/* Regional Highlights */}
        {country.keyHints && country.keyHints.length > 0 && (
          <div className="intel-card" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', backgroundColor: 'rgba(14, 25, 42, 0.6)' }}>
            <div className="intel-card-header">
              <Lightbulb size={16} color="#38bdf8" />
              <span>代表性地景與人文特色 (Regional Highlights)</span>
            </div>
            <ul className="hints-list">
              {country.keyHints.map((hint, idx) => (
                <li key={idx} className="hint-item">
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Street View Camera & Vehicle Info */}
        <div className="intel-card">
          <div className="intel-card-header">
            <Car size={16} color="#ec4899" />
            <span style={{ color: '#f472b6' }}>街景拍攝車與設備紀錄 (Street View Equipment)</span>
          </div>
          <div className="intel-card-body">{country.carMetaDesc}</div>
          <div className="intel-tag-row">
            {country.cameraGens.map((gen) => (
              <span key={gen} className="intel-tag">
                📷 {gen.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        {/* License Plate Intel */}
        <div className="intel-card">
          <div className="intel-card-header">
            <Shield size={16} color="#eab308" />
            <span style={{ color: '#facc15' }}>車牌格式與特徵 (License Plates)</span>
          </div>
          <div className="intel-card-body">{country.plateDesc}</div>
        </div>

        {/* Poles & Infrastructure */}
        {(country.poleDesc || country.bollardDesc) && (
          <div className="intel-card">
            <div className="intel-card-header">
              <Layers size={16} color="#14b8a6" />
              <span style={{ color: '#2dd4bf' }}>電線桿與道路設施 (Poles & Infrastructure)</span>
            </div>
            {country.poleDesc && <div className="intel-card-body">{country.poleDesc}</div>}
            {country.bollardDesc && (
              <div style={{ marginTop: country.poleDesc ? 6 : 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                <strong>🚧 防撞警示柱 (Bollards)：</strong>
                {country.bollardDesc}
              </div>
            )}
          </div>
        )}

        {/* Road Markings */}
        <div className="intel-card">
          <div className="intel-card-header">
            <Navigation size={16} color="#38bdf8" />
            <span style={{ color: '#38bdf8' }}>道路中央標線 (Road Markings)</span>
          </div>
          <div className="intel-card-body">{country.roadLinesDesc}</div>
        </div>

        {/* Language & Culture */}
        <div className="intel-card">
          <div className="intel-card-header">
            <Globe size={16} color="#a855f7" />
            <span style={{ color: '#c084fc' }}>語言與文字 (Language & Script)</span>
          </div>
          <div className="intel-card-body">
            <div>{country.language}</div>
            {(() => {
              const langMeta = getCountryLanguageMeta(country.iso2);
              if (!langMeta) return null;
              return (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span className="intel-tag" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                      字系：{langMeta.scriptFamily}
                    </span>
                    <span className="intel-tag" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                      母語字樣：{langMeta.nativeSample}
                    </span>
                  </div>
                  {langMeta.distinctiveLetters && langMeta.distinctiveLetters.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>特徵字母：</span>
                      {langMeta.distinctiveLetters.map((l) => (
                        <span
                          key={l}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 13,
                            fontWeight: 700,
                            padding: '1px 6px',
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            borderRadius: 4,
                            color: '#38bdf8'
                          }}
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 8, color: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.1)', padding: '6px 10px', borderRadius: 6, fontSize: 12, lineHeight: 1.5 }}>
                    <strong>💡 文字與書寫特徵：</strong>{langMeta.geoGuessrMetaZh}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Confused With */}
        {country.confusedWith && country.confusedWith.length > 0 && (
          <div className="intel-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div className="intel-card-header">
              <AlertCircle size={16} color="#f87171" />
              <span style={{ color: '#f87171' }}>容易混淆的國家 (Confused With)</span>
            </div>
            <div className="intel-tag-row">
              {country.confusedWith.map((cName) => (
                <button
                  key={cName}
                  className="confused-country-btn"
                  onClick={() => onSelectCountryName && onSelectCountryName(cName)}
                >
                  {cName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
});
