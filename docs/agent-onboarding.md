# Inter-Geo: AI Agent Onboarding & Architecture Guide

> [!NOTE]
> 本專案的完整系統架構、Mermaid 資料流與渲染管線圖、圖層體系與雙庫運作機制已全面整理並合併至 [README.md](../README.md)。
> 人類開發者與 AI Agent 請優先參閱根目錄的 [README.md](../README.md)。

## Agent Quick Context

Inter-Geo 是專為 GeoGuessr 競技打造的高效能 GIS 向量地圖，採用**純前端解耦雙儲存庫架構**：

- **前端庫 (`inter-geo`)**：純 React 19 + TypeScript + Vite，無本機 GIS 資料，`public/` 僅保留 `globe.svg`。
- **資料庫 (`inter-geo-data`)**：儲存 FlatGeobuf 二進位空間向量 (`data/`)、CSV 圖層 (`layers/`)、Markdown 實戰情報卡 (`info/`) 與圖片 (`images/`)。
- **自動化索引 (`index` 分支)**：推送至 `inter-geo-data:main` 時觸發 GitHub Actions 執行 `scripts/build-indexes.mjs`，發布輕量 JSON 索引清單至孤立的 `index` 分支。
- **動態按需加載**：前端由 `src/data/geoIndexClient.ts` 快取索引，並透過 `src/data/dataSource.ts` 依視窗可視範圍按需下載原始檔案。

---

## 核心設計原則與不可破壞的不變量 (Invariants)

1. **圖層名稱規範 (Layer System)**：
   - 舊稱 `filter` 已全數升級為 `layer`。除保留之 CSS 屬性（如 `backdrop-filter`）與 JS 原生陣列方法（`.filter(...)`）外，所有代碼、變數、型別與檔案名稱均使用 `layer`（如 `src/layers/`, `LayerBar.tsx`, `activeFilterId` 逐步遷移至 `LayerDefinition`）。
2. **單一 Canvas 2D 硬體加速**：
   - 繪製邏輯統一在 `src/map/render/renderLayers.ts`，禁止引入額外的 SVG DOM path 來繪製地圖主體。
3. **渲染與拾取嚴格對齊 (Render & Hit-Test Consistency)**：
   - `src/map/hitTest.ts` 的判斷順序必須與 `renderLayers.ts` 的 Draw Call 順序完全一致，確保「所見即所選」。
4. **旁路 React 生命週期以維持 120 FPS**：
   - 相機平移、縮放阻尼、游標懸停移動等高頻事件必須寫入 `ref` 並調用 `requestRender()`，不可寫入 React `useState` 觸發組件重渲染。
5. **程式碼風格與規範**：
   - 保持 TypeScript 嚴格型別，維護 0 ESLint warning 與 0 error（`npm run lint` & `npm run build` 必須通過）。
   - 保留現有註解與說明文件，路徑變更時同步更新相關參照。
