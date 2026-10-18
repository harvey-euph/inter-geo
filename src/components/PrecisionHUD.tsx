import React, { useState, useRef } from 'react';
import { Layers, ZoomIn, MapPin, SlidersHorizontal, RotateCcw } from 'lucide-react';
import {
  LOD_THRESHOLDS,
  DEFAULT_LOD_THRESHOLDS,
  MIN_ZOOM_K,
  MAX_ZOOM_K,
  type LODLevel,
  type CustomLODThresholds
} from '../types/lod';

interface PrecisionHUDProps {
  currentLOD: LODLevel;
  currentZoomK: number;
  lodThresholds: CustomLODThresholds;
  onUpdateThresholds: (thresholds: CustomLODThresholds) => void;
  onJumpToLOD: (level: LODLevel) => void;
  onZoomChange: (targetK: number) => void;
}

export const PrecisionHUD: React.FC<PrecisionHUDProps> = ({
  currentLOD,
  currentZoomK,
  lodThresholds,
  onUpdateThresholds,
  onJumpToLOD,
  onZoomChange
}) => {
  const [activeDragTarget, setActiveDragTarget] = useState<'zoom' | 'l2' | 'l3' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const currentThreshold = LOD_THRESHOLDS.find((t) => t.level === currentLOD) || LOD_THRESHOLDS[0];

  const isL2Inf = !isFinite(lodThresholds.l2Threshold);
  const isL3Inf = !isFinite(lodThresholds.l3Threshold);

  // Continuous logarithmic scaling for zoom handle (0% ~ 100%)
  const zoomPercent = Math.min(
    100,
    Math.max(0, (Math.log(currentZoomK / MIN_ZOOM_K) / Math.log(MAX_ZOOM_K / MIN_ZOOM_K)) * 100)
  );

  // Thresholds use 0% ~ 94% for finite zoom values, with 95% ~ 100% reserved as the Infinity (∞) snap zone
  const thresholdKToPercent = (k: number) => {
    if (!isFinite(k)) return 100;
    const clamped = Math.min(MAX_ZOOM_K, Math.max(MIN_ZOOM_K, k));
    const ratio = Math.log(clamped / MIN_ZOOM_K) / Math.log(MAX_ZOOM_K / MIN_ZOOM_K);
    return Math.min(94, Math.max(0, ratio * 94));
  };

  const l2Percent = isL2Inf ? (isL3Inf ? 92 : 100) : thresholdKToPercent(lodThresholds.l2Threshold);
  const l3Percent = isL3Inf ? 100 : thresholdKToPercent(lodThresholds.l3Threshold);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, target: 'zoom' | 'l2' | 'l3') => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDragTarget(target);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, target: 'zoom' | 'l2' | 'l3') => {
    if (activeDragTarget !== target) return;
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));

    if (target === 'zoom') {
      const rawK = MIN_ZOOM_K * Math.exp(ratio * Math.log(MAX_ZOOM_K / MIN_ZOOM_K));
      let roundedK = Number(rawK.toFixed(1));
      if (rawK >= 50) roundedK = Math.round(rawK);
      onZoomChange(roundedK);
    } else if (target === 'l2') {
      if (ratio >= 0.91) {
        // Dragged to far right: L2 threshold becomes Infinity (and forces L3 to Infinity)
        onUpdateThresholds({
          l2Threshold: Infinity,
          l3Threshold: Infinity
        });
      } else {
        const normRatio = ratio / 0.94;
        const rawK = MIN_ZOOM_K * Math.exp(normRatio * Math.log(MAX_ZOOM_K / MIN_ZOOM_K));
        const maxL2 = isFinite(lodThresholds.l3Threshold) ? lodThresholds.l3Threshold - 0.5 : 80.0;
        const clampedL2 = Math.min(Math.max(1.5, rawK), maxL2);
        onUpdateThresholds({
          ...lodThresholds,
          l2Threshold: Number(clampedL2.toFixed(1))
        });
      }
    } else if (target === 'l3') {
      if (ratio >= 0.94) {
        // Dragged to far right: L3 threshold becomes Infinity (never activates L3)
        onUpdateThresholds({
          ...lodThresholds,
          l3Threshold: Infinity
        });
      } else {
        const normRatio = ratio / 0.94;
        const rawK = MIN_ZOOM_K * Math.exp(normRatio * Math.log(MAX_ZOOM_K / MIN_ZOOM_K));
        const minL3 = isFinite(lodThresholds.l2Threshold) ? lodThresholds.l2Threshold + 0.5 : 2.0;
        const clampedL3 = Math.max(minL3, rawK);

        let newL2 = lodThresholds.l2Threshold;
        if (!isFinite(newL2) || newL2 >= clampedL3) {
          newL2 = Math.max(1.5, Math.min(DEFAULT_LOD_THRESHOLDS.l2Threshold, clampedL3 - 0.5));
        }

        onUpdateThresholds({
          l2Threshold: Number(newL2.toFixed(1)),
          l3Threshold: Number(clampedL3.toFixed(1))
        });
      }
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
          const isDisabled =
            (t.level === 'L2' && isL2Inf) ||
            (t.level === 'L3' && isL3Inf);

          return (
            <button
              key={t.level}
              className={`precision-tier-btn ${isActive ? 'active' : ''} ${isDisabled ? 'tier-disabled' : ''}`}
              style={{
                borderColor: isActive ? t.color : 'transparent',
                backgroundColor: isActive ? `${t.color}22` : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? '#ffffff' : isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)'
              }}
              onClick={() => onJumpToLOD(t.level)}
              title={
                isDisabled
                  ? `點擊跳轉至 ${t.labelZh} (將自動恢復該層級門檻)`
                  : `點擊快速跳轉至 ${t.labelZh} 視野`
              }
            >
              <span
                className="tier-dot"
                style={{
                  backgroundColor: isDisabled ? '#64748b' : t.color,
                  boxShadow: isActive ? `0 0 8px ${t.color}` : 'none'
                }}
              />
              <span className="tier-name">
                {t.level}
                {isDisabled && ' (∞)'}
              </span>
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
          {isL3Inf && currentLOD === 'L2'
            ? '已設定 L3 門檻為 ∞，放大時停在都道府縣層級，不切入市町村'
            : isL2Inf
            ? '已設定門檻為 ∞，全倍率僅顯示 L1 國家層級'
            : currentThreshold.sublabelZh}
        </div>
      </div>

      {/* Multi-Point Draggable Slider (Thresholds + Zoom) */}
      <div className="precision-gauge-container">
        <div className="precision-slider-header">
          <div className="precision-slider-label">
            <SlidersHorizontal size={11} color="var(--text-muted)" />
            <span>拖動門檻點（拉至最右側 ∞ 停用該層）：</span>
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
          title="分別拖動綠色 L2 門檻點、橘色 L3 門檻點、或圓形倍率點。門檻拉至最右端即為 ∞ 永遠不顯示。"
        >
          {/* Level Zone Color Bands on Track */}
          <div
            className="track-zone zone-l1"
            style={{
              left: 0,
              width: `${isL2Inf ? 100 : l2Percent}%`
            }}
            title={
              isL2Inf
                ? 'L1 國家區間 (全倍率僅顯示國家，L2 與 L3 均為 ∞)'
                : `L1 國家區間 (1.0x ~ ${lodThresholds.l2Threshold}x)`
            }
          />
          <div
            className="track-zone zone-l2"
            style={{
              left: `${l2Percent}%`,
              width: `${isL2Inf ? 0 : isL3Inf ? 100 - l2Percent : Math.max(0, l3Percent - l2Percent)}%`
            }}
            title={
              isL2Inf
                ? 'L2 都道府縣 (已設為 ∞ 停用)'
                : isL3Inf
                ? `L2 都道府縣區間 (${lodThresholds.l2Threshold}x ~ ∞，市區町村已停用)`
                : `L2 都道府縣區間 (${lodThresholds.l2Threshold}x ~ ${lodThresholds.l3Threshold}x)`
            }
          />
          <div
            className="track-zone zone-l3"
            style={{
              left: `${l3Percent}%`,
              width: `${isL3Inf ? 0 : Math.max(0, 100 - l3Percent)}%`
            }}
            title={
              isL3Inf
                ? 'L3 市區町村 (已設為 ∞ 停用，永遠不顯示)'
                : `L3 市區町村區間 (${lodThresholds.l3Threshold}x ~ ${MAX_ZOOM_K}x)`
            }
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
            className={`threshold-handle handle-l2 ${activeDragTarget === 'l2' ? 'dragging' : ''} ${isL2Inf ? 'is-infinity' : ''}`}
            style={{ left: `${l2Percent}%` }}
            onPointerDown={(e) => handlePointerDown(e, 'l2')}
            onPointerMove={(e) => handlePointerMove(e, 'l2')}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            title={
              isL2Inf
                ? 'L2 門檻: ∞ (永遠不顯示都道府縣，向左拖動可恢復)'
                : `拖動調整 L2 門檻 (目前: ${lodThresholds.l2Threshold}x，拉至最右端可停用)`
            }
          >
            <div className={`threshold-tag tag-l2 ${isL2Inf ? 'is-infinity' : ''}`}>
              {isL2Inf ? 'L2 ∞' : `L2 ${lodThresholds.l2Threshold}×`}
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
            title={
              isL3Inf
                ? 'L3 門檻: ∞ (永遠不顯示市區町村，向左拖動可恢復)'
                : `拖動調整 L3 門檻 (目前: ${lodThresholds.l3Threshold}x，拉至最右端可停用)`
            }
          >
            <div className={`threshold-tag tag-l3 ${isL3Inf ? 'is-infinity' : ''}`}>
              {isL3Inf ? 'L3 ∞' : `L3 ${lodThresholds.l3Threshold}×`}
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
            className={`precision-snap-chip ${currentLOD === 'L1' && (isL2Inf || currentZoomK < lodThresholds.l2Threshold) ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onZoomChange(MIN_ZOOM_K);
            }}
            title="點擊切換至 1.0x (L1 全球國家視野)"
          >
            <span className="snap-chip-dot" style={{ backgroundColor: '#38bdf8' }} />
            <span>1.0×</span>
          </button>

          <button
            type="button"
            className={`precision-snap-chip ${currentLOD === 'L2' ? 'active' : ''}`}
            disabled={isL2Inf}
            onClick={(e) => {
              e.stopPropagation();
              if (isFinite(lodThresholds.l2Threshold)) {
                onZoomChange(lodThresholds.l2Threshold);
              }
            }}
            title={
              isL2Inf
                ? 'L2 門檻已設為 ∞ (停用)'
                : `點擊切換至目前 L2 門檻 (${lodThresholds.l2Threshold}x)`
            }
          >
            <span className="snap-chip-dot" style={{ backgroundColor: '#10b981' }} />
            <span>{isL2Inf ? 'L2: ∞' : `${lodThresholds.l2Threshold}×`}</span>
          </button>

          <button
            type="button"
            className={`precision-snap-chip ${currentLOD === 'L3' && currentZoomK < 50 ? 'active' : ''}`}
            disabled={isL3Inf}
            onClick={(e) => {
              e.stopPropagation();
              if (isFinite(lodThresholds.l3Threshold)) {
                onZoomChange(lodThresholds.l3Threshold);
              }
            }}
            title={
              isL3Inf
                ? 'L3 門檻已設為 ∞ (停用)'
                : `點擊切換至目前 L3 門檻 (${lodThresholds.l3Threshold}x)`
            }
          >
            <span className="snap-chip-dot" style={{ backgroundColor: '#f59e0b' }} />
            <span>{isL3Inf ? 'L3: ∞' : `${lodThresholds.l3Threshold}×`}</span>
          </button>

          <button
            type="button"
            className={`precision-snap-chip ${Math.abs(currentZoomK - 100) < 1 ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onZoomChange(100.0);
            }}
            title="點擊切換至 100x 超高精細倍率"
          >
            <span>100×</span>
          </button>

          <button
            type="button"
            className={`precision-snap-chip ${Math.abs(currentZoomK - MAX_ZOOM_K) < 0.5 ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onZoomChange(MAX_ZOOM_K);
            }}
            title={`點擊切換至最大縮放極限 (${MAX_ZOOM_K}x)`}
          >
            <span>{MAX_ZOOM_K}×</span>
          </button>
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
