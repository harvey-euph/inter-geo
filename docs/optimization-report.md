# 優化待辦（2026-10-24）

這份文件對的是目前 `~/inter-geo` 的程式，不是 README。`docs/optimization_report.md` 描述的是更早的 `WorldMap`（約 4,500 行、L2 在主執行緒解碼、單一 754 KB 套件）。那份報告裡的多數項目已經做完，下面「不要重做」有對照。

範圍只限三件事：程式整潔、前端延遲、記憶體。資料產生腳本（`scripts/generate-*.mjs`）不在這份清單裡。

## 現況

地圖是一張 Canvas 2D。投影是 `d3-geo` 的 Web Mercator，畫布座標 1000×1000（`src/map/geo.ts`）。平移與縮放放在 `transformRef`，`requestRender()` 把繪製收成一幀。

| 層級 | 何時用到 | 磁碟 |
| --- | --- | --- |
| L1 國家 | 啟動就畫 | `countries-110m.fgb`，0.2 MB |
| L2 一級行政區 | 描邊約 `k ≥ 1.8`，點選約 `k ≥ 6` | 91 個檔，5.9 MB |
| L3 二級行政區 | 預設關（`l3Threshold` 是 `Infinity`） | 357 個檔，59.3 MB |
| 道路 | 全國道路濾鏡打開後，視窗內才抓 | 176 個檔，10.8 MB |

`WorldMap.tsx` 現在約 2,360 行。繪製在 `src/map/render/renderLayers.ts`，點擊測試在 `src/map/hitTest.ts`，解碼在 `src/map/geoDecode.worker.ts`。

## 不要重做

這些在舊報告裡是紅燈，現在的程式已經是這樣：

- L1 解完就 `setLoading(false)`，91 個 L2 改由 `streamAllL2InBackground()` 在 worker pool 裡解。主執行緒只做 `new Path2D`。
- `requestRender()` 用一個 `requestAnimationFrame` 合併繪製。滾輪不再同步呼叫 `renderCanvas()`。`scheduleZoomKState` 把 `setZoomK` 收到一幀。
- 懸停狀態在 `WorldMap` 裡面。`Header`、`FilterBar`、`CountryDetailPanel`、`MapTooltip`、`MapLegend`、`MapControls`、`PrecisionHUD` 都有 `React.memo`。選取用的 handler 是 `useCallback`。
- 滾輪是原生 `addEventListener('wheel', …, { passive: false })`。
- 徽章文字寬度有 `badgeWidthCache`，`measureText` 每個字串只跑一次。
- `CountryDetailPanel` 與 `QuizModal` 是 `React.lazy`。Vite 把 `vendor`、`manifests`、`geo-data` 拆開。
- `world-atlas`、`topojson-*` 在 `devDependencies`，只給產生腳本用。
- 日本不再有獨立的 `selectedPrefecture`。都道府縣走一般 L2，內容從 `getJapanPrefecture()` 補進同一張情報卡。

## 延遲

### 1. 啟動仍解完全部 L2

`streamAllL2InBackground` 以 8 條並行抓完全部 91 個檔（5.9 MB）。每個國家在 worker 裡投影、溶出國界，主執行緒再建成三份幾何：每個行政區一條 `Path2D`、一條 `countryPath.addPath` 合併路徑、一條溶出外框。

個別行政區要到 L2 點選（`k ≥ 6`）才用。溶出外框要到 `k ≥ 1.8` 才拿來描國界。預設視圖 `k` 約為 1，這些都還沒被畫。

做法：每個國家延到縮放跨過 1.8，或包圍盒靠近視窗時再抓。`Path2D` 拆到後續幾幀建立，避免好幾個國家同一時刻從 worker 回來時把主執行緒卡住。

### 2. 滾輪每次事件都做完整視窗掃描

繪製已經收成一幀，但 `onWheel` 仍直接呼叫 `syncAllViewports`（`WorldMap.tsx` 滾輪處理）。觸控板一幀可以丟出幾十次。每次會走 L3 清單、176 個道路國家、以及全國濾鏡列表。

平移已經把區域濾鏡同步限制在 200 ms 一次，而且平移途中不掃道路與 L3。滾輪應該放進同一個節流，並跟繪製那一幀放在一起。

### 3. 道路點擊測試是線性掃描

懸停已收成一幀一次，國家包圍盒有先剔除。盒子裡面每一條已載入道路仍跑 `isPointInStroke`。美國這種大路網載入之後會明顯。用道路包圍盒做一層粗網格，先縮小候選再做 stroke 測試。一級行政區的數量少，維持現在的包圍盒加 `isPointInPath` 即可。

### 4. 選取與懸停外框用 `shadowBlur`

`renderLayers.ts` 的高亮層對整條國界或整條路呼叫 `shadowBlur`（約 8–12 px）。平移時只要畫面上留著選取，每一幀都會重畫這層。改成底下一条寬的半透明描邊、上面一條細實線，外觀接近，大國（俄羅斯、加拿大、美國）便宜很多。

### 5. 較小的兩項

- `renderCanvas` 與 `hitTestMapFeature` 每一幀都再呼叫 `getContext('2d')`。把 context 存進 ref。
- `WorldMap.tsx` 在主執行緒 `import * as flatgeobuf`，只用來解那份 0.2 MB 的 L1。L1 改走現有的 `decodeGeo()`，主套件就不需要這套函式庫。worker 裡已經有一份。

## 記憶體

### 1. L2 幾何留三份，而且不釋放

