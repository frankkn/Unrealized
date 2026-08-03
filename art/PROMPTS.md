# 場景圖生成指南

49 張節點場景圖的 prompt。用任何生圖工具產完，命名成 `art/<節點ID>.webp` 丟進這個資料夾即可——**引擎會自動抓，沒有的就退回像素雕版**，所以可以一次做一張，不用等全部做完。

---

## 規格

| | |
|---|---|
| 檔名 | `art/<節點ID>.webp`（例：`art/n0_family.webp`）ID 就是下面每一節的標題 |
| 比例 | **3:4 直式**（832×1088 或 768×1024） |
| 格式 | WebP，品質 80。49 張控制在 15MB 內，repo 才不會腫 |
| 內容 | **畫面裡不要有任何文字**——字會蓋在圖上，圖裡再有字會打架 |
| 構圖 | 重要的東西放在**上半部**。下緣會被文字與選項壓住，底部三分之一會被漸層蓋掉 |

---

## 風格錨（每一則 prompt 都要接上這段）

一致性全靠這段。**不要每張改寫它**，否則 49 張會像 49 個不同的遊戲。

```
pixel art illustration, 16-bit JRPG background art style, detailed dithering,
limited palette with strong cinematic lighting, warm practical light sources
(street lamps, windows, neon signs) against deep blue shadow, soft glow bloom,
solitary figure seen from behind, small in frame, no facial features visible,
Taiwan setting, nostalgic and quiet mood, vertical 3:4 composition,
important elements in the upper two thirds, lower third kept dark and uncluttered but still fully painted scenery, no blank margins,
no text, no watermark, no UI elements
```

**負面提示**：`text, letters, watermark, signature, UI, HUD, face, close-up portrait, modern western city, cluttered composition`

### 怎麼讓 49 張看起來像同一個人畫的

49 張分開生，最大的風險是風格漂移。**先產一張你滿意的當基準，之後每一張都拿它當參考**：

| 工具 | 作法 |
|---|---|
| **Midjourney** | `--sref <基準圖網址>` 鎖風格，再加 `--sw 100` 調強度。`--ar 3:4`。這是目前最好用的一致性工具 |
| **Stable Diffusion 本機** | 固定 seed + 同一個 pixel-art LoRA + 同一組 sampler/steps。控制力最強，而且免費 |
| **Leonardo.ai** | 選 Pixel Art 模型，開 Image Guidance 指向基準圖 |
| **DALL·E / Bing** | 沒有風格參考功能，只能靠風格錨那段字。漂移會最明顯 |
| **Imagen / Gemini** | 上傳基準圖當參考再描述差異 |

**產圖順序也有差**：先產 `n0_family`（第一個節點，玩家第一眼看到的），滿意了再拿它當所有其他張的風格基準。不要先產第 7 章那些。

> 一天 3–5 張、分兩週產完是完全合理的節奏——引擎是漸進式載入，丟一張就多一張，不用等全部齊。

### 台灣感的關鍵字（依場景挑用）

不加這些的話，生出來會是通用的東亞城市，多半偏日本或中國。

`鐵皮屋 corrugated metal rooftops` · `騎樓 covered arcade walkway` · `機車 scooters parked in rows` · `台灣街屋 narrow tiled townhouse` · `鐵窗 window security grilles` · `眷村 military dependents village` · `檳榔攤 betel nut stand` · `便利商店 24h convenience store glow` · `宮廟 temple with red lanterns` · `水塔 rooftop water tanks` · `電線 tangled overhead power lines`

---

## 第 0–1 章

### n0_family — 家庭起點（0–10歲）
> 黃昏，台灣老式街屋前，鐵窗與水塔，屋內透出暖黃燈光，一個小孩背影站在門口。三代同堂的氣氛。
`dusk, old Taiwanese townhouse with window security grilles and rooftop water tanks, warm yellow light spilling from the doorway, small child seen from behind standing at the entrance, laundry hanging, quiet residential alley`

### n1_bookish — 國中 · 書香家庭
> 夜晚書桌，檯燈打在攤開的課本上，窗外是公寓夜色，一個國中生背影。
`night, a child's study desk under a single warm desk lamp, open textbooks and stacked reference books, apartment window showing blue night outside, student seen from behind, cramped but tidy room`

