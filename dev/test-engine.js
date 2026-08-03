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
var LUCKY_MIDBAND_PATH = {
  gen: 1975, gender: "M",
  path: [
    'n0_family/gov_family', 'n1_bookish/hobby', 'n2_high_school/vocational',
    'n3_route/top_hot', 'n3m_military/make_bonds', 'n3_first_love/straight_stable',
    'n4_job/family_biz', 'n4_westward/stay', 'n4_mlm/refuse_breakup',
    'n5_career_move/setback', 'n5_marriage/breakup_common', 'n5_children/nephews',
    'n5_house/stay_family', 'n5_invest/avoid', 'n5_parents_ill/institution',
    'n5_body_signal/ignore', 'n5_overwork/burn_bridge', 'n5_era_storm/dodge',
    'n6_career_plateau/push_more', 'n6_politics/silence', 'n6_health_reckoning/partial_care',
    'n6_return_home/move_back', 'n6_readjust/double_down', 'n6_parent_dies/was_there',
    'n7_retirement_prep/prepared', 'n7_scam_call/recognize_immediately', 'n7_solo_aging/community',
    'n7_body_ledger/indulge', 'n7_look_back/regret'
  ]
};
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
var LUCKY_SELF_PATH = {
  gen: 1975, gender: "F",
  path: [
    'n0_family/gov_family', 'n1_bookish/push', 'n2_high_school/elite',
    'n3_route/liked_major', 'n3f_headstart/push_back', 'n3_first_love/solo',
    'n4_job/freelance', 'n4_where/stay_local', 'n4f_interview/honest',
    'n4_westward/go', 'n5_career_move/big_jump', 'n5_marriage/stay_single',
    'n5_children/considered_alone', 'n5_house/stay_family', 'n5_invest/avoid',
    'n5_parents_ill/hire_caregiver', 'n5_body_signal/pay_for_it', 'n5_overwork/pace_self',
    'n5_era_storm/dodge', 'n5_emigrate/emigrate_stay', 'n6_career_plateau/accept',
    'n6_long_term_care/hire_full_time', 'n6_politics/try_understand', 'n6_health_reckoning/overwork_still',
    'n6_return_home/commute', 'n6_readjust/let_go', 'n6_parent_dies/was_there',
    'n7_retirement_prep/keep_working', 'n7_scam_call/almost_fell', 'n7_solo_aging/community',
    'n7_body_ledger/indulge', 'n7_look_back/accept'
  ]
};
var LUCKY_QUIET_PATH = {
  gen: 2005, gender: "M",
  path: [
    'n0_family/gov_family', 'n1_bookish/push', 'n2_high_school/elite',
    'n3_route/vocational_college', 'n3m_military/make_bonds', 'n3_first_love/straight_stable',
    'n4_job/public_job', 'n4_where/stay_local', 'n4_replaced/push_up',
    'n5_career_move/steady', 'n5_marriage/breakup_common', 'n5_children/nephews',
    'n5_house/stay_family', 'n5_invest/etf', 'n5_parents_ill/institution',
    'n5_body_signal/pay_for_it', 'n5_overwork/push_through', 'n5_accident/own_injury',
    'n5_era_storm/dodge', 'n6_career_plateau/headhunted', 'n6_politics/silence',
    'n6_health_reckoning/slow_down', 'n6_return_home/bring_them', 'n6_readjust/let_go',
    'n6_parent_dies/handled_it', 'n7_retirement_prep/prepared', 'n7_scam_call/recognize_immediately',
    'n7_solo_aging/community', 'n7_body_ledger/decline', 'n7_look_back/regret'
  ]
};

// 22K的逆襲需要 achieve>=7 又要活著（health>1）、又不能被 hard tier 的錢/健康崩潰或更前面的
// 三明治世代／被騙走的晚年搶走，同樣是窄路，用離線 beam search 找到的實際路徑重播
var LUCKY_22K_PATH = {
  gen: 1990, gender: "F",
  path: [
    'n0_family/single_mom', 'n1_single/scholarship', 'n2_high_school/elite',
    'n3_route/general_uni', 'n3f_headstart/lean_in', 'n3_first_love/straight_stable',
    'n4_job/big_corp', 'n4_where/stay_local', 'n4f_interview/honest',
    'n4_22k/endure', 'n4_mlm/join', 'n5_career_move/big_jump',
    'n5_marriage/marry_common', 'n5_children/have_kids', 'n5_house/buy_leverage',
    'n5_invest/etf', 'n5_parents_ill/hire_caregiver', 'n5_body_signal/ignore',
    'n5_overwork/pace_self', 'n5_debt/credit_cash_card', 'n5_era_storm/dodge',
    'n6_career_plateau/headhunted', 'n6_parenting/repeat_pattern', 'n6_long_term_care/hire_full_time',
    'n6_politics/fight', 'n6_financial_reckoning/collections_call', 'n6_health_reckoning/overwork_still',
    'n6_return_home/bring_them', 'n6_readjust/let_go', 'n6_parent_dies/was_there',
    'n7_retirement_prep/prepared', 'n7_children_settlement/close', 'n7_scam_call/recognize_immediately',
    'n7_solo_aging/comfortable_silence', 'n7_body_ledger/careful', 'n7_look_back/accept'
  ]
};

