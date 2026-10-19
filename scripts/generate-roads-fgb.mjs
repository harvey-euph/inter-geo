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
    `-each "name = prefix === 'I' ? ('I-' + number) : (prefix === 'US' ? ('US ' + number) : number)" ` +
    `-filter-fields name,class,number,prefix,type,scalerank ` +
    `-dissolve fields=class,name copy-fields=number,prefix,type,scalerank ` +
    `-simplify 5% keep-shapes ` +
    `-o format=geojson "${tempGeojsonPath}"`,
    { stdio: 'inherit' }
  );

  console.log('[FlatGeobuf] Converting to binary FlatGeobuf...');
  const geojson = JSON.parse(fs.readFileSync(tempGeojsonPath, 'utf8'));
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
