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
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '7px',
        padding: '2px',
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      <button
        type="button"
        onClick={is3D ? onToggle : undefined}
        title="切換至 2D 平面地圖"
        aria-label="2D 地圖"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          fontSize: '12px',
          fontWeight: 600,
          border: 'none',
          borderRadius: '5px',
          cursor: is3D ? 'pointer' : 'default',
          background: !is3D ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
          color: !is3D ? '#38bdf8' : '#94a3b8',
          transition: 'all 0.15s ease'
        }}
      >
        <MapIcon size={13} />
        <span>2D</span>
      </button>

      <button
        type="button"
        onClick={!is3D ? onToggle : undefined}
        title="切換至 3D 地球儀 (Globe)"
        aria-label="3D 地球儀"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          fontSize: '12px',
          fontWeight: 600,
          border: 'none',
          borderRadius: '5px',
          cursor: !is3D ? 'pointer' : 'default',
          background: is3D ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
          color: is3D ? '#38bdf8' : '#94a3b8',
          transition: 'all 0.15s ease'
        }}
      >
        <Globe size={13} />
        <span>3D</span>
      </button>
    </div>
  );
};
