import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { loadCountriesIndex, loadDataIndex } from './data/geoIndexClient';
import { initCsvLayerRegistry } from './layers/csvLayerRegistry';

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
