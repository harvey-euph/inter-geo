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
const jpDir = path.join(rootDir, 'public', 'data', 'l3', 'JP');
const manifestPath = path.join(rootDir, 'src', 'data', 'l3Manifest.ts');

const MAP_W = 1000;
const MAP_H = 1000;
const MERCATOR_SCALE = MAP_W / (2 * Math.PI);
const projection = geoMercator().scale(MERCATOR_SCALE).translate([MAP_W / 2, MAP_H / 2]);
const pathGen = geoPath().projection(projection);

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

async function main() {
  console.log('=== Merging Japan Designated Cities Administrative Wards into Parent Cities ===\n');

  const files = fs.readdirSync(jpDir)
    .filter(f => f.endsWith('.fgb'))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const updatedPartitions = new Map();
  let totalCountryCount = 0;
  let countryMinX = Infinity, countryMinY = Infinity, countryMaxX = -Infinity, countryMaxY = -Infinity;

  for (const file of files) {
    const prefId = parseInt(file.replace('.fgb', ''), 10);
    const prefKey = String(prefId);
    const filePath = path.join(jpDir, file);
    const buf = fs.readFileSync(filePath);
    const it = flatgeobuf.geojson.deserialize(new Uint8Array(buf));

    const allFeatures = [];
    for await (const f of it) {
      allFeatures.push(f);
    }

    const cityWardsMap = new Map();
    const otherFeatures = [];

    for (const f of allFeatures) {
      const gun = f.properties?.gun || '';
      if (gun.endsWith('市')) {
        if (!cityWardsMap.has(gun)) {
          cityWardsMap.set(gun, []);
        }
        cityWardsMap.get(gun).push(f);
      } else {
        otherFeatures.push(f);
      }
    }

    let finalFeatures = [];

    if (cityWardsMap.size > 0) {
      const mergedCities = [];
      for (const [cityName, wards] of cityWardsMap.entries()) {
        const firstWard = wards[0];
        const p = firstWard.properties;
        const prefName = p.pref;
        const sampleCode = String(p.code || '');
        const cityCode = sampleCode.length >= 4 ? sampleCode.slice(0, 4) + '0' : sampleCode;

        // Dissolve ward geometries using TopoJSON
        const topology = topojsonServer.topology({ wards: { type: 'FeatureCollection', features: wards } }, 1e5);
        const mergedGeom = topojsonClient.merge(topology, topology.objects.wards.geometries);

        let mergedFeature = {
          type: 'Feature',
          id: cityCode,
          properties: {
            id: cityCode,
            iso2: 'JP',
            name: cityName,
            name_en: cityName,
            name_zh: `${prefName} ${cityName}`,
            type_en: 'Municipality',
            parent_name: prefName,
            parent_code: prefKey,
            code: cityCode,
            pref_id: prefId,
            city: cityName,
            pref: prefName,
            gun: ''
          },
          geometry: mergedGeom
        };

        mergedFeature = normalizeFeatureWinding(mergedFeature);
        mergedCities.push(mergedFeature);

        console.log(`[Pref ${prefId} ${prefName}] Merged ${wards.length} wards -> ${cityName} (JIS: ${cityCode})`);
      }

      finalFeatures = [...otherFeatures, ...mergedCities];

      // Re-serialize back to FGB
      const fgbBytes = flatgeobuf.geojson.serialize({
        type: 'FeatureCollection',
        features: finalFeatures
      });
      fs.writeFileSync(filePath, Buffer.from(fgbBytes));
      console.log(`  Saved ${filePath}: ${allFeatures.length} -> ${finalFeatures.length} municipalities (${(fgbBytes.length / 1024).toFixed(1)} KB)`);
    } else {
      finalFeatures = allFeatures;
    }

    // Compute partition bounding box
    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
    for (const f of finalFeatures) {
      try {
        const bounds = pathGen.bounds(f);
        if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          pMinX = Math.min(pMinX, bounds[0][0]);
          pMinY = Math.min(pMinY, bounds[0][1]);
          pMaxX = Math.max(pMaxX, bounds[1][0]);
          pMaxY = Math.max(pMaxY, bounds[1][1]);
        }
      } catch {
        // Skip
      }
    }

    if (!isFinite(pMinX)) {
      pMinX = 840; pMaxX = 930; pMinY = 350; pMaxY = 440;
    }

    countryMinX = Math.min(countryMinX, pMinX);
    countryMinY = Math.min(countryMinY, pMinY);
    countryMaxX = Math.max(countryMaxX, pMaxX);
    countryMaxY = Math.max(countryMaxY, pMaxY);
    totalCountryCount += finalFeatures.length;

    updatedPartitions.set(prefKey, {
      subdivisionCount: finalFeatures.length,
      bbox: {
        minX: Math.round(pMinX),
        maxX: Math.round(pMaxX),
        minY: Math.round(pMinY),
        maxY: Math.round(pMaxY)
      }
    });
  }

  console.log(`\nAll 47 prefectures processed. Total municipalities: ${totalCountryCount}`);
  console.log(`Country BBox: minX=${Math.round(countryMinX)}, maxX=${Math.round(countryMaxX)}, minY=${Math.round(countryMinY)}, maxY=${Math.round(countryMaxY)}`);

  // Update src/data/l3Manifest.ts
  console.log('\nUpdating src/data/l3Manifest.ts...');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');

  // Parse the JSON data from l3Manifest.ts
  const match = manifestContent.match(/export const L3_MANIFEST:\s*L3CountryMeta\[\]\s*=\s*(\[[\s\S]*\]);\s*export const L3_PARTITIONS_BY_COUNTRY/);
  if (!match) {
    throw new Error('Failed to match L3_MANIFEST in src/data/l3Manifest.ts');
  }

  const manifestData = JSON.parse(match[1]);
  const jpEntry = manifestData.find(c => c.iso2 === 'JP');
  if (!jpEntry) {
    throw new Error('JP entry not found in L3_MANIFEST');
  }

  jpEntry.subdivisionCount = totalCountryCount;
  jpEntry.bbox = {
    minX: Math.round(countryMinX),
    maxX: Math.round(countryMaxX),
    minY: Math.round(countryMinY),
    maxY: Math.round(countryMaxY)
  };

  for (const part of jpEntry.partitions) {
    const updated = updatedPartitions.get(part.key);
    if (updated) {
      part.subdivisionCount = updated.subdivisionCount;
      part.bbox = updated.bbox;
    }
  }

  const newManifestTs = `// Auto-generated worldwide L3 Admin-2 regional partition manifest
export interface L3PartitionMeta {
  key: string;
  iso2: string;
  parentName: string;
  parentCode: string;
  file: string;
  subdivisionCount: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface L3CountryMeta {
  iso2: string;
  countryId: string;
  name: string;
  nameZh: string;
  unitNameZh: string;
  subdivisionCount: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  partitions: L3PartitionMeta[];
}

export const L3_MANIFEST: L3CountryMeta[] = ${JSON.stringify(manifestData, null, 2)};

export const L3_PARTITIONS_BY_COUNTRY: Record<string, L3PartitionMeta[]> = {};
export const L3_PARTITIONS_BY_KEY: Record<string, L3PartitionMeta> = {};

function normKey(str: string): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[\\s\\-_~]+/g, '');
}

for (const c of L3_MANIFEST) {
  L3_PARTITIONS_BY_COUNTRY[c.iso2] = c.partitions;
  for (const p of c.partitions) {
    L3_PARTITIONS_BY_KEY[\`\${c.iso2}:\${p.key}\`] = p;
    L3_PARTITIONS_BY_KEY[\`\${c.iso2}:\${normKey(p.key)}\`] = p;
    if (p.parentName) {
      L3_PARTITIONS_BY_KEY[\`\${c.iso2}:\${normKey(p.parentName)}\`] = p;
    }
    if (p.parentCode) {
      L3_PARTITIONS_BY_KEY[\`\${c.iso2}:\${normKey(p.parentCode)}\`] = p;
    }
  }
}
`;

  fs.writeFileSync(manifestPath, newManifestTs, 'utf8');
  console.log('Successfully updated src/data/l3Manifest.ts!');
}

main().catch(err => {
  console.error('Error running merge:', err);
  process.exit(1);
});
