import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as topojsonServer from 'topojson-server';
import * as topojsonClient from 'topojson-client';
import * as flatgeobuf from 'flatgeobuf';
import { geoMercator, geoPath, geoArea } from 'd3-geo';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const l2Dir = path.join(rootDir, 'public', 'data', 'l2');
const l3Dir = path.join(rootDir, 'public', 'data', 'l3');
const l2ManifestPath = path.join(rootDir, 'src', 'data', 'l2Manifest.ts');
const l3ManifestPath = path.join(rootDir, 'src', 'data', 'l3Manifest.ts');

const MAP_W = 1000;
const MAP_H = 1000;
const MERCATOR_SCALE = MAP_W / (2 * Math.PI);
const projection = geoMercator().scale(MERCATOR_SCALE).translate([MAP_W / 2, MAP_H / 2]);
const pathGen = geoPath().projection(projection);

// Batch 2 (2026-10): NL, BE, LS, SZ, MT, IL
const BATCH_2 = [
  { iso2: 'NL', name: 'Netherlands', nameZh: '荷蘭', countryId: '528', unitNameZh: '省 (Provincie)' },
  { iso2: 'BE', name: 'Belgium', nameZh: '比利時', countryId: '056', unitNameZh: '省/首都區 (Provincie / Province)' },
  { iso2: 'LS', name: 'Lesotho', nameZh: '賴索托', countryId: '426', unitNameZh: '區 (District)' },
  { iso2: 'SZ', name: 'eSwatini', nameZh: '史瓦帝尼', countryId: '748', unitNameZh: '區 (Region)' },
  { iso2: 'MT', name: 'Malta', nameZh: '馬爾他', countryId: '470', unitNameZh: '地方議會 (Local Council)' },
  { iso2: 'IL', name: 'Israel', nameZh: '以色列', countryId: '376', unitNameZh: '區 (Mehoz / District)' }
];

// Select batch via CLI: `node scripts/process-small-countries-to-l3.mjs batch2`
const BATCH_1 = [
  { iso2: 'CH', name: 'Switzerland', nameZh: '瑞士', countryId: '756', unitNameZh: '邦/州 (Canton)' },
  { iso2: 'SI', name: 'Slovenia', nameZh: '斯洛維尼亞', countryId: '705', unitNameZh: '區/市鎮 (Občina)' },
  { iso2: 'LV', name: 'Latvia', nameZh: '拉脫維亞', countryId: '428', unitNameZh: '市/市鎮 (Novads)' },
  { iso2: 'IE', name: 'Ireland', nameZh: '愛爾蘭', countryId: '372', unitNameZh: '郡 (County)' },
  { iso2: 'MK', name: 'North Macedonia', nameZh: '北馬其頓', countryId: '807', unitNameZh: '區/市鎮 (Opština)' },
  { iso2: 'LK', name: 'Sri Lanka', nameZh: '斯里蘭卡', countryId: '144', unitNameZh: '區/省 (District)' },
  { iso2: 'UY', name: 'Uruguay', nameZh: '烏拉圭', countryId: '858', unitNameZh: '省/省份 (Departamento)' },
  { iso2: 'EC', name: 'Ecuador', nameZh: '厄瓜多', countryId: '218', unitNameZh: '省/省份 (Provincia)' },
  { iso2: 'GT', name: 'Guatemala', nameZh: '瓜地馬拉', countryId: '320', unitNameZh: '省/省份 (Departamento)' },
  { iso2: 'DO', name: 'Dominican Republic', nameZh: '多明尼加', countryId: '214', unitNameZh: '省/省份 (Provincia)' },
  { iso2: 'PA', name: 'Panama', nameZh: '巴拿馬', countryId: '591', unitNameZh: '省/特區 (Provincia)' },
  { iso2: 'UG', name: 'Uganda', nameZh: '烏干達', countryId: '800', unitNameZh: '區/省 (District)' },
  { iso2: 'RW', name: 'Rwanda', nameZh: '盧安達', countryId: '646', unitNameZh: '省 (Intara)' },
  { iso2: 'BT', name: 'Bhutan', nameZh: '不丹', countryId: '064', unitNameZh: '宗/宗管轄區 (Dzongkhag)' }
];

const TARGET_COUNTRIES = process.argv[2] === 'batch2' ? BATCH_2 : BATCH_1;

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
  } catch (err) {
    console.warn('Winding normalization notice:', err);
  }
  return feature;
}

function computeBounds(features) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of features) {
    try {
      const b = pathGen.bounds(f);
      if (b && !isNaN(b[0][0]) && !isNaN(b[1][0])) {
        minX = Math.min(minX, b[0][0]);
        minY = Math.min(minY, b[0][1]);
        maxX = Math.max(maxX, b[1][0]);
        maxY = Math.max(maxY, b[1][1]);
      }
    } catch {}
  }
  return {
    minX: Math.round(minX),
    maxX: Math.round(maxX),
    minY: Math.round(minY),
    maxY: Math.round(maxY)
  };
}

