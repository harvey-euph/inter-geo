import * as flatgeobuf from 'flatgeobuf';
import type { Feature, Geometry } from 'geojson';
import { getDataUrl } from '../../data/dataSource';
import { findCountry } from '../../data/countries';
import { findL3Partition, hasCountryL2Sync, resolveSubdivisionFileSync } from '../../data/geoIndexClient';
import { FeatureRegistry, type CanonicalFeature, type AdminLevel } from './FeatureRegistry';
import { AdministrativeHierarchy } from './AdministrativeHierarchy';
import { normalizeAntimeridianGeometry } from '../geo/antimeridian';
import { ADM0_CENTER_ANCHORS } from '../geo/adminCenterAnchors';

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

        for await (const rawFeature of it) {
          const f = rawFeature as Feature<Geometry, Record<string, unknown>>;
          if (!f || !f.geometry) continue;

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
          const featureId =
            adminLevel === 0
              ? FeatureRegistry.createId(0, resolvedIso2, '')
              : adminLevel === 1
                ? FeatureRegistry.createId(1, resolvedIso2, subId)
                : FeatureRegistry.createId(2, resolvedIso2, String(props.code || props.id || ''));

          const name = String(
            props.name_zh ||
            props.name ||
            props.name_en ||
            countryMeta?.nameZh ||
            countryMeta?.name ||
            ''
          );
          const nameEn = String(props.name_en || countryMeta?.name || props.name || '');
          const nameZh = String(props.name_zh || countryMeta?.nameZh || props.name || '');

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
              code: String(props.code || subId),
              postal: String(props.postal || ''),
              pref_id: props.pref_id as number | string | undefined,
              city: (props.city as string) || undefined,
              pref: (props.pref as string) || (props.parent_name as string) || undefined,
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
