import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/inter-geo',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    assetsInlineLimit: (filePath) => (filePath.endsWith('.csv') || filePath.endsWith('.md') ? false : undefined),
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules/
            },
            {
              name: 'manifests',
              test: /src\/data\/(l2Manifest|l3Manifest|roadsManifest)/
            },
            {
              name: 'geo-data',
              test: /src\/(data|info|filters|content|objects)\//
            }
          ]
        }
      }
    }
  }
})