### n1_labor — 國中 · 勞動家庭
> 傍晚的小生意店面／工廠一角，鐵捲門半開，工具與紙箱，小孩在旁邊幫忙。
`late afternoon, small family workshop with half-open roller shutter, tools and cardboard boxes, fluorescent tube light, child seen from behind helping out, worn concrete floor`

### n1_single — 國中 · 單親
> 深夜公寓外觀，整棟只有一扇窗亮著。
`late night, exterior of an old apartment block, only one window lit warm yellow among many dark ones, scooters parked below, overhead power lines, lonely quiet street`

## 第 2–3 章

### n1_teacher — 那個老師
> 放學後的空教室，斜射的夕陽，講桌上一疊作業本。
`empty classroom after school in Taiwan, late golden light through louvred windows, a teacher's desk with stacked exercise books and a red pen, one student seen from behind standing in the doorway, chalk dust in the light, ceiling fan`

### n2_first_failure — 第一次真的失敗
> 夜裡的公佈欄，一張放榜名單，一個人站著不動。
`night, a school corridor noticeboard with a posted results list, one teenager seen from behind standing very still in front of it, single fluorescent tube overhead, the rest of the corridor dark, bicycle shed visible through the window`

### n3_first_money — 第一筆自己賺的錢
> 打烊後的店裡，暖燈，數著鈔票的背影。
`night, a small Taiwanese convenience store or eatery just after closing, warm light, one young person seen from behind counting bills at the counter, scooter parked outside, first wage`

### n2_high_school — 十五到十八
> 清晨校門口，制服學生的背影，圍牆與腳踏車棚。
`early morning, Taiwanese high school gate with concrete wall and bicycle shed, uniformed student seen from behind walking in, soft dawn light, banyan tree, quiet before the bell`

### n3_route — 十八到二十二
> 夜晚的分岔路口，一邊通往車站的燈，一邊通往住宅區的暗巷。
`night, a fork in the road, one path leading toward a lit railway station in the distance, the other into a dim residential lane, street lamp at the junction, young person seen from behind with a bag, stars overhead`

### n3m_military — 兵役
> 清晨營區，列隊的剪影，遠處旗桿。
`dawn, military base parade ground, silhouettes of soldiers in formation, flagpole, low mist, cold blue light with a sliver of sunrise, one figure seen from behind`

### n3f_headstart — 提早兩年
> 清晨的辦公室，第一個到的人打開燈。
`early morning office interior, one person seen from behind switching on the fluorescent lights, rows of empty desks, city visible through the window at sunrise, first one in`

### n3_first_love — 第一次認真的關係
> 夜晚河堤或校園，兩個人的背影隔著一點距離。
`night, riverside embankment path with distant city lights, two figures seen from behind sitting slightly apart, warm street lamp, summer air, quiet`

### n3_love_comingout — 要不要說
> 夜晚房間，門開了一條縫，走廊的光透進來。
`night, a bedroom door left slightly ajar with hallway light spilling through the gap, one person seen from behind sitting on the bed in the dark, phone screen glowing faintly, tense stillness`

## 第 4 章

### n4_job — 第一份工作
> 傍晚商業區街道，抬頭看著辦公大樓。
`dusk, business district street, glass office towers with lit windows, a young person seen from behind looking up, scooters and covered arcade walkway below, first day energy`

### n4_where — 在哪裡落腳
> 夜晚車站月台，行李箱，遠處的列車燈。
`night, railway platform with a suitcase, approaching train headlight in the distance, one person seen from behind waiting, station lamps, luggage, decision moment`

### n4f_interview — 面試裡的那個問題
> 會議室，桌子對面的剪影，百葉窗光。
`office meeting room interior, an interviewer silhouette across a table, venetian blind light stripes, one person seen from behind in a chair, formal and slightly cold atmosphere`

### n4_westward — 西進（1975）
> 港口貨櫃碼頭，起重機，準備出發。
`port container terminal at dawn, stacked shipping containers and cranes, one person seen from behind with a suitcase, cargo ship in the background, 1990s industrial atmosphere`

