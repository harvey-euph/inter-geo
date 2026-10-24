import { findCountry } from '../data/countries';
import { ROADS_MANIFEST } from '../data/roadsManifest';
import type { RoadPathData } from '../data/roadsMeta';
import { MAP_W, MAP_H } from './geo';
import {
  WORLD_COPIES,
  type ActiveL3ParentInfo,
  type CountryPathData,
  type CrossingBadgeBox,
  type HitFeature,
  type L2SubdivisionPathData,
  type L3SubdivisionPathData,
  type TaipowerZoneRenderItem
} from './types';

export interface HitTestParams {
  clientX: number;
  clientY: number;
  container: HTMLDivElement | null;
  canvas: HTMLCanvasElement | null;
  transform: { k: number; x: number; y: number };
  activeInternationalImageFilter: string | null;
  activeRegionalFilters: Set<string>;
  renderedCrossingBadges: CrossingBadgeBox[];
  countryPathData: CountryPathData[];
  countryPathMap: Map<string, CountryPathData>;
  isAnyRoadActive: () => boolean;
  isCountryAnyRoadActive: (iso2: string) => boolean;
  isCountryRoadClassActive: (iso2: string, roadClass: 'Interstate' | 'Federal') => boolean;
  visibleRoadCopies: number[];
  visibleRoadIso2s: Set<string>;
  loadedRoads: Map<string, RoadPathData[]>;
  activeL3Parent: ActiveL3ParentInfo | null;
  hoveredL3Parent: ActiveL3ParentInfo | null;
  getL3SubdivisionsForParent: (
    iso2: string,
    name?: string,
    code?: string,
    id?: string | number
  ) => L3SubdivisionPathData[];
  taipowerZoneRenderItems: TaipowerZoneRenderItem[];
  countryBBoxes: Record<string, [number, number, number, number]>;
  l2ByCountry: Record<string, L2SubdivisionPathData[]>;
  l2DissolvedByCountry: Record<string, Path2D>;
  expandedL2Countries: Set<string>;
  preferredL2Path: L2SubdivisionPathData | null;
  preferredL3Path: L3SubdivisionPathData | null;
}

/**
 * Hierarchical 2D Canvas Hit-Testing Pipeline:
 * 0. Floating European Pedestrian Crossing Sign Badges
 * 1. Highway & Route Networks (10px stroke tolerance)
 * 2a. L3 Municipalities / Subdivisions & Active Parent Interior
 * 2a-2. Taiwan Taipower Grid Zones
 * 2b. L2 Admin-1 Subdivisions
 * 2c. L1 Countries
 */
