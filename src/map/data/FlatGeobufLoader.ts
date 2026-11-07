import * as flatgeobuf from 'flatgeobuf';
import type { Feature, Geometry } from 'geojson';
import { getDataUrl } from '../../data/dataSource';
import { findCountry } from '../../data/countries';
import { findL3Partition, hasCountryL2Sync, resolveSubdivisionFileSync, isSouthAmerica } from '../../data/geoIndexClient';
import { FeatureRegistry, type CanonicalFeature, type AdminLevel } from './FeatureRegistry';
import { AdministrativeHierarchy, cleanAdminText } from './AdministrativeHierarchy';
import { normalizeAntimeridianGeometry } from '../geo/antimeridian';
import { ADM0_CENTER_ANCHORS } from '../geo/adminCenterAnchors';

function isValidGeometry(geom: Geometry | null | undefined): boolean {
  if (!geom) return false;
  if (geom.type === 'Polygon') {
    if (!geom.coordinates || geom.coordinates.length === 0) return false;
    const ext = geom.coordinates[0];
    return Array.isArray(ext) && ext.length >= 3;
  }
  if (geom.type === 'MultiPolygon') {
    if (!geom.coordinates || geom.coordinates.length === 0) return false;
    geom.coordinates = geom.coordinates.filter(
      (poly) => Array.isArray(poly) && poly.length > 0 && Array.isArray(poly[0]) && poly[0].length >= 3
    );
    return geom.coordinates.length > 0;
  }
  if (geom.type === 'LineString') {
    return Array.isArray(geom.coordinates) && geom.coordinates.length >= 2;
  }
  if (geom.type === 'MultiLineString') {
    return Array.isArray(geom.coordinates) && geom.coordinates.some((line) => Array.isArray(line) && line.length >= 2);
  }
  if (geom.type === 'Point') {
    return (
      Array.isArray(geom.coordinates) &&
      geom.coordinates.length >= 2 &&
      !isNaN(geom.coordinates[0]) &&
      !isNaN(geom.coordinates[1])
    );
  }
  return true;
}

/**
 * FlatGeobufLoader handles fetching, parsing, and normalizing FlatGeobuf (.fgb) files
 * into WGS84 GeoJSON CanonicalFeature objects.
 */
export class FlatGeobufLoader {
  private cache = new Map<string, CanonicalFeature[]>();
  private inFlight = new Map<string, Promise<CanonicalFeature[]>>();

  /**
   * Loads ADM0 (Global countries) from data/COUNTRY.fgb.
   */
  public async loadAdm0(): Promise<CanonicalFeature[]> {
    const url = getDataUrl('data/COUNTRY.fgb');
    return this.loadFgbUrl(url, 0);
  }

  /**
   * Loads ADM1 (Subdivisions for a country, e.g. JP.fgb).
   */
  public async loadAdm1(iso2: string): Promise<CanonicalFeature[]> {
    const cleanIso = iso2.toUpperCase();
    if (!hasCountryL2Sync(cleanIso)) {
      return [];
    }
    const url = getDataUrl(`data/${cleanIso}.fgb`);
    return this.loadFgbUrl(url, 1, cleanIso);
  }

  /**
   * Loads ADM2 (Municipalities for a subdivision, e.g. JP/22.fgb).
   */
  public async loadAdm2(
    iso2: string,
    subIdOrCode: string | number,
    extraParts?: { name?: string; nameEn?: string; nameZh?: string }
  ): Promise<CanonicalFeature[]> {
    const cleanIso = iso2.toUpperCase();
    if (isSouthAmerica(cleanIso)) {
      return [];
    }
    const sub = String(subIdOrCode).trim();
    const parentId = FeatureRegistry.createId(1, cleanIso, sub);

    // 1. Check L3 Manifest partition
    const partition = findL3Partition(cleanIso, {
      id: sub,
      code: sub,
      name: extraParts?.name,
      nameEn: extraParts?.nameEn,
      nameZh: extraParts?.nameZh
    });

    const relativePath = partition?.file
      ? partition.file.replace(/^\/?data\/l3\//, 'data/').replace(/^\/+/, '')
      : resolveSubdivisionFileSync(cleanIso, sub);

    if (!relativePath) {
      return [];
    }

    const url = getDataUrl(relativePath);
    return this.loadFgbUrl(url, 2, cleanIso, parentId);
  }

  /**
   * Generic loader for any FlatGeobuf URL.
   */
  public async loadFgbUrl(
    url: string,
    adminLevel: AdminLevel,
    countryCode?: string,
    parentId?: string
  ): Promise<CanonicalFeature[]> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    if (this.inFlight.has(url)) {
      return this.inFlight.get(url)!;
    }

    const promise = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          if (res.status === 404) {
            return [];
          }
          throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
        }
        const buffer = await res.arrayBuffer();
        const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
        const canonicalList: CanonicalFeature[] = [];
        const seenFeatureIds = new Set<string>();

