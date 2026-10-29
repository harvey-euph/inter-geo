import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  getRegisteredCsvLayers,
  onLayersIndexLoaded,
  isLayersIndexLoaded,
  type RegisteredCsvLayer
} from '../layers/csvLayerRegistry';
import { type NationwideLayerDef } from '../data/nationwideLayers';
import {
  ChevronRight,
  ChevronDown,
  Check,
  Palette,
  Layers,
  Globe,
  MapPin
} from 'lucide-react';
import { FloatingWindow } from './FloatingWindow';

export interface LayerBarProps {
  activeFilterId: string;
  onSelectFilter: (filterId: string) => void;
  activeTextFilters: Set<string>;
  onToggleTextFilter: (filterId: string) => void;
  activeInternationalImageFilter: string | null;
  onToggleInternationalImageFilter: (filterId: string) => void;
  activeRegionalFilters: Set<string>;
  onToggleRegionalFilter: (filterId: string) => void;
  visibleRegionalFilters?: NationwideLayerDef[];
  onResetAll: () => void;
  isExpanded: boolean;
  onCollapse: () => void;
  onGotoCamera?: (lat: number, lon: number, ratio?: number) => void;
  zIndex?: number;
  isFront?: boolean;
  onFocusWindow?: () => void;
}

export const LayerBar: React.FC<LayerBarProps> = React.memo(({
  activeFilterId,
  onSelectFilter,
  activeTextFilters,
  onToggleTextFilter,
  activeInternationalImageFilter,
  activeRegionalFilters,
  onToggleRegionalFilter,
  onResetAll,
  isExpanded,
  onCollapse,
  onGotoCamera,
  zIndex,
  isFront,
  onFocusWindow
}) => {
  const [layersLoaded, setLayersLoaded] = useState(isLayersIndexLoaded());

  useEffect(() => {
    if (!layersLoaded) {
      return onLayersIndexLoaded(() => setLayersLoaded(true));
    }
  }, [layersLoaded]);

  const searchQuery = '';

  // 3 Toggled Sections matching the spec:
  // v Fill Region With Color (Radio select)
  // v Global Label (Multi-select)
  // v Area Feature (Multi-select)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    fillRegion: true,
    globalLabel: true,
    areaFeature: true
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const q = searchQuery.trim().toLowerCase();
  const isSearching = q.length > 0;

  // Retrieve registered CSV layers
  const allCsvLayers = useMemo(() => {
    void layersLoaded;
    return getRegisteredCsvLayers();
  }, [layersLoaded]);

  // Categorize CSV layers into groups
  const categorized = useMemo(() => {
    const fillRegion: Array<{
      id: string;
      nameZh: string;
      nameEn?: string;
      shortBadge?: string;
      descriptionZh?: string;
      goto?: string;
    }> = [];
    const globalLabel: RegisteredCsvLayer[] = [];
    const areaFeature: RegisteredCsvLayer[] = [];

    for (const f of allCsvLayers) {
      const g = (f.meta.group as string) || (f.group as string) || '';
      if (g === 'fill-region' || g === 'fill-region-with-color') {
        fillRegion.push({
          id: f.id,
          nameZh: f.nameZh,
          nameEn: f.nameEn,
          shortBadge: f.shortBadge || f.nameZh,
          descriptionZh: f.descriptionZh,
          goto: f.goto
        });
      } else if (g === 'global-label' || (f.rangeKind === 'International' && (f.type === 'Text' || f.type === 'TextWithStyle') && g !== 'area-feature')) {
        globalLabel.push(f);
      } else {
        areaFeature.push(f);
      }
    }

    return {
      fillRegion,
      globalLabel,
      areaFeature
    };
  }, [allCsvLayers]);

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

  // Group 2: Global Label
  const filteredGlobalLabel = useMemo(() => {
    return categorized.globalLabel.filter(matchesSearch);
  }, [categorized.globalLabel, matchesSearch]);

  // Group 3: Area Feature (Highways, Taipower grid, Pedestrian crossing, South Asia scripts, etc.)
  const isEuCrossingActive =
    activeRegionalFilters.has('eu-pedestrian-crossing') ||
    activeRegionalFilters.has('pedestrian-crossing') ||
    activeInternationalImageFilter === 'eu-pedestrian-crossing' ||
    activeInternationalImageFilter === 'pedestrian-crossing';

  const isSectionOpen = (key: string, hasSearchMatches: boolean) => {
    if (isSearching) return hasSearchMatches;
    return !!openSections[key];
  };

  const handleSelectFillLayer = (layerId: string, gotoStr?: string) => {
    const nextId = activeFilterId === layerId ? 'base' : layerId;
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

  const handleToggleLabel = useCallback(
    (filterId: string, gotoStr?: string) => {
      if (filterId === 'eu-pedestrian-crossing' || filterId === 'pedestrian-crossing') {
        const turningOn = !isEuCrossingActive;
        onToggleRegionalFilter('pedestrian-crossing');
        if (turningOn && onGotoCamera) {
          const goto = gotoStr || 'lat=50&lon=16&ratio=4';
          try {
            const p = new URLSearchParams(goto);
            const lat = Number(p.get('lat'));
            const lon = Number(p.get('lon'));
            const ratio = p.has('ratio') ? Number(p.get('ratio')) : undefined;
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              onGotoCamera(lat, lon, ratio);
            }
          } catch {
            // ignore
          }
        }
        return;
      }

      onToggleRegionalFilter(filterId);
    },
    [isEuCrossingActive, onToggleRegionalFilter, onGotoCamera]
  );

  const areaFeatureItems = useMemo(() => {
    const list: Array<{
      id: string;
      nameZh: string;
      nameEn?: string;
      shortBadge?: string;
      descriptionZh?: string;
      goto?: string;
      checked: boolean;
      onToggle: () => void;
    }> = [];

    for (const layer of categorized.areaFeature) {
      const isEuCrossing = layer.id === 'eu-pedestrian-crossing' || layer.id === 'pedestrian-crossing';
      const checked = isEuCrossing
        ? isEuCrossingActive
        : (activeRegionalFilters.has(layer.id) || activeTextFilters.has(layer.id));

      list.push({
        id: layer.id,
        nameZh: layer.nameZh,
        nameEn: layer.nameEn,
        shortBadge: layer.shortBadge || layer.nameZh,
        descriptionZh: layer.descriptionZh || layer.nameZh,
        goto: layer.goto,
        checked,
        onToggle: () => handleToggleLabel(layer.id, layer.goto)
      });
    }

    return list.filter(matchesSearch);
  }, [
    categorized.areaFeature,
    activeRegionalFilters,
    activeTextFilters,
    isEuCrossingActive,
    matchesSearch,
    handleToggleLabel
  ]);

  // Check if base layer is active
  const isBaseActive = activeFilterId === 'none' || activeFilterId === 'base';

  // Active counts for header
  const activeAreaFeatureCount =
    categorized.areaFeature.filter((f) =>
      (f.id === 'eu-pedestrian-crossing' || f.id === 'pedestrian-crossing')
        ? isEuCrossingActive
        : (activeRegionalFilters.has(f.id) || activeTextFilters.has(f.id))
    ).length;
  const activeGlobalCount = filteredGlobalLabel.filter((f) => activeTextFilters.has(f.id)).length;

  const totalActiveCount = activeAreaFeatureCount + activeGlobalCount;

  return (
    <FloatingWindow
      title="圖層選擇器"
      icon={<Layers size={14} className="title-icon" />}
      isExpanded={isExpanded}
      onCollapse={onCollapse}
      zIndex={zIndex}
      isFront={isFront}
      onFocusWindow={onFocusWindow}
      hasActiveReset={totalActiveCount > 0}
      onReset={onResetAll}
      resetLabel="Reset"
      resetTitle="重設所有圖層 (Reset all layers)"
    >
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
          </button>

          {isSectionOpen('fillRegion', filteredFillRegion.length > 0) && (
            <div className="fsw-group-children">
              <div className="fsw-item-list">
                {/* Dynamic Fill With Color Layers (including base) */}
                {filteredFillRegion.map((f) => {
                  const checked =
                    (f.id === 'base' && isBaseActive) ||
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
        {/* 2. Global Label (全球文字與標籤 · 複選 Checkboxes)                */}
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
        {/* 3. Area Feature (區域特徵與物件 · 複選 Checkboxes)                */}
        {/* ============================================================== */}
        <div className="fsw-group">
          <button
            type="button"
            className="fsw-group-header"
            onClick={() => toggleSection('areaFeature')}
          >
            <span className="fsw-chevron">
              {isSectionOpen('areaFeature', areaFeatureItems.length > 0) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </span>
            <MapPin size={14} style={{ color: '#f59e0b' }} />
            <span className="fsw-group-title">Area Feature</span>
            <span className="fsw-group-sub">區域特徵與物件 · 複選</span>
            {activeAreaFeatureCount > 0 && <span className="fsw-count-pill">{activeAreaFeatureCount}</span>}
          </button>

          {isSectionOpen('areaFeature', areaFeatureItems.length > 0) && (
            <div className="fsw-group-children">
              <div className="fsw-item-list">
                {areaFeatureItems.map((item) => (
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
      </div>
    </FloatingWindow>
  );
});
