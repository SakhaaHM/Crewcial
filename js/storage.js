/*! Crewcial - storage. Data stays on this device (browser localStorage).
 * If the browser refuses storage, the app keeps working in memory for this visit.
 * AI-assistance disclosure: generated with Claude (Anthropic) for Team Crewcial,
 * NASA Space Apps Challenge 2026.
 */
(function (root) {
  'use strict';
  var KEY = 'crewcial.v1', DEVICE_KEY = 'crewcial.device';
  var memory = {};

  function read(key) {
    try { var v = root.localStorage.getItem(key); if (v !== null) { return v; } } catch (e) { /* storage unavailable */ }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  }
  function write(key, value) {
    memory[key] = value;
    try { root.localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function remove(key) {
    delete memory[key];
    try { root.localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
  }

  var Storage = {
    persistent: true,
    load: function () {
      var raw = read(KEY);
      if (!raw) { return null; }
      try { return JSON.parse(raw); } catch (e) { return null; }
    },
    save: function (state) {
      Storage.persistent = write(KEY, JSON.stringify(state));
      return Storage.persistent;
    },
    clear: function () { remove(KEY); },
    /* A random label for this browser, so reaction tests are compared on the same device. */
    deviceId: function () {
      var id = read(DEVICE_KEY);
      if (!id) { id = 'dev-' + Math.random().toString(36).slice(2, 10); write(DEVICE_KEY, id); }
      return id;
    },
    exportText: function (state) { return JSON.stringify(state); },
    /* Returns { ok, state, error }. Checks only the shape, not the content. */
    importText: function (text) {
      var obj;
      try { obj = JSON.parse(text); } catch (e) { return { ok: false, error: 'This is not valid Crewcial data: the text could not be read as JSON.' }; }
      var lists = ['crew', 'readings', 'tests', 'symptoms', 'checks', 'reports'];
      if (!obj || obj.schema !== 1 || !obj.mission || !obj.settings) { return { ok: false, error: 'This is not Crewcial data from this version of the app.' }; }
      for (var i = 0; i < lists.length; i++) { if (!Array.isArray(obj[lists[i]])) { return { ok: false, error: 'The data is missing its list of ' + lists[i] + '.' }; } }
      if (!obj.crew.length) { return { ok: false, error: 'The data has no crew member.' }; }
      return { ok: true, state: obj };
    }
  };
  root.Crewcial = root.Crewcial || {};
  root.Crewcial.Storage = Storage;
})(typeof self !== 'undefined' ? self : this);
