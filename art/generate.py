"""
產生 51 張節點場景圖。

用法：
    1. 到 https://aistudio.google.com/apikey 產一把 key
    2. 在 art/.env 寫一行：  GEMINI_API_KEY=你的key
       （art/.env 已經在 .gitignore 裡，不會被 commit）
    3. python art/generate.py            # 產全部還沒有的
       python art/generate.py n0_family  # 只產指定的幾張

已經存在的檔案會跳過，所以中斷之後直接重跑就好。
節點 ID 直接從 data/nodes-*.js 讀出來比對，打錯字會在開始前就擋下來，
不會等到遊戲裡才發現某個節點默默沿用雕版。
"""
import io
import os
import re
import sys
import time

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(ROOT, "art")

# Imagen 系列（generate_images / predict）對新申請的 API key 已經全面關閉，
# 錯誤訊息是「no longer available to new users」，換名稱沒有用。
# 現在的路是 Gemini 原生圖像模型，走 generate_content，由便宜往貴排。
MODELS = [
    "gemini-3.1-flash-lite-image",
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image",
    "gemini-3-pro-image",
]

STYLE_ANCHOR = (
    ", pixel art illustration, 16-bit JRPG background art style, detailed dithering, "
    "limited palette with strong cinematic lighting, warm practical light sources "
    "(street lamps, windows, neon signs) against deep blue shadow, soft glow bloom, "
    "solitary figure seen from behind, small in frame, no facial features visible, "
    "Taiwan setting, nostalgic and quiet mood, vertical 3:4 composition, "
    "important elements in the upper two thirds, lower third kept dark and uncluttered but still fully painted scenery, no blank margins, "
    "no text, no watermark, no UI elements"
)

