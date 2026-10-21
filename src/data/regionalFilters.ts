/**
 * Backward compatibility alias for nationwideFilters.ts
 */
export * from './nationwideFilters';
import { NATIONWIDE_FILTERS, NATIONWIDE_FILTERS_BY_ID, getNationwideFiltersForCountry } from './nationwideFilters';
import type { NationwideFilterDef } from './nationwideFilters';

export type RegionalFilterDef = NationwideFilterDef;
export const REGIONAL_FILTERS = NATIONWIDE_FILTERS;
export const REGIONAL_FILTERS_BY_ID = NATIONWIDE_FILTERS_BY_ID;
export const getRegionalFiltersForCountry = getNationwideFiltersForCountry;
