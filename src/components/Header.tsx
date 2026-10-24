import React, { useRef } from 'react';
import { Globe, SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

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
  const pullStartRef = useRef<{ pointerId: number; x: number; y: number; ready: boolean } | null>(null);
  const [pullVisual, setPullVisual] = React.useState({ distance: 0, progress: 0, visible: false, ready: false });

  return (
    <header
      className="app-header"
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch' || (event.target as Element).closest('button')) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pullStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, ready: false };
        setPullVisual({ distance: 0, progress: 0, visible: false, ready: false });
      }}
      onPointerMove={(event) => {
        const start = pullStartRef.current;
        if (!start || start.pointerId !== event.pointerId) return;
        const dy = event.clientY - start.y;
        const dx = Math.abs(event.clientX - start.x);
        const progress = Math.max(0, Math.min(1, dy / 76));
        const ready = dy >= 76 && dy > dx * 1.25;
        start.ready = ready;
        setPullVisual({
          distance: Math.max(0, Math.min(dy, 76)),
          progress,
          visible: dy > 6,
          ready
        });
      }}
      onPointerUp={(event) => {
        const start = pullStartRef.current;
        if (start?.pointerId !== event.pointerId) return;
        pullStartRef.current = null;
        setPullVisual({ distance: 0, progress: 0, visible: false, ready: false });
        if (start.ready) window.location.reload();
      }}
      onPointerCancel={() => {
        pullStartRef.current = null;
        setPullVisual({ distance: 0, progress: 0, visible: false, ready: false });
      }}
    >
      <div
        className={`pull-refresh-indicator${pullVisual.visible ? ' visible' : ''}${pullVisual.ready ? ' ready' : ''}${pullStartRef.current ? ' pulling' : ''}`}
        style={{
          transform: `translate(-50%, ${pullVisual.distance}px)`,
          opacity: pullVisual.visible ? Math.min(1, pullVisual.distance / 12) : 0,
          ['--pull-progress' as string]: `${pullVisual.progress * 100}%`,
          ['--pull-rotation' as string]: `${pullVisual.progress * 360}deg`
        } as React.CSSProperties}
        aria-hidden="true"
      >
        <span className="pull-refresh-icon-ring">
          <span className="pull-refresh-icon-inner">
            <RefreshCw size={17} />
          </span>
        </span>
        {pullVisual.ready && <span className="pull-refresh-label">放開即可重新整理</span>}
      </div>
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
