import React from 'react';
import { FILTERS } from '../data/filters';
import { INTERNATIONAL_TEXT_FILTERS, INTERNATIONAL_IMAGE_FILTERS } from '../data/internationalFilters';
import { COUNTRIES_DATA } from '../data/countries';
import { SlidersHorizontal, Sparkles, ChevronUp, Layers, Info } from 'lucide-react';

interface FilterBarProps {
  activeFilterId: string;
  onSelectFilter: (filterId: string) => void;
  activeTextFilters: Set<string>;
  onToggleTextFilter: (filterId: string) => void;
  activeInternationalImageFilter: string | null;
  onToggleInternationalImageFilter: (filterId: string) => void;
  isExpanded: boolean;
  onCollapse: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = React.memo(({
  activeFilterId,
  onSelectFilter,
  activeTextFilters,
  onToggleTextFilter,
  activeInternationalImageFilter,
  onToggleInternationalImageFilter,
  isExpanded,
  onCollapse
}) => {
  if (!isExpanded) return null;

  const currentFilter = FILTERS.find((f) => f.id === activeFilterId) || FILTERS[0];

  return (
    <div className="filter-bar-container">
      {/* Top Bar inside floating window with collapse button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>
          <SlidersHorizontal size={15} />
          <span>International Filter (國際通用濾鏡 · 可顯示於 L1 / L2)</span>
        </div>

        <button
          className="filter-collapse-btn"
          onClick={onCollapse}
          title="收納濾鏡面板至頂端 Headline"
        >
          <ChevronUp size={14} />
          <span>收納至頂端</span>
        </button>
      </div>

      {/* Section 1: Coloring Layer */}
      <div className="filter-section-title">
        <span>🎨 著色圖層 (Coloring Layer · 單選)</span>
      </div>
      <div className="filter-pills-row">
        {FILTERS.map((f) => {
          const isActive = f.id === activeFilterId;
          return (
            <button
              key={f.id}
              className={`filter-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectFilter(f.id)}
            >
              {f.nameZh}
            </button>
          );
        })}
      </div>

      {/* Section 2: Text Overlay (Max 2) vs Image Overlay (Mutually Exclusive) */}
      <div className="filter-section-title" style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>🔤 文字標籤 (最多並列 2 項)  |  🖼️ 圖片標籤 (單項 · 兩者互斥)</span>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Info size={12} />
          開啟文字會自動關閉圖片，開啟圖片會關閉文字
        </span>
      </div>
      <div className="filter-pills-row" style={{ alignItems: 'center' }}>
        {/* Text Filters */}
        {INTERNATIONAL_TEXT_FILTERS.map((tf) => {
          const isActive = activeTextFilters.has(tf.id);
          return (
            <button
              key={tf.id}
              className={`filter-pill text-overlay-filter-pill ${isActive ? 'active' : ''}`}
              onClick={() => onToggleTextFilter(tf.id)}
              title={tf.descriptionZh}
              style={
                isActive
                  ? {
                      borderColor: tf.accentColor,
                      color: tf.accentColor,
                      backgroundColor: `${tf.accentColor}24`,
                      boxShadow: `0 0 8px ${tf.accentColor}40`
                    }
                  : undefined
              }
            >
              <span>{tf.shortBadge} {tf.nameZh}</span>
            </button>
          );
        })}

        <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

        {/* Image Filters */}
        {INTERNATIONAL_IMAGE_FILTERS.map((imgF) => {
          const isActive = activeInternationalImageFilter === imgF.id;
          return (
            <button
              key={imgF.id}
              className={`filter-pill text-overlay-filter-pill ${isActive ? 'active' : ''}`}
              onClick={() => onToggleInternationalImageFilter(imgF.id)}
              title={imgF.descriptionZh}
              style={
                isActive
                  ? {
                      borderColor: imgF.accentColor,
                      color: imgF.accentColor,
                      backgroundColor: `${imgF.accentColor}24`,
                      boxShadow: `0 0 8px ${imgF.accentColor}40`
                    }
                  : undefined
              }
            >
              <span>{imgF.shortBadge}</span>
            </button>
          );
        })}
      </div>

      {/* Filter info and description footer */}
      <div className="filter-info-row" style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Sparkles size={13} color="#38bdf8" />
          <span>{currentFilter.descriptionZh}</span>
          {activeTextFilters.size > 0 && (
            <span style={{ color: '#34d399', fontSize: 11, marginLeft: 6 }}>
              • 已疊加文字：{Array.from(activeTextFilters).map((id) => id === 'callingCode' ? '電話國碼' : '頂級網域').join(' + ')}
            </span>
          )}
          {activeInternationalImageFilter && (
            <span style={{ color: '#38bdf8', fontSize: 11, marginLeft: 6 }}>
              • 已疊加圖片：人行道告示牌
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          <Layers size={12} color="#94a3b8" />
          <span>已收錄 {COUNTRIES_DATA.length} 個主要官方街景國</span>
        </div>
      </div>
    </div>
  );
});
