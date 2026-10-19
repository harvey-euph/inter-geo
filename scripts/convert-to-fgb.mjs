import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as topojson from 'topojson-client';
import { geoArea } from 'd3-geo';
import * as flatgeobuf from 'flatgeobuf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'public', 'data');

// 47 JIS Prefecture names mapped to 1..47
const PREF_NAME_TO_ID = {
  '北海道': 1, '青森県': 2, '岩手県': 3, '宮城県': 4,
  '秋田県': 5, '山形県': 6, '福島県': 7, '茨城県': 8,
  '栃木県': 9, '群馬県': 10, '埼玉県': 11, '千葉県': 12,
  '東京都': 13, '神奈川県': 14, '新潟県': 15, '富山県': 16,
  '石川県': 17, '福井県': 18, '山梨県': 19, '長野県': 20,
  '岐阜県': 21, '静岡県': 22, '愛知県': 23, '三重県': 24,
  '滋賀県': 25, '京都府': 26, '大阪府': 27, '兵庫県': 28,
  '奈良県': 29, '和歌山県': 30, '鳥取県': 31, '島根県': 32,
  '岡山県': 33, '広島県': 34, '山口県': 35, '徳島県': 36,
  '香川県': 37, '愛媛県': 38, '高知県': 39, '福岡県': 40,
  '佐賀県': 41, '長崎県': 42, '熊本県': 43, '大分県': 44,
  '宮崎県': 45, '鹿児島県': 46, '沖縄県': 47
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
  } catch (err) {
    console.warn('Winding normalization notice:', err);
  }
  return feature;
}

async function convertPrefectures() {
  console.log('--- Converting L2 Japan Prefectures ---');
  const inputPath = path.join(dataDir, 'japan-prefectures.json');
  const outputPath = path.join(dataDir, 'japan-prefectures.fgb');

  const topoData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const geojson = topojson.feature(topoData, topoData.objects.japan);

  geojson.features = geojson.features.map((f) => {
    const normalized = normalizeFeatureWinding(f);
    const prefId = Number(normalized.properties?.id);
    normalized.properties = {
      id: prefId,
      nam: String(normalized.properties?.nam || ''),
      nam_ja: String(normalized.properties?.nam_ja || '')
    };
    return normalized;
  });

  const fgbBytes = flatgeobuf.geojson.serialize(geojson);
  fs.writeFileSync(outputPath, Buffer.from(fgbBytes));
  console.log(`Saved ${geojson.features.length} prefectures to ${outputPath} (${(fgbBytes.length / 1024).toFixed(1)} KB)`);
}

async function convertMunicipalities() {
  console.log('--- Converting L3 Japan Municipalities ---');
  const inputPath = path.join(dataDir, 'japan-municipalities.json');
  const outputPath = path.join(dataDir, 'japan-municipalities.fgb');

  const topoData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const geojson = topojson.feature(topoData, topoData.objects.municipalities);

  geojson.features = geojson.features.map((f) => {
    const normalized = normalizeFeatureWinding(f);
    const prefName = String(normalized.properties?.pref || '');
    const prefId = PREF_NAME_TO_ID[prefName] || 0;
    
    let codeStr = normalized.properties?.code ? String(normalized.properties.code) : '';
    if (!codeStr) {
      // Synthetic code for unassigned areas (e.g. 12999 for Chiba)
      codeStr = `${String(prefId).padStart(2, '0')}999`;
    }
    const codeInt = parseInt(codeStr, 10);

    normalized.properties = {
      code: codeStr,
      code_int: codeInt,
      pref_id: prefId,
      pref: prefName,
      city: String(normalized.properties?.city || ''),
      gun: String(normalized.properties?.gun || '')
    };
    return normalized;
  });

  const fgbBytes = flatgeobuf.geojson.serialize(geojson);
  fs.writeFileSync(outputPath, Buffer.from(fgbBytes));
  console.log(`Saved ${geojson.features.length} municipalities to ${outputPath} (${(fgbBytes.length / 1024).toFixed(1)} KB)`);
}

async function verifyFiles() {
  console.log('--- Verifying Converted FlatGeobuf Files ---');
  const prefBytes = fs.readFileSync(path.join(dataDir, 'japan-prefectures.fgb'));
  let prefCount = 0;
  for await (const feature of flatgeobuf.geojson.deserialize(new Uint8Array(prefBytes))) {
    prefCount++;
    if (prefCount === 1) {
      console.log('Sample L2 Pref feature properties:', feature.properties);
    }
  }
  console.log(`Verified ${prefCount} prefectures from FGB binary.`);

  const muniBytes = fs.readFileSync(path.join(dataDir, 'japan-municipalities.fgb'));
  let muniCount = 0;
  for await (const feature of flatgeobuf.geojson.deserialize(new Uint8Array(muniBytes))) {
    muniCount++;
    if (muniCount === 1) {
      console.log('Sample L3 Muni feature properties:', feature.properties);
    }
  }
  console.log(`Verified ${muniCount} municipalities from FGB binary.`);
}

async function main() {
  try {
    await convertPrefectures();
    await convertMunicipalities();
    await verifyFiles();
    console.log('Conversion and verification completed successfully!');
  } catch (err) {
    console.error('Conversion error:', err);
    process.exit(1);
  }
}

main();
