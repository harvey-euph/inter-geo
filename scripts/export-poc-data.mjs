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

async function fgbToGeoJson(fgbPath) {
  const buf = fs.readFileSync(fgbPath);
  const it = flatgeobuf.geojson.deserialize(new Uint8Array(buf));
  const features = [];
  let index = 1;
  for await (const f of it) {
    features.push({
      type: 'Feature',
      id: f.id !== undefined ? f.id : index++,
      properties: f.properties || {},
      geometry: f.geometry
    });
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
