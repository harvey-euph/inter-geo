/**
 * Geo Operations Utility Script
 * 
 * Provides reusable functions and CLI commands for:
 * 1. Union adjacent subdivisions (dissolves internal borders using shared-arc topology).
 * 2. Tolerance-based straight line simplification (collinear elimination without seam cracks).
 * 3. Dynamic fine-to-coarse generalization (group aggregation, area culling, vertex reduction).
 * 
 * Usage:
 *   node scripts/geo-operations.mjs union <ISO2>
 *   node scripts/geo-operations.mjs simplify <inputPath> <outputPath> [weight]
 *   node scripts/geo-operations.mjs generalize <ISO2> [minArea]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as flatgeobuf from 'flatgeobuf';
import * as topojsonServer from 'topojson-server';
import * as topojsonSimplify from 'topojson-simplify';
import * as topojsonClient from 'topojson-client';
import { geoArea } from 'd3-geo';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const l2Dir = path.join(rootDir, 'public', 'data', 'l2');

/**
 * 1. Read features from FlatGeobuf or GeoJSON
 */
export async function readFeatures(filePath) {
  if (filePath.endsWith('.fgb')) {
    const buf = fs.readFileSync(filePath);
    const it = flatgeobuf.geojson.deserialize(new Uint8Array(buf));
    const features = [];
    for await (const f of it) {
      features.push(f);
    }
    return features;
  } else if (filePath.endsWith('.geojson') || filePath.endsWith('.json')) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data.features || (data.type === 'Feature' ? [data] : []);
  }
  throw new Error(`Unsupported format: ${filePath}`);
}

/**
 * 2. Write features to FlatGeobuf or GeoJSON
 */
export function writeFeatures(filePath, featureCollection) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (filePath.endsWith('.fgb')) {
    const bytes = flatgeobuf.geojson.serialize(featureCollection);
    fs.writeFileSync(filePath, Buffer.from(bytes));
  } else if (filePath.endsWith('.geojson') || filePath.endsWith('.json')) {
    fs.writeFileSync(filePath, JSON.stringify(featureCollection, null, 2), 'utf8');
  } else {
    throw new Error(`Unsupported output format: ${filePath}`);
  }
}

/**
 * 3. Union adjacent regions (Dissolve internal borders)
 * Uses TopoJSON arc counting:
 * Arcs shared by 2 neighboring polygons appear twice in topology and are cancelled out.
 * Arcs on the outer coastline/national border appear once and are preserved.
 * Result: 100% seam-free outer polygon in O(N) time.
 */
export async function unionSubdivisions(featuresOrIso2, options = {}) {
  let features = [];
  let countryName = 'Unknown';
  let iso2 = '';

  if (typeof featuresOrIso2 === 'string') {
    iso2 = featuresOrIso2.toUpperCase();
    const fgbPath = path.join(l2Dir, `${iso2}.fgb`);
    if (!fs.existsSync(fgbPath)) {
      throw new Error(`L2 file not found: ${fgbPath}`);
    }
    features = await readFeatures(fgbPath);
    countryName = features[0]?.properties?.name || iso2;
  } else {
    features = featuresOrIso2;
  }

  if (features.length === 0) return null;

  // Build topology with 1e5 quantization
  const topology = topojsonServer.topology({ regions: { type: 'FeatureCollection', features } }, 1e5);
  
  // Merge all geometries in the collection
  const mergedGeometry = topojsonClient.merge(topology, topology.objects.regions.geometries);

  // Optional: filter out micro-islands below minArea (in steradians)
  if (options.minArea && options.minArea > 0 && mergedGeometry.type === 'MultiPolygon') {
    mergedGeometry.coordinates = mergedGeometry.coordinates.filter((poly) => {
      try {
        return geoArea({ type: 'Polygon', coordinates: poly }) >= options.minArea;
      } catch {
        return false;
      }
    });
  }

  const mergedFeature = {
    type: 'Feature',
    id: iso2 || 1,
    properties: {
      iso2: iso2 || features[0]?.properties?.iso2 || '',
      name: countryName,
      mergedSubdivisionCount: features.length,
      isDissolved: true
    },
    geometry: mergedGeometry
  };

  return {
    type: 'FeatureCollection',
    features: [mergedFeature]
  };
}

/**
 * 4. Tolerance-based straight line & shared-arc simplification
 * Preserves topology (zero cracks/slivers) while stripping collinear/sub-pixel points.
 * @param {Array} features - Array of GeoJSON features
 * @param {number} weight - Visvalingam-Whyatt area threshold (e.g. 1e-5 to 5e-4)
 */
