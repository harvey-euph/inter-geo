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

function norm(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_~]+/g, '');
}

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

const PL_VOIVODESHIP_MAP = {
  'dolnośląskie': 'Lower Silesian',
  'kujawsko-pomorskie': 'Kuyavian-Pomeranian',
  'lubelskie': 'Lublin',
  'lubuskie': 'Lubusz',
  'łódzkie': 'Łódź',
  'małopolskie': 'Lesser Poland',
  'mazowieckie': 'Masovian',
  'opolskie': 'Opole',
  'podkarpackie': 'Subcarpathian',
  'podlaskie': 'Podlachian',
  'pomorskie': 'Pomeranian',
  'śląskie': 'Silesian',
  'świętokrzyskie': 'Świętokrzyskie',
  'warmińsko-mazurskie': 'Warmian-Masurian',
  'wielkopolskie': 'Greater Poland',
  'zachodniopomorskie': 'West Pomeranian'
};

const CA_PROVINCE_MAP = {
  'britishcolumbia': 'British Columbia',
  'newbrunswick': 'New Brunswick',
  'newfoundlandandlabrador': 'Newfoundland and Labrador',
  'northwestterritories': 'Northwest Territories',
  'novascotia': 'Nova Scotia',
  'princeedwardisland': 'Prince Edward Island'
};

const AU_STATE_MAP = {
  'newsouthwales': 'New South Wales',
  'westernaustralia': 'Western Australia',
  'southaustralia': 'South Australia',
  'northernterritory': 'Northern Territory',
  'australiancapitalterritory': 'Australian Capital Territory',
  'ashmoreandcartierislands': 'Ashmore and Cartier Islands'
};

const NO_MAP = {
  'astfold': 'NO-01',
  'ostfold': 'NO-01'
};

