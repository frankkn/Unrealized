// dev-only 自我檢查：不是遊戲的一部分，純粹在改動 engine/data 後用 `node dev/test-engine.js` 跑一次。
// 驗證：鐵則（沒有純加分選項）、所有節點路徑都能跑到結局、中途結局判定、詞彙字典替換。
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

// 2. 走遍所有世代 x 性別 x 全部分支，確認每條路徑都能正常跑到一個結局
var endingsSeen = {};
var pathsPlayed = 0;

function walk(state, depth) {
  if (state.ended) {
    var ending = engine.evaluateEnding(state);
    assert(!!ending, '應該要能判定出一個結局');
    endingsSeen[ending.id] = (endingsSeen[ending.id] || 0) + 1;
    pathsPlayed++;
    return;
  }
  if (depth > 40) throw new Error('疑似無窮迴圈: ' + state.nodeId);
  var node = engine.getNode(state.nodeId);
  var options = engine.visibleOptions(node, state);
  assert(options.length > 0, node.id + ' 沒有任何可見選項');
  options.forEach(function (opt) {
    var cloned = JSON.parse(JSON.stringify(state));
    engine.applyOption(cloned, node, opt);
    walk(cloned, depth + 1);
  });
}

UNREALIZED.config.generations.forEach(function (g) {
  UNREALIZED.config.genders.forEach(function (gender) {
    walk(engine.createRunState(g, gender), 0);
  });
});

assert(pathsPlayed > 0, '應該至少跑完一條路徑');
console.log('走完 ' + pathsPlayed + ' 條路徑，觸發 ' + Object.keys(endingsSeen).length + ' 種完整結局：');
console.log(endingsSeen);

// 3. 中途收尾：章節 >= 2 時應該都能判定出一個中途結局
[2, 3].forEach(function (chapter) {
  var s = engine.createRunState(1990, 'F');
  s.chapter = chapter;
  var mid = engine.evaluateMidEnding(s);
  assert(!!mid, '章節 ' + chapter + ' 應該能判定中途結局');
});

// 4. 詞彙字典：至少 25 組，替換後不留佔位符
var lexiconKeys = Object.keys(UNREALIZED.lexicon);
assert(lexiconKeys.length >= 25, '詞彙字典應至少 25 組，目前 ' + lexiconKeys.length);
UNREALIZED.config.generations.forEach(function (g) {
  var s = engine.createRunState(g, 'M');
  var text = engine.substituteLexicon('{升學考試}與{起薪}', s);
  assert(!/\{[^{}]+\}/.test(text), '詞彙替換後不應留下佔位符: ' + text);
});

console.log('全部 ' + assertCount + ' 項檢查通過。');
