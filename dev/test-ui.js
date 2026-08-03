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
var SCRIPT_TAG = /<script\s+src="([^"]+)"\s*><\/script>/g;
function inlineScripts(html) {
  // 「有沒有漏掉」要數原始檔裡的標籤數，不能在內嵌完的文字裡再搜一次 —— 內嵌進來的
  // JS 內容裡可能有註解或字串剛好長得像 <script src=...>，那不是標籤、瀏覽器不會去載，
  // 但字串比對會誤判成漏網之魚（ui.js 的一行註解就踩到過）。
  var expected = (html.match(SCRIPT_TAG) || []).length;
  var inlined = 0;
  var out = html.replace(SCRIPT_TAG, function (_, src) {
    // src 會帶 ?v= 的快取版本號，要先去掉才對得到檔案
    var file = path.join(ROOT, src.split('?')[0]);
    if (!fs.existsSync(file)) {
      throw new Error('index.html 指向一支不存在的 script: ' + src);
    }
    inlined++;
    return '<script>\n' + fs.readFileSync(file, 'utf8') + '\n</script>';
  });
  if (!expected) throw new Error('index.html 裡找不到任何 <script src>，格式可能變了');
  if (inlined !== expected) {
    throw new Error('有 ' + (expected - inlined) + ' 支 script 沒被內嵌，測試可能會去打網路');
  }
  return out;
}
var HTML = inlineScripts(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
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
  console.log('\n=== 1b. 滿版場景版面 ===');
  boot(function (win, doc, app) {
    var ids = Object.keys(win.UNREALIZED.nodes);
    var missing = ids.filter(function (id) {
      return !fs.existsSync(path.join(ROOT, 'art', id + '.webp'));
    });
    missing.length ? fail('這些節點沒有場景圖: ' + missing.join(', ')) : ok(ids.length + ' 個節點都有場景圖');

    startRun(win, app, 1990, 'M');

    // 不捲動是硬需求：圖必須是背景層，不能是會把內容往下推的 <img>
    var bg = app.querySelector('.scene-bg');
    if (!bg) { fail('沒有 .scene-bg 背景層'); return done(); }
    ok('場景是背景層，不會撐高頁面');
    app.querySelector('img') ? fail('畫面上還有 <img>，會把內容往下推') : ok('節點畫面沒有任何 <img>');
    /art\/n[\w]+\.webp/.test(bg.getAttribute('style') || '') ? ok('背景指向 art/ 底下的圖') : fail('背景圖不對');

    doc.documentElement.classList.contains('scene-mode') ? ok('html 進入滿版模式') : fail('html 沒有 scene-mode');
    app.classList.contains('scene-mode') ? ok('#app 進入滿版模式') : fail('#app 沒有 scene-mode');

    // 文字與選項要在底部那一層裡，壓在圖上
    var bottom = app.querySelector('.scene-bottom');
    if (!bottom) { fail('沒有 .scene-bottom'); return done(); }
    bottom.querySelector('.node-text') ? ok('敘述在底部面板裡') : fail('敘述不在底部面板');
    bottom.querySelectorAll('.option-btn').length > 0 ? ok('選項在底部面板裡') : fail('選項不在底部面板');
    app.querySelector('.scene-top .scene-chapter') ? ok('章節標題在上方') : fail('沒有章節標題');
    done();
  });
});

