import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { geoMercator, geoPath, geoArea } from 'd3-geo';
import * as flatgeobuf from 'flatgeobuf';
import * as topojsonServer from 'topojson-server';
import * as topojsonSimplify from 'topojson-simplify';
import * as topojsonClient from 'topojson-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataSourceDir = path.join(rootDir, 'data-source');
const outputDir = path.join(rootDir, 'public', 'data', 'l2');
const manifestPath = path.join(rootDir, 'src', 'data', 'l2Manifest.ts');

const MAP_W = 1000;
const MAP_H = 1000;
const MERCATOR_SCALE = MAP_W / (2 * Math.PI);
const projection = geoMercator().scale(MERCATOR_SCALE).translate([MAP_W / 2, MAP_H / 2]);
const pathGen = geoPath().projection(projection);

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

const ES_REGIONS_META = {
  'Andalucía': { nameZh: '安達魯西亞自治區', nameEn: 'Andalusia', code: 'ES-AN', postal: 'AN', typeEn: 'Autonomous Community' },
  'Aragón': { nameZh: '亞拉岡自治區', nameEn: 'Aragon', code: 'ES-AR', postal: 'AR', typeEn: 'Autonomous Community' },
  'Asturias': { nameZh: '阿斯圖里亞斯自治區', nameEn: 'Asturias', code: 'ES-AS', postal: 'AS', typeEn: 'Autonomous Community' },
  'Islas Baleares': { nameZh: '巴利阿里群島自治區', nameEn: 'Balearic Islands', code: 'ES-IB', postal: 'IB', typeEn: 'Autonomous Community' },
  'Canary Is.': { nameZh: '加那利群島自治區', nameEn: 'Canary Islands', code: 'ES-CN', postal: 'CN', typeEn: 'Autonomous Community' },
  'Cantabria': { nameZh: '坎塔布里亞自治區', nameEn: 'Cantabria', code: 'ES-CB', postal: 'CB', typeEn: 'Autonomous Community' },
  'Castilla y León': { nameZh: '卡斯提亞-雷昂自治區', nameEn: 'Castile and León', code: 'ES-CL', postal: 'CL', typeEn: 'Autonomous Community' },
  'Castilla-La Mancha': { nameZh: '卡斯提亞-拉曼查自治區', nameEn: 'Castilla-La Mancha', code: 'ES-CM', postal: 'CM', typeEn: 'Autonomous Community' },
  'Cataluña': { nameZh: '加泰隆尼亞自治區', nameEn: 'Catalonia', code: 'ES-CT', postal: 'CT', typeEn: 'Autonomous Community' },
  'Valenciana': { nameZh: '瓦倫西亞自治區', nameEn: 'Valencian Community', code: 'ES-VC', postal: 'VC', typeEn: 'Autonomous Community' },
  'Extremadura': { nameZh: '埃斯特雷馬杜拉自治區', nameEn: 'Extremadura', code: 'ES-EX', postal: 'EX', typeEn: 'Autonomous Community' },
  'Galicia': { nameZh: '加利西亞自治區', nameEn: 'Galicia', code: 'ES-GA', postal: 'GA', typeEn: 'Autonomous Community' },
  'Madrid': { nameZh: '馬德里自治區', nameEn: 'Community of Madrid', code: 'ES-MD', postal: 'MD', typeEn: 'Autonomous Community' },
  'Murcia': { nameZh: '莫夕亞自治區', nameEn: 'Region of Murcia', code: 'ES-MC', postal: 'MC', typeEn: 'Autonomous Community' },
  'Foral de Navarra': { nameZh: '納瓦拉自治區', nameEn: 'Navarre', code: 'ES-NC', postal: 'NC', typeEn: 'Autonomous Community' },
  'País Vasco': { nameZh: '巴斯克自治區', nameEn: 'Basque Country', code: 'ES-PV', postal: 'PV', typeEn: 'Autonomous Community' },
  'La Rioja': { nameZh: '拉里奧哈自治區', nameEn: 'La Rioja', code: 'ES-RI', postal: 'RI', typeEn: 'Autonomous Community' },
  'Ceuta': { nameZh: '休達自治市', nameEn: 'Ceuta', code: 'ES-CE', postal: 'CE', typeEn: 'Autonomous City' },
  'Melilla': { nameZh: '梅利利亞自治市', nameEn: 'Melilla', code: 'ES-ML', postal: 'ML', typeEn: 'Autonomous City' }
};

