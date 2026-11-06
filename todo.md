# InterGeo — Global Administrative Map / Globe
## MapLibre GL JS Integration & Implementation Specification

## 1. Project Objective

在現有 InterGeo 專案中整合 MapLibre GL JS，建立一套全球行政區向量地圖系統。

核心需求：

1. 支援 2D 全球循環地圖（Equirectangular / Plate Carrée）。
2. 支援 3D Globe。
3. 2D 與 3D 必須使用同一份地理向量資料。
4. 兩種模式必須共用相同的行政區、著色、Label、圖片及互動邏輯。
5. 支援全球國界與多層級行政區。
6. 隨著 Zoom / Focus 動態載入更精細的行政區與幾何資料。
7. 所有地理資料以 FlatGeobuf（FGB）作為主要資料格式。

這是一個 Geographic Information Visualization System，不是單純的 3D Globe Demo。

---

## 2. Existing Project Context

專案：InterGeo

Repository:
https://github.com/harvey-euph/inter-geo

現有技術架構：
- Vite
- React
- TypeScript（如現有程式已採用）
- FlatGeobuf
- Web Worker
- GitHub Pages 靜態部署

現有資料結構包含：
- `public/data/l2/`
- `public/data/l3/`

已經有 FlatGeobuf 資料載入、空間索引與相關地理資料處理機制。

### Important Constraints

- 先理解現有資料載入架構，不要重複實作已有功能。
- 不要破壞現有 InterGeo 頁面及資料瀏覽功能。
- 不要直接刪除或重構既有 FGB loader。
- MapLibre 應該整合進現有 React/Vite 架構。
- 地理資料的 Source of Truth 必須維持為向量資料，不使用 Raster Image 代替行政區。
- 不要為 2D 和 3D 各建立一份不同的行政區幾何資料。

---

## 3. Git Workflow

開始實作前：

1. 檢查目前 Git branch、working tree 及未提交變更。
2. 確認目前專案狀態。
3. 從適當的基礎 branch 建立新 branch：

`feat/maplibre-admin-globe`

4. 不得覆蓋或丟棄使用者現有的未提交變更。
5. 所有本次實作都在新 branch 進行。

開始前先閱讀：
- package.json
- vite.config.ts
- src/ 目錄結構
- 現有地圖渲染元件
- FGB loader
- Web Worker
- L2/L3 資料載入流程

---

## 4. Technology Selection

主要渲染引擎：

**MapLibre GL JS**

Official repository:
https://github.com/maplibre/maplibre-gl-js

Official documentation:
https://maplibre.org/maplibre-gl-js/docs/

使用 MapLibre 的原因：

- WebGL vector rendering
- Globe projection
- Polygon / MultiPolygon rendering
- Vector Tile support
- GeoJSON Source
- Feature picking
- Feature state
- Symbol Layer
- Dynamic layer styling
- Zoom-dependent rendering
- Camera control

優先使用 MapLibre 原生的 Style Layer、Source、Feature State 和 Picking API，不要自行重寫整套 WebGL 渲染機制。

---

## 5. Critical Requirement: Unified 2D / 3D Rendering

這是整個專案最重要的架構要求。

2D 與 3D 必須共用：

- 同一份行政區資料
- 同一份 Feature ID
- 同一套 Geometry
- 同一套 Style Rules
- 同一套 Feature State
- 同一套 Hover / Click Event Handling
- 同一套 Label Data
- 同一套 Image Marker Data
- 同一套 LOD 管理邏輯

預期架構：

```text
              Geographic Data
                     |
                     v
             FlatGeobuf (FGB)
                     |
                     v
             Data Loading Layer
                     |
                     v
              Shared Map Source
                     |
          +----------+----------+
          |                     |
          v                     v
      2D Renderer           3D Renderer
   Equirectangular             Globe
          |                     |
          +----------+----------+
                     |
                     v
            Shared Style System
                     |
                     v
           Shared Interaction State
                     |
        +------------+------------+
        |            |             |
      Hover        Click        Selection
        |            |             |
        +------------+-------------+
                     |
                     v
             React Information UI
```

