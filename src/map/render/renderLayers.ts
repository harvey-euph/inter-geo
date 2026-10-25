import type { CountryData } from '../../types/geo';
import type { L2SubdivisionDetail, MunicipalityDetail } from '../../types/lod';
import type { FilterDefinition } from '../../data/filters';
import type { RoadPathData } from '../../data/roadsMeta';
import type { TaipowerZoneDef } from '../../data/taiwanPowerPoles';
import { isCapitalSubdivision } from '../../data/capitalSubdivisions';
import { COUNTRIES_WITH_AREA_CODES } from '../../data/nationwideFilters';
import { getSubdivisionAreaCodeBadge } from '../../data/domesticAreaCodes';
import { EUROPEAN_CROSSING_SIGNS } from '../../data/pedestrianCrossing';
import {
  COUNTRY_LABEL_CENTROIDS,
  GLOBAL_TEXT_FILTERS_BY_ID,
  getCombinedTextOverlay
} from '../../data/globalFilters';
import {
  getRegisteredCsvFilters,
  getCsvSubdivisionValue
} from '../../filters/csvFilterRegistry';
import { MAP_W } from '../geo';
import {
  MAP_COLORS,
  MONO_BADGE_FONT,
  inView,
  drawPill,
  fillRoadMarkingPolygon
} from '../theme';
import type {
  ActiveL3ParentInfo,
  CountryPathData,
  CrossingBadgeBox,
  L2SubdivisionPathData,
  L3SubdivisionPathData,
  RoadBundle,
  TaipowerZoneRenderItem
} from '../types';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  k: number;
  x: number;
  y: number;
  vw: number;
  vh: number;
  dpr: number;
  visibleCopies: number[];
  isL2RegionMode: boolean;
  hasL3RegionMode: boolean;
  expandedL2Countries: Set<string>;
  layerHoveredCountries: Set<string>;
  layerHoveredL2Subdivisions: Set<string>;
  activeFilter: FilterDefinition;
  activeTextFilters: Set<string>;
  activeInternationalImageFilter: string | null;
  activeRegionalFilters: Set<string>;
  countryPathData: CountryPathData[];
  countryPathMap: Map<string, CountryPathData>;
  l1WorldBordersPath: Path2D;
  combinedByCountry: Record<string, Path2D>;
  dissolvedByCountry: Record<string, Path2D>;
  countryBBoxes: Record<string, [number, number, number, number]>;
  countryMap: Map<string, CountryData>;
  l2ByCountry: Record<string, L2SubdivisionPathData[]>;
  activeL3Parent: ActiveL3ParentInfo | null;
  hoveredL3Parent: ActiveL3ParentInfo | null;
  getL3SubdivisionsForParent: (
    iso2: string,
    name?: string,
    code?: string,
    id?: string | number
  ) => L3SubdivisionPathData[];
  taipowerZoneRenderItems: TaipowerZoneRenderItem[];
  hoveredTaipowerZone: TaipowerZoneDef | null;
  visibleRoadIso2s: Set<string>;
  roadBundles: Map<string, RoadBundle>;
  isAnyRoadActive: () => boolean;
  isCountryRoadClassActive: (iso2: string, roadClass: 'Interstate' | 'Federal') => boolean;
  selectedRoad: RoadPathData | null;
  hoveredRoad: RoadPathData | null;
  hoveredCountry: CountryData | null;
  selectedCountry: CountryData | null;
  hoveredMunicipality: MunicipalityDetail | null;
  selectedMunicipality: MunicipalityDetail | null;
  hoveredL2Subdivision: L2SubdivisionDetail | null;
  selectedL2Subdivision: { iso2: string; id: number | string } | null;
  badgeWidthCache: Map<string, number>;
  crossingImages: Map<string, HTMLImageElement>;
}

/**
 * Layers 1–5: Vector geometry rendered in map space for each visible periodic world copy.
 */
