import * as flatgeobuf from 'flatgeobuf';
import fs from 'fs';
import path from 'path';
import { FeatureRegistry } from '../src/map/data/FeatureRegistry.ts';
import { AdministrativeHierarchy } from '../src/map/data/AdministrativeHierarchy.ts';
import { ProjectionController } from '../src/map/ProjectionController.ts';
import { FeatureStateManager } from '../src/map/interaction/FeatureStateManager.ts';
import { GeometryLODManager } from '../src/map/lod/GeometryLODManager.ts';
import { splitRingAtAntimeridian, normalizeAntimeridianGeometry } from '../src/map/geo/antimeridian.ts';

console.log('=== Running InterGeo MapLibre Refactoring Verification ===\n');

let failed = 0;
function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    failed++;
  } else {
    console.log('✅ PASS:', message);
  }
}

// 1. Feature Registry & Canonical IDs
const registry = new FeatureRegistry();
const id0 = FeatureRegistry.createId(0, 'JP', '');
const id1 = FeatureRegistry.createId(1, 'JP', '22');
const id2 = FeatureRegistry.createId(2, 'JP', '22130');

assert(id0 === 'ADM0_JP', 'Canonical ADM0 ID format');
assert(id1 === 'ADM1_JP_22', 'Canonical ADM1 ID format');
assert(id2 === 'ADM2_JP_22130', 'Canonical ADM2 ID format');

// 2. FGB Loading & Deserialization
const jpBuffer = fs.readFileSync('../inter-geo-data/data/JP.fgb');
const it1 = flatgeobuf.geojson.deserialize(new Uint8Array(jpBuffer));
const prefectures = [];
for await (const f of it1) {
  const p = f.properties;
  const canonical = {
    type: 'Feature',
    geometry: f.geometry,
    properties: {
      feature_id: FeatureRegistry.createId(1, 'JP', p.code || p.id),
      numeric_id: 0,
      admin_level: 1,
      country_code: 'JP',
      parent_id: 'ADM0_JP',
      name: p.name,
      name_en: p.name_en,
      name_zh: p.name_zh,
      code: String(p.code || p.id),
      bbox: AdministrativeHierarchy.calculateBBox(f.geometry),
      center: AdministrativeHierarchy.calculateCenter(f.geometry)
    }
  };
  registry.register(canonical);
  prefectures.push(canonical);
}

assert(prefectures.length === 47, `Loaded 47 Japanese prefectures (got ${prefectures.length})`);

// 3. Shizuoka Prefecture (Pref 22)
const shizuoka = registry.getById('ADM1_JP_22');
assert(Boolean(shizuoka), 'Found Shizuoka Prefecture in registry');
assert(shizuoka.properties.name_en === 'Shizuoka', 'Shizuoka name_en matches');
assert(shizuoka.properties.name_zh === '靜岡縣', 'Shizuoka name_zh matches');

const subDetail = AdministrativeHierarchy.toSubdivisionDetail(shizuoka);
assert(subDetail.nameZh === '靜岡縣' && subDetail.iso2 === 'JP', 'AdministrativeHierarchy.toSubdivisionDetail conversion');

// 4. Municipalities (ADM2) for Shizuoka
const pref22Buffer = fs.readFileSync('../inter-geo-data/data/JP/22.fgb');
const it2 = flatgeobuf.geojson.deserialize(new Uint8Array(pref22Buffer));
const municipalities = [];
for await (const f of it2) {
  const p = f.properties;
  const canonical = {
    type: 'Feature',
    geometry: f.geometry,
    properties: {
      feature_id: FeatureRegistry.createId(2, 'JP', p.code || p.id),
      numeric_id: 0,
      admin_level: 2,
      country_code: 'JP',
      parent_id: 'ADM1_JP_22',
      name: p.name,
      name_zh: p.name_zh,
      code: String(p.code || p.id),
      city: p.city,
      pref: p.pref,
      bbox: AdministrativeHierarchy.calculateBBox(f.geometry),
      center: AdministrativeHierarchy.calculateCenter(f.geometry)
    }
  };
  registry.register(canonical);
  municipalities.push(canonical);
}

assert(municipalities.length === 35, `Loaded 35 municipalities in Shizuoka (got ${municipalities.length})`);

// 5. Hamamatsu City (Code 22130)
const hamamatsu = registry.getById('ADM2_JP_22130');
assert(Boolean(hamamatsu), 'Found Hamamatsu City in registry');
assert(hamamatsu.properties.city === '浜松市', 'Hamamatsu city name matches');
const muniDetail = AdministrativeHierarchy.toMunicipalityDetail(hamamatsu);
assert(muniDetail.code === '22130' && muniDetail.city === '浜松市', 'AdministrativeHierarchy.toMunicipalityDetail conversion');

