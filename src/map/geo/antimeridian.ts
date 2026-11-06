import type { Geometry } from 'geojson';

/**
 * Calculates intersection latitude of an edge crossing the antimeridian (180 / -180).
 */
export function getAntimeridianCrossLat(p1: [number, number], p2: [number, number]): number {
  const [x1, y1] = p1;
  const [x2, y2] = p2;

  if (Math.abs(Math.abs(x1) - 180) < 1e-6 && Math.abs(Math.abs(x2) - 180) < 1e-6) {
    return y1;
  }

  if (x1 >= 0 && x2 < 0) {
    const totalDx = (x2 + 360) - x1;
    const t = totalDx !== 0 ? (180 - x1) / totalDx : 0;
    return y1 + t * (y2 - y1);
  } else {
    const totalDx = (x2 - 360) - x1;
    const t = totalDx !== 0 ? (-180 - x1) / totalDx : 0;
    return y1 + t * (y2 - y1);
  }
}

/**
 * Splits a polar ring spanning 360 degrees of longitude (e.g. Antarctica)
 * across longitude 0 to the South Pole (-90), eliminating horizontal crossing lines.
 */
function splitPolarRing(ring: number[][]): number[][][] {
  let splitIdx = -1;
  let minAbs = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    if (Math.abs(ring[i][0]) < minAbs) {
      minAbs = Math.abs(ring[i][0]);
      splitIdx = i;
    }
  }

  if (splitIdx === -1) return [ring];

  const midPt = ring[splitIdx];
  const poleLat = ring[0][1] < 0 ? -90 : 90;

  // West ring: from -180 to ~0 along coast, down to pole, and back along -180
  const westCoast = ring.slice(0, splitIdx + 1);
  const westRing: number[][] = [
    ...westCoast,
    [0, poleLat],
    [-90, poleLat],
    [-180, poleLat],
    [ring[0][0], ring[0][1]]
  ];

  // East ring: from ~0 to 180 along coast, down to pole, and back to midPt
  const eastCoast = ring.slice(splitIdx, ring.length - 1);
  const eastRing: number[][] = [
    ...eastCoast,
    [180, poleLat],
    [90, poleLat],
    [0, poleLat],
    [midPt[0], midPt[1]]
  ];

  return [westRing, eastRing];
}

/**
 * Splits a polygon ring across the antimeridian (180 / -180) if any consecutive vertices
 * have a longitudinal distance greater than 180 degrees.
 *
 * Returns an array of valid, closed rings that do not cross the antimeridian.
 */
export function splitRingAtAntimeridian(ring: number[][]): number[][][] {
  if (ring.length < 3) return [ring];

  let hasCrossing = false;
  for (let i = 0; i < ring.length - 1; i++) {
    if (Math.abs(ring[i + 1][0] - ring[i][0]) > 180) {
      hasCrossing = true;
      break;
    }
  }

  if (!hasCrossing) return [ring];

  // Polar cap check (e.g. Antarctica spanning 360 degrees of longitude)
  let minX = Infinity;
  let maxX = -Infinity;
  for (const pt of ring) {
    if (pt[0] < minX) minX = pt[0];
    if (pt[0] > maxX) maxX = pt[0];
  }
  if (minX <= -179.9 && maxX >= 179.9) {
    let hasZero = false;
    for (const pt of ring) {
      if (Math.abs(pt[0]) < 1) {
        hasZero = true;
        break;
      }
    }
    if (hasZero) {
      return splitPolarRing(ring);
    }
  }

  type Side = 'east' | 'west';
  interface Segment {
    side: Side;
    coords: number[][];
  }

  const segments: Segment[] = [];
  let currentSegment: number[][] = [ring[0]];
  let currentSide: Side = ring[0][0] >= 0 ? 'east' : 'west';

  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i] as [number, number];
    const p2 = ring[i + 1] as [number, number];
    const dx = Math.abs(p2[0] - p1[0]);

    if (dx > 180) {
      const crossLat = getAntimeridianCrossLat(p1, p2);
      if (currentSide === 'east') {
        currentSegment.push([180, crossLat]);
        segments.push({ side: 'east', coords: currentSegment });
        currentSegment = [[-180, crossLat]];
        currentSide = 'west';
      } else {
        currentSegment.push([-180, crossLat]);
        segments.push({ side: 'west', coords: currentSegment });
        currentSegment = [[180, crossLat]];
        currentSide = 'east';
      }
    }
    currentSegment.push(p2);
  }

  if (currentSegment.length > 0) {
    segments.push({ side: currentSide, coords: currentSegment });
  }

  // If the first and last segments are on the same side, join them
  if (segments.length > 1 && segments[0].side === segments[segments.length - 1].side) {
    const first = segments.shift()!;
    const last = segments.pop()!;
    const mergedCoords = [...last.coords.slice(0, -1), ...first.coords];
    segments.push({ side: first.side, coords: mergedCoords });
  }

  // Close each segment along the corresponding meridian (180 or -180)
  const outRings: number[][][] = [];
  for (const seg of segments) {
    const coords = seg.coords;
    if (coords.length < 3) continue;
    const start = coords[0];
    const end = coords[coords.length - 1];
    const meridianLng = seg.side === 'east' ? 180 : -180;

    if (Math.abs(start[0] - end[0]) < 1e-6 && Math.abs(start[1] - end[1]) < 1e-6) {
      outRings.push(coords);
    } else {
      const closed = [...coords];
      if (Math.abs(end[0] - meridianLng) > 1e-6) {
        closed.push([meridianLng, end[1]]);
      }
      if (Math.abs(start[0] - meridianLng) > 1e-6) {
        closed.push([meridianLng, start[1]]);
      }
      closed.push([start[0], start[1]]);
      outRings.push(closed);
    }
  }

  return outRings;
}

