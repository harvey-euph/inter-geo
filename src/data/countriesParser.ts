/**
 * Parser for countries.csv in inter-geo-data.
 *
 * Implements strict RFC 4180 parsing with full support for:
 * - Escaped double quotes ("")
 * - Commas and punctuation within quoted values
 * - Multi-item array fields delimited by semicolon (;)
 */

import type {
  CameraGen,
  CarMeta,
  Continent,
  CountryData,
  CoverageStatus,
  DrivingSide,
  PlateType,
  PoleType,
  RoadLine
} from '../types/geo';

const ARRAY_FIELDS = new Set([
  'cameraGens',
  'roadLines',
  'carMeta',
  'poleTypes',
  'keyHints',
  'confusedWith'
]);

/**
 * Standard RFC 4180 compliant CSV tokenizer.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  const len = csvText.length;
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < len) {
    const char = csvText[i];

    if (char === '"') {
      if (inQuotes && i + 1 < len && csvText[i + 1] === '"') {
        currentField += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && i + 1 < len && csvText[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      i++;
      continue;
    }

    currentField += char;
    i++;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses full countries.csv text into an array of typed CountryData objects.
 */
export function parseCountriesCsv(csvText: string): CountryData[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  const countries: CountryData[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row[0] || row[0].startsWith('//')) continue;

    const rawObj: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      const val = row[c] !== undefined ? row[c].trim() : '';

      if (ARRAY_FIELDS.has(header)) {
        rawObj[header] = val
          ? val.split(';').map((s) => s.trim()).filter(Boolean)
          : [];
      } else {
        rawObj[header] = val;
      }
    }

    const country: CountryData = {
      id: String(rawObj.id || ''),
      iso2: String(rawObj.iso2 || '').toUpperCase(),
      iso3: String(rawObj.iso3 || '').toUpperCase(),
      name: String(rawObj.name || ''),
      nameZh: String(rawObj.nameZh || ''),
      flag: String(rawObj.flag || ''),
      continent: (rawObj.continent as Continent) || 'Asia',
      region: String(rawObj.region || ''),
      drivingSide: (rawObj.drivingSide as DrivingSide) || 'right',
      coverage: (rawObj.coverage as CoverageStatus) || 'official',
      cameraGens: (rawObj.cameraGens as CameraGen[]) || [],
      plateType: (rawObj.plateType as PlateType) || 'white',
      plateDesc: String(rawObj.plateDesc || ''),
      roadLines: (rawObj.roadLines as RoadLine[]) || [],
      roadLinesDesc: String(rawObj.roadLinesDesc || ''),
      carMeta: (rawObj.carMeta as CarMeta[]) || [],
      carMetaDesc: String(rawObj.carMetaDesc || ''),
      poleTypes: (rawObj.poleTypes as PoleType[]) || [],
      poleDesc: rawObj.poleDesc ? String(rawObj.poleDesc) : undefined,
      bollardDesc: rawObj.bollardDesc ? String(rawObj.bollardDesc) : undefined,
      language: String(rawObj.language || ''),
      tld: String(rawObj.tld || ''),
      callingCode: rawObj.callingCode ? String(rawObj.callingCode) : undefined,
      keyHints: (rawObj.keyHints as string[]) || [],
      confusedWith: (rawObj.confusedWith as string[]) || []
    };

    countries.push(country);
  }

  return countries;
}