export function simplifyStraightLines(features, weight = 2e-4) {
  if (!features || features.length === 0) return [];

  const geojson = { type: 'FeatureCollection', features };
  // 1. Build TopoJSON topology (quantize 1e5)
  const topology = topojsonServer.topology({ collection: geojson }, 1e5);
  // 2. Pre-simplify: calculate effective triangle areas for all vertices
  const presimplified = topojsonSimplify.presimplify(topology);
  // 3. Simplify with tolerance weight
  const simplified = topojsonSimplify.simplify(presimplified, weight);
  // 4. Reconstruct GeoJSON features from simplified shared arcs
  const result = topojsonClient.feature(simplified, simplified.objects.collection);

  return result.features;
}

/**
 * 5. Generalize fine data into coarse data
 * - Groups features by parent attribute (e.g., country code or province code)
 * - Dissolves internal boundaries within each group
 * - Culls micro-islands smaller than minArea
 * - Applies topological simplification with tolerance weight
 */
export async function generalizeFineToCoarse(featuresOrPath, options = {}) {
  const {
    groupByProp = 'iso2',
    weight = 5e-4,
    minArea = 1e-5
  } = options;

  const rawFeatures = typeof featuresOrPath === 'string'
    ? await readFeatures(featuresOrPath)
    : featuresOrPath;

  // Group features by parent attribute
  const groups = new Map();
  for (const f of rawFeatures) {
    const key = f.properties?.[groupByProp] || 'DEFAULT';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }

  const generalizedFeatures = [];

  for (const [key, groupFeats] of groups.entries()) {
    // 1. Dissolve shared borders within group
    const unionFc = await unionSubdivisions(groupFeats, { minArea });
    if (!unionFc || unionFc.features.length === 0) continue;

    const feat = unionFc.features[0];
    feat.properties[groupByProp] = key;
    generalizedFeatures.push(feat);
  }

  // 2. Apply shared-arc topological simplification to the dissolved layer
  const simplifiedFeatures = simplifyStraightLines(generalizedFeatures, weight);

  return {
    type: 'FeatureCollection',
    features: simplifiedFeatures
  };
}

// CLI Execution Support
async function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
Geo Operations CLI Tool
Commands:
  union <ISO2>                     - Dissolve all L2 subdivisions of a country into 1 outer boundary
  simplify <input> <output> [wt]   - Simplify lines & collinear points with shared-arc topology
  generalize <ISO2> [minArea]      - Generalize fine L2 subdivisions into coarse L1 country boundary
Examples:
  node scripts/geo-operations.mjs union TW
  node scripts/geo-operations.mjs simplify public/data/l2/US.fgb /tmp/US-opt.fgb 0.0002
  node scripts/geo-operations.mjs generalize US 0.00001
`);
    return;
  }

  if (command === 'union') {
    const iso2 = args[1] || 'TW';
    console.log(`Unioning subdivisions for ${iso2}...`);
    const result = await unionSubdivisions(iso2, { minArea: 1e-6 });
    const outPath = path.join(rootDir, 'public', 'data', `${iso2}-outline.geojson`);
    writeFeatures(outPath, result);
    console.log(`Saved dissolved boundary to ${outPath}`);
    console.log(`Subdivisions merged: ${result.features[0].properties.mergedSubdivisionCount}`);
  } else if (command === 'simplify') {
    const inputPath = args[1];
    const outputPath = args[2];
    const weight = args[3] ? parseFloat(args[3]) : 2e-4;
    if (!inputPath || !outputPath) {
      console.error('Usage: node scripts/geo-operations.mjs simplify <input> <output> [weight]');
      process.exit(1);
    }
    console.log(`Simplifying ${inputPath} with weight ${weight}...`);
    const feats = await readFeatures(inputPath);
    const optimized = simplifyStraightLines(feats, weight);
    writeFeatures(outputPath, { type: 'FeatureCollection', features: optimized });
    console.log(`Successfully simplified ${feats.length} features to ${outputPath}`);
  } else if (command === 'generalize') {
    const iso2 = args[1] || 'US';
    const minArea = args[2] ? parseFloat(args[2]) : 1e-5;
    const inputPath = path.join(l2Dir, `${iso2}.fgb`);
    console.log(`Generalizing ${iso2} (culling area < ${minArea})...`);
    const result = await generalizeFineToCoarse(inputPath, {
      groupByProp: 'iso2',
      weight: 5e-4,
      minArea
    });
    const outPath = path.join(rootDir, 'public', 'data', `${iso2}-generalized.geojson`);
    writeFeatures(outPath, result);
    console.log(`Saved generalized coarse feature to ${outPath}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCLI().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
