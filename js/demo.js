/*! Crewcial - synthetic data. Everything this file produces is SIMULATED.
 * AI-assistance disclosure: this file was generated with Claude (Anthropic) for
 * Team Crewcial, NASA Space Apps Challenge 2026.
 *
 * No value here comes from a real person. The crew is fictional. The numbers are
 * drawn from a seeded random generator around invented personal averages, with
 * a few scripted events, so that the demo and the tests are repeatable.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Crewcial = root.Crewcial || {}; root.Crewcial.Demo = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY_MS = 86400000;

  /* Seeded generator (mulberry32) and a normal draw. */
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rng) {
    var u = 0, v = 0;
    while (u === 0) { u = rng(); }
    while (v === 0) { v = rng(); }
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function between(rng, lo, hi) { return lo + (hi - lo) * rng(); }
  function intBetween(rng, lo, hi) { return Math.floor(between(rng, lo, hi + 1)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function roundTo(v, digits) { var f = Math.pow(10, digits); return Math.round(v * f) / f; }

  /* Fictional crew. Names are invented and belong to no real astronaut.
     look: how each one is drawn on the home figure (js/figure.js). Three women and one man (Shihab). */
  var CREW = [
    { id: 'c1', name: 'Solara',       role: 'Commander',            isCmo: false, base: { bp_sys: 116, bp_dia: 74, hr: 56, temp: 36.9, sleep: 6.9, mood: 74, stress: 28, speed: 4.25, alert: 7 },
      look: { body: 'f', skin: '#dcae8c', shade: '#bd8d6b', hair: 'curly', hairColor: '#2e2420' } },
    { id: 'c2', name: 'Shihab',       role: 'Crew medical officer', isCmo: true,  base: { bp_sys: 108, bp_dia: 68, hr: 62, temp: 37.0, sleep: 7.2, mood: 70, stress: 32, speed: 4.05, alert: 8 },
      look: { body: 'm', skin: '#b47c5a', shade: '#93603f', hair: 'short', hairColor: '#1e1916', beard: true } },
    { id: 'c3', name: 'Zahra',        role: 'Flight engineer',      isCmo: false, base: { bp_sys: 112, bp_dia: 70, hr: 58, temp: 36.8, sleep: 7.0, mood: 72, stress: 30, speed: 4.15, alert: 8 },
      look: { body: 'f', skin: '#c9936e', shade: '#a7724f', hair: 'long', hairColor: '#35261f' } },
    { id: 'c4', name: 'Sadeem',       role: 'Mission specialist',   isCmo: false, base: { bp_sys: 120, bp_dia: 76, hr: 64, temp: 36.9, sleep: 6.6, mood: 68, stress: 35, speed: 3.95, alert: 7 },
      look: { body: 'f', skin: '#8f5c3e', shade: '#70452d', hair: 'bun', hairColor: '#1c1613' } }
  ];
  var NOISE = { bp_sys: 4, bp_dia: 3, hr: 3, temp: 0.15, sleep: 0.45, mood: 6, stress: 6, speed: 0.10 };
  var DEVICE = 'demo-device';

  function iso(startTs, day, hours) { return new Date(startTs + (day - 1) * DAY_MS + hours * 3600000).toISOString(); }

  /* One day of daily readings for one person, with optional shifts. */
  function dayReadings(rng, base, shift) {
    shift = shift || {};
    function v(key, digits, lo, hi) {
      return clamp(roundTo(base[key] + (shift[key] || 0) + gauss(rng) * NOISE[key], digits), lo, hi);
    }
    var sys = v('bp_sys', 0, 80, 200), dia = v('bp_dia', 0, 45, 120);
    if (dia > sys - 20) { dia = sys - 20; }
    return {
      bp_sys: sys, bp_dia: dia, hr: v('hr', 0, 42, 125), temp: v('temp', 1, 35.4, 39.0),
      sleep: clamp(Math.round((base.sleep + (shift.sleep || 0) + gauss(rng) * NOISE.sleep) * 4) / 4, 3, 10),
      mood: v('mood', 0, 5, 100), stress: v('stress', 0, 0, 95)
    };
  }
  function reactionMetrics(rng, speed, tired) {
    var meanSpeed = roundTo(speed, 3);
    var medianRt = Math.round(1000 / meanSpeed * 0.97);
    return {
      n: intBetween(rng, 54, 62), medianRt: medianRt, meanSpeed: meanSpeed,
      lapses: tired ? intBetween(rng, 6, 11) : intBetween(rng, 0, 2), falseStarts: intBetween(rng, 0, 1)
    };
  }

  /* ---------- The demo mission: Mars transit, day 74 ---------- */
  function generateMission(opts) {
    opts = opts || {};
    var days = opts.days || 74;
    var now = opts.now || Date.now();
    var startTs = now - (days - 1) * DAY_MS - 9 * 3600000;   // "today" began 9 hours ago
    var rng = makeRng(opts.seed || 20261114);
    var arng = makeRng((opts.seed || 20261114) + 7);   // separate stream for alertness ratings, so the other demo values stay the same
    var out = {
      crew: CREW.map(function (c) { return { id: c.id, name: c.name, role: c.role, isCmo: c.isCmo, evaDay: c.id === 'c3' ? days + 1 : null, look: c.look }; }),
      mission: { environment: 'mars', startTs: startTs, phaseStartDay: 1, demo: true },
      readings: [], tests: [], symptoms: [], checks: [], reports: []
    };
    var n = 0;
    function id(p) { n++; return p + n; }
    function addReading(crewId, day, key, value, context) {
      out.readings.push({ id: id('r'), crewId: crewId, day: day, ts: iso(startTs, day, 7.5), indicator: key, value: value,
        context: context || { rested: true, postExercise: false, caffeine: false, device: 'standard' }, source: 'demo' });
    }
    function addSymptom(crewId, day, symptomId, region, severity) {
      out.symptoms.push({ id: id('s'), crewId: crewId, day: day, ts: iso(startTs, day, 7.6), symptomId: symptomId, region: region || 'all', severity: severity || 0, note: '', source: 'demo' });
    }
    var extraSymptoms = {
      c1: { 20: [['headache', 'brain', 1]] },
      c2: { 40: [['resp_infection', 'lungs', 2]], 41: [['resp_infection', 'lungs', 2], ['nasal_congestion', 'lungs', 1]],
            42: [['resp_infection', 'lungs', 1], ['nasal_congestion', 'lungs', 1]], 43: [['nasal_congestion', 'lungs', 1]], 55: [['skin_rash', 'skin', 1]] },
      c3: { 12: [['nasal_congestion', 'lungs', 1]] },
      c4: { 33: [['back_pain', 'msk', 1]] }
    };

    CREW.forEach(function (c) {
      for (var d = 1; d <= days; d++) {
        var shift = {};
        if (c.id === 'c2' && d >= 40 && d <= 43) { shift = { temp: 1.0, hr: 12 }; }                 // fever-like episode
        if (c.id === 'c3' && d >= 69) { shift = { sleep: -2.0, mood: d >= 71 ? -12 : -6, stress: d >= 71 ? 12 : 6 }; }   // short-sleep week
        var skip = (c.id === 'c1' && d === days) ||                                                 // commander has not done today's check
                   (d < days - 15 && d > 3 && !(c.id === 'c2' && d >= 40 && d <= 43) && rng() < 0.04);
        var vals = dayReadings(rng, c.base, shift);
        if (c.id === 'c3' && d >= 69) { vals.sleep = clamp(Math.round((5.0 + gauss(rng) * 0.2) * 4) / 4, 4.5, 5.25); }
        if (c.id === 'c3' && d === days) { vals.sleep = 5; }
        if (skip) { continue; }
        Object.keys(vals).forEach(function (k) { addReading(c.id, d, k, vals[k]); });
        var extra = (extraSymptoms[c.id] || {})[d];
        if (extra) { extra.forEach(function (e) { addSymptom(c.id, d, e[0], e[1], e[2]); }); }
        else { addSymptom(c.id, d, 'none', 'all', 0); }
        out.checks.push({ crewId: c.id, day: d, ts: iso(startTs, d, 7.6), seconds: intBetween(rng, 68, 112) });
      }
      /* Weekly reaction tests, plus extra ones during the short-sleep week. */
      var testDays = [];
      for (var t = 7; t <= days; t += 7) { testDays.push(t); }
      if (c.id === 'c3') { testDays.push(days - 2, days); }
      testDays.forEach(function (td) {
        if (td > days) { return; }
        var tired = c.id === 'c3' && td >= 69;
        var factor = tired ? (td === days ? 0.84 : td >= days - 2 ? 0.86 : 0.90) : 1;
        var speed = (c.base.speed + gauss(rng) * NOISE.speed) * factor;
        /* Alertness rated just before the test, 0 tired to 10 alert. In the short-sleep week the
           flight engineer keeps rating herself as usual while her speed drops: the blind spot (P5),
           shaped on the sleep-restriction finding in Van Dongen et al. 2003. Simulated. */
        var alert = clamp(Math.round(c.base.alert + gauss(arng) * 0.6), 0, 10);
        if (c.id === 'c3' && td >= 69) { alert = td === 69 ? c.base.alert - 1 : c.base.alert; }
        out.tests.push({ id: id('t'), crewId: c.id, day: td, ts: iso(startTs, td, 8), type: 'reaction', durationSec: 180, device: DEVICE,
          metrics: reactionMetrics(rng, speed, tired && td >= days - 2), alertness: alert, source: 'demo' });
      });
      /* Amsler grid on days 30 and 60, both eyes. */
      [30, 60].forEach(function (ad) {
        if (ad > days) { return; }
        ['R', 'L'].forEach(function (eye) {
          var cells = (c.id === 'c4' && ad === 60 && eye === 'R') ? [171, 172, 191] : [];
          out.tests.push({ id: id('t'), crewId: c.id, day: ad, ts: iso(startTs, ad, 8.5), type: 'amsler', eye: eye, gridN: 20, cells: cells, calibrated: true, source: 'demo' });
        });
      });
    });
    /* A few readings taken only when indicated. */
    addReading('c2', 40, 'spo2', 97); addReading('c2', 41, 'spo2', 98);
    addReading('c3', 50, 'spo2', 98); addReading('c4', 15, 'glucose', 94);
    /* The report Sadeem sent after the day-60 eye check. */
    if (days >= 60) {
      out.reports.push({ id: id('p'), crewId: 'c4', day: 60, ts: iso(startTs, 60, 9), route: 'pmc', environment: 'mars', oneWayDelayMin: 20, approved: true, status: 'sent', source: 'demo',
        sbar: { S: 'Sadeem (Mission specialist), mission day 60. Location: Mars transit or surface. 2 items flagged: Vision change pattern (Watch); Amsler grid (Watch).',
                B: 'Amsler grid: Right eye: 3 newly marked squares on mission day 60, compared with day 30. Left eye: no new distortion on mission day 60.',
                A: 'Rule-based summary from Crewcial. This is not a diagnosis. Patterns: Vision change pattern. Rules applied: P3, AM-NEW.',
                R: 'Requesting review at the next private medical conference. Self-care started: yes.' } });
    }
    return out;
  }

  /* ---------- Shadow-mode simulation: many crew-days with labelled events ---------- */
  var EVENT_TYPES = ['fever', 'fatigue', 'bp_rise', 'low_mood'];
  function simulate(opts) {
    opts = opts || {};
    var crewN = opts.crewN || 20, days = opts.days || 180, perCrew = opts.eventsPerCrew || 3;
    var rng = makeRng(opts.seed || 7);
    var startTs = Date.UTC(2030, 0, 1);
    var crews = [];
    for (var ci = 0; ci < crewN; ci++) {
      var cid = 'sim' + (ci + 1);
      var base = {
        bp_sys: between(rng, 104, 126), bp_dia: between(rng, 64, 80), hr: between(rng, 52, 70), temp: between(rng, 36.6, 37.1),
        sleep: between(rng, 6.4, 7.6), mood: between(rng, 62, 80), stress: between(rng, 22, 40), speed: between(rng, 3.8, 4.4)
      };
      /* Place events after the calibration period, at least 12 days apart. */
      var events = [], cursor = 24;
      for (var e = 0; e < perCrew; e++) {
        var type = EVENT_TYPES[intBetween(rng, 0, EVENT_TYPES.length - 1)];
        var start = cursor + intBetween(rng, 6, 30);
        var len = type === 'fever' ? intBetween(rng, 3, 5) : type === 'fatigue' ? intBetween(rng, 5, 7) : type === 'bp_rise' ? intBetween(rng, 4, 6) : intBetween(rng, 5, 8);
        if (start + len > days - 2) { break; }
        var mag = type === 'fever' ? { temp: between(rng, 0.8, 1.2), hr: between(rng, 10, 16) }
                : type === 'fatigue' ? { sleep: -between(rng, 1.6, 2.2), speedFactor: between(rng, 0.80, 0.88) }
                : type === 'bp_rise' ? { bp_sys: between(rng, 18, 26), bp_dia: between(rng, 10, 14) }
                : { mood: -between(rng, 22, 30), stress: between(rng, 20, 28) };
        events.push({ type: type, start: start, end: start + len - 1, mag: mag });
        cursor = start + len + 12;
      }
      var readings = [], tests = [], symptoms = [], k = 0;
      for (var d = 1; d <= days; d++) {
        var ev = null;
        for (var j = 0; j < events.length; j++) { if (d >= events[j].start && d <= events[j].end) { ev = events[j]; } }
        var shift = ev ? ev.mag : {};
        var vals = dayReadings(rng, base, shift);
        var ts = iso(startTs, d, 7.5);
        for (var key in vals) {
          if (Object.prototype.hasOwnProperty.call(vals, key)) {
            readings.push({ id: cid + 'r' + (k++), crewId: cid, day: d, ts: ts, indicator: key, value: vals[key], source: 'sim' });
          }
        }
        symptoms.push({ id: cid + 's' + d, crewId: cid, day: d, ts: ts, symptomId: 'none', region: 'all', severity: 0, source: 'sim' });
        var tired = ev && ev.type === 'fatigue';
        if (d % 7 === 0 || (tired && (d - ev.start) % 2 === 1)) {
          var sp = (base.speed + gauss(rng) * NOISE.speed) * (tired ? ev.mag.speedFactor : 1);
          tests.push({ id: cid + 't' + d, crewId: cid, day: d, ts: iso(startTs, d, 8), type: 'reaction', durationSec: 180, device: DEVICE, metrics: reactionMetrics(rng, sp, tired), source: 'sim' });
        }
      }
      crews.push({ id: cid, readings: readings, tests: tests, symptoms: symptoms, events: events });
    }
    return { days: days, crews: crews };
  }

  return { CREW: CREW, DEVICE: DEVICE, makeRng: makeRng, gauss: gauss, generateMission: generateMission, simulate: simulate };
});