// 6. Hierarchy Navigation (Parent <-> Children)
const shizuokaChildren = registry.getChildren('ADM1_JP_22');
assert(shizuokaChildren.length === 35, `Children of Shizuoka in registry: 35 (got ${shizuokaChildren.length})`);
assert(shizuokaChildren.some(m => m.properties.feature_id === 'ADM2_JP_22130'), 'Hamamatsu is among Shizuoka children');

// 7. ProjectionController
const proj = new ProjectionController('2d');
assert(proj.getMode() === '2d', 'Initial projection mode is 2d');
let notified = null;
proj.subscribe((m) => { notified = m; });
proj.toggle();
assert(proj.getMode() === '3d', 'Toggled projection mode to 3d');
assert(notified === '3d', 'Subscriber received 3d notification');
proj.toggle();
assert(proj.getMode() === '2d', 'Toggled back to 2d');
assert(notified === '2d', 'Subscriber received 2d notification');

// 8. FeatureStateManager
const stateMgr = new FeatureStateManager();
stateMgr.setHover({ source: 'adm1-source', id: 'ADM1_JP_22' });
assert(stateMgr.getState().hoveredFeature?.id === 'ADM1_JP_22', 'Hover state set independently of projection');
stateMgr.setSelected({ source: 'adm2-source', id: 'ADM2_JP_22130' });
assert(stateMgr.getState().selectedFeature?.id === 'ADM2_JP_22130', 'Selected state set independently of projection');

// 9. LOD Thresholds
assert(GeometryLODManager.getLODForZoom(2) === 0, 'Zoom 2 -> LOD 0 (ADM0)');
assert(GeometryLODManager.getLODForZoom(5) === 1, 'Zoom 5 -> LOD 1 (ADM1)');
assert(GeometryLODManager.getLODForZoom(9) === 2, 'Zoom 9 -> LOD 2 (ADM2)');

// 10. Antimeridian Geometry Normalization (eliminates lines circling the globe)
const testRing = [
  [179, 10],
  [-179, 10],
  [179, 12],
  [179, 10]
];
const splitSynthetic = splitRingAtAntimeridian(testRing);
assert(splitSynthetic.length === 2, 'Synthetic triangle across antimeridian splits into 2 rings');
for (const ring of splitSynthetic) {
  let maxDx = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    maxDx = Math.max(maxDx, Math.abs(ring[i + 1][0] - ring[i][0]));
  }
  assert(maxDx <= 1.0, `Synthetic split ring max dx is <= 1.0 deg (got ${maxDx.toFixed(2)})`);
}

// Verify real-world COUNTRY.fgb antimeridian normalization
const countryBuffer = fs.readFileSync('../inter-geo-data/data/COUNTRY.fgb');
const itCountry = flatgeobuf.geojson.deserialize(new Uint8Array(countryBuffer));
let totalNormalizedCrossings = 0;
let fijiMaxDx = 0;
let russiaMaxDx = 0;
let antarcticaMaxDx = 0;

for await (const f of itCountry) {
  const norm = normalizeAntimeridianGeometry(f.geometry);
  const polys = norm.type === 'Polygon' ? [norm.coordinates] : (norm.type === 'MultiPolygon' ? norm.coordinates : []);
  for (const poly of polys) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length - 1; i++) {
        const dx = Math.abs(ring[i + 1][0] - ring[i][0]);
        if (dx > 180) {
          totalNormalizedCrossings++;
        }
        if (f.properties?.name === 'Fiji') fijiMaxDx = Math.max(fijiMaxDx, dx);
        if (f.properties?.name === 'Russia') russiaMaxDx = Math.max(russiaMaxDx, dx);
        if (f.properties?.name === 'Antarctica') antarcticaMaxDx = Math.max(antarcticaMaxDx, dx);
      }
    }
  }
}

assert(totalNormalizedCrossings === 0, 'Zero antimeridian crossings across entire COUNTRY.fgb');
assert(fijiMaxDx < 1.0, `Fiji normalized max consecutive dx < 1.0 deg (got ${fijiMaxDx.toFixed(2)})`);
assert(russiaMaxDx < 10.0, `Russia normalized max consecutive dx < 10.0 deg (got ${russiaMaxDx.toFixed(2)})`);
assert(antarcticaMaxDx <= 90.0, `Antarctica normalized max consecutive dx <= 90.0 deg (got ${antarcticaMaxDx.toFixed(2)})`);

console.log('\n=== Summary ===');
if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED! Verification completed successfully.');
} else {
  console.error(`💥 ${failed} tests failed.`);
  process.exit(1);
}