const GB_COUNTRIES_META = {
  'England': { nameZh: '英格蘭', nameEn: 'England', code: 'GB-ENG', postal: 'ENG', typeEn: 'Country' },
  'Scotland': { nameZh: '蘇格蘭', nameEn: 'Scotland', code: 'GB-SCT', postal: 'SCT', typeEn: 'Country' },
  'Wales': { nameZh: '威爾斯', nameEn: 'Wales', code: 'GB-WLS', postal: 'WLS', typeEn: 'Country' },
  'Northern Ireland': { nameZh: '北愛爾蘭', nameEn: 'Northern Ireland', code: 'GB-NIR', postal: 'NIR', typeEn: 'Country' }
};

// Traditional Chinese conversion for Taiwan counties & cities
const TW_ZH_MAP = {
  '桃园市': '桃園市',
  '新竹县': '新竹縣',
  '新竹市': '新竹市',
  '苗栗县': '苗栗縣',
  '台中市': '台中市',
  '彰化县': '彰化縣',
  '云林县': '雲林縣',
  '嘉义县': '嘉義縣',
  '台南市': '台南市',
  '高雄市': '高雄市',
  '屏东县': '屏東縣',
  '台东县': '台東縣',
  '花莲县': '花蓮縣',
  '宜兰县': '宜蘭縣',
  '新北市': '新北市',
  '基隆市': '基隆市',
  '金门县': '金門縣',
  '澎湖县': '澎湖縣',
  '南投县': '南投縣',
  '台北市': '台北市',
  '嘉义市': '嘉義市'
};

const KZ_ZH_MAP = {
  'East Kazakhstan': '東哈薩克斯坦州',
  'Almaty': '阿拉木圖州',
  'Zhambyl': '江布爾州',
  'South Kazakhstan': '突厥斯坦州 (南哈薩克斯坦)',
  'Mangghystau': '曼格斯套州',
  'Qyzylorda': '克孜勒奧爾達州',
  'Aqtöbe': '阿克托貝州',
  'North Kazakhstan': '北哈薩克斯坦州',
  'Qostanay': '庫斯塔奈州',
  'Pavlodar': '巴甫洛達爾州',
  'West Kazakhstan': '西哈薩克斯坦州',
  'Atyrau': '阿特勞州',
  'Aqmola': '阿克莫拉州',
  'Qaraghandy': '卡拉干達州',
  'Almaty City': '阿拉木圖',
  'Astana': '阿斯塔納',
  'Baikonur': '拜科努爾',
  'Baykonur lease in Qyzylorda': '拜科努爾'
};

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
    // Ignore winding calculation errors for degenerate geometries
  }
  return feature;
}

/**
 * Shared-arc topological simplification using TopoJSON.
 * Quantization to 1e5 (~1m precision) + Visvalingam-Whyatt simplification with shared boundaries.
 * Guarantees zero cracks or slivers between adjacent subdivisions while stripping all
 * redundant collinear points from straight border segments.
 */
function optimizeFeatures(features, weight = 2e-4) {
  if (!features || features.length === 0) return [];
  const geojson = { type: 'FeatureCollection', features };
  const topology = topojsonServer.topology({ collection: geojson }, 1e5);
  const presimplified = topojsonSimplify.presimplify(topology);
  const simplified = topojsonSimplify.simplify(presimplified, weight);
  const result = topojsonClient.feature(simplified, simplified.objects.collection);
  return result.features.map((f) => normalizeFeatureWinding(f));
}

function computeBoundingBox(features) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of features) {
    try {
      const bounds = pathGen.bounds(f);
      if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
        minX = Math.min(minX, bounds[0][0]);
        minY = Math.min(minY, bounds[0][1]);
        maxX = Math.max(maxX, bounds[1][0]);
        maxY = Math.max(maxY, bounds[1][1]);
      }
    } catch {
      // Ignore bounds errors
    }
  }

  // Handle countries crossing anti-meridian (e.g. US, RU)
  if (minX > maxX || !isFinite(minX)) {
    minX = 0; maxX = MAP_W; minY = 0; maxY = MAP_H;
  }

  return {
    minX: Math.max(0, Math.round(minX) - 5),
    maxX: Math.min(MAP_W, Math.round(maxX) + 5),
    minY: Math.max(0, Math.round(minY) - 5),
    maxY: Math.min(MAP_H, Math.round(maxY) + 5)
  };
}

