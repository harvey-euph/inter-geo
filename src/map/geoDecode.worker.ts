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
    const c = pathGenerator.centroid(feature);
    if (c && !isNaN(c[0]) && !isNaN(c[1])) return c;
  } catch {
    // fallback below
  }
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
}

async function decode(req: DecodeRequest): Promise<DecodeResponse> {
  const res = await fetch(req.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();

  const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
  const features: DecodedFeature[] = [];
  const rawL2: Feature[] = [];

  for await (const raw of it) {
    const feature = raw as Feature;
    const d = pathGenerator(feature) || '';
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
