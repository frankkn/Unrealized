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

  // 節點畫面是滿版場景：圖當背景鋪滿整個視窗，文字與選項壓在上面。
  // 用 background-image 而不是 <img>，圖才不會把內容往下推，捲軸也就無從產生。
  // 從自己的 <script src="js/ui.js?v=N"> 讀版本號，而不是再寫死一個。
  // 兩個地方各記一次的話一定會漂 —— 先前 index.html 已經推到 v6，這裡還停在 v4，
  // 於是推進版本號並不會讓場景圖的快取失效。測試被內嵌時沒有 src，取不到就不帶。
  var ART_VERSION = (function () {
    var me = document.currentScript || document.querySelector('script[src*="js/ui.js"]');
    var m = me && me.src && me.src.match(/[?&]v=([^&]*)/);
    return m ? m[1] : '';
  })();
  function artSrc(nodeId) {
    return 'art/' + nodeId + '.webp' + (ART_VERSION ? '?v=' + ART_VERSION : '');
  }

  // 進出滿版模式時要一起切 html/body 的 overflow，
  // 否則圖鑑那種本來就該捲的畫面會被鎖住
  function setSceneMode(on) {
    document.documentElement.classList.toggle('scene-mode', on);
    document.body.classList.toggle('scene-mode', on);
    app.classList.toggle('scene-mode', on);
  }

  function attrRow(state) {
    return cfg.attributes.map(function (a) {
      return '<div class="attr-row"><span class="attr-label">' + a.label + '</span>' +
        '<div class="attr-bar"><div class="attr-fill" style="width:' + (state.attrs[a.key] * 10) + '%"></div></div>' +
        '<span class="attr-value">' + state.attrs[a.key] + '</span></div>';
    }).join('');
  }

  function renderStart() {
    setSceneMode(false);
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
    setSceneMode(true);

    var html = '';
    html += '<div class="scene-bg" style="background-image:url(&quot;' + artSrc(node.id) + '&quot;)"></div>';
    html += '<header class="scene-top">';
    html += '<p class="scene-chapter">' + node.title + '</p>';
    html += '<p class="scene-age">' + cfg.generationLabels[runState.generation] + ' · ' + cfg.genderLabels[runState.gender] + ' · ' + node.ageRange + '</p>';
    html += '</header>';
    html += '<div class="scene-bottom">';
    html += '<p class="node-text">' + engine.resolveText(node.text, runState) + '</p>';
    html += '<div class="options">';
    options.forEach(function (opt, i) {
      html += '<button class="option-btn" data-opt="' + i + '">' + engine.resolveText(opt.label, runState) + '</button>';
    });
    html += '</div>';
    if (canQuit) {
      html += '<button class="link-btn quit-btn" id="quit-btn">就在這裡收尾</button>';
    }
    html += '</div>';
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
    setSceneMode(false);
    var fullText = isMid ? engine.substituteLexicon(ending.text, runState) : engine.personalizeEnding(ending, runState);
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

  // 圖鑑依世代分頁。同一個結局在不同世代是不同的成就：
  // 世代限定的只出現在自己的頁；共通的三頁都有，但解鎖狀態是分開算的
  // ——你用 1990 解過「家裡還很熱鬧」，不代表 1975 那頁就亮了。
  function isUnlockedFor(entry, generation) {
    return !!entry && (entry.generations || []).indexOf(generation) !== -1;
  }
  function availableIn(ending, generation) {
    return !ending.limitedTo || ending.limitedTo.indexOf(generation) !== -1;
  }

  // 每個分頁只認自己這一代的紀錄。用 1990 解到的就是 1990 的成就，
  // 1975 那頁沒解就是沒解 —— 不在別人的頁面上留註腳，標題也一樣藏著。
  function codexItemHtml(e, codex, generation) {
    var entry = codex[e.id];
    var unlocked = isUnlockedFor(entry, generation);
    var html = '<div class="codex-item' + (unlocked ? '' : ' locked') + '" data-ending="' + e.id + '">';
    html += '<span class="codex-silhouette">' + (unlocked ? '●' : '■') + '</span>';
    html += '<span class="codex-main">';
    html += '<span class="codex-title">' + (unlocked ? e.title : '？？？') + '</span>';
    var tags = '<span class="codex-tags">';
    tags += '<span class="codex-tag rarity-' + (e.rarity || '') + '">' + (e.rarity || '') + '</span>';
    if (e.limitedTo) tags += '<span class="codex-tag">' + e.limitedTo.join('/') + ' 限定</span>';
    tags += '</span></span>';
    if (unlocked) {
      var genders = (entry.genders || []).map(function (g) { return cfg.genderLabels[g] || g; }).join('/');
      html += '<span class="codex-count">解鎖 ' + entry.count + ' 次' + (genders ? ' · ' + genders : '') + '</span>';
    }
    html += '</div>';
    return html;
  }

  var codexGen = null;   // 記住上次看的分頁，切回來時不會跳掉

  function renderCodex(returnTo, generation) {
    setSceneMode(false);
    var lastRun = store.getLastRun();
    codexGen = generation || codexGen || (lastRun && lastRun.generation) || cfg.generations[0];
    var gen = codexGen;
    var codex = store.getCodex();

    var full = UNREALIZED.endings.full.filter(function (e) { return availableIn(e, gen); });
    var mid = UNREALIZED.endings.mid.filter(function (e) { return availableIn(e, gen); });
    var got = function (list) {
      return list.filter(function (e) { return isUnlockedFor(codex[e.id], gen); }).length;
    };

    var html = '<header class="run-header"><h2>結局圖鑑</h2></header>';
    html += '<div class="codex-tabs" role="tablist">';
    cfg.generations.forEach(function (g) {
      var n = UNREALIZED.endings.full.filter(function (e) { return availableIn(e, g); })
        .filter(function (e) { return isUnlockedFor(codex[e.id], g); }).length;
      var total = UNREALIZED.endings.full.filter(function (e) { return availableIn(e, g); }).length;
      html += '<button class="codex-tab' + (g === gen ? ' active' : '') + '" data-codex-gen="' + g + '"' +
        ' role="tab" aria-selected="' + (g === gen) + '">' + g +
        '<span class="codex-tab-count">' + n + '/' + total + '</span></button>';
    });
    html += '</div>';

    html += '<p class="codex-progress">' + cfg.generationLabels[gen] +
      '：完整結局 ' + got(full) + ' / ' + full.length +
      ' · 中途收尾 ' + got(mid) + ' / ' + mid.length + '</p>';
    html += '<h3 class="codex-section">完整結局</h3><div class="codex-list">';
    full.forEach(function (e) { html += codexItemHtml(e, codex, gen); });
    html += '</div>';
    html += '<h3 class="codex-section">中途收尾</h3><div class="codex-list">';
    mid.forEach(function (e) { html += codexItemHtml(e, codex, gen); });
    html += '</div>';
    html += '<div class="options">';
    html += '<button class="link-btn" id="back-btn">返回</button>';
    html += '<button class="link-btn" id="clear-btn">清除紀錄</button>';
    html += '</div>';
    app.innerHTML = html;

    // 用 data-codex-gen 而不是 data-gen：開始畫面的世代選擇也是 data-gen，
    // 混用的話「有沒有回到開始畫面」這種判斷會被圖鑑分頁誤觸
    app.querySelectorAll('[data-codex-gen]').forEach(function (btn) {
      btn.addEventListener('click', function () { renderCodex(returnTo, Number(btn.dataset.codexGen)); });
    });
    document.getElementById('back-btn').addEventListener('click', returnTo || renderStart);
    document.getElementById('clear-btn').addEventListener('click', function () {
      store.clearAll();
      settings = store.getSettings();
      applyMotionPref();
      renderCodex(returnTo, gen);
    });
  }

  renderStart();
})(window);
