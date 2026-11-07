import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapLibreAdapter } from './MapLibreAdapter';
import type { ProjectionMode } from './ProjectionController';
import type { CanonicalFeature } from './data/FeatureRegistry';
import { AdministrativeHierarchy } from './data/AdministrativeHierarchy';
import { FeatureTooltip } from '../components/FeatureTooltip';
import { MapLegend } from './MapLegend';
import { MapControls } from './MapControls';
import type { CountryData, LegendItem } from '../types/geo';
import type { L2SubdivisionDetail, MunicipalityDetail } from '../types/lod';
import type { MapFocusTarget, MapSelectOptions } from '../components/WorldMap';
import type { NationwideLayerDef } from '../data/nationwideLayers';
import type { RoadPathData } from '../data/roadsMeta';
import type { LayerDefinition } from '../data/layers';
import { findCountry } from '../data/countries';
import { isSouthAmerica } from '../data/l3Manifest';
import { isRoadLayerActiveForCountry } from '../data/roadsManifest';
import { NATIONWIDE_LAYERS } from '../data/nationwideLayers';
import { getCsvLayerById, getCsvLayerValue } from '../layers/csvLayerRegistry';
import { MAP_COLORS } from './theme';

export interface MapContainerProps {
  activeFilterId: string;
  activeTextFilters?: Set<string>;
  onToggleTextFilter?: (filterId: string) => void;
  activeInternationalImageFilter?: string | null;
  onToggleInternationalImageFilter?: (filterId: string) => void;
  activeRegionalFilters?: Set<string>;
  onToggleRegionalFilter?: (filterId: string) => void;
  onVisibleRegionalFiltersChange?: (filters: NationwideLayerDef[]) => void;
  isFilterExpanded?: boolean;
  selectedCountry: CountryData | null;
  onSelectCountry: (country: CountryData | null, options?: MapSelectOptions) => void;
  selectedSubdivision?: L2SubdivisionDetail | null;
  onSelectSubdivision?: (sub: L2SubdivisionDetail | null, options?: MapSelectOptions) => void;
  selectedMunicipality?: MunicipalityDetail | null;
  onSelectMunicipality?: (muni: MunicipalityDetail | null, options?: MapSelectOptions) => void;
  hoveredCountry?: CountryData | null;
  setHoveredCountry?: (country: CountryData | null) => void;
  zoomToSubdivisionRef?: React.MutableRefObject<((iso2: string, id: string | number) => void) | null>;
  focusMapRef?: React.MutableRefObject<((target: MapFocusTarget) => void) | null>;
  initialTarget?: string;
  initialFocusTarget?: string;
  showRoads?: boolean;
  showInterstates?: boolean;
  showNumberedRoutes?: boolean;
  selectedRoad?: RoadPathData | null;
  onSelectRoad?: (road: RoadPathData | null, options?: MapSelectOptions) => void;
  detailPanelWidth?: number;
  detailPanelFullWidth?: boolean;
  onOceanClick?: () => void;
  projectionMode?: ProjectionMode;
  onProjectionModeChange?: (mode: ProjectionMode) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  activeFilterId,
  activeTextFilters,
  onToggleTextFilter,
  activeInternationalImageFilter,
  onToggleInternationalImageFilter,
  activeRegionalFilters,
  onToggleRegionalFilter,
  onVisibleRegionalFiltersChange,
  isFilterExpanded = false,
  selectedCountry,
  onSelectCountry,
  selectedSubdivision,
  onSelectSubdivision,
  selectedMunicipality,
  onSelectMunicipality,
  selectedRoad,
  showRoads,
  focusMapRef,
  zoomToSubdivisionRef,
  detailPanelWidth = 420,
  detailPanelFullWidth = false,
  onOceanClick,
  projectionMode = '2d',
  onProjectionModeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MapLibreAdapter | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<CanonicalFeature | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [filterVersion, setFilterVersion] = useState(0);

