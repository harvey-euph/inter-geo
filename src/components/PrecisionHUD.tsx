import React, { useState, useRef } from 'react';
import {
  LOD_THRESHOLDS,
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
  onZoomChange: (targetK: number) => void;
}

export const PrecisionHUD: React.FC<PrecisionHUDProps> = React.memo(({
  currentLOD,
  currentZoomK,
  lodThresholds,
  onUpdateThresholds,
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
        onUpdateThresholds({
          ...lodThresholds,
          l3Threshold: Infinity
        });
      } else {
        const normRatio = ratio / 0.94;
        const rawK = MIN_ZOOM_K * Math.exp(normRatio * Math.log(MAX_ZOOM_K / MIN_ZOOM_K));
        const minL3 = isFinite(lodThresholds.l2Threshold) ? lodThresholds.l2Threshold + 0.5 : 2.0;
        const clampedL3 = Math.max(minL3, rawK);
        onUpdateThresholds({
          ...lodThresholds,
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
      {/* Multi-Handle Interactive Track */}
      <div
        ref={trackRef}
        className="precision-gauge-track"
        title="拖動綠色 L2 行政區門檻點、橘色 L3 門檻點、或圓形倍率點。門檻拉至最右端即為 ∞ 永遠不切換。"
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
              ? 'L1 國家模式區間 (全倍率以國家為單位)'
              : `L1 國家模式區間 (1.0x ~ ${lodThresholds.l2Threshold}x · 顯示 L2 輪廓，點選/懸停為國家)`
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
              ? 'L2 行政區模式 (已停用)'
              : isL3Inf
              ? `L2 行政區模式區間 (${lodThresholds.l2Threshold}x ~ ∞ · 點選/懸停為一級行政區)`
              : `L2 行政區模式區間 (${lodThresholds.l2Threshold}x ~ ${lodThresholds.l3Threshold}x)`
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
              ? 'L3 二級行政區 (預設關閉 ∞)'
              : `L3 二級行政區區間 (${lodThresholds.l3Threshold}x ~ ${MAX_ZOOM_K}x)`
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

        {/* POINT 1: L2 Threshold Draggable Handle (門檻點 1: L2 行政區) */}
        <div
          className={`threshold-handle handle-l2 ${activeDragTarget === 'l2' ? 'dragging' : ''} ${isL2Inf ? 'is-infinity' : ''}`}
          style={{ left: `${l2Percent}%` }}
          onPointerDown={(e) => handlePointerDown(e, 'l2')}
          onPointerMove={(e) => handlePointerMove(e, 'l2')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title={
            isL2Inf
              ? 'L2 行政區門檻: ∞ (永遠僅以國家互動，向左拖動可恢復)'
              : `拖動調整 L2 行政區模式門檻 (目前: ${lodThresholds.l2Threshold}x)`
          }
        >
          <div className={`threshold-tag tag-l2 ${isL2Inf ? 'is-infinity' : ''}`}>
            {isL2Inf ? 'L2 ∞' : `L2 ${lodThresholds.l2Threshold}×`}
          </div>
          <div className="threshold-notch notch-l2" />
        </div>

        {/* POINT 2: L3 Threshold Draggable Handle (門檻點 2: L3 二級) */}
        <div
          className={`threshold-handle handle-l3 ${activeDragTarget === 'l3' ? 'dragging' : ''} ${isL3Inf ? 'is-infinity' : ''}`}
          style={{ left: `${l3Percent}%` }}
          onPointerDown={(e) => handlePointerDown(e, 'l3')}
          onPointerMove={(e) => handlePointerMove(e, 'l3')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title={
            isL3Inf
              ? 'L3 門檻: ∞ (預設關閉，向左拖動可開啟)'
              : `拖動調整 L3 門檻 (目前: ${lodThresholds.l3Threshold}x)`
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
          title={`拖動調整地圖縮放倍率 (目前: ${currentZoomK.toFixed(1)}x · ${currentThreshold.labelZh})`}
        >
          <div className="thumb-grip-dot" />
          <div className="zoom-tag" style={{ borderColor: currentThreshold.color }}>
            {currentZoomK.toFixed(1)}×
          </div>
        </div>
      </div>
    </div>
  );
});
