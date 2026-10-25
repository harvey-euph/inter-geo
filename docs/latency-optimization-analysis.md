# Inter-Geo Latency Optimization Analysis

## Scope and confidence

This is a source-level analysis of the current implementation, with emphasis on the desktop interaction lag reported by users. It identifies likely main-thread costs and proposes a measurement-first order of work. No browser performance trace or representative device benchmark was captured for this report, so the ranking is a set of code-based hypotheses, not measured attribution. Avoid implementing several large optimizations at once: first record a trace and use the same interaction scenario to compare each change.

## Executive summary

The most likely source of desktop pointer latency is the amount of work done synchronously for each pointer update: map hit testing can walk loaded road/subdivision geometry, while a scheduled Canvas frame clears and redraws every visible layer. Those workloads grow with loaded data and viewport pixel count. The app already does several important things well: FGB decoding is offloaded to a worker pool, L2/L3/road data is mostly loaded on demand, render calls are coalesced with `requestAnimationFrame`, path bounding boxes are checked before expensive path tests, and text widths are cached.

Recommended order:

1. Capture browser traces and add lightweight timings around hit test, render, and worker decode.
2. Coalesce hover hit tests to at most one per animation frame and avoid repeating a hit for an unchanged point/transform.
3. Add spatial candidate indexes for loaded roads and dense L2/L3 features so hit testing visits nearby candidates instead of every loaded feature.
4. Reduce redraw work: cap/adapt Canvas device-pixel ratio, separate static and dynamic drawing where the visual model allows it, and skip offscreen layer work early.
5. Cache layer-derived label values and render candidates outside the frame loop.
6. Only after profiling, address worker response size, geometry simplification, and memory retention.

## Current runtime cost map

### Pointer to hover

`WorldMap.tsx` routes pointer movement into `updateHoverAtPoint`, which calls `getFeatureAtPoint`, then `hitTestMapFeature` in `src/map/hitTest.ts`. Hit testing uses a shared 2D context for `isPointInPath`/`isPointInStroke` and prioritizes crossing badges, roads, L3, Taiwan grid zones, L2, then countries.

The hit tester has bbox pruning and a preferred-path fast path for the currently hovered L3/L2/country. However:

- When a road layer is active, it loops visible countries and loaded road arrays, then checks each road's bbox and possibly its path stroke. At country scale this can still visit a large number of roads for each hover sample.
- L2 hit testing loops all expanded countries and all subdivisions in each relevant country after the preferred L2 candidate misses.
- L3 hit testing obtains children for active/hovered parents and scans their children after bbox pruning.
- Some gestures schedule hover work from animation frames, while pointer movement can also request hover updates. The paths should be measured together to confirm how often hit tests actually run per display frame.
- A `getBoundingClientRect()` and Canvas context lookup occur in the hit-test path. These are likely smaller than geometry scans, but can be cached/moved if traces show measurable cost.

### Canvas rendering

`renderCanvas` in `WorldMap.tsx` clears the full Canvas and invokes the drawing layers in `renderLayers.ts`. It re-computes visible world copies, active-layer target state, expanded L2 countries, and a large `RenderContext` for each frame. The renderer correctly culls geographic objects by viewport bbox in many paths and batches some subdivision borders with combined `Path2D` objects.

Remaining costs to check:

- Every requested frame repaints the full backing Canvas. Canvas backing pixels scale with `width × height × devicePixelRatio²`; a 2x DPR surface has four times the pixels of a 1x surface.
- At high zoom, country and subdivision paths are individually filled/stroked. Many visible shapes can make rasterization/stroking expensive even when JavaScript itself is fast.
- Active nationwide text layers revisit subdivision arrays and resolve their labels during drawing. Some values are cached in the CSV registry, but the per-frame traversal and candidate creation remain.
- `drawGlobalTextBadges` runs a pairwise placed-label collision scan. It is bounded by visible countries, so it is unlikely to dominate today, but it is an obvious scaling point if the label set expands.
- `drawCrossingSignBadges` produces hit-test boxes during rendering, coupling current-frame hit data to the next interaction. Preserve that synchronization if render layers are cached or split.

### Data loading and decode

The geography directory is about **74 MB** on disk in this checkout: approximately 188 KB for the L1 country file, 5.8 MB for 91 L2 files, 58 MB for 357 L3 files, and 11 MB for 176 road files (625 FGB files total). This is the full static corpus, not the amount loaded for a normal initial view. L3 and roads are loaded on demand; the L2 decoder is worker-based. `src/map/geoDecode.worker.ts` decodes/project features and returns path strings; the main thread converts those strings to `Path2D` objects.

Potential revisit costs are worker response serialization (large path strings), `Path2D` construction on the main thread, and the memory occupied by retained paths. Those should be investigated after interaction traces: they primarily affect first-load/activation or memory pressure, rather than pointer latency once the data is resident.

## Prioritized opportunities

