// dev-only：把 index.html 交給一個真的 DOM 解析、載入全部 script、然後模擬點擊玩到結局。
// test-engine.js 測的是引擎（純資料與邏輯，不碰 DOM）；這支測的是 ui.js —— 玩家實際碰到的那一層。
// 少了這支，index.html 的 script 路徑打錯、getElementById 拿錯 id、事件沒綁上，
// 都要等到有人真的用瀏覽器打開才會發現。
//
// 需要 jsdom：`npm install`（只是開發用，遊戲本身仍然零依賴、零建置，雙擊 index.html 就能玩）
'use strict';
var fs = require('fs'), path = require('path');
var JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  console.error('缺少 jsdom，請先執行：npm install');
  process.exit(1);
}

var ROOT = path.join(__dirname, '..');
var HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
var errors = [];
function fail(m) { console.log('  x ' + m); errors.push(m); }
function ok(m) { console.log('  v ' + m); }

// 每個案例都開一個全新的 DOM，避免互相污染 localStorage 與模組狀態
function boot(cb) {
  var dom = new JSDOM(HTML, {
    url: 'https://frankkn.github.io/Unrealized/',
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true
  });
  dom.virtualConsole.on('jsdomError', function (e) { errors.push('jsdomError: ' + e.message); });
  setTimeout(function () {
    cb(dom.window, dom.window.document, dom.window.document.getElementById('app'));
  }, 500);
}
function click(win, el) { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); }
function startRun(win, app, generation, gender) {
  var g = Array.prototype.filter.call(app.querySelectorAll('[data-gen]'), function (b) { return Number(b.dataset.gen) === generation; })[0];
  click(win, g);
  var s = Array.prototype.filter.call(app.querySelectorAll('[data-gender]'), function (b) { return b.dataset.gender === gender; })[0];
  click(win, s);
  click(win, app.ownerDocument.getElementById('start-btn'));
}
// 隨機玩到結局，順便檢查每一步的敘述與選項文字
function playOut(win, app, chooser) {
  var steps = 0, problem = null;
  for (var i = 0; i < 60; i++) {
    var opts = app.querySelectorAll('[data-opt]');
    if (!opts.length) break;
    var text = app.querySelector('.node-text');
    if (!text || !text.textContent.trim()) problem = problem || '第 ' + steps + ' 步沒有敘述文字';
    else if (/\{[^{}]+\}/.test(text.textContent)) problem = problem || '殘留佔位符: ' + text.textContent.slice(0, 40);
    Array.prototype.forEach.call(app.querySelectorAll('.option-btn'), function (b) {
      if (!b.textContent.trim()) problem = problem || '第 ' + steps + ' 步有空白的選項文字';
    });
    click(win, chooser ? chooser(opts) : opts[Math.floor(Math.random() * opts.length)]);
    steps++;
  }
  return { steps: steps, problem: problem };
}

var tests = [];

tests.push(function (done) {
  console.log('=== 1. 載入與開始畫面 ===');
  boot(function (win, doc, app) {
    if (!win.UNREALIZED) { fail('window.UNREALIZED 不存在 —— script 沒載進來'); return done(); }
    ['config', 'lexicon', 'nodes', 'endings', 'store', 'engine'].forEach(function (k) {
      win.UNREALIZED[k] ? ok('UNREALIZED.' + k) : fail('UNREALIZED.' + k + ' 缺失');
    });
    if (!app || !app.innerHTML.trim()) { fail('#app 是空的 —— 打開會是白畫面'); return done(); }
    ok('#app 有渲染內容');
    app.querySelectorAll('[data-gen]').length === 3 ? ok('三個世代按鈕') : fail('世代按鈕數不對');
    app.querySelectorAll('[data-gender]').length === 2 ? ok('兩個性別按鈕') : fail('性別按鈕數不對');
    var btn = doc.getElementById('start-btn');
    btn && btn.disabled ? ok('未選擇時開始按鈕停用') : fail('沒選世代/性別就能開始');
    startRun(win, app, 1990, 'M');
    app.querySelector('.node-text') ? ok('選完可以開始遊戲') : fail('點了開始卻沒有進入節點');
    done();
  });
});

tests.push(function (done) {
  console.log('\n=== 2. 六種世代x性別都能走到結局 ===');
  var combos = [[1975, 'M'], [1975, 'F'], [1990, 'M'], [1990, 'F'], [2005, 'M'], [2005, 'F']];
  var i = 0;
  (function next() {
    if (i >= combos.length) return done();
    var c = combos[i++];
    boot(function (win, doc, app) {
      startRun(win, app, c[0], c[1]);
      var r = playOut(win, app);
      var stamp = app.querySelector('.stamp-circle');
      if (r.problem) fail(c.join('/') + ' ' + r.problem);
      else if (!stamp) fail(c.join('/') + ' 沒走到結局');
      else ok(c.join('/') + ' -> ' + r.steps + ' 步 -> ' + stamp.textContent);
      if (stamp) {
        app.querySelector('.attr-reveal') ? null : fail(c.join('/') + ' 結局沒揭曉五軸');
        app.querySelector('.ending-text') ? null : fail(c.join('/') + ' 沒有結局文字');
      }
      next();
    });
  })();
});

