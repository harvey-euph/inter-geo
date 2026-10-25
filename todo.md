# 豐富資訊卡內容 (我只會稍微提，幫我補完 context 和細節)

# Bug

- [ ] 現在在放大倍數 1x 或更大的時候螢幕的拖曳平移會明顯延遲，可能是我電腦的 CPU 太差，用手機或平板不會
- [ ] 不知道為什麼 漂浮資訊卡 在平板的時候會跑到左上方，手機的時候則符合預期在右上方

# Structure

- [ ] **多 repo 架構** 把檔案格式 (.fgb/.csv/.md) 都放到另一個 repo: `inter-geo-data`
    - fetch 直接抓 raw file
    - git push origin master 時 Action 自動整理索引，推到另一個 branch index，這個 branch 只存這檔案
    - 當我要知道要抓哪些檔案時，先去問 index 
    - 這樣就可以做到動態增刪檔案

- [ ] 重新設計 fgb 物件的組織架構方式、重新命名整理
    - 所有任何層級的 (Multi)Point / (Multi)LineString / (Multi)Polygon 都是一個存於 fgb file 的幾何物件，不要存名字以外的
    - 每個檔案只存同一個層級﹑類型的資料
    - 頁面啟動時會最先抓 `data/COUNTRY.fgb` 用來畫世界草圖和國家邊界，因此程式一定要讀完所有國家。
    - `data/COUNTRY.fgb` 裡面的物件都是國家，會用兩個字母作為標籤，例如 `JP`, `US`
    - 當 `data/COUNTRY.fgb` 裡面有物件 `XX` 就代表 "可能有" `data/XX.fgb` 存在，代表這個國家的第一級區域劃分
    - 可能會沒有檔案，這時候不能視為錯誤，因為這是預期行為，Google Street View 有 Coverage 我才有準備檔案，但也要為未來擴充保留空間，所以可能回傳空的 200 state 或有其他更好的做法，幫我想怎麼處理 response 符合 HTTP 協議
    - `data/XX.fgb` 會 on-demand requested，當用戶涉及任何需要看到 `XX` 國家內的行政區的行為就要去要
    - 同理，如果 `data/XX.fgb` 裡面有物件叫做 `YY`，可能會有 `data/XX/YY.fgb` 存有 `YY` 裡面的次級行政區，此行為目前只有兩層，但我要讓這件事變成不受限制，只要 `A.fgb` 檔案裡面有物件 `B` ，就有可能往下找到 `A/B.fgb` 來細分，方便擴充
    - 可能會有 `XX-ZZ.fgb` 代表 `XX` 的國界以外資訊，例如公路﹑鐵路﹑數據點散布圖﹑其他 covering info，會被其他地方呼叫到，例如 Layer，稍後提及。 

- [ ] 重新設計 Layer 的操作方式﹑編輯方式，目標是整合讓所有 filter 都能來自一個 csv file
    - csv 格式如下:
    ```
    // file-name.csv // 不用另外 id，直接用 file-name 來追縱，URL 找 layer 也直接放 `?layer=file-name`
    // @type=[Text, FillWithColor, Image]
    // @nameZh: 中文名字
    // @nameEn: Eng Name
    // @shortBadge: Short name
    // @default-color: [Text: 文字預設顏色, FillWithColor: 全局預設顏色(若無代表不改變背景顏色), Image: 無意義/不支援]
    // @descriptionZh: 中文說明

    FGBObject(例如 XX::YY), [Text(Text), FillWithColor(Color Code), Image(Path, local img file path or internet link)]

    ```
    - csv 範例如下:

    ```csv
    // country-code.csv
    // @id: calling-code
    // @order: 2 
    // @type: Text
    // @nameZh: 電話國碼
    // @nameEn: Calling Code
    // @shortBadge: 📞 國碼
    // @accentColor: #34d399
    // @descriptionZh: 顯示全球各國國際電話區號（如 +886、+81、+1、+44 等）
    
    // Asia
    TW, +886
    JP, +81
    KR, +82
    PH, +63
    TH, +66
    KH, +855
    ...
    ```

- [ ] 同理，對每個 Object 來說，都會有 "顯示在 hover 出現的 Infotip 和出現在右邊甚至可以全螢幕的 InfoCard 也要重新設計
    - Infotip
    - Info Card
        - 目前的設計有個問題，就是會每次需要先建立索引，我需要做得到點開某個 FGBObject 就自動 fetch list 並且開始下載


# Feature

- [ ] 接下來要讓 Info 可以根據使用者的喜好看到不同類型的資訊，比方說目前預設資訊大多為 Geoguessr 會想看的，日後希望可以更彈性，比方說如果我要讓滑雪的人來用，我就要有很多滑雪場資訊列在 Info 裡面等等

- [ ] L1_Name::L2_Name, L1_Name::L2_Name::L3_Name 的標示似乎目前只有部分區域有效 (URL 好像只有日本)，幫我讓全世界都依循這個方式標註地點，讓我可以在 Layer / URL / Info Card 都使用這一套來標出