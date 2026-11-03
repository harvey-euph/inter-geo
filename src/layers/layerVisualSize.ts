import { useEffect, useState } from 'react';
import { getCsvLayerById, onLayersIndexLoaded } from './csvLayerRegistry';

export type LayerSizeChannel = 'text' | 'image';

const SIZE_KEY: Record<LayerSizeChannel, 'textSize' | 'imageSize'> = {
  text: 'textSize',
  image: 'imageSize'
};

const MIN_SIZE = 0.4;
const MAX_SIZE = 4;
const SIZE_STEP = 0.1;

type SizePatch = Partial<Record<LayerSizeChannel, number>>;

const overrides = new Map<string, SizePatch>();
const listeners = new Set<() => void>();
const saveTimers = new Map<string, number>();

export function clampLayerSize(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, value));
  return Math.round(clamped * 10) / 10;
}

function canonicalLayerId(layerId: string): string {
  return getCsvLayerById(layerId)?.id || layerId;
}

/** Text layers (area codes, 台電 grid letters, global badges) use text. Image layers use image. */
export function layerSizeChannel(layerId: string): LayerSizeChannel | null {
  const layer = getCsvLayerById(canonicalLayerId(layerId));
  if (!layer || layer.type === 'FillWithColor') return null;
  return layer.type === 'Image' ? 'image' : 'text';
}

export function getLayerVisualScale(layerId: string, channel: LayerSizeChannel): number {
  const id = canonicalLayerId(layerId);
  const override = overrides.get(id)?.[channel];
  if (override !== undefined) return override;
  const raw = getCsvLayerById(id)?.meta?.[SIZE_KEY[channel]];
  if (typeof raw === 'number' && Number.isFinite(raw)) return clampLayerSize(raw);
  return 1;
}

export function subscribeLayerVisualSize(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function scheduleSave(id: string, channel: LayerSizeChannel): void {
  const pending = saveTimers.get(id);
  if (pending !== undefined) window.clearTimeout(pending);
  saveTimers.set(
    id,
    window.setTimeout(() => {
      saveTimers.delete(id);
      const body = {
        id,
        [SIZE_KEY[channel]]: getLayerVisualScale(id, channel)
      };
      const base = (import.meta.env.BASE_URL || '/inter-geo/').replace(/\/$/, '');
      void fetch(`${base}/@dev/layer-size`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then((res) => {
        if (!res.ok) {
          console.warn(`[layer-size] failed to record ${id} (${res.status})`);
        }
      }).catch((err) => {
        console.warn(`[layer-size] failed to record ${id}`, err);
      });
    }, 200)
  );
}

export function adjustLayerVisualSize(
  layerId: string,
  channel: LayerSizeChannel,
  direction: -1 | 1
): void {
  const id = canonicalLayerId(layerId);
  const current = getLayerVisualScale(id, channel);
  const next = clampLayerSize(current + direction * SIZE_STEP);
  if (next === current) return;

  const patch = overrides.get(id) || {};
  patch[channel] = next;
  overrides.set(id, patch);

  const layer = getCsvLayerById(id);
  if (layer) {
    layer.meta[SIZE_KEY[channel]] = next;
  }
  notify();
  scheduleSave(id, channel);
}

export function useLayerVisualSizes(layerId: string | undefined): {
  channel: LayerSizeChannel;
  size: number;
  step: (direction: -1 | 1) => void;
} | null {
  const [, setRev] = useState(0);
  useEffect(() => {
    const bump = () => setRev((n) => n + 1);
    const unsubSize = subscribeLayerVisualSize(bump);
    const unsubLayers = onLayersIndexLoaded(bump);
    return () => {
      unsubSize();
      unsubLayers();
    };
  }, []);

  if (!layerId) return null;
  const channel = layerSizeChannel(layerId);
  if (!channel) return null;
  return {
    channel,
    size: getLayerVisualScale(layerId, channel),
    step: (direction) => adjustLayerVisualSize(layerId, channel, direction)
  };
}
