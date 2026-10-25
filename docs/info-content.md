# Info 內容與圖片

Info 卡片內容位於 `public/info/*.md`。每個一級 `#` 標題代表一個項目，標題下方可用 metadata 條列設定 `targets`、`tags`、圖片等內容；項目之間不使用 `---` 分隔。文章與圖層 CSV 會由 Vite 在建置時建立索引，瀏覽器透過 `BASE_URL` 從 `/info/` 和 `/layers/` 按需載入內容。

## 卡片主圖

`image` 可以是專案內 `public/` 下的圖片路徑，也可以是完整的 HTTP 或 HTTPS 圖片網址。外部圖片不會被打包進網站，瀏覽器會直接向該網址載入，因此可以放在 S3 或其他公開圖片服務。

```md
# 富士山滑雪區
- id: fuji-ski-area
- targets: JP-19
- tags: 滑雪, 日本
- image: https://example-bucket.s3.ap-northeast-1.amazonaws.com/fuji/ski-area.jpg
- imageAlt: 富士山附近的滑雪場
- imageSize: banner
- imagePosition: top
- display: false

- **雪季**：通常於冬季開放，實際日期依當年雪況與場方公告為準。
```

`display` 控制卡片初次顯示時是否展開：`true` 預設展開，`false` 預設收合。省略時預設收合；使用者仍可點擊標題切換狀態。

Object 情報側欄左邊框可直接拖曳調整整個面板寬度。標題列的「全寬」會讓面板延伸到地圖區域最左側，再按一次可還原原本寬度；這不會啟動瀏覽器全螢幕，也不會改變單張 Info card 的尺寸。

既有本機寫法仍可使用，例如 `- image: /images/crossing/de.svg`；路徑會依 Vite 的部署 base path 解析。`imageSize` 可使用 `sm`、`md`、`lg`、`xl`、`banner` 或像素值，`imagePosition` 可設為 `left`、`right` 或 `top`。

## 內文行內圖片

條列文字支援 `![替代文字|尺寸](圖片網址)` 語法，圖片網址同樣可使用完整的 HTTPS URL：

```md
- **雪場位置**：![滑雪場地圖|banner](https://cdn.example.org/maps/fuji-ski-area.png)
```

省略尺寸時使用預設小圖尺寸。S3 物件或其他遠端資源必須允許公開讀取，且網址需能直接回傳圖片內容；若使用限時簽名網址，簽名到期後圖片將無法載入。建議使用 HTTPS，避免網站以 HTTPS 部署時受到瀏覽器混合內容限制。
