import type { CountryData } from '../types/geo';

export interface TextFilterDef {
  /** Unique filter identifier */
  id: 'callingCode' | 'tld';
  /** Display name in Traditional Chinese */
  nameZh: string;
  /** Display name in English */
  nameEn: string;
  /** Compact badge label (e.g. '📞 國碼', '🌐 網域') */
  shortBadge: string;
  /** Description in Traditional Chinese */
  descriptionZh: string;
  /** Theme accent color */
  accentColor: string;
  /** Function to extract text string from country data */
  getText: (country: CountryData) => string | null;
}

/**
 * Standard International Calling Codes (ISO-2 -> Telephone Prefix)
 * Covers all 91 streetview countries + common neighboring regions
 */
export const COUNTRY_CALLING_CODES: Record<string, string> = {
  // Asia
  TW: '+886',
  JP: '+81',
  KR: '+82',
  PH: '+63',
  TH: '+66',
  KH: '+855',
  VN: '+84',
  LA: '+856',
  MY: '+60',
  ID: '+62',
  SG: '+65',
  HK: '+852',
  MN: '+976',
  KG: '+996',
  KZ: '+7',
  IN: '+91',
  BD: '+880',
  BT: '+975',
  LK: '+94',
  IL: '+972',
  AE: '+971',
  JO: '+962',
  QA: '+974',
  OM: '+968',

  // Europe
  RU: '+7',
  UA: '+380',
  GB: '+44',
  IE: '+353',
  FR: '+33',
  DE: '+49',
  NL: '+31',
  BE: '+32',
  LU: '+352',
  AT: '+43',
  CH: '+41',
  IT: '+39',
  ES: '+34',
  PT: '+351',
  PL: '+48',
  CZ: '+420',
  SK: '+421',
  HU: '+36',
  RO: '+40',
  BG: '+359',
  HR: '+385',
  SI: '+386',
  RS: '+381',
  ME: '+382',
  MK: '+389',
  AL: '+355',
  GR: '+30',
  CY: '+357',
  MT: '+356',
  TR: '+90',
  DK: '+45',
  NO: '+47',
  SE: '+46',
  FI: '+358',
  IS: '+354',
  EE: '+372',
  LV: '+371',
  LT: '+370',

  // Americas
  GL: '+299',
  US: '+1',
  CA: '+1',
  MX: '+52',
  GT: '+502',
  PA: '+507',
  DO: '+1',
  PR: '+1',
  CO: '+57',
  EC: '+593',
  PE: '+51',
  BO: '+591',
  BR: '+55',
  AR: '+54',
  CL: '+56',
  UY: '+598',

  // Oceania
  AU: '+61',
  NZ: '+64',

  // Africa
  ZA: '+27',
  KE: '+254',
  UG: '+256',
  RW: '+250',
  GH: '+233',
  NG: '+234',
  SN: '+221',
  BW: '+267',
  SZ: '+268',
  LS: '+266',
  TN: '+216',

  // Additional non-streetview countries
  CN: '+86',
  MO: '+853',
  SA: '+966',
  IR: '+98',
  IQ: '+964',
  EG: '+20',
  MA: '+212',
  DZ: '+213',
  PK: '+92',
  NP: '+977',
  MM: '+95',
  CU: '+53',
  VE: '+58',
  CR: '+506'
};

/**
 * Visual Mainland Centroid Overrides [Mercator X, Mercator Y] on a 1000x1000 canvas.
 * Corrects geometric centroids distorted by far-off polar islands or overseas territories.
 */
export const COUNTRY_LABEL_CENTROIDS: Record<string, [number, number]> = {
  US: [228, 382], // Contiguous 48 States mainland
  CA: [222, 311], // Southern populous Canada
  FR: [506, 354], // Metropolitan France (excluding French Guiana/Reunion)
  NO: [524, 285], // Mainland Norway (excluding Svalbard)
  ES: [490, 379], // Iberian Peninsula (excluding Canary Islands)
  PT: [478, 380], // Mainland Portugal (excluding Azores/Madeira)
  NL: [515, 329], // European Netherlands (excluding Caribbean islands)
  DK: [526, 311], // Mainland Denmark
  NZ: [979, 625], // North & South Island
  MY: [783, 490], // Peninsular Malaysia
  RU: [661, 301], // Central/European Russia
  GB: [494, 321], // Great Britain
  JP: [883, 391], // Honshu
  IT: [535, 371], // Italian Peninsula
  GR: [561, 382], // Mainland Greece
  CL: [303, 599], // Central Chile
  AR: [319, 604], // Central Argentina
  BR: [367, 539], // Central Brazil
  AU: [869, 572], // Central Australia
  ZA: [568, 584]  // South Africa
};

export const GLOBAL_TEXT_FILTERS: TextFilterDef[] = [
  {
    id: 'callingCode',
    nameZh: '電話國碼',
    nameEn: 'Calling Code',
    shortBadge: '📞 國碼',
    descriptionZh: '顯示全球各國國際電話區號（如 +886、+81、+1、+44 等）',
    accentColor: '#34d399',
    getText: (c) => c.callingCode || COUNTRY_CALLING_CODES[c.iso2] || null
  },
  {
    id: 'tld',
    nameZh: '頂級網域',
    nameEn: 'Domain Name (ccTLD)',
    shortBadge: '🌐 網域',
    descriptionZh: '顯示各國國家頂級網域名稱（ccTLD，如 .tw、.jp、.uk、.us 等）',
    accentColor: '#38bdf8',
    getText: (c) => c.tld || (c.iso2 ? `.${c.iso2.toLowerCase()}` : null)
  }
];

export const GLOBAL_TEXT_FILTERS_BY_ID = new Map<string, TextFilterDef>(
  GLOBAL_TEXT_FILTERS.map((f) => [f.id, f])
);

export function getCountryCallingCode(iso2: string): string | null {
  return COUNTRY_CALLING_CODES[iso2.toUpperCase()] || null;
}

export function getCombinedTextOverlay(country: CountryData, activeFilterIds: Set<string>): string | null {
  const parts: string[] = [];
  if (activeFilterIds.has('tld')) {
    const tld = country.tld || (country.iso2 ? `.${country.iso2.toLowerCase()}` : '');
    if (tld) parts.push(tld);
  }
  if (activeFilterIds.has('callingCode')) {
    const code = country.callingCode || COUNTRY_CALLING_CODES[country.iso2];
    if (code) parts.push(code);
  }
  return parts.length > 0 ? parts.join('  ') : null;
}
