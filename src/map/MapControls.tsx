import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

const MapControlsComponent: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetZoom
}) => {
  return (
    <div className="map-controls-panel map-controls">
      <button className="map-control-btn" onClick={onZoomIn} title="放大地圖 (Zoom In)">
        <ZoomIn size={18} />
      </button>
      <button className="map-control-btn" onClick={onZoomOut} title="縮小地圖 (Zoom Out)">
        <ZoomOut size={18} />
      </button>
      <button className="map-control-btn" onClick={onResetZoom} title="還原縮放比例 (Reset View)">
        <RotateCcw size={16} />
      </button>
    </div>
  );
};

export const MapControls = React.memo(MapControlsComponent);
