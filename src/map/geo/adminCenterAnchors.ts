import type { CanonicalFeature } from '../data/FeatureRegistry';
import { FeatureRegistry } from '../data/FeatureRegistry';
import { AdministrativeHierarchy } from '../data/AdministrativeHierarchy';

/**
 * Anchor definition allowing an ADM{x} entity to be anchored to a specific
 * ADM{x+1} subdivision's center, with a canonical [lng, lat] fallback.
 */
export interface AdminCenterAnchor {
  /** Target ADM{x+1} subdivision code, e.g. 'US-KS' (Kansas), 'PT-14' (Santarém), 'FR-CVL' */
  subdivisionCode?: string;
  /** Human-readable subdivision name for reference & maintenance */
  subdivisionName?: string;
  /** Canonical fallback geographic coordinates [longitude, latitude] */
  coordinates: [number, number];
}

/**
 * Curated worldwide configuration for ADM0 country visual center anchors.
 * Resolves distorted geometric centroids caused by far-flung polar islands,
 * overseas territories (e.g. French Guiana, Azores, Hawaii, Easter Island),
 * or archipelagos across the antimeridian.
 */
export const ADM0_CENTER_ANCHORS: Record<string, AdminCenterAnchor> = {
  // --- North America ---
  US: { subdivisionCode: 'US-KS', subdivisionName: 'Kansas', coordinates: [-98.5795, 39.8283] }, // Contiguous US center in Lebanon, Kansas
  CA: { subdivisionCode: 'CA-MB', subdivisionName: 'Manitoba', coordinates: [-97.1384, 53.7609] }, // Center of Canada mainland
  MX: { subdivisionCode: 'MX-ZAC', subdivisionName: 'Zacatecas', coordinates: [-102.5528, 23.6345] },
  GL: { coordinates: [-42.6043, 71.7069] },

  // --- Central & South America ---
  BR: { subdivisionCode: 'BR-GO', subdivisionName: 'Goiás', coordinates: [-49.0, -15.8] }, // Central Brazilian plateau / Brasília
  AR: { subdivisionCode: 'AR-L', subdivisionName: 'La Pampa', coordinates: [-64.5, -36.6] }, // Argentine mainland center
  CL: { subdivisionCode: 'CL-RM', subdivisionName: 'Santiago', coordinates: [-70.6693, -33.4489] }, // Central Chile, avoiding Easter Island drag
  CO: { subdivisionCode: 'CO-CUN', subdivisionName: 'Cundinamarca', coordinates: [-74.0721, 4.7110] },
  PE: { subdivisionCode: 'PE-JUN', subdivisionName: 'Junín', coordinates: [-75.0, -11.5] },
  EC: { subdivisionCode: 'EC-P', subdivisionName: 'Pichincha', coordinates: [-78.4678, -1.4] }, // Mainland Ecuador, avoiding Galapagos drag
  VE: { subdivisionCode: 'VE-G', subdivisionName: 'Guárico', coordinates: [-66.5, 8.5] },
  BO: { subdivisionCode: 'BO-C', subdivisionName: 'Cochabamba', coordinates: [-65.5, -17.0] },
  PY: { subdivisionCode: 'PY-ASU', subdivisionName: 'Asunción', coordinates: [-57.5, -23.5] },
  UY: { subdivisionCode: 'UY-DU', subdivisionName: 'Durazno', coordinates: [-56.0, -33.0] },
  PA: { coordinates: [-80.7821, 8.5380] },
  CR: { coordinates: [-83.7534, 9.7489] },
  NI: { coordinates: [-85.2072, 12.8654] },
  HN: { coordinates: [-86.2419, 15.2000] },
  SV: { coordinates: [-88.8965, 13.7942] },
  GT: { coordinates: [-90.2308, 15.7835] },
  BZ: { coordinates: [-88.4976, 17.1899] },
  CU: { coordinates: [-77.7812, 21.5218] },
  DO: { coordinates: [-70.1627, 18.7357] },
  HT: { coordinates: [-72.2852, 18.9712] },
  JM: { coordinates: [-77.2975, 18.1096] },
  PR: { coordinates: [-66.5901, 18.2208] },

  // --- Western & Southern Europe ---
  PT: { subdivisionCode: 'PT-14', subdivisionName: 'Santarém', coordinates: [-8.2245, 39.3999] }, // Mainland Portugal center, avoiding Azores/Madeira
  ES: { subdivisionCode: 'ES-MD', subdivisionName: 'Madrid', coordinates: [-3.7038, 40.4168] }, // Mainland Iberian center, avoiding Canary Islands
  FR: { subdivisionCode: 'FR-CVL', subdivisionName: 'Centre-Val de Loire', coordinates: [2.3522, 46.8] }, // Metropolitan France, avoiding French Guiana/Réunion
  GB: { subdivisionCode: 'GB-ENG', subdivisionName: 'England', coordinates: [-1.8756, 53.7632] }, // Great Britain geographic center (Yorkshire/Lancashire)
  IE: { subdivisionCode: 'IE-RN', subdivisionName: 'Roscommon', coordinates: [-7.95, 53.48] },
  NL: { subdivisionCode: 'NL-UT', subdivisionName: 'Utrecht', coordinates: [5.2913, 52.1326] }, // European Netherlands, avoiding Caribbean islands
  BE: { subdivisionCode: 'BE-WBR', subdivisionName: 'Brabant Wallon', coordinates: [4.6, 50.6] },
  LU: { coordinates: [6.1296, 49.8153] },
  DE: { subdivisionCode: 'DE-TH', subdivisionName: 'Thüringen', coordinates: [10.4515, 51.1657] }, // Center of Germany (Niederdorla)
  CH: { subdivisionCode: 'CH-OW', subdivisionName: 'Obwalden', coordinates: [8.2275, 46.8182] }, // Center of Switzerland (Älggi-Alp)
  AT: { subdivisionCode: 'AT-6', subdivisionName: 'Steiermark', coordinates: [14.5501, 47.5162] }, // Center of Austria (Styria)
  IT: { subdivisionCode: 'IT-55', subdivisionName: 'Umbria', coordinates: [12.5674, 42.5] }, // Center of Italian Peninsula
  GR: { subdivisionCode: 'GR-H', subdivisionName: 'Central Greece', coordinates: [22.4, 38.8] }, // Mainland Greece, avoiding Aegean island skew
  AD: { coordinates: [1.5218, 42.5063] },
  MC: { coordinates: [7.4246, 43.7384] },
  SM: { coordinates: [12.4578, 43.9424] },
  VA: { coordinates: [12.4534, 41.9029] },
  MT: { coordinates: [14.3754, 35.9375] },
  CY: { coordinates: [33.4299, 35.1264] },

  // --- Northern & Eastern Europe ---
  NO: { subdivisionCode: 'NO-50', subdivisionName: 'Trøndelag', coordinates: [11.5, 63.5] }, // Mainland Norway, avoiding Svalbard skew
  SE: { subdivisionCode: 'SE-Y', subdivisionName: 'Västernorrland', coordinates: [16.5, 62.5] }, // Flataklocken, Sweden center
  FI: { subdivisionCode: 'FI-13', subdivisionName: 'Pohjois-Pohjanmaa', coordinates: [26.0, 64.5] }, // Piippola, Finland center
  DK: { subdivisionCode: 'DK-82', subdivisionName: 'Region Midtjylland', coordinates: [9.5, 56.2] }, // Mainland Jutland center
  IS: { subdivisionCode: 'IS-6', subdivisionName: 'Norðurland eystra', coordinates: [-18.5, 64.9] },
  PL: { subdivisionCode: 'PL-10', subdivisionName: 'Łódź', coordinates: [19.4560, 51.7592] }, // Center of Poland (Piątek)
  CZ: { subdivisionCode: 'CZ-VY', subdivisionName: 'Vysočina', coordinates: [15.3, 49.6] }, // Center of Czechia (Číhošť)
  SK: { subdivisionCode: 'SK-BC', subdivisionName: 'Banská Bystrica', coordinates: [19.45, 48.7] }, // Center of Slovakia (Hrb)
  HU: { subdivisionCode: 'HU-PE', subdivisionName: 'Pest', coordinates: [19.5, 47.18] }, // Center of Hungary (Pusztavacs)
  RO: { subdivisionCode: 'RO-SB', subdivisionName: 'Sibiu', coordinates: [24.5, 45.9] }, // Center of Romania (Dealu Frumos)
  BG: { subdivisionCode: 'BG-03', subdivisionName: 'Varna', coordinates: [25.4858, 42.7339] },
  UA: { subdivisionCode: 'UA-71', subdivisionName: 'Cherkasy', coordinates: [31.5, 49.0] }, // Geographic center of Ukraine
  BY: { subdivisionCode: 'BY-MI', subdivisionName: 'Minsk', coordinates: [27.5674, 53.7098] },
  EE: { coordinates: [25.0136, 58.5953] },
  LV: { coordinates: [24.6032, 56.8796] },
  LT: { coordinates: [23.8813, 55.1694] },
  MD: { coordinates: [28.3699, 47.4116] },
  RU: { subdivisionCode: 'RU-MOW', subdivisionName: 'Moscow', coordinates: [37.6173, 55.7558] }, // Moscow

  // --- Balkans ---
  HR: { subdivisionCode: 'HR-04', subdivisionName: 'Karlovac', coordinates: [15.55, 45.49] },
  SI: { coordinates: [14.9955, 46.1512] },
  BA: { coordinates: [17.6791, 43.9159] },
  RS: { coordinates: [20.9056, 44.0165] },
  ME: { coordinates: [19.3744, 42.7087] },
  MK: { coordinates: [21.7453, 41.6086] },
  AL: { coordinates: [20.1683, 41.1533] },
  XK: { coordinates: [20.9030, 42.6026] },

  // --- East & Southeast Asia ---
  TW: { subdivisionCode: 'TW-NAN', subdivisionName: 'Nantou', coordinates: [120.9605, 23.9739] }, // Puli, Taiwan geographic center
  JP: { subdivisionCode: 'JP-20', subdivisionName: 'Nagano', coordinates: [138.2529, 36.2048] }, // Chubu / Nagano, Honshu center
  KR: { subdivisionCode: 'KR-43', subdivisionName: 'Chungcheongbuk-do', coordinates: [127.7669, 36.5] }, // Center of South Korea
  KP: { coordinates: [127.5101, 40.3399] },
  CN: { subdivisionCode: 'CN-SN', subdivisionName: 'Shaanxi', coordinates: [108.9402, 34.3416] }, // Xi'an, central China
  HK: { coordinates: [114.1694, 22.3193] },
  MO: { coordinates: [113.5439, 22.1987] },
  MN: { subdivisionCode: 'MN-055', subdivisionName: 'Övörkhangai', coordinates: [103.0, 46.5] }, // Geographic center of Mongolia
  PH: { subdivisionCode: 'PH-WES', subdivisionName: 'Western Visayas', coordinates: [122.5, 11.2] }, // Visayas, center of Philippine archipelago
  VN: { subdivisionCode: 'VN-46', subdivisionName: 'Thừa Thiên Huế', coordinates: [107.5, 16.4] }, // Central Vietnam
  TH: { subdivisionCode: 'TH-67', subdivisionName: 'Phetchabun', coordinates: [101.0, 16.0] }, // Center of Thailand
  MY: { subdivisionCode: 'MY-06', subdivisionName: 'Pahang', coordinates: [102.5, 3.8] }, // Peninsular Malaysia center
  SG: { coordinates: [103.8198, 1.3521] },
  ID: { subdivisionCode: 'ID-KS', subdivisionName: 'Kalimantan Selatan', coordinates: [115.0, -2.5] }, // Center of Indonesian archipelago
  MM: { coordinates: [95.9560, 21.9162] },
  KH: { coordinates: [104.9910, 12.5657] },
  LA: { coordinates: [102.4955, 19.8563] },
  BN: { coordinates: [114.7277, 4.5353] },
  TL: { coordinates: [125.7275, -8.8742] },

  // --- South & Central Asia ---
  IN: { subdivisionCode: 'IN-MP', subdivisionName: 'Madhya Pradesh', coordinates: [78.9629, 22.9734] }, // Center of India
  PK: { coordinates: [69.3451, 30.3753] },
  BD: { coordinates: [90.3563, 23.6850] },
  LK: { coordinates: [80.7718, 7.8731] },
  NP: { coordinates: [84.1240, 28.3949] },
  BT: { coordinates: [90.4336, 27.5142] },
  KZ: { subdivisionCode: 'KZ-KAR', subdivisionName: 'Karaganda', coordinates: [71.5, 49.0] }, // Central Kazakh Steppe
  UZ: { coordinates: [64.5853, 41.3775] },
  TM: { coordinates: [59.5563, 38.9697] },
  KG: { coordinates: [74.7661, 41.2044] },
  TJ: { coordinates: [71.2761, 38.8610] },
  AF: { coordinates: [67.7100, 33.9391] },

  // --- Middle East ---
  TR: { subdivisionCode: 'TR-06', subdivisionName: 'Ankara', coordinates: [32.8597, 39.9334] }, // Central Anatolia
  SA: { subdivisionCode: 'SA-01', subdivisionName: 'Riyadh', coordinates: [46.7, 24.7] }, // Central plateau
  IR: { subdivisionCode: 'IR-04', subdivisionName: 'Isfahan', coordinates: [52.5, 32.6] }, // Central Iranian plateau
  IQ: { coordinates: [43.6793, 33.2232] },
  IL: { coordinates: [34.8516, 31.0461] },
  PS: { coordinates: [35.2332, 31.9522] },
  JO: { coordinates: [36.2384, 30.5852] },
  LB: { coordinates: [35.8623, 33.8547] },
  SY: { coordinates: [38.9968, 34.8021] },
  AE: { coordinates: [53.8478, 23.4241] },
  OM: { coordinates: [55.9233, 21.4735] },
  QA: { coordinates: [51.1839, 25.3548] },
  KW: { coordinates: [47.4818, 29.3117] },
  BH: { coordinates: [50.5577, 26.0667] },
  YE: { coordinates: [48.5164, 15.5527] },

  // --- Oceania ---
  AU: { subdivisionCode: 'AU-NT', subdivisionName: 'Northern Territory', coordinates: [133.7751, -25.2744] }, // Alice Springs / Lambert center
  NZ: { subdivisionCode: 'NZ-MWT', subdivisionName: 'Manawatu-Wanganui', coordinates: [175.0, -40.0] }, // Central North/South island balance
  FJ: { subdivisionCode: 'FJ-W', subdivisionName: 'Western Division', coordinates: [178.0, -17.8] }, // Viti Levu, fixing antimeridian offset
  PG: { coordinates: [144.5, -6.0] },
  SB: { coordinates: [160.1562, -9.6457] },
  VU: { coordinates: [166.9592, -15.3767] },
  NC: { coordinates: [165.6180, -20.9043] },

  // --- Africa ---
  ZA: { subdivisionCode: 'ZA-FS', subdivisionName: 'Free State', coordinates: [26.2, -29.0] }, // Bloemfontein / Free State center
  EG: { subdivisionCode: 'EG-WAD', subdivisionName: 'New Valley', coordinates: [30.5, 27.0] },
  NG: { subdivisionCode: 'NG-FC', subdivisionName: 'Federal Capital Territory', coordinates: [7.5, 9.0] }, // Abuja / center of Nigeria
  KE: { subdivisionCode: 'KE-11', subdivisionName: 'Isiolo', coordinates: [37.5, 0.5] }, // Center of Kenya
  DZ: { coordinates: [2.6322, 28.0339] },
  MA: { coordinates: [-7.0926, 31.7917] },
  ET: { coordinates: [39.5, 8.5] },
  CD: { coordinates: [23.6560, -2.8797] },
  TZ: { coordinates: [34.8888, -6.3690] },
  GH: { coordinates: [-1.0232, 7.9465] },
  CI: { coordinates: [-5.5471, 7.5400] },
  SN: { coordinates: [-14.4524, 14.4974] },
  UG: { coordinates: [32.2903, 1.3733] },
  SD: { coordinates: [30.2176, 12.8628] },
  SS: { coordinates: [31.3070, 6.8770] },
  AO: { coordinates: [17.8739, -11.2027] },
  MZ: { coordinates: [35.5296, -18.6657] },
  ZM: { coordinates: [27.8493, -13.1339] },
  ZW: { coordinates: [29.1549, -19.0154] },
  BW: { coordinates: [24.6849, -22.3285] },
  NA: { coordinates: [18.4904, -22.9576] },
  MG: { coordinates: [46.8691, -18.7669] },
  TN: { coordinates: [9.5375, 33.8869] },
  LY: { coordinates: [17.2283, 26.3351] },
  CM: { coordinates: [12.3547, 7.3697] }
};

