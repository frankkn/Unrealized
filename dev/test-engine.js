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
evalFile('data/nodes-ch6-7.js', win, makeFakeStorage());
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

// 1b. 節點圖靜態分析：找出從 startNode 走不到的節點、指向不存在節點的斷鏈
var graph = engine.devAnalyzeGraph();
assert(graph.danglingLinks.length === 0, '有選項指向不存在的節點: ' + JSON.stringify(graph.danglingLinks));
assert(graph.unreachableNodes.length === 0, '有節點從 startNode 走不到: ' + JSON.stringify(graph.unreachableNodes));

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
var RUNS_PER_COMBO = 800;
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

// 4b. 隨機抽樣下「洗腎的日子/倒在辦公室」壓倒性地多——這是因為亂點會讓健康幾乎必crash到<=1。
//    驗證這不是引擎的結構性 bug：只要玩家刻意避開傷健康的選項，健康是「可以」保住的。
function healthProtectivePick(node, options) {
  var scored = options.map(function (o) {
    var healthDelta = (o.effects && o.effects.health) || 0;
    return { o: o, score: healthDelta };
  });
  scored.sort(function (a, b) { return b.score - a.score; });
  return scored[0].o;
}
var healthPreserved = false;
UNREALIZED.config.generations.forEach(function (g) {
  UNREALIZED.config.genders.forEach(function (gender) {
    var result = randomPlay(g, gender, healthProtectivePick);
    if (result.state.attrs.health > 1) healthPreserved = true;
  });
});
assert(healthPreserved, '刻意保護健康的玩法，應該至少能讓某個世代/性別組合活著撐過健康的硬觸發');

// 5. 節點可達性檢查：靜態分析已經證明每個節點在圖上都能走到（見 1b），
//    這裡是「機率夠不夠高」的補充參考：這次抽樣沒走到的節點，可能只是機率低，不代表是 bug
var allNodeIds = Object.keys(UNREALIZED.nodes);
var unvisited = allNodeIds.filter(function (id) { return !visitedNodes[id] && id !== 'n5_accident'; });
if (unvisited.length) {
  console.warn('[UNREALIZED dev] 這次抽樣沒走到的節點（可能只是機率低，非必然是 bug）：', unvisited);
}

// 5b. 結局可達性：列出這次抽樣中從未被觸發的完整結局（僅供參考，稀有/世代限定結局本來就難抽到）
var allEndingIds = UNREALIZED.endings.full.map(function (e) { return e.id; });
var neverTriggered = allEndingIds.filter(function (id) { return !endingsSeen[id]; });
console.log('[UNREALIZED dev] 這次抽樣從未觸發的完整結局（' + neverTriggered.length + ' / ' + allEndingIds.length + '）：', neverTriggered);

