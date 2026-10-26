import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { getRegisteredCsvFilters, type RegisteredCsvFilter } from '../filters/csvFilterRegistry';
import { getAssignableRegionList } from '../filters/assignableRegions';
import { type NationwideFilterDef } from '../data/nationwideFilters';
import { FILTERS } from '../data/filters';
import {
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  RotateCcw,
  Palette,
  Layers,
  Globe,
  MapPin
} from 'lucide-react';

export interface FilterBarProps {
  activeFilterId: string;
  onSelectFilter: (filterId: string) => void;
  activeTextFilters: Set<string>;
  onToggleTextFilter: (filterId: string) => void;
  activeInternationalImageFilter: string | null;
  onToggleInternationalImageFilter: (filterId: string) => void;
  activeRegionalFilters: Set<string>;
  onToggleRegionalFilter: (filterId: string) => void;
  visibleRegionalFilters?: NationwideFilterDef[];
  showInterstates?: boolean;
  onToggleInterstates?: () => void;
  showNumberedRoutes?: boolean;
  onToggleNumberedRoutes?: () => void;
  onResetAll: () => void;
  isExpanded: boolean;
  onCollapse: () => void;
  onGotoCamera?: (lat: number, lon: number, ratio?: number) => void;
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
  showInterstates = false,
  onToggleInterstates,
  showNumberedRoutes = false,
  onToggleNumberedRoutes,
  onResetAll,
  isExpanded,
  onCollapse,
  onGotoCamera
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 4 Toggled Sections matching the spec:
  // v Fill Region With Color (Radio select)
  // v Ext Object (Multi-select)
  // v Global Label (Multi-select)
  // v Area Label (Multi-select)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    fillRegion: true,
    extObject: true,
    globalLabel: true,
    areaLabel: true
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const q = searchQuery.trim().toLowerCase();
  const isSearching = q.length > 0;

  // Retrieve registered CSV filters
  const allCsvFilters = useMemo(() => getRegisteredCsvFilters(), []);

  // Categorize CSV filters into the 4 groups
  const categorized = useMemo(() => {
    const fillRegion: Array<{
      id: string;
      nameZh: string;
      nameEn?: string;
      shortBadge?: string;
      descriptionZh?: string;
      goto?: string;
    }> = [];
    const extObject: RegisteredCsvFilter[] = [];
    const globalLabel: RegisteredCsvFilter[] = [];
    const areaLabel: RegisteredCsvFilter[] = [];

    for (const f of allCsvFilters) {
      const g = (f.meta.group as string) || '';
      if (g === 'fill-region' || f.type === 'FillWithColor') {
        fillRegion.push({
          id: f.id,
          nameZh: f.nameZh,
          nameEn: f.nameEn,
          shortBadge: f.shortBadge || f.nameZh,
          descriptionZh: f.descriptionZh,
          goto: f.goto
        });
      } else if (g === 'ext-object') {
        extObject.push(f);
      } else if (g === 'global-label' || (f.rangeKind === 'International' && !['distinctive-letters', 'distinctiveLetters', 'street-words', 'streetWords'].includes(f.id))) {
        globalLabel.push(f);
      } else {
        areaLabel.push(f);
      }
    }

    // Include preset theme filters from FILTERS that aren't already covered by CSVs
    for (const pf of FILTERS) {
      if (pf.id === 'none' || pf.id === 'base') continue;
      const alreadyHas = fillRegion.some(
        (r) =>
          r.id.toLowerCase() === pf.id.toLowerCase() ||
          (pf.id === 'drivingSide' && (r.id === 'driving-side' || r.id === 'drivingSide')) ||
          (pf.id === 'roadLines' && (r.id === 'road-markings' || r.id === 'roadMarkings'))
      );
      if (!alreadyHas) {
        fillRegion.push({
          id: pf.id,
          nameZh: pf.nameZh,
          nameEn: pf.id,
          shortBadge: pf.nameZh.slice(0, 4),
          descriptionZh: pf.descriptionZh
        });
      }
    }

    return { fillRegion, extObject, globalLabel, areaLabel };
  }, [allCsvFilters]);

