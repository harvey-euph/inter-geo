export interface AssignableRegionList {
  /** Identifier of the effective range (e.g. 'International', 'Nationwide:JP', 'Nationwide:TW') */
  rangeKey: string;
  /** Human-readable description of this assignable list */
  descriptionZh: string;
  /** Target country ISO-2 code if Nationwide, or '*' for International */
  targetIso2: string;
  /** Canonical set of valid region IDs (optional for pre-indexed data) */
  validIds: ReadonlySet<string>;
  /** Normalizes a raw region-id from CSV into canonical lookup keys */
  normalizeId: (rawId: string) => string[];
  /** Validates whether a raw region-id belongs to this assignable list */
  isValid: (rawId: string) => boolean;
}

/**
 * Normalizes any raw region ID into canonical lookup keys:
 * - Direct: `JP::26` -> `['JP::26', 'JP-26', '26']`
 * - Numeric padding: `JP-01` -> `['JP-01', '01', '1', 'JP::01', 'JP::1', 'JP-1']`
 * - Country context: given `defaultIso2 = 'US'`, `CA` -> `['CA', 'US::CA', 'US-CA']`
 * - Taiwan Power Grid: `TP-H` -> `['TP-H', 'TW::TP-H', 'TW-TP-H', 'H']`
 */
export function normalizeRegionKeys(rawId: string, defaultIso2?: string): string[] {
  const trimmed = rawId.trim();
  if (!trimmed) return [];
  const upper = trimmed.toUpperCase();
  const keys = new Set<string>([upper]);

  // Check for `XX::LOCAL`
  const colonsIdx = upper.indexOf('::');
  if (colonsIdx > 0) {
    const iso = upper.slice(0, colonsIdx);
    const local = upper.slice(colonsIdx + 2);
    keys.add(local);
    keys.add(`${iso}-${local}`);
    if (/^\d+$/.test(local)) {
      const num = String(parseInt(local, 10));
      const padded = num.padStart(2, '0');
      keys.add(`${iso}::${num}`);
      keys.add(`${iso}::${padded}`);
      keys.add(`${iso}-${num}`);
      keys.add(`${iso}-${padded}`);
      keys.add(num);
      keys.add(padded);
    }
    return Array.from(keys);
  }

  // Check for `XX-LOCAL` (e.g. `JP-01` or `TW-TPE`)
  const dashMatch = upper.match(/^([A-Z]{2})-([A-Za-z0-9_-]+)$/);
  if (dashMatch) {
    const iso = dashMatch[1];
    const local = dashMatch[2];
    keys.add(local);
    keys.add(`${iso}::${local}`);
    if (/^\d+$/.test(local)) {
      const num = String(parseInt(local, 10));
      const padded = num.padStart(2, '0');
      keys.add(`${iso}::${num}`);
      keys.add(`${iso}::${padded}`);
      keys.add(`${iso}-${num}`);
      keys.add(`${iso}-${padded}`);
      keys.add(num);
      keys.add(padded);
    }
    return Array.from(keys);
  }

  // Country-scoped shorthand (e.g. `26` for Japan or `CA` for US)
  if (defaultIso2 && defaultIso2 !== '*') {
    const iso = defaultIso2.toUpperCase();
    keys.add(`${iso}::${upper}`);
    keys.add(`${iso}-${upper}`);
    if (/^\d+$/.test(upper)) {
      const num = String(parseInt(upper, 10));
      const padded = num.padStart(2, '0');
      keys.add(`${iso}::${num}`);
      keys.add(`${iso}::${padded}`);
      keys.add(`${iso}-${num}`);
      keys.add(`${iso}-${padded}`);
      keys.add(num);
      keys.add(padded);
    }
  }

  // Taiwan Power Pole letter grid (e.g. 'TW-TP-H' or 'TP-H' or 'H' if TW)
  if (upper.startsWith('TP-')) {
    keys.add(`TW::${upper}`);
    keys.add(`TW-${upper}`);
    keys.add(upper.slice(3));
  } else if (defaultIso2 === 'TW' && /^[A-Z]$/.test(upper)) {
    keys.add(`TW::TP-${upper}`);
    keys.add(`TW-TP-${upper}`);
    keys.add(`TP-${upper}`);
  }

  return Array.from(keys);
}

