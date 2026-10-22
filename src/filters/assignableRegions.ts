import { COUNTRIES_DATA } from '../data/countries';
import { JAPAN_PREFECTURES } from '../data/japanData';
import { L2_MANIFEST } from '../data/l2Manifest';
import { TAIWAN_POWER_POLE_ZONES } from '../data/taiwanPowerPoles';

export interface AssignableRegionList {
  /** Identifier of the effective range (e.g. 'International', 'Nationwide:JP', 'Nationwide:TW') */
  rangeKey: string;
  /** Human-readable description of this assignable list */
  descriptionZh: string;
  /** Target country ISO-2 code if Nationwide, or '*' for International */
  targetIso2: string;
  /** Canonical set of valid region IDs */
  validIds: ReadonlySet<string>;
  /** Normalizes a raw region-id from CSV into canonical lookup keys */
  normalizeId: (rawId: string) => string[];
  /** Validates whether a raw region-id belongs to this assignable list */
  isValid: (rawId: string) => boolean;
}

/**
 * Full ISO 3166-1 alpha-2 country code list for International filters
 * (Includes all 91 streetview countries + non-streetview sovereign states & territories)
 */
const ISO2_WORLD_COUNTRIES = [
  ...COUNTRIES_DATA.map((c) => c.iso2.toUpperCase()),
  ...L2_MANIFEST.map((c) => c.iso2.toUpperCase()),
  'AF', 'AO', 'AM', 'AZ', 'BS', 'BH', 'BY', 'BZ', 'BJ', 'BA',
  'BN', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'CN', 'KM', 'CG',
  'CD', 'CR', 'CI', 'CU', 'DJ', 'DM', 'DZ', 'EG', 'SV', 'GQ',
  'ER', 'ET', 'FJ', 'GA', 'GM', 'GE', 'GN', 'GW', 'GY', 'HT',
  'HN', 'IR', 'IQ', 'JM', 'KP', 'KW', 'LB', 'LR', 'LY', 'LI',
  'MO', 'MG', 'MW', 'MV', 'ML', 'MR', 'MU', 'MD', 'MC', 'MA',
  'MZ', 'MM', 'NA', 'NR', 'NP', 'NI', 'NE', 'OM', 'PK', 'PW',
  'PS', 'PG', 'PY', 'RW', 'KN', 'LC', 'VC', 'WS', 'SM', 'ST',
  'SA', 'SC', 'SL', 'SB', 'SO', 'SS', 'SD', 'SR', 'SY', 'TJ',
  'TZ', 'TL', 'TG', 'TO', 'TT', 'TM', 'TV', 'UZ', 'VU', 'VA',
  'VE', 'YE', 'ZM', 'ZW'
];

export const INTERNATIONAL_COUNTRY_IDS: ReadonlySet<string> = new Set(ISO2_WORLD_COUNTRIES);

/**
 * Japan's 47 Prefectures assignable list (supports '1'..'47', '01'..'47', 'JP-01'..'JP-47', Kanji, or English name)
 */
const jpAliasToCanonical = new Map<string, string>();
const jpCanonicalIds = new Set<string>();
for (const pref of Object.values(JAPAN_PREFECTURES)) {
  const padded = String(pref.id).padStart(2, '0');
  const canonical = `JP-${padded}`;
  jpCanonicalIds.add(canonical);
  jpAliasToCanonical.set(canonical, canonical);
  jpAliasToCanonical.set(padded, canonical);
  jpAliasToCanonical.set(String(pref.id), canonical);
  jpAliasToCanonical.set(pref.nameJa.toUpperCase(), canonical);
  jpAliasToCanonical.set(pref.nameZh.toUpperCase(), canonical);
  jpAliasToCanonical.set(pref.nameEn.toUpperCase(), canonical);
}

/**
 * US 50 States + DC + territories assignable list
 */
const US_SUBDIVISION_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR'
];
const usValidSet = new Set<string>([
  ...US_SUBDIVISION_CODES,
  ...US_SUBDIVISION_CODES.map((c) => `US-${c}`)
]);

/**
 * Taiwan 22 Counties/Cities + Taipower Grid Zones (A..W)
 */
const TW_SUBDIVISION_CODES = [
  'TPE', 'NWT', 'KEE', 'TYN', 'HSQ', 'HSZ', 'MIA', 'TXG', 'CHA', 'NAN',
  'YUN', 'CYQ', 'CYI', 'TNN', 'KHH', 'PIF', 'ILA', 'HUA', 'TTT', 'PEN',
  'KIN', 'LIE',
  ...TAIWAN_POWER_POLE_ZONES.map((z) => z.letter.toUpperCase()),
  ...TAIWAN_POWER_POLE_ZONES.map((z) => `TP-${z.letter.toUpperCase()}`)
];
const twValidSet = new Set<string>([
  ...TW_SUBDIVISION_CODES,
  ...TW_SUBDIVISION_CODES.map((c) => `TW-${c}`)
]);

