import {
  gridObjectId,
  localFromSubdivisionCode,
  namespaceAliasForTarget,
  numericNamespaceIds,
  roadObjectId
} from '../objects/objectId';
import type { InfoCard, InfoImagePosition, InfoImageSize, InfoQuery, InfoStub, InfoTargetType } from '../types/info';
import { parseMarkdownInfo } from './infoParser';
import { getDataUrl } from '../data/dataSource';
import { loadInfoTargetsIndex, type InfoTargetCardEntry, type InfoTargetsIndex } from '../data/geoIndexClient';

let cachedStubsByTarget: Map<string, InfoStub[]> | null = null;
let cachedStubsById: Map<string, InfoStub> | null = null;
let isLoaded = false;

type InfoIndexListener = () => void;
const listeners = new Set<InfoIndexListener>();

export function onInfoIndexLoaded(cb: InfoIndexListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function isInfoIndexLoaded(): boolean {
  return isLoaded;
}

function entryToStub(entry: InfoTargetCardEntry): InfoStub {
  const filename = entry.file.split('/').pop() || entry.file;
  return {
    id: entry.id,
    title: entry.title,
    icon: entry.icon || undefined,
    accentColor: entry.accent || undefined,
    targets: entry.targets,
    targetType: (entry.type as InfoTargetType) || undefined,
    tags: entry.tags || undefined,
    image: entry.image || undefined,
    imageSize: (entry.imageSize as InfoImageSize) || undefined,
    imagePosition: (entry.imagePosition as InfoImagePosition) || undefined,
    imageAlt: entry.imageAlt || undefined,
    comparisonTargets: entry.comparison || undefined,
    sourceFile: filename,
    sourcePath: entry.file.startsWith('/') ? entry.file.slice(1) : entry.file,
    priority: entry.priority,
    firstItemPreview: entry.preview ? { content: entry.preview } : undefined
  };
}

function normalizeTargetKey(rawTarget: string): string {
  return rawTarget
    .toUpperCase()
    .trim()
    .replace(/^(COUNTRY|SUBDIVISION|MUNICIPALITY|ROAD|GRID):/, '');
}

function syncFromInfoTargets(targetsMap: InfoTargetsIndex): void {
  const byTarget = new Map<string, InfoStub[]>();
  const byId = new Map<string, InfoStub>();

  for (const [targetKey, entries] of Object.entries(targetsMap)) {
    for (const entry of entries) {
      let stub = byId.get(entry.id);
      if (!stub) {
        stub = entryToStub(entry);
        byId.set(stub.id, stub);
      }

      const upper = targetKey.toUpperCase().trim();
      const normalized = normalizeTargetKey(upper);
      for (const k of new Set([upper, normalized])) {
        if (!k) continue;
        const keys = [k];
        const alias = namespaceAliasForTarget(k);
        if (alias && alias !== k) keys.push(alias);
        for (const indexKey of keys) {
          const list = byTarget.get(indexKey) || [];
          if (!list.includes(stub)) {
            list.push(stub);
            byTarget.set(indexKey, list);
          }
        }
      }
    }
  }

  cachedStubsByTarget = byTarget;
  cachedStubsById = byId;
  isLoaded = true;

  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      console.error(err);
    }
  }
}

export async function initInfoIndex(): Promise<void> {
  try {
    const targets = await loadInfoTargetsIndex();
    syncFromInfoTargets(targets);
  } catch (err) {
    console.warn('[infoRegistry] Failed to initialize info index:', err);
  }
}

// Trigger lazy background load of the remote info-targets.json index
if (typeof window !== 'undefined') {
  void initInfoIndex();
}

/** In-memory cache of parsed full InfoCard objects by card ID */
const loadedCardsById = new Map<string, InfoCard>();

/** Deduplicate concurrent HTTP fetches for the same .md file */
const inFlightFiles = new Map<string, Promise<InfoCard[]>>();

/**
 * Returns all lightweight InfoStub entries from the remote index
 */
export function getAllInfoStubs(): InfoStub[] {
  return Array.from(cachedStubsById?.values() || []);
}

/**
 * Finds a single InfoStub by ID
 */
export function getInfoStubById(id: string): InfoStub | undefined {
  return cachedStubsById?.get(id);
}

/**
 * Synchronously queries lightweight InfoStub metadata matching the selected map object.
 * Does NOT trigger any network requests.
 */