/**
 * Parses an Effective Range string:
 * Supports:
 * - "International" | "Global" | "*"
 * - "Nationwide:JP", "Nationwide:IN|LK|BD", "Nationwide(JP)", "Nationwide JP"
 * - Or a 2-letter ISO code directly like "JP"
 */
export function parseEffectiveRange(rawRange: string): {
  kind: 'International' | 'Nationwide';
  targetIso2: string;
  targetIso2s: string[];
  canonicalKey: string;
} {
  const trimmed = rawRange.trim();
  const upper = trimmed.toUpperCase();

  if (upper === 'INTERNATIONAL' || upper === 'GLOBAL' || upper === '*' || !upper) {
    return {
      kind: 'International',
      targetIso2: '*',
      targetIso2s: ['*'],
      canonicalKey: 'INTERNATIONAL'
    };
  }

  // Match "Nationwide:JP", "Nationwide:IN|LK|BD", "Nationwide(JP)", "Nationwide JP"
  const match = upper.match(/^NATIONWIDE[\s:(\-_]+([A-Z0-9|+/\s_-]+)\)?$/);
  if (match) {
    const rawTargets = match[1]
      .split(/[|+/\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^[A-Z]{2}$/.test(s));
    if (rawTargets.length > 0) {
      return {
        kind: 'Nationwide',
        targetIso2: rawTargets[0],
        targetIso2s: rawTargets,
        canonicalKey: `NATIONWIDE:${rawTargets.join('|')}`
      };
    }
  }

  // Direct 2-letter country code (e.g. "JP") or pipe-separated ("IN|LK|BD")
  const directTargets = upper
    .split(/[|+/]+/)
    .map((s) => s.trim())
    .filter((s) => /^[A-Z]{2}$/.test(s));
  if (directTargets.length > 0) {
    return {
      kind: 'Nationwide',
      targetIso2: directTargets[0],
      targetIso2s: directTargets,
      canonicalKey: `NATIONWIDE:${directTargets.join('|')}`
    };
  }

  return {
    kind: 'Nationwide',
    targetIso2: upper,
    targetIso2s: [upper],
    canonicalKey: `NATIONWIDE:${upper}`
  };
}

/**
 * Resolves the assignable region list for a given Effective Range.
 * Supports single-country ("Nationwide:IN") or multi-country ("Nationwide:IN|LK|BD") ranges.
 */
export function getAssignableRegionList(rawEffectiveRange: string): AssignableRegionList {
  const { kind, targetIso2, targetIso2s } = parseEffectiveRange(rawEffectiveRange);

  if (kind === 'International') {
    return {
      rangeKey: 'International',
      descriptionZh: '全球國家 (ISO 3166-1 alpha-2 二位字母國碼，如 TW, JP, US)',
      targetIso2: '*',
      validIds: new Set<string>(),
      normalizeId: (rawId: string) => [rawId.trim().toUpperCase()],
      isValid: (rawId: string) => rawId.trim().length > 0
    };
  }

  const isMulti = targetIso2s.length > 1;
  const descriptionZh = isMulti
    ? `${targetIso2s.join(' / ')} 跨國區域與一級行政區`
    : `${targetIso2} 一級行政區 (支援 ${targetIso2}::<CODE>、${targetIso2}-<CODE> 或行政區代碼)`;

  return {
    rangeKey: isMulti ? `Nationwide:${targetIso2s.join('|')}` : `Nationwide:${targetIso2}`,
    descriptionZh,
    targetIso2,
    validIds: new Set<string>(),
    normalizeId: (rawId: string) => {
      const keys = new Set<string>();
      if (isMulti) {
        for (const iso of targetIso2s) {
          for (const k of normalizeRegionKeys(rawId, iso)) {
            keys.add(k);
          }
        }
      } else {
        for (const k of normalizeRegionKeys(rawId, targetIso2)) {
          keys.add(k);
        }
      }
      return Array.from(keys);
    },
    isValid: (rawId: string) => {
      const trimmed = rawId.trim();
      if (!trimmed) return false;
      const upper = trimmed.toUpperCase();
      const colonsIdx = upper.indexOf('::');
      if (colonsIdx > 0) {
        const prefix = upper.slice(0, colonsIdx);
        return targetIso2s.includes(prefix);
      }
      return true;
    }
  };
}
