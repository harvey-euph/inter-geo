import React from 'react';
import { X, Navigation, Car, Shield, Lightbulb, Globe, Layers, AlertCircle } from 'lucide-react';
import type { CountryData } from '../types/geo';

interface CountryDetailPanelProps {
  country: CountryData | null;
  onClose: () => void;
  onSelectCountryName?: (name: string) => void;
}

export const CountryDetailPanel: React.FC<CountryDetailPanelProps> = ({
  country,
  onClose,
  onSelectCountryName
}) => {
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
        <div className="intel-card">
          <div className="intel-card-header">
            <Layers size={16} color="#14b8a6" />
            <span style={{ color: '#2dd4bf' }}>電線桿與道路設施 (Poles & Infrastructure)</span>
          </div>
          <div className="intel-card-body">{country.poleDesc}</div>
          {country.bollardDesc && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong>🚧 防撞警示柱 (Bollards)：</strong>
              {country.bollardDesc}
            </div>
          )}
        </div>

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
                  className="intel-tag"
                  style={{ cursor: 'pointer', background: '#262f3f', color: '#fca5a5' }}
                  onClick={() => onSelectCountryName && onSelectCountryName(cName)}
                  title={`切換至 ${cName}`}
                >
                  ⚔️ {cName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
