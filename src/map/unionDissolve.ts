import {
  getCsvLayerById,
  getCsvSubdivisionCode,
  getCsvSubdivisionRow
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

interface EdgeRecord {
  count: number;
  p1: [number, number];
  p2: [number, number];
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
 * Computes an area-weighted centroid for a merged union of subdivisions.
 */
function computeUnionCentroid(members: L2SubdivisionPathData[]): [number, number] {
  if (members.length === 0) return [0, 0];
  if (members.length === 1) return members[0].centroid;

  let totalWeight = 0;
  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < members.length; i++) {
    const sub = members[i];
    const w = Math.max(0.001, sub.bbox[2] - sub.bbox[0]);
    const h = Math.max(0.001, sub.bbox[3] - sub.bbox[1]);
    const areaWeight = w * h;
    totalWeight += areaWeight;
    sumX += sub.centroid[0] * areaWeight;
    sumY += sub.centroid[1] * areaWeight;
  }

  if (totalWeight <= 0) return members[0].centroid;
  return [sumX / totalWeight, sumY / totalWeight];
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
  let hasUnionGroups = false;

  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i];
    const row = getCsvSubdivisionRow(layer.id, sub);
    const groupId = row?.unionGroupId ? `union:${row.unionGroupId}` : `single:${String(sub.id)}`;
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
      centroid: computeUnionCentroid(members),
      code
    };

    groups.push(group);
    for (let i = 0; i < members.length; i++) {
      subIdToGroup.set(String(members[i].id), group);
    }
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