/**
 * India 28 States + 8 Union Territories assignable list
 */
const IN_STATE_ENTRIES: Array<[string, string, string]> = [
  ['AP', 'Andhra Pradesh', '安得拉邦'],
  ['AR', 'Arunachal Pradesh', '阿魯納恰爾邦'],
  ['AS', 'Assam', '阿薩姆邦'],
  ['BR', 'Bihar', '比哈爾邦'],
  ['CT', 'Chhattisgarh', '恰蒂斯加爾邦'],
  ['GA', 'Goa', '果阿邦'],
  ['GJ', 'Gujarat', '古吉拉特邦'],
  ['HR', 'Haryana', '哈里亞納邦'],
  ['HP', 'Himachal Pradesh', '喜馬偕爾邦'],
  ['JH', 'Jharkhand', '賈坎德邦'],
  ['KA', 'Karnataka', '卡納塔克邦'],
  ['KL', 'Kerala', '喀拉拉邦'],
  ['MP', 'Madhya Pradesh', '中央邦'],
  ['MH', 'Maharashtra', '馬哈拉施特拉邦'],
  ['MN', 'Manipur', '曼尼普爾邦'],
  ['ML', 'Meghalaya', '梅加拉亞邦'],
  ['MZ', 'Mizoram', '米佐拉姆邦'],
  ['NL', 'Nagaland', '那加蘭邦'],
  ['OR', 'Odisha', '奧里薩邦'],
  ['OD', 'Odisha', '奧里薩邦'],
  ['PB', 'Punjab', '旁遮普邦'],
  ['RJ', 'Rajasthan', '拉賈斯坦邦'],
  ['SK', 'Sikkim', '錫金邦'],
  ['TN', 'Tamil Nadu', '泰米爾納德邦'],
  ['TG', 'Telangana', '泰倫加納邦'],
  ['TS', 'Telangana', '泰倫加納邦'],
  ['TR', 'Tripura', '特里普拉邦'],
  ['UP', 'Uttar Pradesh', '北方邦'],
  ['UT', 'Uttarakhand', '北阿坎德邦'],
  ['UK', 'Uttarakhand', '北阿坎德邦'],
  ['WB', 'West Bengal', '西孟加拉邦'],
  ['AN', 'Andaman and Nicobar', '安達曼-尼科巴群島'],
  ['CH', 'Chandigarh', '昌迪加爾'],
  ['DN', 'Dadra and Nagar Haveli', '達德拉-納加爾哈維利'],
  ['DD', 'Daman and Diu', '達曼-第烏'],
  ['DL', 'NCT of Delhi', '德里國家首都轄區'],
  ['JK', 'Jammu and Kashmir', '查謨和克什米爾'],
  ['LA', 'Ladakh', '拉達克'],
  ['LD', 'Lakshadweep', '拉克沙群島'],
  ['PY', 'Puducherry', '本地治里']
];
const inAliasToKeys = new Map<string, string[]>();
const inCanonicalIds = new Set<string>();
for (const [code, nameEn, nameZh] of IN_STATE_ENTRIES) {
  const canonical = `IN-${code}`;
  inCanonicalIds.add(canonical);
  const allKeys = Array.from(
    new Set([canonical, code, nameEn.toUpperCase(), nameZh.toUpperCase()])
  );
  for (const k of allKeys) {
    inAliasToKeys.set(k, allKeys);
  }
}
inAliasToKeys.set('DELHI', inAliasToKeys.get('DL')!);
inAliasToKeys.set('ORISSA', inAliasToKeys.get('OR')!);

