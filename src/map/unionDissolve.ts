import {
  getCsvLayerById,
  getCsvSubdivisionCode,
  getCsvSubdivisionRow,
  type RegisteredCsvLayer
} from '../layers/csvLayerRegistry';
import type { L2SubdivisionPathData } from './types';

export interface SubdivisionUnionGroup {
  groupId: string;
  isUnion: boolean;
  members: L2SubdivisionPathData[];
  memberIdSet: Set<string>;
  fillPath2D: Path2D;
  outerBorderPath2D: Path2D;
  internalBorderPath2D: Path2D | null;
  centroid: [number, number];
  code: string | null;
}

export interface CountryUnionLayout {
  layerId: string;
  iso2: string;
  hasUnionGroups: boolean;
  groups: SubdivisionUnionGroup[];
  subIdToGroup: Map<string, SubdivisionUnionGroup>;
  countryBordersPath2D: Path2D;
}

const unionLayoutCache = new Map<string, CountryUnionLayout>();

let hitTestCtx: CanvasRenderingContext2D | null = null;
function getHitTestCtx(): CanvasRenderingContext2D | null {
  if (hitTestCtx) return hitTestCtx;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    hitTestCtx = canvas.getContext('2d');
  }
  return hitTestCtx;
}

const RAY_DIRS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.7071, 0.7071],
  [-0.7071, 0.7071],
  [0.7071, -0.7071],
  [-0.7071, -0.7071]
];

interface EdgeRecord {
  count: number;
  p1: [number, number];
  p2: [number, number];
}

/**
 * Computes the unsigned shoelace area of the largest closed ring in an SVG path `d`.
 * Using the largest ring avoids extreme bbox inflation from scattered offshore islands.
 */
function computeMainRingArea(d: string | undefined, bbox: [number, number, number, number]): number {
  if (d) {
    const rawRings = d.split('Z');
    let maxRingArea = 0;
    for (let rIdx = 0; rIdx < rawRings.length; rIdx++) {
      const trimmed = rawRings[rIdx].trim();
      if (!trimmed) continue;
      const body = trimmed.startsWith('M') ? trimmed.slice(1) : trimmed;
      const ptTokens = body.split('L');
      if (ptTokens.length < 3) continue;

      let twiceArea = 0;
      let firstX = 0;
      let firstY = 0;
      let prevX = 0;
      let prevY = 0;
      let validCount = 0;

      for (let i = 0; i < ptTokens.length; i++) {
        const token = ptTokens[i];
        const commaIdx = token.indexOf(',');
        if (commaIdx === -1) continue;
        const x = Number(token.slice(0, commaIdx));
        const y = Number(token.slice(commaIdx + 1));
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

        if (validCount === 0) {
          firstX = x;
          firstY = y;
        } else {
          twiceArea += prevX * y - x * prevY;
        }
        prevX = x;
        prevY = y;
        validCount++;
      }

      if (validCount >= 3) {
        twiceArea += prevX * firstY - firstX * prevY;
        const area = Math.abs(twiceArea) * 0.5;
        if (area > maxRingArea) {
          maxRingArea = area;
        }
      }
    }
    if (maxRingArea > 0) return maxRingArea;
  }

  const w = Math.max(0.001, bbox[2] - bbox[0]);
  const h = Math.max(0.001, bbox[3] - bbox[1]);
  return w * h;
}

/**
 * Checks whether a subdivision matches an explicit anchor member key (e.g. `JP::11` from `JP::11*`).
 */
function doesSubdivisionMatchAnchor(
  layer: RegisteredCsvLayer,
  sub: L2SubdivisionPathData,
  anchorMember: string
): boolean {
  const upperAnchor = anchorMember.trim().toUpperCase();
  if (!upperAnchor) return false;

  const anchorKeys = new Set<string>(layer.assignableList?.normalizeId(upperAnchor) || []);
  anchorKeys.add(upperAnchor);

  const subIso = sub.iso2?.trim().toUpperCase();
  const rawCandidates = [
    sub.code,
    sub.postal,
    sub.nameEn,
    sub.name,
    sub.nameZh,
    subIso && sub.code ? `${subIso}::${sub.code}` : undefined,
    subIso && sub.postal ? `${subIso}::${sub.postal}` : undefined
  ];

  for (const raw of rawCandidates) {
    if (!raw) continue;
    const upperRaw = raw.trim().toUpperCase();
    if (anchorKeys.has(upperRaw)) return true;
    for (const norm of layer.assignableList.normalizeId(upperRaw)) {
      if (anchorKeys.has(norm)) return true;
    }
  }
  return false;
}

/**
 * Measures 8-direction interior clearance from `(x, y)` to the boundary of `fillPath2D`.
 */
