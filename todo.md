# 豐富資訊卡內容 (我只會稍微提，幫我補完 context 和細節)

# Bug

- [ ] 公路又壞掉了，該顯示的時候沒有顯示

# Feature

- [x] 我想整理一下區域/物件命名，統一用 C++ 的 namespace 格式，然後架構也要改
    - Object 是指所有可以被 Hover 得到 floating 小卡、 clicked 會跳出右方資訊卡的東西，可以是國家﹑公路﹑或是之後定義的 fgb 物件
    - vite.config.ts 進行編譯時先註冊 Object (fgb, 要有 reader 幫忙) 後註冊 Info (md), 和 Filters (csv)
    - 有個總表紀錄最上層 (國家)，如果要放在 US:: 底下的物件，會對應到 US.*.? 的檔案 (接受作為補充，例如 Interstate 就不會一開始就放在 l2 資料，讓資料擴充良好進行)
    - 這樣也可以把日本資料統一格式放進 fgb
    - 當我們在 filters/*.csv 或其他地方要描述區域或物件時，就要用 US::DC 代表華盛頓特區，同樣道理會有 US::I-70 放在 US-xxx.fgb 代表 I-70
    - 所以在 india-scripts.csv 裡面，印度的邦就要用 IN::TG 這樣描述，有別於 LK 和 BD 
    - 台灣的電力系統方格也變成物件收納