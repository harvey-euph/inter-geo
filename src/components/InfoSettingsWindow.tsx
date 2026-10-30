import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  Ban,
  Sparkles
} from 'lucide-react';
import { FloatingWindow } from './FloatingWindow';
import {
  INFOTIP_MODE_OPTIONS,
  getInfotipDisplayMode,
  setInfotipDisplayMode,
  subscribeInfotipDisplayMode,
  type InfotipDisplayMode
} from '../info/infotipPreferences';
import {
  getInfoTagPreferences,
  setInfoTagPreferences,
  resetInfoTagPreferences,
  moveTagToInclude,
  moveTagToExclude,
  moveTagToDefault,
  subscribeInfoTagPreferences,
  type InfoTagPreferences
} from '../info/infoTagPreferences';
import {
  getAllDatabaseTagsWithCounts,
  onInfoIndexLoaded
} from '../info/infoRegistry';

export interface InfoSettingsWindowProps {
  isExpanded: boolean;
  onCollapse: () => void;
  zIndex?: number;
  isFront?: boolean;
  onFocusWindow?: () => void;
}

type DropZoneId = 'include' | 'default' | 'exclude';

interface TagDragState {
  tag: string;
  fromZone: DropZoneId;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  width: number;
  height: number;
  tilt: number;
  hoveredZone: DropZoneId | null;
  isDragging: boolean;
  pointerId: number;
}

