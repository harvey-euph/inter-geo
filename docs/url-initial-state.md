# URL 初始化與分享

網址參數依優先層級初始化地圖。第一級只使用一個 `target`；它可以指定地圖物件，也可以指定圖層 ID。存在 `target` 時，第二級的地圖中心與倍率會忽略。

## 第一級：`target` 物件或圖層

### 物件

使用專案內部的 namespace 格式開啟物件資訊卡：

```text
?target=JP
?target=JP::47
```

- `JP`：日本國家資訊卡。
- `JP::47`：日本代碼 `47` 的一級行政區（沖繩）資訊卡。

`::` 表示 namespace 階層分隔符。

### 圖層

`target` 的值如果符合圖層 ID，就會啟用該圖層：

```text
?target=area-codes-JP
?target=indiaScripts
```

區域 CSV 圖層可用 `@focusTarget` 指定啟用時的地圖導引目標。格式沿用 `target` namespace；它只移動地圖，不會開啟物件資訊卡：

```csv
// @focusTarget: IN::TN
```

物件 namespace 與圖層 ID 共用 `target` 參數，因此網址只需指定一個目標，不需要同時重複提供 `target` 和 `layer`。舊的 `layer` query 不再用於初始化。

## 第二級：地圖中心與倍率

只有網址沒有 `target` 時，才讀取以下參數：

```text
?lat=25.033&lon=121.565&ratio=5
```

- `lat`：中心緯度。
- `lon`：中心經度。
- `ratio`：地圖縮放倍率 `k`。
- `lat` 和 `lon` 必須同時存在才會設定中心；`ratio` 可獨立設定。

地圖移動或縮放後會以 `history.replaceState` 將網址查詢參數替換成 `lat`、`lon` 和 `ratio`。因此 `target` 只用於初始化；同步網址時不會保留第一級或其他查詢參數，也不會為每次操作新增瀏覽紀錄。

重新整理頁面時會先清除所有 query 參數，因此重新載入會回到預設地圖；直接開啟分享網址仍會依上述規則初始化。