var LUCKY_ERA_PATH = {
  gen: 2005, gender: "F",
  path: [
    'n0_family/gov_family', 'n1_bookish/hobby', 'n2_high_school/no_school',
    'n3_route/liked_major', 'n3f_headstart/deflect', 'n3_first_love/straight_stable',
    'n4_job/public_job', 'n4_where/stay_local', 'n4f_interview/honest',
    'n4_replaced/pivot', 'n5_career_move/steady', 'n5_marriage/marry_common',
    'n5_children/undecided_f', 'n5_house/rent_forever', 'n5_invest/etf',
    'n5_parents_ill/institution', 'n5_body_signal/ignore', 'n5_overwork/pace_self',
    'n5_era_storm/dodge', 'n5_emigrate/emigrate_stay', 'n6_career_plateau/change_lane',
    'n6_midlife_unemployment/quick_reemploy', 'n6_politics/silence', 'n6_health_reckoning/overwork_still',
    'n6_return_home/move_back', 'n6_readjust/double_down', 'n6_parent_dies/was_there',
    'n7_retirement_prep/prepared', 'n7_scam_call/almost_fell', 'n7_solo_aging/comfortable_silence',
    'n7_body_ledger/careful', 'n7_look_back/accept'
  ]
};

var midbandProof = playScriptedPath(LUCKY_MIDBAND_PATH.gen, LUCKY_MIDBAND_PATH.gender, LUCKY_MIDBAND_PATH.path);
assert(engine.evaluateEnding(midbandProof).id === 'END_剛好的人生',
  '照著記錄下來的路徑重播，應該要拿到「剛好的人生」，實際拿到 ' + engine.evaluateEnding(midbandProof).id);
var selfPathProof = playScriptedPath(LUCKY_SELF_PATH.gen, LUCKY_SELF_PATH.gender, LUCKY_SELF_PATH.path);
assert(engine.evaluateEnding(selfPathProof).id === 'END_自己的路',
  '照著記錄下來的路徑重播，應該要拿到「自己的路」，實際拿到 ' + engine.evaluateEnding(selfPathProof).id);
var quietPathProof = playScriptedPath(LUCKY_QUIET_PATH.gen, LUCKY_QUIET_PATH.gender, LUCKY_QUIET_PATH.path);
assert(engine.evaluateEnding(quietPathProof).id === 'END_靜靜的如果',
  '照著記錄下來的路徑重播，應該要拿到「靜靜的如果」，實際拿到 ' + engine.evaluateEnding(quietPathProof).id);
var comeback22kProof = playScriptedPath(LUCKY_22K_PATH.gen, LUCKY_22K_PATH.gender, LUCKY_22K_PATH.path);
var eraProof = playScriptedPath(LUCKY_ERA_PATH.gen, LUCKY_ERA_PATH.gender, LUCKY_ERA_PATH.path);
assert(engine.evaluateEnding(eraProof).id === 'END_沒被時代選中',
  '照著記錄下來的路徑重播，應該要拿到「沒被時代選中」，實際拿到 ' + engine.evaluateEnding(eraProof).id);
assert(engine.evaluateEnding(comeback22kProof).id === 'END_22K的逆襲',
  '照著記錄下來的路徑重播，應該要拿到「22K的逆襲」，實際拿到 ' + engine.evaluateEnding(comeback22kProof).id);