### n4_22k — 22K（1990）
> 深夜便利商店外，看著薪資單。
`late night outside a 24h convenience store, its white fluorescent glow spilling onto wet pavement, one person seen from behind holding a paper slip, scooters parked, empty street`

### n4_replaced — 被取代（2005）
> 夜晚的桌前，螢幕的冷光是唯一光源。
`night, desk lit only by the cold blue glow of a monitor, one person seen from behind, dark room, floating interface glow reflecting on the wall, quiet displacement`

### n4_mlm — 改變人生的機會
> 廉價會議廳，講台上的人，台下坐滿。
`rented seminar hall interior, a speaker on a small stage under harsh spotlight, rows of seated attendees seen from behind, folding chairs, banner without text, uneasy enthusiasm`

## 第 5 章

### n5_career_move — 職涯的一次大波動
> 辦公大樓的樓梯間，往上看。
`office building stairwell, looking upward through the spiral of railings, one person seen from behind climbing, cold institutional lighting with one warm window`

### n5_marriage — 要不要進入婚姻
> 婚宴場地外，紅色燈籠與圓桌，或戶政事務所走廊。
`evening, Taiwanese banquet hall entrance with red lanterns and round tables visible inside, one couple seen from behind at the doorway, warm celebratory light, slight hesitation`

### n5_children — 有沒有孩子
> 夜裡的房間，一張空著的嬰兒床，窗外街燈。
`night, a quiet bedroom with an empty crib, moonlight and street lamp glow through the curtain, one person seen from behind standing in the doorway, undecided stillness`

### n5_house — 房子
> 黃昏的新建案工地或預售屋看板前。
`dusk, standing before a residential construction site with cranes and a sales banner, one person seen from behind, scooters and betel nut stand nearby, aspirational and heavy`

### n5_invest — 那筆存款
> 夜晚，螢幕上的線圖照亮房間。
`night, a dim room lit by a stock chart glowing on a screen, one person seen from behind, cigarette smoke or steam from a cup, tense quiet`

### n5_parents_ill — 長輩病了
> 醫院走廊，病房門半開，夜班的燈。
`hospital corridor at night, half-open ward door with warm light inside, one person seen from behind standing in the hallway, IV stand silhouette, institutional green-blue tint`

### n5_body_signal — 身體的訊號
> 健檢中心走廊，冷白燈光，等待的人。
`health screening centre waiting corridor, cold white lighting, one person seen from behind sitting alone on a row of chairs, frosted glass doors, clinical and quiet`

### n5_overwork — 超支的日子
> 深夜辦公室，整層只有一盞燈亮著。
`very late night office floor, only one desk lamp lit among rows of dark cubicles, one person seen from behind at the desk, city night through floor-to-ceiling window, exhaustion`

### n5_accident — 那場車禍
> 雨夜街口，機車倒在地上，路燈與反光。
`rainy night intersection, a fallen scooter on wet asphalt reflecting street lamp light, no people visible in frame, scattered belongings, red and amber light bleeding across the puddles`

### n5_debt — 算不過來的那筆錢
> 深夜餐桌，攤開的帳單，一盞吊燈。
`late night, kitchen table under a single hanging bulb, spread of bills and a calculator, one person seen from behind hunched over, rest of the room in darkness`

### n5_era_storm — 那一場風暴
> 颱風夜的街道，招牌被吹歪，鐵皮翻飛。
`typhoon night street, bent shop signs and rattling corrugated metal, rain sheeting under street lamps, one person seen from behind bracing against the wind, power lines swinging`

### n5_emigrate — 要不要移民
> 機場出境大廳，行李推車，落地窗外的飛機。
`airport departure hall at dawn, luggage trolley, aircraft visible through the floor-to-ceiling window, a small family seen from behind, wide empty polished floor, threshold feeling`

## 第 6 章

### n6_career_plateau — 事業高原
> 辦公室窗前，看著更高的樓。
`office interior at dusk, one person seen from behind standing at the window looking at taller buildings across the street, blinds casting stripes, stalled feeling`