### Projection Switching

預期使用者可以透過 UI 一鍵切換：

- 2D: Equirectangular / Plate Carrée
- 3D: Globe

優先使用同一個 MapLibre Map instance 和同一套 Source / Layer。

切換投影時：
- 不重新下載地理資料。
- 不重建 Feature。
- 不重置 Hover / Selected 狀態。
- 不重新建立 Label / Image Marker。
- 不改變行政區的邏輯 ID。
- 保留目前的地理位置與合理的相機視角。

### Important Projection Investigation

不要假設 Equirectangular 是 MapLibre 內建投影。

目前需要驗證：

1. MapLibre GL JS Globe / Vertical Perspective 的實際 API。
2. MapLibre GL JS Custom CRS API。
3. 能否透過 Custom CRS 實作 Equirectangular。
4. Equirectangular 是否能支援水平循環 World Copies。
5. Custom CRS 是否能與 Globe 在同一 Map instance 切換。
6. Feature Picking、Symbol Placement、Camera Control 在兩種模式是否正常。

Custom CRS 相關文件：

https://maplibre.org/maplibre-gl-js/docs/guides/custom-crs/

Style Projection Specification:

https://maplibre.org/maplibre-style-spec/types/

Custom CRS 目前具有 Experimental 性質，需注意版本相容性。

如果單一 Map instance 無法完整滿足兩種投影需求，請先提出技術限制及可行替代架構，不要自行降低需求或默默改用兩套不同的地理資料。

---

## 6. 2D Circular World Map

2D 模式要求：

- 使用 Equirectangular / Plate Carrée。
- X 軸對應 Longitude。
- Y 軸對應 Latitude。
- 左右兩側可循環。
- 可以持續水平 Pan，不會遇到世界地圖的終點。
- 跨越 ±180° 時不應出現 Polygon 異常連線。
- 相鄰 World Copies 必須保持相同 Feature ID。
- Hover / Click 必須正確對應原始 Feature。

示意：

```text
+-----------------------------+
|  America | Europe | Asia    |
+-----------------------------+
        -> horizontal pan ->
+-----------------------------+
| Europe | Asia | America     |
+-----------------------------+
```

需要特別處理：
- Antimeridian crossing
- Polygon clipping
- MultiPolygon
- World copies
- Geometry normalization

---

## 7. Geographic Data

主要資料來源：

geoBoundaries

https://www.geoboundaries.org/

GitHub:
https://github.com/wmgeolab/geoBoundaries

預計資料層級：

| Level | Content |
|---|---|
| ADM0 | Country |
| ADM1 | State / Province / Prefecture |
| ADM2 | District / Municipality |
| ADM3+ | More detailed administrative divisions |

資料來源可依國家完整度補充其他政府公開資料或 OpenStreetMap。

### Canonical Data Format

FlatGeobuf（FGB）是主要資料儲存格式。

要求：
- Geometry 使用 WGS84 longitude / latitude。
- Polygon / MultiPolygon。
- 保留行政區屬性。
- 建立穩定 Feature ID。
- 建立 Parent / Child 關係。
- 支援空間索引。
- 支援 HTTP Range Request。
- 盡可能沿用現有 FGB Loader。

建議 Feature Properties：

```json
{
  "feature_id": "JPN-22-22100",
  "parent_id": "JPN-22",
  "country_code": "JPN",
  "admin_level": 2,
  "name": "Hamamatsu",
  "name_en": "Hamamatsu",
  "geometry_lod": 2
}
```

Feature ID 必須跨越不同 LOD 保持穩定。

注意：以上 ID 是示意格式，正式 ID 必須由資料處理流程產生，並確保不與其他行政區衝突。

### FGB Rendering Integration

MapLibre 沒有將 `.fgb` 直接視為原生 GeoJSON URL 的功能。

需要評估兩種方式：

**Option A — Direct FGB Loading**

