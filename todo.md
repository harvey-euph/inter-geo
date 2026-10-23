# 豐富資訊卡內容 (我只會稍微提，幫我補完 context 和細節)

- [x] 支援 image 路徑插入圖片，要能合理配置空間，控制圖片 size ，完成後將 "行人穿越道告示 (Pedestrian Crossing Sign)" 在資訊卡的內容統一成 md framework (原 l2 層級顯示 "國家行人穿越道告示 (Pedestrian Crossing Sign)" 可拔掉)

# Bug

- [ ] 在 scripts/generate-l2-fgb.mjs 寫出 fgb 前過濾空幾何（你已有類似 geoArea 過濾，但空 ring 可能沒擋到）：

```ts
function hasUsableRing(geom) {
  if (!geom) return false;
  if (geom.type === 'Polygon') {
    return (geom.coordinates || []).some((r) => r && r.length >= 4);
  }
  if (geom.type === 'MultiPolygon') {
    return (geom.coordinates || []).some(
      (poly) => poly && poly.some((r) => r && r.length >= 4)
    );
  }
  return false;
}

// optimizedFeatures 寫檔前：
optimizedFeatures = optimizedFeatures.filter((f) => hasUsableRing(f.geometry));
```

- [ ] 展開/閉合資訊卡的時候會讓地圖產生一瞬間的橫向縮放，會導致螢幕閃一下，我希望螢幕不要出現這種現象


# Feature

- [ ] 點按左上角 icon 可以把 filter-legend-card 收納/展開
- [ ] 道路標線的著色都只畫 L1 區域 (國家層級) 就好，不用畫到 L2，邊界寬度可以稍微再寬一點
- [ ] 台灣電力座標的字母展示，字母不需要外圍圓圈，只要字母本身，並且隨著方框縮放跟著變大變小
