# Inter-Geo 渲染層遷移簡報（用一個新的 branch 來做）

## 專案理解

**Inter-Geo** 是一套純前端、無後端的 Web GIS，專為地理探索與 GeoGuessr 競技分析設計。

- 前端 repo：`inter-geo`（React 19 + TypeScript + Vite）
- 資料 repo：`inter-geo-data`（FlatGeobuf `.fgb`、CSV 圖層、Markdown 情報卡）
- 架構：雙 repo 解耦。前端啟動時載入輕量 JSON 索引，再按需串流原始資料。
- 核心能力：
  - L1 國家 → L2 一級行政區 → L3+ 二級／三級行政區的下鑽
  - 公路路網、雙色道路標線、街景拍攝車特徵
  - CSV 動態圖層（區塊著色 / 全域標籤 / 區域特徵）
  - Markdown 情報卡 + 3 軌標籤過濾
  - 內嵌 Google Street View + Dev Mode 微調器
  - URL 狀態同步（lat / lon / zoom）

**目前渲染瓶頸**：  
使用 HTML5 Canvas 2D + `Path2D`（`src/map/render/renderLayers.ts` + `WorldMap.tsx`）。  
複雜多邊形與道路在主執行緒做 fill/stroke，加上 `shadowBlur` 高亮，導致縮放與展開行政區時不夠流暢。  
與 Google Maps / MapLibre 的差距主要來自「CPU Canvas vs GPU WebGL」，而非單純資料精度不足。

## 轉換目標

把「幾何繪製」從 Canvas 2D 改為 WebGL，使平移、縮放、L2/L3 展開、道路渲染能接近現代向量地圖的流暢度。

保留：
- 雙 repo 資料架構
- CSV 圖層系統與情報卡
- Street View 嵌入與 UI 互動
- 現有 hit-test 邏輯（可改寫為 WebGL picking 或保留 CPU 輔助）

## 建議技術路線

優先順序：

1. **MapLibre GL JS**（推薦起步）  
   - 開源向量地圖引擎，內建 WebGL、多級 LOD、標籤碰撞、道路 casing。  
   - 適合把現有 FGB 轉成 vector tiles 後直接使用。

2. **deck.gl**（疊加自訂圖層）  
   - 可與 MapLibre 或自有底圖搭配。  
   - 適合保留部分現有 Canvas 邏輯，只把重型多邊形／道路搬到 WebGL。

3. **自研 WebGL2 / WebGPU 渲染器**  
   - 完全掌控雙色標線、特殊高亮、精確 picking。  
   - 工作量最大，僅在前兩項無法滿足需求時考慮。

**建議第一階段**：以 MapLibre GL JS 為主，驗證效能提升幅度後再決定要不要深入自訂。

## 技術細節與遷移步驟

### 1. 資料準備

- 現有資料：`inter-geo-data/data/**/*.fgb`（L1/L2/L3/Roads）
- 目標：產出 **vector tiles**（MVT / PMTiles）或 MapLibre 可直接消費的格式。
- 建議工具：
  - `tippecanoe`（從 GeoJSON/FlatGeobuf 生成多級 vector tiles）
  - 或 `flatgeobuf` + 自訂簡化腳本後再切片
- 需處理：
  - 低縮放級別做幾何簡化（Douglas-Peucker 或類似）
  - 道路按 class 分層，避免低縮放畫出過多細節
  - 保留現有屬性（iso2、名稱、道路等級等），供 style 與 hit-test 使用

### 2. 前端渲染層替換

關鍵檔案（目前 Canvas 實作）：
- `src/components/WorldMap.tsx`（主循環、transform、LOD 判斷、requestAnimationFrame）
- `src/map/render/renderLayers.ts`（fill / stroke / 高亮 / 徽章繪製）
- `src/map/hitTest.ts`（游標拾取）
- `src/map/geoDecode.worker.ts`（FGB 解碼）

遷移方向：
- 用 MapLibre 的 `Map` 實例取代 Canvas 元素。
- 把現有的 `k / x / y` transform 對應到 MapLibre 的 `center` + `zoom`。
- 圖層改用 MapLibre style layers（fill、line、symbol）或 `addLayer` 動態加入。
- CSV 圖層系統改為：解析後產生 MapLibre source + layer，或用 deck.gl 的 layer。
- 高亮效果改用 MapLibre 的 `line-color` / `line-width` / `fill-opacity` 或 custom layer shader，避免 `shadowBlur`。

### 3. LOD 與載入策略

- 目前：依畫面比例決定是否展開 L2/L3（離散）。
- 改為：依賴 vector tiles 的 zoom level 自動切換（連續）。
- 保留「solidity / 離島判斷」作為是否載入較高精度圖磚的額外條件即可。

### 4. Hit-test 與互動

- MapLibre 內建 `queryRenderedFeatures`，可取代大部分 `hitTest.ts` 邏輯。
- 若需保留現有精確的「上層優先」規則，可在 MapLibre 事件中再做一次過濾。
- 情報卡、圖層開關、Street View 面板等 UI 邏輯可幾乎原封不動保留。

### 5. 開發與驗證順序（建議）

1. 用一個國家（例如 TW 或 US）的 L2 + roads 產出測試用 vector tiles。
2. 在獨立頁面用 MapLibre 載入，量測縮放與平移的 FPS。
3. 把現有的 `WorldMap` 改成可切換「Canvas 模式 / MapLibre 模式」。
4. 逐步遷移圖層（先 fill-region，再 roads，再標籤）。
5. 確認情報卡、URL 同步、Street View 仍正常運作後，再考慮全面切換。

## 風險與注意事項

- 雙色道路標線、特殊高亮若 MapLibre style 無法表達，可能需要 custom layer 或 deck.gl。
- 現有 `Path2D` 快取與 dissolve 邏輯在 WebGL 路線下大部分可廢棄。
- 資料 repo 的 index 產生流程（`build-indexes.mjs`）需要新增 vector tiles 的產出步驟。
- 純前端部署（GitHub Pages）時，vector tiles 建議用 PMTiles 或靜態 MVT 目錄，避免後端依賴。

## 預期成果

- 縮放與平移明顯更流暢（尤其 L2/L3 展開後）。
- 可承受更高密度的道路與行政區邊界。
- 保留現有 GeoGuessr 導向的互動功能（情報卡、圖層、Street View）。
- 為後續加入更完整的地理著色、標籤碰撞、連續 LOD 打下基礎。

---

**給 Agent 的起手式**：  
先讀 `src/components/WorldMap.tsx` 與 `src/map/render/renderLayers.ts`，確認 Canvas 繪製路徑；  
再評估用 MapLibre GL JS 載入單一國家的 vector tiles 作為 PoC，驗證效能後再規劃完整遷移。