使用 FlatGeobuf JavaScript Library：

https://github.com/flatgeobuf/flatgeobuf

透過空間索引與 HTTP Range Request：
1. 根據目前地圖視野取得 Bounding Box。
2. 從 FGB 取得相交的 Features。
3. 將資料送入 MapLibre GeoJSON Source。
4. 視需要增量更新資料。

可以評估 MapLibre 的 FlatGeobuf 整合插件：

https://maplibre.org/maplibre-gl-js/docs/plugins/

**Option B — Vector Tile Rendering**

由 FGB 離線產生 MVT / PMTiles。

使用：
- MVT
- PMTiles
- MapLibre Vector Source

此方式適合大量全球行政區資料，減少瀏覽器一次載入的資料量。

MVT / PMTiles 必須由同一份 FGB Source of Truth 衍生，不得建立獨立的 2D、3D 幾何版本。

初期可先使用 Direct FGB Loading 驗證功能，再依 Benchmark 決定是否需要 Vector Tiles。

---

## 8. Administrative LOD

需要同時支援 Geometry LOD 與 Semantic LOD。

### Geometry LOD

同一個行政區在不同縮放層級使用不同幾何精度。

例如：

```text
Country Geometry
  LOD 0: Simplified
  LOD 1: Medium
  LOD 2: High Resolution
```

### Semantic LOD

依照 Zoom / Focus 展開行政區：

```text
Global
  |
  +-- ADM0: Countries
         |
         +-- ADM1: Provinces
                |
                +-- ADM2: Municipalities
                       |
                       +-- ADM3: Districts
```

預期行為：

- 全球視角顯示 ADM0。
- 聚焦國家後載入 ADM1。
- 聚焦省份後載入 ADM2。
- 需要時再載入 ADM3+。
- 不需要的高精度資料可以卸載。
- Zoom Out 時恢復較低層級。
- 不同 LOD 切換時避免閃爍及重複邊界。

行政區層級不能單純假設每個國家都相同，需要使用資料本身的 parent-child hierarchy。

---

## 9. Shared Styling System

所有 Style 必須共用。

### Polygon Fill

支援：
- Default color
- Data-driven color
- Hover color
- Selected color
- Disabled / unavailable state

優先使用 MapLibre Fill Layer。

### Boundary

使用 Line Layer。

支援：
- Country boundary
- Administrative boundary
- Selected boundary
- Hover boundary
- 不同行政層級的線寬

### Label

使用 Symbol Layer。

支援：
- Country name
- Province name
- City / Municipality name
- Zoom-dependent visibility
- Language switching
- Text size
- Text color
- Text halo
- Collision detection

Label Anchor 必須盡量使用正確的行政區內部標註點，而不是直接使用 Polygon Centroid。

同一 Label 資料必須適用於 2D 與 3D。

### Image Marker

支援在地理位置上附加圖片。

例如：
- Country image
- Landmark image
- User-defined image
- Administrative area thumbnail

優先使用 MapLibre Symbol Layer 的 `icon-image`。

圖片資源與地理座標應分開管理。

同一個 Image Marker 在兩種投影下應維持相同的地理位置與 Feature ID。

---

## 10. Interaction System

所有互動必須與 Projection 無關。

### Hover

使用 MapLibre Layer Event：

```javascript
map.on('mousemove', 'admin-fill', handler);
```

透過 `setFeatureState()` 更新 Hover 狀態。

要求：
- Hover 時改變 Polygon Fill。
- 同時改變 Boundary Style。
- 顯示 Tooltip。
- 滑鼠離開後恢復原始狀態。
- 2D / 3D 行為一致。

### Click

使用：

```javascript
map.on('click', 'admin-fill', handler);
```

透過 Feature Properties 取得：

- Feature ID
- Administrative Level
- Name
- Parent ID
- Additional Properties

Click 後：
- 設定 Selected Feature。
- 顯示詳細資訊。
- 可進一步展開下層行政區。
- 可顯示附加圖片。
- 可以取消選取。

### Feature State