每個國家同時留著逐行政區 `Path2D`、合併路徑、溶出外框。L2 填色和描邊用的是合併路徑。逐行政區路徑只在指標進入某一個區、以及點擊測試時需要。合併路徑和溶出外框留著，單一行政區的路徑等指標進去再建。

這 91 國目前是啟動後一直留到分頁關掉。若改成視窗附近才載入，離開視窗的國家也可以放掉。

### 2. L3 與道路載入後不釋放，道路還存兩份

`loadedL3PacksRef` 只會 `add`，沒有 `delete`。L3 預設是關的，所以平常不大。有人把 HUD 的 L3 門檻打開並在地圖上移動之後，59 MB 的分區會累積在記憶體裡。

道路同樣只進不出。每個國家除了每條路自己的 `Path2D`（給點擊測試與高亮），還有 `interstatesPath2D` 與 `usRoutesPath2D` 兩條合併路徑（給整網描邊）。以視窗為鍵做 LRU：離開視窗一段時間的國家把 pack 與 `Path2D` 丟掉，再進來時重抓。

### 3. 啟動就解析用不到的清單

`WorldMap` 靜態 import `l3Manifest.ts`（約 5,600 行）和 `roadsManifest.ts`（約 2,100 行）。L3 預設關、道路要等濾鏡打開才抓檔，這兩份清單仍在第一次載入時被解析。改成 HUD 打開 L3、或某條 `roads-*` 濾鏡打開時再 `import()`。

`countries.ts`（約 3,000 行）要留著。搜尋列和地圖一開始都讀它。

### 4. 畫布上面的 `backdrop-filter`

`App.css` 有七處模糊，疊在每一幀平移都會重畫的畫布上：`.filter-bar-container`、`.map-tooltip`、`.map-control-btn`、濾鏡選擇窗、`.filter-legend-card`、`.modal-overlay`、`.precision-hud`。瀏覽器每一幀都要重新模糊這些層。HUD 與控制按鈕改成已經夠深的半透明填色。Tooltip 與 modal 出現時間短，可以最後再動。

## 程式整潔

### 1. 兩套道路開關，其中一套永遠是關的

`App` 的 `showInterstates` 與 `showNumberedRoutes` 初始是 `false`，介面上沒有東西去切它們。`WorldMap` 的 props 有 `onToggleInterstates`、`onToggleNumberedRoutes`，元件沒有讀這兩個 callback。

真正打開道路的是全國濾鏡，id 像 `roads-US-interstates`、`roads-DE-autobahn`。`isCountryRoadClassActive` 卻還在找 `us-interstates`、`us-numbered-routes`，並用 `id.includes('autobahn' | 'expressway' | …)` 猜等級。濾鏡物件上已經有 `roadClass`。

另外一個 effect 每次都用 `showRoads` 呼叫 `syncRoadsViewport`。`showRoads` 一直是 `false`，所以這次呼叫會把可見道路集合清掉。真正把集合填上的是濾鏡那個 effect。刪掉這組開關，道路只留「濾鏡 id → `roadClass`」一條路。

### 2. 轉出口的空殼

- `src/data/regionalFilters.ts` 只是把 `nationwideFilters` 再 export 一次。
- `src/data/internationalFilters.ts` 把 `globalFilters` 的文字濾鏡改名再送出。圖片濾鏡定義可以留在原檔，或跟 `globalFilters` 放一起。

### 3. 測驗彈窗沒有入口

`QuizModal` 有做 lazy load。`App` 的 `isQuizOpen` 只會被設成 `false`。`Header` 接受 `onOpenQuiz`，`App` 沒有傳。要做就接上按鈕，不做就把 modal、樣式與 `isQuizOpen` 刪掉。

### 4. 四個互斥的選取槽

`selectedCountry`、`selectedSubdivision`、`selectedMunicipality`、`selectedRoad` 每次選一個都要把另外三個清掉。日本的第五個槽已經移除。收成一個判別聯合（`country | subdivision | municipality | road | null`）之後，點選、返回、關閉情報卡只改一處。

### 5. 情報卡裡的道路說明是寫死的文章

`CountryDetailPanel.tsx` 約 1,190 行。道路那一段把美國州際公路與各國編號規則直接寫在元件裡。側欄已經會渲染 `src/content/lore/*.md`。這些規則搬進 lore 之後，元件只負責查詢與排版。

### 6. `WorldMap.tsx` 還可以再拆，但這不是延遲項目

載入器（L1 / L2 / L3 / 道路）和指標事件（拖曳、雙指、滾輪、懸停）仍在同一個檔。拆出去是為了讀得動，幀時間不會因為拆檔變短。

## 不值得再動

L2 繪製已經是一個國家一次填色、一次描邊。L2 的世界複本限制在兩份。小於一個像素的形狀會跳過。這層迴圈不是現在的熱點。

worker pool 大小（最多 4）與 L2 並行數 8 的搭配夠用。先減少「啟動就抓 91 國」，再考慮調這兩個數字。

## 建議順序

1. 刪掉永遠關閉的道路開關，道路等級改讀 `roadClass`。改動小，也去掉一條會把可見道路清掉的路徑。
2. 滾輪的 `syncAllViewports` 收到跟平移一樣的 200 ms 節流。
3. L2 改成靠近視窗或 `k ≥ 1.8` 才載入，並少建一份逐行政區 `Path2D`。
4. `l3Manifest` 與 `roadsManifest` 改成用到才 `import()`。L3 與道路加 LRU。
5. 高亮拿掉 `shadowBlur`。HUD 拿掉 `backdrop-filter`。
6. 選取收成一個狀態。道路說明搬進 lore。刪掉或接上 `QuizModal`。
