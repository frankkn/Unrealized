# UNREALIZED · 人生存摺

> a Taiwanese life, in three generations

一款繁體中文的互動式人生選擇網頁遊戲。選出生年代與性別，從童年一路走到晚年，每個階段做一次選擇，最後翻開存摺，看看你蓋出了什麼樣的人生。

**核心命題：人生不只由你的選擇決定，還取決於你是哪一屆。**

**[▶ 開始遊玩](https://frankkn.github.io/Unrealized/)**

---

## 玩法

1. 選擇出生年代（1975 / 1990 / 2005）與性別
2. 從第 0 章（家庭起點）走到第 7 章（五十歲之後），每章做一次選擇
3. 五軸屬性（財務、成就、關係、健康、自我一致）全程對你隱藏，只在結局揭曉
4. 第 2 章起，隨時可以「就在這裡收尾，看看我的存摺」——中途收尾有自己的五個結局
5. 解到的結局會存進圖鑑，未解鎖的以剪影顯示

共 **28 個完整結局 + 5 個中途結局**。部分結局是世代限定——圖鑑本身就在講一件事：**有些結局你這輩子解不到，因為你的時代沒給你那個選項。**

## 設計理念

**沒有純加分的選擇。** 每個選項至少變動兩軸，其中至少一軸必須下降。這是整個遊戲的立場——人生沒有免費的選擇。（`dev/test-engine.js` 會掃過所有節點，強制執行這條鐵則。）

**毀滅結局必須可預防、有伏筆。** 健康在掉的時候，敘述會出現「你已經三年沒做健檢」這類暗示，但不顯示數值。車禍節點只在你選過「連續加班後騎車」或健康已經很差時才會出現——純隨機懲罰是不合格的設計。

**不寫自殺結局。** 就創作而言自殺也是偷懶的收尾——死亡把後果一次結清，玩家不用面對任何東西。真正痛的是活下來。所有財務崩潰類結局都往這個方向寫。

**`自我一致` 是最重要的一軸。** 它讓遊戲能做出「你什麼都有了，但那不是你要的」這種結局，比單純的成功／失敗有味道。

**世代互文。** 2005 世代的父母設定成 1990 世代。玩過 1990 再玩 2005 的人，會發現自己在扮演上一輪主角的小孩。

## 三個世代對照

| | 1975（民國64年生） | 1990（民國79年生） | 2005（民國94年生） |
|---|---|---|---|
| 童年 | 三代同住／眷村／農村 | 公寓、雙薪、鑰匙兒童 | 獨生子女，父母正好是1990那一代 |
| 升學 | 高中聯考、大學聯考，錄取率約三成 | 學測指考、錄取率破九成、學歷通膨 | 108課綱、學習歷程、考得上但學校可能倒 |
| 兵役（男） | 兩年 | 一年 | 四個月→2024恢復一年，正好卡到 |
| 出社會 | 1997亞洲金融風暴、台商西進、竹科起飛 | 22K、無薪假、太陽花 | AI衝擊、疫情世代、遠距常態 |
| 房子 | 還買得起（2003年前） | 眼睜睜看它漲走 | 已不在討論範圍 |
| 同婚 | 一輩子都在非法與汙名中 | 2019通過時29歲，剛好趕上 | 從小就知道這是合法的 |
| 演到 | 2025，50歲 | 2040，50歲 | 2055–2075，近未來推想 |

性別不開新支線，只改內容與門檻。第 3 章是最重要的一次分歧：男性進兵役節點，女性進「提早兩年」節點——**兩邊都不是好處，是不同的成本。**

## 技術

無建置流程。純 HTML + CSS + vanilla JS，直接開 `index.html` 就能玩，push 上 GitHub Pages 就能上線。無後端、無 API、無追蹤，localStorage 只用來存結局圖鑑與設定（可隨時清除）。

```
index.html              入口
css/style.css           全部樣式
js/engine.js            狀態機、屬性運算、結局判定
js/state.js             存檔／圖鑑（localStorage）
js/ui.js                DOM 操作、動畫、章節轉場
data/config.js          世代設定、詞彙字典、屬性定義
data/nodes-ch0-3.js     第 0–3 章節點
data/nodes-ch4-5.js     第 4–5 章節點
data/nodes-ch6-7.js     第 6–7 章節點
data/endings.js         全部結局
dev/test-engine.js      dev-only 自我檢查（不是遊戲的一部分）
```

內容與引擎分離——引擎完全不認識任何劇情內容，改劇本只動 `data/` 底下的檔案。

### 部署到 GitHub Pages

Settings → Pages → Source 選 `Deploy from a branch`，branch 選 `master` / 根目錄 `/`，存檔即可。repo 根目錄的 `.nojekyll` 會讓 Pages 跳過 Jekyll 處理。

### 開發驗證

```bash
node dev/test-engine.js
```

會檢查：所有選項是否違反「沒有純加分」鐵則、節點圖有無斷鏈或走不到的節點、第 0–3 章全枚舉是否都能通到第 4 章、隨機抽樣 4800 局是否都能正常判定結局、28 個完整結局是否每一個都真的可達（稀有結局用離線 beam search 找到的實際路徑重播驗證）、詞彙字典替換有無殘留佔位符。

少數稀有結局的條件範圍很窄（五軸都要落在中段、或某一軸要精準停在某個值），權重亂試找不到，`dev/test-engine.js` 裡直接寫死了幾條實際可行的路徑。**調整過數值平衡之後這些路徑會失效**，跑這個重新產生、貼回去即可：

```bash
node dev/find-paths.js        # 找不到時可加大 beam width：node dev/find-paths.js 3000
```

---

# UNREALIZED (English)

An interactive life-choice game in Traditional Chinese (Taiwanese usage). Pick a birth cohort and a gender, then walk from childhood to old age making one choice per chapter. At the end you open your "passbook" and see what kind of life you stamped into it.

**The premise: your life isn't shaped only by your choices — it's shaped by which cohort you were born into.**

**[▶ Play](https://frankkn.github.io/Unrealized/)**

The name is an accounting term (*unrealized gains and losses*) and also "possibilities never realized." It's the one word that lets the best ending and the worst ending share the same title.

### Design rules

- **No free choices.** Every option moves at least two of the five hidden stats, and at least one must go *down*. A dev-mode validator enforces this across every node.
- **Ruinous endings must be preventable and foreshadowed.** The narration hints ("you haven't had a health check in three years") without ever showing numbers. The car-accident node only fires if you earned the fatigue-driving flag or your health is already low — never as a random punishment.
- **No suicide endings.** Death settles every consequence at once; surviving is what actually hurts. Financial-collapse endings are written that way.
- **Some endings are cohort-locked.** The codex quietly makes its own argument: there are endings you will never unlock, because your era never offered you that option.

Three cohorts (born 1975 / 1990 / 2005) live through the same Taiwan thirty years apart — different entrance exams, different conscription lengths, different housing markets, and a same-sex marriage law that arrives too late, just in time, or before you were old enough to notice.

### Technical

No build step. Plain HTML + CSS + vanilla JS — open `index.html` locally or serve it from GitHub Pages. No backend, no API, no tracking. localStorage holds only the ending codex and settings, and can be cleared from inside the game. Content is fully separated from the engine: the engine knows nothing about the story, so rewriting the script only touches `data/`.

Run `node dev/test-engine.js` to validate node graph integrity, the no-free-choices rule, and that all 28 full endings are genuinely reachable.

---

## License

[MIT](LICENSE)