function getInteriorClearance(
  hitCtx: CanvasRenderingContext2D,
  fillPath2D: Path2D,
  x: number,
  y: number,
  maxRadius: number
): { minClearance: number; avgClearance: number } {
  const steps = 8;
  const stepDist = maxRadius / steps;
  let minClearance = maxRadius;
  let sumClearance = 0;

  for (let d = 0; d < RAY_DIRS.length; d++) {
    const [dx, dy] = RAY_DIRS[d];
    let dirClearance = maxRadius;
    for (let s = 1; s <= steps; s++) {
      const dist = s * stepDist;
      if (!hitCtx.isPointInPath(fillPath2D, x + dx * dist, y + dy * dist)) {
        dirClearance = (s - 0.5) * stepDist;
        break;
      }
    }
    if (dirClearance < minClearance) minClearance = dirClearance;
    sumClearance += dirClearance;
  }

  return {
    minClearance,
    avgClearance: sumClearance / RAY_DIRS.length
  };
}

/**
 * Computes an interior visual centroid for a merged union of subdivisions:
 * 1. Respects explicit `*` anchor member in CSV if specified (`unionAnchorMember`).
 * 2. Weights members by their largest polygon ring area (preventing island archipelagos from skewing the average).
 * 3. Uses `ctx.isPointInPath(fillPath2D, x, y)` + 8-direction ray clearance + enclave separation
 *    so concave/donut unions (like `04X` around Tokyo `03` or `07X` around Osaka `06`) always place
 *    their label deep inside their own land area and clear of neighboring centroids.
 */
function computeUnionCentroid(
  members: L2SubdivisionPathData[],
  fillPath2D: Path2D,
  otherCentroids: [number, number][],
  layer?: RegisteredCsvLayer,
  anchorMember?: string
): [number, number] {
  if (members.length === 0) return [0, 0];
  if (members.length === 1) return members[0].centroid;

  // Part C: Explicit `*` anchor member override
  if (anchorMember && layer) {
    for (let i = 0; i < members.length; i++) {
      if (doesSubdivisionMatchAnchor(layer, members[i], anchorMember)) {
        return members[i].centroid;
      }
    }
  }

  let totalWeight = 0;
  let sumX = 0;
  let sumY = 0;
  let largestMemberIdx = 0;
  let largestMemberArea = -1;

  let cMinX = Infinity;
  let cMinY = Infinity;
  let cMaxX = -Infinity;
  let cMaxY = -Infinity;

  for (let i = 0; i < members.length; i++) {
    const sub = members[i];
    const areaWeight = computeMainRingArea(sub.d, sub.bbox);
    if (areaWeight > largestMemberArea) {
      largestMemberArea = areaWeight;
      largestMemberIdx = i;
    }
    totalWeight += areaWeight;
    sumX += sub.centroid[0] * areaWeight;
    sumY += sub.centroid[1] * areaWeight;

    if (sub.centroid[0] < cMinX) cMinX = sub.centroid[0];
    if (sub.centroid[1] < cMinY) cMinY = sub.centroid[1];
    if (sub.centroid[0] > cMaxX) cMaxX = sub.centroid[0];
    if (sub.centroid[1] > cMaxY) cMaxY = sub.centroid[1];
  }

  const avgPt: [number, number] =
    totalWeight > 0
      ? [sumX / totalWeight, sumY / totalWeight]
      : members[largestMemberIdx].centroid;

  const hitCtx = getHitTestCtx();
  if (!hitCtx) return avgPt;

  const spanX = Math.max(0.15, cMaxX - cMinX);
  const spanY = Math.max(0.15, cMaxY - cMinY);
  const span = Math.max(0.2, Math.hypot(spanX, spanY));
  const maxRayRadius = Math.max(0.12, span * 0.42);
  const enclaveSafeDist = Math.max(0.12, span * 0.22);

  // Build candidate interior points: weighted average, member centroids, pairwise interpolations, and a 9x9 grid
  const candidates: [number, number][] = [avgPt];
  for (let i = 0; i < members.length; i++) {
    candidates.push(members[i].centroid);
  }
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const c1 = members[i].centroid;
      const c2 = members[j].centroid;
      candidates.push([(c1[0] + c2[0]) * 0.5, (c1[1] + c2[1]) * 0.5]);
      candidates.push([(c1[0] * 2 + c2[0]) / 3, (c1[1] * 2 + c2[1]) / 3]);
      candidates.push([(c1[0] + c2[0] * 2) / 3, (c1[1] + c2[1] * 2) / 3]);
    }
  }

  const padX = spanX * 0.2;
  const padY = spanY * 0.2;
  const gMinX = cMinX - padX;
  const gMaxX = cMaxX + padX;
  const gMinY = cMinY - padY;
  const gMaxY = cMaxY + padY;
  const gridN = 9;
  for (let gx = 0; gx < gridN; gx++) {
    const px = gMinX + ((gMaxX - gMinX) * gx) / (gridN - 1);
    for (let gy = 0; gy < gridN; gy++) {
      const py = gMinY + ((gMaxY - gMinY) * gy) / (gridN - 1);
      candidates.push([px, py]);
    }
  }

  let bestPt: [number, number] | null = null;
  let bestScore = -Infinity;

  for (let idx = 0; idx < candidates.length; idx++) {
    const [px, py] = candidates[idx];
    if (!hitCtx.isPointInPath(fillPath2D, px, py)) continue;

    const { minClearance, avgClearance } = getInteriorClearance(
      hitCtx,
      fillPath2D,
      px,
      py,
      maxRayRadius
    );

    let minEnclaveDist = Infinity;
    for (let k = 0; k < otherCentroids.length; k++) {
      const oc = otherCentroids[k];
      const d = Math.hypot(px - oc[0], py - oc[1]);
      if (d < minEnclaveDist) minEnclaveDist = d;
    }

    const enclavePenalty =
      minEnclaveDist < enclaveSafeDist
        ? (enclaveSafeDist - minEnclaveDist) * 3.2
        : 0;

    const distFromAvg = Math.hypot(px - avgPt[0], py - avgPt[1]);

    // Maximize interior thickness & clearance from boundaries/enclaves while staying near the union's center of gravity
    const score =
      minClearance * 1.9 +
      avgClearance * 0.65 -
      distFromAvg * 0.35 -
      enclavePenalty;

    if (score > bestScore) {
      bestScore = score;
      bestPt = [px, py];
    }
  }

  return bestPt ?? members[largestMemberIdx].centroid;
}

