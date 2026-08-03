// dev-only：把 find-paths.js 產生的路徑貼回 test-engine.js。
// 手動貼很容易漏掉世代那一行，所以做成腳本。
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..') + '/';
var GEN = process.argv[2];
if (!GEN) {
  console.error('用法：node dev/find-paths.js 3000 > paths.txt && node dev/swap-paths.js paths.txt');
  process.exit(1);
}

var gen = fs.readFileSync(GEN, 'utf8');
var testPath = ROOT + 'dev/test-engine.js';
var test = fs.readFileSync(testPath, 'utf8');

// 從 'var NAME = ' 起，抓到獨立成行的 '};' 或 '];' 為止
function block(src, name) {
  var start = src.indexOf('var ' + name + ' = ');
  if (start === -1) return null;
  var endObj = src.indexOf('\n};', start);
  var endArr = src.indexOf('\n];', start);
  var end = (endObj === -1) ? endArr : (endArr === -1 ? endObj : Math.min(endObj, endArr));
  if (end === -1) return null;
  return src.slice(start, end + 3);
}

['LUCKY_MIDBAND_PATH', 'LUCKY_SELF_PATH', 'LUCKY_QUIET_PATH', 'LUCKY_22K_PATH'].forEach(function (name) {
  var fresh = block(gen, name);
  var stale = block(test, name);
  if (!fresh) { console.log('產生檔裡沒有 ' + name); return; }
  if (!stale) { console.log('測試檔裡沒有 ' + name); return; }
  test = test.split(stale).join(fresh);
  console.log('已替換 ' + name);
});

fs.writeFileSync(testPath, test);