tests.push(function (done) {
  console.log('\n=== 3. 中途收尾 ===');
  boot(function (win, doc, app) {
    startRun(win, app, 1990, 'F');
    for (var k = 0; k < 60; k++) {
      var q = doc.getElementById('quit-btn');
      if (q) {
        click(win, q);
        var stamp = app.querySelector('.stamp-circle');
        if (!stamp) { fail('點了中途收尾沒有出現結局'); return done(); }
        ok('中途收尾 -> ' + stamp.textContent);
        app.querySelector('.attr-reveal') ? fail('中途收尾不該揭曉五軸數值') : ok('中途收尾正確地不顯示數值');
        var raw = win.localStorage.getItem('unrealized:codex');
        raw && raw.indexOf('MID_') !== -1 ? ok('中途結局有進圖鑑') : fail('中途結局沒進圖鑑');
        return done();
      }
      var opts = app.querySelectorAll('[data-opt]');
      if (!opts.length) break;
      click(win, opts[0]);
    }
    fail('第 2 章之後從未出現中途收尾按鈕');
    done();
  });
});

tests.push(function (done) {
  console.log('\n=== 4. 世代限定選項（1975 的工廠早期結局）===');
  boot(function (win, doc, app) {
    startRun(win, app, 1975, 'M');
    click(win, app.querySelectorAll('[data-opt]')[1]);   // 勞動出身
    var factory = Array.prototype.filter.call(app.querySelectorAll('.option-btn'), function (b) { return b.textContent.indexOf('工廠') !== -1; })[0];
    if (!factory) { fail('1975 應該要看得到工廠選項'); return done(); }
    ok('1975 看得到工廠選項');
    click(win, factory);
    var stamp = app.querySelector('.stamp-circle');
    stamp && stamp.textContent === '十五歲的工廠' ? ok('直接觸發「十五歲的工廠」') : fail('拿到的是 ' + (stamp && stamp.textContent));
    boot(function (win2, doc2, app2) {
      startRun(win2, app2, 2005, 'M');
      click(win2, app2.querySelectorAll('[data-opt]')[1]);
      Array.prototype.some.call(app2.querySelectorAll('.option-btn'), function (b) { return b.textContent.indexOf('工廠') !== -1; })
        ? fail('2005 不該看得到 1975 限定的工廠選項') : ok('2005 看不到工廠選項');
      done();
    });
  });
});

tests.push(function (done) {
  console.log('\n=== 5. 結局的個人化段落 ===');
  var found = false, tries = 0;
  (function attempt() {
    if (found || tries >= 12) {
      if (!found) fail('12 次都沒出現多段落結局，個人化段落可能沒接上 UI');
      return done();
    }
    tries++;
    boot(function (win, doc, app) {
      startRun(win, app, 1990, 'M');
      playOut(win, app);
      var paras = app.querySelectorAll('.ending-text');
      if (paras.length > 1) { found = true; ok('結局渲染成 ' + paras.length + ' 段（骨架 + 個人化）'); }
      attempt();
    });
  })();
});

tests.push(function (done) {
  console.log('\n=== 6. 圖鑑 ===');
  boot(function (win, doc, app) {
    startRun(win, app, 1990, 'M');
    playOut(win, app);
    var codexBtn = doc.getElementById('codex-btn-2');
    if (!codexBtn) { fail('結局畫面沒有圖鑑按鈕'); return done(); }
    click(win, codexBtn);
    var total = win.UNREALIZED.endings.full.length + win.UNREALIZED.endings.mid.length;
    var items = app.querySelectorAll('.codex-item');
    var locked = app.querySelectorAll('.codex-item.locked');
    items.length === total ? ok(total + ' 個結局條目') : fail('條目數 ' + items.length + '，應為 ' + total);
    locked.length === total - 1 ? ok((total - 1) + ' 個未解鎖以剪影顯示') : fail('未解鎖數 ' + locked.length + '，應為 ' + (total - 1));
    app.querySelector('.codex-progress') ? ok('有解鎖進度') : fail('沒有解鎖進度');
    doc.getElementById('back-btn') ? ok('有返回按鈕') : fail('沒有返回按鈕');
    var clear = doc.getElementById('clear-btn');
    if (!clear) { fail('沒有清除紀錄按鈕'); return done(); }
    click(win, clear);
    !win.localStorage.getItem('unrealized:codex') ? ok('清除紀錄有效') : fail('清除後圖鑑還在');
    done();
  });
});

tests.push(function (done) {
  console.log('\n=== 7. 設定與快速重玩 ===');
  boot(function (win, doc, app) {
    var toggle = doc.getElementById('motion-toggle');
    if (!toggle) { fail('沒有減少動畫開關'); return done(); }
    toggle.checked = true;
    toggle.dispatchEvent(new win.Event('change', { bubbles: true }));
    doc.documentElement.classList.contains('no-motion') ? ok('減少動畫會加上 no-motion class') : fail('no-motion class 沒加上');
    win.localStorage.getItem('unrealized:settings') ? ok('設定有存進 localStorage') : fail('設定沒存進 localStorage');

    startRun(win, app, 2005, 'F');
    playOut(win, app, function (opts) { return opts[0]; });
    var again = doc.getElementById('again-btn');
    if (!again) { fail('結局畫面沒有再玩一次按鈕'); return done(); }
    click(win, again);
    var replay = doc.getElementById('replay-btn');
    if (!replay) { fail('沒有快速重玩按鈕'); return done(); }
    replay.textContent.indexOf('2005') !== -1 ? ok('快速重玩記得上一局') : fail('快速重玩內容不對: ' + replay.textContent);
    click(win, replay);
    app.querySelector('.node-text') ? ok('快速重玩能直接開始') : fail('快速重玩沒有開始遊戲');
    done();
  });
});

(function run(i) {
  if (i >= tests.length) {
    console.log('\n' + (errors.length ? 'x 共 ' + errors.length + ' 個問題' : 'v 全部通過'));
    errors.forEach(function (e) { console.log('   - ' + e); });
    return process.exit(errors.length ? 1 : 0);
  }
  tests[i](function () { run(i + 1); });
})(0);
