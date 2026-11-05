/// <reference lib="webworker" />
/**
 * Geo decode worker: fetches a FlatGeobuf file, deserializes it, projects every feature
 * into Web Mercator map space and returns SVG path strings + bboxes (+ centroids / dissolved
 * outline for L2). Keeps all heavy parsing/projection work off the main (render) thread;
 * the main thread only has to build `Path2D` objects from the returned strings.
 */
import * as flatgeobuf from 'flatgeobuf';
import type { Feature } from 'geojson';
import { createPathGenerator, dissolveToPathD } from './geo';
import type { BBox, DecodeRequest, DecodeResponse, DecodedFeature } from './geoDecodeTypes';

const pathGenerator = createPathGenerator();

function hasLine(coords: unknown): boolean {
  return Array.isArray(coords) && coords.length >= 2;
}

function isValidGeometry(
  geom: Feature['geometry'] | null | undefined,
  kind?: string
): boolean {
  if (!geom) return false;
  if (kind === 'roads') {
    if (geom.type === 'LineString') return hasLine(geom.coordinates);
    if (geom.type === 'MultiLineString') {
      return Array.isArray(geom.coordinates) && geom.coordinates.some((line) => hasLine(line));
    }
    return false;
  }
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates;
    return Array.isArray(rings) && rings.some((r) => Array.isArray(r) && r.length >= 4);
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates;
    return (
      Array.isArray(polys) &&
      polys.some(
        (poly) =>
          Array.isArray(poly) &&
          poly.some((r) => Array.isArray(r) && r.length >= 4)
      )
    );
  }
  return false;
}

function boundsOf(feature: Feature): BBox {
  try {
    const b = pathGenerator.bounds(feature);
    if (b && !isNaN(b[0][0]) && !isNaN(b[0][1]) && !isNaN(b[1][0])) {
      return [b[0][0], b[0][1], b[1][0], b[1][1]];
    }
  } catch {
    // fallback below
  }
  return [0, 0, 0, 0];
}

function centroidOf(feature: Feature, bbox: BBox): [number, number] {
  try {
    let targetFeature: Feature = feature;
    if (
      feature.geometry &&
      feature.geometry.type === 'MultiPolygon' &&
      feature.geometry.coordinates.length > 1
    ) {
      let maxArea = -1;
      for (let i = 0; i < feature.geometry.coordinates.length; i++) {
        const polyFeature: Feature = {
          type: 'Feature',
          properties: null,
          geometry: {
            type: 'Polygon',
            coordinates: feature.geometry.coordinates[i]
          }
        };
        const a = pathGenerator.area(polyFeature);
        if (Number.isFinite(a) && a > maxArea) {
          maxArea = a;
          targetFeature = polyFeature;
        }
      }
    }
    const c = pathGenerator.centroid(targetFeature);
    if (c && !isNaN(c[0]) && !isNaN(c[1])) return c;
  } catch {
    // fallback below
  }
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
}

