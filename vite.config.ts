import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { buildObjectIndex } from './scripts/build-object-index.mjs'

interface InfoStubEntry {
  id: string
  title: string
  icon?: string
  accentColor?: string
  targets: string[]
  targetType?: string
  tags?: string[]
  image?: string
  imageSize?: string
  imagePosition?: string
  imageAlt?: string
  comparisonTargets?: string[]
  sourceFile: string
  sourcePath: string
  priority?: number
  firstItemPreview?: {
    label?: string
    content: string
  }
}

function parseYamlLines(yamlLines: string[]): Record<string, string | string[]> {
  const meta: Record<string, string | string[]> = {}
  for (const line of yamlLines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue
    const key = trimmed.slice(0, colonIdx).trim().toLowerCase()
    let valStr = trimmed.slice(colonIdx + 1).trim()
    if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
      valStr = valStr.slice(1, -1)
    }
    if (valStr.startsWith('[') && valStr.endsWith(']')) {
      const inner = valStr.slice(1, -1).trim()
      meta[key] = inner ? inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) : []
    } else if (valStr.includes(',') && !valStr.startsWith('{')) {
      meta[key] = valStr.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    } else {
      meta[key] = valStr
    }
  }
  return meta
}

function getStr(val: string | string[] | undefined, fallback = ''): string {
  if (!val) return fallback
  if (Array.isArray(val)) return val.join(', ') || fallback
  return String(val) || fallback
}

function parseFirstBulletPreview(bodyLines: string[]): { label?: string; content: string } | undefined {
  for (const rawLine of bodyLines) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('<!--')) continue
    const isIndented = /^(\s{2,}|\t)[-*]\s+/.test(rawLine)
    if (isIndented) continue
    const bulletText = trimmed.replace(/^[-*]\s+/, '').trim()
    const boldMatch = bulletText.match(/^\*\*(.+?)\*\*[:：]?\s*(.*)$/)
    if (boldMatch) {
      return {
        label: boldMatch[1].trim(),
        content: boldMatch[2].trim().slice(0, 90)
      }
    }
    const bracketMatch = bulletText.match(/^【(.+?)】[:：]?\s*(.*)$/)
    if (bracketMatch) {
      return {
        label: `【${bracketMatch[1].trim()}】`,
        content: bracketMatch[2].trim().slice(0, 90)
      }
    }
    return { content: bulletText.slice(0, 90) }
  }
  return undefined
}

