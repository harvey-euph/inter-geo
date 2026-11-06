import React from 'react';
import { Globe, Map as MapIcon } from 'lucide-react';
import type { ProjectionMode } from '../map/ProjectionController';

interface MapModeSwitcherProps {
  mode: ProjectionMode;
  onToggle: () => void;
  className?: string;
}

export const MapModeSwitcher: React.FC<MapModeSwitcherProps> = ({
  mode,
  onToggle,
  className = ''
}) => {
  const is3D = mode === '3d';

  return (
    <div
      className={`map-mode-switcher ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '8px',
        padding: '3px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
        userSelect: 'none',
        zIndex: 20
      }}
    >
      <button
        type="button"
        onClick={is3D ? onToggle : undefined}
        title="切換至 2D 平面循環地圖"
        aria-label="2D 地圖"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 600,
          border: 'none',
          borderRadius: '6px',
          cursor: is3D ? 'pointer' : 'default',
          background: !is3D ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
          color: !is3D ? '#38bdf8' : '#94a3b8',
          transition: 'all 0.2s ease'
        }}
      >
        <MapIcon size={16} />
        <span>2D 平面</span>
      </button>

      <button
        type="button"
        onClick={!is3D ? onToggle : undefined}
        title="切換至 3D 地球儀 (Globe)"
        aria-label="3D 地球儀"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 600,
          border: 'none',
          borderRadius: '6px',
          cursor: !is3D ? 'pointer' : 'default',
          background: is3D ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
          color: is3D ? '#38bdf8' : '#94a3b8',
          transition: 'all 0.2s ease'
        }}
      >
        <Globe size={16} />
        <span>3D 球體</span>
      </button>
    </div>
  );
};