export function drawWorldCopyLayers(rc: RenderContext): void {
  const {
    ctx,
    k,
    x,
    y,
    vw,
    vh,
    dpr,
    visibleCopies,
    isL2RegionMode,
    hasL3RegionMode,
    expandedL2Countries,
    layerHoveredCountries,
    layerHoveredL2Subdivisions,
    activeFilter,
    activeRegionalFilters,
    countryPathData,
    countryPathMap,
    l1WorldBordersPath,
    combinedByCountry,
    dissolvedByCountry,
    countryBBoxes,
    countryMap,
    l2ByCountry,
    activeL3Parent,
    hoveredL3Parent,
    getL3SubdivisionsForParent,
    taipowerZoneRenderItems,
    hoveredTaipowerZone,
    visibleRoadIso2s,
    roadBundles,
    isAnyRoadActive,
    isCountryRoadClassActive,
    selectedRoad,
    hoveredRoad,
    hoveredCountry: hoveredC,
    selectedCountry: selectedC,
    hoveredMunicipality: hoveredM,
    selectedMunicipality: selectedM,
    hoveredL2Subdivision: hoveredL2,
    selectedL2Subdivision: selectedL2
  } = rc;

  const highlightHoverPaths: Path2D[] = [];
  const highlightSelectPaths: Path2D[] = [];

  for (const copyIdx of visibleCopies) {
    ctx.setTransform(
      k * dpr,
      0,
      0,
      k * dpr,
      (x + copyIdx * MAP_W * k) * dpr,
      y * dpr
    );

    const copyOffset = copyIdx * MAP_W;

    // ========================================================
    // 1. Layer 1: Country Landmass (Direct Vector Rendering at L1 & Non-L2 Countries at L2/L3)
    // ========================================================
    const useHighRes = k >= 1.8;
    for (let i = 0; i < countryPathData.length; i++) {
      const item = countryPathData[i];
      if (!item.path2D) continue;

      const iso2 = item.countryMeta?.iso2;
      const isCountryL2Region = !!iso2 && expandedL2Countries.has(iso2);
      // In L2/L3 region mode, skip countries that have L2 subdivision datasets loaded
      if (iso2 && expandedL2Countries.has(iso2)) continue;

      // Viewport culling
      const bbox = (useHighRes && iso2 && countryBBoxes[iso2]) || item.bbox;
      if (!inView(bbox, copyOffset, k, x, y, vw, vh, 50)) continue;

      const isHovered =
        layerHoveredCountries.has(iso2 || '') ||
        (hoveredC &&
          (hoveredC.id === item.countryMeta?.id || (item.countryMeta && hoveredC.iso2 === item.countryMeta.iso2)));
      const isSelected =
        !selectedL2 &&
        selectedC &&
        (selectedC.id === item.countryMeta?.id || (item.countryMeta && selectedC.iso2 === item.countryMeta.iso2));

      // Scheme C: Sub-pixel screen-space culling
      const [minX, minY, maxX, maxY] = bbox;
      const screenW = (maxX - minX) * k;
      const screenH = (maxY - minY) * k;
      if (!isSelected && !isHovered && screenW < 1.5 && screenH < 1.5) continue;

      let fillColor: string | CanvasGradient;
      if (isSelected) {
        fillColor = MAP_COLORS.selected;
      } else if (isHovered) {
        fillColor = MAP_COLORS.hovered;
      } else if (!item.countryMeta) {
        fillColor = MAP_COLORS.unmappedFill;
      } else if (activeFilter.id === 'roadLines' && isCountryL2Region) {
        fillColor = MAP_COLORS.defaultFill;
      } else {
        fillColor = activeFilter.getColor(item.countryMeta) || MAP_COLORS.defaultFill;
      }

      const renderPath = (useHighRes && iso2 && dissolvedByCountry[iso2]) || item.path2D;

      const paintRoadMarkings =
        activeFilter.id === 'roadLines' &&
        !isCountryL2Region &&
        !isSelected &&
        !isHovered &&
        !!item.countryMeta;

      if (paintRoadMarkings && item.countryMeta) {
        fillRoadMarkingPolygon(ctx, renderPath, item.countryMeta.iso2, 8.5 / k);
      } else {
        ctx.fillStyle = fillColor;
        ctx.fill(renderPath);
      }

      // At regional zoom (k >= 1.8), stroke individual country boundary
      if (useHighRes) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.8 / k;
        ctx.stroke(renderPath);
      }

      if (isSelected) {
        highlightSelectPaths.push(renderPath);
      } else if (isHovered) {
        highlightHoverPaths.push(renderPath);
      }
    }

    // At overview zoom (k < 1.8), stroke all national borders in 1 single ultra-fast batched call
    if (!useHighRes) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.8 / k;
      ctx.stroke(l1WorldBordersPath);
    }

    // 2. Layer 2: Admin-1 Subdivisions (Worldwide L2 Base Layer - Only in L2/L3 mode)
    if (isL2RegionMode && (copyIdx === 0 || copyIdx === 1)) {
      const isCapitalFilterActive = activeRegionalFilters.has('nationwide-capital');

      for (const iso2 in l2ByCountry) {
        if (!expandedL2Countries.has(iso2)) continue;
        const bbox = countryBBoxes[iso2];
        if (bbox && !inView(bbox, copyOffset, k, x, y, vw, vh, 50)) continue;

        const countryCombined = combinedByCountry[iso2];
        if (!countryCombined) continue;

        const cMeta = countryMap.get(iso2);

        if (isCapitalFilterActive) {
          const subs = l2ByCountry[iso2];
          if (subs) {
            for (let sIdx = 0; sIdx < subs.length; sIdx++) {
              const sub = subs[sIdx];
              const isCapital = isCapitalSubdivision(iso2, sub);
              if (isCapital) {
                ctx.fillStyle = MAP_COLORS.capitalFill;
                ctx.fill(sub.path2D);
                const layerHovered = layerHoveredL2Subdivisions.has(`${iso2}:${String(sub.id)}`);
                ctx.strokeStyle = layerHovered ? '#ffffff' : MAP_COLORS.capitalStroke;
                ctx.lineWidth = (layerHovered ? 1.8 : 1.6) / k;
                ctx.stroke(sub.path2D);
              } else {
                ctx.fillStyle = 'rgba(20, 26, 38, 0.75)';
                ctx.fill(sub.path2D);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.lineWidth = 0.5 / k;
                ctx.stroke(sub.path2D);
              }
            }
          }
          // Stroke national boundary with bold crisp black line
          const nationalBorder = dissolvedByCountry[iso2] || countryPathMap.get(iso2)?.path2D;
          if (nationalBorder) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.2 / k;
            ctx.stroke(nationalBorder);
          }
        } else {
          const isParentSelected = selectedC?.iso2 === iso2 && !selectedL2;
          const isSiblingHovered =
            layerHoveredCountries.has(iso2) ||
            (hoveredC?.iso2 === iso2) ||
            (hoveredL2 && hoveredL2.iso2 === iso2) ||
            (hoveredM && hoveredM.iso2 === iso2) ||
            (activeL3Parent && activeL3Parent.iso2 === iso2) ||
            (hoveredL3Parent && hoveredL3Parent.iso2 === iso2);

          // 1. Fill all subdivisions of this country in 1 draw call.
          // Road markings stay on L1 country shapes; at L2 the landmass uses the plain fill.
          const defaultFill =
            activeFilter.id === 'roadLines'
              ? MAP_COLORS.defaultFill
              : (cMeta && activeFilter.getColor(cMeta)) || MAP_COLORS.defaultFill;
          ctx.fillStyle = isParentSelected ? 'rgba(59, 130, 246, 0.34)' : isSiblingHovered ? 'rgba(251, 146, 60, 0.16)' : defaultFill;
          ctx.fill(countryCombined);

          // 2. Stroke all subdivision borders of this country in 1 draw call (Thin internal boundaries: 0.6 / k)
          ctx.strokeStyle = isParentSelected ? 'rgba(96, 165, 250, 0.75)' : isSiblingHovered ? 'rgba(251, 146, 60, 0.45)' : 'rgba(255, 255, 255, 0.22)';
          ctx.lineWidth = 0.6 / k;
          ctx.stroke(countryCombined);

          // 3. Stroke national boundary with bold crisp black line (National border: 2.2 / k)
          const nationalBorder = dissolvedByCountry[iso2] || countryPathMap.get(iso2)?.path2D;
          if (nationalBorder) {
            ctx.strokeStyle = isParentSelected ? MAP_COLORS.selected : '#000000';
            ctx.lineWidth = (isParentSelected ? 3 : 2.2) / k;
            ctx.stroke(nationalBorder);
            if (isParentSelected) highlightSelectPaths.push(nationalBorder);
          }
        }
      }

      // 3. Highlight Selected L2 Subdivision on top
      if (selectedL2) {
        const subs = l2ByCountry[selectedL2.iso2];
        const selSub = subs?.find((s) => String(s.id) === String(selectedL2.id));
        if (selSub?.path2D) {
          ctx.fillStyle = MAP_COLORS.selected;
          ctx.fill(selSub.path2D);
          ctx.strokeStyle = MAP_COLORS.selected;
          ctx.lineWidth = 1.2 / k;
          ctx.stroke(selSub.path2D);
          highlightSelectPaths.push(selSub.path2D);
        }
      }

      // 4. Highlight Hovered L2 Subdivision on top
      if (
        hoveredL2 &&
        (!selectedL2 || hoveredL2.iso2 !== selectedL2.iso2 || String(hoveredL2.id) !== String(selectedL2.id))
      ) {
        const subs = l2ByCountry[hoveredL2.iso2];
        const hovSub = subs?.find((s) => String(s.id) === String(hoveredL2.id));
        if (hovSub?.path2D) {
          ctx.fillStyle = MAP_COLORS.hovered;
          ctx.fill(hovSub.path2D);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4 / k;
          ctx.stroke(hovSub.path2D);
          highlightHoverPaths.push(hovSub.path2D);
        }
      }

      // Layer targets with matching nationwide entries receive the same visual
      // emphasis as hover, without overwriting the pointer's actual hovered feature.
      for (const iso2 of expandedL2Countries) {
        const subs = l2ByCountry[iso2];
        if (!subs) continue;
        for (const sub of subs) {
          if (!layerHoveredL2Subdivisions.has(`${iso2}:${String(sub.id)}`)) continue;
          if (activeRegionalFilters.has('nationwide-capital') && isCapitalSubdivision(iso2, sub)) continue;
          ctx.fillStyle = MAP_COLORS.hovered;
          ctx.fill(sub.path2D);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4 / k;
          ctx.stroke(sub.path2D);
          highlightHoverPaths.push(sub.path2D);
        }
      }
    }

    // ----------------------------------------------------
    // 3. Layer 3: L3 Subdivisions (Municipalities, Counties, Landkreise, etc.)
    // ----------------------------------------------------
    if (copyIdx === 0 || copyIdx === 1) {
      const l3Parents = [activeL3Parent, hoveredL3Parent].filter(
        (parent, index, all): parent is ActiveL3ParentInfo =>
          !!parent && all.findIndex((item) => item?.iso2 === parent.iso2 && String(item?.id) === String(parent.id)) === index
      );
      for (const l3Parent of l3Parents) {
      const children = getL3SubdivisionsForParent(l3Parent.iso2, l3Parent.name, l3Parent.code, l3Parent.id);
      for (let cIdx = 0; cIdx < children.length; cIdx++) {
        const item = children[cIdx];
        if (!item.path2D) continue;

        if (!inView(item.bbox, copyOffset, k, x, y, vw, vh, 50)) continue;

        const isHovered =
          hoveredM &&
          hoveredM.iso2 === item.iso2 &&
          (hoveredM.code === item.id || hoveredM.code === item.code);
        const isSelected =
          selectedM &&
          selectedM.iso2 === item.iso2 &&
          (selectedM.code === item.id || selectedM.code === item.code);

        let fill = 'rgba(234, 88, 12, 0.25)';
        let stroke = 'rgba(251, 146, 60, 0.45)';
        let strokeWidth = 0.35 / k;

        if (isSelected) {
          fill = MAP_COLORS.selected;
          stroke = MAP_COLORS.selected;
          strokeWidth = 0.8 / k;
        } else if (isHovered) {
          fill = MAP_COLORS.hovered;
          stroke = '#ffffff';
          strokeWidth = 0.8 / k;
        }

        ctx.fillStyle = fill;
        ctx.fill(item.path2D);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        ctx.stroke(item.path2D);

        if (isSelected) {
          highlightSelectPaths.push(item.path2D);
        } else if (isHovered) {
          highlightHoverPaths.push(item.path2D);
        }
      }
      }
    }

    // ----------------------------------------------------
    // Layer 3b: Taiwan Taipower Pole Grid Overlay (Nationwide Coloring Filter)
    // ----------------------------------------------------
    const isTaipowerGridActive = activeRegionalFilters.has('taiwan-power-poles');
    if (isTaipowerGridActive) {
      for (let i = 0; i < taipowerZoneRenderItems.length; i++) {
        const item = taipowerZoneRenderItems[i];
        if (!inView(item.bbox, copyOffset, k, x, y, vw, vh, 0)) continue;

        const isHovered = hoveredTaipowerZone?.letter === item.zone.letter;

        // 1. Transparent fill
        ctx.fillStyle = isHovered ? item.hoverFillColor : item.zone.fillColor;
        ctx.fill(item.polygonPath2D);

        // 2. Dashed inner percentage grid lines (20%, 40%, 60%, 80%) - ONLY in L3 state
        if (hasL3RegionMode) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 0.9 / k;
          ctx.setLineDash([3 / k, 3 / k]);
          ctx.stroke(item.innerGridPath2D);
          ctx.restore();
        }

        // 3. Perimeter border
        ctx.strokeStyle = isHovered ? '#ffffff' : item.zone.color;
        ctx.lineWidth = (isHovered ? 2.5 : 1.4) / k;
        ctx.stroke(item.polygonPath2D);
      }
    }

    // ----------------------------------------------------
    // 4. Layer 4: Highway and Route Network Overlay
    // ----------------------------------------------------
    if (isAnyRoadActive()) {
      for (const iso2 of visibleRoadIso2s) {
        const bundle = roadBundles.get(iso2);
        if (!bundle) continue;

        const showFed = isCountryRoadClassActive(iso2, 'Federal');
        const showInter = isCountryRoadClassActive(iso2, 'Interstate');

        // 4a. Primary / Federal Routes (Gold / Amber, 1.0px spiderweb mesh)
        if (showFed) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.0 / k;
          ctx.globalAlpha = 0.75;
          ctx.lineCap = 'butt';
          ctx.lineJoin = 'miter';
          ctx.stroke(bundle.usRoutesPath2D);
        }

        // 4b. Interstates / Expressways (Sky Blue, 1.6px arterial corridors)
        if (showInter) {
          ctx.strokeStyle = MAP_COLORS.selected;
          ctx.lineWidth = 1.6 / k;
          ctx.globalAlpha = 0.92;
          ctx.lineCap = 'butt';
          ctx.lineJoin = 'miter';
          ctx.stroke(bundle.interstatesPath2D);
        }
        ctx.globalAlpha = 1.0;
      }

      // 4c. Highlight selected highway with prominent glowing neon orange outline
      if (
        selectedRoad &&
        selectedRoad.path2D &&
        isCountryRoadClassActive(selectedRoad.iso2 || 'US', selectedRoad.class)
      ) {
        ctx.save();
        const isInterstate = selectedRoad.class === 'Interstate';
        ctx.strokeStyle = MAP_COLORS.hovered;
        ctx.lineWidth = (isInterstate ? 4.2 : 3.4) / k;
        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(249, 115, 22, 1.0)';
        ctx.shadowBlur = 12 * dpr;
        ctx.stroke(selectedRoad.path2D);
        ctx.restore();
      }

      // 4d. Highlight currently hovered highway with vibrant neon orange and soft shadow glow
      if (
        hoveredRoad &&
        hoveredRoad.path2D &&
        hoveredRoad.name !== selectedRoad?.name &&
        isCountryRoadClassActive(hoveredRoad.iso2 || 'US', hoveredRoad.class)
      ) {
        ctx.save();
        const isInterstate = hoveredRoad.class === 'Interstate';
        ctx.strokeStyle = MAP_COLORS.hoveredLight;
        ctx.lineWidth = (isInterstate ? 3.4 : 2.8) / k;
        ctx.globalAlpha = 0.95;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(249, 115, 22, 0.8)';
        ctx.shadowBlur = 8 * dpr;
        ctx.stroke(hoveredRoad.path2D);
        ctx.restore();
      }
    }

    // ----------------------------------------------------
    // 5. Layer 5: Glowing Highlights on top of all borders
    // ----------------------------------------------------
    for (const p of highlightHoverPaths) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 / k;
      ctx.shadowColor = 'rgba(249, 115, 22, 0.8)';
      ctx.shadowBlur = 8 * dpr;
      ctx.stroke(p);
      ctx.restore();
    }

    for (const p of highlightSelectPaths) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.0 / k;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
      ctx.shadowBlur = 10 * dpr;
      ctx.stroke(p);
      ctx.restore();
    }

    highlightHoverPaths.length = 0;
    highlightSelectPaths.length = 0;
  }
}