建議管理：

```javascript
interface MapInteractionState {
  hoveredFeatureId: string | null;
  selectedFeatureId: string | null;
  expandedFeatureId: string | null;
  activeAdminLevel: number;
}
```

注意：
- React State 是互動狀態的主要管理來源。
- MapLibre Feature State 是渲染層的呈現狀態。
- 不要將 UI 狀態綁定在特定 Projection。
- 不要依賴 GeoJSON Feature 的陣列 index 作為永久 ID。
- 使用 promoteId 或明確的 Feature ID。

官方 API：

https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#setFeatureState

---

## 11. Camera and Mode Switching

建立一個簡單的模式切換 UI：

```text
[ 2D Map ] [ 3D Globe ]
```

切換時：
- 儘量保留目前的地理中心。
- 保留合理的 Zoom。
- 保留 Selected Feature。
- 保留 Hover / UI 狀態。
- 保留目前顯示的行政區層級。
- 避免重新載入 FGB。
- 避免閃爍。

需要處理 Globe 與 2D 不同的相機參數，不要求兩種模式的 Zoom 數字完全相同，但要盡可能維持相近的視覺範圍。

---

## 12. Suggested Architecture

建議先依現有專案結構調整，不要為了符合下列目錄而強制搬移既有檔案。

概念上的模組：

```text
src/
  map/
    MapContainer.tsx
    MapLibreAdapter.ts
    ProjectionController.ts

    data/
      GeographicDataManager.ts
      FlatGeobufLoader.ts
      FeatureRegistry.ts
      AdministrativeHierarchy.ts

    layers/
      AdministrativeFillLayer.ts
      BoundaryLayer.ts
      LabelLayer.ts
      ImageMarkerLayer.ts

    interaction/
      InteractionController.ts
      FeatureStateManager.ts

    lod/
      LODController.ts
      GeometryLODManager.ts
      AdministrativeLODManager.ts

    styles/
      mapStyle.ts
      administrativeStyle.ts

  components/
    MapModeSwitcher.tsx
    FeatureTooltip.tsx
    FeatureInfoPanel.tsx
```

模組之間應保持低耦合。

特別注意：
- MapLibre instance 不應由多個 React component 重複建立。
- Data Manager 不應直接操作 React UI。
- Interaction State 不應直接依賴 Projection。
- Projection Controller 不應負責重新載入資料。
- LOD Controller 不應自行產生不同版本的 Feature ID。

---

## 13. Implementation Phases

### Phase 1 — Repository Inspection

- 檢查現有專案。
- 確認 FGB Loader。
- 確認資料目錄。
- 建立 Git branch。
- 安裝 MapLibre GL JS。
- 建立基本 MapLibre React component。

### Phase 2 — Projection Proof of Concept

這是優先級最高的技術驗證。

使用少量 GeoJSON 測試：
- Globe rendering。
- Equirectangular rendering。
- Custom CRS。
- Horizontal world wrapping。
- Projection switching。
- Feature picking。
- Feature state persistence。

確認是否能使用同一個 MapLibre instance 完成所有功能。

如果不能，先整理限制與可行方案。

### Phase 3 — FGB Integration

- 整合現有 FlatGeobuf Loader。
- 載入日本 ADM0 / ADM1 / ADM2 測試資料。
- 建立 Feature ID。
- 驗證空間索引與 Range Request。
- 確保 2D / 3D 共用相同資料。

### Phase 4 — Interactive Layers

實作：
- Administrative Fill
- Administrative Boundary
- Hover
- Click
- Selected Feature
- Tooltip
- Feature Info Panel

### Phase 5 — Labels and Images

實作：
- Administrative Labels
- Label Anchor
- Image Markers
- Zoom-dependent visibility
- Collision handling

### Phase 6 — LOD

實作：
- ADM0 / ADM1 / ADM2
- Dynamic Loading
- Geometry LOD
- Administrative Hierarchy
- Zoom-dependent layer visibility

### Phase 7 — Performance and Validation

