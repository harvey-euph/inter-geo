import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { geoMercator, geoPath, geoArea } from 'd3-geo';
import * as flatgeobuf from 'flatgeobuf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataSourceDir = path.join(rootDir, 'data-source', 'l3');
const outputDir = path.join(rootDir, 'public', 'data', 'l3');
const manifestPath = path.join(rootDir, 'src', 'data', 'l3Manifest.ts');

const MAP_W = 1000;
const MAP_H = 1000;
const MERCATOR_SCALE = MAP_W / (2 * Math.PI);
const projection = geoMercator().scale(MERCATOR_SCALE).translate([MAP_W / 2, MAP_H / 2]);
const pathGen = geoPath().projection(projection);

const US_STATE_MAP = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', PR: 'Puerto Rico', VI: 'Virgin Islands', GU: 'Guam'
};

const L3_TARGET_COUNTRIES = [
  { iso2: 'US', countryId: '840', name: 'United States', nameZh: '美國', unitNameZh: '郡 (County)' },
  { iso2: 'JP', countryId: '392', name: 'Japan', nameZh: '日本', unitNameZh: '市區町村 (Municipality)' },
  { iso2: 'FR', countryId: '250', name: 'France', nameZh: '法國', unitNameZh: '省 (Département)' },
  { iso2: 'DE', countryId: '276', name: 'Germany', nameZh: '德國', unitNameZh: '郡/非縣轄市 (Landkreis)' },
  { iso2: 'GB', countryId: '826', name: 'United Kingdom', nameZh: '英國', unitNameZh: '區/單一管理區 (District)' },
  { iso2: 'IT', countryId: '380', name: 'Italy', nameZh: '義大利', unitNameZh: '省/廣域市 (Provincia)' },
  { iso2: 'ES', countryId: '724', name: 'Spain', nameZh: '西班牙', unitNameZh: '省 (Provincia)' },
  { iso2: 'CA', countryId: '124', name: 'Canada', nameZh: '加拿大', unitNameZh: '普查區/郡 (Census Division)' },
  { iso2: 'AU', countryId: '036', name: 'Australia', nameZh: '澳洲', unitNameZh: '地方政府區 (LGA)' },
  { iso2: 'PL', countryId: '616', name: 'Poland', nameZh: '波蘭', unitNameZh: '縣 (Powiat)' },
  { iso2: 'KR', countryId: '410', name: 'South Korea', nameZh: '南韓', unitNameZh: '市/郡/區 (Si/Gun/Gu)' },
  { iso2: 'SE', countryId: '752', name: 'Sweden', nameZh: '瑞典', unitNameZh: '市鎮 (Kommun)' },
  { iso2: 'NO', countryId: '578', name: 'Norway', nameZh: '挪威', unitNameZh: '市鎮 (Kommune)' },
  { iso2: 'AR', countryId: '032', name: 'Argentina', nameZh: '阿根廷', unitNameZh: '省轄區 (Departamento)' },
  { iso2: 'NZ', countryId: '554', name: 'New Zealand', nameZh: '紐西蘭', unitNameZh: '地區主管機構 (District)' },
  { iso2: 'ZA', countryId: '710', name: 'South Africa', nameZh: '南非', unitNameZh: '區自治市 (District Municipality)' },
  { iso2: 'MX', countryId: '484', name: 'Mexico', nameZh: '墨西哥', unitNameZh: '市鎮 (Município)' },
  { iso2: 'BR', countryId: '076', name: 'Brazil', nameZh: '巴西', unitNameZh: '市鎮 (Município)' }
];

function normalizeFeatureWinding(feature) {
  try {
    const geom = feature.geometry;
    if (geom) {
      if (geom.type === 'Polygon') {
        if (geoArea(geom) > 2 * Math.PI) {
          geom.coordinates = geom.coordinates.map((ring) => ring.slice().reverse());
        }
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates = geom.coordinates.map((poly) => {
          if (geoArea({ type: 'Polygon', coordinates: poly }) > 2 * Math.PI) {
            return poly.map((ring) => ring.slice().reverse());
          }
          return poly;
        });
      }
    }
  } catch {
    // Ignore winding errors
  }
  return feature;
}

async function processJapan() {
  console.log('[JP] Processing Japan 1,906 Municipalities...');
  const jpSource = path.join(rootDir, 'public', 'data', 'japan-municipalities.fgb');
  const jpOutput = path.join(outputDir, 'JP.fgb');

  if (!fs.existsSync(jpSource)) {
    console.warn('[JP] japan-municipalities.fgb not found, skipping JP.');
    return null;
  }

  const buffer = fs.readFileSync(jpSource);
  const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
  const features = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for await (const f of it) {
    const p = f.properties || {};
    try {
      const bounds = pathGen.bounds(f);
      if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
        minX = Math.min(minX, bounds[0][0]);
        minY = Math.min(minY, bounds[0][1]);
        maxX = Math.max(maxX, bounds[1][0]);
        maxY = Math.max(maxY, bounds[1][1]);
      }
    } catch {
      // Skip
    }

    const city = String(p.city || '');
    const pref = String(p.pref || '');
    const prefId = Number(p.pref_id) || 0;
    const code = String(p.code || '');

    features.push({
      ...f,
      id: code || `${prefId}-${city}`,
      properties: {
        id: code || `${prefId}-${city}`,
        iso2: 'JP',
        name: city,
        name_en: city,
        name_zh: pref ? `${pref} ${city}` : city,
        type_en: 'Municipality',
        parent_name: pref,
        parent_code: String(prefId),
        code: code
      }
    });
  }

  const fgbBytes = flatgeobuf.geojson.serialize({
    type: 'FeatureCollection',
    features
  });
  fs.writeFileSync(jpOutput, Buffer.from(fgbBytes));
  console.log(`[JP] Saved ${features.length} municipalities to JP.fgb (${(fgbBytes.length / 1024).toFixed(1)} KB)`);

  return {
    iso2: 'JP',
    countryId: '392',
    name: 'Japan',
    nameZh: '日本',
    unitNameZh: '市區町村 (Municipality)',
    subdivisionCount: features.length,
    bbox: {
      minX: Math.round(minX),
      maxX: Math.round(maxX),
      minY: Math.round(minY),
      maxY: Math.round(maxY)
    }
  };
}