/**
 * Layer 6: Global Text Overlays (Calling Code / Domain / ccTLD)
 */
export function drawGlobalTextBadges(rc: RenderContext): void {
  const {
    ctx,
    k,
    x,
    y,
    vw,
    vh,
    dpr,
    visibleCopies,
    activeTextFilters: activeText,
    countryPathData,
    hoveredCountry: hoveredC,
    selectedCountry: selectedC,
    badgeWidthCache: widthCache
  } = rc;

  if (!activeText || activeText.size === 0 || countryPathData.length === 0) return;

  const singleFilterId = activeText.size === 1 ? Array.from(activeText)[0] : null;
  const singleFilterAccent = singleFilterId
    ? GLOBAL_TEXT_FILTERS_BY_ID.get(singleFilterId)?.accentColor || '#f8fafc'
    : '#f8fafc';

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = MONO_BADGE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const placedBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const isCrowded = k < 1.7;

  for (let i = 0; i < countryPathData.length; i++) {
    const item = countryPathData[i];
    const cMeta = item.countryMeta;
    if (!cMeta) continue;

    const badgeText = getCombinedTextOverlay(cMeta, activeText);
    if (!badgeText) continue;

    let textWidth = widthCache.get(badgeText);
    if (textWidth === undefined) {
      textWidth = ctx.measureText(badgeText).width;
      widthCache.set(badgeText, textWidth);
    }
    const badgeW = Math.round(textWidth + 10);
    const badgeH = 18;

    const override = COUNTRY_LABEL_CENTROIDS[cMeta.iso2];
    const cx = override ? override[0] : item.centroid[0];
    const cy = override ? override[1] : item.centroid[1];

    for (const copyIdx of visibleCopies) {
      const screenX = (cx + copyIdx * MAP_W) * k + x;
      const screenY = cy * k + y;

      if (screenX < -60 || screenX > vw + 60 || screenY < -30 || screenY > vh + 30) continue;

      const isHovered = !!(hoveredC && hoveredC.iso2 === cMeta.iso2);
      const isSelected = !!(selectedC && selectedC.iso2 === cMeta.iso2);

      if (!isHovered && !isSelected && isCrowded) {
        const [minX, minY, maxX, maxY] = item.bbox;
        const screenW = (maxX - minX) * k;
        const screenH = (maxY - minY) * k;
        if (screenW < 14 && screenH < 14) continue;
      }

      const badgeX = Math.round(screenX - badgeW / 2);
      const badgeY = Math.round(screenY - badgeH / 2);

      if (!isHovered && !isSelected) {
        let collides = false;
        for (let b = 0; b < placedBoxes.length; b++) {
          const pb = placedBoxes[b];
          if (
            badgeX < pb.x2 + 2 &&
            badgeX + badgeW > pb.x1 - 2 &&
            badgeY < pb.y2 + 2 &&
            badgeY + badgeH > pb.y1 - 2
          ) {
            collides = true;
            break;
          }
        }
        if (collides) continue;
      }

      placedBoxes.push({
        x1: badgeX,
        y1: badgeY,
        x2: badgeX + badgeW,
        y2: badgeY + badgeH
      });

      drawPill(ctx, badgeX, badgeY, badgeW, badgeH, 4, isSelected, isHovered);

      ctx.fillStyle = isSelected || isHovered ? '#ffffff' : singleFilterAccent;
      ctx.fillText(badgeText, screenX, screenY + 0.5);
    }
  }
  ctx.restore();
}

