import React, { useRef, useState, useEffect } from 'react';
import { Globe, SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import {
  getInfotipDisplayMode,
  subscribeInfotipDisplayMode,
  INFOTIP_MODE_OPTIONS,
  type InfotipDisplayMode
} from '../info/infotipPreferences';
import {
  getInfoTagPreferences,
  subscribeInfoTagPreferences,
  type InfoTagPreferences
} from '../info/infoTagPreferences';

interface HeaderProps {
  activeLayerCount?: number;
  activeFilterCount?: number;
  isLayerExpanded?: boolean;
  isFilterExpanded?: boolean;
  isLayerFocused?: boolean;
  onToggleLayerExpanded?: () => void;
  onToggleFilterExpanded?: () => void;
  isInfoSettingsExpanded?: boolean;
  isInfoSettingsFocused?: boolean;
  onToggleInfoSettingsExpanded?: () => void;
  onOpenQuiz?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  activeLayerCount,
  activeFilterCount,
  isLayerExpanded,
  isFilterExpanded,
  isLayerFocused,
  onToggleLayerExpanded,
  onToggleFilterExpanded,
  isInfoSettingsExpanded,
  isInfoSettingsFocused,
  onToggleInfoSettingsExpanded
}) => {
  const activeCount = activeLayerCount ?? activeFilterCount ?? 0;
  const isExpanded = isLayerExpanded ?? isFilterExpanded ?? false;
  const handleToggle = onToggleLayerExpanded ?? onToggleFilterExpanded;
  const pullStartRef = useRef<{ pointerId: number; x: number; y: number; ready: boolean } | null>(null);
  const [pullVisual, setPullVisual] = React.useState({ distance: 0, progress: 0, visible: false, ready: false });
  const [infotipMode, setInfotipMode] = useState<InfotipDisplayMode>(() => getInfotipDisplayMode());
  const [tagPrefs, setTagPrefs] = useState<InfoTagPreferences>(() => getInfoTagPreferences());

  useEffect(() => {
    const unsubTip = subscribeInfotipDisplayMode(setInfotipMode);
    const unsubTags = subscribeInfoTagPreferences(setTagPrefs);
    return () => {
      unsubTip();
      unsubTags();
    };
  }, []);

  const hasActiveTagFilter =
    tagPrefs.activeCategory !== 'all' ||
    tagPrefs.includeTags.length > 0 ||
    tagPrefs.excludeTags.length > 0;

  const infotipModeMeta =
    INFOTIP_MODE_OPTIONS.find((m) => m.id === infotipMode) || INFOTIP_MODE_OPTIONS[0];

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

      {/* Center / Left-Center: Layer Selector & Infotip Settings Buttons */}
      <div className="headline-filter-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          className={`filter-trigger-btn ${isExpanded ? 'open' : ''} ${isLayerFocused ? 'focused' : ''} ${activeCount > 0 ? 'has-active' : ''}`}
          onClick={handleToggle}
          title={isLayerFocused ? "已聚焦圖層視窗 (點擊收合)" : isExpanded ? "點擊聚焦圖層視窗" : "開啟圖層選擇器"}
        >
          <SlidersHorizontal size={14} className="filter-trigger-icon" />
          <span className="filter-trigger-label">圖層</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button
          type="button"
          className={`filter-trigger-btn ${isInfoSettingsExpanded ? 'open' : ''} ${isInfoSettingsFocused ? 'focused' : ''} ${hasActiveTagFilter ? 'has-active' : ''}`}
          onClick={onToggleInfoSettingsExpanded}
          title={isInfoSettingsFocused ? "已聚焦資訊視窗 (點擊收合)" : isInfoSettingsExpanded ? "點擊聚焦資訊視窗" : `提示卡與情報偏好設定: ${infotipModeMeta.nameZh}${hasActiveTagFilter ? ' (已套用自訂標籤篩選)' : ''}`}
        >
          <span style={{ fontSize: 13 }}>{infotipModeMeta.icon}</span>
          <span className="filter-trigger-label" style={{ fontSize: 12 }}>
            資訊
          </span>
          {isInfoSettingsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

    </header>
  );
});