const PREDEFINED_LISTS = new Map<string, AssignableRegionList>([
  [
    'INTERNATIONAL',
    {
      rangeKey: 'International',
      descriptionZh: '全球國家 (ISO 3166-1 alpha-2 二位字母國碼，如 TW, JP, US)',
      targetIso2: '*',
      validIds: INTERNATIONAL_COUNTRY_IDS,
      normalizeId: (rawId: string) => [rawId.trim().toUpperCase()],
      isValid: (rawId: string) => INTERNATIONAL_COUNTRY_IDS.has(rawId.trim().toUpperCase())
    }
  ],
  [
    'NATIONWIDE:JP',
    {
      rangeKey: 'Nationwide:JP',
      descriptionZh: '日本 47 都道府縣 (支援 JP-01~JP-47、01~47、漢字或英文名稱)',
      targetIso2: 'JP',
      validIds: jpCanonicalIds,
      normalizeId: (rawId: string) => {
        const upper = rawId.trim().toUpperCase();
        const canonical = jpAliasToCanonical.get(upper);
        if (!canonical) return [upper];
        const num = String(parseInt(canonical.slice(3), 10));
        const padded = canonical.slice(3);
        return Array.from(new Set([canonical, padded, num, upper]));
      },
      isValid: (rawId: string) => jpAliasToCanonical.has(rawId.trim().toUpperCase())
    }
  ],
  [
    'NATIONWIDE:US',
    {
      rangeKey: 'Nationwide:US',
      descriptionZh: '美國 50 州與特區 (支援 US-CA 或 CA 等州縮寫)',
      targetIso2: 'US',
      validIds: usValidSet,
      normalizeId: (rawId: string) => {
        const upper = rawId.trim().toUpperCase();
        const short = upper.startsWith('US-') ? upper.slice(3) : upper;
        return [`US-${short}`, short];
      },
      isValid: (rawId: string) => usValidSet.has(rawId.trim().toUpperCase())
    }
  ],
  [
    'NATIONWIDE:TW',
    {
      rangeKey: 'Nationwide:TW',
      descriptionZh: '台灣 22 縣市與台電分區 (支援 TW-TPE、TPE 或台電分區字母)',
      targetIso2: 'TW',
      validIds: twValidSet,
      normalizeId: (rawId: string) => {
        const upper = rawId.trim().toUpperCase();
        const short = upper.startsWith('TW-') ? upper.slice(3) : upper;
        return [`TW-${short}`, short];
      },
      isValid: (rawId: string) => twValidSet.has(rawId.trim().toUpperCase())
    }
  ],
  [
    'NATIONWIDE:IN',
    {
      rangeKey: 'Nationwide:IN',
      descriptionZh: '印度各邦與聯邦屬地 (支援 IN-TN、TN 或英文/中文邦名)',
      targetIso2: 'IN',
      validIds: inCanonicalIds,
      normalizeId: (rawId: string) => {
        const upper = rawId.trim().toUpperCase();
        const mapped = inAliasToKeys.get(upper);
        if (mapped) return mapped;
        const short = upper.startsWith('IN-') ? upper.slice(3) : upper;
        return [`IN-${short}`, short, upper];
      },
      isValid: (rawId: string) => inAliasToKeys.has(rawId.trim().toUpperCase())
    }
  ]
]);

/**
 * Parses an Effective Range string from `filter-reg.csv`:
 * Supports:
 * - "International"
 * - "Nationwide:JP", "Nationwide:TW", "Nationwide:US"
 * - "Nationwide(JP)", "Nationwide JP"
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

  if (upper === 'INTERNATIONAL' || upper === 'GLOBAL' || upper === '*') {
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
      const first = rawTargets[0];
      return {
        kind: 'Nationwide',
        targetIso2: first,
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
  const { kind, targetIso2, targetIso2s, canonicalKey } = parseEffectiveRange(rawEffectiveRange);
  const existing = PREDEFINED_LISTS.get(canonicalKey);
  if (existing) return existing;

  if (kind === 'International') {
    return PREDEFINED_LISTS.get('INTERNATIONAL')!;
  }

  // Multi-country Nationwide assignable list (e.g. "Nationwide:IN|LK|BD")
  if (targetIso2s.length > 1) {
    const subLists = targetIso2s.map((iso) => getAssignableRegionList(`Nationwide:${iso}`));
    const countryIsoSet = new Set(targetIso2s);
    const combinedValidIds = new Set<string>(targetIso2s);
    for (const sl of subLists) {
      for (const id of sl.validIds) {
        combinedValidIds.add(id);
      }
    }

    return {
      rangeKey: `Nationwide:${targetIso2s.join('|')}`,
      descriptionZh: `${targetIso2s.join(' / ')} 跨國區域與一級行政區`,
      targetIso2,
      validIds: combinedValidIds,
      normalizeId: (rawId: string) => {
        const upper = rawId.trim().toUpperCase();
        if (countryIsoSet.has(upper)) {
          return [upper];
        }
        const keys = new Set<string>([upper]);
        for (const sl of subLists) {
          if (sl.validIds.size === 0 || sl.isValid(upper)) {
            for (const k of sl.normalizeId(upper)) {
              keys.add(k);
            }
          }
        }
        return Array.from(keys);
      },
      isValid: (rawId: string) => {
        const upper = rawId.trim().toUpperCase();
        if (countryIsoSet.has(upper)) return true;
        return subLists.some((sl) => sl.validIds.size === 0 || sl.isValid(upper));
      }
    };
  }

  // Generic Nationwide:<ISO2> assignable list for any L2 country (e.g. Nationwide:BR, Nationwide:DE)
  return {
    rangeKey: `Nationwide:${targetIso2}`,
    descriptionZh: `${targetIso2} 一級行政區 (支援 ${targetIso2}-<CODE> 或行政區代碼)`,
    targetIso2,
    validIds: new Set<string>(),
    normalizeId: (rawId: string) => {
      const upper = rawId.trim().toUpperCase();
      if (upper === targetIso2) return [upper];
      const prefix = `${targetIso2}-`;
      const short = upper.startsWith(prefix) ? upper.slice(prefix.length) : upper;
      return [`${prefix}${short}`, short];
    },
    isValid: (rawId: string) => rawId.trim().length > 0
  };
}