tests.push(function (done) {
  console.log('\n=== 1c. 離開節點後要解除鎖捲動 ===');
  boot(function (win, doc, app) {
    startRun(win, app, 1990, 'M');
    doc.documentElement.classList.contains('scene-mode') ? ok('節點畫面鎖住捲動') : fail('節點畫面沒鎖捲動');
    playOut(win, app);
    !doc.documentElement.classList.contains('scene-mode') ? ok('結局畫面解除鎖定') : fail('結局畫面還鎖著，捲不動');
    click(win, doc.getElementById('codex-btn-2'));
    !doc.documentElement.classList.contains('scene-mode') ? ok('圖鑑可以捲動') : fail('圖鑑被鎖住捲不動');
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
    // 圖鑑依世代分頁，所以預期值要照「目前這一頁看得到哪些」算，不是全部結局
    var U2 = win.UNREALIZED;
    var activeTab = app.querySelector('.codex-tab.active');
    var gen = Number(activeTab && activeTab.dataset.codexGen);
    var visible = U2.endings.full.concat(U2.endings.mid).filter(function (e) {
      return !e.limitedTo || e.limitedTo.indexOf(gen) !== -1;
    });
    var codexNow = JSON.parse(win.localStorage.getItem('unrealized:codex') || '{}');
    var unlockedHere = visible.filter(function (e) {
      return codexNow[e.id] && (codexNow[e.id].generations || []).indexOf(gen) !== -1;
    }).length;
    var items = app.querySelectorAll('.codex-item');
    var locked = app.querySelectorAll('.codex-item.locked');
    items.length === visible.length
      ? ok(gen + ' 分頁有 ' + visible.length + ' 個條目') : fail('條目數 ' + items.length + '，應為 ' + visible.length);
    locked.length === visible.length - unlockedHere
      ? ok((visible.length - unlockedHere) + ' 個未解鎖以剪影顯示')
      : fail('未解鎖數 ' + locked.length + '，應為 ' + (visible.length - unlockedHere));
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
  console.log('\n=== 6d. 圖鑑的世代分頁 ===');
  boot(function (win, doc, app) {
    var U = win.UNREALIZED;
    startRun(win, app, 1990, 'M');
    playOut(win, app);
    if (!win.localStorage.getItem('unrealized:codex')) { fail('沒有解鎖任何結局'); return done(); }
    click(win, doc.getElementById('codex-btn-2'));

    var tabs = app.querySelectorAll('[data-codex-gen]');
    tabs.length === U.config.generations.length
      ? ok(tabs.length + ' 個世代分頁') : fail('分頁數 ' + tabs.length);
    app.querySelector('.codex-tab.active') ? ok('有一個分頁是選中的') : fail('沒有選中的分頁');

    function tabFor(g) {
      return Array.prototype.filter.call(app.querySelectorAll('[data-codex-gen]'),
        function (b) { return Number(b.dataset.codexGen) === g; })[0];
    }
    function unlockedTitles() {
      return Array.prototype.filter.call(app.querySelectorAll('.codex-item'), function (i2) {
        return !i2.classList.contains('locked');
      }).map(function (i2) { return i2.querySelector('.codex-title').textContent; });
    }

    click(win, tabFor(1990));
    var got1990 = unlockedTitles();
    got1990.length > 0 ? ok('1990 分頁有解鎖項目: ' + got1990.join(',')) : fail('1990 分頁沒有任何解鎖');

    // 關鍵：用 1990 解的結局，不該讓 1975 那頁也亮起來
    click(win, tabFor(1975));
    var got1975 = unlockedTitles();
    got1975.length === 0 ? ok('1975 分頁沒有被 1990 的紀錄點亮') :
      fail('1975 分頁誤亮了: ' + got1975.join(','));
    // 每個分頁只認自己這一代：別的世代的紀錄不該以任何形式洩漏到這一頁，
    // 包含「已在某代解鎖」這種註腳，以及不小心把標題露出來
    var codexNow = JSON.parse(win.localStorage.getItem('unrealized:codex') || '{}');
    var leaked = Object.keys(codexNow).filter(function (id) {
      if ((codexNow[id].generations || []).indexOf(1975) !== -1) return false;
      var row = app.querySelector('[data-ending="' + id + '"]');
      if (!row) return false;                       // 這一頁看不到，本來就沒問題
      var t = row.querySelector('.codex-title').textContent;
      return !row.classList.contains('locked') || t !== '？？？';
    });
    leaked.length === 0
      ? ok('別的世代解過的結局，在 1975 分頁維持未解鎖且標題隱藏')
      : fail('這些結局在 1975 分頁洩漏了別代的紀錄: ' + leaked.join(', '));

    // 直接指名檢查，不要比數量 —— 1975 與 1990 各自少掉 5 個別人的限定結局，
    // 總數剛好相同，比數量會平手而看不出過濾有沒有生效
    function shows(id) { return !!app.querySelector('[data-ending="' + id + '"]'); }
    U.endings.full.filter(function (e) { return e.limitedTo; }).forEach(function (e) {
      var wrong = U.config.generations.filter(function (g) { return e.limitedTo.indexOf(g) === -1; });
      var own = e.limitedTo[0];
      click(win, tabFor(own));
      if (!shows(e.id)) fail(e.title + ' 沒出現在自己的 ' + own + ' 分頁');
      wrong.forEach(function (g) {
        click(win, tabFor(g));
        if (shows(e.id)) fail(e.title + '（' + e.limitedTo.join('/') + ' 限定）卻出現在 ' + g + ' 分頁');
      });
    });
    ok('12 個世代限定結局都只出現在自己的分頁');

    doc.getElementById('back-btn') ? ok('切過分頁之後返回按鈕還在') : fail('切分頁弄丟了返回按鈕');
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
    var again = doc.getElementById('menu-btn');
    if (!again) { fail('結局畫面沒有返回主選單按鈕'); return done(); }
    again.textContent === '返回主選單' ? ok('按鈕文字是「返回主選單」') : fail('按鈕文字是: ' + again.textContent);
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
