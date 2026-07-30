// dev-only 自我檢查：不是遊戲的一部分，純粹在改動 engine/data 後用 `node dev/test-engine.js` 跑一次。
// 驗證：鐵則（沒有純加分選項）、ch0-3 全枚舉可達 ch4、隨機大量抽樣跑完整局、
// 中途結局判定、詞彙字典替換、車禍伏筆機制確實有效。
'use strict';
var fs = require('fs');
var path = require('path');

function evalFile(relPath, win, storage) {
  var full = path.join(__dirname, '..', relPath);
  var code = fs.readFileSync(full, 'utf8');
  var fn = new Function('window', 'localStorage', code);
  fn(win, storage);
}

function makeFakeStorage() {
  var data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}

var win = {};
evalFile('data/config.js', win, makeFakeStorage());
evalFile('data/nodes-ch0-3.js', win, makeFakeStorage());
evalFile('data/nodes-ch4-5.js', win, makeFakeStorage());
evalFile('data/endings.js', win, makeFakeStorage());
evalFile('js/state.js', win, makeFakeStorage());
evalFile('js/engine.js', win, makeFakeStorage());

var UNREALIZED = win.UNREALIZED;
var engine = UNREALIZED.engine;

var assertCount = 0;
function assert(cond, msg) {
  assertCount++;
  if (!cond) throw new Error('FAIL: ' + msg);
}

// 1. 鐵則：每個選項至少變動兩軸，其中至少一軸下降
var violations = engine.devValidateNodes();
assert(violations.length === 0, '違反鐵則的選項: ' + JSON.stringify(violations));

// 2. 全枚舉走遍第0-3章所有分支，確認都能正常走到第4章入口（沿用階段一的做法，
//    第4-5章分支太多，枚舉會爆炸，改用下面的隨機抽樣）
var ch03Paths = 0;
var ch03EarlyEndings = 0;
function walkCh03(state, depth) {
  if (state.ended) {
    // 唯一合法的提前結束：1975 限定的隱藏結局「十五歲的工廠」
    assert(state.endingId === 'END_factory15', '第0-3章不該提前結束，除了 END_factory15: ' + JSON.stringify(state.history));
    ch03EarlyEndings++;
    return;
  }
  var node = engine.getNode(state.nodeId);
  if (node.chapter >= 4) { ch03Paths++; return; }
  if (depth > 20) throw new Error('疑似無窮迴圈: ' + state.nodeId);
  var options = engine.visibleOptions(node, state);
  assert(options.length > 0, node.id + ' 沒有任何可見選項');
  options.forEach(function (opt) {
    var cloned = JSON.parse(JSON.stringify(state));
    engine.applyOption(cloned, node, opt);
    walkCh03(cloned, depth + 1);
  });
}
UNREALIZED.config.generations.forEach(function (g) {
  UNREALIZED.config.genders.forEach(function (gender) {
    walkCh03(engine.createRunState(g, gender), 0);
  });
});
console.log('第0-3章枚舉完畢，共 ' + ch03Paths + ' 條路徑進入第4章，' + ch03EarlyEndings + ' 條提前觸發十五歲的工廠。');

// 3. 隨機抽樣跑全程（含第4-5章），確認不會 crash、不會無窮迴圈、都能判定出結局
function randomPlay(generation, gender, forcePick) {
  var state = engine.createRunState(generation, gender);
  var visited = [];
  for (var i = 0; i < 80; i++) {
    if (state.ended) return { state: state, visited: visited };
    var node = engine.getNode(state.nodeId);
    visited.push(node.id);
    var options = engine.visibleOptions(node, state);
    assert(options.length > 0, node.id + ' 沒有任何可見選項');
    var opt = (forcePick && forcePick(node, options, state)) || options[Math.floor(Math.random() * options.length)];
    engine.applyOption(state, node, opt);
  }
  throw new Error('超過步數上限，疑似無窮迴圈，卡在 ' + state.nodeId);
}

var visitedNodes = {};
var endingsSeen = {};
var RUNS_PER_COMBO = 400;
UNREALIZED.config.generations.forEach(function (g) {
  UNREALIZED.config.genders.forEach(function (gender) {
    for (var i = 0; i < RUNS_PER_COMBO; i++) {
      var result = randomPlay(g, gender);
      result.visited.forEach(function (id) { visitedNodes[id] = true; });
      var ending = engine.evaluateEnding(result.state);
      assert(!!ending, '應該要能判定出一個結局');
      endingsSeen[ending.id] = (endingsSeen[ending.id] || 0) + 1;
    }
  });
});
console.log('隨機抽樣 ' + (RUNS_PER_COMBO * 6) + ' 局跑完，觸發 ' + Object.keys(endingsSeen).length + ' 種完整結局：');
console.log(endingsSeen);

// 4. 車禍伏筆機制：強制在 n5_overwork 選「push_through」，確認一定會進入 n5_accident
//    （反之從沒選過該選項、健康也沒掉到 <=3 時，不該遇到車禍節點——由上面的隨機抽樣自然覆蓋）
var forcedAccident = randomPlay(1990, 'M', function (node, options) {
  if (node.id === 'n5_overwork') return options.filter(function (o) { return o.id === 'push_through'; })[0];
  return null;
});
assert(forcedAccident.visited.indexOf('n5_accident') !== -1, '選了 push_through（疲勞駕駛）之後應該要進入 n5_accident');

// 5. 節點可達性檢查：找出從未被隨機抽樣走到的節點（僅供參考，不當作硬性失敗）
var allNodeIds = Object.keys(UNREALIZED.nodes);
var unvisited = allNodeIds.filter(function (id) { return !visitedNodes[id] && id !== 'n5_accident'; });
if (unvisited.length) {
  console.warn('[UNREALIZED dev] 這次抽樣沒走到的節點（可能只是機率低，非必然是 bug）：', unvisited);
}

// 6. 中途收尾：章節 >= 2 時應該都能判定出一個中途結局
[2, 3, 4, 5].forEach(function (chapter) {
  var s = engine.createRunState(1990, 'F');
  s.chapter = chapter;
  var mid = engine.evaluateMidEnding(s);
  assert(!!mid, '章節 ' + chapter + ' 應該能判定中途結局');
});

// 7. 詞彙字典：至少 25 組，替換後不留佔位符
var lexiconKeys = Object.keys(UNREALIZED.lexicon);
assert(lexiconKeys.length >= 25, '詞彙字典應至少 25 組，目前 ' + lexiconKeys.length);
UNREALIZED.config.generations.forEach(function (g) {
  var s = engine.createRunState(g, 'M');
  var text = engine.substituteLexicon('{升學考試}與{起薪}', s);
  assert(!/\{[^{}]+\}/.test(text), '詞彙替換後不應留下佔位符: ' + text);
});

// 8. 完整結局應至少有 20 個
var fullEndingCount = UNREALIZED.endings.full.length;
assert(fullEndingCount >= 20, '完整結局應至少 20 個，目前 ' + fullEndingCount);

// 9. 個人化段落：至少一個旗標組合能讓結局文字被加上額外段落
var stateWithFlags = engine.createRunState(1990, 'F');
stateWithFlags.flags['成家'] = true;
var baseEnding = engine.getEnding('END_有得有失');
var personalized = engine.personalizeEnding(baseEnding, stateWithFlags);
assert(personalized.length > baseEnding.text.length, '有旗標時，個人化段落應該讓結局文字變長');

console.log('全部 ' + assertCount + ' 項檢查通過。完整結局數：' + fullEndingCount);
