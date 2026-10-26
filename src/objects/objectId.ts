/**
 * Canonical object ids. Country roots are bare ISO2. Children are `ISO::LOCAL`.
 * The same rules are copied in `scripts/build-object-index.mjs` (Node cannot import this file).
 */

const CLASS_SUFFIXES = new Set([
  'HIGHWAY',
  'ROAD',
  'MUNICIPALITY',
  'INTERSTATE',
  'FEDERAL',
  'EXPRESSWAY',
  'AUTOBAHN'
]);

export function formatObjectId(parent: string | null | undefined, local: string): string {
  const loc = local.trim();
  const ns = (parent || '').trim();
  if (!ns) return loc;
  if (!loc) return ns;
  return `${ns}::${loc}`;
}

export function parseObjectId(id: string): { parent: string | null; local: string } {
  const raw = id.trim();
  const idx = raw.indexOf('::');
  if (idx <= 0) return { parent: null, local: raw };
  return { parent: raw.slice(0, idx), local: raw.slice(idx + 2) };
}

/** `IN-TG` → `TG`, `01` → `1`, `26` → `26`. */
export function localFromSubdivisionCode(iso2: string, code: string): string {
  const iso = iso2.trim().toUpperCase();
  const raw = code.trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  const prefix = `${iso}-`;
  if (upper.startsWith(prefix)) return upper.slice(prefix.length);
  if (/^\d+$/.test(raw)) return String(parseInt(raw, 10));
  return upper;
}

/**
 * Route name → local id.
 * `I-10` → `I-10`, `US 11` → `US-11`, `E31` → `E31`, `日本 高速公路` → `日本-高速公路`.
 */
export function localFromRoadName(iso2: string, name: string): string {
  const iso = iso2.trim().toUpperCase();
  const raw = name.trim();
  if (!raw) return 'ROAD';
  if (iso === 'US') {
    const fed = raw.match(/^US\s+(.+)$/i);
    if (fed) return `US-${fed[1].trim().replace(/\s+/g, '-')}`;
    const interstate = raw.match(/^I[-\s]?(\d[\w-]*)$/i);
    if (interstate) return `I-${interstate[1]}`;
  }
  const spaced = raw.match(/^([A-Za-z]{1,6})\s+(\d[\w-]*)$/);
  if (spaced) return `${spaced[1].toUpperCase()}-${spaced[2]}`;
  const compact = raw.replace(/\s+/g, '');
  if (/^[A-Za-z]{0,6}\d[\w-]*$/.test(compact) && compact.length <= 16) {
    return compact.toUpperCase();
  }
  const slug = raw.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]+/gu, '');
  return slug || 'ROAD';
}

export function subdivisionObjectId(iso2: string, code: string | number | null | undefined): string {
  const iso = iso2.trim().toUpperCase();
  const local = localFromSubdivisionCode(iso, code == null ? '' : String(code));
  return local ? formatObjectId(iso, local) : iso;
}

export function roadObjectId(iso2: string, name: string): string {
  const iso = iso2.trim().toUpperCase();
  return formatObjectId(iso, localFromRoadName(iso, name));
}

export function gridObjectId(letter: string): string {
  const upper = letter.trim().toUpperCase();
  if (upper.includes('::')) return upper;
  return `TW-powerpoles::${upper}`;
}

/** `JP-01` → `JP::01`. Class tokens such as `US-HIGHWAY` stay as they are. */
export function namespaceAliasForTarget(key: string): string | null {
  const match = key.match(/^([A-Z]{2})-([A-Z0-9][A-Z0-9-]*)$/);
  if (!match) return null;
  if (CLASS_SUFFIXES.has(match[2])) return null;
  return `${match[1]}::${match[2]}`;
}

/** Numeric locals register both `JP::1` and `JP::01`. */
export function numericNamespaceIds(iso2: string, local: string): string[] {
  const iso = iso2.trim().toUpperCase();
  if (!/^\d+$/.test(local)) return [formatObjectId(iso, local)];
  const num = String(parseInt(local, 10));
  const padded = num.padStart(2, '0');
  return Array.from(new Set([formatObjectId(iso, num), formatObjectId(iso, padded)]));
}
