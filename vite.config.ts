import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
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
              test: /src\/(data|lore|filters|content)\//
            }
          ]
        }
      }
    }
  }
})