/**
 * Layer 7: Nationwide Domestic Area Codes
 */
export function drawAreaCodeBadges(rc: RenderContext): void {
  const {
    ctx,
    k,
    x,
    y,
    vw,
    vh,
    dpr,
    visibleCopies,
    isL2RegionMode,
    expandedL2Countries,
    layerHoveredCountries,
    layerHoveredL2Subdivisions,
    activeRegionalFilters: activeReg,
    countryPathMap,
    l2ByCountry,
    hoveredCountry: hoveredC,
    selectedCountry: selectedC,
    hoveredL2Subdivision: hoveredL2,
    selectedL2Subdivision: selectedL2,
    badgeWidthCache: widthCache
  } = rc;

  const activeAreaCodeCountries = COUNTRIES_WITH_AREA_CODES.filter((iso2) => activeReg.has(`area-codes-${iso2}`));
  const isAreaCodeActive = activeAreaCodeCountries.length > 0;

  const activeNationwideCsvTextFilters = activeReg
    ? getRegisteredCsvFilters().filter(
        (f) => f.rangeKind === 'Nationwide' && f.type === 'Text' && activeReg.has(f.id)
      )
    : [];

  if ((!isAreaCodeActive || !isL2RegionMode) && activeNationwideCsvTextFilters.length === 0) return;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = MONO_BADGE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isAreaCodeActive && isL2RegionMode) {
    for (const iso2 of activeAreaCodeCountries) {
      if (!expandedL2Countries.has(iso2)) continue;
      const subs = l2ByCountry[iso2];
      if (!subs || subs.length === 0) continue;

      for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        const badgeText = getSubdivisionAreaCodeBadge(iso2, sub);
        if (!badgeText) continue;

        let textWidth = widthCache.get(badgeText);
        if (textWidth === undefined) {
          textWidth = ctx.measureText(badgeText).width;
          widthCache.set(badgeText, textWidth);
        }
        const badgeW = Math.round(textWidth + 12);
        const badgeH = 20;

        for (const copyIdx of visibleCopies) {
          const screenX = (sub.centroid[0] + copyIdx * MAP_W) * k + x;
          const screenY = sub.centroid[1] * k + y;

          if (screenX < -70 || screenX > vw + 70 || screenY < -30 || screenY > vh + 30) continue;

          const isSubHovered = !!(
            hoveredL2 &&
            hoveredL2.iso2 === sub.iso2 &&
            (String(hoveredL2.id) === String(sub.id) || hoveredL2.name === sub.name)
          );
          const isSubSelected = !!(
            selectedL2 &&
            selectedL2.iso2 === sub.iso2 &&
            String(selectedL2.id) === String(sub.id)
          );

          const badgeX = Math.round(screenX - badgeW / 2);
          const badgeY = Math.round(screenY - badgeH / 2);

          drawPill(
            ctx,
            badgeX,
            badgeY,
            badgeW,
            badgeH,
            5,
            isSubSelected,
            isSubHovered,
            'rgba(15, 23, 42, 0.90)',
            '#10b981',
            1.2,
            1.6
          );

          ctx.fillStyle = isSubSelected || isSubHovered ? '#ffffff' : '#34d399';
          ctx.fillText(badgeText, screenX, screenY + 0.5);
        }
      }
    }
  }

  for (const csvFilter of activeNationwideCsvTextFilters) {
    const targetIso2s =
      csvFilter.targetIso2s && csvFilter.targetIso2s.length > 0
        ? csvFilter.targetIso2s
        : [csvFilter.targetIso2];

    for (const iso2 of targetIso2s) {
      if (!expandedL2Countries.has(iso2)) continue;
      // 1. Check L2 subdivisions of this country
      const subs = l2ByCountry[iso2];
      let matchedAnySubdivision = false;
      if (subs && subs.length > 0) {
        for (let i = 0; i < subs.length; i++) {
          const sub = subs[i];
          const badgeText = getCsvSubdivisionValue(csvFilter.id, sub);
          if (!badgeText) continue;
          matchedAnySubdivision = true;

          let textWidth = widthCache.get(badgeText);
          if (textWidth === undefined) {
            textWidth = ctx.measureText(badgeText).width;
            widthCache.set(badgeText, textWidth);
          }
          const badgeW = Math.round(textWidth + 12);
          const badgeH = 20;

          for (const copyIdx of visibleCopies) {
            const screenX = (sub.centroid[0] + copyIdx * MAP_W) * k + x;
            const screenY = sub.centroid[1] * k + y;

            if (screenX < -90 || screenX > vw + 90 || screenY < -30 || screenY > vh + 30) continue;

            const isSubHovered = !!(
              hoveredL2 &&
              hoveredL2.iso2 === sub.iso2 &&
              (String(hoveredL2.id) === String(sub.id) || hoveredL2.name === sub.name)
            ) || layerHoveredL2Subdivisions.has(`${iso2}:${String(sub.id)}`);
            const isSubSelected = !!(
              selectedL2 &&
              selectedL2.iso2 === sub.iso2 &&
              String(selectedL2.id) === String(sub.id)
            );

            const badgeX = Math.round(screenX - badgeW / 2);
            const badgeY = Math.round(screenY - badgeH / 2);

            drawPill(
              ctx,
              badgeX,
              badgeY,
              badgeW,
              badgeH,
              5,
              isSubSelected,
              isSubHovered,
              'rgba(15, 23, 42, 0.90)',
              csvFilter.accentColor,
              1.2,
              1.6
            );

            ctx.fillStyle = isSubSelected || isSubHovered ? '#ffffff' : csvFilter.accentColor;
            ctx.fillText(badgeText, screenX, screenY + 0.5);
          }
        }
      }

      // 2. If this country has a country-level entry (e.g. LK or BD in Nationwide:IN|LK|BD), draw at country centroid
      const countryLevelText = csvFilter.data?.valueMap.get(iso2.toUpperCase());
      if (countryLevelText && !matchedAnySubdivision) {
        const cItem = countryPathMap.get(iso2.toUpperCase());
        const override = COUNTRY_LABEL_CENTROIDS[iso2.toUpperCase()];
        const centroid = override || cItem?.centroid;
        if (!centroid) continue;

        let textWidth = widthCache.get(countryLevelText);
        if (textWidth === undefined) {
          textWidth = ctx.measureText(countryLevelText).width;
          widthCache.set(countryLevelText, textWidth);
        }
        const badgeW = Math.round(textWidth + 12);
        const badgeH = 20;

        for (const copyIdx of visibleCopies) {
          const screenX = (centroid[0] + copyIdx * MAP_W) * k + x;
          const screenY = centroid[1] * k + y;

          if (screenX < -90 || screenX > vw + 90 || screenY < -30 || screenY > vh + 30) continue;

          const isCountryHovered = !!(hoveredC && hoveredC.iso2 === iso2);
          const isLayerCountryHovered = layerHoveredCountries.has(iso2);
          const isCountrySelected = !!(selectedC && selectedC.iso2 === iso2);

          const badgeX = Math.round(screenX - badgeW / 2);
          const badgeY = Math.round(screenY - badgeH / 2);

          drawPill(
            ctx,
            badgeX,
            badgeY,
            badgeW,
            badgeH,
            5,
            isCountrySelected,
            isCountryHovered || isLayerCountryHovered,
            'rgba(15, 23, 42, 0.90)',
            csvFilter.accentColor,
            1.2,
            1.6
          );

          ctx.fillStyle =
            isCountrySelected || isCountryHovered || isLayerCountryHovered ? '#ffffff' : csvFilter.accentColor;
          ctx.fillText(countryLevelText, screenX, screenY + 0.5);
        }
      }
    }
  }

  ctx.restore();
}

