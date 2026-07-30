(function (global) {
  'use strict';
  var UNREALIZED = global.UNREALIZED = global.UNREALIZED || {};

  var KEYS = {
    codex: 'unrealized:codex',
    settings: 'unrealized:settings',
    lastRun: 'unrealized:lastRun'
  };

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      // ponytail: 隱私模式下 localStorage 可能拋錯，讀不到就當沒存過
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // ponytail: 寫入失敗不能讓遊戲掛掉，靜默放棄即可
    }
  }

  var Store = {
    getCodex: function () {
      return readJSON(KEYS.codex, {});
    },
    unlockEnding: function (endingId, generation, gender, timestamp) {
      var codex = Store.getCodex();
      var entry = codex[endingId] || { count: 0, generations: [], genders: [], firstAt: null };
      entry.count += 1;
      if (entry.generations.indexOf(generation) === -1) entry.generations.push(generation);
      if (entry.genders.indexOf(gender) === -1) entry.genders.push(gender);
      if (!entry.firstAt) entry.firstAt = timestamp || null;
      codex[endingId] = entry;
      writeJSON(KEYS.codex, codex);
      return entry;
    },
    getSettings: function () {
      return readJSON(KEYS.settings, { reducedMotion: false, textSpeed: 'normal' });
    },
    saveSettings: function (settings) {
      writeJSON(KEYS.settings, settings);
    },
    getLastRun: function () {
      return readJSON(KEYS.lastRun, null);
    },
    saveLastRun: function (run) {
      writeJSON(KEYS.lastRun, run);
    },
    clearAll: function () {
      try {
        localStorage.removeItem(KEYS.codex);
        localStorage.removeItem(KEYS.settings);
        localStorage.removeItem(KEYS.lastRun);
      } catch (e) {}
    }
  };

  UNREALIZED.store = Store;
})(window);
