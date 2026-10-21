import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { geoMercator, geoPath, geoArea } from 'd3-geo';
import * as flatgeobuf from 'flatgeobuf';
import * as topojsonServer from 'topojson-server';
import * as topojsonClient from 'topojson-client';

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
  { iso2: 'NO', countryId: '578', name: 'Norway', nameZh: '挪威', unitNameZh: '市鎮 (Kommune)' },
  { iso2: 'FR', countryId: '250', name: 'France', nameZh: '法國', unitNameZh: '省 (Département)' },
  { iso2: 'IT', countryId: '380', name: 'Italy', nameZh: '義大利', unitNameZh: '省/廣域市 (Provincia)' },
  { iso2: 'ES', countryId: '724', name: 'Spain', nameZh: '西班牙', unitNameZh: '省/自治市 (Provincia)' },
  { iso2: 'GB', countryId: '826', name: 'United Kingdom', nameZh: '英國', unitNameZh: '郡/地方行政區 (County / District)' }
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
    const prefId = group.prefId;
    const prefName = group.prefName;

    // Dissolve designated cities administrative wards if any
    const cityWardsMap = new Map();
    const otherFeatures = [];

    for (const f of group.features) {
      const gun = f.properties?.gun || '';
      if (gun.endsWith('市')) {
        if (!cityWardsMap.has(gun)) {
          cityWardsMap.set(gun, []);
        }
        cityWardsMap.get(gun).push(f);
      } else {
        otherFeatures.push(f);
      }
    }

    let finalFeatures = [];
    if (cityWardsMap.size > 0) {
      const mergedCities = [];
      for (const [cityName, wards] of cityWardsMap.entries()) {
        const firstWard = wards[0];
        const p = firstWard.properties;
        const sampleCode = String(p.code || '');
        const cityCode = sampleCode.length >= 4 ? sampleCode.slice(0, 4) + '0' : sampleCode;

        const topology = topojsonServer.topology({ wards: { type: 'FeatureCollection', features: wards } }, 1e5);
        const mergedGeom = topojsonClient.merge(topology, topology.objects.wards.geometries);

        let mergedFeature = {
          type: 'Feature',
          id: cityCode,
          properties: {
            id: cityCode,
            iso2: 'JP',
            name: cityName,
            name_en: cityName,
            name_zh: `${prefName} ${cityName}`,
            type_en: 'Municipality',
            parent_name: prefName,
            parent_code: prefKey,
            code: cityCode,
            pref_id: prefId,
            city: cityName,
            pref: prefName,
            gun: ''
          },
          geometry: mergedGeom
        };

        mergedFeature = normalizeFeatureWinding(mergedFeature);
        mergedCities.push(mergedFeature);
      }
      finalFeatures = [...otherFeatures, ...mergedCities];
    } else {
      finalFeatures = group.features;
    }

    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
    for (const f of finalFeatures) {
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
    totalCount += finalFeatures.length;

    const outFile = path.join(jpDir, `${prefKey}.fgb`);
    const fgbBytes = flatgeobuf.geojson.serialize({
      type: 'FeatureCollection',
      features: finalFeatures
    });
    fs.writeFileSync(outFile, Buffer.from(fgbBytes));

    partitions.push({
      key: prefKey,
      iso2: 'JP',
      parentName: group.prefName,
      parentCode: prefKey,
      file: `/data/l3/JP/${prefKey}.fgb`,
      subdivisionCount: finalFeatures.length,
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

const FR_REGIONS_META = {
  'Auvergne-Rhône-Alpes': { nameZh: '奧弗涅-隆-阿爾卑斯大區', nameEn: 'Auvergne-Rhône-Alpes', code: 'FR-ARA', postal: 'ARA' },
  'Bourgogne-Franche-Comté': { nameZh: '勃艮第-法蘭琪-康堤大區', nameEn: 'Bourgogne-Franche-Comté', code: 'FR-BFC', postal: 'BFC' },
  'Bretagne': { nameZh: '布列塔尼大區', nameEn: 'Brittany', code: 'FR-BRE', postal: 'BRE' },
  'Centre-Val de Loire': { nameZh: '中央-羅亞爾河谷大區', nameEn: 'Centre-Val de Loire', code: 'FR-CVL', postal: 'CVL' },
  'Corse': { nameZh: '科西嘉大區', nameEn: 'Corsica', code: 'FR-COR', postal: 'COR' },
  'Grand Est': { nameZh: '大東部大區', nameEn: 'Grand Est', code: 'FR-GES', postal: 'GES' },
  'Hauts-de-France': { nameZh: '上法蘭西大區', nameEn: 'Hauts-de-France', code: 'FR-HDF', postal: 'HDF' },
  'Île-de-France': { nameZh: '法蘭西島大區', nameEn: 'Île-de-France', code: 'FR-IDF', postal: 'IDF' },
  'Normandie': { nameZh: '諾曼第大區', nameEn: 'Normandy', code: 'FR-NOR', postal: 'NOR' },
  'Nouvelle-Aquitaine': { nameZh: '新阿基坦大區', nameEn: 'Nouvelle-Aquitaine', code: 'FR-NAQ', postal: 'NAQ' },
  'Occitanie': { nameZh: '奧克西塔尼大區', nameEn: 'Occitania', code: 'FR-OCC', postal: 'OCC' },
  'Pays de la Loire': { nameZh: '羅亞爾河地區大區', nameEn: 'Pays de la Loire', code: 'FR-PDL', postal: 'PDL' },
  "Provence-Alpes-Côte-d'Azur": { nameZh: '普羅旺斯-阿爾卑斯-蔚藍海岸大區', nameEn: "Provence-Alpes-Côte d'Azur", code: 'FR-PAC', postal: 'PAC' },
  'Guadeloupe': { nameZh: '瓜地洛普大區', nameEn: 'Guadeloupe', code: 'FR-GUA', postal: 'GUA' },
  'Guyane française': { nameZh: '法屬圭亞那大區', nameEn: 'French Guiana', code: 'FR-GUF', postal: 'GUF' },
  'La Réunion': { nameZh: '留尼旺大區', nameEn: 'Réunion', code: 'FR-LRE', postal: 'LRE' },
  'Réunion': { nameZh: '留尼旺大區', nameEn: 'Réunion', code: 'FR-LRE', postal: 'LRE' },
  'Martinique': { nameZh: '馬丁尼克大區', nameEn: 'Martinique', code: 'FR-MTQ', postal: 'MTQ' },
  'Mayotte': { nameZh: '馬約特大區', nameEn: 'Mayotte', code: 'FR-MAY', postal: 'MAY' }
};

const FR_DEPT_ZH_POLISH = {
  '诺尔省': '諾爾省',
  '默兹省': '默茲省',
  '默尔特-摩泽尔省': '默爾特-摩澤爾省',
  '萨瓦省': '薩瓦省',
  '上萨瓦省': '上薩瓦省',
  '上莱茵省': '上萊茵省',
  '贝尔福地区': '貝爾福地區省',
  '瓦尔省': '瓦爾省',
  '大西洋盧瓦爾省': '大西洋羅亞爾省',
  '莫尔比昂省': '莫爾比昂省',
  '滨海塞纳省': '濱海塞納省',
  '加萊海峽': '加萊海峽省',
  '马约特': '馬約特',
  '上维埃纳省': '上維埃納省',
  '塔恩-加龙省': '塔恩-加龍省',
  '萨尔特省': '薩爾特省',
  '罗讷省': '隆省',
  '奧佈省': '奧布省',
  '上塞纳省': '上塞納省',
  '塞纳-圣但尼省': '塞納-聖但尼省',
  '瓦勒德瓦茲': '瓦勒德瓦茲省',
  '伊夫林': '伊夫林省',
  '约讷省': '約訥省',
  '马恩河谷省': '馬恩河谷省',
  '瓜德羅普': '瓜地洛普',
  '法属圭亚那': '法屬圭亞那'
};

async function processFrance() {
  console.log('[FR] Processing France 101 Départements into L2 Région Packs...');
  const sourcePath = path.join(rootDir, 'data-source', 'ne_10m_admin_1_states_provinces.geojson');
  const frDir = path.join(outputDir, 'FR');
  if (!fs.existsSync(frDir)) {
    fs.mkdirSync(frDir, { recursive: true });
  }

  const rawData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const frDepts = rawData.features.filter(
    (f) => (f.properties.iso_a2 || f.properties.iso_3166_2?.split('-')[0]) === 'FR'
  );

  const deptsByRegionCode = new Map();
  for (const f of frDepts) {
    const p = f.properties;
    const rawReg = p.region.trim();
    const meta = FR_REGIONS_META[rawReg] || {
      nameZh: rawReg,
      nameEn: rawReg,
      code: p.region_cod?.trim() || 'FR-OTHER'
    };
    const regCode = meta.code;

    if (!deptsByRegionCode.has(regCode)) {
      deptsByRegionCode.set(regCode, {
        regionMeta: meta,
        departments: []
      });
    }

    const depNum = p.iso_3166_2?.replace('FR-', '') || p.postal || '';
    let rawZh = p.name_zht || p.name_zh || p.name;
    const nameZh = FR_DEPT_ZH_POLISH[rawZh] || rawZh;

    const normalized = normalizeFeatureWinding(f);
    normalized.id = p.iso_3166_2 || `FR-${depNum}`;
    normalized.properties = {
      id: p.iso_3166_2 || `FR-${depNum}`,
      iso2: 'FR',
      name: p.name,
      name_en: p.name_en || p.name,
      name_zh: nameZh,
      type_en: 'Department',
      parent_name: meta.nameZh,
      parent_code: regCode,
      code: depNum
    };

    deptsByRegionCode.get(regCode).departments.push(normalized);
  }

  const partitions = [];
  let countryMinX = Infinity, countryMinY = Infinity, countryMaxX = -Infinity, countryMaxY = -Infinity;
  let totalCount = 0;

  for (const [regCode, group] of deptsByRegionCode.entries()) {
    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
    for (const f of group.departments) {
      try {
        const bounds = pathGen.bounds(f);
        if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          pMinX = Math.min(pMinX, bounds[0][0]);
          pMinY = Math.min(pMinY, bounds[0][1]);
          pMaxX = Math.max(pMaxX, bounds[1][0]);
          pMaxY = Math.max(pMaxY, bounds[1][1]);
        }
      } catch {}
    }

    countryMinX = Math.min(countryMinX, pMinX);
    countryMinY = Math.min(countryMinY, pMinY);
    countryMaxX = Math.max(countryMaxX, pMaxX);
    countryMaxY = Math.max(countryMaxY, pMaxY);

    const partitionBytes = flatgeobuf.geojson.serialize({
      type: 'FeatureCollection',
      features: group.departments
    });

    const fileName = `${regCode}.fgb`;
    const filePath = path.join(frDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(partitionBytes));

    partitions.push({
      key: regCode,
      iso2: 'FR',
      parentName: group.regionMeta.nameZh,
      parentCode: regCode,
      file: `/data/l3/FR/${fileName}`,
      subdivisionCount: group.departments.length,
      bbox: {
        minX: Math.max(0, Math.round(pMinX) - 5),
        maxX: Math.min(MAP_W, Math.round(pMaxX) + 5),
        minY: Math.max(0, Math.round(pMinY) - 5),
        maxY: Math.min(MAP_H, Math.round(pMaxY) + 5)
      }
    });

    totalCount += group.departments.length;
  }

  partitions.sort((a, b) => a.key.localeCompare(b.key));
  console.log(`[FR] Generated ${partitions.length} Région packs (${totalCount} total departments)`);

  return {
    iso2: 'FR',
    countryId: '250',
    name: 'France',
    nameZh: '法國',
    unitNameZh: '省 (Département)',
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

const IT_REGIONS_META = {
  'Abruzzo': { nameZh: '阿布魯佐大區', nameEn: 'Abruzzo', code: 'IT-65', postal: '65' },
  'Basilicata': { nameZh: '巴斯利卡塔大區', nameEn: 'Basilicata', code: 'IT-77', postal: '77' },
  'Calabria': { nameZh: '卡拉布里亞大區', nameEn: 'Calabria', code: 'IT-78', postal: '78' },
  'Campania': { nameZh: '坎帕尼亞大區', nameEn: 'Campania', code: 'IT-72', postal: '72' },
  'Emilia-Romagna': { nameZh: '艾米利亞-羅馬涅大區', nameEn: 'Emilia-Romagna', code: 'IT-45', postal: '45' },
  'Friuli-Venezia Giulia': { nameZh: '佛里烏利-威尼斯朱利亞大區', nameEn: 'Friuli-Venezia Giulia', code: 'IT-36', postal: '36' },
  'Lazio': { nameZh: '拉齊奧大區', nameEn: 'Lazio', code: 'IT-62', postal: '62' },
  'Liguria': { nameZh: '利古里亞大區', nameEn: 'Liguria', code: 'IT-42', postal: '42' },
  'Lombardia': { nameZh: '倫巴底大區', nameEn: 'Lombardy', code: 'IT-25', postal: '25' },
  'Marche': { nameZh: '馬爾凱大區', nameEn: 'Marche', code: 'IT-57', postal: '57' },
  'Molise': { nameZh: '莫利塞大區', nameEn: 'Molise', code: 'IT-67', postal: '67' },
  'Piemonte': { nameZh: '皮埃蒙特大區', nameEn: 'Piedmont', code: 'IT-21', postal: '21' },
  'Puglia': { nameZh: '普利亞大區', nameEn: 'Apulia', code: 'IT-75', postal: '75' },
  'Apulia': { nameZh: '普利亞大區', nameEn: 'Apulia', code: 'IT-75', postal: '75' },
  'Sardegna': { nameZh: '薩丁尼亞大區', nameEn: 'Sardinia', code: 'IT-88', postal: '88' },
  'Sicily': { nameZh: '西西里大區', nameEn: 'Sicily', code: 'IT-82', postal: '82' },
  'Sicilia': { nameZh: '西西里大區', nameEn: 'Sicily', code: 'IT-82', postal: '82' },
  'Toscana': { nameZh: '托斯卡尼大區', nameEn: 'Tuscany', code: 'IT-52', postal: '52' },
  'Trentino-Alto Adige': { nameZh: '特倫提諾-上阿迪傑大區', nameEn: 'Trentino-Alto Adige', code: 'IT-32', postal: '32' },
  'Umbria': { nameZh: '翁布里亞大區', nameEn: 'Umbria', code: 'IT-55', postal: '55' },
  "Valle d'Aosta": { nameZh: '瓦萊達奧斯塔大區', nameEn: 'Aosta Valley', code: 'IT-23', postal: '23' },
  'Veneto': { nameZh: '威尼托大區', nameEn: 'Veneto', code: 'IT-34', postal: '34' }
};

const IT_METROPOLITAN_CITIES = new Set([
  'RM', 'MI', 'NA', 'TO', 'PA', 'BA', 'CT', 'BO', 'FI', 'VE', 'GE', 'ME', 'RC', 'CA'
]);

const IT_PROV_ZH_OVERRIDES = {
  'Bozen': '博爾扎諾自治省 (南蒂羅爾)',
  'Trento': '特倫托自治省',
  'Genova': '熱那亞廣域市',
  'Milano': '米蘭廣域市',
  'Roma': '羅馬首都廣域市',
  'Turin': '都靈廣域市',
  'Napoli': '那不勒斯廣域市',
  'Firenze': '佛羅倫斯廣域市',
  'Venezia': '威尼斯廣域市',
  'Bologna': '博洛尼亞廣域市',
  'Bari': '巴里廣域市',
  'Catania': '卡塔尼亞廣域市',
  'Palermo': '巴勒莫廣域市',
  'Messina': '墨西拿廣域市',
  'Reggio di Calabria': '雷焦卡拉布里亞廣域市',
  'Cagliari': '卡利亞里廣域市'
};

async function processItaly() {
  console.log('[IT] Processing Italy 110 Province & Città metropolitane into L2 Regione Packs...');
  const sourcePath = path.join(rootDir, 'data-source', 'ne_10m_admin_1_states_provinces.geojson');
  const itDir = path.join(outputDir, 'IT');
  if (!fs.existsSync(itDir)) {
    fs.mkdirSync(itDir, { recursive: true });
  }

  const rawData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const itProvs = rawData.features.filter(
    (f) => (f.properties.iso_a2 || f.properties.iso_3166_2?.split('-')[0]) === 'IT'
  );

  const provsByRegionCode = new Map();
  for (const f of itProvs) {
    const p = f.properties;
    const rawReg = p.region.trim();
    const meta = IT_REGIONS_META[rawReg] || {
      nameZh: rawReg,
      nameEn: rawReg,
      code: p.region_cod?.trim() || 'IT-OTHER'
    };
    const regCode = meta.code;

    if (!provsByRegionCode.has(regCode)) {
      provsByRegionCode.set(regCode, {
        regionMeta: meta,
        provinces: []
      });
    }

    const postal = String(p.postal || p.code_hasc?.replace('IT.', '') || '').toUpperCase();
    const isMetroCity = IT_METROPOLITAN_CITIES.has(postal);
    const typeEn = isMetroCity
      ? 'Metropolitan City'
      : (p.name === 'Bozen' || p.name === 'Trento' ? 'Autonomous Province' : 'Province');

    const nameZh = IT_PROV_ZH_OVERRIDES[p.name] || p.name_zht || p.name_zh || p.name;

    const normalized = normalizeFeatureWinding(f);
    normalized.id = p.iso_3166_2 || `IT-${postal}`;
    normalized.properties = {
      id: p.iso_3166_2 || `IT-${postal}`,
      iso2: 'IT',
      name: p.name,
      name_en: p.name_en || p.name,
      name_zh: nameZh,
      type_en: typeEn,
      parent_name: meta.nameZh,
      parent_code: regCode,
      code: postal
    };

    provsByRegionCode.get(regCode).provinces.push(normalized);
  }

  const partitions = [];
  let countryMinX = Infinity, countryMinY = Infinity, countryMaxX = -Infinity, countryMaxY = -Infinity;
  let totalCount = 0;

  for (const [regCode, group] of provsByRegionCode.entries()) {
    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
    for (const f of group.provinces) {
      try {
        const bounds = pathGen.bounds(f);
        if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          pMinX = Math.min(pMinX, bounds[0][0]);
          pMinY = Math.min(pMinY, bounds[0][1]);
          pMaxX = Math.max(pMaxX, bounds[1][0]);
          pMaxY = Math.max(pMaxY, bounds[1][1]);
        }
      } catch {}
    }

    countryMinX = Math.min(countryMinX, pMinX);
    countryMinY = Math.min(countryMinY, pMinY);
    countryMaxX = Math.max(countryMaxX, pMaxX);
    countryMaxY = Math.max(countryMaxY, pMaxY);

    const partitionBytes = flatgeobuf.geojson.serialize({
      type: 'FeatureCollection',
      features: group.provinces
    });

    const fileName = `${regCode}.fgb`;
    const filePath = path.join(itDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(partitionBytes));

    partitions.push({
      key: regCode,
      iso2: 'IT',
      parentName: group.regionMeta.nameZh,
      parentCode: regCode,
      file: `/data/l3/IT/${fileName}`,
      subdivisionCount: group.provinces.length,
      bbox: {
        minX: Math.max(0, Math.round(pMinX) - 5),
        maxX: Math.min(MAP_W, Math.round(pMaxX) + 5),
        minY: Math.max(0, Math.round(pMinY) - 5),
        maxY: Math.min(MAP_H, Math.round(pMaxY) + 5)
      }
    });

    totalCount += group.provinces.length;
  }

  partitions.sort((a, b) => a.key.localeCompare(b.key));
  console.log(`[IT] Generated ${partitions.length} Regione packs (${totalCount} total provinces/metropolitan cities)`);

  return {
    iso2: 'IT',
    countryId: '380',
    name: 'Italy',
    nameZh: '義大利',
    unitNameZh: '省/廣域市 (Provincia)',
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

const ES_REGIONS_META = {
  'Andalucía': { nameZh: '安達魯西亞自治區', nameEn: 'Andalusia', code: 'ES-AN', postal: 'AN' },
  'Aragón': { nameZh: '亞拉岡自治區', nameEn: 'Aragon', code: 'ES-AR', postal: 'AR' },
  'Asturias': { nameZh: '阿斯圖里亞斯自治區', nameEn: 'Asturias', code: 'ES-AS', postal: 'AS' },
  'Islas Baleares': { nameZh: '巴利阿里群島自治區', nameEn: 'Balearic Islands', code: 'ES-IB', postal: 'IB' },
  'Canary Is.': { nameZh: '加那利群島自治區', nameEn: 'Canary Islands', code: 'ES-CN', postal: 'CN' },
  'Cantabria': { nameZh: '坎塔布里亞自治區', nameEn: 'Cantabria', code: 'ES-CB', postal: 'CB' },
  'Castilla y León': { nameZh: '卡斯提亞-雷昂自治區', nameEn: 'Castile and León', code: 'ES-CL', postal: 'CL' },
  'Castilla-La Mancha': { nameZh: '卡斯提亞-拉曼查自治區', nameEn: 'Castilla-La Mancha', code: 'ES-CM', postal: 'CM' },
  'Cataluña': { nameZh: '加泰隆尼亞自治區', nameEn: 'Catalonia', code: 'ES-CT', postal: 'CT' },
  'Valenciana': { nameZh: '瓦倫西亞自治區', nameEn: 'Valencian Community', code: 'ES-VC', postal: 'VC' },
  'Extremadura': { nameZh: '埃斯特雷馬杜拉自治區', nameEn: 'Extremadura', code: 'ES-EX', postal: 'EX' },
  'Galicia': { nameZh: '加利西亞自治區', nameEn: 'Galicia', code: 'ES-GA', postal: 'GA' },
  'Madrid': { nameZh: '馬德里自治區', nameEn: 'Community of Madrid', code: 'ES-MD', postal: 'MD' },
  'Murcia': { nameZh: '莫夕亞自治區', nameEn: 'Region of Murcia', code: 'ES-MC', postal: 'MC' },
  'Foral de Navarra': { nameZh: '納瓦拉自治區', nameEn: 'Navarre', code: 'ES-NC', postal: 'NC' },
  'País Vasco': { nameZh: '巴斯克自治區', nameEn: 'Basque Country', code: 'ES-PV', postal: 'PV' },
  'La Rioja': { nameZh: '拉里奧哈自治區', nameEn: 'La Rioja', code: 'ES-RI', postal: 'RI' },
  'Ceuta': { nameZh: '休達自治市', nameEn: 'Ceuta', code: 'ES-CE', postal: 'CE' },
  'Melilla': { nameZh: '梅利利亞自治市', nameEn: 'Melilla', code: 'ES-ML', postal: 'ML' }
};

const ES_PROV_ZH_OVERRIDES = {
  // Cities
  'Ceuta': '休達',
  'Melilla': '梅利利亞',
  // Single-province communities
  'Navarra': '納瓦拉省',
  'Asturias': '阿斯圖里亞斯省',
  'Cantabria': '坎塔布里亞省',
  'La Rioja': '拉里奧哈省',
  'Murcia': '莫夕亞省',
  'Madrid': '馬德里省',
  'Baleares': '巴利阿里群島',
  // País Vasco
  'Gipuzkoa': '吉普斯夸省',
  'Bizkaia': '比斯開省',
  'Álava': '阿拉瓦省',
  // Aragón
  'Huesca': '韋斯卡省',
  'Zaragoza': '薩拉戈薩省',
  'Teruel': '特魯埃爾省',
  // Cataluña
  'Lérida': '萊里達省',
  'Gerona': '赫羅納省',
  'Barcelona': '巴塞隆納省',
  'Tarragona': '塔拉戈納省',
  // Extremadura
  'Badajoz': '巴達霍斯省',
  'Cáceres': '卡塞雷斯省',
  // Andalucía
  'Cádiz': '加的斯省',
  'Huelva': '韋爾瓦省',
  'Almería': '阿爾梅里亞省',
  'Granada': '格拉納達省',
  'Málaga': '馬拉加省',
  'Sevilla': '塞維利亞省',
  'Córdoba': '科爾多瓦省',
  'Jaén': '哈恩省',
  // Galicia
  'Orense': '奧倫塞省',
  'Pontevedra': '蓬特韋德拉省',
  'La Coruña': '拉科魯尼亞省',
  'Lugo': '盧戈省',
  // Castilla y León
  'Salamanca': '薩拉曼卡省',
  'Zamora': '薩莫拉省',
  'León': '雷昂省',
  'Soria': '索里亞省',
  'Burgos': '布爾戈斯省',
  'Ávila': '阿維拉省',
  'Palencia': '帕倫西亞省',
  'Segovia': '塞哥維亞省',
  'Valladolid': '巴利亞多利德省',
  // Valenciana
  'Castellón': '卡斯特利翁省',
  'Valencia': '瓦倫西亞省',
  'Alicante': '阿利坎特省',
  // Canary Is.
  'Santa Cruz de Tenerife': '聖克魯斯-德特內里費省',
  'Las Palmas': '拉斯帕爾馬斯省',
  // Castilla-La Mancha
  'Albacete': '阿爾瓦塞特省',
  'Cuenca': '昆卡省',
  'Toledo': '托萊多省',
  'Ciudad Real': '雷阿爾城省',
  'Guadalajara': '瓜達拉哈拉省'
};

async function processSpain() {
  console.log('[ES] Processing Spain 52 Provincias & Ciudades Autónomas into L2 Comunidades Autónomas Packs...');
  const sourcePath = path.join(rootDir, 'data-source', 'ne_10m_admin_1_states_provinces.geojson');
  const esDir = path.join(outputDir, 'ES');
  if (!fs.existsSync(esDir)) {
    fs.mkdirSync(esDir, { recursive: true });
  }

  if (!fs.existsSync(sourcePath)) {
    console.warn('[ES] ne_10m_admin_1_states_provinces.geojson not found, skipping ES.');
    return null;
  }

  const rawData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const esProvs = rawData.features.filter(
    (f) => (f.properties.iso_a2 || f.properties.iso_3166_2?.split('-')[0]) === 'ES'
  );

  const provsByRegionCode = new Map();
  for (const f of esProvs) {
    const p = f.properties;
    const rawReg = p.region.trim();
    const meta = ES_REGIONS_META[rawReg] || {
      nameZh: rawReg,
      nameEn: rawReg,
      code: 'ES-OTHER',
      postal: ''
    };
    const regCode = meta.code;

    if (!provsByRegionCode.has(regCode)) {
      provsByRegionCode.set(regCode, {
        regionMeta: meta,
        provinces: []
      });
    }

    const isCity = p.type_en === 'Autonomous City' || p.name === 'Ceuta' || p.name === 'Melilla';
    const typeEn = isCity ? 'Autonomous City' : 'Province';
    const nameZh = ES_PROV_ZH_OVERRIDES[p.name] || p.name_zht || p.name_zh || p.name;
    const isoSub = p.iso_3166_2 || `ES-${p.postal}`;
    const code = isoSub.replace('ES-', '');

    const normalized = normalizeFeatureWinding(f);
    normalized.id = isoSub;
    normalized.properties = {
      id: isoSub,
      iso2: 'ES',
      name: p.name,
      name_en: p.name_en || p.name,
      name_zh: nameZh,
      type_en: typeEn,
      parent_name: meta.nameZh,
      parent_code: regCode,
      code: code
    };

    provsByRegionCode.get(regCode).provinces.push(normalized);
  }

  const partitions = [];
  let countryMinX = Infinity, countryMinY = Infinity, countryMaxX = -Infinity, countryMaxY = -Infinity;
  let totalCount = 0;

  for (const [regCode, group] of provsByRegionCode.entries()) {
    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
    for (const f of group.provinces) {
      try {
        const bounds = pathGen.bounds(f);
        if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          pMinX = Math.min(pMinX, bounds[0][0]);
          pMinY = Math.min(pMinY, bounds[0][1]);
          pMaxX = Math.max(pMaxX, bounds[1][0]);
          pMaxY = Math.max(pMaxY, bounds[1][1]);
        }
      } catch {}
    }

    countryMinX = Math.min(countryMinX, pMinX);
    countryMinY = Math.min(countryMinY, pMinY);
    countryMaxX = Math.max(countryMaxX, pMaxX);
    countryMaxY = Math.max(countryMaxY, pMaxY);

    const partitionBytes = flatgeobuf.geojson.serialize({
      type: 'FeatureCollection',
      features: group.provinces
    });

    const fileName = `${regCode}.fgb`;
    const filePath = path.join(esDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(partitionBytes));

    partitions.push({
      key: regCode,
      iso2: 'ES',
      parentName: group.regionMeta.nameZh,
      parentCode: regCode,
      file: `/data/l3/ES/${fileName}`,
      subdivisionCount: group.provinces.length,
      bbox: {
        minX: Math.max(0, Math.round(pMinX) - 5),
        maxX: Math.min(MAP_W, Math.round(pMaxX) + 5),
        minY: Math.max(0, Math.round(pMinY) - 5),
        maxY: Math.min(MAP_H, Math.round(pMaxY) + 5)
      }
    });

    totalCount += group.provinces.length;
  }

  partitions.sort((a, b) => a.key.localeCompare(b.key));
  console.log(`[ES] Generated ${partitions.length} Autonomous Community packs (${totalCount} total provinces/cities)`);

  return {
    iso2: 'ES',
    countryId: '724',
    name: 'Spain',
    nameZh: '西班牙',
    unitNameZh: '省/自治市 (Provincia)',
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

const GB_COUNTRIES_META = {
  'England': { nameZh: '英格蘭', nameEn: 'England', code: 'GB-ENG', postal: 'ENG', typeEn: 'Country' },
  'Scotland': { nameZh: '蘇格蘭', nameEn: 'Scotland', code: 'GB-SCT', postal: 'SCT', typeEn: 'Country' },
  'Wales': { nameZh: '威爾斯', nameEn: 'Wales', code: 'GB-WLS', postal: 'WLS', typeEn: 'Country' },
  'Northern Ireland': { nameZh: '北愛爾蘭', nameEn: 'Northern Ireland', code: 'GB-NIR', postal: 'NIR', typeEn: 'Country' }
};

const GB_PROV_ZH_OVERRIDES = {
  'Shropshire': '什羅普郡',
  'Lancashire': '蘭開夏郡',
  'East Riding of Yorkshire': '東約克郡',
  'North Yorkshire': '北約克郡',
  'South Yorkshire': '南約克郡',
  'West Yorkshire': '西約克郡',
  'Norfolk': '諾福克郡',
  'Greater London': '大倫敦',
  'City of London': '倫敦市',
  'Isle of Wight': '懷特島',
  'Cornwall': '康瓦爾郡',
  'Devon': '德文郡',
  'Dorset': '多塞特郡',
  'Somerset': '薩默塞特郡',
  'Gloucestershire': '格洛斯特郡',
  'Wiltshire': '威爾特郡',
  'Hampshire': '漢普郡',
  'Surrey': '薩里郡',
  'Kent': '肯特郡',
  'East Sussex': '東薩塞克斯郡',
  'West Sussex': '西薩塞克斯郡',
  'Oxfordshire': '牛津郡',
  'Buckinghamshire': '白金漢郡',
  'Berkshire': '伯克郡',
  'Bedfordshire': '貝德福德郡',
  'Hertfordshire': '赫特福德郡',
  'Essex': '埃塞克斯郡',
  'Suffolk': '薩福克郡',
  'Cambridgeshire': '劍橋郡',
  'Northamptonshire': '北安普敦郡',
  'Warwickshire': '沃里克郡',
  'Worcestershire': '伍斯特郡',
  'Herefordshire': '赫里福德郡',
  'Staffordshire': '斯塔福德郡',
  'Derbyshire': '德比郡',
  'Nottinghamshire': '諾丁漢郡',
  'Lincolnshire': '林肯郡',
  'Leicestershire': '萊斯特郡',
  'Cheshire': '柴郡',
  'Cumbria': '坎布里亞郡',
  'Northumberland': '諾森伯蘭郡',
  'County Durham': '達勒姆郡'
};

const GB_SIMPLIFIED_TO_TRADITIONAL = {
  '区': '區', '县': '縣', '与': '與', '罗': '羅', '韦': '韋', '兰': '蘭',
  '尔': '爾', '顿': '頓', '亚': '亞', '萨': '薩', '开': '開', '什': '什',
  '东': '東', '约': '約', '诺': '諾', '车': '車', '门': '門', '贝': '貝',
  '苏': '蘇', '边': '邊', '湾': '灣', '达': '達', '里': '里', '总': '總'
};

function toGbTraditionalZh(str) {
  let res = '';
  for (const ch of str) {
    res += GB_SIMPLIFIED_TO_TRADITIONAL[ch] || ch;
  }
  return res;
}

async function processUK() {
  console.log('[GB] Processing UK 232 Subdivisions into L2 Constituent Country Packs...');
  const sourcePath = path.join(rootDir, 'data-source', 'ne_10m_admin_1_states_provinces.geojson');
  const gbDir = path.join(outputDir, 'GB');
  if (!fs.existsSync(gbDir)) {
    fs.mkdirSync(gbDir, { recursive: true });
  }

  if (!fs.existsSync(sourcePath)) {
    console.warn('[GB] ne_10m_admin_1_states_provinces.geojson not found, skipping GB.');
    return null;
  }

  const rawData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const gbSubs = rawData.features.filter(
    (f) => (f.properties.iso_a2 || f.properties.iso_3166_2?.split('-')[0]) === 'GB'
  );

  const subsByCountryCode = new Map();
  for (let idx = 0; idx < gbSubs.length; idx++) {
    const f = gbSubs[idx];
    const p = f.properties;
    const gu = (p.geonunit || '').trim();
    const meta = GB_COUNTRIES_META[gu] || {
      nameZh: gu,
      nameEn: gu,
      code: 'GB-OTHER',
      postal: ''
    };
    const cCode = meta.code;

    if (!subsByCountryCode.has(cCode)) {
      subsByCountryCode.set(cCode, {
        countryMeta: meta,
        subdivisions: []
      });
    }

    const rawZh = p.name_zht || p.name_zh || p.name;
    const nameZh = GB_PROV_ZH_OVERRIDES[p.name] || toGbTraditionalZh(rawZh);
    const isoSub = p.iso_3166_2 || `GB-${p.postal || idx + 1}`;
    const code = p.iso_3166_2 ? p.iso_3166_2.replace('GB-', '') : (p.postal || '');

    const normalized = normalizeFeatureWinding(f);
    normalized.id = isoSub;
    normalized.properties = {
      id: isoSub,
      iso2: 'GB',
      name: p.name,
      name_en: p.name_en || p.name,
      name_zh: nameZh,
      type_en: p.type_en || p.type || 'District',
      parent_name: meta.nameZh,
      parent_code: cCode,
      code: code
    };

    subsByCountryCode.get(cCode).subdivisions.push(normalized);
  }

  const partitions = [];
  let countryMinX = Infinity, countryMinY = Infinity, countryMaxX = -Infinity, countryMaxY = -Infinity;
  let totalCount = 0;

  for (const [cCode, group] of subsByCountryCode.entries()) {
    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
    for (const f of group.subdivisions) {
      try {
        const bounds = pathGen.bounds(f);
        if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          pMinX = Math.min(pMinX, bounds[0][0]);
          pMinY = Math.min(pMinY, bounds[0][1]);
          pMaxX = Math.max(pMaxX, bounds[1][0]);
          pMaxY = Math.max(pMaxY, bounds[1][1]);
        }
      } catch {}
    }

    countryMinX = Math.min(countryMinX, pMinX);
    countryMinY = Math.min(countryMinY, pMinY);
    countryMaxX = Math.max(countryMaxX, pMaxX);
    countryMaxY = Math.max(countryMaxY, pMaxY);

    const partitionBytes = flatgeobuf.geojson.serialize({
      type: 'FeatureCollection',
      features: group.subdivisions
    });

    const fileName = `${cCode}.fgb`;
    const filePath = path.join(gbDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(partitionBytes));

    partitions.push({
      key: cCode,
      iso2: 'GB',
      parentName: group.countryMeta.nameZh,
      parentCode: cCode,
      file: `/data/l3/GB/${fileName}`,
      subdivisionCount: group.subdivisions.length,
      bbox: {
        minX: Math.max(0, Math.round(pMinX) - 5),
        maxX: Math.min(MAP_W, Math.round(pMaxX) + 5),
        minY: Math.max(0, Math.round(pMinY) - 5),
        maxY: Math.min(MAP_H, Math.round(pMaxY) + 5)
      }
    });

    totalCount += group.subdivisions.length;
  }

  partitions.sort((a, b) => a.key.localeCompare(b.key));
  console.log(`[GB] Generated ${partitions.length} Constituent Country packs (${totalCount} total subdivisions)`);

  return {
    iso2: 'GB',
    countryId: '826',
    name: 'United Kingdom',
    nameZh: '英國',
    unitNameZh: '郡/地方行政區 (County / District)',
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
  if (iso2 === 'FR') return processFrance();
  if (iso2 === 'IT') return processItaly();
  if (iso2 === 'ES') return processSpain();
  if (iso2 === 'GB') return processUK();

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