/**
 * Layer 8: European Pedestrian Crossing Signs (International Image Filter)
 */
export function drawCrossingSignBadges(rc: RenderContext): CrossingBadgeBox[] {
  const {
    ctx,
    k,
    x,
    y,
    vw,
    vh,
    dpr,
    visibleCopies,
    activeInternationalImageFilter,
    activeRegionalFilters: activeReg,
    countryPathData,
    hoveredCountry: hoveredC,
    selectedCountry: selectedC,
    hoveredL2Subdivision: hoveredL2,
    selectedL2Subdivision: selectedL2,
    crossingImages
  } = rc;

  const activeCrossingSign =
    activeInternationalImageFilter === 'pedestrian-crossing' ||
    (activeReg && activeReg.has('eu-pedestrian-crossing'));
  const currentRenderedBadges: CrossingBadgeBox[] = [];

  if (!activeCrossingSign) return currentRenderedBadges;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const placedCrossingBoxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  for (let i = 0; i < countryPathData.length; i++) {
    const item = countryPathData[i];
    const cMeta = item.countryMeta;
    if (!cMeta || !cMeta.iso2) continue;

    const signMeta = EUROPEAN_CROSSING_SIGNS[cMeta.iso2];
    if (!signMeta) continue;

    const img = crossingImages.get(cMeta.iso2);
    if (!img || !img.complete || img.naturalWidth === 0) continue;

    const override = COUNTRY_LABEL_CENTROIDS[cMeta.iso2];
    const cx = override ? override[0] : item.centroid[0];
    const cy = override ? override[1] : item.centroid[1];

    for (const copyIdx of visibleCopies) {
      const screenX = (cx + copyIdx * MAP_W) * k + x;
      const screenY = cy * k + y;

      if (screenX < -70 || screenX > vw + 70 || screenY < -70 || screenY > vh + 70) continue;

      const isHovered = !!(
        (hoveredC && hoveredC.iso2 === cMeta.iso2) ||
        (hoveredL2 && hoveredL2.iso2 === cMeta.iso2)
      );
      const isSelected = !!(
        (selectedC && selectedC.iso2 === cMeta.iso2) ||
        (selectedL2 && selectedL2.iso2 === cMeta.iso2)
      );

      const baseSize = isHovered || isSelected ? 40 : 32;
      const natW = img.naturalWidth || baseSize;
      const natH = img.naturalHeight || baseSize;
      const scale = baseSize / Math.sqrt(natW * natH);
      const imgW = Math.max(1, Math.round(natW * scale));
      const imgH = Math.max(1, Math.round(natH * scale));
      const imgX = Math.round(screenX - imgW / 2);
      const imgY = Math.round(screenY - imgH / 2);

      if (!isHovered && !isSelected) {
        let collides = false;
        for (let b = 0; b < placedCrossingBoxes.length; b++) {
          const pb = placedCrossingBoxes[b];
          if (
            imgX < pb.x2 + 2 &&
            imgX + imgW > pb.x1 - 2 &&
            imgY < pb.y2 + 2 &&
            imgY + imgH > pb.y1 - 2
          ) {
            collides = true;
            break;
          }
        }
        if (collides) continue;
      }

      placedCrossingBoxes.push({
        x1: imgX,
        y1: imgY,
        x2: imgX + imgW,
        y2: imgY + imgH
      });

      currentRenderedBadges.push({
        x1: imgX,
        y1: imgY,
        x2: imgX + imgW,
        y2: imgY + imgH,
        iso2: cMeta.iso2
      });

      ctx.drawImage(img, imgX, imgY, imgW, imgH);
    }
  }
  ctx.restore();
  return currentRenderedBadges;
}