  const matchesSearch = useCallback(
    (item: { nameZh: string; nameEn?: string; id: string; shortBadge?: string; descriptionZh?: string }) => {
      if (!isSearching) return true;
      return (
        item.nameZh.toLowerCase().includes(q) ||
        (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
        item.id.toLowerCase().includes(q) ||
        (item.shortBadge && item.shortBadge.toLowerCase().includes(q)) ||
        (item.descriptionZh && item.descriptionZh.toLowerCase().includes(q))
      );
    },
    [isSearching, q]
  );

  // Group 1: Fill Region With Color (Base + CSV filters)
  const filteredFillRegion = useMemo(() => {
    return categorized.fillRegion.filter(matchesSearch);
  }, [categorized.fillRegion, matchesSearch]);

  // Group 2: Ext Object (Highways, Taipower grid, etc.)
  const isTaipowerActive = activeRegionalFilters.has('taiwan-power-poles');
  const extObjectItems = useMemo(() => {
    const list = [
      {
        id: 'roads-highways',
        nameZh: '國道 / 主要高速公路網',
        nameEn: 'National Highways & Interstates',
        shortBadge: '🛣️ 國道',
        descriptionZh: '全球主要高速公路與美國州際公路路網',
        checked: showInterstates,
        onToggle: () => onToggleInterstates?.()
      },
      {
        id: 'roads-numbered',
        nameZh: '省道 / 編號道路',
        nameEn: 'Numbered Routes',
        shortBadge: '🛤️ 省道',
        descriptionZh: '各國一級編號道路與省道系統',
        checked: showNumberedRoutes,
        onToggle: () => onToggleNumberedRoutes?.()
      },
      {
        id: 'taiwan-power-poles',
        nameZh: '台灣電力座標格 (Taipower Grid)',
        nameEn: 'Taiwan Taipower Grid',
        shortBadge: '⚡ 台電',
        descriptionZh: '台灣電力公司電線桿/配電箱之兩級百公尺座標格',
        checked: isTaipowerActive,
        onToggle: () => onToggleRegionalFilter('taiwan-power-poles')
      }
    ];

    return list.filter(matchesSearch);
  }, [showInterstates, showNumberedRoutes, isTaipowerActive, matchesSearch, onToggleInterstates, onToggleNumberedRoutes, onToggleRegionalFilter]);

  // Group 3: Global Label
  const filteredGlobalLabel = useMemo(() => {
    return categorized.globalLabel.filter(matchesSearch);
  }, [categorized.globalLabel, matchesSearch]);

  // Group 4: Area Label (Distinctive letters, Street words, India scripts, EU crossing signs)
  const isEuCrossingActive = activeRegionalFilters.has('eu-pedestrian-crossing') || activeInternationalImageFilter === 'eu-pedestrian-crossing';
  const filteredAreaLabel = useMemo(() => {
    const list = [...categorized.areaLabel];
    // Include EU crossing signs if not already in list
    if (!list.some((f) => f.id === 'eu-pedestrian-crossing' || f.id === 'eu-crossing-signs')) {
      list.push({
        id: 'eu-pedestrian-crossing',
        nameZh: '歐洲行人過路標誌',
        nameEn: 'European Pedestrian Crossing Signs',
        shortBadge: '🚸 行人',
        accentColor: '#38bdf8',
        descriptionZh: '歐洲各國行人過路藍色警示標誌之條紋與人物特徵比較',
        meta: { group: 'area-label', type: 'Image' },
        rangeKind: 'International',
        targetIso2: '*',
        targetIso2s: ['*'],
        assignableList: getAssignableRegionList('International'),
        loadedTiming: 'on-demand',
        effectiveRange: 'International',
        path: 'images/crossing',
        type: 'Image',
        loaded: true,
        data: null
      });
    }
    return list.filter(matchesSearch);
  }, [categorized.areaLabel, matchesSearch]);

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

  const handleSelectFillLayer = (layerId: string, gotoStr?: string) => {
    const nextId = activeFilterId === layerId ? 'none' : layerId;
    onSelectFilter(nextId);
    if (gotoStr && onGotoCamera) {
      try {
        const p = new URLSearchParams(gotoStr);
        const lat = Number(p.get('lat'));
        const lon = Number(p.get('lon'));
        const ratio = p.has('ratio') ? Number(p.get('ratio')) : undefined;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          onGotoCamera(lat, lon, ratio);
        }
      } catch {
        // ignore malformed goto query
      }
    }
  };

  const handleToggleLabel = (filterId: string) => {
    if (filterId === 'eu-pedestrian-crossing') {
      onToggleInternationalImageFilter('eu-pedestrian-crossing');
      onToggleRegionalFilter('eu-pedestrian-crossing');
      return;
    }
    // Check if it's regional vs global
    const isRegional = categorized.areaLabel.some((f) => f.id === filterId);
    if (isRegional) {
      onToggleRegionalFilter(filterId);
    } else {
      onToggleTextFilter(filterId);
    }
  };

