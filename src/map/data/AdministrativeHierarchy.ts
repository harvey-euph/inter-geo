import type { CountryData } from '../../types/geo';
import type { L2SubdivisionDetail, MunicipalityDetail } from '../../types/lod';
import { findCountry } from '../../data/countries';
import { makeUnknownCountry } from '../types';
import type { CanonicalFeature } from './FeatureRegistry';

/**
 * AdministrativeHierarchy handles administrative relations and conversions
 * between canonical features and UI domain objects (CountryData, L2SubdivisionDetail, MunicipalityDetail).
 */
export class AdministrativeHierarchy {
  /**
   * Converts a canonical ADM0 feature to CountryData.
   */
  public static toCountryData(feature: CanonicalFeature): CountryData | null {
    const iso2 = feature.properties.country_code || (feature.properties.iso2 as string);
    const country = findCountry(iso2);
    if (country) return country;

    const id = String(feature.properties.numeric_id || feature.properties.country_code || '');
    const name = feature.properties.name || 'Unknown';
    const nameZh = feature.properties.name_zh || feature.properties.name || '未知國家';

    return makeUnknownCountry(id, iso2 || 'XX', name, nameZh);
  }

  /**
   * Converts a canonical ADM1 feature to L2SubdivisionDetail.
   */
  public static toSubdivisionDetail(feature: CanonicalFeature): L2SubdivisionDetail {
    const p = feature.properties;
    const iso2 = p.country_code || (p.iso2 as string) || '';
    const parentCountry = findCountry(iso2);

    const subId = String(p.code || p.postal || p.id || p.pref_id || p.feature_id.split('_')[2] || '');

    return {
      id: subId,
      iso2,
      name: p.name || '',
      nameEn: p.name_en || p.name || '',
      nameZh: p.name_zh || p.name || '',
      typeEn: (p.type_en as string) || (p.type as string) || 'Subdivision',
      code: String(p.code || subId),
      postal: String(p.postal || subId),
      countryName: parentCountry?.name || iso2,
      countryNameZh: parentCountry?.nameZh || iso2,
      countryFlag: parentCountry?.flag || '🌐'
    };
  }

  /**
   * Converts a canonical ADM2 feature to MunicipalityDetail.
   */
  public static toMunicipalityDetail(feature: CanonicalFeature): MunicipalityDetail {
    const p = feature.properties;
    const iso2 = p.country_code || (p.iso2 as string) || 'JP';
    const code = String(p.code || p.id || '');
    const prefName = (p.parent_name as string) || (p.pref as string) || '';
    const prefCode = String(p.parent_code || p.pref_id || '');

    return {
      code,
      pref: prefName,
      city: (p.city as string) || p.name || '',
      nameZh: p.name_zh || p.name || '',
      gun: (p.gun as string) || '',
      iso2,
      parentName: prefName,
      parentCode: prefCode
    };
  }

  /**
   * Extracts centroid or interior point from a GeoJSON geometry.
   */
  public static calculateCenter(geometry: CanonicalFeature['geometry']): [number, number] {
    if (!geometry) return [0, 0];

    if (geometry.type === 'Point') {
      return [geometry.coordinates[0], geometry.coordinates[1]];
    }

    let totalX = 0;
    let totalY = 0;
    let count = 0;

    const processRing = (ring: number[][]) => {
      for (const pt of ring) {
        totalX += pt[0];
        totalY += pt[1];
        count++;
      }
    };

    if (geometry.type === 'Polygon') {
      if (geometry.coordinates.length > 0) {
        processRing(geometry.coordinates[0]);
      }
    } else if (geometry.type === 'MultiPolygon') {
      for (const poly of geometry.coordinates) {
        if (poly.length > 0) {
          processRing(poly[0]);
        }
      }
    }

    return count > 0 ? [totalX / count, totalY / count] : [0, 0];
  }

  /**
   * Calculates bounding box [minLng, minLat, maxLng, maxLat].
   */
  public static calculateBBox(geometry: CanonicalFeature['geometry']): [number, number, number, number] {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    const inspectPoint = (pt: number[]) => {
      if (pt[0] < minLng) minLng = pt[0];
      if (pt[1] < minLat) minLat = pt[1];
      if (pt[0] > maxLng) maxLng = pt[0];
      if (pt[1] > maxLat) maxLat = pt[1];
    };

    if (geometry.type === 'Point') {
      inspectPoint(geometry.coordinates);
    } else if (geometry.type === 'Polygon') {
      for (const ring of geometry.coordinates) {
        for (const pt of ring) inspectPoint(pt);
      }
    } else if (geometry.type === 'MultiPolygon') {
      for (const poly of geometry.coordinates) {
        for (const ring of poly) {
          for (const pt of ring) inspectPoint(pt);
        }
      }
    } else if (geometry.type === 'LineString') {
      for (const pt of geometry.coordinates) inspectPoint(pt);
    } else if (geometry.type === 'MultiLineString') {
      for (const line of geometry.coordinates) {
        for (const pt of line) inspectPoint(pt);
      }
    }

    if (!Number.isFinite(minLng)) return [0, 0, 0, 0];
    return [minLng, minLat, maxLng, maxLat];
  }
}