        for await (const rawFeature of it) {
          const f = rawFeature as Feature<Geometry, Record<string, unknown>>;
          if (!f || !f.geometry || !isValidGeometry(f.geometry)) continue;

          const props = f.properties || {};
          let cc = countryCode || (props.iso2 as string) || (props.country_code as string) || '';

          // For ADM0, map numeric id or name to country
          let countryMeta: ReturnType<typeof findCountry> | null = null;
          if (adminLevel === 0) {
            const rawId = String(props.id || f.id || '');
            const rawName = String(props.name || '');
            countryMeta = findCountry(rawId) || findCountry(rawName) || (props.iso2 ? findCountry(props.iso2 as string) : null);
            if (countryMeta) {
              cc = countryMeta.iso2;
            }
          }

          const resolvedIso2 = cc || (countryMeta?.iso2) || 'XX';
          const subId = String(props.code || props.postal || props.id || f.id || '');
          const baseFeatureId =
            adminLevel === 0
              ? FeatureRegistry.createId(0, resolvedIso2, '')
              : adminLevel === 1
                ? FeatureRegistry.createId(1, resolvedIso2, subId)
                : FeatureRegistry.createId(2, resolvedIso2, String(props.code || props.id || ''));

          let featureId = baseFeatureId;
          if (seenFeatureIds.has(featureId)) {
            // Collision: multiple features in this dataset share the same code/subId (e.g. AU-NSW or GL-UO).
            // Disambiguate using props.id or incremental index so no feature is ever overwritten or dropped.
            const disambiguator = props.id !== undefined ? String(props.id) : String(canonicalList.length + 1);
            featureId = `${baseFeatureId}_${disambiguator}`;
          }
          seenFeatureIds.add(featureId);

          const rawName = cleanAdminText(props.name);
          const rawNameEn = cleanAdminText(props.name_en) || cleanAdminText(countryMeta?.name);
          const rawNameZh = cleanAdminText(props.name_zh) || cleanAdminText(countryMeta?.nameZh);

          const nameEn = rawNameEn || rawName;
          const nameZh = rawNameZh || nameEn || rawName;
          const name = nameZh || nameEn || rawName;

          const geometry = normalizeAntimeridianGeometry(f.geometry);
          const center =
            (adminLevel === 0 && ADM0_CENTER_ANCHORS[resolvedIso2]?.coordinates) ||
            AdministrativeHierarchy.calculateCenter(geometry);
          const bbox = AdministrativeHierarchy.calculateBBox(geometry);

          const canonical: CanonicalFeature = {
            type: 'Feature',
            id: undefined, // Will be set by FeatureRegistry numeric_id
            geometry,
            properties: {
              ...props,
              feature_id: featureId,
              numeric_id: 0,
              admin_level: adminLevel,
              country_code: resolvedIso2,
              parent_id:
                parentId ||
                (adminLevel === 1
                  ? FeatureRegistry.createId(0, resolvedIso2, '')
                  : adminLevel === 2
                    ? (props.parent_code
                        ? FeatureRegistry.createId(1, resolvedIso2, String(props.parent_code))
                        : undefined)
                    : undefined),
              name,
              name_en: nameEn,
              name_zh: nameZh,
              code: cleanAdminText(props.code) || cleanAdminText(subId),
              postal: cleanAdminText(props.postal),
              pref_id: props.pref_id as number | string | undefined,
              city: cleanAdminText(props.city) || undefined,
              pref: cleanAdminText(props.pref) || cleanAdminText(props.parent_name) || undefined,
              center,
              bbox
            }
          };

          canonicalList.push(canonical);
        }

        this.cache.set(url, canonicalList);
        return canonicalList;
      } finally {
        this.inFlight.delete(url);
      }
    })();

    this.inFlight.set(url, promise);
    return promise;
  }

  public clearCache(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}
