import React, { useRef } from 'react';
import { Globe, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

interface HeaderProps {
  activeFilterCount: number;
  isFilterExpanded: boolean;
  onToggleFilterExpanded: () => void;
  onOpenQuiz?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  activeFilterCount,
  isFilterExpanded,
  onToggleFilterExpanded
}) => {
  const pullStartRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  return (
    <header
      className="app-header"
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch' || (event.target as Element).closest('button')) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pullStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => {
        const start = pullStartRef.current;
        if (!start || start.pointerId !== event.pointerId) return;
        const dy = event.clientY - start.y;
        const dx = Math.abs(event.clientX - start.x);
        if (dy > 76 && dy > dx * 1.25) {
          pullStartRef.current = null;
          window.location.reload();
        }
      }}
      onPointerUp={(event) => {
        if (pullStartRef.current?.pointerId === event.pointerId) pullStartRef.current = null;
      }}
      onPointerCancel={() => {
        pullStartRef.current = null;
      }}
    >
      {/* Left: Brand Logo & Title */}
      <div className="brand">
        <div className="brand-icon">
          <Globe size={18} />
        </div>
        <div className="brand-title">
          <span>InterGeo</span>
        </div>
      </div>

      {/* Center / Left-Center: Single Filter Selector Button */}
      <div className="headline-filter-row">
        <button
          type="button"
          className={`filter-trigger-btn ${isFilterExpanded ? 'open' : ''} ${activeFilterCount > 0 ? 'has-active' : ''}`}
          onClick={onToggleFilterExpanded}
          title="開啟 / 關閉濾鏡選擇器 (Filter Selector)"
        >
          <SlidersHorizontal size={14} className="filter-trigger-icon" />
          <span className="filter-trigger-label">圖層</span>
          {activeFilterCount > 0 && (
            <span className="filter-trigger-badge">{activeFilterCount}</span>
          )}
          {isFilterExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

    </header>
  );
});