async function processCountry(meta) {
  const { iso2, countryId, name, nameZh, unitNameZh } = meta;
  if (iso2 === 'JP') return processJapan();

  const sourcePath = path.join(dataSourceDir, `${iso2}.geojson`);
  if (!fs.existsSync(sourcePath)) {
    console.warn(`[${iso2}] Source GeoJSON not found at ${sourcePath}, skipping.`);
    return null;
  }

  console.log(`[${iso2}] Parsing and converting ${name} (${unitNameZh})...`);
  const rawData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const rawFeats = rawData.features || [];
  if (rawFeats.length === 0) {
    console.warn(`[${iso2}] No features in ${sourcePath}`);
    return null;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const cleanedFeatures = rawFeats.map((f, idx) => {
    const normalized = normalizeFeatureWinding(f);
    const p = normalized.properties || {};

    try {
      const bounds = pathGen.bounds(normalized);
      if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
        minX = Math.min(minX, bounds[0][0]);
        minY = Math.min(minY, bounds[0][1]);
        maxX = Math.max(maxX, bounds[1][0]);
        maxY = Math.max(maxY, bounds[1][1]);
      }
    } catch {
      // Skip
    }

    let id = '';
    let fName = '';
    let nameEn = '';
    let nameZh = '';
    let typeEn = '';
    let parentName = '';
    let parentCode = '';
    let code = '';

    if (iso2 === 'US') {
      fName = String(p.NAME || '');
      nameEn = fName;
      const type = String(p.TYPE || 'County');
      typeEn = type;
      const reg = String(p.REGION || '');
      parentName = US_STATE_MAP[reg] || String(p.REGION_NAME || reg);
      parentCode = p.ISO_3166_2 || `US-${reg}`;
      code = String(p.FIPS || p.CODE_LOCAL || '');
      id = p.ADM2_CODE || code || `US-${reg}-${fName}`;
      nameZh = `${fName} ${type === 'Parish' ? '堂區' : (type === 'Borough' ? '自治市鎮' : '郡')}`;
    } else {
      // GADM Format
      fName = String(p.NAME_2 || p.VARNAME_2 || '');
      nameEn = fName;
      nameZh = String(p.NL_NAME_2 || fName);
      typeEn = String(p.ENGTYPE_2 || p.TYPE_2 || 'District');
      parentName = String(p.NAME_1 || '');
      parentCode = String(p.HASC_1 || p.GID_1 || p.NAME_1 || '');
      code = String(p.CC_2 || p.HASC_2 || '');
      id = String(p.GID_2 || p.HASC_2 || `${iso2}-${idx + 1}`);
    }

    normalized.id = id || `${iso2}-${idx + 1}`;
    normalized.properties = {
      id: normalized.id,
      iso2: iso2,
      name: fName,
      name_en: nameEn,
      name_zh: nameZh,
      type_en: typeEn,
      parent_name: parentName,
      parent_code: parentCode,
      code: code
    };

    return normalized;
  });

  if (minX > maxX || !isFinite(minX)) {
    minX = 0; maxX = MAP_W; minY = 0; maxY = MAP_H;
  }

  const outputPath = path.join(outputDir, `${iso2}.fgb`);
  const fgbBytes = flatgeobuf.geojson.serialize({
    type: 'FeatureCollection',
    features: cleanedFeatures
  });
  fs.writeFileSync(outputPath, Buffer.from(fgbBytes));
  console.log(`[${iso2}] Saved ${cleanedFeatures.length} L3 units to ${iso2}.fgb (${(fgbBytes.length / 1024).toFixed(1)} KB)`);

  return {
    iso2,
    countryId,
    name,
    nameZh,
    unitNameZh,
    subdivisionCount: cleanedFeatures.length,
    bbox: {
      minX: Math.round(minX),
      maxX: Math.round(maxX),
      minY: Math.round(minY),
      maxY: Math.round(maxY)
    }
  };
}

async function main() {
  console.log('=== Worldwide L3 Admin-2 Generator ===');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const manifestEntries = [];

  for (const target of L3_TARGET_COUNTRIES) {
    const entry = await processCountry(target);
    if (entry) {
      manifestEntries.push(entry);
    }
  }

  console.log(`Generating L3 manifest with ${manifestEntries.length} major countries...`);
  const manifestTs = `// Auto-generated worldwide L3 Admin-2 country manifest
export interface L3CountryMeta {
  iso2: string;
  countryId: string;
  name: string;
  nameZh: string;
  unitNameZh: string;
  subdivisionCount: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export const L3_MANIFEST: L3CountryMeta[] = ${JSON.stringify(manifestEntries, null, 2)};
`;

  fs.writeFileSync(manifestPath, manifestTs, 'utf8');
  console.log(`Saved L3 manifest to ${manifestPath}`);
  console.log('=== Worldwide L3 Generation Complete ===');
}

main().catch((err) => {
  console.error('L3 Generation error:', err);
  process.exit(1);
});