function normalizeAntimeridian(feature: Feature) {
  if (!feature.geometry) return;
  const name = (feature.properties as Record<string, unknown> | null)?.name;

  // 1. Russia Mainland (poly 9) & Wrangel Island (poly 10)
  if (name === 'Russia' && feature.geometry.type === 'MultiPolygon') {
    const coords = feature.geometry.coordinates;
    const p9 = coords[9]?.[0];
    const p10 = coords[10]?.[0];

    if (p9 && p9.length >= 390 && p9[366][0] === -180 && p9[388][0] === -180) {
      const ruMainland = [
        ...p9.slice(0, 366),
        [180, p9[366][1]],
        [180, p9[388][1]],
        ...p9.slice(389)
      ];
      const ruChukotka = [
        [-180, p9[388][1]],
        ...p9.slice(366, 389)
      ];
      coords[9] = [ruMainland];
      coords[10] = [ruChukotka];
    }

    if (p10 && p10.length === 10 && p10[6][0] === -180 && p10[0][0] === -180) {
      const wrangelEast = [
        ...p10.slice(0, 7),
        p10[0]
      ];
      const wrangelWest = [
        [180, p10[6][1]],
        p10[7],
        p10[8],
        [180, p10[9][1]],
        [180, p10[6][1]]
      ];
      coords.push([wrangelWest], [wrangelEast]);
    }
  }

  // 2. Fiji: Taveuni / Vanua Levu islands crossing 180°
  if (name === 'Fiji' && feature.geometry.type === 'MultiPolygon') {
    const p1 = feature.geometry.coordinates[1]?.[0];
    if (p1 && p1.length === 11) {
      const fijiWest = [
        [180, p1[3][1]],
        p1[4],
        p1[5],
        p1[6],
        p1[7],
        p1[8],
        [180, p1[9][1]],
        [180, p1[3][1]]
      ];
      const fijiEast = [
        p1[0],
        p1[1],
        p1[2],
        p1[3],
        p1[0]
      ];
      feature.geometry.coordinates = [
        feature.geometry.coordinates[0],
        [fijiWest],
        [fijiEast]
      ];
    }
  }

  // 3. Antarctica: south pole 360-degree wrapping seam
  if (name === 'Antarctica' && feature.geometry.type === 'MultiPolygon') {
    const coords = feature.geometry.coordinates;
    const p7 = coords[7]?.[0];
    if (p7 && p7.length >= 550 && p7[0][0] === -180 && p7[552][0] === 180) {
      const westPoly = [
        ...p7.slice(0, 302),
        [0, -85.051129],
        [-180, -85.051129],
        [-180, p7[0][1]]
      ];
      const eastPoly = [
        ...p7.slice(302, 553),
        [180, -85.051129],
        [0, -85.051129],
        [0, p7[302][1]],
        p7[302]
      ];
      coords[7] = [westPoly];
      coords.push([eastPoly]);
    }
  }
}

async function decode(req: DecodeRequest): Promise<DecodeResponse> {
  const res = await fetch(req.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();

  const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));

  // If client requested raw GeoJSON for WebGL / MapLibre:
  if (req.asGeoJson) {
    const geojsonFeatures: Feature[] = [];
    let idx = 1;
    for await (const raw of it) {
      const feature = raw as Feature;
      if (!isValidGeometry(feature.geometry, req.kind)) continue;
      normalizeAntimeridian(feature);
      if (feature.id === undefined) {
        const p = feature.properties as Record<string, unknown> | null;
        feature.id = (p?.id as string | number) ?? (p?.postal as string | number) ?? (p?.code as string | number) ?? (p?.name as string) ?? idx++;
      }
      geojsonFeatures.push(feature);
    }
    return {
      id: req.id,
      ok: true,
      features: [],
      geojson: {
        type: 'FeatureCollection',
        features: geojsonFeatures
      }
    };
  }

  const features: DecodedFeature[] = [];
  const rawL2: Feature[] = [];

  for await (const raw of it) {
    const feature = raw as Feature;
    if (!isValidGeometry(feature.geometry, req.kind)) continue; // 跳過空 ring / 非道路折線

    let d: string;
    try {
      d = pathGenerator(feature) || '';
    } catch {
      continue; // 再保險
    }
    if (req.kind === 'roads' && !d) continue;

    const bbox = boundsOf(feature);
    const item: DecodedFeature = {
      d,
      bbox,
      props: (feature.properties || {}) as Record<string, unknown>,
      fid: feature.id
    };
    if (req.kind === 'l2') {
      item.centroid = centroidOf(feature, bbox);
      rawL2.push(feature);
    }
    features.push(item);
  }

  let dissolvedD: string | undefined;
  if (req.kind === 'l2') {
    try {
      const dd = dissolveToPathD(rawL2, pathGenerator);
      // Sanity check: ensure path does not draw a full-globe bounding box artifact
      const hasInversionBox = req.iso2 !== 'RU' && (dd.includes('M0,') || dd.includes('1000,'));
      if (dd && !hasInversionBox) dissolvedD = dd;
    } catch (err) {
      console.warn(`[L2] Failed to dissolve outer boundary for ${req.iso2}:`, err);
    }
  }

  return { id: req.id, ok: true, features, dissolvedD };
}

self.onmessage = async (e: MessageEvent<DecodeRequest>) => {
  const req = e.data;
  let response: DecodeResponse;
  try {
    response = await decode(req);
  } catch (err) {
    response = { id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(response);
};
