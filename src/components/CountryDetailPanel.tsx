import React from 'react';
import { X, Navigation, Car, Shield, Lightbulb, Globe, Layers, AlertCircle, Phone, MapPin, Search } from 'lucide-react';
import type { CountryData } from '../types/geo';
import type { PrefectureDetail, MunicipalityDetail } from '../types/lod';

interface CountryDetailPanelProps {
  country: CountryData | null;
  prefecture?: PrefectureDetail | null;
  municipality?: MunicipalityDetail | null;
  onClose: () => void;
  onSelectCountryName?: (name: string) => void;
  onZoomToPrefecture?: (prefId: number) => void;
}

export const CountryDetailPanel: React.FC<CountryDetailPanelProps> = ({
  country,
  prefecture,
  municipality,
  onClose,
  onSelectCountryName,
  onZoomToPrefecture
}) => {
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
          <button className="close-btn" onClick={onClose} title="關閉情報卡">
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

  // 2. Municipality Detail (L3)
  if (municipality) {
    return (
      <aside className="country-drawer">
        <div className="drawer-header">
          <div className="drawer-country-title">
            <span className="drawer-flag" role="img" aria-label="city">🏙️</span>
            <div>
              <div className="drawer-name-zh">{municipality.pref} · {municipality.city}</div>
              <div className="drawer-name-en">
                {municipality.gun ? `${municipality.gun} · ` : ''}JIS 行政區編號：{municipality.code}
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} title="關閉情報卡">
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

            <div className="intel-tag" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '4px 10px' }}>
              代碼：{municipality.code}
            </div>
          </div>

          <div className="intel-card">
            <div className="intel-card-header">
              <Shield size={16} color="#38bdf8" />
              <span style={{ color: '#38bdf8' }}>市區町村行政區資訊 (Municipal Info)</span>
            </div>
            <div className="intel-card-body">
              <strong>所屬都道府縣：</strong>{municipality.pref}<br />
              {municipality.gun && <><strong>所屬郡／支廳：</strong>{municipality.gun}<br /></>}
              <strong>市區町村名：</strong>{municipality.city}<br />
              <strong>全國地方公共團體代碼 (JIS)：</strong>{municipality.code}
            </div>
          </div>

          <div className="intel-card">
            <div className="intel-card-header">
              <Lightbulb size={16} color="#eab308" />
              <span style={{ color: '#facc15' }}>GeoGuessr 市區探索建議</span>
            </div>
            <div className="intel-card-body">
              此區域已達 L3 最高精度層級。可觀察路口路牌、巴士站牌標籤、消防栓蓋或水溝蓋（人孔蓋 マンホールの蓋）上的自治體市徽／町徽進行精準定位！
            </div>
          </div>
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
        <button className="close-btn" onClick={onClose} title="關閉情報卡">
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
        </div>

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
          <div className="intel-card-body">{country.language}</div>
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
