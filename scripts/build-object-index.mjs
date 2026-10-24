/**
 * Build-time object catalog.
 * Physical files stay where the loaders fetch them:
 *   public/data/l2/{ISO}.fgb      → logical {ISO}.l2.fgb
 *   public/data/roads/{ISO}.fgb   → logical {ISO}.roads.fgb
 *   public/data/objects/{ISO}.{role}.fgb → logical {ISO}.{role}.fgb
 *   src/data/taiwanPowerPoles.ts  → logical TW.grid
 * Id rules match src/objects/objectId.ts.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as flatgeobuf from 'flatgeobuf';

const SCRIPT_PATH = fileURLToPath(import.meta.url);

function formatObjectId(parent, local) {
  const loc = String(local || '').trim();
  const ns = String(parent || '').trim();
  if (!ns) return loc;
  if (!loc) return ns;
  return `${ns}::${loc}`;
}

function localFromSubdivisionCode(iso2, code) {
  const iso = String(iso2 || '').trim().toUpperCase();
  const raw = String(code || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  const prefix = `${iso}-`;
  if (upper.startsWith(prefix)) return upper.slice(prefix.length);
  if (/^\d+$/.test(raw)) return String(parseInt(raw, 10));
  return upper;
}

function localFromRoadName(iso2, name) {
  const iso = String(iso2 || '').trim().toUpperCase();
  const raw = String(name || '').trim();
  if (!raw) return 'ROAD';
  if (iso === 'US') {
    const fed = raw.match(/^US\s+(.+)$/i);
    if (fed) return `US-${fed[1].trim().replace(/\s+/g, '-')}`;
    const interstate = raw.match(/^I[-\s]?(\d[\w-]*)$/i);
    if (interstate) return `I-${interstate[1]}`;
  }
  const spaced = raw.match(/^([A-Za-z]{1,6})\s+(\d[\w-]*)$/);
  if (spaced) return `${spaced[1].toUpperCase()}-${spaced[2]}`;
  const compact = raw.replace(/\s+/g, '');
  if (/^[A-Za-z]{0,6}\d[\w-]*$/.test(compact) && compact.length <= 16) {
    return compact.toUpperCase();
  }
  const slug = raw.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]+/gu, '');
  return slug || 'ROAD';
}

function slugLocal(text) {
  const slug = String(text || '').trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]+/gu, '');
  return slug || 'OBJECT';
}

function parseIsoNameMap(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) return map;
  const text = fs.readFileSync(filePath, 'utf8');
  const re = /"iso2":\s*"([A-Z0-9]{2})"[\s\S]*?"name":\s*"((?:\\.|[^"\\])*)"[\s\S]*?"nameZh":\s*"((?:\\.|[^"\\])*)"/g;
  let match;
  while ((match = re.exec(text))) {
    map.set(match[1], {
      name: JSON.parse(`"${match[2]}"`),
      nameZh: JSON.parse(`"${match[3]}"`)
    });
  }
  return map;
}

function listFgb(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith('.fgb'))
    .sort()
    .map((name) => path.join(dir, name));
}

function collectInputs(root) {
  const files = [
    ...listFgb(path.join(root, 'public/data/l2')),
    ...listFgb(path.join(root, 'public/data/roads')),
    ...listFgb(path.join(root, 'public/data/objects')),
    path.join(root, 'src/data/taiwanPowerPoles.ts'),
    path.join(root, 'src/data/l2Manifest.ts'),
    path.join(root, 'src/data/roadsManifest.ts'),
    SCRIPT_PATH
  ];
  return files.filter((file) => fs.existsSync(file));
}

function signatureFor(files) {
  const hash = crypto.createHash('sha1');
  for (const file of files) {
    const stat = fs.statSync(file);
    hash.update(`${file}:${stat.mtimeMs}:${stat.size}\n`);
  }
  return hash.digest('hex');
}

async function forEachProps(file, visit) {
  const buf = new Uint8Array(fs.readFileSync(file));
  for await (const feature of flatgeobuf.geojson.deserialize(buf)) {
    visit(feature.properties || {});
  }
}

function readGridZones(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const re = /letter:\s*'([A-Z])',\s*nameZh:\s*'([^']*)',\s*nameEn:\s*'([^']*)'/g;
  const zones = [];
  let match;
  while ((match = re.exec(text))) {
    zones.push({ letter: match[1], nameZh: match[2], nameEn: match[3] });
  }
  return zones;
}

function inferKind(role, props) {
  const declared = String(props.kind || '').toLowerCase();
  if (declared === 'road' || declared === 'subdivision' || declared === 'grid' || declared === 'object' || declared === 'country') {
    return declared;
  }
  const normalized = role.toLowerCase();
  if (
    normalized === 'roads' ||
    normalized === 'road' ||
    normalized.includes('interstate') ||
    props.class === 'Interstate' ||
    props.class === 'Federal'
  ) {
    return 'road';
  }
  if (normalized === 'grid') return 'grid';
  if (normalized === 'l2' || normalized === 'subdivision' || props.code || props.name_en || props.iso_3166_2) {
    return 'subdivision';
  }
  return 'object';
}

let memory = null;

export async function buildObjectIndex(rootDir) {
  const root = path.resolve(rootDir);
  const inputs = collectInputs(root);
  const signature = signatureFor(inputs);
  if (memory && memory.root === root && memory.signature === signature) return memory.index;

  const cacheFile = path.join(root, 'node_modules/.cache/intergeo-objects.json');
  if (fs.existsSync(cacheFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (parsed.signature === signature && parsed.index?.countries && parsed.index?.objects) {
        memory = { root, signature, index: parsed.index };
        return parsed.index;
      }
    } catch {
      // Rebuild when the cache file is unreadable.
    }
  }

  const started = Date.now();
  const index = await scanObjectIndex(root);
  memory = { root, signature, index };
  try {
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify({ signature, index }));
  } catch (err) {
    console.warn('[objects] cache write failed:', err instanceof Error ? err.message : err);
  }
  const counts = { country: 0, subdivision: 0, road: 0, grid: 0, object: 0 };
  for (const obj of index.objects) counts[obj.kind] = (counts[obj.kind] || 0) + 1;
  console.log(
    `[objects] ${index.countries.length} countries, ${counts.subdivision} subdivisions, ${counts.road} roads, ${counts.grid} grid, ${counts.object} supplemental (${Date.now() - started} ms)`
  );
  return index;
}

async function scanObjectIndex(root) {
  const l2Names = parseIsoNameMap(path.join(root, 'src/data/l2Manifest.ts'));
  const roadNames = parseIsoNameMap(path.join(root, 'src/data/roadsManifest.ts'));
  const countries = new Map();
  const byId = new Map();

  const ensureCountry = (iso2) => {
    const iso = iso2.toUpperCase();
    let country = countries.get(iso);
    if (!country) {
      const meta = l2Names.get(iso) || roadNames.get(iso) || { name: iso, nameZh: iso };
      country = { iso2: iso, name: meta.name, nameZh: meta.nameZh, sourceKeys: [] };
      countries.set(iso, country);
    } else if (country.name === iso && l2Names.has(iso)) {
      const meta = l2Names.get(iso);
      country.name = meta.name;
      country.nameZh = meta.nameZh;
    }
    return country;
  };

  const addSource = (iso2, sourceKey) => {
    const country = ensureCountry(iso2);
    if (!country.sourceKeys.includes(sourceKey)) country.sourceKeys.push(sourceKey);
  };

  const putObject = (obj) => {
    const key = obj.id.toUpperCase();
    const prev = byId.get(key);
    if (!prev) {
      byId.set(key, obj);
      return;
    }
    if (prev.kind === obj.kind && prev.name === obj.name) return;
    let n = 2;
    let nextId = `${obj.id}-${n}`;
    while (byId.has(nextId.toUpperCase())) {
      n += 1;
      nextId = `${obj.id}-${n}`;
    }
    obj.id = nextId;
    obj.code = nextId.split('::')[1] || obj.code;
    byId.set(nextId.toUpperCase(), obj);
  };

  const addSubdivision = (iso, props, sourceKey, sourceFile) => {
    const codeRaw = String(props.code || props.iso_3166_2 || '').trim();
    const idRaw = props.id == null ? '' : String(props.id).trim();
    let local = localFromSubdivisionCode(iso, codeRaw);
    if (!local) local = localFromSubdivisionCode(iso, idRaw);
    if (!local) local = slugLocal(props.name_en || props.name || props.name_zh || '');
    const name = String(props.name || props.nam_ja || props.name_en || local);
    const nameEn = String(props.name_en || name);
    const nameZh = String(props.name_zh || name);
    const extras = [];
    const nameJa = props.nam_ja ? String(props.nam_ja) : '';
    if (nameJa && nameJa !== name && nameJa !== nameEn && nameJa !== nameZh) extras.push(nameJa);
    const record = {
      id: formatObjectId(iso, local),
      kind: 'subdivision',
      parentId: iso,
      name,
      nameEn,
      nameZh,
      code: local,
      sourceKey,
      sourceFile
    };
    if (extras.length > 0) record.aliases = extras;
    putObject(record);
  };

  const addRoad = (iso, props, sourceKey, sourceFile) => {
    const name = String(props.name || '').trim();
    if (!name) return;
    const local = localFromRoadName(iso, name);
    putObject({
      id: formatObjectId(iso, local),
      kind: 'road',
      parentId: iso,
      name,
      nameEn: name,
      nameZh: name,
      code: local,
      sourceKey,
      sourceFile
    });
  };

  for (const file of listFgb(path.join(root, 'public/data/l2'))) {
    const iso = path.basename(file, '.fgb').toUpperCase();
    if (!/^[A-Z0-9]{2}$/.test(iso)) continue;
    const sourceKey = `${iso}.l2.fgb`;
    const sourceFile = `public/data/l2/${iso}.fgb`;
    addSource(iso, sourceKey);
    await forEachProps(file, (props) => addSubdivision(iso, props, sourceKey, sourceFile));
  }

  for (const file of listFgb(path.join(root, 'public/data/roads'))) {
    const iso = path.basename(file, '.fgb').toUpperCase();
    if (!/^[A-Z0-9]{2}$/.test(iso)) continue;
    const sourceKey = `${iso}.roads.fgb`;
    const sourceFile = `public/data/roads/${iso}.fgb`;
    addSource(iso, sourceKey);
    await forEachProps(file, (props) => addRoad(iso, props, sourceKey, sourceFile));
  }

  for (const file of listFgb(path.join(root, 'public/data/objects'))) {
    const base = path.basename(file);
    const match = base.match(/^([A-Za-z0-9]{2})\.(.+)\.fgb$/);
    if (!match) continue;
    const iso = match[1].toUpperCase();
    const role = match[2];
    const sourceKey = `${iso}.${role}.fgb`;
    const sourceFile = `public/data/objects/${base}`;
    addSource(iso, sourceKey);
    await forEachProps(file, (props) => {
      const kind = inferKind(role, props);
      if (kind === 'road') addRoad(iso, props, sourceKey, sourceFile);
      else if (kind === 'subdivision') addSubdivision(iso, props, sourceKey, sourceFile);
      else {
        const codeRaw = String(props.code || props.id || props.name || role);
        const local = localFromSubdivisionCode(iso, codeRaw) || slugLocal(codeRaw);
        const name = String(props.name || props.name_en || local);
        putObject({
          id: formatObjectId(iso, local),
          kind: kind === 'country' ? 'object' : kind,
          parentId: iso,
          name,
          nameEn: String(props.name_en || name),
          nameZh: String(props.name_zh || name),
          code: local,
          sourceKey,
          sourceFile
        });
      }
    });
  }

  const gridFile = path.join(root, 'src/data/taiwanPowerPoles.ts');
  if (fs.existsSync(gridFile)) {
    addSource('TW', 'TW.grid');
    for (const zone of readGridZones(gridFile)) {
      const local = `TP-${zone.letter}`;
      putObject({
        id: formatObjectId('TW', local),
        kind: 'grid',
        parentId: 'TW',
        name: zone.nameZh,
        nameEn: zone.nameEn,
        nameZh: zone.nameZh,
        code: local,
        sourceKey: 'TW.grid',
        sourceFile: 'src/data/taiwanPowerPoles.ts'
      });
    }
  }

  const countryList = Array.from(countries.values()).sort((a, b) => a.iso2.localeCompare(b.iso2));
  for (const country of countryList) country.sourceKeys.sort();
  const objects = Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
  return { countries: countryList, objects };
}

function assertCatalog(index, root) {
  const ids = new Set(index.objects.map((obj) => obj.id));
  const countries = new Set(index.countries.map((country) => country.iso2));
  const problems = [];
  const expectId = (id) => {
    if (!ids.has(id)) problems.push(`missing object ${id}`);
  };
  expectId('IN::TG');
  expectId('JP::26');
  expectId('JP::1');
  expectId('US::DC');
  expectId('US::I-10');
  expectId('US::US-11');
  expectId('TW::TP-H');
  expectId('TW::TPE');
  if (!countries.has('LK') || !countries.has('BD')) problems.push('LK/BD missing from country table');
  const lk = index.countries.find((country) => country.iso2 === 'LK');
  if (lk && !lk.sourceKeys.some((key) => key.startsWith('LK.'))) problems.push('LK has no source key');

  const kyoto = index.objects.find((obj) => obj.id === 'JP::26');
  if (kyoto && !kyoto.name.includes('京都') && !kyoto.nameZh.includes('京都')) {
    problems.push(`JP::26 name is ${kyoto.name}`);
  }
  const gridCount = index.objects.filter((obj) => obj.kind === 'grid').length;
  if (gridCount !== 21) problems.push(`expected 21 grid zones, got ${gridCount}`);

  const csvPath = path.join(root, 'src/content/filters/india-scripts.csv');
  const csv = fs.readFileSync(csvPath, 'utf8');
  for (const line of csv.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
    const region = trimmed.split(',')[0].trim();
    if (region === 'LK' || region === 'BD') {
      if (!countries.has(region)) problems.push(`${region} is not a country`);
      continue;
    }
    if (!region.startsWith('IN::')) problems.push(`india-scripts row is not namespaced: ${region}`);
    else if (!ids.has(region)) problems.push(`india-scripts object missing: ${region}`);
  }

  return problems;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const root = path.resolve(path.dirname(SCRIPT_PATH), '..');
  const index = await buildObjectIndex(root);
  const problems = assertCatalog(index, root);
  const bytes = Buffer.byteLength(JSON.stringify(index));
  console.log(`[objects] catalog json ${bytes} bytes, ${index.objects.length} objects`);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`[objects] ${problem}`);
    process.exit(1);
  }
}
