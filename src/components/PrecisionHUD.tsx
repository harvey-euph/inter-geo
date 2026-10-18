import React from 'react';
import { Layers, ZoomIn, MapPin } from 'lucide-react';
import { LOD_THRESHOLDS, type LODLevel } from '../types/lod';

interface PrecisionHUDProps {
  currentLOD: LODLevel;
  currentZoomK: number;
  onJumpToLOD: (level: LODLevel) => void;
}

export const PrecisionHUD: React.FC<PrecisionHUDProps> = ({
  currentLOD,
  currentZoomK,
  onJumpToLOD
}) => {
  const currentThreshold = LOD_THRESHOLDS.find((t) => t.level === currentLOD) || LOD_THRESHOLDS[0];

  // Calculate percentage of zoom scale within [1.0, 14.0]
  const zoomPercent = Math.min(
    100,
    Math.max(0, ((currentZoomK - 1.0) / (14.0 - 1.0)) * 100)
  );

  return (
    <div className="precision-hud">
      {/* HUD Header */}
      <div className="precision-header">
        <div className="precision-title-group">
          <Layers size={15} color={currentThreshold.color} />
          <span className="precision-title">縮放精度追蹤 (LOD)</span>
        </div>
        <div className="precision-zoom-badge" style={{ borderColor: currentThreshold.color }}>
          <ZoomIn size={12} color={currentThreshold.color} />
          <span>{currentZoomK.toFixed(1)}×</span>
        </div>
      </div>

      {/* LOD Tier Selector Pills */}
      <div className="precision-tiers">
        {LOD_THRESHOLDS.map((t) => {
          const isActive = t.level === currentLOD;
          return (
            <button
              key={t.level}
              className={`precision-tier-btn ${isActive ? 'active' : ''}`}
              style={{
                borderColor: isActive ? t.color : 'transparent',
                backgroundColor: isActive ? `${t.color}22` : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)'
              }}
              onClick={() => onJumpToLOD(t.level)}
              title={`點擊快速跳轉至 ${t.labelZh} 縮放視野`}
            >
              <span
                className="tier-dot"
                style={{
                  backgroundColor: t.color,
                  boxShadow: isActive ? `0 0 8px ${t.color}` : 'none'
                }}
              />
              <span className="tier-name">{t.level}</span>
            </button>
          );
        })}
      </div>

      {/* Active Level Description */}
      <div className="precision-desc-box">
        <div className="precision-level-title" style={{ color: currentThreshold.color }}>
          {currentThreshold.labelZh}
        </div>
        <div className="precision-level-sub">
          {currentThreshold.sublabelZh}
        </div>
      </div>

      {/* Continuous Zoom Gauge Track */}
      <div className="precision-gauge-container">
        <div className="precision-gauge-track">
          <div
            className="precision-gauge-fill"
            style={{
              width: `${zoomPercent}%`,
              backgroundColor: currentThreshold.color,
              boxShadow: `0 0 10px ${currentThreshold.color}88`
            }}
          />
          {/* Threshold Boundary Markers */}
          <div className="gauge-marker" style={{ left: '17%' }} title="L1 ➜ L2 門檻 (3.2x)" />
          <div className="gauge-marker" style={{ left: '42%' }} title="L2 ➜ L3 門檻 (6.5x)" />
        </div>
        <div className="gauge-labels">
          <span>1.0x (L1)</span>
          <span>3.2x (L2)</span>
          <span>6.5x (L3)</span>
          <span>14.0x</span>
        </div>
      </div>

      {/* Country Support Chip */}
      <div className="precision-support-chip">
        <MapPin size={11} color="#34d399" />
        <span>🇯🇵 日本已啟用 L1 ➜ L2 ➜ L3 高精細邊界</span>
      </div>
    </div>
  );
};
