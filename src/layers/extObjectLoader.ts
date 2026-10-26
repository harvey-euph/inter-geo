import * as flatgeobuf from 'flatgeobuf';
import { getDataUrl } from '../data/dataSource';
import {
  getCsvLayerById,
  getCsvLayerValue,
  loadOnDemandCsvLayer,
  initCsvLayerRegistry,
  isLayersIndexLoaded
} from './csvLayerRegistry';
import type { ExtFeatureRenderItem } from '../map/types';

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex;
  }
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

const extFeatureCache = new Map<string, ExtFeatureRenderItem[]>();
const inFlightExtLoads = new Map<string, Promise<ExtFeatureRenderItem[]>>();

export async function loadExtObjectLayerFeatures(
  layerId: string,
  projection: (coord: [number, number]) => [number, number] | null
): Promise<ExtFeatureRenderItem[]> {
  const cached = extFeatureCache.get(layerId);
  if (cached) return cached;

  const inFlight = inFlightExtLoads.get(layerId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      let csvLayer = getCsvLayerById(layerId);
      if (!csvLayer && !isLayersIndexLoaded()) {
        await initCsvLayerRegistry();
        csvLayer = getCsvLayerById(layerId);
      }
      if (!csvLayer) return [];

      if (!csvLayer.loaded) {
        await loadOnDemandCsvLayer(layerId);
      }

      const fgbRelPath =
        csvLayer.meta.fgb ||
        ((csvLayer as unknown as Record<string, unknown>).fgb as string | undefined);
      if (!fgbRelPath) return [];

      const url = getDataUrl(fgbRelPath);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[extObjectLoader] HTTP ${res.status} when fetching ${url}`);
        return [];
      }

      const buffer = await res.arrayBuffer();
      const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
      const items: ExtFeatureRenderItem[] = [];

      for await (const feature of it) {
        const props = (feature.properties || {}) as Record<string, unknown>;
        const id = String(feature.id ?? props.id ?? props.code ?? props.name ?? '').trim();
        if (!id) continue;

        const row =
          csvLayer.data?.rowMap.get(id.toUpperCase()) ||
          csvLayer.data?.rowMap.get(id);

        const name =
          row?.attributes?.nameZh ||
          row?.attributes?.name ||
          String(props.name ?? props.title ?? id);

        const color =
          row?.value ||
          getCsvLayerValue(layerId, id) ||
          (props.color as string) ||
          csvLayer.accentColor ||
          '#38bdf8';

        const label =
          row?.label ||
          row?.attributes?.subdivisions ||
          csvLayer.data?.labelMap.get(id.toUpperCase()) ||
          (props.nameZh as string) ||
          (props.description as string) ||
          '';

        if (feature.geometry?.type === 'Polygon') {
          const coords = (feature.geometry as { coordinates: number[][][] }).coordinates[0];
          if (!coords || coords.length < 3) continue;

          const projectedCoords: Array<[number, number]> = [];
          for (const pt of coords) {
            const p = projection([pt[0], pt[1]]);
            if (p) projectedCoords.push(p);
          }
          if (projectedCoords.length < 3) continue;

          const path2D = new Path2D();
          path2D.moveTo(projectedCoords[0][0], projectedCoords[0][1]);
          for (let i = 1; i < projectedCoords.length; i++) {
            path2D.lineTo(projectedCoords[i][0], projectedCoords[i][1]);
          }
          path2D.closePath();

          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          let sumX = 0;
          let sumY = 0;

          for (const p of projectedCoords) {
            minX = Math.min(minX, p[0]);
            minY = Math.min(minY, p[1]);
            maxX = Math.max(maxX, p[0]);
            maxY = Math.max(maxY, p[1]);
            sumX += p[0];
            sumY += p[1];
          }

          const centroid: [number, number] = [
            sumX / projectedCoords.length,
            sumY / projectedCoords.length
          ];

          let innerGridPath2D: Path2D | undefined;
          let corners: ExtFeatureRenderItem['corners'] | undefined;
          const isPercentageGrid =
            csvLayer.meta.innerGrid === 'percentage' ||
            (csvLayer.meta as Record<string, unknown>)['inner-grid'] === 'percentage';

          if (isPercentageGrid && projectedCoords.length >= 4) {
            const pSW = projectedCoords[0];
            const pSE = projectedCoords[1];
            const pNE = projectedCoords[2];
            const pNW = projectedCoords[3];

            corners = { sw: pSW, se: pSE, ne: pNE, nw: pNW };
            innerGridPath2D = new Path2D();

            for (const pct of [0.2, 0.4, 0.6, 0.8]) {
              const bX = (1 - pct) * pSW[0] + pct * pSE[0];
              const bY = (1 - pct) * pSW[1] + pct * pSE[1];
              const tX = (1 - pct) * pNW[0] + pct * pNE[0];
              const tY = (1 - pct) * pNW[1] + pct * pNE[1];
              innerGridPath2D.moveTo(bX, bY);
              innerGridPath2D.lineTo(tX, tY);

              const lX = (1 - pct) * pSW[0] + pct * pNW[0];
              const lY = (1 - pct) * pSW[1] + pct * pNW[1];
              const rX = (1 - pct) * pSE[0] + pct * pNE[0];
              const rY = (1 - pct) * pSE[1] + pct * pNE[1];
              innerGridPath2D.moveTo(lX, lY);
              innerGridPath2D.lineTo(rX, rY);
            }
          }

          items.push({
            layerId,
            id,
            name,
            label,
            color,
            fillColor: hexToRgba(color, 0.22),
            hoverFillColor: hexToRgba(color, 0.45),
            polygonPath2D: path2D,
            innerGridPath2D,
            centroid,
            bbox: [minX, minY, maxX, maxY],
            corners,
            innerGrid: isPercentageGrid ? 'percentage' : undefined,
            attributes: row?.attributes
          });
        }
      }

      extFeatureCache.set(layerId, items);
      return items;
    } catch (err) {
      console.warn(`[extObjectLoader] Error loading ext features for ${layerId}:`, err);
      return [];
    } finally {
      inFlightExtLoads.delete(layerId);
    }
  })();

  inFlightExtLoads.set(layerId, promise);
  return promise;
}

export function getCachedExtFeatures(layerId: string): ExtFeatureRenderItem[] | undefined {
  return extFeatureCache.get(layerId);
}