async function ensureSourceData() {
  const geojsonPath = path.join(dataSourceDir, 'ne_10m_admin_1_states_provinces.geojson');
  if (!fs.existsSync(geojsonPath)) {
    console.log('Downloading Natural Earth Admin-1 GeoJSON dataset (~39 MB)...');
    if (!fs.existsSync(dataSourceDir)) {
      fs.mkdirSync(dataSourceDir, { recursive: true });
    }
    const url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(geojsonPath, Buffer.from(buffer));
    console.log(`Saved dataset to ${geojsonPath}`);
  }
  return geojsonPath;
}

function getOfficialCountries() {
  const countriesTs = fs.readFileSync(path.join(rootDir, 'src', 'data', 'countries.ts'), 'utf8');
  const regex = /id:\s*["'](\d+)["'][\s\S]*?iso2:\s*["']([A-Z]{2})["'][\s\S]*?name:\s*["']([^"']+)["'][\s\S]*?nameZh:\s*["']([^"']+)["'][\s\S]*?coverage:\s*["']([a-z]+)["']/g;
  let m;
  const officialMap = new Map();
  while ((m = regex.exec(countriesTs)) !== null) {
    if (m[5] === 'official') {
      officialMap.set(m[2], {
        id: m[1],
        iso2: m[2],
        name: m[3],
        nameZh: m[4]
      });
    }
  }
  return officialMap;
}

