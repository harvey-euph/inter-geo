import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import './index.css';
import App from './App.tsx';
import { loadCountriesIndex, loadDataIndex } from './data/geoIndexClient';
import { initCsvLayerRegistry } from './layers/csvLayerRegistry';

// Configure MapLibre Web Worker URL early before any map instantiation
if (typeof window !== 'undefined') {
  setWorkerUrl(maplibreWorkerUrl || '/inter-geo/assets/maplibre-gl-worker.mjs');
}

// Initialize core index manifests and country registry before mounting
Promise.all([
  loadCountriesIndex(),
  loadDataIndex(),
  initCsvLayerRegistry()
]).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