測試：
- 全球 ADM0
- 全球 ADM1 / ADM2
- 高精度日本行政區
- 大量 Polygon
- 大量 Labels
- Hover Performance
- Projection Switching
- Memory Usage

---

## 14. Acceptance Criteria

以下條件必須通過，才能視為完成第一階段。

### A. Projection

- [ ] 可以切換 2D 與 3D。
- [ ] 2D 使用 Equirectangular。
- [ ] 2D 支援水平 World Wrapping。
- [ ] 3D 使用 Globe。
- [ ] 兩種模式共用同一份向量資料。
- [ ] 不需要為兩種模式分別產生 Geometry。
- [ ] 切換模式不會重置互動狀態。

### B. Geographic Data

- [ ] 可以載入 FGB。
- [ ] 支援 Polygon。
- [ ] 支援 MultiPolygon。
- [ ] Feature ID 穩定。
- [ ] 支援行政區 Parent / Child 關係。
- [ ] 支援空間索引。
- [ ] 支援動態載入。

### C. Visual Rendering

- [ ] Polygon Fill。
- [ ] Boundary。
- [ ] Data-driven Styling。
- [ ] Hover Highlight。
- [ ] Selected Highlight。
- [ ] Administrative Labels。
- [ ] Image Markers。

### D. Interaction

- [ ] Hover 正確辨識 Feature。
- [ ] Click 正確辨識 Feature。
- [ ] Tooltip 正常。
- [ ] Information Panel 正常。
- [ ] 2D / 3D 互動結果一致。
- [ ] Projection Switching 後 Selected Feature 仍然存在。

### E. LOD

- [ ] 全球視角顯示 ADM0。
- [ ] 聚焦國家載入 ADM1。
- [ ] 聚焦行政區載入 ADM2。
- [ ] 高精度資料可以動態載入。
- [ ] Zoom Out 能恢復較低層級。
- [ ] LOD 切換不影響 Feature Identity。

---

## 15. Initial Demo Scenario

第一個 Demo 不需要載入全世界所有行政區。

請以日本作為測試區域。

使用資料：
- Japan ADM0
- Japan ADM1
- Japan ADM2

測試流程：

1. 開啟 2D 全球地圖。
2. 顯示日本國界。
3. Hover 日本，顯示 Highlight。
4. Click 日本，顯示資訊面板。
5. Zoom In，載入都道府縣。
6. Hover 靜岡縣。
7. Click 靜岡縣。
8. 顯示市町村。
9. Hover 濱松市。
10. 切換成 3D Globe。
11. 確認靜岡縣、市町村、著色、Label、圖片及選取狀態都正確。
12. 切回 2D，確認狀態仍然一致。
13. 水平移動地圖，測試 World Copies。
14. 測試日期變更線附近的 Polygon。

---

## 16. Out of Scope for Initial Implementation

第一階段不需要：

- Satellite Imagery
- Terrain
- 3D Buildings
- Real-time Traffic
- Weather Layers
- Routing
- Geocoding
- Backend Database
- User Authentication

優先把全球行政區向量資料、2D / 3D Projection、LOD、Picking 做好。

---

## 17. Expected Deliverables

完成後請提供：

1. 新 Git branch：`feat/maplibre-admin-globe`
2. 可執行的 InterGeo MapLibre 頁面。
3. 2D / 3D 切換 UI。
4. 日本 ADM0 / ADM1 / ADM2 測試資料整合。
5. Hover / Click / Highlight。
6. Label。
7. Image Marker。
8. Projection-independent interaction state。
9. FGB 載入流程。
10. 技術架構說明。
11. Projection / Custom CRS 的相容性與限制。
12. Performance Benchmark。
13. 尚未完成的項目與後續建議。

### 最重要的開發原則

不要只完成一個漂亮的 Globe Demo。

這個專案的核心是：

**One Geographic Dataset, One Feature Identity System, One Interaction Model, Multiple Projections.**

2D 與 3D 只是同一套地理資訊系統的兩種呈現方式。