async function main() {
  console.log('=== Worldwide L2 Admin-1 Generator ===');
  const geojsonPath = await ensureSourceData();
  const officialCountries = getOfficialCountries();
  console.log(`Loaded ${officialCountries.size} official Street View countries from countries.ts`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Reading and parsing Natural Earth GeoJSON...');
  const rawData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  console.log(`Total features in Natural Earth Admin-1: ${rawData.features.length}`);

  // Group features by iso_a2
  const featuresByIso2 = new Map();
  for (const f of rawData.features) {
    let iso2 = f.properties.iso_a2 || f.properties.iso_3166_2?.split('-')[0] || '';
    if (f.properties.name === 'Baykonur lease in Qyzylorda') {
      iso2 = 'KZ';
      f.properties.name = 'Baikonur';
      f.properties.name_en = 'Baikonur';
      f.properties.name_zh = '拜科努爾';
      f.properties.name_zht = '拜科努爾';
      f.properties.type_en = 'Special Status City';
      f.properties.iso_3166_2 = 'KZ-BAY';
      f.properties.postal = 'BAY';
    }
    if (!iso2 || iso2 === '-99') continue;
    if (!featuresByIso2.has(iso2)) {
      featuresByIso2.set(iso2, []);
    }
    featuresByIso2.get(iso2).push(f);
  }

  const manifestEntries = [];

  // 1. Process Japan (JP) specially using our existing high-precision JIS dataset if available
  const jpOutputPath = path.join(outputDir, 'JP.fgb');
  const existingJpPath = path.join(rootDir, 'public', 'data', 'japan-prefectures.fgb');
  const jpSourcePath = fs.existsSync(existingJpPath) ? existingJpPath : (fs.existsSync(jpOutputPath) ? jpOutputPath : null);
  const jpInfo = officialCountries.get('JP') || { id: '392', name: 'Japan', nameZh: '日本' };

  if (jpSourcePath) {
    const buf = fs.readFileSync(jpSourcePath);
    const it = flatgeobuf.geojson.deserialize(new Uint8Array(buf));
    const jpRawFeatures = [];
    for await (const f of it) {
      jpRawFeatures.push(f);
    }
    const optimizedJpFeatures = optimizeFeatures(jpRawFeatures, 2e-4);
    const bbox = computeBoundingBox(optimizedJpFeatures);
    const fgbBytes = flatgeobuf.geojson.serialize({
      type: 'FeatureCollection',
      features: optimizedJpFeatures
    });
    fs.writeFileSync(jpOutputPath, Buffer.from(fgbBytes));
    manifestEntries.push({
      iso2: 'JP',
      countryId: jpInfo.id,
      name: jpInfo.name,
      nameZh: jpInfo.nameZh,
      subdivisionCount: optimizedJpFeatures.length,
      bbox
    });
    console.log(`[JP] Optimized Japan prefectures: ${optimizedJpFeatures.length} subdivisions -> ${(fgbBytes.length / 1024).toFixed(1)} KB`);
  }

  // 2. Process all other official Street View countries
  for (const [iso2, info] of officialCountries.entries()) {
    if (iso2 === 'JP' && jpSourcePath) continue;

    const rawFeats = featuresByIso2.get(iso2) || [];
    if (rawFeats.length === 0) {
      console.warn(`[Warning] No Admin-1 features found for ${iso2} (${info.name})`);
      continue;
    }

    let sourceFeats = rawFeats;
    if (iso2 === 'FR') {
      const tempIn = path.join(dataSourceDir, 'temp_fr_l2_raw.geojson');
      const tempOut = path.join(dataSourceDir, 'temp_fr_l2_dissolved.geojson');
      fs.writeFileSync(tempIn, JSON.stringify({ type: 'FeatureCollection', features: rawFeats }));
      execSync(`npx mapshaper "${tempIn}" -dissolve region copy-fields=region_cod -o format=geojson "${tempOut}"`);
      const dissolved = JSON.parse(fs.readFileSync(tempOut, 'utf8'));
      if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
      if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
      sourceFeats = dissolved.features.map((f) => {
        const reg = f.properties.region?.trim() || '';
        const meta = FR_REGIONS_META[reg] || {
          nameZh: reg,
          nameEn: reg,
          code: f.properties.region_cod?.trim() || '',
          postal: ''
        };
        f.properties = {
          name: reg,
          name_en: meta.nameEn,
          name_zh: meta.nameZh,
          type_en: 'Region',
          iso_3166_2: meta.code,
          postal: meta.postal
        };
        return f;
      });
    } else if (iso2 === 'IT') {
      const tempIn = path.join(dataSourceDir, 'temp_it_l2_raw.geojson');
      const tempOut = path.join(dataSourceDir, 'temp_it_l2_dissolved.geojson');
      fs.writeFileSync(tempIn, JSON.stringify({ type: 'FeatureCollection', features: rawFeats }));
      execSync(`npx mapshaper "${tempIn}" -dissolve region copy-fields=region_cod -o format=geojson "${tempOut}"`);
      const dissolved = JSON.parse(fs.readFileSync(tempOut, 'utf8'));
      if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
      if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
      sourceFeats = dissolved.features.map((f) => {
        const reg = f.properties.region?.trim() || '';
        const meta = IT_REGIONS_META[reg] || {
          nameZh: reg,
          nameEn: reg,
          code: f.properties.region_cod?.trim() || '',
          postal: ''
        };
        f.properties = {
          name: reg,
          name_en: meta.nameEn,
          name_zh: meta.nameZh,
          type_en: 'Region',
          iso_3166_2: meta.code,
          postal: meta.postal
        };
        return f;
      });
    } else if (iso2 === 'ES') {
      const tempIn = path.join(dataSourceDir, 'temp_es_l2_raw.geojson');
      const tempOut = path.join(dataSourceDir, 'temp_es_l2_dissolved.geojson');
      fs.writeFileSync(tempIn, JSON.stringify({ type: 'FeatureCollection', features: rawFeats }));
      execSync(`npx mapshaper "${tempIn}" -dissolve region copy-fields=region_cod -o format=geojson "${tempOut}"`);
      const dissolved = JSON.parse(fs.readFileSync(tempOut, 'utf8'));
      if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
      if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
      sourceFeats = dissolved.features.map((f) => {
        const reg = f.properties.region?.trim() || '';
        const meta = ES_REGIONS_META[reg] || {
          nameZh: reg,
          nameEn: reg,
          code: f.properties.region_cod?.trim() || '',
          postal: '',
          typeEn: 'Autonomous Community'
        };
        f.properties = {
          name: reg,
          name_en: meta.nameEn,
          name_zh: meta.nameZh,
          type_en: meta.typeEn || 'Autonomous Community',
          iso_3166_2: meta.code,
          postal: meta.postal
        };
        return f;
      });
    } else if (iso2 === 'GB') {
      const tempIn = path.join(dataSourceDir, 'temp_gb_l2_raw.geojson');
      const tempOut = path.join(dataSourceDir, 'temp_gb_l2_dissolved.geojson');
      fs.writeFileSync(tempIn, JSON.stringify({ type: 'FeatureCollection', features: rawFeats }));
      execSync(`npx mapshaper "${tempIn}" -dissolve geonunit -o format=geojson "${tempOut}"`);
      const dissolved = JSON.parse(fs.readFileSync(tempOut, 'utf8'));
      if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
      if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
      sourceFeats = dissolved.features.map((f) => {
        const gu = f.properties.geonunit?.trim() || '';
        const meta = GB_COUNTRIES_META[gu] || {
          nameZh: gu,
          nameEn: gu,
          code: `GB-${gu.slice(0, 3).toUpperCase()}`,
          postal: gu.slice(0, 3).toUpperCase(),
          typeEn: 'Country'
        };
        f.properties = {
          name: gu,
          name_en: meta.nameEn,
          name_zh: meta.nameZh,
          type_en: meta.typeEn || 'Country',
          iso_3166_2: meta.code,
          postal: meta.postal
        };
        return f;
      });
    }

    const cleanedFeatures = sourceFeats.map((f, idx) => {
      const normalized = normalizeFeatureWinding(f);
      const p = normalized.properties || {};

      let nameZh = p.name_zh || p.name || '';
      if (iso2 === 'TW' && TW_ZH_MAP[nameZh]) {
        nameZh = TW_ZH_MAP[nameZh];
      } else if (iso2 === 'KZ' && (KZ_ZH_MAP[p.name] || KZ_ZH_MAP[nameZh])) {
        nameZh = KZ_ZH_MAP[p.name] || KZ_ZH_MAP[nameZh];
      }

      normalized.id = idx + 1;
      normalized.properties = {
        id: idx + 1,
        iso2: iso2,
        name: String(p.name || p.name_en || ''),
        name_en: String(p.name_en || p.name || ''),
        name_zh: String(nameZh),
        type_en: String(p.type_en || p.type || ''),
        code: String(p.iso_3166_2 || p.code_hasc || ''),
        postal: String(p.postal || '')
      };

      return normalized;
    });

    // Run shared-arc topological simplification (removes collinear straight points without cracks)
    const optimizedFeatures = optimizeFeatures(cleanedFeatures, 2e-4);
    const bbox = computeBoundingBox(optimizedFeatures);

    const fgbBytes = flatgeobuf.geojson.serialize({
      type: 'FeatureCollection',
      features: optimizedFeatures
    });

    const outPath = path.join(outputDir, `${iso2}.fgb`);
    fs.writeFileSync(outPath, Buffer.from(fgbBytes));

    manifestEntries.push({
      iso2,
      countryId: info.id,
      name: info.name,
      nameZh: info.nameZh,
      subdivisionCount: optimizedFeatures.length,
      bbox
    });

    console.log(`[${iso2}] ${info.nameZh} (${info.name}): ${optimizedFeatures.length} subdivisions -> ${(fgbBytes.length / 1024).toFixed(1)} KB`);
  }

  // Sort manifest by country name
  manifestEntries.sort((a, b) => a.name.localeCompare(b.name));

  // Write TypeScript manifest file
  const tsContent = `// Auto-generated worldwide L2 Admin-1 country manifest
export interface L2CountryMeta {
  iso2: string;
  countryId: string;
  name: string;
  nameZh: string;
  subdivisionCount: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export const L2_MANIFEST: L2CountryMeta[] = ${JSON.stringify(manifestEntries, null, 2)};

export const L2_COUNTRY_MAP: Record<string, L2CountryMeta> = Object.fromEntries(
  L2_MANIFEST.map((c) => [c.iso2, c])
);
`;

  fs.writeFileSync(manifestPath, tsContent);
  console.log(`\nGenerated ${manifestEntries.length} country entries in ${manifestPath}`);
  console.log('Done!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