export const InfoSettingsWindow: React.FC<InfoSettingsWindowProps> = React.memo(({
  isExpanded,
  onCollapse,
  zIndex,
  isFront,
  onFocusWindow
}) => {
  // Infotip Mode state
  const [infotipMode, setInfotipMode] = useState<InfotipDisplayMode>(() => getInfotipDisplayMode());

  // Tag Preferences state
  const [tagPrefs, setTagPrefs] = useState<InfoTagPreferences>(() => getInfoTagPreferences());

  // All tags with counts across database
  const [dbTags, setDbTags] = useState<{ tag: string; count: number }[]>(() => getAllDatabaseTagsWithCounts());

  // Dropzone DOM refs for boundary collision detection
  const mustContainZoneRef = useRef<HTMLDivElement>(null);
  const defaultZoneRef = useRef<HTMLDivElement>(null);
  const mustNotContainZoneRef = useRef<HTMLDivElement>(null);

  // Drag & drop state
  const [dragState, setDragState] = useState<TagDragState | null>(null);

  // Subscriptions
  useEffect(() => {
    const unsubTip = subscribeInfotipDisplayMode(setInfotipMode);
    const unsubTags = subscribeInfoTagPreferences(setTagPrefs);
    const unsubIndex = onInfoIndexLoaded(() => {
      setDbTags(getAllDatabaseTagsWithCounts());
    });
    return () => {
      unsubTip();
      unsubTags();
      unsubIndex();
    };
  }, []);

  // Set lookups
  const includeSet = useMemo(() => new Set(tagPrefs.includeTags.map((t) => t.toLowerCase())), [tagPrefs.includeTags]);
  const excludeSet = useMemo(() => new Set(tagPrefs.excludeTags.map((t) => t.toLowerCase())), [tagPrefs.excludeTags]);

  const hasActiveTagFilter =
    tagPrefs.includeTags.length > 0 ||
    tagPrefs.excludeTags.length > 0;

  // Filter default tags: all tags in db that are NOT in include and NOT in exclude
  const defaultTags = useMemo(() => {
    return dbTags.filter(({ tag }) => {
      const lower = tag.toLowerCase();
      return !includeSet.has(lower) && !excludeSet.has(lower);
    });
  }, [dbTags, includeSet, excludeSet]);

  // Determine which dropzone the pointer is currently over
  const detectHoveredZone = useCallback((clientX: number, clientY: number): DropZoneId | null => {
    const pad = 3;
    if (mustContainZoneRef.current) {
      const r = mustContainZoneRef.current.getBoundingClientRect();
      if (
        clientX >= r.left - pad &&
        clientX <= r.right + pad &&
        clientY >= r.top - pad &&
        clientY <= r.bottom + pad
      ) {
        return 'include';
      }
    }
    if (mustNotContainZoneRef.current) {
      const r = mustNotContainZoneRef.current.getBoundingClientRect();
      if (
        clientX >= r.left - pad &&
        clientX <= r.right + pad &&
        clientY >= r.top - pad &&
        clientY <= r.bottom + pad
      ) {
        return 'exclude';
      }
    }
    if (defaultZoneRef.current) {
      const r = defaultZoneRef.current.getBoundingClientRect();
      if (
        clientX >= r.left - pad &&
        clientX <= r.right + pad &&
        clientY >= r.top - pad &&
        clientY <= r.bottom + pad
      ) {
        return 'default';
      }
    }
    return null;
  }, []);

  // Pointer down on a tag initiates drag tracking
  const handleTagPointerDown = (
    tag: string,
    fromZone: DropZoneId,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button')) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    const grabOffsetX = startX - rect.left;
    const grabOffsetY = startY - rect.top;

    setDragState({
      tag,
      fromZone,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      grabOffsetX,
      grabOffsetY,
      width: rect.width,
      height: rect.height,
      tilt: 0,
      hoveredZone: fromZone,
      isDragging: false,
      pointerId: e.pointerId
    });
  };

  // Window-level pointer listeners ensuring the tag stays firmly glued to the cursor
  const dragStateRef = useRef<TagDragState | null>(null);
  dragStateRef.current = dragState;
  const isDraggingActive = dragState !== null;

  useEffect(() => {
    if (!isDraggingActive) return;

    const onPointerMove = (e: PointerEvent) => {
      const current = dragStateRef.current;
      if (!current) return;

      const dx = Math.abs(e.clientX - current.startX);
      const dy = Math.abs(e.clientY - current.startY);
      const isDragging = current.isDragging || dx > 3 || dy > 3;
      const hoveredZone = isDragging ? detectHoveredZone(e.clientX, e.clientY) : null;

      // Calculate horizontal velocity for natural tilt physics
      const vx = e.clientX - current.currentX;
      const rawTilt = Math.max(-14, Math.min(14, vx * 0.75));
      const tilt = isDragging ? current.tilt * 0.35 + rawTilt * 0.65 : 0;

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
              tilt,
              isDragging,
              hoveredZone
            }
          : null
      );
    };

    const onPointerUp = () => {
      const current = dragStateRef.current;
      if (current) {
        if (current.isDragging && current.hoveredZone) {
          const { tag, fromZone, hoveredZone } = current;
          if (hoveredZone !== fromZone) {
            if (hoveredZone === 'include') {
              moveTagToInclude(tag);
            } else if (hoveredZone === 'exclude') {
              moveTagToExclude(tag);
            } else if (hoveredZone === 'default') {
              moveTagToDefault(tag);
            }
          }
        } else if (!current.isDragging) {
          // Click cycle: DEFAULT -> MUST -> IGNORE -> DEFAULT
          const { tag, fromZone } = current;
          if (fromZone === 'default') {
            moveTagToInclude(tag);
          } else if (fromZone === 'include') {
            moveTagToExclude(tag);
          } else if (fromZone === 'exclude') {
            moveTagToDefault(tag);
          }
        }
      }
      setDragState(null);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDraggingActive, detectHoveredZone]);

  return (
    <FloatingWindow
      title="資訊過濾器"
      icon={<Sparkles size={14} className="title-icon" />}
      isExpanded={isExpanded}
      onCollapse={onCollapse}
      zIndex={zIndex}
      isFront={isFront}
      onFocusWindow={onFocusWindow}
      hasActiveReset={hasActiveTagFilter}
      onReset={resetInfoTagPreferences}
      resetLabel="Reset"
      resetTitle="重設所有標籤規劃"
      className="info-settings-window"
      topBarClassName="info-settings-top-bar"
    >
      {/* Scrollable Body Content */}
      <div className="info-settings-scroll-body">
        {/* Section A: Tag Planning Board (Must Included / Must Not / Default) */}
        <section className="info-settings-section tag-board-section">
          <div className="info-settings-section-header">
            <span className="section-title">進階特徵標籤規劃</span>
            <span className="section-sub">游標／觸控拖曳標籤進行分類放置</span>
          </div>

          <div className="tag-board-container">
            {/* Top Row: 7:3 Split (must included : must not included) */}
            <div className="tag-board-top-row">
              {/* Left: MUST INCLUDED (70%) */}
              <div
                ref={mustContainZoneRef}
                className={`tag-board-zone zone-include ${
                  dragState?.hoveredZone === 'include' ? 'is-drop-active' : ''
                }`}
              >
                <div className="zone-header">
                  <span className="zone-icon">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="zone-title">must</span>
                  {tagPrefs.includeTags.length > 0 && (
                    <button
                      type="button"
                      className="zone-clear-btn"
                      onClick={() => setInfoTagPreferences({ includeTags: [] })}
                      title="清空強制包含"
                    >
                      清空
                    </button>
                  )}
                </div>
                <div className="zone-content">
                  {tagPrefs.includeTags.length === 0 ? (
                    <div className="zone-placeholder">
                      拖曳標籤至此以強制包含
                    </div>
                  ) : (
                    <div className="zone-pills-row">
                      {tagPrefs.includeTags.map((tag) => {
                        const isPicked = dragState?.isDragging && dragState.tag === tag && dragState.fromZone === 'include';
                        return (
                          <div
                            key={tag}
                            className={`info-draggable-tag-pill is-include ${isPicked ? 'is-picked-up' : ''}`}
                            onPointerDown={(e) => handleTagPointerDown(tag, 'include', e)}
                            title="點擊移至 IGNORE，或點擊 ✕ 放回預設"
                          >
                            <span className="tag-name">{tag}</span>
                            <button
                              type="button"
                              className="tag-remove-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTagToDefault(tag);
                              }}
                              title="放回預設"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: MUST NOT INCLUDED (40%) */}
              <div
                ref={mustNotContainZoneRef}
                className={`tag-board-zone zone-exclude ${
                  dragState?.hoveredZone === 'exclude' ? 'is-drop-active' : ''
                }`}
              >
                <div className="zone-header">
                  <span className="zone-icon">
                    <Ban size={12} strokeWidth={2.5} />
                  </span>
                  <span className="zone-title">ignore</span>
                  {tagPrefs.excludeTags.length > 0 && (
                    <button
                      type="button"
                      className="zone-clear-btn"
                      onClick={() => setInfoTagPreferences({ excludeTags: [] })}
                      title="清空強制排除"
                    >
                      清空
                    </button>
                  )}
                </div>
                <div className="zone-content">
                  {tagPrefs.excludeTags.length === 0 ? (
                    <div className="zone-placeholder">
                      拖曳標籤至此排除
                    </div>
                  ) : (
                    <div className="zone-pills-row">
                      {tagPrefs.excludeTags.map((tag) => {
                        const isPicked = dragState?.isDragging && dragState.tag === tag && dragState.fromZone === 'exclude';
                        return (
                          <div
                            key={tag}
                            className={`info-draggable-tag-pill is-exclude ${isPicked ? 'is-picked-up' : ''}`}
                            onPointerDown={(e) => handleTagPointerDown(tag, 'exclude', e)}
                            title="點擊放回 DEFAULT"
                          >
                            <span className="tag-name">{tag}</span>
                            <button
                              type="button"
                              className="tag-remove-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTagToDefault(tag);
                              }}
                              title="放回預設"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom: DEFAULT (100% Full Width) */}
            <div
              ref={defaultZoneRef}
              className={`tag-board-zone zone-default ${
                dragState?.hoveredZone === 'default' ? 'is-drop-active' : ''
              }`}
            >
              <div className="zone-header">
                <span className="zone-title">default</span>
                <span className="zone-sub">預設未指定</span>
              </div>

              <div className="zone-content default-scroll-content">
                {defaultTags.length === 0 ? (
                  <div className="zone-placeholder">
                    所有標籤已分配至包含或排除
                  </div>
                ) : (
                  <div className="zone-pills-row">
                    {defaultTags.map(({ tag }) => {
                      const isPicked = dragState?.isDragging && dragState.tag === tag && dragState.fromZone === 'default';
                      return (
                        <div
                          key={tag}
                          className={`info-draggable-tag-pill is-default ${isPicked ? 'is-picked-up' : ''}`}
                          onPointerDown={(e) => handleTagPointerDown(tag, 'default', e)}
                          title="點擊移至 MUST (強制包含)"
                        >
                          <span className="tag-name">{tag}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section B: Tooltip Display Mode */}
        <section className="info-settings-section">
          <div className="info-settings-section-header">
            <span className="section-title">地圖提示卡懸浮模式</span>
            <span className="section-sub">滑鼠移至地圖上時之即時預覽型態</span>
          </div>
          <div className="infotip-mode-grid">
            {INFOTIP_MODE_OPTIONS.map((opt) => {
              const isSelected = infotipMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`infotip-mode-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setInfotipDisplayMode(opt.id)}
                  title={opt.descriptionZh}
                >
                  <div className="card-top">
                    <span className="card-icon">{opt.icon}</span>
                    <span className="card-title">{opt.nameZh}</span>
                    {isSelected && <span className="card-dot" />}
                  </div>
                  <div className="card-desc">{opt.descriptionZh}</div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Floating Ghost Chip stuck directly to cursor via React Portal */}
      {dragState?.isDragging &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`tag-drag-ghost zone-${dragState.hoveredZone || dragState.fromZone} ${
              dragState.hoveredZone ? 'is-over-zone' : ''
            }`}
            style={{
              position: 'fixed',
              left: `${dragState.currentX - dragState.grabOffsetX}px`,
              top: `${dragState.currentY - dragState.grabOffsetY}px`,
              width: `${dragState.width}px`,
              height: `${dragState.height}px`,
              transform: `rotate(${dragState.tilt.toFixed(1)}deg) scale(${dragState.hoveredZone ? 1.05 : 1.02})`,
              transformOrigin: `${dragState.grabOffsetX}px ${dragState.grabOffsetY}px`,
              pointerEvents: 'none',
              zIndex: 999999
            }}
          >
            <span className="ghost-glow-aura" />
            <span className="tag-name">{dragState.tag}</span>
            {dragState.hoveredZone === 'include' && (
              <span className="ghost-badge to-include">
                <Check size={10} strokeWidth={3} />
              </span>
            )}
            {dragState.hoveredZone === 'exclude' && (
              <span className="ghost-badge to-exclude">
                <Ban size={10} strokeWidth={2.5} />
              </span>
            )}
          </div>,
          document.body
        )}
    </FloatingWindow>
  );
});