  // Active counts for headers
  const isBaseActive = activeFilterId === 'none' || activeFilterId === 'base';
  const activeFillCount = isBaseActive ? 0 : 1;
  const activeExtCount = (showInterstates ? 1 : 0) + (showNumberedRoutes ? 1 : 0) + (isTaipowerActive ? 1 : 0);
  const activeGlobalCount = filteredGlobalLabel.filter((f) => activeTextFilters.has(f.id)).length;
  const activeAreaCount = filteredAreaLabel.filter(
    (f) =>
      activeRegionalFilters.has(f.id) ||
      activeTextFilters.has(f.id) ||
      (f.id === 'eu-pedestrian-crossing' && isEuCrossingActive)
  ).length;

  const totalActiveCount = activeFillCount + activeExtCount + activeGlobalCount + activeAreaCount;

  return (
    <div
      ref={windowRef}
      className="filter-selector-window"
      role="dialog"
      aria-label="Layer Selector"
    >
      {/* Top Bar: Search Bar & Actions */}
      <div className="fsw-top-bar">
        <div className="fsw-search-wrapper">
          <Search size={13} className="fsw-search-icon" />
          <input
            type="text"
            className="fsw-search-input"
            placeholder="搜尋圖層 (e.g. Coverage, Driving Side, 國旗, 標線)..."
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
            title="重設所有圖層 (Reset all layers)"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}

        <button
          type="button"
          className="fsw-close-btn"
          onClick={onCollapse}
          title="關閉圖層視窗 [x]"
          aria-label="Close Layer Selector"
        >
          <X size={15} />
        </button>
      </div>

