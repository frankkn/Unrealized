// dev-only 工具：幫 test-engine.js 重新找出稀有結局的可達路徑。
// 少數結局的條件範圍太窄（五軸都要落在中段、或某一軸要精準停在某個值），
// 用權重亂試找不到，得靠 beam search。調整過數值平衡導致 test-engine.js 裡
// 寫死的 LUCKY_*_PATH 失效時，跑 `node dev/find-paths.js` 重新產生，貼回去即可。
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..');
function evalFile(rel, win, storage) {
  new Function('window', 'localStorage', fs.readFileSync(path.join(ROOT, rel), 'utf8'))(win, storage);
}
function fakeStorage() {
  var d = {};
  return { getItem: function (k) { return d[k] || null; }, setItem: function (k, v) { d[k] = v; }, removeItem: function (k) { delete d[k]; } };
}
var win = {};
['data/config.js', 'data/nodes-ch0-3.js', 'data/nodes-ch4-5.js', 'data/nodes-ch6-7.js', 'data/endings.js', 'js/state.js', 'js/engine.js']
  .forEach(function (f) { evalFile(f, win, fakeStorage()); });
var U = win.UNREALIZED, engine = U.engine;

// beam search：每一步展開所有選項，依 cost 排序後只留下最好的 width 個
// 排除帶 endingId 的選項，否則搜尋會被「直接觸發某結局」的捷徑吃掉
function beam(generation, gender, width, cost) {
  var live = [engine.createRunState(generation, gender)];
  var ended = [];
  for (var step = 0; step < 60 && live.length; step++) {
    var next = [];
    live.forEach(function (state) {
      var node = engine.getNode(state.nodeId);
      engine.visibleOptions(node, state)
        .filter(function (o) { return !o.endingId; })
        .forEach(function (opt) {
          var clone = JSON.parse(JSON.stringify(state));
          engine.applyOption(clone, node, opt);
          next.push(clone);
        });
    });
    next.sort(function (a, b) { return cost(a) - cost(b); });
    next = next.slice(0, width);
    ended = ended.concat(next.filter(function (s) { return s.ended; }));
    live = next.filter(function (s) { return !s.ended; });
  }
  return ended;
}

function dev(s) {
  return U.config.attributes.reduce(function (sum, a) { return sum + Math.abs(s.attrs[a.key] - 5); }, 0);
}
// 會被更前面的 tier 搶先判定掉的旗標，搜尋時盡量避開
var SHADOWING_FLAGS = ['借貸', '高槓桿', '丁客', '照顧', '宗教金錢', '車禍責任', '車禍訴訟',
  '複製教養', '家庭政治撕裂', '未出櫃', '壓抑', '遇到風暴', '錯過紅利', '移民', '投機', '被取代'];
function shadowCount(s) {
  return Object.keys(s.flags).filter(function (f) { return SHADOWING_FLAGS.indexOf(f) !== -1; }).length;
}

