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
var errors = [];

// index.html 的 <script src> 是相對路徑，交給 jsdom 的 resources:'usable' 去載，
// 它會用 document 的 url 當 base —— 只要 url 是 http(s)，就會真的去打網路。
// 這個站已經上線在 GitHub Pages，於是測試會抓「已部署」的那份，
// 而不是本機剛改的那份；本機的修改根本沒被測到，還一路顯示通過。
//
// 改成先從磁碟把每一支 script 讀進來內嵌，整份文件零外部載入。
// 順帶連 <script src> 的路徑有沒有打錯也一起測到了（讀不到就直接爆）。
function inlineScripts(html) {
  return html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, function (_, src) {
    var file = path.join(ROOT, src);
    if (!fs.existsSync(file)) {
      throw new Error('index.html 指向一支不存在的 script: ' + src);
    }
    return '<script>\n' + fs.readFileSync(file, 'utf8') + '\n</script>';
  });
}
var HTML = inlineScripts(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
var remaining = HTML.match(/<script\s+src=/g);
if (remaining) throw new Error('還有 ' + remaining.length + ' 支 script 沒被內嵌，測試可能會去打網路');
function fail(m) { console.log('  x ' + m); errors.push(m); }
function ok(m) { console.log('  v ' + m); }

// 每個案例都開一個全新的 DOM，避免互相污染 localStorage 與模組狀態。
// script 是非同步載入的，固定 setTimeout 在機器忙的時候會不夠 —— 改成輪詢到真的就緒為止，
// 這樣「載入失敗」與「還沒載完」才不會被混為一談。
function boot(cb) {
  // 不給 resources:'usable' —— script 已經全部內嵌，不該再有任何外部載入。
  // url 只是為了讓 localStorage 有個非 opaque 的 origin 可以用。
  var dom = new JSDOM(HTML, {
    url: 'https://unrealized.test/',
    runScripts: 'dangerously', pretendToBeVisual: true
  });
  dom.virtualConsole.on('jsdomError', function (e) { errors.push('jsdomError: ' + e.message); });
  var waited = 0;
  (function poll() {
    var win = dom.window, app = win.document.getElementById('app');
    var ready = win.UNREALIZED && win.UNREALIZED.engine && app && app.innerHTML.trim();
    if (ready || waited >= 10000) return cb(win, win.document, app);
    waited += 25;
    setTimeout(poll, 25);
  })();
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
  console.log('\n=== 1b. 節點插圖 ===');
  boot(function (win, doc, app) {
    var U = win.UNREALIZED;
    if (!U.art) { fail('UNREALIZED.art 不存在'); return done(); }
    var ids = Object.keys(U.nodes);
    var missing = ids.filter(function (id) { return !U.art[id]; });
    missing.length ? fail('這些節點沒有插圖: ' + missing.join(', ')) : ok(ids.length + ' 個節點都有插圖');

    var W = 28, H = 16, malformed = [];
    Object.keys(U.art).forEach(function (id) {
      var rows = U.art[id];
      if (rows.length !== H) malformed.push(id + ' 高度' + rows.length);
      rows.forEach(function (r, i) { if (r.length !== W) malformed.push(id + '[' + i + ']寬度' + r.length); });
      if (!U.nodes[id]) malformed.push(id + ' 沒有對應節點');
    });
    malformed.length ? fail('圖格式有問題: ' + malformed.slice(0, 5).join('; ')) : ok('全部都是 ' + W + 'x' + H + '，沒有多餘的圖');

    // 空白的圖等於沒畫，會靜靜地渲染成一片空
    var blank = Object.keys(U.art).filter(function (id) {
      return !U.art[id].some(function (r) { return /[12]/.test(r); });
    });
    blank.length ? fail('這些圖是全空的: ' + blank.join(', ')) : ok('沒有全空的圖');

    startRun(win, app, 1990, 'M');
    var svg = app.querySelector('svg.node-art');
    if (!svg) { fail('節點畫面沒有渲染出插圖'); return done(); }
    ok('插圖有渲染 (' + svg.querySelectorAll('rect').length + ' 個 rect)');
    svg.getAttribute('shape-rendering') === 'crispEdges' ? ok('有 crispEdges，邊緣不會被糊掉') : fail('缺少 shape-rendering="crispEdges"');
    svg.getAttribute('aria-hidden') === 'true' ? ok('對螢幕閱讀器隱藏（純裝飾）') : fail('插圖應該 aria-hidden');
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
    var endingId = Object.keys(JSON.parse(win.localStorage.getItem('unrealized:codex') || '{}'))[0];
    if (!endingId) { fail('結局沒有寫進圖鑑'); return done(); }
    var codexBtn = doc.getElementById('codex-btn-2');
    if (!codexBtn) { fail('結局畫面沒有圖鑑按鈕'); return done(); }
    click(win, codexBtn);
    var total = win.UNREALIZED.endings.full.length + win.UNREALIZED.endings.mid.length;
    var items = app.querySelectorAll('.codex-item');
    var locked = app.querySelectorAll('.codex-item.locked');
    items.length === total ? ok(total + ' 個結局條目') : fail('條目數 ' + items.length + '，應為 ' + total);
    locked.length === total - 1 ? ok((total - 1) + ' 個未解鎖以剪影顯示') : fail('未解鎖數 ' + locked.length + '，應為 ' + (total - 1));
    app.querySelector('.codex-progress') ? ok('有解鎖進度') : fail('沒有解鎖進度');

    // 只確認按鈕存在是不夠的 —— 這顆按鈕曾經因為 renderNode() 拋例外而完全沒反應，
    // 而「存在」的斷言照樣通過。要真的按下去，並檢查畫面確實換了。
    var back = doc.getElementById('back-btn');
    if (!back) { fail('沒有返回按鈕'); return done(); }
    var countBefore = JSON.parse(win.localStorage.getItem('unrealized:codex'))[endingId].count;
    click(win, back);
    if (app.querySelector('.codex-list')) { fail('按了返回還停在圖鑑（按鈕沒反應）'); return done(); }
    app.querySelector('.stamp-circle') ? ok('從結局進圖鑑，返回會回到結局畫面') : fail('返回之後跑到了別的畫面');
    var countAfter = JSON.parse(win.localStorage.getItem('unrealized:codex'))[endingId].count;
    countAfter === countBefore ? ok('返回不會重複累加解鎖次數') : fail('解鎖次數從 ' + countBefore + ' 變成 ' + countAfter);

    click(win, doc.getElementById('codex-btn-2'));
    var clear = doc.getElementById('clear-btn');
    if (!clear) { fail('沒有清除紀錄按鈕'); return done(); }
    click(win, clear);
    !win.localStorage.getItem('unrealized:codex') ? ok('清除紀錄有效') : fail('清除後圖鑑還在');
    doc.getElementById('back-btn') ? ok('清除之後返回按鈕還在') : fail('清除之後返回按鈕不見了');
    done();
  });
});

tests.push(function (done) {
  console.log('\n=== 6b. 從開始畫面進圖鑑再返回 ===');
  boot(function (win, doc, app) {
    click(win, doc.getElementById('codex-btn'));
    if (!app.querySelector('.codex-list')) { fail('開始畫面點圖鑑沒有進去'); return done(); }
    ok('進得去圖鑑');
    click(win, doc.getElementById('back-btn'));
    app.querySelector('[data-gen]') ? ok('返回會回到開始畫面') : fail('返回之後不在開始畫面');
    done();
  });
});

tests.push(function (done) {
  console.log('\n=== 6c. 遊戲進行中不會有進圖鑑的路徑 ===');
  boot(function (win, doc, app) {
    startRun(win, app, 1975, 'F');
    doc.getElementById('codex-btn') ? fail('節點畫面不該有圖鑑按鈕') : ok('節點畫面沒有圖鑑入口，不會卡在回不去的狀態');
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
