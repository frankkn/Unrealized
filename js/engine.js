(function (global) {
  'use strict';
  var UNREALIZED = global.UNREALIZED = global.UNREALIZED || {};
  var cfg = UNREALIZED.config;

  function clamp(v) {
    return Math.max(cfg.attrMin, Math.min(cfg.attrMax, v));
  }

  function createRunState(generation, gender) {
    var attrs = {};
    cfg.attributes.forEach(function (a) { attrs[a.key] = cfg.attrStart; });
    return {
      generation: generation,
      gender: gender,
      attrs: attrs,
      flags: {},
      nodeId: cfg.startNode,
      chapter: 0,
      history: [],
      ended: false,
      endingId: null
    };
  }

  function hasFlag(state, flag) { return !!state.flags[flag]; }
  function addFlag(state, flag) { state.flags[flag] = true; }
  function flagList(state) { return Object.keys(state.flags); }

  function matchAttr(check, state) {
    var v = state.attrs[check.key];
    switch (check.op) {
      case '<=': return v <= check.value;
      case '>=': return v >= check.value;
      case '<': return v < check.value;
      case '>': return v > check.value;
      case '==': return v === check.value;
      default: throw new Error('unknown op: ' + check.op);
    }
  }

  // 條件判定：cond 可以是 function(state)，也可以是宣告式物件
  // { generation, gender, flagsAll, flagsAny, flagsNone, attr, attrs }
  function when(cond, state) {
    if (!cond) return true;
    if (typeof cond === 'function') return !!cond(state, UNREALIZED.engine.helpers);
    if (cond.generation !== undefined) {
      var gens = Array.isArray(cond.generation) ? cond.generation : [cond.generation];
      if (gens.indexOf(state.generation) === -1) return false;
    }
    if (cond.gender !== undefined) {
      var genders = Array.isArray(cond.gender) ? cond.gender : [cond.gender];
      if (genders.indexOf(state.gender) === -1) return false;
    }
    if (cond.flagsAll && !cond.flagsAll.every(function (f) { return hasFlag(state, f); })) return false;
    if (cond.flagsAny && !cond.flagsAny.some(function (f) { return hasFlag(state, f); })) return false;
    if (cond.flagsNone && cond.flagsNone.some(function (f) { return hasFlag(state, f); })) return false;
    if (cond.attr && !matchAttr(cond.attr, state)) return false;
    if (cond.attrs && !cond.attrs.every(function (c) { return matchAttr(c, state); })) return false;
    return true;
  }

  // variants: [{when, [field]: value}, ...]，依序找第一個符合條件的，最後一個通常不帶 when 當預設
  function pickVariant(variants, state, field) {
    for (var i = 0; i < variants.length; i++) {
      if (when(variants[i].when, state)) return variants[i][field];
    }
    return undefined;
  }

  function substituteLexicon(text, state) {
    if (!text) return text;
    return text.replace(/\{[^{}]+\}/g, function (token) {
      var entry = UNREALIZED.lexicon[token];
      if (!entry) return token;
      return entry[state.generation] || token;
    });
  }

  // 跟 resolveNext 一樣要能嵌套：有些敘述是兩個維度交叉的（是不是一個人住 × 世代），
  // 攤平寫會變成一串條件都要重複寫一遍，而漏掉一格是看不出來的。
  function resolveText(field, state) {
    var raw = field;
    var guard = 0;
    while (Array.isArray(raw)) {
      if (++guard > 10) throw new Error('text 的變體陣列嵌套太深，可能繞成環了');
      raw = pickVariant(raw, state, 'text');
    }
    return substituteLexicon(typeof raw === 'string' ? raw : '', state);
  }

  function getNode(id) {
    var node = UNREALIZED.nodes[id];
    if (!node) throw new Error('unknown node: ' + id);
    return node;
  }

  function visibleOptions(node, state) {
    return node.options.filter(function (o) { return when(o.requires, state); });
  }

  // 變體陣列可以嵌套：一段路由條件可以整段被另一段引用（第6章的長照/婚變就這樣組合）。
  // 少了這個迴圈，嵌套時會把整個陣列當成 nodeId 塞進 state，而症狀是「跳到一個
  // 叫做 [object Object] 的節點」——很難聯想到是路由組合出來的。
  // 從池子裡抽 N 個。變體陣列是「第一個成立的勝出」，池子是「全部成立的裡面抽幾個演」。
  //
  // 為什麼需要它：第 5、6 章各寫了 13 個節點，而一局會走過 10.6 和 8.8 個——
  // 前提檢查管的是「這件事對你成不成立」，不是「這一局要不要演它」，所以只要成立就一定演。
  // 結果是同世代連玩兩局，第二局有 90% 的節點是看過的，而這個遊戲是設計來玩六輪的。
  //
  // 抽選必須**可重播**：測試用重播固定的選擇序列來證明稀有結局，用 Math.random 會整個垮掉。
  // 所以亂數種子取自這一局到目前為止的歷史——同樣的選擇序列必得同一個池子，
  // 而不同的前段選擇會抽到不同的中段。
  function seedFrom(state) {
    var s = state.generation + '/' + state.gender;
    for (var i = 0; i < state.history.length; i++) s += '|' + state.history[i].optionId;
    var h = 2166136261;
    for (var j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = (h * 16777619) >>> 0; }
    return h;
  }
  function drawFromPool(pool, state) {
    if (!pool.id) throw new Error('池子必須有 id，否則兩章的佇列會互相蓋掉');
    state.pools = state.pools || {};
    // 存的是「洗好的順序」而不是選好的節點，因為 when 要在**抽的當下**才算——
    // 章節中途發生的事（買了房、錢變緊）本來就該影響後面還演不演某一段。
    // 而且 state 會被 JSON 複製（find-paths 在用），所以只能存索引，不能存帶函式的物件。
    if (!state.pools[pool.id]) {
      var order = pool.of.map(function (_, i) { return i; });
      var seed = seedFrom(state);
      function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
      for (var i = order.length - 1; i > 0; i--) {
        var k = Math.floor(rnd() * (i + 1));
        var t = order[i]; order[i] = order[k]; order[k] = t;
      }
      state.pools[pool.id] = { order: order, served: 0 };
    }
    var q = state.pools[pool.id];
    while (q.order.length && q.served < pool.pick) {
      var entry = pool.of[q.order.shift()];
      if (when(entry.when, state)) { q.served++; return entry.next; }
    }
    return pool.then;
  }

  function resolveNext(option, state) {
    var next = option.next;
    var guard = 0;
    while (Array.isArray(next) || (next && next.of)) {
      if (++guard > 10) throw new Error('next 的路由嵌套太深，可能繞成環了');
      next = Array.isArray(next) ? pickVariant(next, state, 'next') : drawFromPool(next, state);
    }
    return next;
  }

  function resolveEndingId(option, state) {
    if (Array.isArray(option.endingId)) return pickVariant(option.endingId, state, 'endingId');
    return option.endingId;
  }

  // 時間本身的效果：跨過的每一個章節各套用一次（一步跳過多章時不會漏算）
  function applyChapterDrift(state, fromChapter, toChapter) {
    for (var ch = fromChapter + 1; ch <= toChapter; ch++) {
      var drift = cfg.chapterDrift[ch];
      if (!drift) continue;
      Object.keys(drift).forEach(function (key) {
        state.attrs[key] = clamp(state.attrs[key] + drift[key]);
      });
    }
  }

  // 套用選項效果，回傳 { ended, endingId } 讓 UI 決定下一步渲染
  function applyOption(state, node, option) {
    Object.keys(option.effects || {}).forEach(function (key) {
      state.attrs[key] = clamp(state.attrs[key] + option.effects[key]);
    });
    (option.flags || []).forEach(function (f) { addFlag(state, f); });
    // 有些狀態會變回去：單身的人在三十幾歲遇到了對象，「單身」就不再成立。
    // 少了這個，旗標只能加不能減，下游只好去猜「有 A 但也有 B 所以其實是 C」。
    (option.unflags || []).forEach(function (f) { delete state.flags[f]; });
    state.history.push({ nodeId: node.id, optionId: option.id, chapter: node.chapter });
    if (node.chapter > state.chapter) {
      applyChapterDrift(state, state.chapter, node.chapter);
      state.chapter = node.chapter;
    }

    var directEnding = resolveEndingId(option, state);
    if (directEnding) {
      state.ended = true;
      state.endingId = directEnding;
      state.nodeId = null;
      return { ended: true, direct: true };
    }

    var next = resolveNext(option, state);
    // 結束只能是「明講的」。falsy 的 next 曾經也被當成正常結束，於是一張寫壞的
    // 路由表（變體陣列自我參照 → undefined）會安靜地把整局收掉，跑六千局都不出聲，
    // 而症狀只是「那個節點怎麼都不出現」。這種錯要當場炸，不要偽裝成結局。
    if (next === 'GAME_END') {
      state.ended = true;
      state.nodeId = null;
      return { ended: true, direct: false };
    }
    if (!next) throw new Error(node.id + '/' + option.id + ' 的 next 解不出節點（要結束請寫 GAME_END）');
    state.nodeId = next;
    return { ended: false };
  }

  function requestMidEnding(state) {
    state.ended = true;
    state.quit = true;
    state.nodeId = null;
  }

  // ---- 結局判定 §7.5 ----
  // 依序：硬觸發 → 世代限定 → 旗標組合 → 最突出屬性 → 兜底
  // 同一 tier 內用資料檔的排列順序，先中者勝
  // 'whole' 排在單軸與世代限定之前：描述「整個人生的形狀」的結局，
  // 比「某一軸很突出」更難達成也更準確，不該被單軸的搶先蓋掉。
  // （但仍然排在 hard 之後——身體歸零就是身體歸零，其他再好都不改變那件事。）
  // tier 分布一度很偏（generation 40% / flagCombo 24% / attribute 5%），試過把
  // flagCombo 提到 generation 前面 —— 結果更糟：flagCombo 有 15 個結局，提前之後
  // 它自己吃掉 62%，而且把「登記那天」「竹科的股票」整個蓋掉。
  //
  // 真正的原因不是順序，是**個別條件太鬆**：END_22K的逆襲 只要 achieve>=6，
  // 而成就中位數是 8~9，等於「你是 1990」就會拿到它，一個結局吃掉整個世代。
  // 收緊那兩個之後，同樣的順序就變成 23/0/34/35/7/1，均勻得多。
  var TIER_ORDER = ['hard', 'whole', 'generation', 'flagCombo', 'attribute', 'fallback'];

  function findMatch(list, state) {
    for (var i = 0; i < list.length; i++) {
      if (when(list[i].when, state)) return list[i];
    }
    return null;
  }

  function evaluateEnding(state) {
    if (state.endingId) return getEnding(state.endingId);
    var byTier = {};
    UNREALIZED.endings.full.forEach(function (e) {
      byTier[e.tier] = byTier[e.tier] || [];
      byTier[e.tier].push(e);
    });
    for (var i = 0; i < TIER_ORDER.length; i++) {
      var tier = TIER_ORDER[i];
      var match = findMatch(byTier[tier] || [], state);
      if (match) {
        state.endingId = match.id;
        return match;
      }
    }
    throw new Error('no ending matched — 兜底 tier 必須有一個 when:true 的結局');
  }

  function evaluateMidEnding(state) {
    var match = findMatch(UNREALIZED.endings.mid, state);
    if (!match) throw new Error('no mid-ending matched — 兜底必須有一個 when:true 的結局');
    return match;
  }

  function getEnding(id) {
    var found = UNREALIZED.endings.full.filter(function (e) { return e.id === id; })[0];
    if (!found) throw new Error('unknown ending: ' + id);
    return found;
  }

  // 骨架文字選定後，依旗標插入最多兩段個人化段落（§7.5）
  // 用 \n\n 串接（跟 UI 分段的規則一致），並統一跑一次詞彙替換——
  // 現在的結局文字剛好都沒有 {token}，但少了這步，哪天結局裡寫了 {起薪} 就會漏替換
  function personalizeEnding(ending, state) {
    var pool = UNREALIZED.endings.personalizations || [];
    var matched = pool.filter(function (p) { return when(p.when, state); }).slice(0, 2);
    // 結局本文也走 resolveText：有些結局的前提不是二分的（有沒有小孩、有沒有伴侶），
    // 條件收緊會讓結局變得太難拿到，改寫成通用的又會失去具體的畫面。
    // 讓它能用變體陣列，就可以「同一個結局，兩種家裡」。
    var parts = [resolveText(ending.text, state)].concat(matched.map(function (p) { return p.text; }));
    return substituteLexicon(parts.join('\n\n'), state);
  }

  // ---- 給資料檔用的小工具（判定中途收尾／屬性型結局時要用）----
  function minAttrKey(state) {
    var keys = cfg.attributes.map(function (a) { return a.key; });
    return keys.reduce(function (min, k) { return state.attrs[k] < state.attrs[min] ? k : min; }, keys[0]);
  }
  function maxAttrKey(state) {
    var keys = cfg.attributes.map(function (a) { return a.key; });
    return keys.reduce(function (max, k) { return state.attrs[k] > state.attrs[max] ? k : max; }, keys[0]);
  }
  function isMidBand(state, lo, hi) {
    lo = lo === undefined ? 4 : lo;
    hi = hi === undefined ? 6 : hi;
    return cfg.attributes.every(function (a) { return state.attrs[a.key] >= lo && state.attrs[a.key] <= hi; });
  }
  function currentAge(state) {
    return cfg.chapterAge[state.chapter] || 0;
  }

  // ---- dev-mode 驗證：掃過所有節點，找出違反「沒有免費的選擇」鐵則的選項 ----
  // 鐵則約束的是「淨值」不是「一定要有下降」：任何選項至少變動兩軸，且五軸加總不得超過 +1。
  // 早期版本強制「至少一軸下降」，但那是單邊約束——只規定要扣、沒規定要給，
  // 於是每個選項平均都在扣，整局走完玩家的五軸總和被砍半。而且作者需要一個代價卻
  // 沒有貼切的軸可扣時，就會隨手抓一軸，health 一度就是這樣變成萬用扣點的。
  // 「人生沒有免費的選擇」講的是取捨，不是衰退。
  // 「提升必有犧牲」這條原則已經取消。
  // 它最初是「人生沒有免費的選擇」，但實作出來的效果是：每一個顧健康、顧家庭、
  // 慢下來的選項都在扣成就，玩到最後健康與自我滿分、事業歸零，讀起來像是
  // 「在乎生活就會毀掉事業」——那比原本要講的話強烈得多，也悲觀得多。
  //
  // 現在只留一個上限，避免單一選項一次翻盤整局；選項可以是純粹的好事。
  // 仍然要求至少變動兩軸，選擇才有質地，不會變成一排「+1」。
  var MAX_NET_GAIN = 3;
  function devValidateNodes() {
    var violations = [];
    Object.keys(UNREALIZED.nodes).forEach(function (nodeId) {
      var node = UNREALIZED.nodes[nodeId];
      node.options.forEach(function (opt) {
        if (opt.exemptRule) return;
        var effects = opt.effects || {};
        var changed = Object.keys(effects).filter(function (k) { return effects[k] !== 0; });
        var net = changed.reduce(function (sum, k) { return sum + effects[k]; }, 0);
        if (changed.length < 2) {
          violations.push(nodeId + ' / ' + opt.id + ' — 只變動 ' + changed.length + ' 軸，至少要兩軸');
        } else if (net > MAX_NET_GAIN) {
          violations.push(nodeId + ' / ' + opt.id + ' — 淨值 +' + net + '，超過上限 +' + MAX_NET_GAIN);
        }
      });
    });
    if (violations.length) {
      console.warn('[UNREALIZED dev] 違反「沒有純加分選項」鐵則：');
      violations.forEach(function (v) { console.warn('  ' + v); });
    } else {
      console.log('[UNREALIZED dev] 所有選項都符合鐵則。');
    }
    return violations;
  }

  // ---- dev-mode：靜態掃過節點圖，找出「從 startNode 走不到」的節點，以及指向不存在節點的斷鏈 ----
  // 不評估 when 條件（不管條件真假都算一條可能的路），是寬鬆但足以抓錯字/漏接的判斷方式
  function flattenNextTargets(nextField) {
    if (!nextField) return [];
    if (typeof nextField === 'string') return nextField === 'GAME_END' ? [] : [nextField];
    if (Array.isArray(nextField)) {
      return nextField.reduce(function (acc, variant) { return acc.concat(flattenNextTargets(variant.next)); }, []);
    }
    // 池子：池裡每一項，加上抽完之後的出口，全都是這個選項可能去的地方
    if (nextField.of) {
      return nextField.of
        .reduce(function (acc, e) { return acc.concat(flattenNextTargets(e.next)); }, [])
        .concat(flattenNextTargets(nextField.then));
    }
    return [];
  }

  function devAnalyzeGraph() {
    var visited = {};
    var danglingLinks = [];
    var queue = [cfg.startNode];
    visited[cfg.startNode] = true;
    while (queue.length) {
      var id = queue.shift();
      var node = UNREALIZED.nodes[id];
      if (!node) continue;
      node.options.forEach(function (opt) {
        flattenNextTargets(opt.next).forEach(function (target) {
          if (!UNREALIZED.nodes[target]) {
            danglingLinks.push(node.id + ' / ' + opt.id + ' → 不存在的節點 "' + target + '"');
            return;
          }
          if (!visited[target]) {
            visited[target] = true;
            queue.push(target);
          }
        });
      });
    }
    var unreachableNodes = Object.keys(UNREALIZED.nodes).filter(function (id) { return !visited[id]; });
    return { unreachableNodes: unreachableNodes, danglingLinks: danglingLinks };
  }

  function devReportGraph() {
    var result = devAnalyzeGraph();
    if (result.unreachableNodes.length) {
      console.warn('[UNREALIZED dev] 從 startNode 走不到的節點：', result.unreachableNodes);
    } else {
      console.log('[UNREALIZED dev] 所有節點都能從 startNode 走到（靜態分析，未考慮 when 條件真假）。');
    }
    if (result.danglingLinks.length) {
      console.warn('[UNREALIZED dev] 指向不存在節點的斷鏈：');
      result.danglingLinks.forEach(function (l) { console.warn('  ' + l); });
    } else {
      console.log('[UNREALIZED dev] 沒有斷鏈。');
    }
    return result;
  }

  UNREALIZED.engine = {
    createRunState: createRunState,
    hasFlag: hasFlag,
    flagList: flagList,
    when: when,
    resolveText: resolveText,
    substituteLexicon: substituteLexicon,
    getNode: getNode,
    visibleOptions: visibleOptions,
    applyOption: applyOption,
    requestMidEnding: requestMidEnding,
    evaluateEnding: evaluateEnding,
    evaluateMidEnding: evaluateMidEnding,
    getEnding: getEnding,
    personalizeEnding: personalizeEnding,
    devValidateNodes: devValidateNodes,
    devAnalyzeGraph: devAnalyzeGraph,
    devReportGraph: devReportGraph,
    helpers: {
      minAttrKey: minAttrKey,
      maxAttrKey: maxAttrKey,
      isMidBand: isMidBand,
      currentAge: currentAge,
      hasFlag: hasFlag
    }
  };
})(window);
