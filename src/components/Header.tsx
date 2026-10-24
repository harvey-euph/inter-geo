import React from 'react';
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
  return (
    <header className="app-header">
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
