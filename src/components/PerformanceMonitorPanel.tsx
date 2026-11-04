import React from 'react';
import { Activity, Play, Pause } from 'lucide-react';

export interface PerformanceStats {
  fps: number;
  minFps: number;
  maxFps: number;
  avgFps: number;
  frameTime: number;
}

export interface PerformanceMonitorPanelProps {
  title: string;
  badgeText?: string;
  perf: PerformanceStats;
  zoom: number;
  center: [number, number];
  extraMetrics?: { label: string; value: React.ReactNode }[];
  isStressTesting?: boolean;
  onToggleStressTest?: () => void;
  style?: React.CSSProperties;
}

export const PerformanceMonitorPanel: React.FC<PerformanceMonitorPanelProps> = ({
  title,
  badgeText,
  perf,
  zoom,
  center,
  extraMetrics,
  isStressTesting = false,
  onToggleStressTest,
  style
}) => {
  const fpsColor =
    perf.avgFps >= 55 ? '#10b981' : perf.avgFps >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        color: '#f8fafc',
        minWidth: 220,
        ...style
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: '#94a3b8'
          }}
        >
          <Activity size={14} color="#38bdf8" /> {title}
          {badgeText && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: 4,
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)'
              }}
            >
              {badgeText}
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: fpsColor
          }}
        >
          {perf.fps}{' '}
          <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
            FPS
          </span>
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          fontSize: 11,
          color: '#cbd5e1'
        }}
      >
        <div>
          平均: <strong style={{ color: '#38bdf8' }}>{perf.avgFps}</strong> FPS
        </div>
        <div>
          低標: <strong style={{ color: '#f43f5e' }}>{perf.minFps}</strong> FPS
        </div>
        <div>
          幀時間: <strong>{perf.frameTime}</strong> ms
        </div>
        <div>
          縮放: <strong>{zoom}</strong>x
        </div>
        <div style={{ gridColumn: 'span 2', fontSize: 10, color: '#94a3b8' }}>
          座標: [{center[0]}, {center[1]}]
        </div>
        {extraMetrics?.map((m) => (
          <div key={m.label} style={{ gridColumn: 'span 2', fontSize: 10, color: '#94a3b8' }}>
            {m.label}: <strong style={{ color: '#e2e8f0' }}>{m.value}</strong>
          </div>
        ))}
      </div>

      {onToggleStressTest && (
        <button
          type="button"
          onClick={onToggleStressTest}
          style={{
            marginTop: 10,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '6px 12px',
            backgroundColor: isStressTesting
              ? 'rgba(239, 68, 68, 0.2)'
              : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${isStressTesting ? '#ef4444' : '#10b981'}`,
            borderRadius: 8,
            color: isStressTesting ? '#ef4444' : '#10b981',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {isStressTesting ? (
            <>
              <Pause size={12} /> 停止壓力巡航測試
            </>
          ) : (
            <>
              <Play size={12} /> 啟動動態連續縮放壓力測試
            </>
          )}
        </button>
      )}
    </div>
  );
};