/**
 * Layer 7b: Taiwan Taipower Grid Letters & L3 Percentage Coordinate Markers
 */
export function drawTaipowerLabels(rc: RenderContext): void {
  const {
    ctx,
    k,
    x,
    y,
    vw,
    vh,
    dpr,
    visibleCopies,
    hasL3RegionMode,
    activeRegionalFilters,
    taipowerZoneRenderItems: tpItems,
    hoveredTaipowerZone: hoveredZ
  } = rc;

  const isTaipowerGridActive = activeRegionalFilters.has('taiwan-power-poles');
  if (!isTaipowerGridActive) return;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  for (let i = 0; i < tpItems.length; i++) {
    const item = tpItems[i];
    const isHovered = hoveredZ?.letter === item.zone.letter;

    for (const copyIdx of visibleCopies) {
      const copyOffset = copyIdx * MAP_W;
      const cxScr = (item.pCenter[0] + copyOffset) * k + x;
      const cyScr = item.pCenter[1] * k + y;

      if (cxScr < -100 || cxScr > vw + 100 || cyScr < -100 || cyScr > vh + 100) continue;

      // 格子在螢幕上的寬/高（用實際四角，比 bbox 更準）
      const swx = (item.pSW[0] + copyOffset) * k + x;
      const swy = item.pSW[1] * k + y;
      const sex = (item.pSE[0] + copyOffset) * k + x;
      const sey = item.pSE[1] * k + y;
      const nwx = (item.pNW[0] + copyOffset) * k + x;
      const nwy = item.pNW[1] * k + y;

      const edgeW = Math.hypot(sex - swx, sey - swy);
      const edgeH = Math.hypot(nwx - swx, nwy - swy);
      const minEdge = Math.min(edgeW, edgeH);

      const fontSize = Math.min(120, Math.max(10, minEdge * 0.75));

      if (fontSize < 11) continue;

      const letterText = item.zone.letter;

      ctx.save();
      ctx.translate(cxScr, cyScr);

      ctx.font = `900 ${fontSize}px ui-monospace, "JetBrains Mono", SFMono-Regular, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.lineWidth = Math.max(1.5, fontSize * 0.06);
      ctx.strokeStyle = isHovered ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.75)';
      ctx.strokeText(letterText, 0, 0);

      ctx.fillStyle = isHovered ? '#ffffff' : item.zone.color;
      ctx.fillText(letterText, 0, 0);

      ctx.restore();

      if (hasL3RegionMode) {
        const pSWScr = [swx, swy];
        const pSEScr = [sex, sey];
        const pNWScr = [nwx, nwy];

        const pctFontSize = Math.min(18, Math.max(9, minEdge * 0.08));
        ctx.font = `bold ${pctFontSize}px ui-monospace, "JetBrains Mono", monospace`;
        ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (const pct of [0.2, 0.4, 0.6, 0.8]) {
          const tickX = (1 - pct) * pSWScr[0] + pct * pSEScr[0];
          const tickY = (1 - pct) * pSWScr[1] + pct * pSEScr[1];
          ctx.fillText(`${Math.round(pct * 100)}%`, tickX, tickY + 3);
        }

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (const pct of [0.2, 0.4, 0.6, 0.8]) {
          const tickX = (1 - pct) * pSWScr[0] + pct * pNWScr[0];
          const tickY = (1 - pct) * pSWScr[1] + pct * pNWScr[1];
          ctx.fillText(`${Math.round(pct * 100)}%`, tickX - 4, tickY);
        }
      }
    }
  }
  ctx.restore();
}