/**
 * Dissolves shared internal edges among a group of SVG path strings (`M x,y L x,y ... Z`)
 * in 2D Web Mercator map space (`0..1000`).
 *
 * - Edges with `count === 1` form `outerBorderPath2D` (the perimeter of the merged union).
 * - Edges with `count > 1` form `internalBorderPath2D` (used to seal 0.5px anti-aliasing seams).
 */
function dissolveGroupSvgPaths(pathsD: string[]): {
  outerBorderPath2D: Path2D;
  internalBorderPath2D: Path2D | null;
} {
  const edgeMap = new Map<string, EdgeRecord>();
  const precision = 1e4;

  for (let dIdx = 0; dIdx < pathsD.length; dIdx++) {
    const d = pathsD[dIdx];
    if (!d) continue;
    const rawRings = d.split('Z');
    for (let rIdx = 0; rIdx < rawRings.length; rIdx++) {
      const trimmed = rawRings[rIdx].trim();
      if (!trimmed) continue;
      const body = trimmed.startsWith('M') ? trimmed.slice(1) : trimmed;
      const ptTokens = body.split('L');
      if (ptTokens.length < 3) continue;

      const pts: [number, number][] = [];
      for (let i = 0; i < ptTokens.length; i++) {
        const token = ptTokens[i];
        const commaIdx = token.indexOf(',');
        if (commaIdx === -1) continue;
        const x = Number(token.slice(0, commaIdx));
        const y = Number(token.slice(commaIdx + 1));
        if (Number.isFinite(x) && Number.isFinite(y)) {
          pts.push([x, y]);
        }
      }
      if (pts.length < 3) continue;

      const first = pts[0];
      const last = pts[pts.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        pts.push(first);
      }

      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const k1 = `${Math.round(p1[0] * precision)},${Math.round(p1[1] * precision)}`;
        const k2 = `${Math.round(p2[0] * precision)},${Math.round(p2[1] * precision)}`;
        if (k1 === k2) continue;

        const edgeKey = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
        const existing = edgeMap.get(edgeKey);
        if (existing) {
          existing.count++;
        } else {
          edgeMap.set(edgeKey, { count: 1, p1, p2 });
        }
      }
    }
  }

  const outerParts: string[] = [];
  const internalParts: string[] = [];

  for (const edge of edgeMap.values()) {
    const seg = `M${edge.p1[0]},${edge.p1[1]}L${edge.p2[0]},${edge.p2[1]}`;
    if (edge.count === 1) {
      outerParts.push(seg);
    } else {
      internalParts.push(seg);
    }
  }

  return {
    outerBorderPath2D: new Path2D(outerParts.join('')),
    internalBorderPath2D: internalParts.length > 0 ? new Path2D(internalParts.join('')) : null
  };
}

/**
 * Builds or retrieves a cached `CountryUnionLayout` for `(layerId, iso2)` when
 * the layer defines pipe-delimited union groups (`A|B|C`).
 */
