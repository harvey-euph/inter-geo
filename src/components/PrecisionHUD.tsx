import React, { useState, useRef } from 'react';
import { Layers, ZoomIn, MapPin, SlidersHorizontal, Lock, RotateCcw } from 'lucide-react';
import { LOD_THRESHOLDS, DEFAULT_LOD_THRESHOLDS, type LODLevel, type CustomLODThresholds } from '../types/lod';

interface PrecisionHUDProps {
  currentLOD: LODLevel;
  currentZoomK: number;
  maxLOD: LODLevel;
  lodThresholds: CustomLODThresholds;
  onUpdateThresholds: (thresholds: CustomLODThresholds) => void;
  onSetMaxLOD: (level: LODLevel) => void;
  onJumpToLOD: (level: LODLevel) => void;
  onZoomChange: (targetK: number) => void;
}

export const PrecisionHUD: React.FC<PrecisionHUDProps> = ({
  currentLOD,
  currentZoomK,
  maxLOD,
  lodThresholds,
  onUpdateThresholds,
  onSetMaxLOD,
  onJumpToLOD,
  onZoomChange
}) => {
  const [activeDragTarget, setActiveDragTarget] = useState<'zoom' | 'l2' | 'l3' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const currentThreshold = LOD_THRESHOLDS.find((t) => t.level === currentLOD) || LOD_THRESHOLDS[0];

  const kToPercent = (k: number) => Math.min(100, Math.max(0, ((k - 1.0) / (14.0 - 1.0)) * 100));

  const zoomPercent = kToPercent(currentZoomK);
  const l2Percent = kToPercent(lodThresholds.l2Threshold);
  const l3Percent = kToPercent(lodThresholds.l3Threshold);

  const getKFromClientX = (clientX: number): number => {
    if (!trackRef.current) return 1.0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Number((1.0 + ratio * (14.0 - 1.0)).toFixed(1));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, target: 'zoom' | 'l2' | 'l3') => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDragTarget(target);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, target: 'zoom' | 'l2' | 'l3') => {
    if (activeDragTarget !== target) return;
    const k = getKFromClientX(e.clientX);

    if (target === 'zoom') {
      onZoomChange(k);
    } else if (target === 'l2') {
      const clampedL2 = Math.min(Math.max(1.5, k), lodThresholds.l3Threshold - 0.5);
      onUpdateThresholds({
        ...lodThresholds,
        l2Threshold: Number(clampedL2.toFixed(1))
      });
    } else if (target === 'l3') {
      const clampedL3 = Math.min(Math.max(lodThresholds.l2Threshold + 0.5, k), 13.0);
      onUpdateThresholds({
        ...lodThresholds,
        l3Threshold: Number(clampedL3.toFixed(1))
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDragTarget) {
      setActiveDragTarget(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
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

      {/* Multi-Point Draggable Slider (Thresholds + Zoom) */}
      <div className="precision-gauge-container">
        <div className="precision-slider-header">
          <div className="precision-slider-label">
            <SlidersHorizontal size={11} color="var(--text-muted)" />
            <span>拖動門檻點或倍率：</span>
          </div>
          <button
            type="button"
            className="precision-reset-btn"
            onClick={() => onUpdateThresholds(DEFAULT_LOD_THRESHOLDS)}
            title="恢復預設門檻 (L2: 3.2x, L3: 6.5x)"
          >
            <RotateCcw size={10} />
            <span>重設門檻</span>
          </button>
        </div>

        {/* Multi-Handle Interactive Track */}
        <div
          ref={trackRef}
          className="precision-gauge-track"
          title="分別拖動綠色 L2 門檻點、橘色 L3 門檻點、或圓形倍率點"
        >
          {/* Level Zone Color Bands on Track */}
          <div
            className="track-zone zone-l1"
            style={{
              left: 0,
              width: `${l2Percent}%`
            }}
            title={`L1 國家區間 (1.0x ~ ${lodThresholds.l2Threshold}x)`}
          />
          <div
            className="track-zone zone-l2"
            style={{
              left: `${l2Percent}%`,
              width: `${Math.max(0, l3Percent - l2Percent)}%`
            }}
            title={`L2 都道府縣區間 (${lodThresholds.l2Threshold}x ~ ${lodThresholds.l3Threshold}x)`}
          />
          <div
            className="track-zone zone-l3"
            style={{
              left: `${l3Percent}%`,
              width: `${Math.max(0, 100 - l3Percent)}%`
            }}
            title={`L3 市區町村區間 (${lodThresholds.l3Threshold}x ~ 14.0x)`}
          />

          {/* Current Zoom Fill Overlay */}
          <div
            className="precision-gauge-fill"
            style={{
              width: `${zoomPercent}%`,
              backgroundColor: currentThreshold.color
            }}
          />

          {/* POINT 1: L2 Threshold Draggable Handle (門檻點 1) */}
          <div
            className={`threshold-handle handle-l2 ${activeDragTarget === 'l2' ? 'dragging' : ''}`}
            style={{ left: `${l2Percent}%` }}
            onPointerDown={(e) => handlePointerDown(e, 'l2')}
            onPointerMove={(e) => handlePointerMove(e, 'l2')}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            title={`拖動調整 L2 門檻 (目前: ${lodThresholds.l2Threshold}x)`}
          >
            <div className="threshold-tag tag-l2">
              L2 {lodThresholds.l2Threshold}×
            </div>
            <div className="threshold-notch notch-l2" />
          </div>

          {/* POINT 2: L3 Threshold Draggable Handle (門檻點 2) */}
          <div
            className={`threshold-handle handle-l3 ${activeDragTarget === 'l3' ? 'dragging' : ''}`}
            style={{ left: `${l3Percent}%` }}
            onPointerDown={(e) => handlePointerDown(e, 'l3')}
            onPointerMove={(e) => handlePointerMove(e, 'l3')}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            title={`拖動調整 L3 門檻 (目前: ${lodThresholds.l3Threshold}x)`}
          >
            <div className="threshold-tag tag-l3">
              L3 {lodThresholds.l3Threshold}×
            </div>
            <div className="threshold-notch notch-l3" />
          </div>

          {/* POINT 3: Current Map Zoom Magnification Handle (當前倍率點) */}
          <div
            className={`precision-gauge-thumb ${activeDragTarget === 'zoom' ? 'dragging' : ''}`}
            style={{
              left: `${zoomPercent}%`,
              borderColor: currentThreshold.color,
              color: currentThreshold.color
            }}
            onPointerDown={(e) => handlePointerDown(e, 'zoom')}
            onPointerMove={(e) => handlePointerMove(e, 'zoom')}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            title={`拖動調整地圖縮放倍率 (目前: ${currentZoomK.toFixed(1)}x)`}
          >
            <div className="thumb-grip-dot" />
            <div className="zoom-tag" style={{ borderColor: currentThreshold.color }}>
              {currentZoomK.toFixed(1)}×
            </div>
          </div>
        </div>

        {/* Level 倍率快捷按鈕 */}
        <div className="precision-snap-row">
          <button
            type="button"
            className={`precision-snap-chip ${currentLOD === 'L1' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onZoomChange(1.0);
            }}
            title="點擊切換至 1.0x (L1)"
          >
            <span className="snap-chip-dot" style={{ backgroundColor: '#38bdf8' }} />
            <span>1.0× (L1)</span>
          </button>

          <button
            type="button"
            className={`precision-snap-chip ${currentLOD === 'L2' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onZoomChange(lodThresholds.l2Threshold);
            }}
            title={`點擊切換至目前 L2 門檻 (${lodThresholds.l2Threshold}x)`}
          >
            <span className="snap-chip-dot" style={{ backgroundColor: '#10b981' }} />
            <span>{lodThresholds.l2Threshold}× (L2)</span>
          </button>

          <button
            type="button"
            className={`precision-snap-chip ${currentLOD === 'L3' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onZoomChange(lodThresholds.l3Threshold);
            }}
            title={`點擊切換至目前 L3 門檻 (${lodThresholds.l3Threshold}x)`}
          >
            <span className="snap-chip-dot" style={{ backgroundColor: '#f59e0b' }} />
            <span>{lodThresholds.l3Threshold}× (L3)</span>
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
