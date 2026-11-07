import React from 'react';
import type { CanonicalFeature } from '../map/data/FeatureRegistry';

interface FeatureTooltipProps {
  feature: CanonicalFeature | null;
  position: { x: number; y: number } | null;
}

export const FeatureTooltip: React.FC<FeatureTooltipProps> = ({ feature, position }) => {
  if (!feature || !position) return null;

  const p = feature.properties;

  const primaryName = p.name_zh || p.name || p.name_en;
  const secondaryName = p.name_en && p.name_en !== primaryName ? p.name_en : null;

  // Taiwan Taipower Grid ExtFeature Tooltip
  if (
    (typeof p.objectTag === 'string' && p.objectTag.startsWith('TW-powerpoles::')) ||
    p.feature_id?.startsWith('TW-powerpoles::') ||
    p.layerId === 'taiwan-power-poles'
  ) {
    const examplePoleCode =
      (p.examplePoleCode as string | undefined) ||
      (p.attributes as Record<string, string> | undefined)?.examplePoleCode;
    const subdivisions =
      (p.subdivisions as string | undefined) ||
      (p.attributes as Record<string, string> | undefined)?.subdivisions;
    const description =
      (p.description as string | undefined) ||
      (p.attributes as Record<string, string> | undefined)?.description;
    const color = (p.color as string) || '#f59e0b';
    const tag = String(p.objectTag || p.feature_id || '');
    const code = String(p.code || tag.split('::').pop() || '');

    return (
      <div
        style={{
          position: 'absolute',
          left: `${position.x + 12}px`,
          top: `${position.y + 12}px`,
          pointerEvents: 'none',
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${color}`,
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#f8fafc',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
          zIndex: 40,
          maxWidth: '300px',
          fontSize: '13px',
          lineHeight: 1.4
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚡</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color }}>{primaryName}</div>
            {secondaryName && (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                {secondaryName}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
          <span
            style={{
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#fbbf24',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'monospace'
            }}
          >
            {code}
          </span>
          <span
            style={{
              background: 'rgba(148, 163, 184, 0.2)',
              color: '#cbd5e1',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px'
            }}
          >
            {tag}
          </span>
        </div>

        {examplePoleCode && (
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#7dd3fc' }}>
            電桿範例：<span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{examplePoleCode}</span>
          </div>
        )}
        {subdivisions && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#cbd5e1' }}>
            涵蓋：{subdivisions}
          </div>
        )}
        {description && (
          <div style={{ marginTop: '3px', fontSize: '11px', color: '#94a3b8' }}>
            {description}
          </div>
        )}
      </div>
    );
  }

  const levelText =
    p.admin_level === 0
      ? '國家 (ADM0)'
      : p.admin_level === 1
        ? '一級行政區 (ADM1)'
        : '二級行政區 (ADM2)';

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
