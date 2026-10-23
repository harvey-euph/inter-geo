import loreIndexStubs from 'virtual:lore-index';
import type { LoreCard, LoreQuery, LoreStub } from '../types/lore';
import { parseMarkdownLore } from './loreParser';

/**
 * Resolve static asset URLs for all markdown files under /src/content/lore/
 * Using `query: '?url'` ensures Vite emits standalone .md files without bundling their text content.
 */
const loreFileUrls = import.meta.glob('/src/content/lore/**/*.md', {
  query: '?url',
  import: 'default',
  eager: true
}) as Record<string, string>;

let cachedStubsByTarget: Map<string, LoreStub[]> | null = null;
let cachedStubsById: Map<string, LoreStub> | null = null;

/** In-memory cache of parsed full LoreCard objects by card ID */
const loadedCardsById = new Map<string, LoreCard>();

/** Deduplicate concurrent HTTP fetches for the same .md file */
const inFlightFiles = new Map<string, Promise<LoreCard[]>>();

function normalizeTargetKey(rawTarget: string): string {
  return rawTarget
    .toUpperCase()
    .trim()
    .replace(/^(COUNTRY|SUBDIVISION|MUNICIPALITY|ROAD|GRID):/, '');
}

function initializeStubIndex(): void {
  if (cachedStubsByTarget !== null) return;

  const byTarget = new Map<string, LoreStub[]>();
  const byId = new Map<string, LoreStub>();

  for (const stub of loreIndexStubs) {
    byId.set(stub.id, stub);

    const addTarget = (raw: string) => {
      const upper = raw.toUpperCase().trim();
      const normalized = normalizeTargetKey(upper);
      for (const key of new Set([upper, normalized])) {
        if (!key) continue;
        const list = byTarget.get(key) || [];
        if (!list.includes(stub)) {
          list.push(stub);
          byTarget.set(key, list);
        }
      }
    };

    for (const target of stub.targets) {
      addTarget(target);
    }

    if (stub.comparisonTargets) {
      for (const comp of stub.comparisonTargets) {
        addTarget(comp);
      }
    }
  }

  cachedStubsByTarget = byTarget;
  cachedStubsById = byId;
}

/**
 * Returns all lightweight LoreStub entries from the build-time index
 */
export function getAllLoreStubs(): LoreStub[] {
  initializeStubIndex();
  return loreIndexStubs;
}

/**
 * Finds a single LoreStub by ID
 */
export function getLoreStubById(id: string): LoreStub | undefined {
  initializeStubIndex();
  return cachedStubsById?.get(id);
}

/**
 * Synchronously queries lightweight LoreStub metadata matching the selected map object.
 * Does NOT trigger any network requests.
 */