/**
 * Normalizes a GeoJSON Polygon coordinates array.
 * If the polygon crosses the antimeridian, splits into multiple polygon coordinate arrays.
 */
export function normalizeAntimeridianPolygon(coordinates: number[][][]): number[][][][] {
  const exterior = coordinates[0];
  if (!exterior || exterior.length < 3) return [coordinates];

  let hasCrossing = false;
  for (let i = 0; i < exterior.length - 1; i++) {
    if (Math.abs(exterior[i + 1][0] - exterior[i][0]) > 180) {
      hasCrossing = true;
      break;
    }
  }

  if (!hasCrossing) return [coordinates];

  const splitRings = splitRingAtAntimeridian(exterior);
  return splitRings.map(ring => [ring]);
}

/**
 * Splits a LineString across the antimeridian.
 */
export function normalizeAntimeridianLineString(coordinates: number[][]): number[][][] {
  let hasCrossing = false;
  for (let i = 0; i < coordinates.length - 1; i++) {
    if (Math.abs(coordinates[i + 1][0] - coordinates[i][0]) > 180) {
      hasCrossing = true;
      break;
    }
  }

  if (!hasCrossing) return [coordinates];

  const lines: number[][][] = [];
  let current: number[][] = [coordinates[0]];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i] as [number, number];
    const p2 = coordinates[i + 1] as [number, number];
    if (Math.abs(p2[0] - p1[0]) > 180) {
      const crossLat = getAntimeridianCrossLat(p1, p2);
      if (p1[0] >= 0) {
        current.push([180, crossLat]);
        lines.push(current);
        current = [[-180, crossLat]];
      } else {
        current.push([-180, crossLat]);
        lines.push(current);
        current = [[180, crossLat]];
      }
    }
    current.push(p2);
  }

  if (current.length > 1) {
    lines.push(current);
  }

  return lines;
}

/**
 * Normalizes any GeoJSON geometry by splitting across the antimeridian.
 * Eliminates long connecting lines that wrap 360 degrees around the globe.
 */
export function normalizeAntimeridianGeometry(geometry: Geometry): Geometry {
  if (!geometry) return geometry;

  switch (geometry.type) {
    case 'Polygon': {
      const splitPolys = normalizeAntimeridianPolygon(geometry.coordinates);
      if (splitPolys.length === 1) {
        return { type: 'Polygon', coordinates: splitPolys[0] };
      }
      return { type: 'MultiPolygon', coordinates: splitPolys };
    }
    case 'MultiPolygon': {
      const allPolys: number[][][][] = [];
      let anySplit = false;
      for (const poly of geometry.coordinates) {
        const split = normalizeAntimeridianPolygon(poly);
        if (split.length > 1) anySplit = true;
        allPolys.push(...split);
      }
      if (!anySplit) return geometry;
      return { type: 'MultiPolygon', coordinates: allPolys };
    }
    case 'LineString': {
      const splitLines = normalizeAntimeridianLineString(geometry.coordinates);
      if (splitLines.length === 1) {
        return { type: 'LineString', coordinates: splitLines[0] };
      }
      return { type: 'MultiLineString', coordinates: splitLines };
    }
    case 'MultiLineString': {
      const allLines: number[][][] = [];
      let anySplit = false;
      for (const line of geometry.coordinates) {
        const split = normalizeAntimeridianLineString(line);
        if (split.length > 1) anySplit = true;
        allLines.push(...split);
      }
      if (!anySplit) return geometry;
      return { type: 'MultiLineString', coordinates: allLines };
    }
    default:
      return geometry;
  }
}