export function getCountryUnionLayout(
  layerId: string,
  iso2: string,
  subs: L2SubdivisionPathData[]
): CountryUnionLayout | null {
  if (!subs || subs.length === 0) return null;
  const layer = getCsvLayerById(layerId);
  if (!layer || !layer.loaded || !layer.data) return null;

  const hasAnyUnionRow = layer.data.rows.some((r) => Boolean(r.unionGroupId));
  if (!hasAnyUnionRow) return null;

  const cacheKey = `${layer.id}:${iso2}:${subs.length}`;
  const cached = unionLayoutCache.get(cacheKey);
  if (cached) return cached;

  const groupedSubs = new Map<string, L2SubdivisionPathData[]>();
  const groupAnchorMap = new Map<string, string>();
  let hasUnionGroups = false;

  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i];
    const row = getCsvSubdivisionRow(layer.id, sub);
    const groupId = row?.unionGroupId ? `union:${row.unionGroupId}` : `single:${String(sub.id)}`;
    if (row?.unionAnchorMember && !groupAnchorMap.has(groupId)) {
      groupAnchorMap.set(groupId, row.unionAnchorMember);
    }
    let list = groupedSubs.get(groupId);
    if (!list) {
      list = [];
      groupedSubs.set(groupId, list);
    }
    list.push(sub);
    if (list.length > 1) {
      hasUnionGroups = true;
    }
  }

  if (!hasUnionGroups) return null;

  const groups: SubdivisionUnionGroup[] = [];
  const subIdToGroup = new Map<string, SubdivisionUnionGroup>();
  const countryBordersPath2D = new Path2D();

  // Pass 1: Build paths and single-member centroids
  for (const [groupId, members] of groupedSubs.entries()) {
    const isUnion = members.length > 1;
    const memberIdSet = new Set<string>(members.map((m) => String(m.id)));
    const code = getCsvSubdivisionCode(layer.id, members[0]);

    let fillPath2D: Path2D;
    let outerBorderPath2D: Path2D;
    let internalBorderPath2D: Path2D | null = null;

    if (!isUnion) {
      fillPath2D = members[0].path2D;
      outerBorderPath2D = members[0].path2D;
    } else {
      fillPath2D = new Path2D();
      const pathsD: string[] = [];
      for (let i = 0; i < members.length; i++) {
        fillPath2D.addPath(members[i].path2D);
        if (members[i].d) pathsD.push(members[i].d!);
      }
      if (pathsD.length === members.length) {
        const dissolved = dissolveGroupSvgPaths(pathsD);
        outerBorderPath2D = dissolved.outerBorderPath2D;
        internalBorderPath2D = dissolved.internalBorderPath2D;
      } else {
        outerBorderPath2D = fillPath2D;
      }
    }

    countryBordersPath2D.addPath(outerBorderPath2D);

    const group: SubdivisionUnionGroup = {
      groupId,
      isUnion,
      members,
      memberIdSet,
      fillPath2D,
      outerBorderPath2D,
      internalBorderPath2D,
      centroid: members[0].centroid,
      code
    };

    groups.push(group);
    for (let i = 0; i < members.length; i++) {
      subIdToGroup.set(String(members[i].id), group);
    }
  }

  // Pass 2: Compute interior visual centroids for multi-member unions, aware of enclave centroids
  const settledCentroids: [number, number][] = [];
  for (let i = 0; i < groups.length; i++) {
    if (!groups[i].isUnion) {
      settledCentroids.push(groups[i].centroid);
    }
  }
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (!group.isUnion) continue;
    group.centroid = computeUnionCentroid(
      group.members,
      group.fillPath2D,
      settledCentroids,
      layer,
      groupAnchorMap.get(group.groupId)
    );
    settledCentroids.push(group.centroid);
  }

  const layout: CountryUnionLayout = {
    layerId: layer.id,
    iso2,
    hasUnionGroups: true,
    groups,
    subIdToGroup,
    countryBordersPath2D
  };

  unionLayoutCache.set(cacheKey, layout);
  return layout;
}

/**
 * Finds the active `CountryUnionLayout` for `iso2` among currently active regional filters, if any.
 */
export function getActiveCountryUnionLayout(
  iso2: string,
  subs: L2SubdivisionPathData[] | undefined,
  activeRegionalFilters: Set<string> | undefined
): CountryUnionLayout | null {
  if (!subs || subs.length === 0 || !activeRegionalFilters || activeRegionalFilters.size === 0) {
    return null;
  }
  const upperIso = iso2.toUpperCase();
  for (const filterId of activeRegionalFilters) {
    const layer = getCsvLayerById(filterId);
    if (!layer || !layer.loaded || !layer.data) continue;
    const targetsCountry =
      layer.targetIso2 === upperIso ||
      (layer.targetIso2s && layer.targetIso2s.includes(upperIso));
    if (!targetsCountry) continue;
    const layout = getCountryUnionLayout(layer.id, upperIso, subs);
    if (layout) return layout;
  }
  return null;
}
