import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
    const iso2 = f.properties.iso_a2 || f.properties.iso_3166_2?.split('-')[0] || '';
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

    const cleanedFeatures = rawFeats.map((f, idx) => {
      const normalized = normalizeFeatureWinding(f);
      const p = normalized.properties || {};

      let nameZh = p.name_zh || p.name || '';
      if (iso2 === 'TW' && TW_ZH_MAP[nameZh]) {
        nameZh = TW_ZH_MAP[nameZh];
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
