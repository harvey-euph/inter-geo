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

export const PrecisionHUD: React.FC<PrecisionHUDProps> = ({
  currentLOD,
  currentZoomK,
  lodThresholds,
  onUpdateThresholds,
  onZoomChange
}) => {
  const [activeDragTarget, setActiveDragTarget] = useState<'zoom' | 'l2Outline' | 'l2Region' | 'l3' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const currentThreshold = LOD_THRESHOLDS.find((t) => t.level === currentLOD) || LOD_THRESHOLDS[0];

  const isL2OutlineInf = !isFinite(lodThresholds.l2OutlineThreshold);
  const isL2RegionInf = !isFinite(lodThresholds.l2RegionThreshold);
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

  const l2OutlinePercent = isL2OutlineInf ? 90 : thresholdKToPercent(lodThresholds.l2OutlineThreshold);
  const l2RegionPercent = isL2RegionInf ? (isL3Inf ? 95 : 100) : thresholdKToPercent(lodThresholds.l2RegionThreshold);
  const l3Percent = isL3Inf ? 100 : thresholdKToPercent(lodThresholds.l3Threshold);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    target: 'zoom' | 'l2Outline' | 'l2Region' | 'l3'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDragTarget(target);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    target: 'zoom' | 'l2Outline' | 'l2Region' | 'l3'
  ) => {
    if (activeDragTarget !== target) return;
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));

    if (target === 'zoom') {
      const rawK = MIN_ZOOM_K * Math.exp(ratio * Math.log(MAX_ZOOM_K / MIN_ZOOM_K));
      let roundedK = Number(rawK.toFixed(1));
      if (rawK >= 50) roundedK = Math.round(rawK);
      onZoomChange(roundedK);
    } else if (target === 'l2Outline') {
      if (ratio >= 0.88) {
        onUpdateThresholds({
          l2OutlineThreshold: Infinity,
          l2RegionThreshold: Infinity,
          l3Threshold: Infinity
        });
      } else {
        const normRatio = ratio / 0.94;
        const rawK = MIN_ZOOM_K * Math.exp(normRatio * Math.log(MAX_ZOOM_K / MIN_ZOOM_K));
        const maxOutline = isFinite(lodThresholds.l2RegionThreshold)
          ? lodThresholds.l2RegionThreshold - 0.2
          : isFinite(lodThresholds.l3Threshold)
          ? lodThresholds.l3Threshold - 0.5
          : 80.0;
        const clamped = Math.min(Math.max(1.1, rawK), maxOutline);
        onUpdateThresholds({
          ...lodThresholds,
          l2OutlineThreshold: Number(clamped.toFixed(1))
        });
      }
    } else if (target === 'l2Region') {
      if (ratio >= 0.91) {
        onUpdateThresholds({
          ...lodThresholds,
          l2RegionThreshold: Infinity,
          l3Threshold: Infinity
        });
      } else {
        const normRatio = ratio / 0.94;
        const rawK = MIN_ZOOM_K * Math.exp(normRatio * Math.log(MAX_ZOOM_K / MIN_ZOOM_K));
        const minRegion = isFinite(lodThresholds.l2OutlineThreshold)
          ? lodThresholds.l2OutlineThreshold + 0.2
          : 1.5;
        const maxRegion = isFinite(lodThresholds.l3Threshold)
          ? lodThresholds.l3Threshold - 0.5
          : 80.0;
        const clamped = Math.min(Math.max(minRegion, rawK), maxRegion);
        onUpdateThresholds({
          ...lodThresholds,
          l2RegionThreshold: Number(clamped.toFixed(1))
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
        const minL3 = isFinite(lodThresholds.l2RegionThreshold)
          ? lodThresholds.l2RegionThreshold + 0.5
          : isFinite(lodThresholds.l2OutlineThreshold)
          ? lodThresholds.l2OutlineThreshold + 1.0
          : 2.0;
        const clamped = Math.max(minL3, rawK);
        onUpdateThresholds({
          ...lodThresholds,
          l3Threshold: Number(clamped.toFixed(1))
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
        title="拖動 L2 輪廓門檻點、L2 區域門檻點、L3 門檻點、或圓形倍率點。門檻拉至最右端即為 ∞ 永遠不顯示。"
      >
        {/* Level Zone Color Bands on Track */}
        <div
          className="track-zone zone-l1"
          style={{
            left: 0,
            width: `${isL2OutlineInf ? 100 : l2OutlinePercent}%`
          }}
          title={
            isL2OutlineInf
              ? 'L1 國家輪廓區間 (全倍率僅顯示國家輪廓)'
              : `L1 國家輪廓區間 (1.0x ~ ${lodThresholds.l2OutlineThreshold}x)`
          }
        />
        <div
          className="track-zone zone-l2-outline"
          style={{
            left: `${l2OutlinePercent}%`,
            width: `${isL2OutlineInf ? 0 : isL2RegionInf ? 100 - l2OutlinePercent : Math.max(0, l2RegionPercent - l2OutlinePercent)}%`
          }}
          title={
            isL2OutlineInf
              ? 'L2 行政區輪廓 (已停用)'
              : isL2RegionInf
              ? `L2 行政區輪廓區間 (${lodThresholds.l2OutlineThreshold}x ~ ∞)`
              : `L2 行政區輪廓區間 (${lodThresholds.l2OutlineThreshold}x ~ ${lodThresholds.l2RegionThreshold}x)`
          }
        />
        <div
          className="track-zone zone-l2-region"
          style={{
            left: `${l2RegionPercent}%`,
            width: `${isL2RegionInf ? 0 : isL3Inf ? 100 - l2RegionPercent : Math.max(0, l3Percent - l2RegionPercent)}%`
          }}
          title={
            isL2RegionInf
              ? 'L2 行政區區域 (已停用)'
              : isL3Inf
              ? `L2 行政區區域區間 (${lodThresholds.l2RegionThreshold}x ~ ∞)`
              : `L2 行政區區域區間 (${lodThresholds.l2RegionThreshold}x ~ ${lodThresholds.l3Threshold}x)`
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

        {/* POINT 1: L2 Outline Threshold Draggable Handle (門檻點 1: L2 輪廓) */}
        <div
          className={`threshold-handle handle-l2-outline ${activeDragTarget === 'l2Outline' ? 'dragging' : ''} ${isL2OutlineInf ? 'is-infinity' : ''}`}
          style={{ left: `${l2OutlinePercent}%` }}
          onPointerDown={(e) => handlePointerDown(e, 'l2Outline')}
          onPointerMove={(e) => handlePointerMove(e, 'l2Outline')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title={
            isL2OutlineInf
              ? 'L2 輪廓門檻: ∞ (停用)'
              : `拖動調整 L2 輪廓門檻 (目前: ${lodThresholds.l2OutlineThreshold}x)`
          }
        >
          <div className={`threshold-tag tag-l2-outline ${isL2OutlineInf ? 'is-infinity' : ''}`}>
            {isL2OutlineInf ? 'L2輪廓 ∞' : `L2輪廓 ${lodThresholds.l2OutlineThreshold}×`}
          </div>
          <div className="threshold-notch notch-l2-outline" />
        </div>

        {/* POINT 2: L2 Region Threshold Draggable Handle (門檻點 2: L2 區域) */}
        <div
          className={`threshold-handle handle-l2-region ${activeDragTarget === 'l2Region' ? 'dragging' : ''} ${isL2RegionInf ? 'is-infinity' : ''}`}
          style={{ left: `${l2RegionPercent}%` }}
          onPointerDown={(e) => handlePointerDown(e, 'l2Region')}
          onPointerMove={(e) => handlePointerMove(e, 'l2Region')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title={
            isL2RegionInf
              ? 'L2 區域門檻: ∞ (停用)'
              : `拖動調整 L2 區域門檻 (目前: ${lodThresholds.l2RegionThreshold}x)`
          }
        >
          <div className={`threshold-tag tag-l2-region ${isL2RegionInf ? 'is-infinity' : ''}`}>
            {isL2RegionInf ? 'L2區域 ∞' : `L2區域 ${lodThresholds.l2RegionThreshold}×`}
          </div>
          <div className="threshold-notch notch-l2-region" />
        </div>

        {/* POINT 3: L3 Threshold Draggable Handle (門檻點 3: L3 二級) */}
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

        {/* POINT 4: Current Map Zoom Magnification Handle (當前倍率點) */}
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
};