      {/* Tree Content: 4 Major Sections */}
      <div className="fsw-tree-body">
        {/* ============================================================== */}
        {/* 1. Fill Region With Color (擇一圓點 Radio Buttons)               */}
        {/* ============================================================== */}
        <div className="fsw-group">
          <button
            type="button"
            className="fsw-group-header"
            onClick={() => toggleSection('fillRegion')}
          >
            <span className="fsw-chevron">
              {isSectionOpen('fillRegion', filteredFillRegion.length > 0) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </span>
            <Palette size={14} style={{ color: '#38bdf8' }} />
            <span className="fsw-group-title">Fill Region With Color</span>
            <span className="fsw-group-sub">區塊著色 · 單選</span>
            {activeFillCount > 0 && <span className="fsw-count-pill">{activeFillCount}</span>}
          </button>

          {isSectionOpen('fillRegion', filteredFillRegion.length > 0) && (
            <div className="fsw-group-children">
              <div className="fsw-item-list">
                {/* Option 0: Base */}
                <label
                  className={`fsw-checkbox-row ${isBaseActive ? 'checked' : ''}`}
                  title="預設地圖底圖草圖風格，不疊加任何主題著色"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectFilter('none');
                  }}
                >
                  <span className={`fsw-radio-circle ${isBaseActive ? 'checked' : ''}`}>
                    {isBaseActive && <span className="fsw-radio-dot" />}
                  </span>
                  <span className="fsw-item-name">Base</span>
                  <span className="fsw-item-name-zh">預設草圖底圖</span>
                </label>

                {/* Dynamic Fill With Color Layers */}
                {filteredFillRegion.map((f) => {
                  const checked =
                    activeFilterId === f.id ||
                    (activeFilterId === 'drivingSide' && (f.id === 'driving-side' || f.id === 'drivingSide')) ||
                    (activeFilterId === 'driving-side' && (f.id === 'driving-side' || f.id === 'drivingSide')) ||
                    (activeFilterId === 'roadLines' && (f.id === 'road-markings' || f.id === 'roadMarkings')) ||
                    (activeFilterId === 'road-markings' && (f.id === 'road-markings' || f.id === 'roadMarkings'));
                  return (
                    <label
                      key={f.id}
                      className={`fsw-checkbox-row ${checked ? 'checked' : ''}`}
                      title={f.descriptionZh || f.nameZh}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelectFillLayer(f.id, f.goto);
                      }}
                    >
                      <span className={`fsw-radio-circle ${checked ? 'checked' : ''}`}>
                        {checked && <span className="fsw-radio-dot" />}
                      </span>
                      <span className="fsw-item-name">{f.shortBadge || f.nameZh}</span>
                      <span className="fsw-item-name-zh">{f.nameZh}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 2. Ext Object (外加物件 · 複選 Checkboxes)                       */}
        {/* ============================================================== */}
        <div className="fsw-group">
          <button
            type="button"
            className="fsw-group-header"
            onClick={() => toggleSection('extObject')}
          >
            <span className="fsw-chevron">
              {isSectionOpen('extObject', extObjectItems.length > 0) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </span>
            <Layers size={14} style={{ color: '#a855f7' }} />
            <span className="fsw-group-title">Ext Object</span>
            <span className="fsw-group-sub">外加物件 · 複選</span>
            {activeExtCount > 0 && <span className="fsw-count-pill">{activeExtCount}</span>}
          </button>

          {isSectionOpen('extObject', extObjectItems.length > 0) && (
            <div className="fsw-group-children">
              <div className="fsw-item-list">
                {extObjectItems.map((item) => (
                  <label
                    key={item.id}
                    className={`fsw-checkbox-row ${item.checked ? 'checked' : ''}`}
                    title={item.descriptionZh}
                    onClick={(e) => {
                      e.preventDefault();
                      item.onToggle();
                    }}
                  >
                    <span className={`fsw-checkbox ${item.checked ? 'checked' : ''}`}>
                      {item.checked && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="fsw-item-name">{item.shortBadge}</span>
                    <span className="fsw-item-name-zh">{item.nameZh}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 3. Global Label (全球文字與標籤 · 複選 Checkboxes)                */}
        {/* ============================================================== */}
        <div className="fsw-group">
          <button
            type="button"
            className="fsw-group-header"
            onClick={() => toggleSection('globalLabel')}
          >
            <span className="fsw-chevron">
              {isSectionOpen('globalLabel', filteredGlobalLabel.length > 0) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </span>
            <Globe size={14} style={{ color: '#10b981' }} />
            <span className="fsw-group-title">Global Label</span>
            <span className="fsw-group-sub">全球文字與標籤 · 複選</span>
            {activeGlobalCount > 0 && <span className="fsw-count-pill">{activeGlobalCount}</span>}
          </button>

          {isSectionOpen('globalLabel', filteredGlobalLabel.length > 0) && (
            <div className="fsw-group-children">
              <div className="fsw-item-list">
                {filteredGlobalLabel.map((f) => {
                  const checked = activeTextFilters.has(f.id);
                  return (
                    <label
                      key={f.id}
                      className={`fsw-checkbox-row ${checked ? 'checked' : ''}`}
                      title={f.descriptionZh || f.nameZh}
                      onClick={(e) => {
                        e.preventDefault();
                        onToggleTextFilter(f.id);
                      }}
                    >
                      <span className={`fsw-checkbox ${checked ? 'checked' : ''}`}>
                        {checked && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="fsw-item-name">{f.shortBadge || f.nameZh}</span>
                      <span className="fsw-item-name-zh">{f.nameZh}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 4. Area Label (區域特徵與圖標 · 複選 Checkboxes)                  */}
        {/* ============================================================== */}
        <div className="fsw-group">
          <button
            type="button"
            className="fsw-group-header"
            onClick={() => toggleSection('areaLabel')}
          >
            <span className="fsw-chevron">
              {isSectionOpen('areaLabel', filteredAreaLabel.length > 0) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </span>
            <MapPin size={14} style={{ color: '#f59e0b' }} />
            <span className="fsw-group-title">Area Label</span>
            <span className="fsw-group-sub">區域特徵與圖標 · 複選</span>
            {activeAreaCount > 0 && <span className="fsw-count-pill">{activeAreaCount}</span>}
          </button>

          {isSectionOpen('areaLabel', filteredAreaLabel.length > 0) && (
            <div className="fsw-group-children">
              <div className="fsw-item-list">
                {filteredAreaLabel.map((f) => {
                  const checked =
                    activeRegionalFilters.has(f.id) ||
                    activeTextFilters.has(f.id) ||
                    (f.id === 'eu-pedestrian-crossing' && isEuCrossingActive);
                  return (
                    <label
                      key={f.id}
                      className={`fsw-checkbox-row ${checked ? 'checked' : ''}`}
                      title={f.descriptionZh || f.nameZh}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleLabel(f.id);
                      }}
                    >
                      <span className={`fsw-checkbox ${checked ? 'checked' : ''}`}>
                        {checked && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="fsw-item-name">{f.shortBadge || f.nameZh}</span>
                      <span className="fsw-item-name-zh">{f.nameZh}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
