import {
  loadCountriesIndex,
  getAllCountriesSync,
  findCountry,
  onCountriesIndexLoaded,
  parseCountriesCsv
} from './geoIndexClient';
import type { CountryData } from '../types/geo';

/**
 * Array of all supported countries, dynamically populated from inter-geo-data's
 * countries-index.json.
 */
export const COUNTRIES_DATA: CountryData[] = [];
export const CORE_COUNTRIES_DATA = COUNTRIES_DATA;

function syncCountriesArray() {
  const all = getAllCountriesSync();
  if (all.length > 0 && COUNTRIES_DATA.length === 0) {
    COUNTRIES_DATA.push(...all);
  } else if (all.length > 0 && COUNTRIES_DATA.length !== all.length) {
    COUNTRIES_DATA.length = 0;
    COUNTRIES_DATA.push(...all);
  }
}

syncCountriesArray();
onCountriesIndexLoaded(syncCountriesArray);

export { findCountry, loadCountriesIndex, onCountriesIndexLoaded, parseCountriesCsv, type CountryData };