  // Active layer definition for MapLegend
  const activeFilterDef = useMemo<LayerDefinition>(() => {
    const csvF = getCsvLayerById(activeFilterId) || (activeFilterId === 'none' ? getCsvLayerById('base') : undefined);
    if (csvF) {
      const defaultCol =
        csvF.meta.defaultColor ||
        csvF.defaultColor ||
        ((csvF.meta as Record<string, unknown>)['default-color'] as string | undefined);

      let legend: LegendItem[] = [];
      if (csvF.legend && csvF.legend.length > 0) {
        legend = csvF.legend.map((item) => ({ key: item.key, color: item.color, labelZh: item.labelZh }));
      } else if (csvF.id !== 'base' && csvF.data?.rows) {
        const seenColors = new Set<string>();
        for (const row of csvF.data.rows) {
          if (!seenColors.has(row.value)) {
            seenColors.add(row.value);
            legend.push({
              key: row.value,
              labelZh: row.label || row.value,
              color: row.value
            });
          }
        }
      }

      return {
        id: csvF.id,
        category: 'none',
        nameZh: csvF.nameZh,
        descriptionZh: csvF.descriptionZh || '',
        legend,
        getColor: (country: CountryData) => {
          const val = getCsvLayerValue(csvF.id, country.iso2);
          if (val) return val;
          return defaultCol || null;
        }
      };
    }

    return {
      id: 'base',
      category: 'none',
      nameZh: '基礎底圖',
      descriptionZh: '全球陸地基礎底圖輪廓風格',
      legend: [],
      getColor: () => '#38bdf8'
    };
  }, [activeFilterId, filterVersion]);

  // Handle Feature Click / Selection
  const handleFeatureSelect = useCallback(
    (feature: CanonicalFeature) => {
      const p = feature.properties;
      if (p.admin_level === 0) {
        const country = AdministrativeHierarchy.toCountryData(feature);
        if (country) {
          onSelectCountry(country);
          adapterRef.current?.getLODController().setFocusedCountry(country.iso2);
          if (p.bbox) {
            adapterRef.current?.fitBounds(p.bbox);
          }
        }
      } else if (p.admin_level === 1) {
        const sub = AdministrativeHierarchy.toSubdivisionDetail(feature);
        onSelectSubdivision?.(sub);
        adapterRef.current?.getLODController().setFocusedSubdivision(sub.iso2, sub.id);
        if (p.bbox) {
          adapterRef.current?.fitBounds(p.bbox);
        }
      } else if (p.admin_level === 2) {
        const muni = AdministrativeHierarchy.toMunicipalityDetail(feature);
        onSelectMunicipality?.(muni);
        if (p.bbox) {
          adapterRef.current?.fitBounds(p.bbox);
        }
      }
    },
    [onSelectCountry, onSelectSubdivision, onSelectMunicipality]
  );

  // Initialize MapLibre
  useEffect(() => {
    if (!containerRef.current) return;

    const adapter = new MapLibreAdapter({
      container: containerRef.current,
      initialMode: projectionMode || '2d',
      initialCenter: [15, 20], // Global overview
      initialZoom: 1.8,
      callbacks: {
        onHover: (feat, screenPos) => {
          setHoveredFeature(feat);
          setHoverPosition(feat ? screenPos : null);
        },
        onSelect: (feat) => {
          handleFeatureSelect(feat);
        },
        onOceanClick: () => {
          onOceanClick?.();
        }
      },
      onReady: (inst) => {
        // Subscribe to projection mode changes
        inst.getProjectionController().subscribe((mode) => {
          onProjectionModeChange?.(mode);
        });

        // Set initial filters
        void inst.getDataManager().setActiveFilterId(activeFilterId).then(() => {
          setFilterVersion((v) => v + 1);
        });
        if (activeTextFilters && activeTextFilters.size > 0) {
          void inst.getDataManager().setActiveTextFilters(activeTextFilters);
        }
        if (activeInternationalImageFilter) {
          void inst.getDataManager().setActiveInternationalImageFilter(activeInternationalImageFilter);
        }
        if (activeRegionalFilters && activeRegionalFilters.size > 0) {
          void inst.getDataManager().setActiveRegionalFilters(activeRegionalFilters);
        }
        if (showRoads) {
          inst.getDataManager().setShowRoads(true);
        }

        // Initialize display levels: default is strictly ADM0 (empty ADM1 & ADM2)
        const activeIso = selectedCountry?.iso2 || selectedSubdivision?.iso2 || selectedMunicipality?.iso2;
        if (activeIso) {
          void inst.getDataManager().setActiveDisplayLevels([activeIso], []);
        } else {
          void inst.getDataManager().setActiveDisplayLevels([], []);
        }

        // Initial regional filters notification
        onVisibleRegionalFiltersChange?.(NATIONWIDE_LAYERS);
      }
    });

    adapterRef.current = adapter;

    return () => {
      adapter.destroy();
      adapterRef.current = null;
    };
  }, []);

