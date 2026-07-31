<div align="right">

**English** | [繁體中文](README.zh-TW.md)

</div>

# UNREALIZED 📔 人生存摺

**Pick a birth cohort and a gender, then walk from childhood to old age, one choice per chapter. At the end you open your passbook and see what kind of life you stamped into it — and which endings your era never offered you in the first place.**

🔗 Live: **https://frankkn.github.io/Unrealized/**

## How to play

Open [https://frankkn.github.io/Unrealized/](https://frankkn.github.io/Unrealized/) in any browser. No sign-up, no install, no backend.

It also runs straight from disk — download the repo and double-click `index.html`. There is no build step and no bundler; that is a design constraint, not an oversight.

1. Choose a cohort — **1975 / 1990 / 2005** — and a gender
2. Walk chapters 0 through 7, from the family you were born into to the years after fifty
3. Five stats — money, achievement, bonds, health, and **self** (how close your choices ran to what you actually wanted) — move the whole way through, **hidden until the very end**
4. From chapter 2 onward you may stop early: *"close the book here and see what I've got."* Stopping has five endings of its own
5. Endings you reach are recorded in the codex; the ones you haven't are silhouettes

**29 full endings and 5 early ones.** Some are cohort-locked.

## What is this

It's a life-choice game, in Traditional Chinese, set in Taiwan.

Three people are born thirty years apart into the same country. They sit different entrance exams, serve different conscription lengths, walk into different housing markets, and meet the same-sex marriage law at ages that decide entirely what it means to them — too late, exactly in time, or so early they never knew it was ever in question.

UNREALIZED is built on one idea: **your life is not shaped only by your choices — it is shaped by which cohort you were born into.**

The name is an accounting term — *unrealized gains and losses* — and also "possibilities never realized." It is the one word that lets the best ending and the worst ending share a title.

### The rules (non-negotiable)

- **No free choices.** Every option moves at least two of the five stats, and the five together may never net above +1. Tradeoffs stand, bad bargains stand, but nothing is ever pure gain. This is enforced, not merely intended
- **But "no free choices" means tradeoff, not decay.** Alongside the choices runs a baseline: once you are working, pay and seniority accrue on their own; in old age the title goes back, the people around you thin out, the body settles its debts. Without it the game would be quietly asserting that a life is net loss. The baseline is deliberately lighter than any single choice — **the choices stay the story**
- **`self` never accrues.** Money, achievement and bonds grow with time on their own. Living in line with what you actually want is the one thing you can only ever buy with a decision
- **Ruinous endings are preventable and foreshadowed.** The narration warns you — *"you haven't had a health check in three years"* — and never shows a number. The car-accident node fires only if you earned the fatigue-driving flag or your health is already low. **A random punishment is a failure of design**
- **No suicide endings, and no method described.** Death settles every consequence at once; the player is spared having to face anything. Surviving is what actually hurts, so every financial-collapse ending is written that way
- **Stats are hidden for the entire run.** You are choosing from the narration, the way you would have at the time — not optimizing a number
- **No real politicians or parties are praised or blamed.** The chapter 6 node about a family torn apart by politics is about the table going quiet, never about which side was right
- **Some endings are locked to a cohort.** The codex quietly makes its own argument: there are endings you will never unlock, because your era never put them on the menu

## The three generations

| | Born 1975 | Born 1990 | Born 2005 |
|---|---|---|---|
| Childhood | Three generations under one roof; a military dependents' village, or a farm | Apartment, two working parents, latchkey kid | Only child — and your parents are the 1990 cohort |
| School | Joint entrance exams, ~30% got a university place | GSAT and the exam scramble; >90% admitted, and a degree worth less for it | The 108 curriculum, portfolios — you'll get in, but the school may fold |
| Conscription (men) | Two years | One year | Four months, restored to a year in 2024 — landing squarely on you |
| Entering work | The 1997 Asian financial crisis, factories moving to China, Hsinchu taking off | 22K, unpaid leave, the Sunflower Movement | AI, the pandemic cohort, remote as default |
| Housing | Still buyable, before 2003 | Watching it price itself away from you | No longer part of the conversation |
| Same-sex marriage | Illegal and stigmatised your whole life | Passed in 2019, when you were 29 — just in time | Legal since before you can remember |
| Plays until | 2025, age 50 | 2040, age 50 | 2055–2075, near-future speculation |

**Gender opens no new branch — it changes what's inside.** Chapter 3 is the sharpest fork: men go to conscription, women to "two years ahead" in the workforce. **Neither is the advantage. They are different costs.**

The 2005 cohort's parents are the 1990 cohort. Play 1990, then play 2005, and you'll notice you're playing the previous protagonist's child. Chapter 0 leaves the clues; it never says so.

## Honesty as infrastructure

The design rules above are checked by a script, not by good intentions. `node dev/test-engine.js` runs on every change and fails on:

- **Free lunches** — every option is scanned for the two-axis / net ≤ +1 rule; nothing is grandfathered
- **Broken graph** — nodes unreachable from the start, and options pointing at nodes that don't exist
- **Dead endings** — all 29 must be provably reachable. Uniform random play only finds most of them, so the rest get targeted proofs. Four have windows too narrow for that (five stats all landing mid-range, or one stat stopping on an exact value) and are proven by replaying concrete paths found offline with `dev/find-paths.js`
- **Unplayable chapters** — chapters 0–3 are exhaustively enumerated, every branch, all six cohort × gender combinations
- **Leaked placeholders** — the lexicon substitutes 26 era-specific terms into the script (`{起薪}` becomes *two-four*, *twenty-two K*, or *thirty-six, but rent is eighteen*), and no `{token}` may survive into rendered text

Those checks cover the engine, which is pure data and logic and runs headless. The interface is the part a player actually touches, so `node dev/test-ui.js` hands `index.html` to a real DOM, loads every script the way a browser would, and clicks through to an ending — all six cohort × gender combinations, stopping early for a mid-ending, a cohort-locked option appearing for 1975 and staying hidden for 2005, multi-paragraph endings, the codex, clearing your history, reduced motion, and replaying your last run. A typo in a `<script src>`, a mis-typed element id, a handler that never got bound: those fail here instead of in front of a player.

This is how the health axis got caught. It had quietly become the stat writers docked whenever an option needed a downside, including on nodes whose narration had nothing to do with the body: across 153 options it summed +4 up against −44 down, and 40 of 44 nodes offered no way to recover any. 90% of runs ended in health collapse regardless of how you played. It read as a difficulty problem and was actually an attribution problem — the costs are now carried by the stats the text actually supports.

## Stack

Plain HTML + CSS + vanilla JS. No framework, no bundler, no build step, no backend, no API, no tracking, no analytics. **Nothing to install in order to play** — the one dev dependency exists so the tests can drive a DOM, and never ships.

Scripts are loaded with plain `<script>` tags rather than ES modules, specifically so the game still runs over `file://` after someone downloads a zip. Everything hangs off `window.UNREALIZED`.

localStorage holds the ending codex, your settings, and your last cohort — nothing else — and there's a clear button inside the game. Every read and write is wrapped, so private browsing degrades instead of crashing.

```
index.html              entry point
css/style.css           all styling
js/engine.js            state machine, stat maths, ending adjudication
js/state.js             save / codex (localStorage)
js/ui.js                DOM, animation, chapter transitions
data/config.js          cohorts, lexicon, stat definitions, chapter baseline
data/nodes-ch0-3.js     chapters 0–3
data/nodes-ch4-5.js     chapters 4–5
data/nodes-ch6-7.js     chapters 6–7
data/endings.js         every ending
dev/                    dev-only tooling, not part of the game
```

**Content and engine are fully separate.** The engine knows nothing about the story — rewriting the entire script touches only `data/`.

## Development

```bash
npm install          # jsdom, for the interface tests only
npm test             # engine + interface
npm run test:engine  # engine only - needs no dependencies at all
npm run test:ui      # interface, against a real DOM
npm run find-paths   # regenerate rare-ending proof paths (append e.g. 3000 to widen the search)
```

**The dependency is for the tests, never for the game.** `index.html` still opens straight off disk with nothing installed — that is the whole point of the no-build constraint, and it is checked by the interface tests themselves, which load the page exactly as a browser does.

The rare endings are proven in the test suite by replaying concrete paths, so **any balance change invalidates them** — that's what `find-paths.js` is for. Rebalancing the health axis broke three of the four; the chapter baseline broke all four. Both times: rerun, paste back, done.

### Deploy

Settings → Pages → Source: *Deploy from a branch*, branch `master`, folder `/ (root)`. The `.nojekyll` file at the repo root keeps Pages from running Jekyll over it.

## Deliberately not building

Accounts, cloud saves, leaderboards, achievements, share-to-unlock, analytics of any kind, difficulty settings, an undo button, and a visible stat display during play — seeing the numbers would turn a life into a spreadsheet, which is the one thing this can't be.

---

Some endings you will never unlock. Not because you played badly — because your era never offered them.

## License

[MIT](LICENSE)
