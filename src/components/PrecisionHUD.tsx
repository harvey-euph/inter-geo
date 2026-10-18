import React, { useState, useRef } from 'react';
import { Layers, ZoomIn, MapPin, SlidersHorizontal, Lock } from 'lucide-react';
import { LOD_THRESHOLDS, type LODLevel } from '../types/lod';

interface PrecisionHUDProps {
  currentLOD: LODLevel;
  currentZoomK: number;
  maxLOD: LODLevel;
  onSetMaxLOD: (level: LODLevel) => void;
  onJumpToLOD: (level: LODLevel) => void;
  onZoomChange: (targetK: number) => void;
}

export const PrecisionHUD: React.FC<PrecisionHUDProps> = ({
  currentLOD,
  currentZoomK,
  maxLOD,
  onSetMaxLOD,
  onJumpToLOD,
  onZoomChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const currentThreshold = LOD_THRESHOLDS.find((t) => t.level === currentLOD) || LOD_THRESHOLDS[0];

  // Calculate percentage of zoom scale within [1.0, 14.0]
  const zoomPercent = Math.min(
    100,
    Math.max(0, ((currentZoomK - 1.0) / (14.0 - 1.0)) * 100)
  );

  const updateZoomFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const targetK = Number((1.0 + ratio * (14.0 - 1.0)).toFixed(1));
    onZoomChange(targetK);
  };

  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateZoomFromPointer(e.clientX);
  };

  const handleThumbPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle track click if not dragging
    if (isDragging) return;
    updateZoomFromPointer(e.clientX);
  };

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

      {/* LOD Tier Jump Buttons */}
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
              title={`點擊快速跳轉至 ${t.labelZh} 視野`}
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

      {/* Draggable Continuous Zoom & Level Slider Bar */}
      <div className="precision-gauge-container">
        <div className="precision-slider-header">
          <div className="precision-slider-label">
            <SlidersHorizontal size={11} color="var(--text-muted)" />
            <span>滑動調節倍率：</span>
          </div>
          <span className="precision-slider-val" style={{ color: currentThreshold.color }}>
            {currentZoomK.toFixed(1)}×
          </span>
        </div>

        {/* Track: Clicking anywhere jumps/snaps cleanly */}
        <div
          ref={trackRef}
          className="precision-gauge-track"
          onClick={handleTrackClick}
          title="點擊軌道跳轉倍率，或拖動圓形滑塊"
        >
          {/* Active Fill */}
          <div
            className="precision-gauge-fill"
            style={{
              width: `${zoomPercent}%`,
              backgroundColor: currentThreshold.color,
              boxShadow: `0 0 10px ${currentThreshold.color}88`
            }}
          />

          {/* Interactive Drag Handle Thumb (專屬拖動對象) */}
          <div
            className={`precision-gauge-thumb ${isDragging ? 'dragging' : ''}`}
            style={{
              left: `${zoomPercent}%`,
              borderColor: currentThreshold.color,
              color: currentThreshold.color
            }}
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={handleThumbPointerUp}
            onPointerCancel={handleThumbPointerUp}
            title="拖動滑塊調整倍率"
          >
            <div className="thumb-grip-dot" />
          </div>

          {/* Threshold Boundary Visual Markers */}
          <div
            className="gauge-marker"
            style={{ left: '16.92%' }}
            title="L2 門檻 (3.2x)"
          />
          <div
            className="gauge-marker"
            style={{ left: '42.31%' }}
            title="L3 門檻 (6.5x)"
          />
        </div>

        {/* Level 倍率切換按鈕 (清楚好按，不干擾拖動) */}
        <div className="precision-snap-row">
          <button
            type="button"
            className={`precision-snap-chip ${currentLOD === 'L1' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onZoomChange(1.0);
            }}
            title="點擊切換至 L1 初始倍率 (1.0x)"
          >
            <span className="snap-chip-dot" style={{ backgroundColor: '#38bdf8' }} />
            <span>1.0× (L1)</span>
          </button>

          <button
            type="button"
            className={`precision-snap-chip ${currentLOD === 'L2' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onZoomChange(3.2);
            }}
            title="點擊切換至 L2 都道府縣門檻 (3.2x)"
          >
            <span className="snap-chip-dot" style={{ backgroundColor: '#10b981' }} />
            <span>3.2× (L2)</span>
          </button>

          <button
            type="button"
            className={`precision-snap-chip ${currentLOD === 'L3' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onZoomChange(6.5);
            }}
            title="點擊切換至 L3 市區町村門檻 (6.5x)"
          >
            <span className="snap-chip-dot" style={{ backgroundColor: '#f59e0b' }} />
            <span>6.5× (L3)</span>
          </button>

          <button
            type="button"
            className="precision-snap-chip"
            onClick={(e) => {
              e.stopPropagation();
              onZoomChange(14.0);
            }}
            title="點擊切換至最大縮放倍率 (14.0x)"
          >
            <span>14.0×</span>
          </button>
        </div>
      </div>

      {/* Max Allowed LOD Setting (我想看到的最細層級) */}
      <div className="precision-max-section">
        <div className="precision-section-label">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Lock size={11} color="var(--text-muted)" />
            <span>最細顯示層級限制：</span>
          </div>
          <span className="precision-max-hint">
            {maxLOD === 'L3' && '可切至市町村'}
            {maxLOD === 'L2' && '停在都道府縣'}
            {maxLOD === 'L1' && '僅保留國家'}
          </span>
        </div>
        <div className="precision-max-pills">
          {(['L1', 'L2', 'L3'] as LODLevel[]).map((lvl) => {
            const isSelected = maxLOD === lvl;
            const threshold = LOD_THRESHOLDS.find((t) => t.level === lvl);
            return (
              <button
                key={lvl}
                className={`max-lod-btn ${isSelected ? 'active' : ''}`}
                style={{
                  borderColor: isSelected ? threshold?.color : 'rgba(255, 255, 255, 0.1)',
                  backgroundColor: isSelected ? `${threshold?.color}25` : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)'
                }}
                onClick={() => onSetMaxLOD(lvl)}
                title={`將地圖最細層級限制為 ${lvl} (${threshold?.labelZh})，放大時不會切入更細行政區`}
              >
                <span
                  className="max-lod-dot"
                  style={{
                    backgroundColor: threshold?.color,
                    boxShadow: isSelected ? `0 0 6px ${threshold?.color}` : 'none'
                  }}
                />
                <span className="max-lod-name">
                  {lvl} {lvl === 'L1' ? '國家' : lvl === 'L2' ? '都道府縣' : '市町村'}
                </span>
              </button>
            );
          })}
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
