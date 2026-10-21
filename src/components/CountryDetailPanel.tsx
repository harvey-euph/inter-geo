import React from 'react';
import { X, Navigation, Car, Shield, Lightbulb, Globe, Layers, AlertCircle, Phone, MapPin, Search, Compass } from 'lucide-react';
import type { CountryData } from '../types/geo';
import type { PrefectureDetail, MunicipalityDetail, L2SubdivisionDetail } from '../types/lod';
import type { RoadPathData } from './WorldMap';
import { getCountryCallingCode } from '../data/globalFilters';
import { getSubdivisionAreaCode } from '../data/domesticAreaCodes';
import { getCrossingSign } from '../data/pedestrianCrossing';
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
  onSelectCountryName?: (name: string) => void;
  onZoomToPrefecture?: (prefId: number) => void;
}

export const CountryDetailPanel: React.FC<CountryDetailPanelProps> = ({
  country,
  subdivision,
  prefecture,
  municipality,
  road,
  onClose,
  onSelectCountryName,
  onZoomToPrefecture
}) => {
  // 0. Highway & Route Detail (Roads Mode)
  if (road) {
    const isInterstate = road.class === 'Interstate';
    const num = parseInt(road.number, 10);
    const hasNum = !isNaN(num);
    const isEven = hasNum && num % 2 === 0;
    const isOdd = hasNum && num % 2 !== 0;
    const isMajor = hasNum && road.number.length <= 2 && (num % 5 === 0 || num % 10 === 0);
    const isAuxiliary = hasNum && road.number.length === 3;
    const firstDigit = isAuxiliary ? parseInt(road.number[0], 10) : 0;
    const isBeltway = isAuxiliary && firstDigit % 2 === 0;

    let numberingRule: string;
    let locationClue: string;
    if (isInterstate) {
      if (isEven) {
        numberingRule = '偶數編號為東西走向 (East-West)。全美號碼自南向北遞增（I-10 橫貫最南方美墨邊界/墨西哥灣，I-90 橫貫最北方加拿大邊界）。';
        if (num <= 20) locationClue = '號碼偏小（如 I-10, I-20）：位於美國南部陽光地帶（加州、德州、佛羅里達等）。';
        else if (num <= 40) locationClue = '號碼居中（如 I-40）：橫貫美國南部偏中帶（北卡、田納西、奧克拉荷馬、新墨西哥、亞利桑那）。';
        else if (num <= 70) locationClue = '號碼偏中上（如 I-70）：橫貫美國心臟地帶（馬里蘭、俄亥俄、堪薩斯、科羅拉多、猶他）。';
        else locationClue = '號碼偏大（如 I-80, I-90, I-94）：橫貫美國中北部及五大湖區（紐約、芝加哥、明尼蘇達、華盛頓州西雅圖）。';
      } else {
        numberingRule = '奇數編號為南北走向 (North-South)。全美號碼自西向東遞增（I-5 緊貼西海岸太平洋，I-95 緊貼東海岸大西洋）。';
        if (num <= 15) locationClue = '號碼偏小（如 I-5, I-15）：縱貫美國西部與太平洋沿岸（加州、奧勒岡、華盛頓州、內華達、猶他）。';
        else if (num <= 35) locationClue = '號碼居中（如 I-25, I-35）：縱貫大平原與中西部（德州、堪薩斯、內布拉斯加、新墨西哥）。';
        else if (num <= 65) locationClue = '號碼偏中東（如 I-55, I-65, I-75）：縱貫密西西比河流域至五大湖（芝加哥、印第安納、肯塔基、田納西、阿拉巴馬）。';
        else locationClue = '號碼偏大（如 I-85, I-95）：縱貫美國大西洋東海岸（波士頓、紐約、費城、DC、北卡、佛羅里達）。';
      }
    } else {
      if (isEven) {
        numberingRule = '偶數編號為東西走向 (East-West)。重要：國道號碼走向與州際相反！號碼自北向南遞增（US 2 沿加拿大邊境，US 90/98 位於最南端墨西哥灣）。';
        if (num <= 30) locationClue = '號碼偏小（如 US 2, US 20, US 30）：位於美國中北部偏向加拿大與五大湖。';
        else if (num <= 60) locationClue = '號碼居中（如 US 40, US 50, US 60）：橫貫美國中部俄亥俄河流域至內華達沙漠。';
        else locationClue = '號碼偏大（如 US 80, US 90, US 98）：位於美國南部墨西哥灣沿岸與美墨邊界。';
      } else {
        numberingRule = '奇數編號為南北走向 (North-South)。重要：國道號碼走向與州際相反！號碼自東向西遞增（US 1 沿大西洋東岸，US 101 沿太平洋西岸）。';
        if (num <= 31) locationClue = '號碼偏小（如 US 1, US 13, US 17, US 23）：緊貼美國東海岸大西洋與新英格蘭地區。';
        else if (num <= 61) locationClue = '號碼居中（如 US 31, US 41, US 51, US 61）：縱貫美國中西部密西西比河流域（如經典藍調公路 US 61）。';
        else locationClue = '號碼偏大（如 US 75, US 83, US 95, US 101）：縱貫美國大平原以西至太平洋沿岸（US 101 為西海岸經典風景線）。';
      }
    }

    let auxClue = '';
    if (isAuxiliary) {
      if (isBeltway) {
        auxClue = `三位數首位為偶數 (${firstDigit})：此為「環城公路或雙頭聯絡道 (Loop / Beltway)」，兩端皆銜接母幹線 I-${road.number.slice(1)}，通常環繞大都會區（如洛杉磯 I-405、亞特蘭大 I-285）。`;
      } else {
        auxClue = `三位數首位為奇數 (${firstDigit})：此為「單頭分支支線 (Spur Route)」，僅有一端銜接母幹線 I-${road.number.slice(1)}，通常深入市中心、港口或機場（如舊金山 I-280 支線、DC I-395）。`;
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
                background: isInterstate ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff',
                boxShadow: isInterstate ? '0 0 12px rgba(56, 189, 248, 0.45)' : '0 0 12px rgba(251, 191, 36, 0.45)',
                letterSpacing: 0.5
              }}
            >
              {road.name}
            </span>
            <div>
              <div className="drawer-name-zh">
                {road.name} · {isInterstate ? '美國州際公路' : '美國國道系統'}
              </div>
              <div className="drawer-name-en">
                {isInterstate ? 'Dwight D. Eisenhower Interstate System' : 'U.S. Numbered Highway System'}
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-content">
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
              🛣️ {isInterstate ? '州際高速公路' : '聯邦國道系統'}
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
          </div>

          {/* Numbering Grid Rule */}
          <div className="intel-card" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', backgroundColor: 'rgba(14, 25, 42, 0.6)' }}>
            <div className="intel-card-header">
              <Compass size={16} color="#38bdf8" />
              <span>全美號碼走向網格法則 (Grid Orientation)</span>
            </div>
            <div className="intel-card-body" style={{ color: '#e2e8f0', lineHeight: 1.5 }}>
              {numberingRule}
            </div>
          </div>

          {/* Location Clue */}
          {locationClue && (
            <div className="intel-card">
              <div className="intel-card-header">
                <MapPin size={16} color="#4ade80" />
                <span style={{ color: '#4ade80' }}>全美地理區間速查 (Geographic Corridor)</span>
              </div>
              <div className="intel-card-body" style={{ fontSize: 13, lineHeight: 1.5 }}>
                {locationClue}
              </div>
            </div>
          )}

          {/* 3-digit Auxiliary Clue */}
          {auxClue && (
            <div className="intel-card">
              <div className="intel-card-header">
                <Layers size={16} color="#c084fc" />
                <span style={{ color: '#c084fc' }}>三位數支線判讀密技 (3-Digit Auxiliary)</span>
              </div>
              <div className="intel-card-body" style={{ fontSize: 13, lineHeight: 1.5 }}>
                {auxClue}
              </div>
            </div>
          )}

          {/* GeoGuessr Street View Meta */}
          <div className="intel-card">
            <div className="intel-card-header">
              <Lightbulb size={16} color="#facc15" />
              <span style={{ color: '#facc15' }}>GeoGuessr 實戰秒殺密技 (Street View Meta)</span>
            </div>
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
          </div>

          {/* Dynamic Highway Markdown Lore Cards */}
          <MarkdownLoreCards
            query={{
              roadName: road.name,
              roadClass: road.class
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
          <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-content">
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

          {/* Pro Hints / GeoGuessr Meta */}
          <div className="intel-card" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', backgroundColor: 'rgba(14, 25, 42, 0.6)' }}>
            <div className="intel-card-header">
              <Lightbulb size={16} color="#38bdf8" />
              <span>都道府縣實戰秒殺重點 (Prefecture Clues)</span>
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
              日本路標、商店招牌、電線桿黃牌上的市外電話號碼是快速鎖定都道府縣的神技！
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
    const unitType = municipality.typeEn || (isJapan ? '市區町村' : '二級行政區');

    let metaTip = '此區域已達 L3 最高精度層級。可觀察路口路牌、巴士站牌、市政設施或路標進行精準定位！';
    if (isJapan) {
      metaTip = '日本 L3 實戰密技：觀察路口反光鏡、巴士站牌、消防栓、水溝蓋（人孔蓋 マンホールの蓋）上的自治體市徽／町徽可秒殺精確城鎮！';
    } else if (municipality.iso2 === 'US') {
      metaTip = '美國郡級實戰密技：注意郡道五角形盾牌（County Route 如 CR 12）、路名牌角標上的郡名縮寫、警車上的 Sheriff 字樣，以及德州農場公路 (FM/RM)！';
    } else if (municipality.iso2 === 'FR') {
      metaTip = '法國省級實戰密技：省道編號（D開頭黃牌如 D906）、黃色郵筒 (La Poste) 上的 5 碼郵遞區號，前兩碼即為省份編號 (01~95)！';
    } else if (municipality.iso2 === 'DE') {
      metaTip = '德國縣轄郡實戰密技：車牌前綴 1~3 位字母直接代表所屬 Landkreis 或直轄市（單字母為大城如 B 柏林、M 慕尼黑；多字母為周邊郡縣）！';
    } else if (municipality.iso2 === 'IT') {
      metaTip = '義大利省級實戰密技：觀察歐盟車牌右側藍條上的兩位省份縮寫（如 RM 羅馬、MI 米蘭、NA 那不勒斯、FI 佛羅倫斯）！';
    } else if (municipality.iso2 === 'ES') {
      metaTip = '西班牙省級實戰密技：國道省道編號（如 M-30 馬德里、B-10 巴塞隆納、SE-30 塞維亞），以及郵遞區號前兩碼即為省份代碼！';
    } else if (municipality.iso2 === 'PL') {
      metaTip = '波蘭縣級實戰密技：車牌首字母為省份代碼，第二／三字母直接對應 Powiat 縣份縮寫（如 DW 弗羅茨瓦夫、KR 克拉科夫）！';
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
          <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-content">
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
              <span style={{ color: '#facc15' }}>GeoGuessr L3 實戰秒殺密技</span>
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
          <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-content">
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

              {/* European Pedestrian Crossing Sign */}
              {(() => {
                const sign = getCrossingSign(subdivision.iso2);
                if (!sign) return null;
                return (
                  <div
                    className="intel-card"
                    style={{
                      borderColor: 'rgba(56, 189, 248, 0.45)',
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    <div className="intel-card-header">
                      <span style={{ fontSize: 16 }}>🚸</span>
                      <span style={{ color: '#38bdf8' }}>國家行人穿越道告示 (Pedestrian Crossing Sign)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
                      <div
                        style={{
                          width: 68,
                          height: 68,
                          minWidth: 68,
                          borderRadius: 8,
                          backgroundColor: 'rgba(2, 6, 23, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                        }}
                      >
                        <img
                          src={sign.imagePath}
                          alt={`${sign.nameZh} 行人穿越道告示牌`}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>
                          {sign.nameZh}（{sign.nameEn}）
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>
                          {sign.descriptionZh}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {sign.stripes > 0 ? (
                            <span className="intel-tag" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                              斑馬線：{sign.stripes} 條
                            </span>
                          ) : (
                            <span className="intel-tag" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                              地面標記：{sign.iso2 === 'PL' ? '白色橫道實線' : '水平虛線/點狀標記'}
                            </span>
                          )}
                          <span className="intel-tag" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                            行人方向：{sign.direction === 'left' ? '向左走 🚶‍♂️' : '向右走 🚶‍♂️'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                        <strong>💡 GeoGuessr 辨識要訣：</strong>{stateInfo.scriptTipsZh}
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
                    <span>GeoGuessr 秒殺要訣 (Key Hints)</span>
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

          {country.tld && (
            <div className="intel-tag" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '4px 10px' }}>
              網域名稱：{country.tld}
            </div>
          )}

          {(country.callingCode || getCountryCallingCode(country.iso2)) && (
            <div className="intel-tag" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '4px 10px', color: '#34d399' }}>
              電話國碼：{country.callingCode || getCountryCallingCode(country.iso2)}
            </div>
          )}
        </div>

        {/* European Pedestrian Crossing Sign */}
        {(() => {
          const sign = getCrossingSign(country.iso2);
          if (!sign) return null;
          return (
            <div
              className="intel-card"
              style={{
                borderColor: 'rgba(56, 189, 248, 0.45)',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div className="intel-card-header">
                <span style={{ fontSize: 16 }}>🚸</span>
                <span style={{ color: '#38bdf8' }}>行人穿越道告示 (Pedestrian Crossing Sign)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
                <div
                  style={{
                    width: 68,
                    height: 68,
                    minWidth: 68,
                    borderRadius: 8,
                    backgroundColor: 'rgba(2, 6, 23, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  <img
                    src={sign.imagePath}
                    alt={`${sign.nameZh} 行人穿越道告示牌`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>
                    {sign.nameZh}（{sign.nameEn}）
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>
                    {sign.descriptionZh}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {sign.stripes > 0 ? (
                      <span className="intel-tag" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                        斑馬線：{sign.stripes} 條
                      </span>
                    ) : (
                      <span className="intel-tag" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                        地面標記：{sign.iso2 === 'PL' ? '白色橫道實線' : '水平虛線/點狀標記'}
                      </span>
                    )}
                    <span className="intel-tag" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                      行人方向：{sign.direction === 'left' ? '向左走 🚶‍♂️' : '向右走 🚶‍♂️'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Dynamic Markdown Lore & Dossier Cards */}
        <MarkdownLoreCards
          query={{
            countryIso2: country.iso2
          }}
        />

        {/* Pro Tips / Key Clues */}
        {country.keyHints && country.keyHints.length > 0 && (
          <div className="intel-card" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', backgroundColor: 'rgba(14, 25, 42, 0.6)' }}>
            <div className="intel-card-header">
              <Lightbulb size={16} color="#38bdf8" />
              <span>實戰秒殺重點 (Pro Hints)</span>
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

        {/* Street View Car Meta */}
        <div className="intel-card">
          <div className="intel-card-header">
            <Car size={16} color="#ec4899" />
            <span style={{ color: '#f472b6' }}>街景車輛 Meta (Google Car)</span>
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
                    <strong>💡 GeoGuessr 字母秒殺：</strong>{langMeta.geoGuessrMetaZh}
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
};
