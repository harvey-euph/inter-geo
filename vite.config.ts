import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataRepoPath = path.resolve(__dirname, '../inter-geo-data')

function localGeoDataPlugin(): Plugin {
  return {
    name: 'local-geo-data-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        const marker = '/@geo-data/'
        const markerIdx = url.indexOf(marker)
        if (markerIdx !== -1) {
          const rest = url.slice(markerIdx + marker.length).split('?')[0]
          let filePath: string
          if (rest.startsWith('index/')) {
            filePath = path.join(dataRepoPath, 'dist-index', rest.replace(/^index\//, ''))
          } else if (rest.startsWith('main/')) {
            filePath = path.join(dataRepoPath, rest.replace(/^main\//, ''))
          } else {
            filePath = path.join(dataRepoPath, rest)
          }

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json')
            else if (filePath.endsWith('.csv')) res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            else if (filePath.endsWith('.fgb')) res.setHeader('Content-Type', 'application/octet-stream')
            else if (filePath.endsWith('.md')) res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
            else if (filePath.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml')
            else if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png')
            else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg')
            else if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp')
            else if (filePath.endsWith('.gif')) res.setHeader('Content-Type', 'image/gif')
            res.setHeader('Access-Control-Allow-Origin', '*')
            fs.createReadStream(filePath).pipe(res)
            return
          }
        }
        if (url === '/' || url === '') {
          res.writeHead(302, { Location: '/inter-geo/' })
          res.end()
          return
        }
        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/inter-geo',
  plugins: [react(), localGeoDataPlugin()],
  server: {
    host: true,
    port: 5173,
    fs: {
      allow: ['..']
    }
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
              test: /src\/(data|info|layers|content|objects)\//
            }
          ]
        }
      }
    }
  }
})
