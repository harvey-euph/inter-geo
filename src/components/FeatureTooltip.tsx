import React from 'react';
import type { CanonicalFeature } from '../map/data/FeatureRegistry';

interface FeatureTooltipProps {
  feature: CanonicalFeature | null;
  position: { x: number; y: number } | null;
}

export const FeatureTooltip: React.FC<FeatureTooltipProps> = ({ feature, position }) => {
  if (!feature || !position) return null;

  const p = feature.properties;
  const levelText =
    p.admin_level === 0
      ? '國家 (ADM0)'
      : p.admin_level === 1
        ? '一級行政區 (ADM1)'
        : '二級行政區 (ADM2)';

  const primaryName = p.name_zh || p.name || p.name_en;
  const secondaryName = p.name_en && p.name_en !== primaryName ? p.name_en : null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x + 12}px`,
        top: `${position.y + 12}px`,
        pointerEvents: 'none',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#f8fafc',
        boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
        zIndex: 40,
        maxWidth: '240px',
        fontSize: '13px',
        lineHeight: 1.4
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '14px', color: '#38bdf8' }}>{primaryName}</div>
      {secondaryName && (
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
          {secondaryName}
        </div>
      )}
      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
        <span
          style={{
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#7dd3fc',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600
          }}
        >
          {levelText}
        </span>
        {p.code && (
          <span
            style={{
              background: 'rgba(148, 163, 184, 0.2)',
              color: '#cbd5e1',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px'
            }}
          >
            {String(p.code)}
          </span>
        )}
      </div>
    </div>
  );
};