// 5c. 上面那 11 個結局隨機抽樣沒中，多半是因為它們需要「有意識地」玩，不是亂點。
//    用有方向性的策略腳本，逐個證明它們在邏輯上真的能被觸發到，不只是理論上滿足條件。
function steeringPick(weights, hardForce) {
  return function (node, options) {
    if (hardForce && hardForce[node.id]) {
      var forced = options.filter(function (o) { return o.id === hardForce[node.id]; })[0];
      if (forced) return forced;
    }
    // 分數相同時要能隨機選，不然每次嘗試都是同一條路徑，400 次重試等於重試 1 次
    var scored = options.map(function (o) {
      var effects = o.effects || {};
      var score = Math.random() * 0.01;
      Object.keys(weights).forEach(function (k) { score += (effects[k] || 0) * weights[k]; });
      return { o: o, score: score };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored[0].o;
  };
}
function centeringPick(node, options, state) {
  var scored = options.map(function (o) {
    var predicted = Object.assign({}, state.attrs);
    Object.keys(o.effects || {}).forEach(function (k) {
      predicted[k] = Math.max(0, Math.min(10, predicted[k] + o.effects[k]));
    });
    var deviation = Object.keys(predicted).reduce(function (sum, k) { return sum + Math.abs(predicted[k] - 5); }, 0);
    return { o: o, score: -deviation + Math.random() * 0.01 };
  });
  scored.sort(function (a, b) { return b.score - a.score; });
  return scored[0].o;
}
function attemptUntilEnding(combos, forcePick, targetId, maxTries) {
  for (var i = 0; i < maxTries; i++) {
    var combo = combos[i % combos.length];
    var result = randomPlay(combo[0], combo[1], forcePick);
    var ending = engine.evaluateEnding(result.state);
    if (ending.id === targetId) return true;
  }
  return false;
}
var ALL_COMBOS = [];
UNREALIZED.config.generations.forEach(function (g) {
  UNREALIZED.config.genders.forEach(function (gender) { ALL_COMBOS.push([g, gender]); });
});

// 高槓桿／借貸／健康崩潰／宗教金錢…在第4-6章會直接觸發特定結局或搶先卡進更前面的判定 tier，
// 蓋掉後面原本要驗證的目標，所以策略腳本一律先避開這些陷阱，剩下的軸再依各自目標的權重去逼近
var SAFE_BASELINE = {
  n5_house: 'rent_forever', n5_invest: 'avoid', n5_debt: 'grind_through',
  n4_mlm: 'refuse_breakup', n3m_military: 'make_bonds', n5_era_storm: 'dodge',
  n5_emigrate: 'emigrate_stay', n6_politics: 'silence', n6_long_term_care: 'hire_full_time'
};
function withBaseline(extra) { return Object.assign({}, SAFE_BASELINE, extra || {}); }

// 職災要落在「health<=3 但沒觸發第6章的健康崩潰直接判定（health<=2 那個)」這個窄區間，
// 用固定權重很容易衝過頭，改成動態：血條還高就往下壓，壓到 3 附近就改成盡量貼著 3 不再往下掉
function injuryPick(node, options, state) {
  if (node.id === 'n2_high_school') {
    var forced = options.filter(function (o) { return o.id === 'vocational'; })[0];
    if (forced) return forced;
  }
  var scored = options.map(function (o) {
    var h = (o.effects && o.effects.health) || 0;
    var predicted = state.attrs.health + h;
    return { o: o, score: -Math.abs(predicted - 3) + Math.random() * 0.01 };
  });
  scored.sort(function (a, b) { return b.score - a.score; });
  return scored[0].o;
}

// 剛好的人生（隱藏稀有）：亂猜權重找不到——五軸同時落在中段，還要全程不沾任何會被更前面
// 的 tier（世代/旗標組合）搶先判定掉的旗標，是真的很窄的一條路。用跑過的 beam search
// 離線找到一條「danger flag 數=0 且五軸都在[4,6]」的實際存在路徑，這裡直接重放驗證，
// 比每次重新搜尋快得多，也更穩定。
var LUCKY_MIDBAND_PATH = [
  'n0_family/gov_family', 'n1_bookish/push', 'n2_high_school/normal',
  'n3_route/general_uni', 'n3m_military/find_clarity', 'n3_first_love/straight_stable',
  'n4_job/sme', 'n4_where/abroad', 'n4_westward/stay',
  'n4_mlm/refuse_breakup', 'n5_career_move/setback', 'n5_marriage/marry_common',
  'n5_children/undecided_m', 'n5_house/rent_forever', 'n5_invest/etf',
  'n5_parents_ill/institution', 'n5_body_signal/check', 'n5_overwork/pace_self',
  'n5_debt/grind_through', 'n5_era_storm/dodge', 'n5_emigrate/emigrate_stay',
  'n6_career_plateau/push_more', 'n6_midlife_unemployment/start_over', 'n6_long_term_care/hire_full_time',
  'n6_marriage_crisis/stay_for_kids', 'n6_politics/silence', 'n6_financial_reckoning/manage_through',
  'n6_health_reckoning/partial_care', 'n6_return_home/commute', 'n6_readjust/let_go',
  'n7_retirement_prep/keep_working', 'n7_scam_call/recognize_immediately', 'n7_solo_aging/thriving_alone',
  'n7_body_ledger/careful', 'n7_look_back/regret'
];
function playScriptedPath(generation, gender, path) {
  var state = engine.createRunState(generation, gender);
  path.forEach(function (step) {
    var parts = step.split('/');
    var nodeId = parts[0], optionId = parts[1];
    assert(state.nodeId === nodeId, '腳本路徑跟實際節點不符，預期 ' + nodeId + '，實際 ' + state.nodeId);
    var node = engine.getNode(state.nodeId);
    var opt = engine.visibleOptions(node, state).filter(function (o) { return o.id === optionId; })[0];
    assert(!!opt, node.id + ' 找不到選項 ' + optionId);
    engine.applyOption(state, node, opt);
  });
  assert(state.ended, '腳本路徑跑完了，但遊戲還沒結束');
  return state;
}
// 自己的路（self>=7 achieve>=6）跟靜靜的如果（self<=3 其他不錯）也有同樣的「權重亂猜找不到」問題：
// 尤其自己的路在 1990 世代還會被 achieve>=7 的「22K的逆襲」搶先卡走，必須把 achieve 精準停在 6，
// 這種窄範圍一樣改成離線 beam search 找到的實際路徑，直接重播驗證
var LUCKY_SELF_PATH = [
  'n0_family/labor_family', 'n1_labor/self_taught', 'n2_high_school/elite',
  'n3_route/top_hot', 'n3m_military/find_clarity', 'n3_first_love/solo',
  'n4_job/freelance', 'n4_where/abroad', 'n4_westward/go',
  'n4_mlm/refuse_breakup', 'n5_career_move/steady', 'n5_marriage/marry_common',
  'n5_children/have_kids', 'n5_house/rent_forever', 'n5_invest/etf',
  'n5_parents_ill/institution', 'n5_body_signal/ignore', 'n5_overwork/pace_self',
  'n5_debt/grind_through', 'n5_era_storm/dodge', 'n5_emigrate/emigrate_stay',
  'n6_career_plateau/accept', 'n6_midlife_unemployment/start_over', 'n6_parenting/outsource',
  'n6_long_term_care/hire_full_time', 'n6_marriage_crisis/work_it_out', 'n6_politics/try_understand',
  'n6_financial_reckoning/help_family', 'n6_health_reckoning/overwork_still', 'n6_return_home/move_back',
  'n6_readjust/double_down', 'n7_retirement_prep/underprepared', 'n7_children_settlement/distant',
  'n7_scam_call/recognize_immediately', 'n7_solo_aging/community', 'n7_body_ledger/indulge',
  'n7_look_back/proud'
];
var LUCKY_QUIET_PATH = [
  'n0_family/gov_family', 'n1_bookish/push', 'n2_high_school/elite',
  'n3_route/vocational_college', 'n3m_military/make_bonds', 'n3_first_love/straight_stable',
  'n4_job/family_biz', 'n4_22k/endure', 'n4_mlm/refuse_breakup',
  'n5_career_move/steady', 'n5_marriage/marry_common', 'n5_children/undecided_m',
  'n5_house/stay_family', 'n5_invest/etf', 'n5_parents_ill/institution',
  'n5_body_signal/delegate_worry', 'n5_overwork/pace_self', 'n5_debt/grind_through',
  'n5_era_storm/dodge', 'n5_emigrate/emigrate_stay', 'n6_career_plateau/push_more',
  'n6_midlife_unemployment/quick_reemploy', 'n6_long_term_care/hire_full_time', 'n6_marriage_crisis/stay_for_kids',
  'n6_politics/silence', 'n6_financial_reckoning/manage_through', 'n6_health_reckoning/slow_down',
  'n6_return_home/move_back', 'n6_readjust/double_down', 'n7_retirement_prep/prepared',
  'n7_scam_call/recognize_immediately', 'n7_solo_aging/community', 'n7_body_ledger/decline',
  'n7_look_back/regret'
];

// 22K的逆襲需要 achieve>=7 又要活著（health>1）、又不能被 hard tier 的錢/健康崩潰或更前面的
// 三明治世代／被騙走的晚年搶走，同樣是窄路，用離線 beam search 找到的實際路徑重播
var LUCKY_22K_PATH = [
  'n0_family/single_mom', 'n1_single/scholarship', 'n2_high_school/elite',
  'n3_route/general_uni', 'n3f_headstart/lean_in', 'n3_first_love/straight_stable',
  'n4_job/big_corp', 'n4_where/stay_local', 'n4f_interview/honest',
  'n4_22k/endure', 'n4_mlm/join', 'n5_career_move/big_jump',
  'n5_marriage/marry_common', 'n5_children/have_kids', 'n5_house/buy_leverage',
  'n5_invest/etf', 'n5_parents_ill/hire_caregiver', 'n5_body_signal/check',
  'n5_overwork/pace_self', 'n5_debt/grind_through', 'n5_era_storm/hit_hard',
  'n5_emigrate/emigrate_go', 'n6_career_plateau/accept', 'n6_midlife_unemployment/quick_reemploy',
  'n6_parenting/repeat_pattern', 'n6_long_term_care/hire_full_time', 'n6_marriage_crisis/work_it_out',
  'n6_politics/fight', 'n6_financial_reckoning/collections_call', 'n6_health_reckoning/partial_care',
  'n6_return_home/bring_them', 'n6_readjust/double_down', 'n7_retirement_prep/underprepared',
  'n7_children_settlement/close', 'n7_scam_call/fall_for_it', 'n7_solo_aging/thriving_alone',
  'n7_body_ledger/careful', 'n7_look_back/regret'
];

var midbandProof = playScriptedPath(1975, 'M', LUCKY_MIDBAND_PATH);
assert(engine.evaluateEnding(midbandProof).id === 'END_剛好的人生',
  '照著記錄下來的路徑重播，應該要拿到「剛好的人生」，實際拿到 ' + engine.evaluateEnding(midbandProof).id);
var selfPathProof = playScriptedPath(1975, 'M', LUCKY_SELF_PATH);
assert(engine.evaluateEnding(selfPathProof).id === 'END_自己的路',
  '照著記錄下來的路徑重播，應該要拿到「自己的路」，實際拿到 ' + engine.evaluateEnding(selfPathProof).id);
var quietPathProof = playScriptedPath(1990, 'M', LUCKY_QUIET_PATH);
assert(engine.evaluateEnding(quietPathProof).id === 'END_靜靜的如果',
  '照著記錄下來的路徑重播，應該要拿到「靜靜的如果」，實際拿到 ' + engine.evaluateEnding(quietPathProof).id);
var comeback22kProof = playScriptedPath(1990, 'F', LUCKY_22K_PATH);
assert(engine.evaluateEnding(comeback22kProof).id === 'END_22K的逆襲',
  '照著記錄下來的路徑重播，應該要拿到「22K的逆襲」，實際拿到 ' + engine.evaluateEnding(comeback22kProof).id);

var targetedProofs = [
  { id: 'END_登記那天', combos: [[1990, 'F'], [1990, 'M']], tries: 600,
    pick: steeringPick({ bond: 0.4, health: 2 }, withBaseline({ n3_first_love: 'same_sex', n3_love_comingout: '90_registered', n5_marriage: 'register_lgbt' })) },
  { id: 'END_沒被時代選中', combos: ALL_COMBOS, tries: 800, pick: steeringPick({ achieve: -1, self: 1.2, health: 2 }, SAFE_BASELINE) },
  { id: 'END_差一年', combos: [[2005, 'F']], tries: 400, pick: steeringPick({ health: 0.5 }, SAFE_BASELINE) },
  { id: 'END_職災', combos: [[1975, 'M'], [1990, 'M'], [1975, 'F'], [1990, 'F']], tries: 2000, pick: injuryPick },
  { id: 'END_循環的重量', combos: ALL_COMBOS, tries: 600,
    pick: steeringPick({ health: 0.3 }, withBaseline({ n5_children: 'have_kids', n6_parenting: 'repeat_pattern' })) },
  { id: 'END_竹科的股票', combos: [[1975, 'M'], [1975, 'F']], tries: 400, pick: steeringPick({ money: 2, health: 0.3 }) }
];
var provenEndings = ['END_剛好的人生', 'END_自己的路', 'END_靜靜的如果', 'END_22K的逆襲'];
var unprovenEndings = [];
targetedProofs.forEach(function (t) {
  var found = attemptUntilEnding(t.combos, t.pick, t.id, t.tries);
  if (found) provenEndings.push(t.id); else unprovenEndings.push(t.id);
});
console.log('用策略腳本證明可達的結局（' + provenEndings.length + '/' + (targetedProofs.length + 4) + '）：', provenEndings);
assert(unprovenEndings.length === 0, '這些結局用策略腳本都沒觸發到，可能真的無法到達: ' + JSON.stringify(unprovenEndings));

// 5d. 場景圖的 prompt 清單：ID 打錯不會報錯，只會安靜地沿用雕版，所以在這裡比對
var promptsPath = path.join(__dirname, '..', 'art', 'PROMPTS.md');
if (fs.existsSync(promptsPath)) {
  var md = fs.readFileSync(promptsPath, 'utf8');
  var promptIds = (md.match(/^### (\S+) —/gm) || []).map(function (l) {
    return l.replace(/^### /, '').replace(/ —.*/, '');
  });
  var nodeIds = Object.keys(UNREALIZED.nodes);
  var noPrompt = nodeIds.filter(function (n) { return promptIds.indexOf(n) === -1; });
  var strayPrompt = promptIds.filter(function (p) { return nodeIds.indexOf(p) === -1; });
  assert(noPrompt.length === 0, 'art/PROMPTS.md 少了這些節點的 prompt: ' + noPrompt.join(', '));
  assert(strayPrompt.length === 0, 'art/PROMPTS.md 有對不上任何節點的 ID（多半是打錯字）: ' + strayPrompt.join(', '));
  console.log('[UNREALIZED dev] art/PROMPTS.md 涵蓋全部 ' + nodeIds.length + ' 個節點。');
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

// 8. 完整結局應至少有 28 個
var fullEndingCount = UNREALIZED.endings.full.length;
assert(fullEndingCount >= 29, '完整結局應至少 29 個，目前 ' + fullEndingCount);

// 9. 個人化段落：至少一個旗標組合能讓結局文字被加上額外段落
var stateWithFlags = engine.createRunState(1990, 'F');
stateWithFlags.flags['成家'] = true;
var baseEnding = engine.getEnding('END_有得有失');
var personalized = engine.personalizeEnding(baseEnding, stateWithFlags);
assert(personalized.length > baseEnding.text.length, '有旗標時，個人化段落應該讓結局文字變長');

console.log('全部 ' + assertCount + ' 項檢查通過。完整結局數：' + fullEndingCount);