const L3_TARGET_COUNTRIES = [
  { iso2: 'US', countryId: '840', name: 'United States', nameZh: '美國', unitNameZh: '郡 (County)' },
  { iso2: 'JP', countryId: '392', name: 'Japan', nameZh: '日本', unitNameZh: '市區町村 (Municipality)' },
  { iso2: 'DE', countryId: '276', name: 'Germany', nameZh: '德國', unitNameZh: '郡/非縣轄市 (Landkreis)' },
  { iso2: 'CA', countryId: '124', name: 'Canada', nameZh: '加拿大', unitNameZh: '普查區/郡 (Census Division)' },
  { iso2: 'AU', countryId: '036', name: 'Australia', nameZh: '澳洲', unitNameZh: '地方政府區 (LGA)' },
  { iso2: 'PL', countryId: '616', name: 'Poland', nameZh: '波蘭', unitNameZh: '縣 (Powiat)' },
  { iso2: 'MX', countryId: '484', name: 'Mexico', nameZh: '墨西哥', unitNameZh: '市鎮 (Município)' },
  { iso2: 'BR', countryId: '076', name: 'Brazil', nameZh: '巴西', unitNameZh: '市鎮 (Município)' },
  { iso2: 'AR', countryId: '032', name: 'Argentina', nameZh: '阿根廷', unitNameZh: '省轄區 (Departamento)' },
  { iso2: 'SE', countryId: '752', name: 'Sweden', nameZh: '瑞典', unitNameZh: '市鎮 (Kommun)' },
  { iso2: 'NO', countryId: '578', name: 'Norway', nameZh: '挪威', unitNameZh: '市鎮 (Kommune)' }
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
  console.log('[JP] Processing Japan 1,906 Municipalities into L2 Prefecture Packs...');
  const jpSource = path.join(rootDir, 'public', 'data', 'japan-municipalities.fgb');
  const jpDir = path.join(outputDir, 'JP');

  if (!fs.existsSync(jpSource)) {
    console.warn('[JP] japan-municipalities.fgb not found, skipping JP.');
    return null;
  }

  if (!fs.existsSync(jpDir)) {
    fs.mkdirSync(jpDir, { recursive: true });
  }

  const buffer = fs.readFileSync(jpSource);
  const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
  const groups = new Map();

  for await (const f of it) {
    const p = f.properties || {};
    const prefId = Number(p.pref_id) || 0;
    const prefKey = String(prefId);
    if (!groups.has(prefKey)) {
      groups.set(prefKey, {
        prefId,
        prefName: String(p.pref || ''),
        features: []
      });
    }

    const city = String(p.city || '');
    const pref = String(p.pref || '');
    const code = String(p.code || '');
    const gun = String(p.gun || '');

    const normalized = {
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
        parent_code: prefKey,
        code: code,
        pref_id: prefId,
        city: city,
        pref: pref,
        gun: gun
      }
    };
    groups.get(prefKey).features.push(normalized);
  }

  const partitions = [];
  let countryMinX = Infinity, countryMinY = Infinity, countryMaxX = -Infinity, countryMaxY = -Infinity;
  let totalCount = 0;

  for (const [prefKey, group] of groups.entries()) {
    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
    for (const f of group.features) {
      try {
        const bounds = pathGen.bounds(f);
        if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          pMinX = Math.min(pMinX, bounds[0][0]);
          pMinY = Math.min(pMinY, bounds[0][1]);
          pMaxX = Math.max(pMaxX, bounds[1][0]);
          pMaxY = Math.max(pMaxY, bounds[1][1]);
        }
      } catch {
        // Skip
      }
    }

    if (!isFinite(pMinX)) {
      pMinX = 840; pMaxX = 930; pMinY = 350; pMaxY = 440;
    }

    countryMinX = Math.min(countryMinX, pMinX);
    countryMinY = Math.min(countryMinY, pMinY);
    countryMaxX = Math.max(countryMaxX, pMaxX);
    countryMaxY = Math.max(countryMaxY, pMaxY);
    totalCount += group.features.length;

    const outFile = path.join(jpDir, `${prefKey}.fgb`);
    const fgbBytes = flatgeobuf.geojson.serialize({
      type: 'FeatureCollection',
      features: group.features
    });
    fs.writeFileSync(outFile, Buffer.from(fgbBytes));

    partitions.push({
      key: prefKey,
      iso2: 'JP',
      parentName: group.prefName,
      parentCode: prefKey,
      file: `/data/l3/JP/${prefKey}.fgb`,
      subdivisionCount: group.features.length,
      bbox: {
        minX: Math.round(pMinX),
        maxX: Math.round(pMaxX),
        minY: Math.round(pMinY),
        maxY: Math.round(pMaxY)
      }
    });
  }

  console.log(`[JP] Generated ${partitions.length} prefecture packs (${totalCount} total municipalities)`);

  return {
    iso2: 'JP',
    countryId: '392',
    name: 'Japan',
    nameZh: '日本',
    unitNameZh: '市區町村 (Municipality)',
    subdivisionCount: totalCount,
    bbox: {
      minX: Math.round(countryMinX),
      maxX: Math.round(countryMaxX),
      minY: Math.round(countryMinY),
      maxY: Math.round(countryMaxY)
    },
    partitions
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

  const countryDir = path.join(outputDir, iso2);
  if (!fs.existsSync(countryDir)) {
    fs.mkdirSync(countryDir, { recursive: true });
  }

  // Load L2 subdivisions for parent matching
  const l2Path = path.join(rootDir, 'public', 'data', 'l2', `${iso2}.fgb`);
  const l2ByNormCode = new Map();
  const l2ByNormName = new Map();
  const l2DetailsByCode = new Map();

  if (fs.existsSync(l2Path)) {
    const l2Buf = fs.readFileSync(l2Path);
    const l2It = flatgeobuf.geojson.deserialize(new Uint8Array(l2Buf));
    for await (const f of l2It) {
      const p = f.properties || {};
      const code = String(p.code || '');
      l2DetailsByCode.set(code, p);
      if (code) l2ByNormCode.set(norm(code), p);
      if (p.name) l2ByNormName.set(norm(p.name), p);
      if (p.name_en) l2ByNormName.set(norm(p.name_en), p);
    }
  }

  console.log(`[${iso2}] Partitioning ${name} (${unitNameZh}) into L2 packs...`);
  const rawData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const rawFeats = rawData.features || [];
  if (rawFeats.length === 0) {
    console.warn(`[${iso2}] No features in ${sourcePath}`);
    return null;
  }

  const groups = new Map();

  for (let idx = 0; idx < rawFeats.length; idx++) {
    const f = rawFeats[idx];
    const normalized = normalizeFeatureWinding(f);
    const p = normalized.properties || {};

    let targetCode = '';
    let targetParentName = '';
    let fName = '';
    let nameEn = '';
    let nameZh = '';
    let typeEn = '';
    let code = '';
    let id = '';

    if (iso2 === 'US') {
      const reg = String(p.REGION || '');
      targetCode = reg ? `US-${reg}` : (p.ISO_3166_2 || 'US-OTHER');
      targetParentName = US_STATE_MAP[reg] || String(p.REGION_NAME || reg);
      fName = String(p.NAME || '');
      nameEn = fName;
      const type = String(p.TYPE || 'County');
      typeEn = type;
      code = String(p.FIPS || p.CODE_LOCAL || '');
      id = p.ADM2_CODE || code || `${targetCode}-${fName}`;
      nameZh = `${fName} ${type === 'Parish' ? '堂區' : (type === 'Borough' ? '自治市鎮' : '郡')}`;
    } else {
      fName = String(p.NAME_2 || p.VARNAME_2 || '');
      nameEn = fName;
      nameZh = String(p.NL_NAME_2 || fName);
      typeEn = String(p.ENGTYPE_2 || p.TYPE_2 || 'District');
      code = String(p.CC_2 || p.HASC_2 || '');
      id = String(p.GID_2 || p.HASC_2 || `${iso2}-${idx + 1}`);

      let rawParent = String(p.NAME_1 || '');
      let mappedParent = rawParent;
      if (iso2 === 'PL') {
        mappedParent = PL_VOIVODESHIP_MAP[rawParent.toLowerCase()] || rawParent;
      } else if (iso2 === 'CA') {
        mappedParent = CA_PROVINCE_MAP[norm(rawParent)] || rawParent;
      } else if (iso2 === 'AU') {
        mappedParent = AU_STATE_MAP[norm(rawParent)] || rawParent;
        if (norm(rawParent) === 'coralseaislandsterritory') {
          targetCode = 'AU-QLD';
        }
      } else if (iso2 === 'NO' && NO_MAP[norm(rawParent)]) {
        targetCode = NO_MAP[norm(rawParent)];
      }

      targetParentName = mappedParent;
      if (!targetCode) {
        const matched =
          l2ByNormName.get(norm(mappedParent)) ||
          l2ByNormName.get(norm(rawParent)) ||
          l2ByNormCode.get(norm(p.HASC_1 || ''));
        if (matched) {
          targetCode = matched.code;
          if (matched.name) targetParentName = matched.name;
        } else {
          targetCode = `${iso2}-${norm(rawParent).toUpperCase().slice(0, 5)}`;
        }
      }
    }

    normalized.id = id || `${iso2}-${idx + 1}`;
    normalized.properties = {
      id: normalized.id,
      iso2: iso2,
      name: fName,
      name_en: nameEn,
      name_zh: nameZh,
      type_en: typeEn,
      parent_name: targetParentName,
      parent_code: targetCode,
      code: code
    };

    if (!groups.has(targetCode)) {
      groups.set(targetCode, {
        targetCode,
        parentName: targetParentName,
        features: []
      });
    }
    groups.get(targetCode).features.push(normalized);
  }

  const partitions = [];
  let countryMinX = Infinity, countryMinY = Infinity, countryMaxX = -Infinity, countryMaxY = -Infinity;
  let totalCount = 0;

  for (const [targetCode, group] of groups.entries()) {
    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
    for (const f of group.features) {
      try {
        const bounds = pathGen.bounds(f);
        if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          pMinX = Math.min(pMinX, bounds[0][0]);
          pMinY = Math.min(pMinY, bounds[0][1]);
          pMaxX = Math.max(pMaxX, bounds[1][0]);
          pMaxY = Math.max(pMaxY, bounds[1][1]);
        }
      } catch {
        // Skip
      }
    }

    if (!isFinite(pMinX)) {
      pMinX = 0; pMaxX = MAP_W; pMinY = 0; pMaxY = MAP_H;
    }

    countryMinX = Math.min(countryMinX, pMinX);
    countryMinY = Math.min(countryMinY, pMinY);
    countryMaxX = Math.max(countryMaxX, pMaxX);
    countryMaxY = Math.max(countryMaxY, pMaxY);
    totalCount += group.features.length;

    // Sanitize targetCode for safe filename
    const safeFilename = targetCode.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const outFile = path.join(countryDir, `${safeFilename}.fgb`);
    const fgbBytes = flatgeobuf.geojson.serialize({
      type: 'FeatureCollection',
      features: group.features
    });
    fs.writeFileSync(outFile, Buffer.from(fgbBytes));

    partitions.push({
      key: targetCode,
      iso2: iso2,
      parentName: group.parentName,
      parentCode: targetCode,
      file: `/data/l3/${iso2}/${safeFilename}.fgb`,
      subdivisionCount: group.features.length,
      bbox: {
        minX: Math.round(pMinX),
        maxX: Math.round(pMaxX),
        minY: Math.round(pMinY),
        maxY: Math.round(pMaxY)
      }
    });
  }

  console.log(`[${iso2}] Generated ${partitions.length} packs (${totalCount} units) in /data/l3/${iso2}/`);

  return {
    iso2,
    countryId,
    name,
    nameZh,
    unitNameZh,
    subdivisionCount: totalCount,
    bbox: {
      minX: Math.round(countryMinX),
      maxX: Math.round(countryMaxX),
      minY: Math.round(countryMinY),
      maxY: Math.round(countryMaxY)
    },
    partitions
  };
}

