(function (global) {
  'use strict';
  var UNREALIZED = global.UNREALIZED;
  var engine = UNREALIZED.engine;
  var store = UNREALIZED.store;
  var cfg = UNREALIZED.config;

  var app = document.getElementById('app');
  var runState = null;
  var picked = { generation: null, gender: null };
  var settings = store.getSettings();
  applyMotionPref();

  function applyMotionPref() {
    document.documentElement.classList.toggle('no-motion', !!settings.reducedMotion);
  }

  // 場景圖：直接輸出 <img>。45 張都在版控裡，所以不需要備援，也不需要
  // 「先畫佔位再換圖」那套漸進載入 —— 少一層機制就少一層會壞的東西。
  function sceneHtml(nodeId) {
    return '<div class="node-scene">' +
      '<img class="scene-img" src="art/' + nodeId + '.webp?v=3" alt="" aria-hidden="true">' +
      '</div>';
  }

  function attrRow(state) {
    return cfg.attributes.map(function (a) {
      return '<div class="attr-row"><span class="attr-label">' + a.label + '</span>' +
        '<div class="attr-bar"><div class="attr-fill" style="width:' + (state.attrs[a.key] * 10) + '%"></div></div>' +
        '<span class="attr-value">' + state.attrs[a.key] + '</span></div>';
    }).join('');
  }

  function renderStart() {
    var lastRun = store.getLastRun();
    var html = '';
    html += '<header class="passbook-cover"><h1>UNREALIZED</h1><p class="subtitle">人生存摺 — a Taiwanese life, in three generations</p></header>';
    html += '<section class="picker">';
    html += '<h2>你是哪一屆？</h2><div class="choice-row" data-role="gen">';
    cfg.generations.forEach(function (g) {
      html += '<button class="choice-btn' + (picked.generation === g ? ' selected' : '') + '" data-gen="' + g + '">' + cfg.generationLabels[g] + '</button>';
    });
    html += '</div>';
    html += '<h2>你是？</h2><div class="choice-row" data-role="gender">';
    cfg.genders.forEach(function (g) {
      html += '<button class="choice-btn' + (picked.gender === g ? ' selected' : '') + '" data-gender="' + g + '">' + cfg.genderLabels[g] + '</button>';
    });
    html += '</div>';
    html += '<button class="primary-btn" id="start-btn"' + (picked.generation && picked.gender ? '' : ' disabled') + '>開始這一局</button>';
    if (lastRun) {
      html += '<button class="link-btn" id="replay-btn">快速重玩上一局：' + cfg.generationLabels[lastRun.generation] + ' · ' + cfg.genderLabels[lastRun.gender] + '</button>';
    }
    html += '</section>';
    html += '<footer class="start-footer">';
    html += '<button class="link-btn" id="codex-btn">結局圖鑑</button>';
    html += '<label class="settings-toggle"><input type="checkbox" id="motion-toggle"' + (settings.reducedMotion ? ' checked' : '') + '> 減少動畫</label>';
    html += '</footer>';
    app.innerHTML = html;

    app.querySelectorAll('[data-gen]').forEach(function (btn) {
      btn.addEventListener('click', function () { picked.generation = Number(btn.dataset.gen); renderStart(); });
    });
    app.querySelectorAll('[data-gender]').forEach(function (btn) {
      btn.addEventListener('click', function () { picked.gender = btn.dataset.gender; renderStart(); });
    });
    var startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', function () { startRun(picked.generation, picked.gender); });
    var replayBtn = document.getElementById('replay-btn');
    if (replayBtn) replayBtn.addEventListener('click', function () { startRun(lastRun.generation, lastRun.gender); });
    document.getElementById('codex-btn').addEventListener('click', function () { renderCodex(renderStart); });
    document.getElementById('motion-toggle').addEventListener('change', function (e) {
      settings.reducedMotion = e.target.checked;
      store.saveSettings(settings);
      applyMotionPref();
    });
  }

  function startRun(generation, gender) {
    runState = engine.createRunState(generation, gender);
    store.saveLastRun({ generation: generation, gender: gender });
    renderNode();
  }

  function renderNode() {
    var node = engine.getNode(runState.nodeId);
    var options = engine.visibleOptions(node, runState);
    var canQuit = runState.chapter >= 2;
    var html = '';
    html += '<header class="run-header">';
    html += '<span class="badge">' + cfg.generationLabels[runState.generation] + ' · ' + cfg.genderLabels[runState.gender] + '</span>';
    html += '</header>';
    html += '<article class="page stamp-drop">';
    html += '<h2 class="chapter-title">第' + node.chapter + '章 · ' + node.title + '<span class="age-range">' + node.ageRange + '</span></h2>';
    html += '<p class="node-text">' + engine.resolveText(node.text, runState) + '</p>';
    html += '</article>';
    html += '<div class="options">';
    options.forEach(function (opt, i) {
      html += '<button class="option-btn" data-opt="' + i + '">' + engine.resolveText(opt.label, runState) + '</button>';
    });
    html += '</div>';
    if (canQuit) {
      html += '<button class="link-btn quit-btn" id="quit-btn">就在這裡收尾，看看我的存摺</button>';
    }
    // 插圖擺在整頁最下方：先讀完敘述、做完選擇，畫面才收在那張圖上
    html += sceneHtml(node.id);
    app.innerHTML = html;

    app.querySelectorAll('[data-opt]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var option = options[Number(btn.dataset.opt)];
        engine.applyOption(runState, node, option);
        if (runState.ended) {
          showEnding(engine.evaluateEnding(runState), false);
        } else {
          renderNode();
        }
      });
    });
    var quitBtn = document.getElementById('quit-btn');
    if (quitBtn) quitBtn.addEventListener('click', function () {
      engine.requestMidEnding(runState);
      showEnding(engine.evaluateMidEnding(runState), true);
    });
  }

  // 解鎖只能發生一次；重畫結局畫面（例如從圖鑑返回）不該再記一次，
  // 否則圖鑑的「解鎖 N 次」會隨著你來回翻而虛胖
  function showEnding(ending, isMid) {
    store.unlockEnding(ending.id, runState.generation, runState.gender, Date.now());
    renderEnding(ending, isMid);
  }

  function renderEnding(ending, isMid) {
    var fullText = isMid ? ending.text : engine.personalizeEnding(ending, runState);
    var paragraphs = fullText.split('\n\n').map(function (p) { return '<p class="ending-text">' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
    var html = '';
    html += '<article class="page ending-page">';
    html += '<div class="stamp-circle stamp-drop">' + ending.title + '</div>';
    if (!isMid) html += '<div class="attr-reveal">' + attrRow(runState) + '</div>';
    html += paragraphs;
    html += '</article>';
    html += '<div class="options">';
    html += '<button class="primary-btn" id="again-btn">再玩一次</button>';
    html += '<button class="link-btn" id="codex-btn-2">看結局圖鑑</button>';
    html += '</div>';
    app.innerHTML = html;
    document.getElementById('again-btn').addEventListener('click', function () { runState = null; renderStart(); });
    document.getElementById('codex-btn-2').addEventListener('click', function () {
      renderCodex(function () { renderEnding(ending, isMid); });
    });
  }

  function codexItemHtml(e, codex) {
    var entry = codex[e.id];
    var unlocked = !!entry;
    var html = '<div class="codex-item' + (unlocked ? '' : ' locked') + '">';
    html += '<span class="codex-silhouette">' + (unlocked ? '●' : '■') + '</span>';
    html += '<span class="codex-main">';
    html += '<span class="codex-title">' + (unlocked ? e.title : '？？？') + '</span>';
    var tags = '<span class="codex-tags">';
    tags += '<span class="codex-tag rarity-' + (e.rarity || '') + '">' + (e.rarity || '') + '</span>';
    if (e.limitedTo) {
      tags += '<span class="codex-tag">' + e.limitedTo.join('/') + ' 限定</span>';
    }
    tags += '</span>';
    html += tags;
    html += '</span>';
    if (unlocked) {
      html += '<span class="codex-count">解鎖 ' + entry.count + ' 次 · ' + entry.generations.join('/') + '</span>';
    }
    html += '</div>';
    return html;
  }

  // returnTo 是「返回」要回去的畫面。原本這裡用 runState 是否存在來猜，
  // 但一局結束後 runState 仍在、nodeId 卻已經是 null，renderNode() 會直接拋例外，
  // 按鈕看起來就像沒反應。來源只有呼叫的人知道，所以由呼叫的人交代。
  function renderCodex(returnTo) {
    var codex = store.getCodex();
    var fullEndings = UNREALIZED.endings.full;
    var midEndings = UNREALIZED.endings.mid;
    var unlockedFull = fullEndings.filter(function (e) { return codex[e.id]; }).length;
    var unlockedMid = midEndings.filter(function (e) { return codex[e.id]; }).length;
    var html = '<header class="run-header"><h2>結局圖鑑</h2></header>';
    html += '<p class="codex-progress">完整結局：' + unlockedFull + ' / ' + fullEndings.length + ' · 中途收尾：' + unlockedMid + ' / ' + midEndings.length + '</p>';
    html += '<h3 class="codex-section">完整結局</h3><div class="codex-list">';
    fullEndings.forEach(function (e) { html += codexItemHtml(e, codex); });
    html += '</div>';
    html += '<h3 class="codex-section">中途收尾</h3><div class="codex-list">';
    midEndings.forEach(function (e) { html += codexItemHtml(e, codex); });
    html += '</div>';
    html += '<div class="options">';
    html += '<button class="link-btn" id="back-btn">返回</button>';
    html += '<button class="link-btn" id="clear-btn">清除紀錄</button>';
    html += '</div>';
    app.innerHTML = html;
    document.getElementById('back-btn').addEventListener('click', returnTo || renderStart);
    document.getElementById('clear-btn').addEventListener('click', function () {
      store.clearAll();
      settings = store.getSettings();
      renderCodex(returnTo);
    });
  }

  renderStart();
})(window);