  // Update filter styling when activeFilterId changes
  useEffect(() => {
    void adapterRef.current?.getDataManager().setActiveFilterId(activeFilterId).then(() => {
      setFilterVersion((v) => v + 1);
    });
  }, [activeFilterId]);

  // Sync activeTextFilters (Global text labels)
  useEffect(() => {
    void adapterRef.current?.getDataManager().setActiveTextFilters(activeTextFilters || new Set());
  }, [activeTextFilters]);

  // Sync activeInternationalImageFilter (Crossing signs, etc.)
  useEffect(() => {
    void adapterRef.current?.getDataManager().setActiveInternationalImageFilter(activeInternationalImageFilter || null);
  }, [activeInternationalImageFilter]);

  // Sync activeRegionalFilters (Area codes, regional features)
  useEffect(() => {
    void adapterRef.current?.getDataManager().setActiveRegionalFilters(activeRegionalFilters || new Set());
  }, [activeRegionalFilters]);

  // Sync showRoads
  useEffect(() => {
    adapterRef.current?.getDataManager().setShowRoads(showRoads ?? false);
  }, [showRoads]);

  // Sync projectionMode prop
  useEffect(() => {
    if (adapterRef.current && projectionMode) {
      if (adapterRef.current.getProjectionController().getMode() !== projectionMode) {
        adapterRef.current.getProjectionController().setMode(projectionMode);
      }
    }
  }, [projectionMode]);

