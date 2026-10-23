/**
 * Lore & Dossier Story Types for Markdown Reader
 */

export interface LoreItem {
  /** Raw markdown line */
  raw: string;
  /** Optional bold/bracketed label prefix (e.g. "【地理與制度特色】", "歷史淵源") */
  label?: string;
  /** Main text content of this bullet */
  content: string;
  /** Nested sub-bullet points if any */
  subItems?: string[];
}

export type LoreImageSize = 'sm' | 'md' | 'lg' | 'xl' | 'banner' | string;
export type LoreImagePosition = 'left' | 'right' | 'top';

/**
 * Lightweight build-time index entry for a Lore card (no full body items)
 */
export interface LoreStub {
  /** Unique card identifier */
  id: string;
  /** Story display title */
  title: string;
  /** Emoji badge or icon name */
  icon?: string;
  /** Accent color for card border and highlights */
  accentColor?: string;
  /** Subject targets: country ISO2 ('PE'), subdivision ('CA-QC'), road ('US-INTERSTATE'), or grid ('TW-TP') */
  targets: string[];
  /** Optional subject category */
  targetType?: 'country' | 'subdivision' | 'municipality' | 'road' | 'grid' | 'comparison' | 'general';
  /** Tags for display pill badges */
  tags?: string[];
  /** Optional primary image URL/path */
  image?: string;
  /** Optional image size preset or pixel value ('sm' | 'md' | 'lg' | 'xl' | 'banner' | '68') */
  imageSize?: LoreImageSize;
  /** Optional image placement ('left' | 'right' | 'top') */
  imagePosition?: LoreImagePosition;
  /** Optional image caption/alt */
  imageAlt?: string;
  /** Comparison subjects if this card compares multiple entities */
  comparisonTargets?: string[];
  /** Source file name where this card is defined */
  sourceFile: string;
  /** Project-relative path used for on-demand URL resolution (e.g. '/src/content/lore/americas.md') */
  sourcePath: string;
  /** Optional priority for ordering */
  priority?: number;
  /** Short preview of the first item for instant map hover tooltips */
  firstItemPreview?: {
    label?: string;
    content: string;
  };
}

export interface LoreCard {
  /** Unique card identifier */
  id: string;
  /** Story display title */
  title: string;
  /** Emoji badge or icon name (e.g. '🥟', '🛑', '📡', '🚘', '🛣️', '⚡') */
  icon?: string;
  /** Accent color for card border and highlights (e.g. '#fbbf24', '#f87171') */
  accentColor?: string;
  /** Subject targets: can be country ISO2 ('PE'), subdivision ('CA-QC'), road ('US-INTERSTATE'), or grid ('TW-TP') */
  targets: string[];
  /** Optional subject category */
  targetType?: 'country' | 'subdivision' | 'municipality' | 'road' | 'grid' | 'comparison' | 'general';
  /** Tags for display pill badges (e.g. ['跨區比較', '標誌']) */
  tags?: string[];
  /** Optional primary image URL/path */
  image?: string;
  /** Optional image size preset or pixel value ('sm' | 'md' | 'lg' | 'xl' | 'banner' | '68') */
  imageSize?: LoreImageSize;
  /** Optional image placement ('left' | 'right' | 'top') */
  imagePosition?: LoreImagePosition;
  /** Optional image caption/alt */
  imageAlt?: string;
  /** Structured bullet point items */
  items: LoreItem[];
  /** Comparison subjects if this card compares multiple entities (e.g. ['CA-QC', 'CA-NB']) */
  comparisonTargets?: string[];
  /** Source file name where this card is defined */
  sourceFile?: string;
  /** Optional priority for ordering */
  priority?: number;
}

export interface LoreQuery {
  /** Country ISO2 code (e.g. 'PE', 'CA', 'BR') */
  countryIso2?: string;
  /** Subdivision code or postal code (e.g. 'QC', 'CA-QC', 'SP', '01') */
  subdivisionCode?: string;
  /** Subdivision ID (numeric or string) */
  subdivisionId?: string | number;
  /** L3 Municipality code */
  municipalityCode?: string;
  /** Road name or number (e.g. 'I-90', 'US 66') */
  roadName?: string;
  /** Road class (e.g. 'Interstate', 'U.S. Highway') */
  roadClass?: string;
  /** Taipower grid letter (e.g. 'A', 'H', 'P') */
  taipowerLetter?: string;
  /** Filter by tags if needed */
  tags?: string[];
}