async function main() {
  console.log('=== Processing 14 Small Countries: L2 -> L3 and Dissolving L2 into Country-Level ===\n');

  const newL3Entries = [];

  for (const c of TARGET_COUNTRIES) {
    const l2FilePath = path.join(l2Dir, `${c.iso2}.fgb`);
    if (!fs.existsSync(l2FilePath)) {
      console.warn(`[WARN] File not found: ${l2FilePath}`);
      continue;
    }

    const buf = fs.readFileSync(l2FilePath);
    const it = flatgeobuf.geojson.deserialize(new Uint8Array(buf));
    const originalFeatures = [];
    for await (const f of it) {
      originalFeatures.push(f);
    }

    console.log(`[${c.iso2} - ${c.name}] Loaded ${originalFeatures.length} subdivision features.`);

    // 1. Prepare L3 Features
    const l3Features = originalFeatures.map((f, idx) => {
      const p = f.properties || {};
      return {
        type: 'Feature',
        id: p.id || String(idx + 1),
        properties: {
          id: p.id || String(idx + 1),
          iso2: c.iso2,
          name: p.name || '',
          name_en: p.name_en || p.name || '',
          name_zh: p.name_zh || p.name || '',
          type_en: p.type_en || 'Subdivision',
          parent_name: c.name,
          parent_code: c.iso2,
          code: p.code || '',
          postal: p.postal || ''
        },
        geometry: f.geometry
      };
    });

    const l3CountryDir = path.join(l3Dir, c.iso2);
    if (!fs.existsSync(l3CountryDir)) {
      fs.mkdirSync(l3CountryDir, { recursive: true });
    }

    const l3FilePath = path.join(l3CountryDir, `${c.iso2}.fgb`);
    const l3Bytes = flatgeobuf.geojson.serialize({
      type: 'FeatureCollection',
      features: l3Features
    });
    fs.writeFileSync(l3FilePath, Buffer.from(l3Bytes));
    console.log(`  -> Saved L3 pack: ${l3FilePath} (${l3Features.length} features, ${(l3Bytes.length / 1024).toFixed(1)} KB)`);

    // Compute bounding box
    const bbox = computeBounds(l3Features);

    newL3Entries.push({
      iso2: c.iso2,
      countryId: c.countryId,
      name: c.name,
      nameZh: c.nameZh,
      unitNameZh: c.unitNameZh,
      subdivisionCount: l3Features.length,
      bbox,
      partitions: [
        {
          key: c.iso2,
          iso2: c.iso2,
          parentName: c.name,
          parentCode: c.iso2,
          file: `/data/l3/${c.iso2}/${c.iso2}.fgb`,
          subdivisionCount: l3Features.length,
          bbox
        }
      ]
    });

    // 2. Dissolve features for L2
    const topology = topojsonServer.topology({ fc: { type: 'FeatureCollection', features: originalFeatures } }, 1e5);
    const mergedGeom = topojsonClient.merge(topology, topology.objects.fc.geometries);

    let mergedFeature = {
      type: 'Feature',
      id: 1,
      properties: {
        id: 1,
        iso2: c.iso2,
        name: c.name,
        name_en: c.name,
        name_zh: c.nameZh,
        type_en: 'Country',
        code: c.iso2,
        postal: c.iso2
      },
      geometry: mergedGeom
    };

    mergedFeature = normalizeFeatureWinding(mergedFeature);

    const mergedBBox = computeBounds([mergedFeature]);

    // Save single merged feature to L2
    const l2Bytes = flatgeobuf.geojson.serialize({
      type: 'FeatureCollection',
      features: [mergedFeature]
    });
    fs.writeFileSync(l2FilePath, Buffer.from(l2Bytes));
    console.log(`  -> Saved L2 dissolved country: ${l2FilePath} (1 feature, ${(l2Bytes.length / 1024).toFixed(1)} KB, bbox:`, mergedBBox, `)`);
  }

  // 3. Update src/data/l2Manifest.ts subdivisionCount to 1 for these 14 countries
  let l2ManifestContent = fs.readFileSync(l2ManifestPath, 'utf8');
  for (const c of TARGET_COUNTRIES) {
    // Regex replace subdivisionCount for this country
    const reg = new RegExp(
      `("iso2":\\s*"${c.iso2}"[\\s\\S]*?"subdivisionCount":\\s*)(\\d+)`,
      'm'
    );
    l2ManifestContent = l2ManifestContent.replace(reg, '$11');
  }
  fs.writeFileSync(l2ManifestPath, l2ManifestContent, 'utf8');
  console.log(`\nUpdated ${l2ManifestPath} subdivisionCounts to 1.`);

  // 4. Update src/data/l3Manifest.ts
  let l3ManifestContent = fs.readFileSync(l3ManifestPath, 'utf8');

  // Insert newly created L3 entries into L3_MANIFEST
  const insertIndex = l3ManifestContent.indexOf('export const L3_PARTITIONS_BY_COUNTRY');
  if (insertIndex !== -1) {
    const endArrayIdx = l3ManifestContent.lastIndexOf('];', insertIndex);
    if (endArrayIdx !== -1) {
      const jsonSnippet = newL3Entries.map(e => `  ` + JSON.stringify(e, null, 2).replace(/\n/g, '\n  ')).join(',\n');
      l3ManifestContent = l3ManifestContent.slice(0, endArrayIdx) + ',\n' + jsonSnippet + '\n' + l3ManifestContent.slice(endArrayIdx);
      fs.writeFileSync(l3ManifestPath, l3ManifestContent, 'utf8');
      console.log(`Updated ${l3ManifestPath} with ${newL3Entries.length} new L3 countries.`);
    }
  }

  console.log('\n=== All 14 countries processed successfully! ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
