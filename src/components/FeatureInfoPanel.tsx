import React from 'react';
import type { CanonicalFeature } from '../map/data/FeatureRegistry';
import { X } from 'lucide-react';

interface FeatureInfoPanelProps {
  feature: CanonicalFeature | null;
  onClose: () => void;
}

export const FeatureInfoPanel: React.FC<FeatureInfoPanelProps> = ({ feature, onClose }) => {
  if (!feature) return null;

  const p = feature.properties;
  const levelLabel =
    p.admin_level === 0 ? '國家 (ADM0)' : p.admin_level === 1 ? '一級行政區 (ADM1)' : '二級行政區 (ADM2)';

  return (
    <aside
      style={{
        position: 'absolute',
        top: '64px',
        right: '16px',
        width: '320px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: '12px',
        padding: '16px',
        color: '#f8fafc',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        zIndex: 30
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            background: 'rgba(56, 189, 248, 0.2)',
            color: '#38bdf8',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700
          }}
        >
          {levelLabel}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={18} />
        </button>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '12px 0 4px', color: '#ffffff' }}>
        {p.name_zh || p.name}
      </h2>
      {p.name_en && <div style={{ fontSize: '13px', color: '#94a3b8' }}>{p.name_en}</div>}

      <div style={{ marginTop: '14px', borderTop: '1px solid rgba(148, 163, 184, 0.2)', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
          <span style={{ color: '#94a3b8' }}>代碼 (Code)</span>
          <span style={{ fontWeight: 600 }}>{String(p.code || p.postal || p.feature_id)}</span>
        </div>
        {p.country_code && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
            <span style={{ color: '#94a3b8' }}>國家 (Country)</span>
            <span style={{ fontWeight: 600 }}>{p.country_code}</span>
          </div>
        )}
        {p.parent_id && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
            <span style={{ color: '#94a3b8' }}>上級代碼 (Parent)</span>
            <span style={{ fontWeight: 600 }}>{p.parent_id}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