| Priority | Opportunity | Likely impact | Effort / risk | Evidence and suggested implementation |
| --- | --- | --- | --- | --- |
| P0 | Instrument the hot paths | High diagnostic value | Low / very low | Add development-only `performance.mark/measure` or sampled counters around `updateHoverAtPoint`/`hitTestMapFeature`, `renderCanvas`, and decode-to-Path2D completion. Record pointer events, hit tests, renders, and frame duration per second. Keep production logging disabled. |
| P1 | Coalesce hover work and skip unchanged hit tests | High for cursor responsiveness | Medium / medium | Store the latest pointer/crosshair location and schedule one hover update per RAF. Include transform/LOD version in the cache key so zoom/pan still triggers recomputation. Do not suppress updates when layer state, active L3 parent, selected state, or geometry loading changes. This consolidates existing scheduling rather than adding another competing hover loop. |
| P1 | Spatially index roads | High when road layers are enabled | Medium-high / medium | Build a grid/quadtree/R-tree keyed by road bbox when a road file finishes loading. Convert pointer position to map coordinates, query only nearby buckets, then keep current stroke tolerance and road-class precedence. Benchmark index build time against repeated full scans. Rebuild only when datasets change, not per frame. |
| P1 | Spatially index L2/L3 candidates | High in dense administrative regions | Medium-high / medium | Build indexes per country/parent after path decode, or use coarse fixed-size map-space buckets. Query candidate bbox overlaps at the current point before `isPointInPath`. Retain preferred-path fast paths and current priority ordering. This is safer than lowering geometry fidelity, which could break boundary accuracy. |
| P2 | Adaptive Canvas DPR | Medium to high on high-DPI desktops | Low-medium / medium | Measure render time at actual DPR. Consider capping effective render DPR (for example, 2) or temporarily using a lower DPR during active pan/zoom, then redraw at full quality after gestures settle. Keep CSS-space pointer coordinates and Canvas transform scaling consistent; validate thin borders and text sharpness. |
| P2 | Cache per-layer candidates and label values | Medium when text/area layers are active | Medium / low-medium | Precompute visible/filter-specific label candidates when active filters, loaded data, or viewport changes, instead of calling filter/value lookup for every subdivision on every render. Cache invalidation must include active filter data load completion and parent geometry changes. |
| P2 | Separate static and dynamic Canvas passes | Medium for repeated hover/repaint | High / high | Explore an offscreen/static base surface for stable land fills and boundaries, with dynamic hover/selection/labels above it. Invalidate on camera movement, resize, DPR, active fill layer, or geometry arrival. Panning transforms the entire map, so the cache is most useful for hover-only frames and must not introduce blurry transformed raster output. |
| P3 | Reduce worker response and main-thread path construction cost | Medium for activation/startup | High / medium-high | Profile decoded payload size and main-thread `new Path2D` time. If material, simplify/quantize paths in the worker, return transferable typed coordinate/path command buffers, or cache decoded representations. Preserve required border fidelity and avoid duplicating large strings across worker messages. |
| P3 | Bound decoded-geometry cache memory | Medium on long sessions / low-memory devices | Medium / medium | Track memory proxies (feature count, path string bytes, loaded parents). Consider LRU eviction only for unselected/offscreen L3 and road geometry, with cancellation or deduplicated refetch on revisit. Never evict geometry needed by active layers, selected objects, current hover, or in-flight operations. |
| P3 | Code-split data-heavy startup chunks | Low impact on pointer lag; useful startup improvement | Medium / low | The recent production build emitted a ~1.0 MB minified `geo-data` chunk (~180 KB gzip). Inspect its module composition before changing splitting; large chunk size affects parse/evaluation and initial load, while most geometry itself is public data loaded at runtime. Lazy-load metadata only if trace/network waterfall shows startup evaluation is a problem. |

## Measurement plan

Use Chrome/Edge DevTools Performance on a production build and a representative desktop viewport. Test identical scenarios with cache both warm and cold:

1. Pan rapidly over a country with no optional layers active.
2. Hover across a dense L2 country at a zoom where subdivisions are interactive.
3. Enable one road layer and pan/hover over a road-dense area.
4. Enable one nationwide text layer and hover across its target areas.
5. Zoom with wheel, then use the mobile-style center cursor only as a separate scenario.

Record:

- Main-thread long tasks and frame durations; target a stable 60 Hz frame budget below 16.7 ms, while noting 120 Hz displays have an 8.3 ms budget.
- Time and call counts for hit tests and render passes per second.
- Time spent in `isPointInPath`/`isPointInStroke`, Canvas paint/raster, React commits, and GC.
- Decode fetch time, worker decode time, worker message size, main-thread `Path2D` creation time, and the number of resident features.
- Canvas CSS dimensions, effective DPR, and backing-store dimensions.

Add temporary performance marks or sampling to isolate app work, but remove noisy per-event logs before merging. Compare the same scenarios after each optimization and verify map correctness: object selection at shared boundaries, selected-object highlighting, active-layer target visibility, wraparound world copies, L3 child hit testing, and the Taipower/grid special case.

## Risks and constraints

- Render visibility and hit-test visibility must remain equivalent. An optimization that maintains a separate spatial index must invalidate it when geometries are loaded, replaced, or evicted.
- Cache keys need all state that affects eligibility: camera transform/LOD, active filter set and loaded values, parent/selection state, and geometry availability. A stale cache can look like flicker or missing features.
- Keep map coordinates in the existing projected 1000×1000 world space for spatial indexes. Avoid indexing screen coordinates because every pan/zoom would require rebuilding the index.
- `Path2D` is browser-managed and not transferable. If changing worker payload format, benchmark decode, transfer, reconstruction, and memory together; optimizing only one stage can move the bottleneck to the main thread.
- DPR reduction trades image sharpness for responsiveness. Make it adaptive and validate text/borders on both standard and high-DPI displays.
- The observed 74 MB disk footprint does not mean 74 MB downloads at startup. Preserve on-demand loading and measure actual network transfers before proposing broad compression or eager/lazy-loading changes.

## Suggested first implementation batch

After collecting a baseline trace, the most conservative likely improvement is to coalesce hover hit tests to a single RAF and add counters proving that no extra hover pass occurs for a frame. If hit testing remains the dominant cost, introduce a per-dataset spatial index for roads first because the road-active path explicitly iterates loaded road arrays. If Canvas rasterization dominates, test adaptive DPR before attempting a multi-canvas renderer. Keep each change independently reviewable and compare interaction traces plus map behavior.
