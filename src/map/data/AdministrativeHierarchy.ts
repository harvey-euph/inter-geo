import type { CountryData } from '../../types/geo';
import type { L2SubdivisionDetail, MunicipalityDetail } from '../../types/lod';
import { findCountry } from '../../data/countries';
import { makeUnknownCountry } from '../types';
import type { CanonicalFeature } from './FeatureRegistry';

/**
 * Cleans text from raw GeoJSON properties, treating placeholder strings ('NA', 'N/A', 'null') as empty.
 */
export function cleanAdminText(value: unknown): string {
  if (value === undefined || value === null) return '';
  const str = String(value).trim();
  const upper = str.toUpperCase();
  if (
    str === '' ||
    upper === 'NA' ||
    upper === 'N/A' ||
    upper === 'NULL' ||
    upper === 'UNDEFINED'
  ) {
    return '';
  }
  return str;
}

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
    const name = cleanAdminText(feature.properties.name) || 'Unknown';
    const nameZh = cleanAdminText(feature.properties.name_zh) || name || '未知國家';

    return makeUnknownCountry(id, iso2 || 'XX', name, nameZh);
  }

  /**
   * Converts a canonical ADM1 feature to L2SubdivisionDetail.
   */
  public static toSubdivisionDetail(feature: CanonicalFeature): L2SubdivisionDetail {
    const p = feature.properties;
    const iso2 = p.country_code || (p.iso2 as string) || '';
    const parentCountry = findCountry(iso2);

    const subId =
      cleanAdminText(p.code) ||
      cleanAdminText(p.postal) ||
      cleanAdminText(p.id) ||
      cleanAdminText(p.pref_id) ||
      cleanAdminText(p.feature_id.split('_')[2]) ||
      '';

    const name = cleanAdminText(p.name);
    const nameEn = cleanAdminText(p.name_en) || name;
    const nameZh = cleanAdminText(p.name_zh) || nameEn || name;

    return {
      id: subId,
      iso2,
      name,
      nameEn,
      nameZh,
      typeEn: cleanAdminText(p.type_en) || cleanAdminText(p.type) || 'Subdivision',
      code: cleanAdminText(p.code) || subId,
      postal: cleanAdminText(p.postal) || subId,
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
    const iso2 = p.country_code || (p.iso2 as string) || '';
    const code = cleanAdminText(p.code) || cleanAdminText(p.id);
    const prefName = cleanAdminText(p.parent_name) || cleanAdminText(p.pref);
    const prefCode = cleanAdminText(p.parent_code) || cleanAdminText(p.pref_id);
    const name = cleanAdminText(p.name);
    const city = cleanAdminText(p.city) || name;
    const nameZh = cleanAdminText(p.name_zh) || cleanAdminText(p.name_en) || city;

    return {
      code,
      pref: prefName,
      city,
      nameZh,
      gun: cleanAdminText(p.gun),
      iso2,
      parentName: prefName,
      parentCode: prefCode
    };
  }

  /**
   * Extracts centroid or interior point from a GeoJSON geometry.
   * For MultiPolygons, calculates the centroid of the largest landmass polygon
   * to avoid far-flung islands or polar territories skewing the center off mainland.
   * Also handles antimeridian crossing cleanly.
   */
  public static calculateCenter(geometry: CanonicalFeature['geometry']): [number, number] {
    if (!geometry) return [0, 0];

    if (geometry.type === 'Point') {
      return [geometry.coordinates[0], geometry.coordinates[1]];
    }

    if (geometry.type === 'Polygon') {
      if (geometry.coordinates.length === 0 || geometry.coordinates[0].length === 0) return [0, 0];
      return AdministrativeHierarchy.calculateRingCentroid(geometry.coordinates[0]);
    }

    if (geometry.type === 'MultiPolygon') {
      if (geometry.coordinates.length === 0) return [0, 0];

      let maxArea = -1;
      let largestRing: number[][] | null = null;

      for (const poly of geometry.coordinates) {
        if (!poly || poly.length === 0) continue;
        const outerRing = poly[0];
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const pt of outerRing) {
          if (pt[0] < minX) minX = pt[0];
          if (pt[1] < minY) minY = pt[1];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] > maxY) maxY = pt[1];
        }

        const area = (maxX - minX) * (maxY - minY);
        if (area > maxArea) {
          maxArea = area;
          largestRing = outerRing;
        }
      }

      if (largestRing) {
        return AdministrativeHierarchy.calculateRingCentroid(largestRing);
      }
    }

    return [0, 0];
  }

  /**
   * Calculates centroid of a coordinate ring, handling antimeridian wrapping cleanly.
   * Excludes the duplicate closing vertex in GeoJSON rings to prevent biasing towards the starting point.
   */
  private static calculateRingCentroid(ring: number[][]): [number, number] {
    if (!ring || ring.length === 0) return [0, 0];

    // GeoJSON closed rings duplicate the first vertex as the last vertex.
    // Exclude the duplicate closing point to avoid double-weighting the start vertex (e.g. producing 0.4 instead of 0.5).
    const isClosed =
      ring.length > 1 &&
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1];
    const pts = isClosed ? ring.slice(0, -1) : ring;

    let totalX = 0;
    let totalY = 0;
    let count = 0;

    let hasFarNegative = false;
    let hasFarPositive = false;
    for (const pt of pts) {
      if (pt[0] < -90) hasFarNegative = true;
      if (pt[0] > 90) hasFarPositive = true;
    }
    const cross180 = hasFarNegative && hasFarPositive;

    for (const pt of pts) {
      let x = pt[0];
      const y = pt[1];
      if (cross180 && x < 0) {
        x += 360;
      }
      totalX += x;
      totalY += y;
      count++;
    }

    if (count === 0) return [0, 0];
    let avgX = totalX / count;
    const avgY = totalY / count;

    if (cross180 && avgX > 180) {
      avgX -= 360;
    }

    return [avgX, avgY];
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
