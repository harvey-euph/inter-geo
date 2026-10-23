# 豐富資訊卡內容 (我只會稍微提，幫我補完 context 和細節)

- [x] 支援 image 路徑插入圖片，要能合理配置空間，控制圖片 size ，完成後將 "行人穿越道告示 (Pedestrian Crossing Sign)" 在資訊卡的內容統一成 md framework (原 l2 層級顯示 "國家行人穿越道告示 (Pedestrian Crossing Sign)" 可拔掉)

# 要修正
- [x] 將以下國家的 l2 資料放到 l3 去， l2 變成該國家本身，因為已經夠小了，l2 跑出更細的行政區沒有意義: 荷蘭 比利時 賴索托 史瓦帝尼 malta 以色列
- [x] 讓 filter 也像 lore 一樣，只更新個別 csv 檔案，就可以直接載入標籤/meta ，然後按需載入完整資訊，可以用 csv 前幾列註解作為 header / meta
- [x] 有些國家沒有 l3， hover 出現 l2 資訊 (符合預期) 但 clicked 不會彈出 l2 資訊卡 (須修正)
- [x] 資訊卡的回上一頁標籤直接置入路徑 (例如 🇨🇦 加拿大 > 魁北克 [<回上一頁>])