/**
 * Optional anchors for ADM1 subdivisions specifying their ADM2 district center.
 * Extendable for specific states/provinces.
 */
export const ADM1_CENTER_ANCHORS: Record<string, AdminCenterAnchor> = {};

/**
 * Resolves the optimal geographic [longitude, latitude] center for any administrative feature.
 *
 * Rules:
 * 1. For ADM0 (Country):
 *    - If an anchor is defined in `ADM0_CENTER_ANCHORS`:
 *      - If it specifies an ADM1 subdivision (e.g. US -> US-KS) and that ADM1 feature is loaded
 *        in the FeatureRegistry, dynamically returns that subdivision's center.
 *      - Otherwise returns the anchor's predefined canonical [longitude, latitude].
 * 2. For ADM1 (Subdivision):
 *    - If an anchor is defined in `ADM1_CENTER_ANCHORS`, resolves via ADM2 or canonical coords.
 * 3. Fallback:
 *    - If feature.properties.center exists and is not [0, 0], uses it.
 *    - Otherwise, calculates center from geometry using largest-polygon mainland centroid.
 */
export function resolveAdminCenter(
  feature: CanonicalFeature,
  registry?: FeatureRegistry
): [number, number] {
  const p = feature.properties;
  const level = p.admin_level;
  const countryCode = (p.country_code || '').toUpperCase();

  // 1. ADM0 Country Anchor
  if (level === 0 && countryCode) {
    const anchor = ADM0_CENTER_ANCHORS[countryCode];
    if (anchor) {
      if (anchor.subdivisionCode && registry) {
        const subId = anchor.subdivisionCode;
        // Try direct ID patterns: 'ADM1_US_US-KS', 'ADM1_US_KS', etc.
        const directId = FeatureRegistry.createId(1, countryCode, subId);
        const shortSub = subId.includes('-') ? subId.split('-')[1] : subId;
        const shortId = FeatureRegistry.createId(1, countryCode, shortSub);

        const subFeature =
          registry.getById(directId) ||
          registry.getById(shortId) ||
          registry.getByLevel(1).find(
            (f) =>
              f.properties.country_code === countryCode &&
              (f.properties.code === subId ||
                f.properties.code === shortSub ||
                f.properties.postal === subId ||
                f.properties.postal === shortSub)
          );

        if (subFeature?.properties?.center && (subFeature.properties.center[0] !== 0 || subFeature.properties.center[1] !== 0)) {
          return subFeature.properties.center;
        }
        if (subFeature?.geometry) {
          const geomCenter = AdministrativeHierarchy.calculateCenter(subFeature.geometry);
          if (geomCenter[0] !== 0 || geomCenter[1] !== 0) {
            return geomCenter;
          }
        }
      }
      return anchor.coordinates;
    }
  }

  // 2. ADM1 Subdivision Anchor
  if (level === 1 && p.feature_id) {
    const subCode = String(p.code || p.postal || p.feature_id);
    const anchor = ADM1_CENTER_ANCHORS[subCode];
    if (anchor) {
      if (anchor.subdivisionCode && registry) {
        const directId = FeatureRegistry.createId(2, countryCode, anchor.subdivisionCode);
        const subFeature = registry.getById(directId);
        if (subFeature?.properties?.center && (subFeature.properties.center[0] !== 0 || subFeature.properties.center[1] !== 0)) {
          return subFeature.properties.center;
        }
      }
      return anchor.coordinates;
    }
  }

  // 3. Precomputed feature center
  if (p.center && (p.center[0] !== 0 || p.center[1] !== 0)) {
    return p.center;
  }

  // 4. Geometry calculation (uses largest-polygon mainland centroid)
  return AdministrativeHierarchy.calculateCenter(feature.geometry);
}

/**
 * Returns the anchor center coordinates for a country if defined.
 */
export function getCountryAnchorCenter(
  iso2: string,
  registry?: FeatureRegistry
): [number, number] | undefined {
  const clean = iso2.toUpperCase();
  const anchor = ADM0_CENTER_ANCHORS[clean];
  if (!anchor) return undefined;

  if (anchor.subdivisionCode && registry) {
    const subId = anchor.subdivisionCode;
    const directId = FeatureRegistry.createId(1, clean, subId);
    const shortSub = subId.includes('-') ? subId.split('-')[1] : subId;
    const shortId = FeatureRegistry.createId(1, clean, shortSub);

    const subFeature =
      registry.getById(directId) ||
      registry.getById(shortId) ||
      registry.getByLevel(1).find(
        (f) =>
          f.properties.country_code === clean &&
          (f.properties.code === subId ||
            f.properties.code === shortSub ||
            f.properties.postal === subId ||
            f.properties.postal === shortSub)
      );

    if (subFeature?.properties?.center && (subFeature.properties.center[0] !== 0 || subFeature.properties.center[1] !== 0)) {
      return subFeature.properties.center;
    }
  }

  return anchor.coordinates;
}
