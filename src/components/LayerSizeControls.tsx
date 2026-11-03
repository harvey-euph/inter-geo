import React from 'react';
import { useDevMode } from '../utils/devMode';
import { useLayerVisualSizes } from '../layers/layerVisualSize';

const CHANNEL_WORD = { text: 'text', image: 'img' } as const;

/**
 * Dev-mode size stepper for the mark a layer actually draws.
 * Text layers (area codes, 台電 letters) show `text`. Image layers show `img`.
 */
export const LayerSizeControls: React.FC<{ layerId: string }> = ({ layerId }) => {
  const isDev = useDevMode();
  const control = useLayerVisualSizes(layerId);
  if (!isDev || !control) return null;

  const word = CHANNEL_WORD[control.channel];

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}
    >
      <span
        style={{
          width: 32,
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.2,
          color: '#94a3b8'
        }}
      >
        {word}
      </span>
      <button
        type="button"
        className="google-maps-step-btn"
        style={{ width: 'auto', padding: '0 6px' }}
        aria-label={`縮小 ${word}`}
        onClick={() => control.step(-1)}
      >
        [-]
      </button>
      <span
        style={{
          minWidth: 32,
          textAlign: 'center',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          fontWeight: 700,
          color: '#e2e8f0'
        }}
      >
        {control.size.toFixed(1)}
      </span>
      <button
        type="button"
        className="google-maps-step-btn"
        style={{ width: 'auto', padding: '0 6px' }}
        aria-label={`放大 ${word}`}
        onClick={() => control.step(1)}
      >
        [+]
      </button>
    </div>
  );
};