NODES = {
    "n0_family": "dusk, old Taiwanese townhouse with window security grilles and rooftop water tanks, warm yellow light spilling from the doorway, small child seen from behind standing at the entrance, laundry hanging, quiet residential alley",
    "n1_bookish": "night, a child's study desk under a single warm desk lamp, open textbooks and stacked reference books, apartment window showing blue night outside, student seen from behind, cramped but tidy room",
    "n1_labor": "late afternoon, small family workshop with half-open roller shutter, tools and cardboard boxes, fluorescent tube light, child seen from behind helping out, worn concrete floor",
    "n1_single": "late night, exterior of an old apartment block, only one window lit warm yellow among many dark ones, scooters parked below, overhead power lines, lonely quiet street",
    "n1_teacher": "empty classroom after school in Taiwan, late golden light through louvred windows, a teacher's desk with stacked exercise books and a red pen, one student seen from behind standing in the doorway, chalk dust in the light, ceiling fan",
    "n2_first_failure": "night, a school corridor noticeboard with a posted results list, one teenager seen from behind standing very still in front of it, single fluorescent tube overhead, the rest of the corridor dark, bicycle shed visible through the window",
    "n3_the_friends": "night, a Taiwanese roadside eatery with plastic stools and a strip light, four or five young people seen from behind crowded around one small table, scooters parked at the kerb, steam, easy noise",
    "n3_first_money": "night, a small Taiwanese convenience store or eatery just after closing, warm light, one young person seen from behind counting bills at the counter, scooter parked outside, first wage",
    "n2_high_school": "early morning, Taiwanese high school gate with concrete wall and bicycle shed, uniformed student seen from behind walking in, soft dawn light, banyan tree, quiet before the bell",
    "n3_route": "night, a fork in the road, one path leading toward a lit railway station in the distance, the other into a dim residential lane, street lamp at the junction, young person seen from behind with a bag, stars overhead",
    "n3m_military": "dawn, military base parade ground, silhouettes of soldiers in formation, flagpole, low mist, cold blue light with a sliver of sunrise, one figure seen from behind",
    "n3f_headstart": "early morning office interior, one person seen from behind switching on the fluorescent lights, rows of empty desks, city visible through the window at sunrise, first one in",
    "n3_first_love": "night, riverside embankment path with distant city lights, two figures seen from behind sitting slightly apart, warm street lamp, summer air, quiet",
    "n3_love_comingout": "night, a bedroom door left slightly ajar with hallway light spilling through the gap, one person seen from behind sitting on the bed in the dark, phone screen glowing faintly, tense stillness",
    "n4_job": "dusk, business district street, glass office towers with lit windows, a young person seen from behind looking up, scooters and covered arcade walkway below, first day energy",
    "n4_where": "night, railway platform with a suitcase, approaching train headlight in the distance, one person seen from behind waiting, station lamps, luggage, decision moment",
    "n4f_interview": "office meeting room interior, an interviewer silhouette across a table, venetian blind light stripes, one person seen from behind in a chair, formal and slightly cold atmosphere",
    "n4_westward": "port container terminal at dawn, stacked shipping containers and cranes, one person seen from behind with a suitcase, cargo ship in the background, 1990s industrial atmosphere",
    "n4_22k": "late night outside a 24h convenience store, its white fluorescent glow spilling onto wet pavement, one person seen from behind holding a paper slip, scooters parked, empty street",
    "n4_replaced": "night, desk lit only by the cold blue glow of a monitor, one person seen from behind, dark room, floating interface glow reflecting on the wall, quiet displacement",
    "n4_mlm": "rented seminar hall interior, a speaker on a small stage under harsh spotlight, rows of seated attendees seen from behind, folding chairs, banner without text, uneasy enthusiasm",
    "n5_career_move": "office building stairwell, looking upward through the spiral of railings, one person seen from behind climbing, cold institutional lighting with one warm window",
    "n5_marriage": "evening, Taiwanese banquet hall entrance with red lanterns and round tables visible inside, one couple seen from behind at the doorway, warm celebratory light, slight hesitation",
    "n5_children": "night, a quiet bedroom with an empty crib, moonlight and street lamp glow through the curtain, one person seen from behind standing in the doorway, undecided stillness",
    "n5_house": "dusk, standing before a residential construction site with cranes and a sales banner, one person seen from behind, scooters and betel nut stand nearby, aspirational and heavy",
    "n5_invest": "night, a dim room lit by a stock chart glowing on a screen, one person seen from behind, cigarette smoke or steam from a cup, tense quiet",
    "n5_parents_ill": "hospital corridor at night, half-open ward door with warm light inside, one person seen from behind standing in the hallway, IV stand silhouette, institutional green-blue tint",
    "n5_body_signal": "health screening centre waiting corridor, cold white lighting, one person seen from behind sitting alone on a row of chairs, frosted glass doors, clinical and quiet",
    "n5_overwork": "very late night office floor, only one desk lamp lit among rows of dark cubicles, one person seen from behind at the desk, city night through floor-to-ceiling window, exhaustion",
    "n5_accident": "rainy night intersection, a fallen scooter on wet asphalt reflecting street lamp light, no people visible in frame, scattered belongings, red and amber light bleeding across the puddles",
    "n5_debt": "late night, kitchen table under a single hanging bulb, spread of bills and a calculator, one person seen from behind hunched over, rest of the room in darkness",
    "n5_era_storm": "typhoon night street, bent shop signs and rattling corrugated metal, rain sheeting under street lamps, one person seen from behind bracing against the wind, power lines swinging",
    "n5_emigrate": "airport departure hall at dawn, luggage trolley, aircraft visible through the floor-to-ceiling window, a small family seen from behind, wide empty polished floor, threshold feeling",
    "n6_career_plateau": "office interior at dusk, one person seen from behind standing at the window looking at taller buildings across the street, blinds casting stripes, stalled feeling",
    "n6_midlife_unemployment": "late afternoon, a person seen from behind carrying a cardboard box of belongings out of an office building lobby, long shadow, glass revolving door reflecting orange sky",
    "n6_parenting": "night living room, a parent and a child seen from behind sitting at opposite ends of a table, homework spread out, warm ceiling light, tension in the posture",
    "n6_long_term_care": "early morning bedroom, an empty wheelchair beside the window, one caregiver seen from behind opening the curtain, medical supplies on a side table, tired blue-grey light",
    "n6_marriage_crisis": "night living room, two people seen from behind sitting on opposite ends of a sofa with visible space between them, television glow, unspoken distance",
    "n6_politics": "family reunion dinner around a round table, seen from behind over one person's shoulder, half the table turned away mid-argument, red lanterns and dishes, warm light gone cold",
    "n6_financial_reckoning": "late night home study, passbooks and ledgers spread under a desk lamp, one person seen from behind with a calculator, everything else dark, reckoning",
    "n6_health_reckoning": "clinic consultation room, x-ray films glowing on a light box, doctor silhouette, one patient seen from behind, cold clinical light, the moment before the verdict",
    "n6_return_home": "dusk, the entrance of an old family house in a small town, metal gate and potted plants, one adult seen from behind about to enter, swallows' nest under the eave, homecoming",
    "n6_readjust": "early morning balcony, laundry poles and distant mountains, one person seen from behind holding a cup, city waking below, calm reassessment",
    "n6_old_friend": "night, a balcony of an apartment block, one adult in their forties seen from behind holding a phone to their ear, city lights below, laundry drying beside them, the call going on longer than expected",
    "n6_parent_dies": "4am hospital corridor in Taiwan, one adult seen from behind standing still, a lit phone screen in their hand, a half-open door further down the corridor, fluorescent tubes reflecting on the polished floor, nobody else awake",
    "n7_retirement_prep": "bank counter interior at midday, one older person seen from behind at the window, passbook on the counter, institutional quiet, soft daylight",
    "n7_children_settlement": "late afternoon living room, an old landline telephone on a side table, one older person seen from behind sitting in an armchair, framed photos on the wall, waiting",
    "n7_scam_call": "night living room, an older person seen from behind holding a telephone receiver to their ear, only the television glow lighting the room, unease",
    "n7_solo_aging": "early morning apartment interior, a single armchair by the window, dust in the light beam, one older person seen from behind, plants on the sill, spare and quiet",
    "n7_body_ledger": "dusk park, an empty bench and long shadows, one older person seen from behind walking slowly with a cane, banyan tree, golden hour",
    "n7_look_back": "night, an older person seen from behind at a window looking out over the whole lit city, reflection faintly in the glass, calm and final, the last page",
}