async function main() {
  console.log('=== Slicing Worldwide L3 Data into L2 Region Packs ===');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const manifestEntries = [];
  const partitionsByCountry = {};
  const partitionByKey = {};

  for (const target of L3_TARGET_COUNTRIES) {
    const entry = await processCountry(target);
    if (entry) {
      manifestEntries.push(entry);
      partitionsByCountry[entry.iso2] = entry.partitions;
      for (const p of entry.partitions) {
        // Index by both iso2:key and iso2:normKey
        partitionByKey[`${entry.iso2}:${p.key}`] = p;
        partitionByKey[`${entry.iso2}:${norm(p.key)}`] = p;
        if (p.parentName) {
          partitionByKey[`${entry.iso2}:${norm(p.parentName)}`] = p;
        }
      }
    }
  }

  console.log(`Building compact L3 manifest across ${manifestEntries.length} countries...`);
  const manifestTs = `// Auto-generated worldwide L3 Admin-2 regional partition manifest
export interface L3PartitionMeta {
  key: string;
  iso2: string;
  parentName: string;
  parentCode: string;
  file: string;
  subdivisionCount: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

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
  partitions: L3PartitionMeta[];
}

export const L3_MANIFEST: L3CountryMeta[] = ${JSON.stringify(manifestEntries, null, 2)};

export const L3_PARTITIONS_BY_COUNTRY: Record<string, L3PartitionMeta[]> = {};
export const L3_PARTITIONS_BY_KEY: Record<string, L3PartitionMeta> = {};

function normKey(str: string): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[\\s\\-_~]+/g, '');
}

for (const c of L3_MANIFEST) {
  L3_PARTITIONS_BY_COUNTRY[c.iso2] = c.partitions;
  for (const p of c.partitions) {
    L3_PARTITIONS_BY_KEY[\`\${c.iso2}:\${p.key}\`] = p;
    L3_PARTITIONS_BY_KEY[\`\${c.iso2}:\${normKey(p.key)}\`] = p;
    if (p.parentName) {
      L3_PARTITIONS_BY_KEY[\`\${c.iso2}:\${normKey(p.parentName)}\`] = p;
    }
    if (p.parentCode) {
      L3_PARTITIONS_BY_KEY[\`\${c.iso2}:\${normKey(p.parentCode)}\`] = p;
    }
  }
}
`;

  fs.writeFileSync(manifestPath, manifestTs, 'utf8');
  console.log(`Saved L3 partitioned manifest to ${manifestPath}`);

  // Clean up old monolithic files if they exist
  for (const target of L3_TARGET_COUNTRIES) {
    const oldFile = path.join(outputDir, `${target.iso2}.fgb`);
    if (fs.existsSync(oldFile)) {
      try {
        fs.unlinkSync(oldFile);
        console.log(`Removed obsolete monolithic file: ${target.iso2}.fgb`);
      } catch {
        // ignore
      }
    }
  }

  console.log('=== All L3 Regional Packs Successfully Generated ===');
}

main().catch((err) => {
  console.error('L3 Generation error:', err);
  process.exit(1);
});