export function queryInfoStubs(query: InfoQuery): InfoStub[] {
  if (!cachedStubsByTarget) return [];

  const candidateKeys: Array<{ key: string; weight: number }> = [];
  const hasRoadContext = Boolean(query.roadClass || query.roadName);
  const hasSubdivisionContext = Boolean(
    query.subdivisionCode || (query.subdivisionId !== undefined && query.subdivisionId !== null)
  );
  const hasMunicipalityContext = Boolean(query.municipalityCode);

  // Country dossiers stay on the L1 card. L2 and L3 do not inherit them.
  if (query.countryIso2 && !hasRoadContext && !hasSubdivisionContext && !hasMunicipalityContext) {
    candidateKeys.push({ key: query.countryIso2.toUpperCase().trim(), weight: 10 });
  }

  // Subdivision targets stay on the L2 card. An L3 municipality does not inherit them.
  if (!hasMunicipalityContext && query.countryIso2 && query.subdivisionCode) {
    const iso2 = query.countryIso2.toUpperCase().trim();
    const code = query.subdivisionCode.toUpperCase().trim();
    candidateKeys.push({ key: `${iso2}-${code}`, weight: 30 });
    candidateKeys.push({ key: code, weight: 20 });
    const local = localFromSubdivisionCode(iso2, code);
    if (local) {
      for (const objectId of numericNamespaceIds(iso2, local)) {
        candidateKeys.push({ key: objectId, weight: 32 });
      }
    }
  }

  if (!hasMunicipalityContext && query.subdivisionId !== undefined && query.subdivisionId !== null) {
    const idStr = String(query.subdivisionId).toUpperCase().trim();
    candidateKeys.push({ key: idStr, weight: 25 });
    if (query.countryIso2) {
      const iso2 = query.countryIso2.toUpperCase().trim();
      candidateKeys.push({ key: `${iso2}-${idStr}`, weight: 30 });
      const local = localFromSubdivisionCode(iso2, idStr);
      if (local) {
        for (const objectId of numericNamespaceIds(iso2, local)) {
          candidateKeys.push({ key: objectId, weight: 32 });
        }
      }
    }
  }

  // Municipality target (e.g. 'JP-01100', '01100')
  if (query.municipalityCode) {
    const mCode = query.municipalityCode.toUpperCase().trim();
    candidateKeys.push({ key: mCode, weight: 40 });
    if (query.countryIso2) {
      const iso2 = query.countryIso2.toUpperCase().trim();
      candidateKeys.push({ key: `${iso2}-${mCode}`, weight: 45 });
      candidateKeys.push({ key: `${iso2}-MUNICIPALITY`, weight: 28 });
    }
    candidateKeys.push({ key: 'MUNICIPALITY', weight: 6 });
  }

  // Road targets stay scoped by country so a US Interstate card never lands on TW/JP/DE roads.
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
      candidateKeys.push({ key: roadObjectId(iso, query.roadName), weight: 40 });
    }
    if (!iso || iso === 'US') {
      candidateKeys.push({ key: `US-${rName}`, weight: 35 });
    }
    if (/^E-?\d+/i.test(rName)) {
      candidateKeys.push({ key: 'E-ROAD', weight: 30 });
      candidateKeys.push({ key: 'EUROPE-HIGHWAY', weight: 20 });
    }
  }

  // Taipower grid targets (e.g. 'TW-TP-H', 'TW-TP', 'TAIPOWER-GRID')
  if (query.taipowerLetter) {
    const letter = query.taipowerLetter.toUpperCase().trim();
    candidateKeys.push({ key: `TW-TP-${letter}`, weight: 40 });
    candidateKeys.push({ key: gridObjectId(letter), weight: 40 });
    candidateKeys.push({ key: `TP-${letter}`, weight: 35 });
    candidateKeys.push({ key: 'TW-TP', weight: 25 });
    candidateKeys.push({ key: 'TAIPOWER-GRID', weight: 25 });
  }

  const scoreMap = new Map<InfoStub, number>();

  for (const { key, weight } of candidateKeys) {
    const matches = cachedStubsByTarget.get(key);
    if (matches) {
      for (const stub of matches) {
        const cur = scoreMap.get(stub) || 0;
        scoreMap.set(stub, Math.max(cur, weight + (stub.priority || 0)));
      }
    }
  }

  let results = Array.from(scoreMap.keys());

  // Strict priority sorting: 0 to 139 ascending, preserving discovery order when equal
  results.sort((a, b) => {
    const pA = a.priority !== undefined ? a.priority : 140;
    const pB = b.priority !== undefined ? b.priority : 140;
    if (pA !== pB) return pA - pB;
    return 0;
  });

  // A child card keeps its own essays when a shared code string also hits an ancestor card.
  if (!hasRoadContext && hasMunicipalityContext) {
    results = results.filter((stub) => stub.targetType !== 'country' && stub.targetType !== 'subdivision');
  } else if (!hasRoadContext && hasSubdivisionContext) {
    results = results.filter((stub) => stub.targetType !== 'country');
  }

  if (query.tags && query.tags.length > 0) {
    const requiredTags = query.tags.map((t) => t.toLowerCase());
    results = results.filter(
      (stub) => stub.tags && stub.tags.some((t) => requiredTags.includes(t.toLowerCase()))
    );
  }

  return results;
}

/**
 * Fetches and parses a Markdown info file on-demand, caching all cards defined in that file.
 */
export async function loadInfoCard(stub: InfoStub): Promise<InfoCard | null> {
  const cached = loadedCardsById.get(stub.id);
  if (cached) return cached;

  let pending = inFlightFiles.get(stub.sourcePath);
  if (!pending) {
    const assetUrl = getDataUrl(stub.sourcePath);
    pending = fetch(assetUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch info file ${assetUrl}: ${res.status}`);
        }
        return res.text();
      })
      .then((rawMarkdown) => {
        const parsedCards = parseMarkdownInfo(rawMarkdown, stub.sourceFile);
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