def load_key():
    """從環境變數或 art/.env 讀 key。key 不會被印出來。"""
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key:
        return key.strip()
    env_path = os.path.join(ART_DIR, ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line.startswith("GEMINI_API_KEY=") or line.startswith("GOOGLE_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def real_node_ids():
    """從 data/nodes-*.js 撈出真正的節點 ID，用來擋打錯字。"""
    ids = set()
    for name in ("nodes-ch0-3.js", "nodes-ch4-5.js", "nodes-ch6-7.js"):
        path = os.path.join(ROOT, "data", name)
        src = open(path, encoding="utf-8").read()
        ids.update(re.findall(r"^\s{4}(n[\w]+):\s*\{", src, re.M))
    return ids


def main():
    wanted = [a for a in sys.argv[1:] if not a.startswith("-")]

    real = real_node_ids()
    if real:
        stray = sorted(set(NODES) - real)
        missing = sorted(real - set(NODES))
        if stray:
            sys.exit("這些 ID 對不上任何節點（多半是打錯字，產出來也不會被用到）：" + ", ".join(stray))
        if missing:
            print("提醒：這些節點還沒有 prompt：" + ", ".join(missing))

    if wanted:
        unknown = [w for w in wanted if w not in NODES]
        if unknown:
            sys.exit("不認得這些節點：" + ", ".join(unknown))
        targets = wanted
    else:
        targets = list(NODES)

    todo = [t for t in targets if not os.path.exists(os.path.join(ART_DIR, t + ".webp"))]
    skipped = len(targets) - len(todo)
    if skipped:
        print(f"已存在，跳過 {skipped} 張")
    if not todo:
        print("沒有需要產的圖。")
        return

    key = load_key()
    if not key:
        sys.exit(
            "找不到 API key。到 https://aistudio.google.com/apikey 產一把，\n"
            "然後在 art/.env 寫一行：GEMINI_API_KEY=你的key\n"
            "（art/.env 已在 .gitignore，不會被 commit）"
        )

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=key)

    model = None
    ok = fail = 0
    for i, node_id in enumerate(todo, 1):
        out = os.path.join(ART_DIR, node_id + ".webp")
        prompt = NODES[node_id] + STYLE_ANCHOR
        print(f"[{i}/{len(todo)}] {node_id} ...", flush=True)

        candidates = [model] if model else MODELS
        last_err = None
        for candidate in candidates:
            try:
                result = client.models.generate_content(
                    model=candidate,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["Image"],
                        image_config=types.ImageConfig(aspect_ratio="3:4"),
                    ),
                )
                data = None
                for part in result.candidates[0].content.parts:
                    inline = getattr(part, "inline_data", None)
                    if inline and inline.data:
                        data = inline.data
                        break
                if data is None:
                    # 多半是安全過濾擋掉了，換模型也沒用
                    last_err = "沒有回傳圖片（可能被安全過濾擋下）"
                    break
                img = Image.open(io.BytesIO(data)).convert("RGB")
                img.save(out, "WEBP", quality=80)
                size_kb = os.path.getsize(out) // 1024
                if model is None:
                    model = candidate
                    print(f"    使用模型：{candidate}")
                print(f"    -> {out}  ({img.width}x{img.height}, {size_kb} KB)")
                ok += 1
                last_err = None
                break
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                text = str(exc)
                if "RESOURCE_EXHAUSTED" in text or "429" in text:
                    # 免費層對生圖的配額是 0，重試 45 次只是浪費時間
                    sys.exit(
                        "\n生圖配額為 0 —— 這把 key 的專案還沒開帳單。\n"
                        "Gemini API 的免費層不含圖像生成（文字模型可以用，圖像 limit: 0）。\n"
                        "到 https://aistudio.google.com/ 把這把 key 所屬的專案升級成付費，再重跑。\n"
                        "51 張大約 US$2–7，看用到哪個模型。"
                    )
                if "NOT_FOUND" in text or "not found" in text.lower():
                    continue          # 這個模型不能用，換下一個
                break                 # 其他錯誤換模型也沒意義

        if last_err is not None:
            print(f"    失敗：{last_err}")
            fail += 1

        if i < len(todo):
            time.sleep(1)             # 客氣一點，避免撞速率限制

    print(f"\n完成 {ok} 張，失敗 {fail} 張。")
    if ok:
        print("接著用瀏覽器打開 dev/art-sheet.html 看成果（會標示哪些已經是場景圖）。")


if __name__ == "__main__":
    main()