export function queryLoreStubs(query: LoreQuery): LoreStub[] {
  initializeStubIndex();
  if (!cachedStubsByTarget) return [];

  const candidateKeys: Array<{ key: string; weight: number }> = [];
  const hasRoadContext = Boolean(query.roadClass || query.roadName);
  const hasSubdivisionContext = Boolean(
    query.subdivisionCode || (query.subdivisionId !== undefined && query.subdivisionId !== null)
  );
  const hasMunicipalityContext = Boolean(query.municipalityCode);

  // 1. Country target (only match general country cards when viewing L1 country card directly)
  if (query.countryIso2 && !hasRoadContext && !hasSubdivisionContext && !hasMunicipalityContext) {
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

  if (query.subdivisionId !== undefined && query.subdivisionId !== null) {
    const idStr = String(query.subdivisionId).toUpperCase().trim();
    candidateKeys.push({ key: idStr, weight: 25 });
    if (query.countryIso2) {
      candidateKeys.push({ key: `${query.countryIso2.toUpperCase().trim()}-${idStr}`, weight: 30 });
    }
  }

  // 3. Municipality target (e.g. 'JP-01100', '01100')
  if (query.municipalityCode) {
    const mCode = query.municipalityCode.toUpperCase().trim();
    candidateKeys.push({ key: mCode, weight: 40 });
    if (query.countryIso2) {
      candidateKeys.push({ key: `${query.countryIso2.toUpperCase().trim()}-${mCode}`, weight: 45 });
    }
  }

  // 4. Road targets (strictly scoped by countryIso2 when present so US Interstate never leaks into TW/JP/DE roads)
  if (query.roadClass) {
    const rClass = query.roadClass.toUpperCase().trim();
    const iso = query.countryIso2?.toUpperCase().trim();

    if (iso) {
      candidateKeys.push({ key: `${iso}-HIGHWAY`, weight: 25 });
      candidateKeys.push({ key: `${iso}-${rClass}`, weight: 25 });
      candidateKeys.push({ key: `${iso}-ROAD`, weight: 20 });
    }

    if (!iso || iso === 'US') {
      candidateKeys.push({ key: `US-${rClass}`, weight: 20 });
      candidateKeys.push({ key: rClass, weight: 15 });
    }

    candidateKeys.push({ key: 'ROAD', weight: 5 });
    candidateKeys.push({ key: 'HIGHWAY', weight: 5 });
  }

  if (query.roadName) {
    const rName = query.roadName.toUpperCase().replace(/\s+/g, '-').trim();
    const iso = query.countryIso2?.toUpperCase().trim();

    candidateKeys.push({ key: rName, weight: 35 });
    if (iso) {
      candidateKeys.push({ key: `${iso}-${rName}`, weight: 35 });
    }
    if (!iso || iso === 'US') {
      candidateKeys.push({ key: `US-${rName}`, weight: 35 });
    }
    if (/^E-?\d+/i.test(rName)) {
      candidateKeys.push({ key: 'E-ROAD', weight: 30 });
      candidateKeys.push({ key: 'EUROPE-HIGHWAY', weight: 20 });
    }
  }

  // 5. Taipower Grid targets (e.g. 'TW-TP-H', 'TW-TP', 'TAIPOWER-GRID')
  if (query.taipowerLetter) {
    const letter = query.taipowerLetter.toUpperCase().trim();
    candidateKeys.push({ key: `TW-TP-${letter}`, weight: 40 });
    candidateKeys.push({ key: `TP-${letter}`, weight: 35 });
    candidateKeys.push({ key: 'TW-TP', weight: 25 });
    candidateKeys.push({ key: 'TAIPOWER-GRID', weight: 25 });
  }

  const scoreMap = new Map<LoreStub, number>();

  for (const { key, weight } of candidateKeys) {
    const matches = cachedStubsByTarget.get(key);
    if (matches) {
      for (const stub of matches) {
        const cur = scoreMap.get(stub) || 0;
        scoreMap.set(stub, Math.max(cur, weight + (stub.priority || 0)));
      }
    }
  }

  let results = Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([stub]) => stub);

  if (query.tags && query.tags.length > 0) {
    const requiredTags = query.tags.map((t) => t.toLowerCase());
    results = results.filter(
      (stub) => stub.tags && stub.tags.some((t) => requiredTags.includes(t.toLowerCase()))
    );
  }

  return results;
}

/**
 * Fetches and parses a Markdown lore file on-demand, caching all cards defined in that file.
 */
export async function loadLoreCard(stub: LoreStub): Promise<LoreCard | null> {
  const cached = loadedCardsById.get(stub.id);
  if (cached) return cached;

  let pending = inFlightFiles.get(stub.sourcePath);
  if (!pending) {
    const assetUrl = loreFileUrls[stub.sourcePath] || stub.sourcePath;
    pending = fetch(assetUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch lore file ${assetUrl}: ${res.status}`);
        }
        return res.text();
      })
      .then((rawMarkdown) => {
        const parsedCards = parseMarkdownLore(rawMarkdown, stub.sourceFile);
        for (const card of parsedCards) {
          loadedCardsById.set(card.id, card);
        }
        return parsedCards;
      })
      .finally(() => {
        inFlightFiles.delete(stub.sourcePath);
      });

    inFlightFiles.set(stub.sourcePath, pending);
  }

  const cardsFromFile = await pending;
  return (
    loadedCardsById.get(stub.id) ||
    cardsFromFile.find((c) => c.id === stub.id || c.title === stub.title) ||
    null
  );
}
