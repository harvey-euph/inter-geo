import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FILTERS } from '../data/filters';
import {
  INTERNATIONAL_TEXT_FILTERS,
  INTERNATIONAL_IMAGE_FILTERS
} from '../data/internationalFilters';
import {
  ALL_NATIONWIDE_FILTERS,
  type NationwideFilterDef
} from '../data/nationwideFilters';
import { RoadShieldBadge } from './RoadShieldBadge';
import {
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  RotateCcw
} from 'lucide-react';

interface FilterBarProps {
  activeFilterId: string;
  onSelectFilter: (filterId: string) => void;
  activeTextFilters: Set<string>;
  onToggleTextFilter: (filterId: string) => void;
  activeInternationalImageFilter: string | null;
  onToggleInternationalImageFilter: (filterId: string) => void;
  activeRegionalFilters: Set<string>;
  onToggleRegionalFilter: (filterId: string) => void;
  visibleRegionalFilters: NationwideFilterDef[];
  onResetAll: () => void;
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
  activeRegionalFilters,
  onToggleRegionalFilter,
  visibleRegionalFilters,
  onResetAll,
  isExpanded,
  onCollapse
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hideOutsideWindow, setHideOutsideWindow] = useState(true);

  // Tree expansion states matching the schematic default:
  // v International -> > Fill Color, > Image, v Text
  // v Nationwide -> > Fill Color, > Image, > Text
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    international: true,
    'int-fill': false,
    'int-image': false,
    'int-text': true,
    nationwide: true,
    'nat-fill': false,
    'nat-image': false,
    'nat-text': false
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const q = searchQuery.trim().toLowerCase();
  const isSearching = q.length > 0;

  // International Fill Color options (exclude 'none' since unchecking turns off coloring)
  const intFillFilters = useMemo(() => {
    const list = FILTERS.filter((f) => f.id !== 'none');
    if (!isSearching) return list;
    return list.filter(
      (f) =>
        f.nameZh.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q) ||
        f.descriptionZh.toLowerCase().includes(q)
    );
  }, [isSearching, q]);

  const intImageFilters = useMemo(() => {
    if (!isSearching) return INTERNATIONAL_IMAGE_FILTERS;
    return INTERNATIONAL_IMAGE_FILTERS.filter(
      (f) =>
        f.nameZh.toLowerCase().includes(q) ||
        f.nameEn.toLowerCase().includes(q) ||
        f.descriptionZh.toLowerCase().includes(q)
    );
  }, [isSearching, q]);

  const intTextFilters = useMemo(() => {
    if (!isSearching) return INTERNATIONAL_TEXT_FILTERS;
    return INTERNATIONAL_TEXT_FILTERS.filter(
      (f) =>
        f.nameZh.toLowerCase().includes(q) ||
        f.nameEn.toLowerCase().includes(q) ||
        f.shortBadge.toLowerCase().includes(q) ||
        f.descriptionZh.toLowerCase().includes(q)
    );
  }, [isSearching, q]);

  // Nationwide filters source: either viewport-visible (+ any currently active) or all nationwide filters
  const baseNationwideList = useMemo(() => {
    if (!hideOutsideWindow) {
      return ALL_NATIONWIDE_FILTERS;
    }
    const map = new Map<string, NationwideFilterDef>();
    for (const f of visibleRegionalFilters) {
      map.set(f.id, f);
    }
    // Always keep currently checked filters visible so the user can uncheck them
    for (const f of ALL_NATIONWIDE_FILTERS) {
      if (activeRegionalFilters.has(f.id) && !map.has(f.id)) {
        map.set(f.id, f);
      }
    }
    return Array.from(map.values());
  }, [hideOutsideWindow, visibleRegionalFilters, activeRegionalFilters]);

  const filteredNationwideList = useMemo(() => {
    if (!isSearching) return baseNationwideList;
    return baseNationwideList.filter(
      (f) =>
        f.nameZh.toLowerCase().includes(q) ||
        f.nameEn.toLowerCase().includes(q) ||
        f.shortBadge.toLowerCase().includes(q) ||
        f.descriptionZh.toLowerCase().includes(q) ||
        (f.countryIso2 && f.countryIso2.toLowerCase().includes(q)) ||
        (f.targetIso2 && f.targetIso2.toLowerCase().includes(q))
    );
  }, [baseNationwideList, isSearching, q]);

  const natFillFilters = useMemo(
    () =>
      filteredNationwideList.filter(
        (f) => f.layerType === 'coloring' || f.layerType === 'roads'
      ),
    [filteredNationwideList]
  );

  const natImageFilters = useMemo(
    () => filteredNationwideList.filter((f) => f.layerType === 'image'),
    [filteredNationwideList]
  );

  const natTextFilters = useMemo(
    () => filteredNationwideList.filter((f) => f.layerType === 'text'),
    [filteredNationwideList]
  );

  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDownOutside = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (windowRef.current && windowRef.current.contains(target)) {
        return;
      }
      if (target.closest('.filter-trigger-btn')) {
        return;
      }
      onCollapse();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCollapse();
      }
    };

    window.addEventListener('pointerdown', handlePointerDownOutside, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isExpanded, onCollapse]);

  if (!isExpanded) return null;

  const isSectionOpen = (key: string, hasSearchMatches: boolean) =>
    isSearching ? hasSearchMatches : !!openSections[key];

  const activeIntFillCount = activeFilterId !== 'none' ? 1 : 0;
  const activeIntImageCount = activeInternationalImageFilter ? 1 : 0;
  const activeIntTextCount = activeTextFilters.size;

  const activeNatFillCount = natFillFilters.filter((f) =>
    activeRegionalFilters.has(f.id)
  ).length;
  const activeNatImageCount = natImageFilters.filter((f) =>
    activeRegionalFilters.has(f.id)
  ).length;
  const activeNatTextCount = natTextFilters.filter((f) =>
    activeRegionalFilters.has(f.id)
  ).length;

  const totalActiveCount =
    activeIntFillCount +
    activeIntImageCount +
    activeIntTextCount +
    activeRegionalFilters.size;

  return (
    <div
      ref={windowRef}
      className="filter-selector-window"
      role="dialog"
      aria-label="Filter Selector"
    >
      {/* Top Bar: --- Search Bar --- [x] */}
      <div className="fsw-top-bar">
        <div className="fsw-search-wrapper">
          <Search size={13} className="fsw-search-icon" />
          <input
            type="text"
            className="fsw-search-input"
            placeholder="Search filters (e.g. Country Code, TLD, Road)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="fsw-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {totalActiveCount > 0 && (
          <button
            type="button"
            className="fsw-reset-btn"
            onClick={onResetAll}
            title="重設所有已勾選的濾鏡 (Reset all active filters)"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}

        <button
          type="button"
          className="fsw-close-btn"
          onClick={onCollapse}
          title="關閉濾鏡視窗 [x]"
          aria-label="Close Filter Selector"
        >
          <X size={15} />
        </button>
      </div>

      {/* Tree Content */}
      <div className="fsw-tree-body">
        {/* ======================== v International ======================== */}
        <div className="fsw-group">
          <button
            type="button"
            className="fsw-group-header"
            onClick={() => toggleSection('international')}
          >
            <span className="fsw-chevron">
              {isSectionOpen(
                'international',
                intFillFilters.length + intImageFilters.length + intTextFilters.length > 0
              ) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </span>
            <span className="fsw-group-title">International</span>
            <span className="fsw-group-sub">國際通用</span>
            {activeIntFillCount + activeIntImageCount + activeIntTextCount > 0 && (
              <span className="fsw-count-pill">
                {activeIntFillCount + activeIntImageCount + activeIntTextCount}
              </span>
            )}
          </button>

          {isSectionOpen(
            'international',
            intFillFilters.length + intImageFilters.length + intTextFilters.length > 0
          ) && (
            <div className="fsw-group-children">
              {/* > Fill Color */}
              <div className="fsw-subgroup">
                <button
                  type="button"
                  className="fsw-subgroup-header"
                  onClick={() => toggleSection('int-fill')}
                >
                  <span className="fsw-chevron">
                    {isSectionOpen('int-fill', intFillFilters.length > 0) ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </span>
                  <span className="fsw-subgroup-title">Fill Color</span>
                  <span className="fsw-subgroup-hint">著色圖層 · 單選</span>
                  {activeIntFillCount > 0 && (
                    <span className="fsw-count-pill">{activeIntFillCount}</span>
                  )}
                </button>

                {isSectionOpen('int-fill', intFillFilters.length > 0) && (
                  <div className="fsw-item-list">
                    {intFillFilters.length === 0 ? (
                      <div className="fsw-empty-item">No matching fill color filters</div>
                    ) : (
                      intFillFilters.map((f) => {
                        const checked = activeFilterId === f.id;
                        return (
                          <label
                            key={f.id}
                            className={`fsw-checkbox-row ${checked ? 'checked' : ''}`}
                            title={f.descriptionZh}
                            onClick={(e) => {
                              e.preventDefault();
                              onSelectFilter(checked ? 'none' : f.id);
                            }}
                          >
                            <span className={`fsw-checkbox ${checked ? 'checked' : ''}`}>
                              {checked && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className="fsw-item-name">{f.nameZh}</span>
                            <span className="fsw-item-name-zh">{f.id}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* > Image */}
              <div className="fsw-subgroup">
                <button
                  type="button"
                  className="fsw-subgroup-header"
                  onClick={() => toggleSection('int-image')}
                >
                  <span className="fsw-chevron">
                    {isSectionOpen('int-image', intImageFilters.length > 0) ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </span>
                  <span className="fsw-subgroup-title">Image</span>
                  <span className="fsw-subgroup-hint">圖片標記</span>
                  {activeIntImageCount > 0 && (
                    <span className="fsw-count-pill">{activeIntImageCount}</span>
                  )}
                </button>

                {isSectionOpen('int-image', intImageFilters.length > 0) && (
                  <div className="fsw-item-list">
                    {intImageFilters.length === 0 ? (
                      <div className="fsw-empty-item">No matching image filters</div>
                    ) : (
                      intImageFilters.map((imgF) => {
                        const checked = activeInternationalImageFilter === imgF.id;
                        return (
                          <label
                            key={imgF.id}
                            className={`fsw-checkbox-row ${checked ? 'checked' : ''}`}
                            title={imgF.descriptionZh}
                            onClick={(e) => {
                              e.preventDefault();
                              onToggleInternationalImageFilter(imgF.id);
                            }}
                          >
                            <span className={`fsw-checkbox ${checked ? 'checked' : ''}`}>
                              {checked && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className="fsw-item-name">{imgF.nameEn}</span>
                            <span className="fsw-item-name-zh">{imgF.nameZh}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* v Text */}
              <div className="fsw-subgroup">
                <button
                  type="button"
                  className="fsw-subgroup-header"
                  onClick={() => toggleSection('int-text')}
                >
                  <span className="fsw-chevron">
                    {isSectionOpen('int-text', intTextFilters.length > 0) ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </span>
                  <span className="fsw-subgroup-title">Text</span>
                  <span className="fsw-subgroup-hint">文字標籤 · 最多 2 項</span>
                  {activeIntTextCount > 0 && (
                    <span className="fsw-count-pill">{activeIntTextCount}</span>
                  )}
                </button>

                {isSectionOpen('int-text', intTextFilters.length > 0) && (
                  <div className="fsw-item-list">
                    {intTextFilters.length === 0 ? (
                      <div className="fsw-empty-item">No matching text filters</div>
                    ) : (
                      intTextFilters.map((tf) => {
                        const checked = activeTextFilters.has(tf.id);
                        return (
                          <label
                            key={tf.id}
                            className={`fsw-checkbox-row ${checked ? 'checked' : ''}`}
                            title={tf.descriptionZh}
                            onClick={(e) => {
                              e.preventDefault();
                              onToggleTextFilter(tf.id);
                            }}
                          >
                            <span className={`fsw-checkbox ${checked ? 'checked' : ''}`}>
                              {checked && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className="fsw-item-name">{tf.nameEn}</span>
                            <span className="fsw-item-name-zh">{tf.nameZh}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ======================== v Nationwide ======================== */}
        <div className="fsw-group">
          <div className="fsw-group-header fsw-group-header-nationwide">
            <button
              type="button"
              className="fsw-group-header-main"
              onClick={() => toggleSection('nationwide')}
            >
              <span className="fsw-chevron">
                {isSectionOpen('nationwide', filteredNationwideList.length > 0) ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </span>
              <span className="fsw-group-title">Nationwide</span>
              {activeRegionalFilters.size > 0 && (
                <span className="fsw-count-pill">{activeRegionalFilters.size}</span>
              )}
            </button>

            {/* Inline toggle: ( Hide outside window ones ) */}
            <label
              className="fsw-window-filter-toggle"
              title="只顯示當前視野 (L2/L3) 內的區域專屬濾鏡 (Hide filters outside current map viewport)"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <input
                type="checkbox"
                checked={hideOutsideWindow}
                onChange={(e) => setHideOutsideWindow(e.target.checked)}
              />
              <span className={`fsw-mini-checkbox ${hideOutsideWindow ? 'checked' : ''}`}>
                {hideOutsideWindow && <Check size={10} strokeWidth={3} />}
              </span>
              <span className="fsw-window-filter-label">Hide outside window ones</span>
            </label>
          </div>

          {isSectionOpen('nationwide', filteredNationwideList.length > 0) && (
            <div className="fsw-group-children">
              {/* > Fill Color */}
              <div className="fsw-subgroup">
                <button
                  type="button"
                  className="fsw-subgroup-header"
                  onClick={() => toggleSection('nat-fill')}
                >
                  <span className="fsw-chevron">
                    {isSectionOpen('nat-fill', natFillFilters.length > 0) ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </span>
                  <span className="fsw-subgroup-title">Fill Color</span>
                  <span className="fsw-subgroup-hint">區域著色 / 路網 ({natFillFilters.length})</span>
                  {activeNatFillCount > 0 && (
                    <span className="fsw-count-pill">{activeNatFillCount}</span>
                  )}
                </button>

                {isSectionOpen('nat-fill', natFillFilters.length > 0) && (
                  <div className="fsw-item-list">
                    {natFillFilters.length === 0 ? (
                      <div className="fsw-empty-item">
                        {hideOutsideWindow
                          ? 'Zoom in (L2) to a country or uncheck "Hide outside window ones"'
                          : 'No matching nationwide fill filters'}
                      </div>
                    ) : (
                      natFillFilters.map((rf) => {
                        const checked = activeRegionalFilters.has(rf.id);
                        return (
                          <label
                            key={rf.id}
                            className={`fsw-checkbox-row ${checked ? 'checked' : ''}`}
                            title={rf.descriptionZh}
                            onClick={(e) => {
                              e.preventDefault();
                              onToggleRegionalFilter(rf.id);
                            }}
                          >
                            <span className={`fsw-checkbox ${checked ? 'checked' : ''}`}>
                              {checked && <Check size={11} strokeWidth={3} />}
                            </span>
                            {rf.shieldType && (
                              <span className="fsw-shield-icon">
                                <RoadShieldBadge
                                  type={rf.shieldType}
                                  label={rf.shortBadge}
                                  size={16}
                                  active={checked}
                                />
                              </span>
                            )}
                            <span className="fsw-item-name">{rf.nameEn}</span>
                            <span className="fsw-item-name-zh">{rf.nameZh}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* > Image */}
              <div className="fsw-subgroup">
                <button
                  type="button"
                  className="fsw-subgroup-header"
                  onClick={() => toggleSection('nat-image')}
                >
                  <span className="fsw-chevron">
                    {isSectionOpen('nat-image', natImageFilters.length > 0) ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </span>
                  <span className="fsw-subgroup-title">Image</span>
                  <span className="fsw-subgroup-hint">區域圖片 ({natImageFilters.length})</span>
                  {activeNatImageCount > 0 && (
                    <span className="fsw-count-pill">{activeNatImageCount}</span>
                  )}
                </button>

                {isSectionOpen('nat-image', natImageFilters.length > 0) && (
                  <div className="fsw-item-list">
                    {natImageFilters.length === 0 ? (
                      <div className="fsw-empty-item">
                        {hideOutsideWindow
                          ? 'No image filters in current window'
                          : 'No nationwide image filters registered'}
                      </div>
                    ) : (
                      natImageFilters.map((rf) => {
                        const checked = activeRegionalFilters.has(rf.id);
                        return (
                          <label
                            key={rf.id}
                            className={`fsw-checkbox-row ${checked ? 'checked' : ''}`}
                            title={rf.descriptionZh}
                            onClick={(e) => {
                              e.preventDefault();
                              onToggleRegionalFilter(rf.id);
                            }}
                          >
                            <span className={`fsw-checkbox ${checked ? 'checked' : ''}`}>
                              {checked && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className="fsw-item-name">{rf.nameEn}</span>
                            <span className="fsw-item-name-zh">{rf.nameZh}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* > Text */}
              <div className="fsw-subgroup">
                <button
                  type="button"
                  className="fsw-subgroup-header"
                  onClick={() => toggleSection('nat-text')}
                >
                  <span className="fsw-chevron">
                    {isSectionOpen('nat-text', natTextFilters.length > 0) ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </span>
                  <span className="fsw-subgroup-title">Text</span>
                  <span className="fsw-subgroup-hint">區域文字 ({natTextFilters.length})</span>
                  {activeNatTextCount > 0 && (
                    <span className="fsw-count-pill">{activeNatTextCount}</span>
                  )}
                </button>

                {isSectionOpen('nat-text', natTextFilters.length > 0) && (
                  <div className="fsw-item-list">
                    {natTextFilters.length === 0 ? (
                      <div className="fsw-empty-item">
                        {hideOutsideWindow
                          ? 'Zoom in (L2) to a supported country or uncheck "Hide outside window ones"'
                          : 'No matching nationwide text filters'}
                      </div>
                    ) : (
                      natTextFilters.map((rf) => {
                        const checked = activeRegionalFilters.has(rf.id);
                        return (
                          <label
                            key={rf.id}
                            className={`fsw-checkbox-row ${checked ? 'checked' : ''}`}
                            title={rf.descriptionZh}
                            onClick={(e) => {
                              e.preventDefault();
                              onToggleRegionalFilter(rf.id);
                            }}
                          >
                            <span className={`fsw-checkbox ${checked ? 'checked' : ''}`}>
                              {checked && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className="fsw-item-name">{rf.nameEn}</span>
                            <span className="fsw-item-name-zh">{rf.nameZh}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