function parseStubFromSection(
  sectionText: string,
  sourceFile: string,
  sourcePath: string,
  sectionIndex: number
): InfoStubEntry | null {
  const lines = sectionText.split(/\r?\n/)
  let meta: Record<string, string | string[]> = {}
  const bodyLines: string[] = []
  let titleFromH1: string | null = null
  const frontmatterLines: string[] = []

  let lineIdx = 0
  if (lines[0] && lines[0].trim() === '---') {
    lineIdx = 1
    while (lineIdx < lines.length) {
      const l = lines[lineIdx]
      if (l.trim() === '---') {
        lineIdx++
        break
      }
      frontmatterLines.push(l)
      lineIdx++
    }
    meta = parseYamlLines(frontmatterLines)
  }

  const remainingLines = lines.slice(lineIdx)
  const metadataListLines: string[] = []
  let inMetadataList = true

  for (const line of remainingLines) {
    const trimmed = line.trim()
    if (!titleFromH1 && /^#\s+/.test(trimmed)) {
      titleFromH1 = trimmed.replace(/^#\s+/, '').trim()
      continue
    }
    if (inMetadataList && /^-\s*(id|title|targets?|icon|accent|color|tags?|type|priority|comparison|image|imagesize|imageposition|imagealt)[:=]\s*/i.test(trimmed)) {
      metadataListLines.push(trimmed.replace(/^-\s*/, ''))
      continue
    }
    if (trimmed) {
      inMetadataList = false
      bodyLines.push(line)
    }
  }

  if (metadataListLines.length > 0) {
    meta = { ...meta, ...parseYamlLines(metadataListLines) }
  }

  const title = getStr(meta.title, titleFromH1 || `Info ${sectionIndex + 1}`)
  const rawId = getStr(meta.id, title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, '-'))
  const id = rawId.replace(/^-+|-+$/g, '') || `info-${sectionIndex + 1}`

  let targets: string[] = []
  if (Array.isArray(meta.targets)) {
    targets = meta.targets.map((t) => String(t).trim().toUpperCase())
  } else if (meta.targets) {
    targets = String(meta.targets).split(',').map((t) => t.trim().toUpperCase()).filter(Boolean)
  } else if (meta.target) {
    targets = [String(meta.target).trim().toUpperCase()]
  }

  let tags: string[] = []
  if (Array.isArray(meta.tags)) {
    tags = meta.tags.map((t) => String(t).trim())
  } else if (meta.tags) {
    tags = String(meta.tags).split(',').map((t) => t.trim()).filter(Boolean)
  }

  if (!title && bodyLines.length === 0) return null

  const comparisonTargets = Array.isArray(meta.comparison)
    ? meta.comparison.map((t) => String(t).trim().toUpperCase())
    : meta.comparison
      ? String(meta.comparison).split(',').map((t) => t.trim().toUpperCase())
      : targets.length > 1 && (meta.type === 'comparison' || tags.includes('比較') || tags.includes('跨區比較'))
        ? targets
        : undefined

  const typeStr = meta.type ? getStr(meta.type) : undefined
  const targetType = typeStr || (comparisonTargets ? 'comparison' : undefined)
  const priorityStr = meta.priority ? getStr(meta.priority) : undefined
  const priority = priorityStr ? parseInt(priorityStr, 10) : undefined
  const image = meta.image ? getStr(meta.image) : undefined
  const imageSize = meta.imagesize ? getStr(meta.imagesize) : undefined
  const imagePosition = meta.imageposition ? getStr(meta.imageposition).toLowerCase() : undefined
  const imageAlt = meta.imagealt ? getStr(meta.imagealt) : undefined

  return {
    id,
    title,
    icon: getStr(meta.icon, '💡'),
    accentColor: getStr(meta.accent || meta.color || meta.accentcolor, '#fbbf24'),
    targets: targets.length > 0 ? targets : ['*'],
    targetType,
    tags,
    image,
    imageSize,
    imagePosition,
    imageAlt,
    comparisonTargets,
    sourceFile,
    sourcePath,
    priority: isNaN(Number(priority)) ? undefined : priority,
    firstItemPreview: parseFirstBulletPreview(bodyLines)
  }
}

function collectFilesByExt(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const results: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFilesByExt(fullPath, ext))
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(fullPath)
    }
  }
  return results.sort()
}

interface CsvFilterStubEntry {
  id: string
  path: string
  loadedTiming: 'init' | 'on-demand'
  effectiveRange: string
  type: 'FillColor' | 'Text' | 'Image' | 'Special'
  order?: number
  meta: {
    id?: string
    nameZh?: string
    nameEn?: string
    shortBadge?: string
    accentColor?: string
    descriptionZh?: string
    effectiveRange?: string
    type?: 'FillColor' | 'Text' | 'Image' | 'Special'
    loadedTiming?: 'init' | 'on-demand'
    order?: number
  }
}

function parseCsvFilterType(raw: string): 'FillColor' | 'Text' | 'Image' | 'Special' {
  const norm = raw.trim().toLowerCase()
  if (norm === 'fillcolor' || norm === 'fill' || norm === 'color') return 'FillColor'
  if (norm === 'text' || norm === 'label' || norm === 'badge') return 'Text'
  if (norm === 'image' || norm === 'icon' || norm === 'img') return 'Image'
  return 'Special'
}

