import React from 'react';
import type { CountryData } from '../types/geo';
import type { LODLevel, MunicipalityDetail, L2SubdivisionDetail } from '../types/lod';
import type { RoadPathData } from '../data/roadsMeta';
import type { NationwideLayerDef } from '../data/nationwideLayers';
import type {
  WorldCountryProperties,
  CountryPathData,
  L2SubdivisionPathData,
  L3SubdivisionPathData,
  ActiveL3ParentInfo
} from '../map/types';
import { MapContainer } from '../map/MapContainer';

export type {
  RoadPathData,
  L2SubdivisionDetail,
  WorldCountryProperties,
  CountryPathData,
  L2SubdivisionPathData,
  L3SubdivisionPathData,
  ActiveL3ParentInfo
};

export type MapFocusBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type MapFocusTarget = (
  | { kind: 'country'; iso2: string }
  | { kind: 'subdivision'; iso2: string; id: string | number }
  | {
      kind: 'municipality';
      iso2?: string;
      code?: string;
      parentName?: string;
      parentCode?: string;
    }
  | { kind: 'road'; bbox: [number, number, number, number] }
  | { kind: 'bbox'; boxes: MapFocusBox[] }
  | { kind: 'coordinates'; lat: number; lon: number; ratio?: number }
) & { force?: boolean };

export type MapSelectOptions = { focus?: boolean };

export const COUNTRY_L2_EXPANSION_THRESHOLD = 0.2;
export const SUBDIVISION_L3_EXPANSION_THRESHOLD = 0.2;
export const COUNTRY_MIN_SCREEN_DIMENSION = 65;

export interface WorldMapProps {
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
}

export const WorldMap: React.FC<WorldMapProps> = (props) => {
  return <MapContainer {...props} />;
};

export default WorldMap;