var TARGETS = [
  {
    id: 'END_剛好的人生', constant: 'LUCKY_MIDBAND_PATH',
    combos: [[1975, 'M'], [1975, 'F'], [1990, 'M'], [1990, 'F'], [2005, 'M'], [2005, 'F']],
    cost: function (s) { return shadowCount(s) * 100 + dev(s); }
  },
  {
    id: 'END_自己的路', constant: 'LUCKY_SELF_PATH',
    combos: [[1975, 'M'], [1975, 'F'], [2005, 'M'], [2005, 'F'], [1990, 'M'], [1990, 'F']],
    cost: function (s) {
      return shadowCount(s) * 40 + (s.attrs.health <= 3 ? 500 : 0)
        - (s.attrs.self + s.attrs.achieve) * 3;
    }
  },
  {
    id: 'END_靜靜的如果', constant: 'LUCKY_QUIET_PATH',
    combos: [[1990, 'M'], [1990, 'F'], [1975, 'M'], [1975, 'F'], [2005, 'M'], [2005, 'F']],
    cost: function (s) {
      var others = (s.attrs.money + s.attrs.achieve + s.attrs.bond + s.attrs.health) / 4;
      return shadowCount(s) * 40 + (s.attrs.health <= 1 ? 500 : 0)
        + Math.abs(s.attrs.self - 1) * 10 - others * 5;
    }
  },
  {
    // 成就低但自我高，同時關係要夠高才不會被世代 tier 的孤獨結局搶先蓋掉
    id: 'END_沒被時代選中', constant: 'LUCKY_ERA_PATH',
    combos: [[2005, 'F'], [2005, 'M'], [1990, 'F'], [1990, 'M'], [1975, 'F'], [1975, 'M']],
    cost: function (s) {
      var c = 0;
      c += Math.max(0, s.attrs.achieve - 3) * 30;
      c += Math.max(0, 7 - s.attrs.self) * 30;
      c += Math.max(0, 4 - s.attrs.bond) * 12;      // 太低會被「一個人走的」攔走
      c += Math.max(0, 3 - s.attrs.health) * 40;
      // money 落在 3–6 且 bond<=3 會被「被騙走的晚年」攔走，所以推高一點
      c += Math.max(0, 7 - s.attrs.money) * 6;
      // 同性伴侶那條線在世代 tier 有兩個結局（登記那天／一輩子沒說出口）會先攔截
      if (s.flags['同性伴侶']) c += 400;
      if (s.flags['丁客']) c += 200;               // 2005 的「無子的晚年」
      if (s.flags['照顧']) c += 100;               // 1990 的「三明治世代」
      c += shadowCount(s) * 8;
      return c;
    }
  },
  {
    id: 'END_22K的逆襲', constant: 'LUCKY_22K_PATH',
    combos: [[1990, 'F'], [1990, 'M']],
    cost: function (s) {
      var c = 0;
      c += Math.max(0, 4 - s.attrs.health) * 40;
      if (s.flags['借貸']) c += Math.max(0, 3 - s.attrs.money) * 40;
      if (s.flags['照顧']) c += 15;
      if (s.flags['壓抑']) c += 15;
      c += Math.max(0, 5 - s.attrs.bond) * 6;
      c += Math.max(0, 8 - s.attrs.achieve) * 12;
      return c;
    }
  }
];

var WIDTH = Number(process.argv[2]) || 1200;
TARGETS.forEach(function (t) {
  var hit = null, hitCombo = null;
  for (var i = 0; i < t.combos.length && !hit; i++) {
    var c = t.combos[i];
    var finals = beam(c[0], c[1], WIDTH, t.cost);
    for (var j = 0; j < finals.length; j++) {
      if (engine.evaluateEnding(finals[j]).id === t.id) { hit = finals[j]; hitCombo = c; break; }
    }
  }
  if (!hit) {
    console.log('\n// ' + t.id + ' — 找不到（試著加大 beam width：node dev/find-paths.js 3000）');
    return;
  }
  var steps = hit.history.map(function (h) { return h.nodeId + '/' + h.optionId; });
  // 世代與路徑一起輸出。分開存的話，重生出來的路徑換了世代、而測試還寫死舊的，
  // 會失敗在一個看起來毫不相干的「預期節點 A、實際節點 B」上——已經踩過兩次。
  console.log('\n// ' + t.id + '  attrs: ' + JSON.stringify(hit.attrs));
  console.log('var ' + t.constant + ' = {');
  console.log('  gen: ' + hitCombo[0] + ', gender: ' + JSON.stringify(hitCombo[1]) + ',');
  console.log('  path: [');
  for (var k = 0; k < steps.length; k += 3) {
    console.log('    ' + steps.slice(k, k + 3).map(function (s) { return "'" + s + "'"; }).join(', ') + (k + 3 < steps.length ? ',' : ''));
  }
  console.log('  ]');
  console.log('};');
});
