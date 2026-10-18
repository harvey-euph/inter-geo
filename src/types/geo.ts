export type DrivingSide = 'left' | 'right';

export type CoverageStatus = 'official' | 'limited' | 'none';

export type CameraGen = 'gen4' | 'gen3' | 'gen2' | 'gen1';

export type PlateType = 
  | 'eu_blue' 
  | 'yellow_rear' 
  | 'yellow_both' 
  | 'red_strip' 
  | 'green_strip' 
  | 'white' 
  | 'yellow_kei' 
  | 'other';

export type RoadLine = 
  | 'yellow_double' 
  | 'yellow_single' 
  | 'white_solid' 
  | 'white_dashed' 
  | 'white_with_outer_yellow';

export type CarMeta = 
  | 'snorkel' 
  | 'black_tape' 
  | 'roof_rack' 
  | 'escort_car' 
  | 'rifts' 
  | 'low_cam' 
  | 'curved_mirrors' 
  | 'back_black' 
  | 'tent'
  | 'none';

export type PoleType = 
  | 'ladder_holes' 
  | 'round_holes' 
  | 'wooden' 
  | 'metal' 
  | 'striped' 
  | 'hook' 
  | 'standard';

export type Continent = 'Europe' | 'Asia' | 'Americas' | 'Africa' | 'Oceania';

export interface CountryData {
  id: string; // ISO 3166-1 numeric string, e.g. "158"
  iso2: string; // "TW"
  iso3: string; // "TWN"
  name: string; // "Taiwan"
  nameZh: string; // "台灣"
  flag: string; // "🇹🇼"
  continent: Continent;
  region: string; // "東亞"
  drivingSide: DrivingSide;
  coverage: CoverageStatus;
  cameraGens: CameraGen[];
  plateType: PlateType;
  plateDesc: string;
  roadLines: RoadLine[];
  roadLinesDesc: string;
  carMeta: CarMeta[];
  carMetaDesc: string;
  poleTypes?: PoleType[];
  poleDesc: string;
  bollardDesc: string;
  language: string;
  tld: string;
  keyHints: string[];
  confusedWith?: string[];
}

export type FilterCategory = 
  | 'none'
  | 'drivingSide' 
  | 'coverage' 
  | 'cameraGens' 
  | 'plateType' 
  | 'carMeta' 
  | 'roadLines' 
  | 'poles'
  | 'continent';

export interface LegendItem {
  key: string;
  labelZh: string;
  color: string;
}

export interface ActiveFilter {
  category: FilterCategory;
  value?: string;
  titleZh: string;
}