### n6_midlife_unemployment — 中年失業
> 傍晚，抱著紙箱走出大樓。
`late afternoon, a person seen from behind carrying a cardboard box of belongings out of an office building lobby, long shadow, glass revolving door reflecting orange sky`

### n6_parenting — 教養
> 夜晚客廳，大人與孩子隔著一張桌子。
`night living room, a parent and a child seen from behind sitting at opposite ends of a table, homework spread out, warm ceiling light, tension in the posture`

### n6_long_term_care — 長照黑洞
> 清晨的房間，輪椅停在窗邊。
`early morning bedroom, an empty wheelchair beside the window, one caregiver seen from behind opening the curtain, medical supplies on a side table, tired blue-grey light`

### n6_marriage_crisis — 婚變
> 夜晚客廳，兩張沙發之間的距離。
`night living room, two people seen from behind sitting on opposite ends of a sofa with visible space between them, television glow, unspoken distance`

### n6_politics — 餐桌上的戰場
> 年夜飯的圓桌，一半的人轉開身。
`family reunion dinner around a round table, seen from behind over one person's shoulder, half the table turned away mid-argument, red lanterns and dishes, warm light gone cold`

### n6_financial_reckoning — 財務盤點
> 深夜書房，攤開的存摺與帳本。
`late night home study, passbooks and ledgers spread under a desk lamp, one person seen from behind with a calculator, everything else dark, reckoning`

### n6_health_reckoning — 健康清算
> 診間，燈箱上的片子，醫生的剪影。
`clinic consultation room, x-ray films glowing on a light box, doctor silhouette, one patient seen from behind, cold clinical light, the moment before the verdict`

### n6_return_home — 返鄉
> 黃昏的老家門口，鐵門與盆栽。
`dusk, the entrance of an old family house in a small town, metal gate and potted plants, one adult seen from behind about to enter, swallows' nest under the eave, homecoming`

### n6_readjust — 重新調整
> 清晨的陽台，晾衣桿與遠山。
`early morning balcony, laundry poles and distant mountains, one person seen from behind holding a cup, city waking below, calm reassessment`

### n6_parent_dies — 那通電話
> 清晨四點的走廊，手機亮著，門半開。
`4am hospital corridor in Taiwan, one adult seen from behind standing still, a lit phone screen in their hand, a half-open door further down, fluorescent tubes reflecting on the floor, nobody else awake`

## 第 7 章

### n7_retirement_prep — 退休準備
> 銀行櫃檯或家中桌前，攤開的存摺。
`bank counter interior at midday, one older person seen from behind at the window, passbook on the counter, institutional quiet, soft daylight`

### n7_children_settlement — 與孩子的關係結算
> 傍晚客廳，桌上一支沒響的電話。
`late afternoon living room, an old landline telephone on a side table, one older person seen from behind sitting in an armchair, framed photos on the wall, waiting`

### n7_scam_call — 詐騙電話
> 夜晚客廳，話筒貼著耳朵，屋裡只有電視的光。
`night living room, an older person seen from behind holding a telephone receiver to their ear, only the television glow lighting the room, unease`

### n7_solo_aging — 老後獨居
> 清晨的公寓，一張椅子，一扇窗。
`early morning apartment interior, a single armchair by the window, dust in the light beam, one older person seen from behind, plants on the sill, spare and quiet`

### n7_body_ledger — 身體的餘額
> 黃昏公園，長椅與拉長的影子。
`dusk park, an empty bench and long shadows, one older person seen from behind walking slowly with a cane, banyan tree, golden hour`

### n7_look_back — 回望
> 夜晚窗邊，整座城市的燈。
`night, an older person seen from behind at a window looking out over the whole lit city, reflection faintly in the glass, calm and final, the last page`

---

## 產完之後

```bash
npm test          # 會檢查有圖的節點 ID 都對得上
```

`dev/art-sheet.html` 會把已經放進來的場景圖跟還沒換掉的雕版一起排出來，一眼看得出還缺哪幾張。

> **命名打錯不會報錯，只會安靜地沿用雕版。** 節點 ID 一定要跟上面的標題完全一致。
