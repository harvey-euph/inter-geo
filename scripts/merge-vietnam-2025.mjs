import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as topojsonServer from 'topojson-server';
import * as topojsonClient from 'topojson-client';
import * as flatgeobuf from 'flatgeobuf';
import { geoArea } from 'd3-geo';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const neAdmin1Path = path.join(rootDir, 'data-source', 'ne_10m_admin_1_states_provinces.geojson');
const vnL2Path = path.join(rootDir, 'public', 'data', 'l2', 'VN.fgb');
const l2ManifestPath = path.join(rootDir, 'src', 'data', 'l2Manifest.ts');

const VN_34_UNITS = [
  // 11 Centrally-run Cities & Unchanged Provinces
  {
    code: 'VN-HN',
    name: 'Hà Nội',
    nameEn: 'Hanoi',
    nameZh: '河內市',
    typeEn: 'Centrally-run City',
    sources: ['VN-HN']
  },
  {
    code: 'VN-26',
    name: 'Huế',
    nameEn: 'Hue',
    nameZh: '順化市',
    typeEn: 'Centrally-run City',
    sources: ['VN-26']
  },
  {
    code: 'VN-01',
    name: 'Lai Châu',
    nameEn: 'Lai Chau',
    nameZh: '萊州省',
    typeEn: 'Province',
    sources: ['VN-01']
  },
  {
    code: 'VN-71',
    name: 'Điện Biên',
    nameEn: 'Dien Bien',
    nameZh: '奠邊省',
    typeEn: 'Province',
    sources: ['VN-71']
  },
  {
    code: 'VN-05',
    name: 'Sơn La',
    nameEn: 'Son La',
    nameZh: '山羅省',
    typeEn: 'Province',
    sources: ['VN-05']
  },
  {
    code: 'VN-09',
    name: 'Lạng Sơn',
    nameEn: 'Lang Son',
    nameZh: '諒山省',
    typeEn: 'Province',
    sources: ['VN-09']
  },
  {
    code: 'VN-13',
    name: 'Quảng Ninh',
    nameEn: 'Quang Ninh',
    nameZh: '廣寧省',
    typeEn: 'Province',
    sources: ['VN-13']
  },
  {
    code: 'VN-21',
    name: 'Thanh Hóa',
    nameEn: 'Thanh Hoa',
    nameZh: '清化省',
    typeEn: 'Province',
    sources: ['VN-21']
  },
  {
    code: 'VN-22',
    name: 'Nghệ An',
    nameEn: 'Nghe An',
    nameZh: '乂安省',
    typeEn: 'Province',
    sources: ['VN-22']
  },
  {
    code: 'VN-23',
    name: 'Hà Tĩnh',
    nameEn: 'Ha Tinh',
    nameZh: '河靜省',
    typeEn: 'Province',
    sources: ['VN-23']
  },
  {
    code: 'VN-04',
    name: 'Cao Bằng',
    nameEn: 'Cao Bang',
    nameZh: '高平省',
    typeEn: 'Province',
    sources: ['VN-04']
  },

  // 23 Merged Units
  {
    code: 'VN-07',
    name: 'Tuyên Quang',
    nameEn: 'Tuyen Quang',
    nameZh: '宣光省',
    typeEn: 'Province',
    sources: ['VN-07', 'VN-03']
  },
  {
    code: 'VN-02',
    name: 'Lào Cai',
    nameEn: 'Lao Cai',
    nameZh: '老街省',
    typeEn: 'Province',
    sources: ['VN-02', 'VN-06']
  },
  {
    code: 'VN-69',
    name: 'Thái Nguyên',
    nameEn: 'Thai Nguyen',
    nameZh: '太原省',
    typeEn: 'Province',
    sources: ['VN-69', 'VN-53']
  },
  {
    code: 'VN-68',
    name: 'Phú Thọ',
    nameEn: 'Phu Tho',
    nameZh: '富壽省',
    typeEn: 'Province',
    sources: ['VN-68', 'VN-70', 'VN-14']
  },
  {
    code: 'VN-56',
    name: 'Bắc Ninh',
    nameEn: 'Bac Ninh',
    nameZh: '北寧省',
    typeEn: 'Province',
    sources: ['VN-56', 'VN-54']
  },
  {
    code: 'VN-66',
    name: 'Hưng Yên',
    nameEn: 'Hung Yen',
    nameZh: '興安省',
    typeEn: 'Province',
    sources: ['VN-66', 'VN-20']
  },
  {
    code: 'VN-HP',
    name: 'Hải Phòng',
    nameEn: 'Hai Phong',
    nameZh: '海防市',
    typeEn: 'Centrally-run City',
    sources: ['VN-HP', 'VN-61']
  },
  {
    code: 'VN-18',
    name: 'Ninh Bình',
    nameEn: 'Ninh Binh',
    nameZh: '寧平省',
    typeEn: 'Province',
    sources: ['VN-18', 'VN-63', 'VN-67']
  },
  {
    code: 'VN-25',
    name: 'Quảng Trị',
    nameEn: 'Quang Tri',
    nameZh: '廣治省',
    typeEn: 'Province',
    sources: ['VN-25', 'VN-24']
  },
  {
    code: 'VN-DN',
    name: 'Đà Nẵng',
    nameEn: 'Da Nang',
    nameZh: '峴港市',
    typeEn: 'Centrally-run City',
    sources: ['VN-DN', 'VN-27']
  },
  {
    code: 'VN-29',
    name: 'Quảng Ngãi',
    nameEn: 'Quang Ngai',
    nameZh: '廣義省',
    typeEn: 'Province',
    sources: ['VN-29', 'VN-28']
  },
  {
    code: 'VN-30',
    name: 'Gia Lai',
    nameEn: 'Gia Lai',
    nameZh: '嘉萊省',
    typeEn: 'Province',
    sources: ['VN-30', 'VN-31']
  },
  {
    code: 'VN-34',
    name: 'Khánh Hòa',
    nameEn: 'Khanh Hoa',
    nameZh: '慶和省',
    typeEn: 'Province',
    sources: ['VN-34', 'VN-36']
  },
  {
    code: 'VN-35',
    name: 'Lâm Đồng',
    nameEn: 'Lam Dong',
    nameZh: '林同省',
    typeEn: 'Province',
    sources: ['VN-35', 'VN-72', 'VN-40']
  },
  {
    code: 'VN-33',
    name: 'Đắk Lắk',
    nameEn: 'Dak Lak',
    nameZh: '多樂省',
    typeEn: 'Province',
    sources: ['VN-33', 'VN-32']
  },
  {
    code: 'VN-39',
    name: 'Đồng Nai',
    nameEn: 'Dong Nai',
    nameZh: '同奈省',
    typeEn: 'Province',
    sources: ['VN-39', 'VN-58']
  },
  {
    code: 'VN-SG',
    name: 'Hồ Chí Minh',
    nameEn: 'Ho Chi Minh City',
    nameZh: '胡志明市',
    typeEn: 'Centrally-run City',
    sources: ['VN-SG', 'VN-57', 'VN-43']
  },
  {
    code: 'VN-37',
    name: 'Tây Ninh',
    nameEn: 'Tay Ninh',
    nameZh: '西寧省',
    typeEn: 'Province',
    sources: ['VN-37', 'VN-41']
  },
  {
    code: 'VN-45',
    name: 'Đồng Tháp',
    nameEn: 'Dong Thap',
    nameZh: '同塔省',
    typeEn: 'Province',
    sources: ['VN-45', 'VN-46']
  },
  {
    code: 'VN-49',
    name: 'Vĩnh Long',
    nameEn: 'Vinh Long',
    nameZh: '永隆省',
    typeEn: 'Province',
    sources: ['VN-49', 'VN-50', 'VN-51']
  },
  {
    code: 'VN-CT',
    name: 'Cần Thơ',
    nameEn: 'Can Tho',
    nameZh: '芹苴市',
    typeEn: 'Centrally-run City',
    sources: ['VN-CT', 'VN-52', 'VN-73']
  },
  {
    code: 'VN-44',
    name: 'An Giang',
    nameEn: 'An Giang',
    nameZh: '安江省',
    typeEn: 'Province',
    sources: ['VN-44', 'VN-47']
  },
  {
    code: 'VN-59',
    name: 'Cà Mau',
    nameEn: 'Ca Mau',
    nameZh: '金甌省',
    typeEn: 'Province',
    sources: ['VN-59', 'VN-55']
  }
];

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
  console.log('=== Merging Vietnam 63 Provinces into 34 Administrative Units (Unified Topology) ===\n');

  const geoRaw = JSON.parse(fs.readFileSync(neAdmin1Path, 'utf8'));
  const vn63 = geoRaw.features.filter(f => f.properties.iso_a2 === 'VN');
  console.log(`Loaded ${vn63.length} original provinces from Natural Earth admin-1.`);

  // Map ISO code to index in vn63 array
  const isoToIndex = new Map();
  vn63.forEach((f, idx) => {
    isoToIndex.set(f.properties.iso_3166_2, idx);
  });

  // Build a single, shared, unquantized TopoJSON topology for all 63 Vietnam provinces
  const topology = topojsonServer.topology({ vn: { type: 'FeatureCollection', features: vn63 } });
  console.log(`Unified topology generated with ${topology.arcs.length} shared topological arcs.\n`);

  const mergedFeatures = [];
  let unitId = 1;

  for (const unit of VN_34_UNITS) {
    const geoms = unit.sources.map(s => {
      const idx = isoToIndex.get(s);
      if (idx === undefined) {
        throw new Error(`Missing source code ${s} in Natural Earth dataset!`);
      }
      return topology.objects.vn.geometries[idx];
    });

    let unitGeometry;
    if (geoms.length === 1) {
      const singleFeature = topojsonClient.feature(topology, geoms[0]);
      unitGeometry = singleFeature.geometry;
    } else {
      // Dissolve component geometries using shared arcs from the unified topology
      unitGeometry = topojsonClient.merge(topology, geoms);
    }

    let unitFeature = {
      type: 'Feature',
      id: unitId,
      properties: {
        id: unitId,
        iso2: 'VN',
        name: unit.name,
        name_en: unit.nameEn,
        name_zh: unit.nameZh,
        type_en: unit.typeEn,
        code: unit.code,
        postal: unit.code.replace('VN-', '')
      },
      geometry: unitGeometry
    };

    unitFeature = normalizeFeatureWinding(unitFeature);
    mergedFeatures.push(unitFeature);

    const mergedNames = unit.sources.map(s => vn63[isoToIndex.get(s)].properties.name).join(' + ');
    console.log(`[${unitId.toString().padStart(2, '0')}] ${unit.name} (${unit.code}, ${unit.nameZh}) <- [${mergedNames}]`);
    unitId++;
  }

  console.log(`\nSuccessfully created ${mergedFeatures.length} consolidated administrative units.`);

  // Serialize to FlatGeobuf
  const fgbBytes = flatgeobuf.geojson.serialize({
    type: 'FeatureCollection',
    features: mergedFeatures
  });

  fs.writeFileSync(vnL2Path, Buffer.from(fgbBytes));
  console.log(`Saved updated VN.fgb: ${(fgbBytes.length / 1024).toFixed(1)} KB.`);

  // Update src/data/l2Manifest.ts for VN subdivisionCount: 34
  let l2ManifestContent = fs.readFileSync(l2ManifestPath, 'utf8');
  const vnReg = /("iso2":\s*"VN"[\s\S]*?"subdivisionCount":\s*)(\d+)/m;
  l2ManifestContent = l2ManifestContent.replace(vnReg, '$134');
  fs.writeFileSync(l2ManifestPath, l2ManifestContent, 'utf8');
  console.log(`Updated ${l2ManifestPath}: VN subdivisionCount set to 34.`);

  console.log('\n=== Vietnam administrative consolidation complete! ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
