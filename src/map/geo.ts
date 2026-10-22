import { geoMercator, geoPath, geoArea, type GeoPermissibleObjects, type GeoPath, type GeoProjection } from 'd3-geo';
import type { Feature } from 'geojson';

// Base map dimensions (Standard Web Mercator square)
export const MAP_W = 1000;
export const MAP_H = 1000;
export const MERCATOR_SCALE = MAP_W / (2 * Math.PI); // 159.15494309

/** Shared Web Mercator projection used by both the main thread and the geo decode workers. */
export function createProjection(): GeoProjection {
  return geoMercator()
    .scale(MERCATOR_SCALE)
    .translate([MAP_W / 2, MAP_H / 2]);
}

export function createPathGenerator(projection: GeoProjection = createProjection()): GeoPath {
  return geoPath().projection(projection);
}

/**
 * Dissolves subdivision geometries into a single outer national border MultiPolygon
 * by extracting topological outer boundary edges (edges with count === 1) and stitching them into closed rings.
 */
export function dissolveToPathD(features: Feature[], pathGen: (geo: GeoPermissibleObjects) => string | null): string {
  const precision = 1e5;
  function ptKey(pt: number[]): string {
    return Math.round(pt[0] * precision) + ',' + Math.round(pt[1] * precision);
  }

  interface EdgeEntry {
    count: number;
    p1: number[];
    p2: number[];
    k1: string;
    k2: string;
  }

  const edgeMap = new Map<string, EdgeEntry>();

  function addRing(coords: number[][]) {
    if (!coords || coords.length < 4) return;
    try {
      if (geoArea({ type: 'Polygon', coordinates: [coords] }) <= 1e-12) return;
    } catch {
      return;
    }
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const k1 = ptKey(p1);
      const k2 = ptKey(p2);
      if (k1 === k2) continue;
      const undirected = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
      let entry = edgeMap.get(undirected);
      if (!entry) {
        entry = { count: 0, p1, p2, k1, k2 };
        edgeMap.set(undirected, entry);
      }
      entry.count++;
    }
  }

  for (let fIdx = 0; fIdx < features.length; fIdx++) {
    const geom = features[fIdx].geometry;
    if (!geom) continue;
    if (geom.type === 'Polygon') {
      const coords = (geom as unknown as { coordinates: number[][][] }).coordinates;
      for (let rIdx = 0; rIdx < coords.length; rIdx++) addRing(coords[rIdx]);
    } else if (geom.type === 'MultiPolygon') {
      const coords = (geom as unknown as { coordinates: number[][][][] }).coordinates;
      for (let pIdx = 0; pIdx < coords.length; pIdx++) {
        const poly = coords[pIdx];
        for (let rIdx = 0; rIdx < poly.length; rIdx++) addRing(poly[rIdx]);
      }
    }
  }

  const nodeEdges = new Map<string, EdgeEntry[]>();
  for (const entry of edgeMap.values()) {
    if (entry.count === 1) {
      let list1 = nodeEdges.get(entry.k1);
      if (!list1) {
        list1 = [];
        nodeEdges.set(entry.k1, list1);
      }
      list1.push(entry);

      let list2 = nodeEdges.get(entry.k2);
      if (!list2) {
        list2 = [];
        nodeEdges.set(entry.k2, list2);
      }
      list2.push(entry);
    }
  }

  const visited = new Set<EdgeEntry>();
  const polygons: number[][][][] = [];

  for (const edges of nodeEdges.values()) {
    for (let eIdx = 0; eIdx < edges.length; eIdx++) {
      const startEdge = edges[eIdx];
      if (visited.has(startEdge)) continue;

      visited.add(startEdge);
      let curK = startEdge.k2;
      const ringCoords: number[][] = [startEdge.p1, startEdge.p2];

      while (true) {
        const candidates = nodeEdges.get(curK);
        let nextEdge: EdgeEntry | null = null;
        if (candidates) {
          for (let i = 0; i < candidates.length; i++) {
            if (!visited.has(candidates[i])) {
              nextEdge = candidates[i];
              break;
            }
          }
        }
        if (!nextEdge) break;

        visited.add(nextEdge);
        const nextPt = nextEdge.k1 === curK ? nextEdge.p2 : nextEdge.p1;
        curK = nextEdge.k1 === curK ? nextEdge.k2 : nextEdge.k1;
        ringCoords.push(nextPt);

        if (curK === startEdge.k1) {
          break;
        }
      }

      // Snap-close micro-gap if traversal stalled near the starting vertex (tolerance <= 0.005 degrees)
      if (curK !== startEdge.k1 && ringCoords.length >= 8) {
        const lastPt = ringCoords[ringCoords.length - 1];
        const dist = Math.hypot(lastPt[0] - startEdge.p1[0], lastPt[1] - startEdge.p1[1]);
        if (dist <= 0.005) {
          ringCoords.push(startEdge.p1);
          curK = startEdge.k1;
        }
      }

      // Only valid closed loops that returned to the starting vertex are valid rings
      if (ringCoords.length >= 4 && curK === startEdge.k1) {
        const testPoly: GeoPermissibleObjects = {
          type: 'Polygon',
          coordinates: [ringCoords]
        };
        try {
          if (geoArea(testPoly) > 2 * Math.PI) {
            ringCoords.reverse();
          }
          // Failsafe: if still > 2*PI, do not add (protects against inverted full-globe artifacts)
          if (geoArea(testPoly) <= 2 * Math.PI) {
            polygons.push([ringCoords]);
          }
        } catch {
          polygons.push([ringCoords]);
        }
      }
    }
  }

  if (polygons.length === 0) return '';
  const multiPolyGeo: GeoPermissibleObjects = {
    type: 'MultiPolygon',
    coordinates: polygons
  };

  return pathGen(multiPolyGeo) || '';
}
