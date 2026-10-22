# Inter-Geo — Optimization Review

## Repo at a glance
- **Stack:** React 19 + Vite 8 + TS, `d3-geo` Mercator projection, FlatGeobuf binary data (`public/data`: L2 5.9 MB / 91 files, L3 58 MB, roads 11 MB).
- **Architecture:** One Canvas-2D map ([WorldMap.tsx](file:///home/harvey/inter-geo/src/components/WorldMap.tsx), **4,558 lines / 170 KB**). Fast-changing state (transform, hover, selection) lives in refs and is drawn by an imperative `renderCanvas()`. Hit-testing uses `isPointInPath` / `isPointInStroke` behind AABB pre-filters.
- **Health:** `tsc -b` and `eslint` both pass cleanly. The production JS bundle is **754 KB (238 KB gzip)** in a single chunk.

The core design is sound: Path2D caching, bbox culling, sub-pixel culling, batched strokes, and rAF-coalesced hover. Most of the remaining gains are in **startup work**, **redundant renders and re-renders**, and **the size of the single file**.

---

## A. Frontend rendering / runtime performance (by impact)

### A1. Startup blocks on all 91 L2 datasets, decoded on the main thread 🔴 High
[Loader effect L3184-L3359](file:///home/harvey/inter-geo/src/components/WorldMap.tsx#L3184-L3359)
- The loading screen stays up until **every** `l2/*.fgb` file is fetched, projected (`pathGenerator` → SVG string → `new Path2D`), and run through `dissolveToPathD`. All of this runs on the main thread.
- The README describes "on-demand viewport loading", but the code preloads everything.
- `setLoadingProgress` runs 91 times, so the component re-renders 91 times during load.

**Options:**
1. Show the map once L1 is ready and stream L2 in the background. L2 isn't needed until zoom ≥ the L2 threshold.
2. Move FGB decoding, projection, and dissolve into a **Web Worker**. The worker returns path strings or flat coordinate arrays, and the main thread only builds `Path2D`s.
3. Throttle the progress updates, e.g. one per rAF.

### A2. Uncoalesced `renderCanvas()` calls 🔴 High
- [`handleWheel`](file:///home/harvey/inter-geo/src/components/WorldMap.tsx#L2852-L2897) renders **synchronously on every wheel event**. Trackpads fire 60–120+ events/sec, often more than one per frame. Each event also calls `setZoomK(...)`, which re-renders the whole 4.5k-line component, and runs `syncAllViewports`.
- About 12 sync `useEffect`s ([L3049-L3181](file:///home/harvey/inter-geo/src/components/WorldMap.tsx#L3049-L3181)) each call `renderCanvas()`. One commit that changes several props draws the full frame several times.
- Image `onload` handlers fire one render per crossing-sign image (about 40 images).

**Fix:** add a single `requestRender()` that sets a dirty flag plus one `requestAnimationFrame`, and use it everywhere except inside the existing animation loops. Throttle `setZoomK` to rAF or after the gesture ends.

### A3. Hover state lifted to `App` re-renders the whole tree 🟠 Medium
- `hoveredCountry` lives in [App.tsx](file:///home/harvey/inter-geo/src/App.tsx#L24) but only `WorldMap` uses it. Every country-hover change re-renders `Header`, `FilterBar`, `WorldMap`, and `CountryDetailPanel` (1,366 lines, not memoized).
- `handleSelectCountry`, `handleSelectPrefecture`, `handleSelectMunicipality`, and `handleSelectRoad` in `App` are **not** wrapped in `useCallback`. Because of that, on every hover:
  - `handleMapClick` gets a new identity.
  - The keyboard `useEffect` ([deps L3890-L3906](file:///home/harvey/inter-geo/src/components/WorldMap.tsx#L3890-L3906)) **removes and re-adds window listeners**.

**Fix:** move hover state into `WorldMap` (or keep it ref-only plus a small tooltip component), wrap the handlers in `useCallback`, and add `React.memo` to `CountryDetailPanel`, `Header`, and `FilterBar`.

### A4. Wheel `preventDefault()` does nothing 🟠 Medium
React attaches `onWheel` as a **passive** listener, so `e.preventDefault()` at [L2853](file:///home/harvey/inter-geo/src/components/WorldMap.tsx#L2853) is ignored. Ctrl+wheel or trackpad pinch will zoom the browser page instead of the map. **Fix:** register the listener natively with `addEventListener('wheel', fn, { passive: false })` in an effect.

### A5. Per-frame text work in label layers 🟡 Low–Medium
[Text overlays L1536-L1958](file:///home/harvey/inter-geo/src/components/WorldMap.tsx#L1536-L1958)
- `ctx.font = …` is set and `measureText()` is called **for every badge, every frame**. Badge text and font are static, so the widths can be cached once in a `Map<string, number>`.
- Area-code badges have no collision culling, unlike the country badges.
- Taipower hover fill uses a chain of string `.replace()` calls on every frame ([L1407](file:///home/harvey/inter-geo/src/components/WorldMap.tsx#L1407)). Precompute a hover color per zone.

### A6. `shadowBlur` highlights 🟡 Low
Every highlighted path is stroked with `shadowBlur` inside `save()`/`restore()`, once per visible world copy. Shadow blur is one of the slowest Canvas2D operations, especially on large polygons such as Russia, Canada, or the US. Options: cap blur when `k` is high, or draw the glow as a double stroke (a wide translucent stroke plus a thin solid one).

### A7. Memory: unused data retained 🟡 Low–Medium
- `pathD: string` is stored on every L1, L2, L3, and road feature but is **never read** (`grep` finds only the type declarations). This keeps megabytes of SVG strings alive next to the `Path2D`s. Drop the field.
- `l2AllOutlinesPathRef` builds a `Path2D` of *all* L2 polygons at startup, and nothing ever reads it ([L3312-L3332](file:///home/harvey/inter-geo/src/components/WorldMap.tsx#L3312-L3332)).
- `loadedL2DataRef` and `allL2SubdivisionsRef` are write-only. `allL2SubdivisionsRef` is also rebuilt with `Object.values(...).flat()` in an effect.
- Loaded L3 packs and road bundles are never evicted. This is fine for now but grows without bound over a long session.

### A8. `backdrop-filter` over a constantly redrawn canvas 🟡 Low
Six `backdrop-filter: blur()` rules ([App.css](file:///home/harvey/inter-geo/src/App.css)) sit on overlays above the canvas, including `.precision-hud`, `.map-control-btn`, and `.map-tooltip`. The browser re-blurs them on every pan frame, which costs GPU time on laptops and low-end hardware. Consider a solid or semi-opaque background for the always-visible ones, such as the HUD and the control buttons.

### A9. Bundle size 🟡 Low
- A single 754 KB chunk. The large static tables are `l3Manifest.ts` (123 KB), `countries.ts` (109 KB), and `roadsManifest.ts` (31 KB).
- Candidates for `React.lazy` / dynamic `import()`: `QuizModal`, `CountryDetailPanel` and its lore, and the L3 and road manifests (only needed at L3 or with roads on).
- `world-atlas` and `topojson-client` are listed as runtime `dependencies` but only `scripts/` uses them. Move them to `devDependencies`.

---

## B. Code cleanliness

### B1. Split `WorldMap.tsx` 🔴 High
It mixes data loading, projection, the render pipeline, hit-testing, input handling, keyboard navigation, and roughly 650 lines of tooltip and controls JSX. A suggested split:

| Module | Contents |
|---|---|
| `map/loaders.ts` | L1, L2, L3, and road FGB → `PathData` builders (one shared `featureToPathData()`) |
| `map/render/*.ts` | Pure layer functions: `drawCountries`, `drawL2`, `drawL3`, `drawRoads`, `drawTextBadges`, `drawTaipower`, … |
| `map/hitTest.ts` | `getFeatureAtPoint` |
| `hooks/useMapTransform.ts` | Pan, zoom, wrap/clamp, `animateTo`, LOD transitions |
| `hooks/useKeyboardNav.ts` | Arrow-key panning and cycling (about 350 lines) |
| `MapTooltip.tsx`, `MapControls.tsx` | JSX currently inline |

### B2. Duplicated logic
- **LOD transition block** is copy-pasted 5 times: `handleWheel`, `handleZoom`, `handleResetZoom`, `handleSliderZoom`, and `handleUpdateThresholds` ([e.g. L2875-L2892](file:///home/harvey/inter-geo/src/components/WorldMap.tsx#L2875-L2892)). Extract an `applyLOD(nextLOD)` helper.
- **"Clear all hover state"** is repeated about 8 times: `updateHoverAtPoint`, `handleMouseMove`, `onMouseLeave`, and others. Use a `setHover(kind, value)` helper that clears every other kind.
- **Feature → path data** (projection + `bounds` + `centroid` + try/catch) is duplicated 4 times: L1, L2, L3, and roads.
- **`L2SubdivisionDetail` construction** is duplicated in click, hover, and App's `handleNavigateBack`.
- **Fallback `CountryData` literal** (about 25 fields) is duplicated at [L2621](file:///home/harvey/inter-geo/src/components/WorldMap.tsx#L2621) and [L2702](file:///home/harvey/inter-geo/src/components/WorldMap.tsx#L2702). Make it a `makeUnknownCountry()` function.
- **Viewport bbox culling** (`sMinY…sMaxX`) is inlined in about 5 places. Extract an `inView(bbox, copyOffset)` helper.
- **Badge pill drawing** (selected / hovered / default) is repeated 3 times. Extract a `drawPill(ctx, box, state, palette)` helper.

### B3. Dead or stale code
- `activeL2SubdivisionPaths` is just an alias of `allL2Subdivisions`.
- Write-only refs: `l2AllOutlinesPathRef`, `loadedL2DataRef`, `allL2SubdivisionsRef`.
- `pathD` fields (see A7). The `isFilterExpanded` and `onToggleRoads` props are passed but unused.
- `.roads-gpu-canvas` CSS has no matching element. The JSX comment "Clean Raw SVG World Map" and the class `svg-map-wrapper` describe a canvas-based map.
- `hasInversionBox` uses the heuristic `includes('M0,') || includes('1000,')`. It is fragile and could match real coordinates.

### B4. Smaller items
- Repeated font strings and magic colors (`'#38bdf8'`, `'#f97316'`, …) should become a `theme` constants module.
- The `TaipowerZoneRenderItem` interface is declared inside the component body.
- `App.css` is 1,366 lines in one global file. Consider CSS modules per component.

---

## Suggested order of work
1. **Quick wins (low risk, under 1 hour):** A2 `requestRender` coalescing, A4 native wheel listener, A3 `useCallback` handlers plus local hover state, A7 and B3 dead-code and `pathD` removal.
2. **Startup:** A1 (show the map after L1 and stream L2), then move decoding into a worker.
3. **Refactor:** B1 and B2 split. Do it after the quick wins so behavior stays verifiable.
4. **Polish:** A5, A6, A8, A9.