export function hitTestMapFeature(params: HitTestParams): HitFeature | null {
  const {
    clientX,
    clientY,
    container,
    canvas,
    transform,
    activeInternationalImageFilter,
    activeRegionalFilters,
    renderedCrossingBadges,
    countryPathData,
    countryPathMap,
    isAnyRoadActive,
    isCountryAnyRoadActive,
    isCountryRoadClassActive,
    visibleRoadCopies,
    visibleRoadIso2s,
    loadedRoads,
    activeL3Parent,
    hoveredL3Parent,
    getL3SubdivisionsForParent,
    taipowerZoneRenderItems,
    countryBBoxes,
    l2ByCountry,
    l2DissolvedByCountry,
    expandedL2Countries,
    preferredL2Path,
    preferredL3Path
  } = params;

  const rect = container?.getBoundingClientRect();
  if (!rect) return null;
  const mx = clientX - rect.left;
  const my = clientY - rect.top;

  const { k, x, y } = transform;
  const dpr = window.devicePixelRatio || 1;
  if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 0. European Pedestrian Crossing Sign Badges (Direct click / hover on floating badge)
  if (
    activeInternationalImageFilter === 'pedestrian-crossing' ||
    activeRegionalFilters?.has('eu-pedestrian-crossing')
  ) {
    for (let b = 0; b < renderedCrossingBadges.length; b++) {
      const badge = renderedCrossingBadges[b];
      if (mx >= badge.x1 && mx <= badge.x2 && my >= badge.y1 && my <= badge.y2) {
        const c = countryPathMap.get(badge.iso2);
        if (c) {
          return { type: 'country', data: c };
        }
      }
    }
  }

  // 1. In Highway Exploration Mode: Hit test roads with 10px stroke tolerance
  if (isAnyRoadActive()) {
    const tolerancePx = 10;
    const toleranceMap = tolerancePx / k;
    let candidateFederal: RoadPathData | null = null;

    for (const copyIdx of visibleRoadCopies) {
      const mapX = (mx - x) / k - copyIdx * MAP_W;
      const mapY = (my - y) / k;

      ctx.setTransform(
        k * dpr,
        0,
        0,
        k * dpr,
        (x + copyIdx * MAP_W * k) * dpr,
        y * dpr
      );
      ctx.lineWidth = (tolerancePx * 2) / k;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';

      for (const iso2 of visibleRoadIso2s) {
        if (!isCountryAnyRoadActive(iso2)) continue;

        const entry = ROADS_MANIFEST[iso2];
        if (entry) {
          const b = entry.bbox;
          if (
            mapX < b.minX - toleranceMap ||
            mapX > b.maxX + toleranceMap ||
            mapY < b.minY - toleranceMap ||
            mapY > b.maxY + toleranceMap
          ) {
            continue;
          }
        }
        const roads = loadedRoads.get(iso2);
        if (!roads) continue;

        for (let i = 0; i < roads.length; i++) {
          const road = roads[i];
          const roadIso = road.iso2 || iso2;
          if (!isCountryRoadClassActive(roadIso, road.class)) continue;

          const [minX, minY, maxX, maxY] = road.bbox;
          if (
            mapX < minX - toleranceMap ||
            mapX > maxX + toleranceMap ||
            mapY < minY - toleranceMap ||
            mapY > maxY + toleranceMap
          ) {
            continue;
          }

          if (road.path2D && ctx.isPointInStroke(road.path2D, mx * dpr, my * dpr)) {
            if (road.class === 'Interstate') {
              return { type: 'road', data: road };
            }
            if (!candidateFederal) {
              candidateFederal = road;
            }
          }
        }
      }
    }
    if (candidateFederal) {
      return { type: 'road', data: candidateFederal };
    }
  }

  // Fast path: while the pointer remains inside its current polygon, avoid
  // scanning every L3/L2 feature on each pointer frame.
  const preferredPaths: Array<{ path: Path2D; bbox: [number, number, number, number]; item: L3SubdivisionPathData }> = [];
  if (preferredL3Path) {
    const parentVisible = [hoveredL3Parent, activeL3Parent].some(
      (parent) => parent?.iso2 === preferredL3Path.iso2 &&
        (String(parent.id) === String(preferredL3Path.parentCode) || parent.name === preferredL3Path.parentName || parent.code === preferredL3Path.parentCode)
    );
    if (parentVisible) preferredPaths.push({ path: preferredL3Path.path2D, bbox: preferredL3Path.bbox, item: preferredL3Path });
  }
  for (const candidate of preferredPaths) {
    for (const copyIdx of WORLD_COPIES) {
      const mapX = (mx - x) / k - copyIdx * MAP_W;
      const mapY = (my - y) / k;
      const [minX, minY, maxX, maxY] = candidate.bbox;
      if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;
      ctx.setTransform(k * dpr, 0, 0, k * dpr, (x + copyIdx * MAP_W * k) * dpr, y * dpr);
      if (!ctx.isPointInPath(candidate.path, mx * dpr, my * dpr)) continue;
      const item = candidate.item;
      const cMeta = findCountry(item.iso2);
      return {
        type: 'municipality',
        path: item,
        data: {
          code: item.id || item.code,
          pref: item.parentName,
          city: item.name,
          nameZh: item.nameZh || `${item.parentName} ${item.name}`,
          iso2: item.iso2,
          countryName: cMeta?.name || '',
          countryNameZh: cMeta?.nameZh || '',
          countryFlag: cMeta?.flag || '🌐',
          typeEn: item.typeEn || 'District',
          parentName: item.parentName,
          parentCode: item.parentCode
        }
      };
    }
  }

  // 2. Normal Mode: Hierarchical Polygon Hit-Testing (L3 -> L2 Subdivisions -> L1 Countries)
  const isL2RegionMode = expandedL2Countries.size > 0;
  const useHighRes = k >= 1.8;

  for (const copyIdx of WORLD_COPIES) {
    const mapX = (mx - x) / k - copyIdx * MAP_W;
    const mapY = (my - y) / k;

    if (mapX < 0 || mapX > MAP_W || mapY < 0 || mapY > MAP_H) {
      continue;
    }

    ctx.setTransform(
      k * dpr,
      0,
      0,
      k * dpr,
      (x + copyIdx * MAP_W * k) * dpr,
      y * dpr
    );

    // 2a. Check L3 Municipalities / Subdivisions (if L3 mode and copy 0 or 1)
    if (copyIdx === 0 || copyIdx === 1) {
      const l3Parents = [hoveredL3Parent, activeL3Parent].filter(
        (parent, index, all): parent is ActiveL3ParentInfo =>
          !!parent && all.findIndex((item) => item?.iso2 === parent.iso2 && String(item?.id) === String(parent.id)) === index
      );
      for (const l3Parent of l3Parents) {
      const children = getL3SubdivisionsForParent(l3Parent.iso2, l3Parent.name, l3Parent.code, l3Parent.id);
      for (let pIdx = 0; pIdx < children.length; pIdx++) {
        const item = children[pIdx];
        const [minX, minY, maxX, maxY] = item.bbox;
        if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;

        if (ctx.isPointInPath(item.path2D, mx * dpr, my * dpr)) {
          const cMeta = findCountry(item.iso2);
          return {
            type: 'municipality',
            path: item,
            data: {
              code: item.id || item.code,
              pref: item.parentName,
              city: item.name,
              nameZh: item.nameZh || `${item.parentName} ${item.name}`,
              iso2: item.iso2,
              countryName: cMeta?.name || '',
              countryNameZh: cMeta?.nameZh || '',
              countryFlag: cMeta?.flag || '🌐',
              typeEn: item.typeEn || 'District',
              parentName: item.parentName,
              parentCode: item.parentCode
            }
          };
        }
      }

      // Check if cursor is over water/gap within active parent (only when L3 children actually exist)
      if (children.length > 0 && l3Parent.path2D) {
        const [minX, minY, maxX, maxY] = l3Parent.bbox;
        if (mapX >= minX && mapX <= maxX && mapY >= minY && mapY <= maxY) {
          if (ctx.isPointInPath(l3Parent.path2D, mx * dpr, my * dpr)) {
            return {
              type: 'activeParentInterior',
              data: l3Parent
            };
          }
        }
      }
      }
    }

    // 2a-2. Check Taipower Grid Zones (if filter active at L2/L3)
    if (activeRegionalFilters?.has('taiwan-power-poles') && (copyIdx === 0 || copyIdx === 1)) {
      for (let i = 0; i < taipowerZoneRenderItems.length; i++) {
        const item = taipowerZoneRenderItems[i];
        const [minX, minY, maxX, maxY] = item.bbox;
        if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;
        if (ctx.isPointInPath(item.polygonPath2D, mx * dpr, my * dpr)) {
          return {
            type: 'taipowerZone',
            data: item.zone
          };
        }
      }
    }

    // 2b. Check L2 Admin-1 Subdivisions with Hierarchical Country BBox Index (Only in L2/L3 mode)
    if (isL2RegionMode && (copyIdx === 0 || copyIdx === 1)) {
      if (preferredL2Path && expandedL2Countries.has(preferredL2Path.iso2)) {
        const [minX, minY, maxX, maxY] = preferredL2Path.bbox;
        if (mapX >= minX && mapX <= maxX && mapY >= minY && mapY <= maxY) {
          if (ctx.isPointInPath(preferredL2Path.path2D, mx * dpr, my * dpr)) {
            return { type: 'l2Subdivision', data: preferredL2Path };
          }
        }
      }
      for (const iso2 in l2ByCountry) {
        if (!expandedL2Countries.has(iso2)) continue;
        const cBox = countryBBoxes[iso2];
        if (cBox) {
          if (mapX < cBox[0] || mapX > cBox[2] || mapY < cBox[1] || mapY > cBox[3]) continue;
        }

        const subs = l2ByCountry[iso2];
        if (!subs) continue;
        for (let i = 0; i < subs.length; i++) {
          const sub = subs[i];
          const [minX, minY, maxX, maxY] = sub.bbox;
          if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;
          if (ctx.isPointInPath(sub.path2D, mx * dpr, my * dpr)) {
            return { type: 'l2Subdivision', data: sub };
          }
        }
      }
    }

    // 2c. Check L1 Countries (At L1, check ALL countries; at L2/L3, check countries NOT covered by L2)
    for (let i = 0; i < countryPathData.length; i++) {
      const c = countryPathData[i];
      const iso2 = c.countryMeta?.iso2;
      const path =
        (useHighRes && !expandedL2Countries.has(iso2 || '') && iso2 && l2DissolvedByCountry[iso2]) || c.path2D;
      const [minX, minY, maxX, maxY] =
        (useHighRes && !isL2RegionMode && iso2 && countryBBoxes[iso2]) || c.bbox;
      if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;
      if (ctx.isPointInPath(path, mx * dpr, my * dpr)) {
        return { type: 'country', data: c };
      }
    }
  }

  return null;
}