  // Sync selected focus with LODController (pinned levels)
  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    if (selectedSubdivision) {
      adapter.getLODController().setFocusedSubdivision(selectedSubdivision.iso2, selectedSubdivision.id);
    } else if (selectedCountry) {
      adapter.getLODController().setFocusedCountry(selectedCountry.iso2);
    } else {
      adapter.getLODController().clearFocus();
    }
  }, [selectedCountry?.iso2, selectedSubdivision?.iso2, selectedSubdivision?.id]);

  // Load and show roads ONLY when road layer for the active country is enabled in info card
  useEffect(() => {
    const activeIso = selectedCountry?.iso2 || selectedSubdivision?.iso2 || selectedMunicipality?.iso2;
    if (!adapterRef.current) return;
    const dm = adapterRef.current.getDataManager();

    if (activeIso && isRoadLayerActiveForCountry(activeIso, activeRegionalFilters)) {
      void dm.ensureRoads(activeIso).then(() => {
        dm.setShowRoads(true);
        dm.updateRoadFilter(activeRegionalFilters || new Set(), activeIso);
      });
    } else {
      dm.setShowRoads(false);
      dm.clearRoads();
    }
  }, [selectedCountry?.iso2, selectedSubdivision?.iso2, selectedMunicipality?.iso2, activeRegionalFilters]);

  // Bind focusMapRef
  useEffect(() => {
    if (!focusMapRef) return;

    focusMapRef.current = (target: MapFocusTarget) => {
      const adapter = adapterRef.current;
      if (!adapter) return;

      if (target.kind === 'coordinates') {
        const zoom = target.ratio !== undefined ? Math.min(14, Math.max(2, target.ratio * 2.5)) : undefined;
        adapter.flyTo(target.lon, target.lat, zoom);
      } else if (target.kind === 'country') {
        const iso = target.iso2.toUpperCase();
        adapter.getLODController().setFocusedCountry(iso);

        // Find country feature in registry
        const feat = adapter.getDataManager().getRegistry().getById(`ADM0_${iso}`);
        if (feat?.properties.bbox) {
          adapter.fitBounds(feat.properties.bbox);
        } else {
          const c = findCountry(iso);
          if (c?.id) {
            if (iso === 'JP') adapter.flyTo(138.2, 36.2, 5);
            else if (iso === 'US') adapter.flyTo(-98.5, 39.8, 4);
            else if (iso === 'TW') adapter.flyTo(120.9, 23.8, 7.5);
          }
        }
      } else if (target.kind === 'subdivision') {
        const iso = target.iso2.toUpperCase();
        const id = String(target.id);
        const parentId = `ADM1_${iso}_${id}`;
        adapter.getLODController().setFocusedSubdivision(iso, id);

        const subFeat = adapter.getDataManager().getRegistry().getById(parentId);
        if (subFeat?.properties.bbox) {
          adapter.fitBounds(subFeat.properties.bbox);
        }
      } else if (target.kind === 'municipality') {
        if (target.parentCode && target.iso2 && !isSouthAmerica(target.iso2)) {
          const iso = target.iso2.toUpperCase();
          adapter.getLODController().setFocusedSubdivision(iso, target.parentCode);
        }
      } else if (target.kind === 'bbox' && target.boxes && target.boxes.length > 0) {
        const b = target.boxes[0];
        adapter.fitBounds([b.minX, b.minY, b.maxX, b.maxY]);
      }
    };

    return () => {
      if (focusMapRef) focusMapRef.current = null;
    };
  }, [focusMapRef]);

  // Bind zoomToSubdivisionRef
  useEffect(() => {
    if (!zoomToSubdivisionRef) return;

    zoomToSubdivisionRef.current = (iso2: string, id: string | number) => {
      focusMapRef?.current?.({ kind: 'subdivision', iso2, id });
    };

    return () => {
      if (zoomToSubdivisionRef) zoomToSubdivisionRef.current = null;
    };
  }, [zoomToSubdivisionRef, focusMapRef]);

  // Resize when panel dimensions change
  useEffect(() => {
    adapterRef.current?.resize();
  }, [selectedCountry, selectedSubdivision, selectedMunicipality, detailPanelWidth, detailPanelFullWidth]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* MapLibre WebGL Canvas Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          background: MAP_COLORS.oceanBg
        }}
      />

      {/* Feature Tooltip */}
      <FeatureTooltip feature={hoveredFeature} position={hoverPosition} />

      {/* Filter Legend Card */}
      <MapLegend
        activeFilterDef={activeFilterDef}
        isFilterExpanded={isFilterExpanded}
        activeTextFilters={activeTextFilters}
        activeInternationalImageFilter={activeInternationalImageFilter}
        activeRegionalFilters={activeRegionalFilters}
        onToggleTextFilter={onToggleTextFilter}
        onToggleInternationalImageFilter={onToggleInternationalImageFilter}
        onToggleRegionalFilter={onToggleRegionalFilter}
      />

      {/* Search and Navigation Controls */}
      <MapControls
        onZoomIn={() => adapterRef.current?.getMap().zoomIn()}
        onZoomOut={() => adapterRef.current?.getMap().zoomOut()}
        onResetZoom={() => adapterRef.current?.flyTo(15, 20, 1.8)}
        onSelectCountry={(c) => onSelectCountry(c)}
        panelOpen={Boolean(selectedCountry || selectedSubdivision || selectedMunicipality || selectedRoad)}
        panelWidth={detailPanelWidth}
        panelFullWidth={detailPanelFullWidth}
      />
    </div>
  );
};
