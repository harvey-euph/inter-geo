import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { geoMercator, geoPath } from 'd3-geo';
import * as flatgeobuf from 'flatgeobuf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataSourceDir = path.join(rootDir, 'data-source');
const outputDir = path.join(rootDir, 'public', 'data', 'roads');
const manifestPath = path.join(rootDir, 'src', 'data', 'roadsManifest.ts');

const MAP_W = 1200;
const MAP_H = 800;
const MERCATOR_SCALE = MAP_W / (2 * Math.PI);
const projection = geoMercator().scale(MERCATOR_SCALE).translate([MAP_W / 2, MAP_H / 2]);
const pathGen = geoPath().projection(projection);

function getCountryLookup() {
  const countriesTs = fs.readFileSync(path.join(rootDir, 'src', 'data', 'countries.ts'), 'utf8');
  const lookup = new Map();
  // Regex to extract iso2, name, nameZh
  const blocks = countriesTs.split(/\{\s*id:/);
  for (const block of blocks) {
    const iso2Match = block.match(/iso2:\s*['"]([A-Z0-9_-]+)['"]/);
    const nameMatch = block.match(/name:\s*['"]([^'"]+)['"]/);
    const nameZhMatch = block.match(/nameZh:\s*['"]([^'"]+)['"]/);
    if (iso2Match && nameMatch) {
      lookup.set(iso2Match[1], {
        iso2: iso2Match[1],
        name: nameMatch[1],
        nameZh: nameZhMatch ? nameZhMatch[1] : nameMatch[1]
      });
    }
  }
  return lookup;
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

async function run() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('[1/4] Loading global roads joined GeoJSON...');
  const geojsonPath = path.join(dataSourceDir, 'global_roads_joined.geojson');
  const globalGeojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

  const countryLookup = getCountryLookup();

  // Group features by ISO2
  console.log('[2/4] Partitioning roads by country...');
  const byCountry = new Map();

  for (const f of globalGeojson.features) {
    const iso2 = f.properties.iso_a2;
    if (!iso2 || iso2 === '-1' || iso2 === 'US') continue; // US is generated separately with high detail

    let list = byCountry.get(iso2);
    if (!list) {
      list = [];
      byCountry.set(iso2, list);
    }
    list.push(f);
  }

  const manifestEntries = [];

  // Add US entry if US.fgb exists
  const usFgbPath = path.join(outputDir, 'US.fgb');
  if (fs.existsSync(usFgbPath)) {
    manifestEntries.push({
      iso2: 'US',
      name: 'United States',
      nameZh: '美國',
      bbox: { minX: 50, maxX: 330, minY: 280, maxY: 480 },
      featureCount: 564
    });
  }

  const EPSILON = 0.015;

  console.log(`[3/4] Processing and serializing roads for ${byCountry.size} countries...`);
  let totalSavedFeatures = 0;

  for (const [iso2, features] of byCountry.entries()) {
    const cMeta = countryLookup.get(iso2);
    const name = cMeta?.name || iso2;
    const nameZh = cMeta?.nameZh || iso2;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const cleanedFeatures = [];

    for (const f of features) {
      const g = f.geometry;
      if (!g || !g.coordinates) continue;

      // Simplify line coordinates
      if (g.type === 'LineString') {
        g.coordinates = douglasPeucker(g.coordinates, EPSILON);
        if (g.coordinates.length < 2) continue;
      } else if (g.type === 'MultiLineString') {
        const newLines = [];
        for (const line of g.coordinates) {
          const simplified = douglasPeucker(line, EPSILON);
          if (simplified.length >= 2) {
            newLines.push(simplified);
          }
        }
        if (newLines.length === 0) continue;
        g.coordinates = newLines;
      }

      // Compute bounding box
      try {
        const bounds = pathGen.bounds(f);
        if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          if (bounds[0][0] < minX) minX = bounds[0][0];
          if (bounds[0][1] < minY) minY = bounds[0][1];
          if (bounds[1][0] > maxX) maxX = bounds[1][0];
          if (bounds[1][1] > maxY) maxY = bounds[1][1];
        }
      } catch {
        // fallback
      }

      const p = f.properties;
      const isExpressway =
        p.expressway === 1 ||
        p.type === 'Major Highway' ||
        p.type === 'Beltway' ||
        p.level === 'E' ||
        p.class === 'Interstate';
      const roadClass = isExpressway ? 'Interstate' : 'Federal';

      const rawName = p.label || p.local || p.label2 || p.name || '';
      const fallbackName = rawName || (isExpressway ? `${nameZh} 高速公路` : `${nameZh} 主要公路`);
      const prefix = p.prefix || (rawName ? rawName.replace(/[0-9]/g, '').trim() : '');
      const number = p.name || (rawName ? rawName.replace(/[^0-9]/g, '').trim() : '');

      cleanedFeatures.push({
        type: 'Feature',
        geometry: g,
        properties: {
          name: fallbackName,
          class: roadClass,
          number,
          prefix,
          type: String(p.type || ''),
          scalerank: Number(p.scalerank || 0)
        }
      });
    }

    if (cleanedFeatures.length === 0) continue;
    if (minX === Infinity) {
      minX = 0; minY = 0; maxX = 1000; maxY = 1000;
    }

    const countryGeojson = {
      type: 'FeatureCollection',
      features: cleanedFeatures
    };

    const bytes = flatgeobuf.geojson.serialize(countryGeojson);
    const destPath = path.join(outputDir, `${iso2}.fgb`);
    fs.writeFileSync(destPath, Buffer.from(bytes));

    manifestEntries.push({
      iso2,
      name,
      nameZh,
      bbox: {
        minX: Math.round(minX),
        maxX: Math.round(maxX),
        minY: Math.round(minY),
        maxY: Math.round(maxY)
      },
      featureCount: cleanedFeatures.length
    });

    totalSavedFeatures += cleanedFeatures.length;
  }

  console.log(`[4/4] Writing roadsManifest.ts for ${manifestEntries.length} countries (${totalSavedFeatures} total features)...`);

  // Sort manifest by country name
  manifestEntries.sort((a, b) => a.name.localeCompare(b.name));

  let manifestTs = `/**
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
`;

  for (const entry of manifestEntries) {
    manifestTs += `  ${JSON.stringify(entry.iso2)}: ${JSON.stringify(entry, null, 2)},\n`;
  }

  manifestTs += `};\n`;

  fs.writeFileSync(manifestPath, manifestTs);
  console.log(`[Success] Successfully generated road datasets and manifest at ${manifestPath}!`);
}

run().catch((err) => {
  console.error('[Error] Pipeline failed:', err);
  process.exit(1);
});
