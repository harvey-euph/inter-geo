import type { LoreCard, LoreQuery } from '../types/lore';
import { parseMarkdownLore } from './loreParser';

/**
 * Raw markdown files loaded eagerly at build time via Vite's glob import
 */
const rawLoreFiles = import.meta.glob('/src/content/lore/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

let cachedAllCards: LoreCard[] | null = null;
let cachedCardsByTarget: Map<string, LoreCard[]> | null = null;
let cachedCardsById: Map<string, LoreCard> | null = null;

function initializeLoreRegistry(): void {
  if (cachedAllCards !== null) return;

  const cards: LoreCard[] = [];
  const byTarget = new Map<string, LoreCard[]>();
  const byId = new Map<string, LoreCard>();

  for (const [filePath, content] of Object.entries(rawLoreFiles)) {
    const fileName = filePath.split('/').pop() || filePath;
    const parsed = parseMarkdownLore(content, fileName);

    for (const card of parsed) {
      cards.push(card);
      byId.set(card.id, card);

      for (const target of card.targets) {
        const upper = target.toUpperCase().trim();
        const list = byTarget.get(upper) || [];
        list.push(card);
        byTarget.set(upper, list);
      }

      if (card.comparisonTargets) {
        for (const comp of card.comparisonTargets) {
          const upper = comp.toUpperCase().trim();
          const list = byTarget.get(upper) || [];
          if (!list.includes(card)) {
            list.push(card);
            byTarget.set(upper, list);
          }
        }
      }
    }
  }

  cachedAllCards = cards;
  cachedCardsByTarget = byTarget;
  cachedCardsById = byId;
}

/**
 * Returns all parsed lore cards across all markdown files
 */
export function getAllLoreCards(): LoreCard[] {
  initializeLoreRegistry();
  return cachedAllCards || [];
}

/**
 * Finds a single lore card by ID
 */
export function getLoreCardById(id: string): LoreCard | undefined {
  initializeLoreRegistry();
  return cachedCardsById?.get(id);
}

/**
 * Queries lore cards relevant to the selected map object
 */
export function queryLore(query: LoreQuery): LoreCard[] {
  initializeLoreRegistry();
  if (!cachedCardsByTarget) return [];

  const candidateKeys: Array<{ key: string; weight: number }> = [];

  // 1. Country target
  if (query.countryIso2) {
    const iso2 = query.countryIso2.toUpperCase().trim();
    candidateKeys.push({ key: iso2, weight: 10 });
  }

  // 2. Subdivision target (e.g. 'CA-QC', 'QC', 'JP-01')
  if (query.countryIso2 && query.subdivisionCode) {
    const iso2 = query.countryIso2.toUpperCase().trim();
    const code = query.subdivisionCode.toUpperCase().trim();
    candidateKeys.push({ key: `${iso2}-${code}`, weight: 30 });
    candidateKeys.push({ key: code, weight: 20 });
  }

  if (query.subdivisionId) {
    const idStr = String(query.subdivisionId).toUpperCase().trim();
    candidateKeys.push({ key: idStr, weight: 25 });
    if (query.countryIso2) {
      candidateKeys.push({ key: `${query.countryIso2.toUpperCase()}-${idStr}`, weight: 30 });
    }
  }

  // 3. Municipality target (e.g. 'JP-01100', '01100')
  if (query.municipalityCode) {
    const mCode = query.municipalityCode.toUpperCase().trim();
    candidateKeys.push({ key: mCode, weight: 40 });
    if (query.countryIso2) {
      candidateKeys.push({ key: `${query.countryIso2.toUpperCase()}-${mCode}`, weight: 45 });
    }
  }

  // 4. Road targets (e.g. 'INTERSTATE', 'US-ROUTE', 'I-90', 'US 66', 'DE-HIGHWAY', 'E-ROAD')
  if (query.roadClass) {
    const rClass = query.roadClass.toUpperCase().trim();
    candidateKeys.push({ key: rClass, weight: 15 });
    candidateKeys.push({ key: `US-${rClass}`, weight: 15 });
    candidateKeys.push({ key: 'ROAD', weight: 5 });
    candidateKeys.push({ key: 'HIGHWAY', weight: 5 });
    if (query.countryIso2) {
      const iso = query.countryIso2.toUpperCase().trim();
      candidateKeys.push({ key: `${iso}-HIGHWAY`, weight: 25 });
      candidateKeys.push({ key: `${iso}-${rClass}`, weight: 25 });
      candidateKeys.push({ key: `${iso}-ROAD`, weight: 20 });
    }
  }

  if (query.roadName) {
    const rName = query.roadName.toUpperCase().replace(/\s+/g, '-').trim();
    candidateKeys.push({ key: rName, weight: 35 });
    candidateKeys.push({ key: `US-${rName}`, weight: 35 });
    if (query.countryIso2) {
      const iso = query.countryIso2.toUpperCase().trim();
      candidateKeys.push({ key: `${iso}-${rName}`, weight: 35 });
    }
    if (/^E-?\d+/i.test(rName)) {
      candidateKeys.push({ key: 'E-ROAD', weight: 30 });
      candidateKeys.push({ key: 'EUROPE-HIGHWAY', weight: 20 });
    }
  }

  // 5. Taipower Grid targets (e.g. 'TW-TP-H', 'TW-TP', 'TAIPOWER')
  if (query.taipowerLetter) {
    const letter = query.taipowerLetter.toUpperCase().trim();
    candidateKeys.push({ key: `TW-TP-${letter}`, weight: 40 });
    candidateKeys.push({ key: `TP-${letter}`, weight: 35 });
    candidateKeys.push({ key: 'TW-TP', weight: 25 });
    candidateKeys.push({ key: 'TAIPOWER-GRID', weight: 25 });
  }

  // Find cards matching any of the candidate keys
  const scoreMap = new Map<LoreCard, number>();

  for (const { key, weight } of candidateKeys) {
    const matches = cachedCardsByTarget.get(key);
    if (matches) {
      for (const card of matches) {
        const cur = scoreMap.get(card) || 0;
        scoreMap.set(card, Math.max(cur, weight + (card.priority || 0)));
      }
    }
  }

  // Sort by match score descending
  return Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([card]) => card);
}
