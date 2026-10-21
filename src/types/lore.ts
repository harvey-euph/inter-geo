/**
 * Lore & Dossier Story Types for Markdown Reader
 */

export interface LoreItem {
  /** Raw markdown line */
  raw: string;
  /** Optional bold/bracketed label prefix (e.g. "【100% 絕殺秘技】", "歷史淵源") */
  label?: string;
  /** Main text content of this bullet */
  content: string;
  /** Nested sub-bullet points if any */
  subItems?: string[];
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
  /** Subject targets: can be country ISO2 ('PE'), subdivision ('CA-QC'), road ('Interstate'), or grid ('TW-TP') */
  targets: string[];
  /** Optional subject category */
  targetType?: 'country' | 'subdivision' | 'municipality' | 'road' | 'grid' | 'comparison' | 'general';
  /** Tags for display pill badges (e.g. ['100%絕殺', '跨區比較', '標誌']) */
  tags?: string[];
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
