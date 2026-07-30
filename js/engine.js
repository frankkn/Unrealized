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

  function resolveText(field, state) {
    var raw;
    if (typeof field === 'string') raw = field;
    else if (Array.isArray(field)) raw = pickVariant(field, state, 'text');
    else raw = '';
    return substituteLexicon(raw || '', state);
  }

  function getNode(id) {
    var node = UNREALIZED.nodes[id];
    if (!node) throw new Error('unknown node: ' + id);
    return node;
  }

  function visibleOptions(node, state) {
    return node.options.filter(function (o) { return when(o.requires, state); });
  }

  function resolveNext(option, state) {
    if (Array.isArray(option.next)) return pickVariant(option.next, state, 'next');
    return option.next;
  }

  function resolveEndingId(option, state) {
    if (Array.isArray(option.endingId)) return pickVariant(option.endingId, state, 'endingId');
    return option.endingId;
  }

  // 套用選項效果，回傳 { ended, endingId } 讓 UI 決定下一步渲染
  function applyOption(state, node, option) {
    Object.keys(option.effects || {}).forEach(function (key) {
      state.attrs[key] = clamp(state.attrs[key] + option.effects[key]);
    });
    (option.flags || []).forEach(function (f) { addFlag(state, f); });
    state.history.push({ nodeId: node.id, optionId: option.id, chapter: node.chapter });
    if (node.chapter > state.chapter) state.chapter = node.chapter;

    var directEnding = resolveEndingId(option, state);
    if (directEnding) {
      state.ended = true;
      state.endingId = directEnding;
      state.nodeId = null;
      return { ended: true, direct: true };
    }

    var next = resolveNext(option, state);
    if (!next || next === 'GAME_END') {
      state.ended = true;
      state.nodeId = null;
      return { ended: true, direct: false };
    }
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
  var TIER_ORDER = ['hard', 'generation', 'flagCombo', 'attribute', 'fallback'];

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
  function personalizeEnding(ending, state) {
    var pool = UNREALIZED.endings.personalizations || [];
    var matched = pool.filter(function (p) { return when(p.when, state); }).slice(0, 2);
    if (!matched.length) return ending.text;
    return ending.text + '\n\n' + matched.map(function (p) { return p.text; }).join('\n');
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

  // ---- dev-mode 驗證：掃過所有節點，找出違反「沒有純加分選項」鐵則的選項 ----
  function devValidateNodes() {
    var violations = [];
    Object.keys(UNREALIZED.nodes).forEach(function (nodeId) {
      var node = UNREALIZED.nodes[nodeId];
      node.options.forEach(function (opt) {
        if (opt.exemptRule) return;
        var effects = opt.effects || {};
        var changed = Object.keys(effects).filter(function (k) { return effects[k] !== 0; });
        var hasDrop = changed.some(function (k) { return effects[k] < 0; });
        if (changed.length < 2 || !hasDrop) {
          violations.push(nodeId + ' / ' + opt.id + ' — 變動軸數:' + changed.length + ' 有下降:' + hasDrop);
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
    helpers: {
      minAttrKey: minAttrKey,
      maxAttrKey: maxAttrKey,
      isMidBand: isMidBand,
      currentAge: currentAge,
      hasFlag: hasFlag
    }
  };
})(window);