function parseCsvLoadedTiming(raw: string): 'init' | 'on-demand' {
  const norm = raw.trim().toLowerCase()
  if (norm === 'init' || norm === 'eager' || norm === 'startup') return 'init'
  return 'on-demand'
}

function buildCsvFilterIndex(rootDir: string): CsvFilterStubEntry[] {
  const filtersDir = path.resolve(rootDir, 'src/content/layers')
  const csvFiles = collectFilesByExt(filtersDir, '.csv')
  const stubs: CsvFilterStubEntry[] = []

  for (const absPath of csvFiles) {
    const fileName = path.basename(absPath)
    if (fileName.toLowerCase() === 'filter-reg.csv') continue

    const content = fs.readFileSync(absPath, 'utf-8')
    const relPath = '/' + path.relative(rootDir, absPath).split(path.sep).join('/')
    const defaultId = fileName.replace(/\.csv$/i, '')

    const meta: CsvFilterStubEntry['meta'] = {}
    const lines = content.split(/\r?\n/)

    for (const rawLine of lines) {
      const trimmed = rawLine.trim()
      if (!trimmed) continue
      if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
        const match = trimmed.match(/^(?:\/\/|#)\s*@([a-zA-Z0-9_]+)\s*:\s*(.+)$/)
        if (match) {
          const key = match[1].trim()
          const val = match[2].trim()
          if (key === 'id') meta.id = val
          else if (key === 'nameZh') meta.nameZh = val
          else if (key === 'nameEn') meta.nameEn = val
          else if (key === 'shortBadge') meta.shortBadge = val
          else if (key === 'accentColor') meta.accentColor = val
          else if (key === 'descriptionZh') meta.descriptionZh = val
          else if (key === 'effectiveRange' || key === 'range') meta.effectiveRange = val
          else if (key === 'type') meta.type = parseCsvFilterType(val)
          else if (key === 'loadedTiming' || key === 'timing') meta.loadedTiming = parseCsvLoadedTiming(val)
          else if (key === 'order' || key === 'priority') {
            const n = parseInt(val, 10)
            if (!isNaN(n)) meta.order = n
          }
        }
        continue
      }
      // Stop scanning once actual CSV data rows begin
      break
    }

    stubs.push({
      id: meta.id || defaultId,
      path: relPath,
      loadedTiming: meta.loadedTiming || 'on-demand',
      effectiveRange: meta.effectiveRange || 'International',
      type: meta.type || 'Text',
      order: meta.order,
      meta
    })
  }

  return stubs.sort((a, b) => {
    const oa = a.order ?? 999
    const ob = b.order ?? 999
    if (oa !== ob) return oa - ob
    return a.id.localeCompare(b.id)
  })
}

function buildInfoIndex(rootDir: string): InfoStubEntry[] {
  const infoDir = path.resolve(rootDir, 'src/content/info')
  const mdFiles = collectFilesByExt(infoDir, '.md')
  const stubs: InfoStubEntry[] = []

  for (const absPath of mdFiles) {
    const content = fs.readFileSync(absPath, 'utf-8')
    const relPath = '/' + path.relative(rootDir, absPath).split(path.sep).join('/')
    const fileName = path.basename(absPath)
    const dividerPattern = /\r?\n---\r?\n/
    if (dividerPattern.test(content.trim())) {
      const rawSections = content.split(dividerPattern)
      rawSections.forEach((sec, idx) => {
        const trimmed = sec.trim()
        if (!trimmed) return
        const stub = parseStubFromSection(trimmed, fileName, relPath, idx)
        if (stub) stubs.push(stub)
      })
    } else {
      const h1Matches = Array.from(content.matchAll(/^#\s+[^\r\n]+/gm))
      if (h1Matches.length > 1) {
        h1Matches.forEach((m, idx) => {
          const start = m.index!
          const end = idx < h1Matches.length - 1 ? h1Matches[idx + 1].index! : content.length
          const stub = parseStubFromSection(content.slice(start, end).trim(), fileName, relPath, idx)
          if (stub) stubs.push(stub)
        })
      } else {
        const stub = parseStubFromSection(content.trim(), fileName, relPath, 0)
        if (stub) stubs.push(stub)
      }
    }
  }
  return stubs
}

function contentIndexPlugin(): Plugin {
  const virtualObjectId = 'virtual:object-index'
  const resolvedVirtualObjectId = '\0' + virtualObjectId
  const virtualInfoId = 'virtual:info-index'
  const resolvedVirtualInfoId = '\0' + virtualInfoId
  const virtualCsvId = 'virtual:csv-filter-index'
  const resolvedVirtualCsvId = '\0' + virtualCsvId
  let projectRoot = process.cwd()
  let contentCache: {
    objects: Awaited<ReturnType<typeof buildObjectIndex>>
    info: InfoStubEntry[]
    csv: CsvFilterStubEntry[]
  } | null = null

  const ensureContentIndex = async () => {
    if (contentCache) return contentCache
    // Registration order: objects (fgb reader), then info markdown, then filter csv.
    const objects = await buildObjectIndex(projectRoot)
    const info = buildInfoIndex(projectRoot)
    const csv = buildCsvFilterIndex(projectRoot)
    contentCache = { objects, info, csv }
    return contentCache
  }

  return {
    name: 'vite-plugin-content-index',
    configResolved(config) {
      projectRoot = config.root
      contentCache = null
    },
    resolveId(id) {
      if (id === virtualObjectId) return resolvedVirtualObjectId
      if (id === virtualInfoId) return resolvedVirtualInfoId
      if (id === virtualCsvId) return resolvedVirtualCsvId
      return null
    },
    async load(id) {
      if (id === resolvedVirtualObjectId) {
        const { objects } = await ensureContentIndex()
        return `export default ${JSON.stringify(objects)};`
      }
      if (id === resolvedVirtualInfoId) {
        const { info } = await ensureContentIndex()
        return `export default ${JSON.stringify(info, null, 2)};`
      }
      if (id === resolvedVirtualCsvId) {
        const { csv } = await ensureContentIndex()
        return `export default ${JSON.stringify(csv, null, 2)};`
      }
      return null
    },
    configureServer(server) {
      const infoDir = path.resolve(projectRoot, 'src/content/info')
      const filtersDir = path.resolve(projectRoot, 'src/content/layers')
      const dataDir = path.resolve(projectRoot, 'public/data')
      const gridFile = path.resolve(projectRoot, 'src/data/taiwanPowerPoles.ts')
      server.watcher.add(infoDir)
      server.watcher.add(filtersDir)
      server.watcher.add(dataDir)
      server.watcher.add(gridFile)
      const invalidate = (resolvedId: string) => {
        const mod = server.moduleGraph.getModuleById(resolvedId)
        if (!mod) return
        server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      const onContentFileChange = (filePath: string) => {
        const normalized = filePath.split(path.sep).join('/')
        if (
          normalized.endsWith('.fgb') ||
          normalized.endsWith('taiwanPowerPoles.ts') ||
          normalized.endsWith('build-object-index.mjs')
        ) {
          contentCache = null
          invalidate(resolvedVirtualObjectId)
          return
        }
        if (normalized.endsWith('.md') && normalized.includes('/src/content/info/')) {
          contentCache = null
          invalidate(resolvedVirtualInfoId)
        } else if (normalized.endsWith('.csv') && normalized.includes('/src/content/layers/')) {
          contentCache = null
          invalidate(resolvedVirtualCsvId)
        }
      }
      server.watcher.on('add', onContentFileChange)
      server.watcher.on('change', onContentFileChange)
      server.watcher.on('unlink', onContentFileChange)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/inter-geo',
  plugins: [react(), contentIndexPlugin()],
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
