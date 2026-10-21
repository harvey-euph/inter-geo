import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as flatgeobuf from 'flatgeobuf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataSourceDir = path.join(rootDir, 'data-source');
const roadsSourceDir = path.join(dataSourceDir, 'roads');
const outputDir = path.join(rootDir, 'public', 'data', 'roads');
const manifestPath = path.join(rootDir, 'src', 'data', 'roadsManifest.ts');

const ROADS_URL = 'https://naciscdn.org/naturalearth/10m/cultural/ne_10m_roads_north_america.zip';

async function ensureSourceData() {
  if (!fs.existsSync(dataSourceDir)) {
    fs.mkdirSync(dataSourceDir, { recursive: true });
  }

  const zipPath = path.join(dataSourceDir, 'ne_10m_roads_north_america.zip');
  const shpPath = path.join(roadsSourceDir, 'ne_10m_roads_north_america.shp');

  if (!fs.existsSync(shpPath)) {
    if (!fs.existsSync(zipPath)) {
      console.log(`[Download] Downloading Natural Earth North America roads (~45MB)...`);
      execSync(`curl -L -o "${zipPath}" "${ROADS_URL}"`, { stdio: 'inherit' });
    }
    console.log(`[Extract] Unpacking roads shapefile...`);
    fs.mkdirSync(roadsSourceDir, { recursive: true });
    execSync(`python3 -c "import zipfile; zipfile.ZipFile('${zipPath}').extractall('${roadsSourceDir}')"`, { stdio: 'inherit' });
  }
}

function perpendicularDistance(p, p1, p2) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const d1 = p[0] - p1[0];
    const d2 = p[1] - p1[1];
    return Math.sqrt(d1 * d1 + d2 * d2);
  }
  const cross = Math.abs((p[0] - p1[0]) * dy - (p[1] - p1[1]) * dx);
  return cross / Math.sqrt(lenSq);
}

function douglasPeucker(points, epsilon) {
  if (points.length <= 2) return points;
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const rec1 = douglasPeucker(points.slice(0, index + 1), epsilon);
    const rec2 = douglasPeucker(points.slice(index), epsilon);
    return rec1.slice(0, -1).concat(rec2);
  } else {
    return [points[0], points[end]];
  }
}

async function buildUsRoads() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const shpPath = path.join(roadsSourceDir, 'ne_10m_roads_north_america.shp');
  const tempGeojsonPath = path.join(dataSourceDir, 'us_roads_clean.geojson');
  const finalFgbPath = path.join(outputDir, 'US.fgb');

  console.log('[Processing] Filtering, dissolving, and simplifying US Interstates and US Routes...');
  execSync(
    `npx mapshaper "${shpPath}" ` +
    `-filter "country == 'United States' && (d['class'] == 'Interstate' || d['class'] == 'Federal') && number != ''" ` +
    `-each "if (state === 'Oklahoma' && number === '75') { d.class = 'Federal'; prefix = 'US'; } ` +
    `if (state === 'Kentucky' && number === '27') { d.class = 'Federal'; prefix = 'US'; } ` +
    `name = prefix === 'I' ? ('I-' + number) : (prefix === 'US' ? ('US ' + number) : number)" ` +
    `-filter-fields name,class,number,prefix,type,scalerank ` +
    `-dissolve fields=class,name copy-fields=number,prefix,type,scalerank ` +
    `-simplify 5% keep-shapes ` +
    `-o format=geojson "${tempGeojsonPath}"`,
    { stdio: 'inherit' }
  );

  console.log('[Collinear Optimization] Pruning straight-line redundant points with Douglas-Peucker...');
  const geojson = JSON.parse(fs.readFileSync(tempGeojsonPath, 'utf8'));

  const EPSILON = 0.015; // ~1.7km tolerance in WGS84: eliminates micro-jitter and straight line collinear points
  let origPoints = 0;
  let simplifiedPoints = 0;

  for (const f of geojson.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'LineString') {
      origPoints += g.coordinates.length;
      g.coordinates = douglasPeucker(g.coordinates, EPSILON);
      simplifiedPoints += g.coordinates.length;
    } else if (g.type === 'MultiLineString') {
      const newLines = [];
      for (const line of g.coordinates) {
        origPoints += line.length;
        const simplified = douglasPeucker(line, EPSILON);
        if (simplified.length >= 2) {
          newLines.push(simplified);
          simplifiedPoints += simplified.length;
        }
      }
      g.coordinates = newLines;
    }
  }

  console.log(`[Optimization] Straight-line & Collinear Pruning: ${origPoints} -> ${simplifiedPoints} points (-${((1 - simplifiedPoints / origPoints) * 100).toFixed(1)}%)`);

  console.log('[FlatGeobuf] Converting to binary FlatGeobuf...');
  const bytes = flatgeobuf.geojson.serialize(geojson);
  fs.writeFileSync(finalFgbPath, Buffer.from(bytes));
  if (fs.existsSync(tempGeojsonPath)) {
    fs.unlinkSync(tempGeojsonPath);
  }

  console.log(`[Success] Saved ${geojson.features.length} US highway routes to ${finalFgbPath} (${(bytes.length / 1024 / 1024).toFixed(2)} MB)`);

  // Generate roadsManifest.ts
  const manifestContent = `/**
 * Worldwide Roads & Highway System Manifest
 * Precomputed bounding boxes and country metadata for on-demand viewport loading
 */

export interface RoadCountryManifest {
  iso2: string;
  name: string;
  nameZh: string;
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
  featureCount: number;
}

export const ROADS_MANIFEST: Record<string, RoadCountryManifest> = {
  US: {
    iso2: 'US',
    name: 'United States',
    nameZh: '美國',
    bbox: { minX: 50, maxX: 330, minY: 280, maxY: 480 },
    featureCount: ${geojson.features.length}
  }
};
`;

  fs.writeFileSync(manifestPath, manifestContent);
  console.log(`[Manifest] Generated ${manifestPath}`);
}

async function main() {
  await ensureSourceData();
  await buildUsRoads();
}

main().catch((err) => {
  console.error('[Error] Road pipeline failed:', err);
  process.exit(1);
});