var targetedProofs = [
  { id: 'END_登記那天', combos: [[1990, 'F'], [1990, 'M']], tries: 600,
    pick: steeringPick({ bond: 0.4, health: 2 }, withBaseline({ n3_first_love: 'same_sex', n3_love_comingout: '90_registered', n5_marriage: 'register_lgbt' })) },
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

// 5d. 場景圖的 prompt 清單：ID 打錯的話會產出一張永遠不會被載入的圖，所以在這裡比對
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

// 5e. 已經產好的場景圖：檔名對不上節點的話那張圖永遠不會被載入，而該節點會變成破圖
var artDir = path.join(__dirname, '..', 'art');
if (fs.existsSync(artDir)) {
  var webps = fs.readdirSync(artDir).filter(function (f) { return /\.webp$/i.test(f); });
  var nodeIdSet = Object.keys(UNREALIZED.nodes);
  var orphan = webps
    .map(function (f) { return f.replace(/\.webp$/i, ''); })
    .filter(function (id) { return nodeIdSet.indexOf(id) === -1; });
  assert(orphan.length === 0,
    'art/ 裡這些圖對不上任何節點，永遠不會被載入（檔名打錯？）: ' + orphan.join(', '));

  var lackImage = nodeIdSet.filter(function (id) {
    return webps.indexOf(id + '.webp') === -1;
  });
  assert(lackImage.length === 0, '這些節點沒有場景圖，畫面上會是破圖: ' + lackImage.join(', '));

  var bytes = webps.reduce(function (sum, f) { return sum + fs.statSync(path.join(artDir, f)).size; }, 0);
  var mb = bytes / 1048576;
  if (webps.length) {
    console.log('[UNREALIZED dev] 場景圖 ' + webps.length + '/' + nodeIdSet.length +
      ' 張，合計 ' + mb.toFixed(1) + ' MB');
  }
  // repo 是給人 clone 下來雙擊就玩的，圖太肥會違背這個前提
  assert(mb < 40, '場景圖合計 ' + mb.toFixed(1) + ' MB，太肥了 —— 壓一下品質或尺寸');
}

// 5f. index.html 的快取版本號要一致。少推一個，那支檔案就會繼續吃舊快取，
//     而症狀是「改了卻沒生效」——很難聯想到版本號沒跟上
var idx = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var vers = (idx.match(/(?:src|href)="[^"]+\?v=([^"&]*)"/g) || []).map(function (m) {
  return m.match(/\?v=([^"&]*)"/)[1];
});
if (vers.length) {
  var uniq = vers.filter(function (v, i) { return vers.indexOf(v) === i; });
  assert(uniq.length === 1, 'index.html 的快取版本號不一致: ' + uniq.join(', '));
  assert(uniq[0] !== '', 'index.html 有空的 ?v=');
  console.log('[UNREALIZED dev] 快取版本號 v' + uniq[0] + '，' + vers.length + ' 個檔案一致。');
}

// 6. 中途收尾：章節 >= 2 時應該都能判定出一個中途結局
[2, 3, 4, 5].forEach(function (chapter) {
  var s = engine.createRunState(1990, 'F');
  s.chapter = chapter;
  var mid = engine.evaluateMidEnding(s);
  assert(!!mid, '章節 ' + chapter + ' 應該能判定中途結局');
});

// 6b. 單身路線要真的跑得通。第5章的婚姻與小孩節點原本無條件假設有伴侶，
//     一路單身的人會被問「決定不婚，繼續在一起」——那段關係根本不存在。
//     這種錯靠玩很難發現：要剛好在第3章選單身，又剛好讀到那一行。
(function soloPathHoldsUp() {
  var PARTNER_ONLY = ['marry_common', 'stay_unmarried', 'breakup_common', 'have_kids', 'dink', 'undecided_f', 'undecided_m'];
  var reached = 0;
  UNREALIZED.config.generations.forEach(function (g) {
    ['M', 'F'].forEach(function (sex) {
      var s = engine.createRunState(g, sex), guard = 0;
      while (!s.ended && guard++ < 80) {
        var node = engine.getNode(s.nodeId);
        var opts = engine.visibleOptions(node, s);
        if (node.id === 'n5_marriage' || node.id === 'n5_children') {
          if (s.flags['單身']) {
            reached++;
            var leak = opts.filter(function (o) { return PARTNER_ONLY.indexOf(o.id) !== -1; });
            assert(leak.length === 0, node.id + ' 對單身玩家露出了預設有伴侶的選項: ' +
              leak.map(function (o) { return o.id; }).join(', '));
            assert(opts.length >= 2, node.id + ' 對單身玩家只剩 ' + opts.length + ' 個選項');
          }
        }
        // 第3章一律選單身，之後隨便走
        var pick = opts.filter(function (o) { return o.id === 'solo' || o.id === 'stay_single' || o.id === 'considered_alone'; })[0] || opts[0];
        engine.applyOption(s, node, pick);
      }
    });
  });
  assert(reached >= 6, '單身路線沒有真的走到婚姻／小孩節點（只有 ' + reached + ' 次），這個檢查等於沒跑');
})();

// 6c. 加了門檻的節點，要真的落在「有時候會、有時候不會」之間。
//     0% 表示門檻寫壞了（自我參照的變體陣列就是這樣，安靜地誰都到不了），
//     100% 表示門檻等於沒有——這兩個都踩過。
(function gatedNodesActuallyGate() {
  var GATED = {
    n4_mlm: ['n4_westward', 'n4_22k', 'n4_replaced'],
    n5_emigrate: ['n5_era_storm'],
    n6_midlife_unemployment: ['n6_career_plateau'],
    n5_debt: ['n5_overwork'],
    // 這兩個節點有好幾條上游（教養、失業、以及各自被跳過時的直通路線），
    // 分母用「進到第6章的人數」才對——n6_career_plateau 是全員必經的第一個節點
    n6_long_term_care: ['n6_career_plateau'],
    n6_marriage_crisis: ['n6_career_plateau'],
    n6_financial_reckoning: ['n6_politics']
  };
  var seen = {}, rnd = 123456789;
  function next() { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff; }
  for (var i = 0; i < 3000; i++) {
    var s = engine.createRunState(UNREALIZED.config.generations[i % 3], i % 2 ? 'F' : 'M'), guard = 0;
    while (!s.ended && guard++ < 80) {
      var node = engine.getNode(s.nodeId);
      var opts = engine.visibleOptions(node, s);
      seen[node.id] = (seen[node.id] || 0) + 1;
      engine.applyOption(s, node, opts[Math.floor(next() * opts.length)]);
    }
  }
  Object.keys(GATED).forEach(function (id) {
    var denom = GATED[id].reduce(function (a, u) { return a + (seen[u] || 0); }, 0);
    assert(denom > 100, id + ' 的上游節點抽樣不足（' + denom + '），這個檢查不可信');
    var rate = (seen[id] || 0) / denom;
    assert(rate > 0.05, id + ' 只有 ' + (rate * 100).toFixed(0) + '% 會觸發，門檻可能寫壞了');
    assert(rate < 0.95, id + ' 有 ' + (rate * 100).toFixed(0) + '% 會觸發，門檻等於沒有');
  });
})();

// 6d. 敘述與實況不能互相矛盾。前提檢查（6c）看的是「節點該不該出現」，
//     這裡看的是「出現的那段文字，講的事情在這一局成不成立」——
//     例如對成家有小孩的人說「你現在一個人住」，或對沒有小孩的人說「孩子還會回來吃飯」。
//     這種錯畫面不會壞，只會荒謬，而且只在特定旗標組合下出現。
(function narrationMatchesReality() {
  var CLAIMS = [
    { re: /一個人住|獨居/, ok: function (s) { return s.flags['分開'] || s.flags['單身'] || (!s.flags['成家'] && !s.flags['同性伴侶'] && !s.flags['未婚']); }, what: '說「一個人住」，但這局有伴侶' },
    { re: /孩子(會|還|大了|長大)|你的小孩/, ok: function (s) { return !!s.flags['有小孩']; }, what: '把孩子當既成事實，但這局沒有小孩' },
    { re: /你們兩個|另一半|老伴/, ok: function (s) { return s.flags['成家'] || s.flags['同性伴侶'] || s.flags['未婚']; }, what: '提到伴侶，但這局沒有' },
    { re: /欠的、借的、賭的|催收/, ok: function (s) { return s.flags['借貸'] || s.flags['高槓桿'] || s.flags['投機']; }, what: '提到債務，但這局沒欠過錢' }
  ];
  var bad = {}, rnd = 987654321;
  function next() { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff; }
  for (var i = 0; i < 3000; i++) {
    var s = engine.createRunState(UNREALIZED.config.generations[i % 3], i % 2 ? 'F' : 'M'), guard = 0;
    while (!s.ended && guard++ < 80) {
      var node = engine.getNode(s.nodeId);
      var opts = engine.visibleOptions(node, s);
      var txt = engine.resolveText(node.text, s);
      CLAIMS.forEach(function (c) {
        if (c.re.test(txt) && !c.ok(s)) bad[node.id + ' — ' + c.what] = (bad[node.id + ' — ' + c.what] || 0) + 1;
      });
      engine.applyOption(s, node, opts[Math.floor(next() * opts.length)]);
    }
    var end = engine.evaluateEnding(s);
    if (!end) continue;
    var full = engine.personalizeEnding(end, s);
    CLAIMS.forEach(function (c) {
      if (c.re.test(full) && !c.ok(s)) bad[end.id + ' — ' + c.what] = (bad[end.id + ' — ' + c.what] || 0) + 1;
    });
  }
  var found = Object.keys(bad);
  assert(found.length === 0, '敘述跟這一局的實況矛盾:\n    ' +
    found.map(function (k) { return bad[k] + ' 次  ' + k; }).join('\n    '));
})();

// 6e. 旗標組合上的矛盾：同時成立就代表某個節點的選項少了 requires
(function impossibleFlagPairs() {
  var IMPOSSIBLE = [
    { a: '丁客', b: '有小孩', what: '決定不生，卻有小孩' },
    { a: '單身', b: '成家', what: '單身旗標沒被清掉，卻又成家' },
    { a: '送機構', b: '照顧', what: '第5章送機構，第6章又自己扛' }
  ];
  var bad = {}, rnd = 55555;
  function next() { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff; }
  for (var i = 0; i < 3000; i++) {
    var s = engine.createRunState(UNREALIZED.config.generations[i % 3], i % 2 ? 'F' : 'M'), guard = 0;
    while (!s.ended && guard++ < 80) {
      var node = engine.getNode(s.nodeId);
      var opts = engine.visibleOptions(node, s);
      engine.applyOption(s, node, opts[Math.floor(next() * opts.length)]);
    }
    IMPOSSIBLE.forEach(function (p) {
      if (s.flags[p.a] && s.flags[p.b]) bad[p.a + '+' + p.b + '（' + p.what + '）'] = (bad[p.a + '+' + p.b + '（' + p.what + '）'] || 0) + 1;
    });
    // 1975 的同性伴侶要有小孩，只有走過一段對外的婚姻這一條路
    if (s.generation === 1975 && s.flags['同性伴侶'] && s.flags['有小孩'] && !s.flags['未出櫃']) {
      bad['1975 同性伴侶有小孩、卻沒走過那段對外婚姻'] = (bad['1975 同性伴侶有小孩、卻沒走過那段對外婚姻'] || 0) + 1;
    }
  }
  var found = Object.keys(bad);
  assert(found.length === 0, '不該同時成立的旗標組合: ' + found.map(function (k) { return k + ' ×' + bad[k]; }).join('；'));
})();

// 7. 詞彙字典：至少 25 組，替換後不留佔位符，而且每一組都真的被用到。
//    寫了 26 組卻只有 6 組出現在腳本裡過——字典查得到，但玩起來完全沒有時代感。
var lexiconKeys = Object.keys(UNREALIZED.lexicon);
assert(lexiconKeys.length >= 25, '詞彙字典應至少 25 組，目前 ' + lexiconKeys.length);
(function everyLexiconEntryIsUsed() {
  var script = ['data/nodes-ch0-3.js', 'data/nodes-ch4-5.js', 'data/nodes-ch6-7.js', 'data/endings.js']
    .map(function (f) { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); }).join('\n');
  var unused = lexiconKeys.filter(function (k) { return script.indexOf(k) === -1; });
  assert(unused.length === 0, '這些詞彙從來沒被腳本用到（等於白寫）: ' + unused.join(' '));
})();
UNREALIZED.config.generations.forEach(function (g) {
  var s = engine.createRunState(g, 'M');
  var text = engine.substituteLexicon('{升學考試}與{起薪}', s);
  assert(!/\{[^{}]+\}/.test(text), '詞彙替換後不應留下佔位符: ' + text);
});

// 8. 完整結局應至少有 28 個
var fullEndingCount = UNREALIZED.endings.full.length;
assert(fullEndingCount >= 36, '完整結局應至少 36 個，目前 ' + fullEndingCount);

// 9. 個人化段落：至少一個旗標組合能讓結局文字被加上額外段落
var stateWithFlags = engine.createRunState(1990, 'F');
stateWithFlags.flags['成家'] = true;
var baseEnding = engine.getEnding('END_有得有失');
var personalized = engine.personalizeEnding(baseEnding, stateWithFlags);
assert(personalized.length > baseEnding.text.length, '有旗標時，個人化段落應該讓結局文字變長');

console.log('全部 ' + assertCount + ' 項檢查通過。完整結局數：' + fullEndingCount);
