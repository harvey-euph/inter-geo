import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as flatgeobuf from 'flatgeobuf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../inter-geo-data/data');
const outDir = path.resolve(__dirname, '../public/poc-data');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

/**
 * Normalizes polygons that cross the antimeridian (180° / -180° longitude).
 * FlatGeobuf stores unclipped rings where vertices jump directly from +179° to -180°,
 * which causes MapLibre's WebGL polygon triangulator (Earcut) to connect points
 * across the entire width of the world map, generating huge horizontal boxes in
 * northern high latitudes (Russia mainland & Wrangel Island) and southern latitudes.
 */
function normalizeAntimeridian(feature) {
  if (!feature.geometry) return;
  const name = feature.properties?.name;

  // 1. Russia Mainland (poly 9) & Wrangel Island (poly 10)
  if (name === 'Russia' && feature.geometry.type === 'MultiPolygon') {
    const coords = feature.geometry.coordinates;
    const p9 = coords[9]?.[0];
    const p10 = coords[10]?.[0];

    if (p9 && p9.length >= 390 && p9[366][0] === -180 && p9[388][0] === -180) {
      const ruMainland = [
        ...p9.slice(0, 366),
        [180, p9[366][1]],
        [180, p9[388][1]],
        ...p9.slice(389)
      ];
      const ruChukotka = [
        [-180, p9[388][1]],
        ...p9.slice(366, 389)
      ];
      coords[9] = [ruMainland];
      coords[10] = [ruChukotka];
    }

    if (p10 && p10.length === 10 && p10[6][0] === -180 && p10[0][0] === -180) {
      const wrangelEast = [
        ...p10.slice(0, 7),
        p10[0]
      ];
      const wrangelWest = [
        [180, p10[6][1]],
        p10[7],
        p10[8],
        [180, p10[9][1]],
        [180, p10[6][1]]
      ];
      coords.push([wrangelWest], [wrangelEast]);
    }
  }

  // 2. Fiji: Taveuni / Vanua Levu islands crossing 180°
  if (name === 'Fiji' && feature.geometry.type === 'MultiPolygon') {
    const p1 = feature.geometry.coordinates[1]?.[0];
    if (p1 && p1.length === 11) {
      const fijiWest = [
        [180, p1[3][1]],
        p1[4],
        p1[5],
        p1[6],
        p1[7],
        p1[8],
        [180, p1[9][1]],
        [180, p1[3][1]]
      ];
      const fijiEast = [
        p1[0],
        p1[1],
        p1[2],
        p1[3],
        p1[0]
      ];
      feature.geometry.coordinates = [
        feature.geometry.coordinates[0],
        [fijiWest],
        [fijiEast]
      ];
    }
  }

  // 3. Antarctica: south pole 360-degree wrapping seam
  if (name === 'Antarctica' && feature.geometry.type === 'MultiPolygon') {
    const coords = feature.geometry.coordinates;
    const p7 = coords[7]?.[0];
    if (p7 && p7.length >= 550 && p7[0][0] === -180 && p7[552][0] === 180) {
      const westPoly = [
        ...p7.slice(0, 302),
        [0, -85.051129],
        [-180, -85.051129],
        [-180, p7[0][1]]
      ];
      const eastPoly = [
        ...p7.slice(302, 553),
        [180, -85.051129],
        [0, -85.051129],
        [0, p7[302][1]],
        p7[302]
      ];
      coords[7] = [westPoly];
      coords.push([eastPoly]);
    }
  }
}

async function fgbToGeoJson(fgbPath) {
  const buf = fs.readFileSync(fgbPath);
  const it = flatgeobuf.geojson.deserialize(new Uint8Array(buf));
  const features = [];
  let index = 1;
  for await (const f of it) {
    const feat = {
      type: 'Feature',
      id: f.id !== undefined ? f.id : index++,
      properties: f.properties || {},
      geometry: f.geometry
    };
    normalizeAntimeridian(feat);
    features.push(feat);
  }
  return {
    type: 'FeatureCollection',
    features
  };
}

async function main() {
  const tasks = [
    { src: 'COUNTRY.fgb', dst: 'world-countries.geojson' },
    { src: 'TW.fgb', dst: 'tw-subdivisions.geojson' },
    { src: 'TW-roads.fgb', dst: 'tw-roads.geojson' },
    { src: 'US.fgb', dst: 'us-states.geojson' },
    { src: 'US-roads.fgb', dst: 'us-roads.geojson' }
  ];

  for (const t of tasks) {
    const srcPath = path.join(dataDir, t.src);
    const dstPath = path.join(outDir, t.dst);
    if (fs.existsSync(srcPath)) {
      console.log(`Converting ${t.src} -> ${t.dst}...`);
      const geojson = await fgbToGeoJson(srcPath);
      fs.writeFileSync(dstPath, JSON.stringify(geojson));
      const stats = fs.statSync(dstPath);
      console.log(`  Done: ${geojson.features.length} features, ${(stats.size / 1024).toFixed(1)} KB`);
    } else {
      console.warn(`File not found: ${srcPath}`);
    }
  }
  console.log('POC data export complete!');
}

main().catch(console.error);
