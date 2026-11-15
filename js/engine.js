/*! Crewcial - rules engine. Pure functions: no DOM, no storage, no clock.
 * AI-assistance disclosure: this file was generated with Claude (Anthropic) for
 * Team Crewcial, NASA Space Apps Challenge 2026, and is covered by the tests in
 * tests/. The clinical numbers it applies live in data/rules.js and are
 * placeholders until the team's physician signs them off.
 * Not a medical device. Advisory prototype only.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Crewcial = root.Crewcial || {}; root.Crewcial.Engine = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- States ---------- */
  var STATES = {
    act:         { rank: 5, tier: 1, word: 'Act now' },
    watch:       { rank: 4, tier: 2, word: 'Watch' },
    check:       { rank: 3, tier: 0, word: 'Re-check' },
    nodata:      { rank: 2, tier: 0, word: 'No data' },
    calibrating: { rank: 1, tier: 0, word: 'Learning your normal' },
    ok:          { rank: 0, tier: 0, word: 'In your range' }
  };
  var PATTERN_REGIONS = { P1: ['brain'], P2: ['immune', 'heart'], P3: ['eyes'], P4: ['brain', 'heart'], P5: ['brain'] };

  /* ---------- Small helpers ---------- */
  function rank(state) { return STATES[state] ? STATES[state].rank : -1; }
  function worstState(states) {
    var w = null;
    for (var i = 0; i < states.length; i++) { if (w === null || rank(states[i]) > rank(w)) { w = states[i]; } }
    return w;
  }
  function median(values) {
    if (!values.length) { return NaN; }
    var a = values.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function mad(values, med) {
    if (!values.length) { return NaN; }
    var m = (med === undefined) ? median(values) : med;
    return median(values.map(function (v) { return Math.abs(v - m); }));
  }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function cmp(v, op, limit) {
    if (op === '>=') { return v >= limit; }
    if (op === '<=') { return v <= limit; }
    if (op === '>') { return v > limit; }
    if (op === '<') { return v < limit; }
    return false;
  }
  function opWords(op) {
    return { '>=': 'at or above', '<=': 'at or below', '>': 'above', '<': 'below' }[op] || op;
  }
  function fmt(key, v) {
    if (!isNum(v)) { return String(v); }
    if (key === 'temp') { return v.toFixed(1); }
    if (key === 'sleep') { return String(Math.round(v * 100) / 100); }
    return String(Math.round(v));
  }
  /* Readings the person reports rather than measures. */
  var SELF_REPORT = { mood: 1, stress: 1, sleep: 1 };
  function fmtBand(key, v) {
    if (key === 'sleep') { return String(Math.round(v * 10) / 10); }
    return fmt(key, v);
  }
  function uniq(list) {
    var seen = {}, out = [];
    for (var i = 0; i < list.length; i++) { if (list[i] && !seen[list[i]]) { seen[list[i]] = 1; out.push(list[i]); } }
    return out;
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  /* ---------- Rule index ---------- */
  function indexRules(data) {
    var ix = {
      data: data, cfg: data.baseline, env: data.environments, schedule: data.schedule,
      rtProto: data.reactionTest, amProto: data.amslerTest,
      plaus: {}, abs: {}, ref: {}, base: {}, redflag: {}, patterns: {}, byId: {},
      symptomAny: null, amsler: null, rtBase: null, alertBase: null, context: null, all: [], disabled: []
    };
    data.rules.forEach(function (r) {
      ix.byId[r.id] = r;
      if (r.disabled) { ix.disabled.push(r); return; }   /* switched off: not evaluated, not in the release check */
      ix.all.push(r);
      if (r.type === 'context') { ix.context = r; }
      else if (r.type === 'plausibility') { ix.plaus[r.target] = r; }
      else if (r.type === 'absolute') { (ix.abs[r.target] = ix.abs[r.target] || []).push(r); }
      else if (r.type === 'reference') { ix.ref[r.target] = r; }
      else if (r.type === 'baseline') { ix.base[r.target] = r; }
      else if (r.type === 'baseline-tests') { ix.rtBase = r; }
      else if (r.type === 'baseline-alert') { ix.alertBase = r; }
      else if (r.type === 'redflag') { ix.redflag[r.symptomId] = r; }
      else if (r.type === 'symptom') { ix.symptomAny = r; }
      else if (r.type === 'amsler') { ix.amsler = r; }
      else if (r.type === 'pattern') { ix.patterns[r.id] = r; }
    });
    [data.baseline, data.schedule, data.reactionTest, data.amslerTest].forEach(function (r) {
      if (r && r.id) { ix.byId[r.id] = r; ix.all.push(r); }
    });
    return ix;
  }
  function unitOf(key, ix) { return ix.plaus[key] ? ix.plaus[key].unit : ''; }
  function isPlausible(value, plausRule) {
    if (!isNum(value)) { return false; }
    if (!plausRule) { return true; }
    return value >= plausRule.min && value <= plausRule.max;
  }
  function anyPlaceholder(ruleIds, ix) {
    for (var i = 0; i < ruleIds.length; i++) {
      var r = ix.byId[ruleIds[i]];
      if (r && r.status === 'placeholder') { return true; }
    }
    return false;
  }

  /* ---------- Series and baseline ---------- */
  /* One point per mission day: the latest reading of that day. */
  function seriesFor(readings, crewId, key) {
    var byDay = {};
    for (var i = 0; i < readings.length; i++) {
      var r = readings[i];
      if (r.crewId !== crewId || r.indicator !== key) { continue; }
      var cur = byDay[r.day];
      if (!cur || String(r.ts) >= String(cur.ts)) { byDay[r.day] = r; }
    }
    return Object.keys(byDay).map(function (d) {
      var r = byDay[d];
      return { day: r.day, value: r.value, context: r.context || null, ts: r.ts, source: r.source };
    }).sort(function (a, b) { return a.day - b.day; });
  }
  function pointOn(series, day) {
    for (var i = series.length - 1; i >= 0; i--) {
      if (series[i].day === day) { return series[i]; }
      if (series[i].day < day) { return null; }
    }
    return null;
  }
  /* The personal band for "day", built only from earlier days. */
  function computeBaseline(series, day, cfg, rule, phaseStartDay, plausRule, skipNotRested) {
    var start = phaseStartDay || 1;
    var from, to;
    if (cfg.method === 'fixed') { from = start; to = Math.min(day - 1, start + cfg.calibrationDays - 1); }
    else { var lag = cfg.lagDays || 0; from = Math.max(start, day - lag - cfg.windowDays); to = day - 1 - lag; }
    var vals = [];
    for (var i = 0; i < series.length; i++) {
      var p = series[i];
      if (p.day >= from && p.day <= to && isPlausible(p.value, plausRule) && !(skipNotRested && notRested(p))) { vals.push(p.value); }
    }
    var daysInPhase = Math.max(0, day - start);
    var out = { ready: false, n: vals.length, daysInPhase: daysInPhase, from: from, to: to, method: cfg.method };
    if (!vals.length) { return out; }
    var med = median(vals);
    var sd = 1.4826 * mad(vals, med);
    var hw = Math.max(cfg.k * sd, (rule && rule.minHalfWidth) || 0);
    if (rule && isNum(rule.maxHalfWidth)) { hw = Math.min(hw, rule.maxHalfWidth); }
    out.median = med; out.halfWidth = hw; out.low = med - hw; out.high = med + hw;
    out.ready = daysInPhase >= cfg.calibrationDays && vals.length >= cfg.minReadings;
    return out;
  }
  /* Rule CX-REST (decision 3.4): a reading marked after exercise or after caffeine. */
  function notRested(p) { return !!(p && p.context && (p.context.postExercise || p.context.caffeine)); }
  function restKeyOf(key, ix) { return !!(ix.context && ix.context.keys && ix.context.keys.indexOf(key) !== -1); }
  /* Decision 3.5: the flight surgeon may set one person's own Act-now limit where the rule allows it. */
  function personalLimit(rule, ctx) {
    var set = ctx && ctx.limits ? ctx.limits[rule.id] : null;
    if (!rule.personal || !isNum(set)) { return { value: rule.value, personal: false }; }
    var v = set;
    if (isNum(rule.personal.min)) { v = Math.max(rule.personal.min, v); }
    if (isNum(rule.personal.max)) { v = Math.min(rule.personal.max, v); }
    return { value: v, personal: true };
  }
  /* Decision 3.7: an impossible value on the dangerous side of the entry bounds. */
  function dangerSide(pl, v) {
    if (!pl || !pl.danger) { return false; }
    return (pl.danger !== 'high' && v < pl.min) || (pl.danger !== 'low' && v > pl.max);
  }
  function deviationOf(value, band, direction) {
    if ((direction === 'both' || direction === 'high') && value > band.high) { return 'high'; }
    if ((direction === 'both' || direction === 'low') && value < band.low) { return 'low'; }
    return null;
  }

  /* ---------- One stored reading key (for example "hr" or "bp_sys") ---------- */
  function evalKey(key, ctx, expected) {
    var ix = ctx.ix;
    var out = { key: key, state: 'nodata', value: null, ruleIds: [], band: null, deviation: null, run: 0, reason: '', expected: !!expected };
    ctx._series = ctx._series || {};
    var series = ctx._series[key] || (ctx._series[key] = seriesFor(ctx.readings, ctx.crewId, key));
    var today = pointOn(series, ctx.day);
    if (!today) {
      out.reason = expected ? 'Not entered today.' : 'Not measured today. This reading is taken only when there is a reason.';
      return out;
    }
    out.value = today.value; out.context = today.context;
    var unit = unitOf(key, ix);
    var pl = ix.plaus[key];
    var br = ix.base[key];

    /* 1. Plausibility: a typing error is never an alarm. */
    if (!isPlausible(today.value, pl)) {
      out.state = 'check'; out.implausible = true; out.ruleIds = pl ? [pl.id] : [];
      out.reason = 'The value ' + fmt(key, today.value) + ' is outside what can be entered for this reading' +
        (pl ? ' (' + pl.min + ' to ' + pl.max + ' ' + unit + ')' : '') + '. Check for a typing error and measure again.';
      if (dangerSide(pl, today.value)) { out.dangerSide = true; out.reason += ' If a repeat gives the same, or your device shows LO or HI, act now.'; }
      return out;
    }
    var restKey = restKeyOf(key, ix);
    if (br) { out.band = computeBaseline(series, ctx.day, ix.cfg, br, ctx.phaseStartDay || 1, pl, restKey); }

    /* 1b. Not rested (rule CX-REST): no limit and no usual range apply. Re-measure first. */
    if (restKey && notRested(today)) {
      var cx = ix.context;
      out.state = 'check'; out.notRested = true; out.ruleIds = [cx.id];
      out.reason = 'Taken ' + (today.context.postExercise ? 'after exercise' : 'after caffeine') + ', so it is not compared with any limit or with your usual range. ' +
        'Re-measure after ' + cx.waitMin + ' minutes with no exercise or caffeine, then ' + cx.restMin + ' minutes\' rest.';
      return out;
    }

    /* 2. Absolute limits: they skip the baseline. Tier 1 is Act now. Tier 2 (decisions 3.2 and 3.3)
       is urgent, not an emergency: Watch, with the report set to Urgent. */
    var abs = ix.abs[key] || [];
    for (var i = 0; i < abs.length; i++) {
      var lim = personalLimit(abs[i], ctx);
      if (cmp(today.value, abs[i].op, lim.value)) {
        var urgentLim = abs[i].tier === 2;
        out.state = urgentLim ? 'watch' : 'act'; out.ruleIds = [abs[i].id];
        if (urgentLim) { out.urgent = true; }
        out.deviation = abs[i].op.charAt(0) === '>' ? 'high' : 'low';
        out.reason = fmt(key, today.value) + ' ' + unit + ' is ' + opWords(abs[i].op) + (urgentLim ? ' the urgent limit of ' : ' the limit of ') + lim.value + ' ' + unit +
          (lim.personal ? ', set for you by the flight surgeon.' : '. This limit applies whatever your usual range is.');
        if (lim.personal) { out.personalLimit = true; }
        return out;
      }
    }

    /* 3. Tier 2: change from the person's own baseline. */
    if (br) {
      var b = out.band;
      out.ruleIds = [br.id, ix.cfg.id];
      if (!b.ready) {
        out.state = 'calibrating';
        out.reason = 'Crewcial is still learning your normal for this reading: ' + b.n + ' of ' + ix.cfg.minReadings +
          ' readings, and day ' + b.daysInPhase + ' of ' + ix.cfg.calibrationDays + ' in this mission phase. Only Act-now limits are active.';
        return out;
      }
      var dev = deviationOf(today.value, b, br.direction);
      var rangeText = fmtBand(key, b.low) + ' to ' + fmtBand(key, b.high) + ' ' + unit;
      if (!dev) {
        out.state = 'ok';
        out.reason = 'Inside your usual range of ' + rangeText + '.';
        return out;
      }
      var need = br.sustainDays || ix.cfg.sustainDays || 1;
      var run = 1, d = ctx.day - 1;
      while (run < need) {
        var p = pointOn(series, d);
        if (p && isPlausible(p.value, pl) && !(restKey && notRested(p)) && deviationOf(p.value, b, br.direction) === dev) { run++; d--; }
        else { break; }
      }
      out.deviation = dev; out.run = run;
      var side = dev === 'high' ? 'Above' : 'Below';
      if (run >= need) {
        out.state = 'watch';
        out.reason = side + ' your usual range of ' + rangeText + (need > 1 ? ' for ' + run + ' days in a row.' : '.');
      } else {
        out.state = 'check'; out.unsustained = true;
        out.reason = side + ' your usual range of ' + rangeText + ' today. ' + (SELF_REPORT[key]
          ? 'One day alone is not flagged. If it is still outside tomorrow, this becomes Watch.'
          : 'One reading alone is not flagged. Measure again. If it is still outside tomorrow, this becomes Watch.');
      }
      return out;
    }

    /* 4. Reference range, for readings taken only when indicated. */
    var rf = ix.ref[key];
    if (rf) {
      out.ruleIds = [rf.id]; out.refOnly = true;
      var refText = rf.min + ' to ' + rf.max + ' ' + unit;
      if (today.value >= rf.min && today.value <= rf.max) {
        out.state = 'ok'; out.reason = 'Inside the reference range of ' + refText + '.';
      } else if (today.value > rf.max && rf.highState === 'check') {
        /* Decision 3.2: a high blood sugar under the urgent limit is measured again first. */
        out.state = 'check'; out.deviation = 'high'; out.refHigh = true;
        out.reason = 'Above the reference range of ' + refText + '. Measure again before judging it.';
      } else {
        out.state = 'watch'; out.deviation = today.value > rf.max ? 'high' : 'low';
        out.reason = (out.deviation === 'high' ? 'Above' : 'Below') + ' the reference range of ' + refText + '.';
      }
      return out;
    }
    out.reason = 'No rule is defined for this reading yet.';
    return out;
  }

  /* ---------- One indicator (may have several parts, such as blood pressure) ---------- */
  function evalIndicator(def, ctx) {
    var expected = def.schedule === 'daily';
    var parts = def.parts.map(function (p) {
      var s = evalKey(p.key, ctx, expected);
      s.partLabel = p.label;
      return s;
    });
    var state = worstState(parts.map(function (p) { return p.state; })) || 'nodata';
    var worstParts = parts.filter(function (p) { return p.state === state; });
    var out = {
      id: def.id, label: def.label, unit: def.unit, schedule: def.schedule, expected: expected,
      state: state, parts: parts,
      ruleIds: uniq([].concat.apply([], worstParts.map(function (p) { return p.ruleIds; }))),
      urgent: worstParts.some(function (p) { return !!p.urgent; }),
      reason: uniq(worstParts.map(function (p) { return parts.length > 1 && state !== 'nodata' ? p.partLabel + ': ' + p.reason : p.reason; })).join(' '),
      deviation: worstParts.length ? worstParts[0].deviation : null,
      value: parts.length === 1 ? parts[0].value : null,
      valueText: ''
    };
    var have = parts.filter(function (p) { return p.value !== null; });
    if (def.id === 'bp' && have.length === 2) {
      out.valueText = fmt('bp_sys', parts[0].value) + '/' + fmt('bp_dia', parts[1].value) + ' mmHg';
      var bothPlausible = !parts[0].implausible && !parts[1].implausible;
      if (bothPlausible && parts[1].value >= parts[0].value) {
        out.state = 'check'; out.ruleIds = uniq(parts.map(function (p) { return ctx.ix.plaus[p.key] ? ctx.ix.plaus[p.key].id : null; }));
        out.reason = 'The lower number is not below the upper number. Check the entry and measure again.';
        out.deviation = null;
      }
    } else if (have.length) {
      out.valueText = have.map(function (p) {
        return (parts.length > 1 ? p.key.charAt(0).toUpperCase() + p.key.slice(1) + ' ' : '') + fmt(p.key, p.value) + (def.unit ? ' ' + def.unit : '');
      }).join(', ');
    }
    out.placeholder = anyPlaceholder(out.ruleIds, ctx.ix);
    return out;
  }

  /* ---------- Reaction test ---------- */
  function byDayTs(a, b) { return a.day - b.day || (String(a.ts) < String(b.ts) ? -1 : 1); }
  function reactionTests(ctx) {
    return ctx.tests.filter(function (t) { return t.crewId === ctx.crewId && t.type === 'reaction' && t.day <= ctx.day; }).sort(byDayTs);
  }
  function reactionDue(ctx, tests) {
    var sch = ctx.ix.schedule, why = [];
    var last = tests[tests.length - 1];
    var doneToday = !!last && last.day === ctx.day;
    if (doneToday) { return { due: false, why: [] }; }
    ctx._series = ctx._series || {};
    var sleepSeries = ctx._series.sleep || (ctx._series.sleep = seriesFor(ctx.readings, ctx.crewId, 'sleep'));
    var sl = pointOn(sleepSeries, ctx.day);
    if (sl && isPlausible(sl.value, ctx.ix.plaus.sleep) && sl.value <= sch.reactionAfterSleepAtOrBelowH) {
      why.push('you slept ' + fmt('sleep', sl.value) + ' hours last night');
    }
    if (isNum(ctx.evaDay) && ctx.evaDay - ctx.day >= 0 && ctx.evaDay - ctx.day <= sch.reactionBeforeEvaDays) {
      why.push(ctx.evaDay === ctx.day ? 'a spacewalk is planned today' : 'a spacewalk is planned tomorrow');
    }
    if (!last) { why.push('no test has been done yet'); }
    else if (ctx.day - last.day >= sch.reactionEveryDays) { why.push('the last test was ' + plural(ctx.day - last.day, 'day') + ' ago'); }
    return { due: why.length > 0, why: why };
  }
  /* How you feel versus how you perform (rule B-ALERT, pattern P5).
   * The alertness rating (0 tired to 10 alert) is asked just before each reaction test.
   * Both sides are judged against the person's own history, never a population norm. */
  function fmtRating(v) { return String(Math.round(v * 10) / 10); }
  function feelVsPerform(ctx, tests, last, rt) {
    var rule = ctx.ix.alertBase;
    if (!rule || !last || !isNum(last.alertness)) { return null; }
    var r = last.alertness;
    var out = { rating: r, state: 'learning', band: null, ruleIds: [rule.id], text: '' };
    var prev = tests.slice(0, -1).filter(function (t) { return isNum(t.alertness); }).slice(-rule.windowTests).map(function (t) { return t.alertness; });
    if (prev.length < rule.minTests || !rt.band) {
      out.text = 'You rated your alertness ' + r + ' of 10. Crewcial compares how you feel with how you perform once it knows your usual for both: ' +
        rule.minTests + ' earlier ratings and tests are needed (ratings so far: ' + prev.length + ').';
      return out;
    }
    var med = median(prev);
    var hw = Math.max(ctx.ix.cfg.k * 1.4826 * mad(prev, med), rule.minHalfWidth || 0);
    if (isNum(rule.maxHalfWidth)) { hw = Math.min(hw, rule.maxHalfWidth); }
    out.band = { low: med - hw, high: med + hw, median: med, n: prev.length };
    var feelLow = r < out.band.low;
    var perfLow = rt.test && rt.test.metrics && rt.test.metrics.meanSpeed < rt.band.low;
    var usual = ' (your usual is about ' + fmtRating(med) + ')';
    var speed = isNum(rt.pctSlower) ? (rt.pctSlower >= 0 ? rt.pctSlower + '% slower than' : (-rt.pctSlower) + '% faster than') + ' your usual' : '';
    if (!feelLow && perfLow) {
      out.state = 'blindspot';
      out.text = 'You rated your alertness ' + r + ' of 10, which is normal for you' + usual + '. But your responses were ' + speed + ', outside your own range. You may not feel this, so do not rely on how you feel today.';
    } else if (feelLow && perfLow) {
      out.state = 'aware';
      out.text = 'You rated your alertness ' + r + ' of 10, lower than usual' + usual + ', and your responses were ' + speed + '. How you feel matches the test today.';
    } else if (feelLow) {
      out.state = 'tired';
      out.text = 'You rated your alertness ' + r + ' of 10, lower than usual' + usual + ', but your responses were inside your own range.';
    } else {
      out.state = 'aligned';
      out.text = 'You rated your alertness ' + r + ' of 10' + usual + ', and your responses were inside your own range. How you feel matches the test today.';
    }
    return out;
  }
  function evalReaction(ctx) {
    var ix = ctx.ix, rule = ix.rtBase, sch = ix.schedule;
    var tests = reactionTests(ctx);
    var due = reactionDue(ctx, tests);
    var out = { id: 'rt', label: 'Reaction test', state: 'nodata', ruleIds: [], reason: '', value: null, valueText: '',
                due: due.due, dueWhy: due.why, expected: due.due, schedule: 'scheduled', deviation: null, test: null };
    var last = tests[tests.length - 1];
    if (!last) { out.reason = due.due ? 'A test is due because ' + due.why.join(' and ') + '.' : 'No reaction test yet.'; return out; }
    var age = ctx.day - last.day;
    out.lastDay = last.day;
    if (age > (sch.reactionFreshDays || 0)) {
      out.reason = 'The last test was on mission day ' + last.day + '.' + (due.due ? ' A new test is due because ' + due.why.join(' and ') + '.' : '');
      return out;
    }
    var m = last.metrics || {};
    out.test = last; out.value = m.meanSpeed;
    out.valueText = Math.round(m.medianRt) + ' ms median, ' + plural(m.lapses || 0, 'lapse');
    out.demoLength = last.durationSec < ix.rtProto.durationSec;
    out.stale = age > 0;
    out.ruleIds = rule ? [rule.id] : [];
    var prev = tests.slice(0, -1).filter(function (t) {
      return t.durationSec === last.durationSec && (t.device || '') === (last.device || '') && t.metrics && isNum(t.metrics.meanSpeed);
    });
    if (rule) { prev = prev.slice(-rule.windowTests); }
    if (!rule || prev.length < rule.minTests) {
      out.state = 'calibrating';
      out.reason = 'Crewcial needs ' + (rule ? rule.minTests : 3) + ' earlier tests of the same length on this device to learn your normal. So far: ' + prev.length + '.';
    } else {
      var speeds = prev.map(function (t) { return t.metrics.meanSpeed; });
      var med = median(speeds);
      var hw = Math.max(ix.cfg.k * 1.4826 * mad(speeds, med), med * (rule.minHalfWidthPct || 0) / 100);
      out.band = { low: med - hw, high: med + hw, median: med, n: prev.length, ready: true };
      var pct = Math.round((1 - m.meanSpeed / med) * 100);
      out.pctSlower = pct;
      if (m.meanSpeed < out.band.low) {
        out.state = 'watch'; out.deviation = 'low';
        out.reason = 'Your response speed is ' + pct + '% slower than your usual, which is outside your own range (' + prev.length + ' earlier tests).';
      } else {
        out.state = 'ok';
        out.reason = 'Your response speed is inside your own range (' + prev.length + ' earlier tests).';
      }
    }
    out.feel = feelVsPerform(ctx, tests, last, out);
    if (out.feel) { out.ruleIds = uniq(out.ruleIds.concat(out.feel.ruleIds)); }
    if (out.stale) { out.reason += ' This result is from mission day ' + last.day + '.'; }
    if (out.demoLength) { out.reason += ' Demo-length test: not a valid result.'; }
    if (due.due && out.state !== 'watch') {
      out.state = 'nodata';
      out.reason = 'A new test is due because ' + due.why.join(' and ') + '.';
    }
    out.placeholder = anyPlaceholder(out.ruleIds, ix);
    return out;
  }

  /* ---------- Amsler grid ---------- */
  function amslerTests(ctx) {
    return ctx.tests.filter(function (t) { return t.crewId === ctx.crewId && t.type === 'amsler' && t.day <= ctx.day; }).sort(byDayTs);
  }
  function amslerDue(ctx, tests, symptoms) {
    var sch = ctx.ix.schedule, why = [];
    var every = sch.amslerEveryDays;
    var lastTestDay = tests.length ? tests[tests.length - 1].day : 0;
    var lastScheduled = every ? Math.floor(ctx.day / every) * every : 0;
    if (lastScheduled >= every && lastTestDay < lastScheduled) {
      why.push('the scheduled check for mission day ' + lastScheduled + ' has not been done');
    }
    if (sch.amslerOnVisionSymptom && symptoms && lastTestDay < ctx.day) {
      for (var i = 0; i < symptoms.length; i++) {
        if (symptoms[i].crewId === ctx.crewId && symptoms[i].day === ctx.day && symptoms[i].symptomId === 'vision_change') {
          why.push('you reported a change in vision today'); break;
        }
      }
    }
    return { due: why.length > 0, why: why };
  }
  function evalAmsler(ctx) {
    var ix = ctx.ix, rule = ix.amsler;
    var tests = amslerTests(ctx);
    var due = amslerDue(ctx, tests, ctx.symptoms);
    var out = { id: 'amsler', label: 'Amsler grid', state: 'nodata', ruleIds: rule ? [rule.id] : [], reason: '', valueText: '',
                due: due.due, dueWhy: due.why, expected: due.due, schedule: 'scheduled', eyes: {}, newCount: 0, deviation: null };
    if (!tests.length) {
      out.reason = 'No Amsler grid test yet.' + (due.due ? ' A test is due because ' + due.why.join(' and ') + '.' : '');
      out.ruleIds = []; return out;
    }
    var flagged = false, texts = [];
    ['R', 'L'].forEach(function (eye) {
      var mine = tests.filter(function (t) { return t.eye === eye; });
      if (!mine.length) { return; }
      var latest = mine[mine.length - 1], prev = mine.length > 1 ? mine[mine.length - 2] : null;
      var prevSet = {};
      if (prev) { (prev.cells || []).forEach(function (c) { prevSet[c] = 1; }); }
      var fresh = (latest.cells || []).filter(function (c) { return !prevSet[c]; });
      out.eyes[eye] = { day: latest.day, cells: latest.cells || [], newCells: fresh, prevDay: prev ? prev.day : null };
      var name = eye === 'R' ? 'Right eye' : 'Left eye';
      if (fresh.length >= (rule ? rule.minNewSquares : 1)) {
        flagged = true; out.newCount += fresh.length;
        texts.push(name + ': ' + plural(fresh.length, 'newly marked square') + ' on mission day ' + latest.day +
          (prev ? ', compared with day ' + prev.day + '.' : '. There is no earlier map to compare with.'));
      } else {
        texts.push(name + ': no new distortion on mission day ' + latest.day + '.');
      }
    });
    out.lastDay = tests[tests.length - 1].day;
    out.valueText = flagged ? plural(out.newCount, 'new square') : 'No new distortion';
    if (flagged) { out.state = 'watch'; out.deviation = 'new'; }
    else if (due.due) { out.state = 'nodata'; texts.push('A new test is due because ' + due.why.join(' and ') + '.'); }
    else { out.state = 'ok'; }
    out.reason = texts.join(' ');
    out.placeholder = anyPlaceholder(out.ruleIds, ix);
    return out;
  }

  /* ---------- Symptoms ---------- */
  function evalSymptoms(ctx) {
    var ix = ctx.ix;
    var todays = ctx.symptoms.filter(function (s) { return s.crewId === ctx.crewId && s.day === ctx.day; });
    var out = { id: 'symptoms', label: 'Symptom check', state: 'nodata', expected: true, schedule: 'daily', ruleIds: [],
                reason: '', valueText: '', entries: [], redFlags: [], byRegion: {}, none: false, deviation: null };
    if (!todays.length) { out.reason = 'No symptom check today.'; return out; }
    var real = todays.filter(function (s) { return s.symptomId !== 'none'; });
    if (!real.length) {
      out.state = 'ok'; out.none = true; out.reason = 'You reported no symptoms today.'; out.valueText = 'None reported';
      return out;
    }
    out.entries = real;
    real.forEach(function (s) {
      var rf = ix.redflag[s.symptomId];
      var st = rf ? 'act' : 'watch';
      if (rf) { out.redFlags.push(s); out.ruleIds.push(rf.id); }
      else if (ix.symptomAny) { out.ruleIds.push(ix.symptomAny.id); }
      var reg = out.byRegion[s.region] = out.byRegion[s.region] || { state: 'ok', entries: [] };
      reg.entries.push(s);
      if (rank(st) > rank(reg.state)) { reg.state = st; }
    });
    out.ruleIds = uniq(out.ruleIds);
    out.state = out.redFlags.length ? 'act' : 'watch';
    out.valueText = plural(real.length, 'symptom') + ' reported';
    out.reason = out.redFlags.length
      ? plural(out.redFlags.length, 'red-flag symptom') + ' reported. Red flags are Act now whatever your readings are.'
      : plural(real.length, 'symptom') + ' reported today.';
    out.placeholder = anyPlaceholder(out.ruleIds, ix);
    return out;
  }
  function hasSymptomToday(ind, ids) {
    var e = ind.symptoms ? ind.symptoms.entries : [];
    for (var i = 0; i < e.length; i++) { if (ids.indexOf(e[i].symptomId) !== -1) { return true; } }
    return false;
  }

  /* ---------- Combined patterns ---------- */
  function part(ind, id, key) {
    if (!ind[id]) { return null; }
    for (var i = 0; i < ind[id].parts.length; i++) { if (ind[id].parts[i].key === key) { return ind[id].parts[i]; } }
    return null;
  }
  function evalPatterns(ind, ctx) {
    var ix = ctx.ix, P = ix.patterns, out = [];
    function add(rule, tier, supporting) {
      out.push({ id: rule.id, title: rule.title, tier: tier, state: tier === 1 ? 'act' : 'watch', supporting: supporting,
                 ruleIds: [rule.id], regions: PATTERN_REGIONS[rule.id] || [], placeholder: rule.status === 'placeholder' });
    }
    var sleep = part(ind, 'sleep', 'sleep'), hr = part(ind, 'hr', 'hr'), temp = part(ind, 'temp', 'temp'), mood = part(ind, 'mood', 'mood');
    var rt = ind.rt, am = ind.amsler;

    /* Decision 2.2: the blind spot is evaluated first, so it leads when it shows with the fatigue pattern. */
    if (P.P5 && rt && rt.feel && rt.feel.state === 'blindspot' && !rt.demoLength && !rt.stale) {
      add(P.P5, P.P5.tier, ['You rated your alertness ' + rt.feel.rating + ' of 10, normal for you (usually about ' + fmtRating(rt.feel.band.median) + ')',
                            'Reaction test: ' + rt.pctSlower + '% slower than your usual, outside your own range']);
    }
    if (P.P1 && sleep && rt) {
      var hasSleep = sleep.value !== null && !sleep.implausible;
      var shortSleep = hasSleep && sleep.value <= P.P1.shortSleepHours;
      var sleepLow = sleep.state === 'watch' && sleep.deviation === 'low';
      var rtSlow = rt.state === 'watch' && rt.deviation === 'low';
      if ((shortSleep || sleepLow) && rtSlow) {
        var s1 = ['Sleep last night: ' + fmt('sleep', sleep.value) + ' h' + (sleepLow ? ', below your usual range' : ''),
                  'Reaction test: slower than your usual range'];
        if (mood && mood.state === 'watch') { s1.push('Mood: below your usual range'); }
        add(P.P1, P.P1.tier, s1);
      }
    }
    if (P.P2 && temp && hr) {
      var tempHigh = temp.deviation === 'high' && (temp.state === 'watch' || temp.state === 'act' || temp.unsustained);
      var hrHigh = hr.deviation === 'high' && (hr.state === 'watch' || hr.state === 'act' || hr.unsustained);
      if (tempHigh && hrHigh) {
        var red = ind.symptoms && ind.symptoms.redFlags.length > 0;
        var s2 = ['Temperature: ' + fmt('temp', temp.value) + ' °C, above your usual range',
                  'Resting heart rate: ' + fmt('hr', hr.value) + ' bpm, above your usual range'];
        if (red) { s2.push('A red-flag symptom was reported today'); }
        add(P.P2, (red && P.P2.tier1WithRedFlag) ? 1 : P.P2.tier, s2);
      }
    }
    if (P.P3 && am && am.newCount > 0) {
      var withSym = hasSymptomToday(ind, P.P3.tier1WithSymptoms || []);
      var s3 = ['Amsler grid: ' + plural(am.newCount, 'newly marked square')];
      if (withSym) { s3.push('A headache or a vision symptom was reported today'); }
      add(P.P3, withSym ? 1 : P.P3.tier, s3);
    }
    if (P.P4 && sleep && hr) {
      if (sleep.state === 'watch' && sleep.deviation === 'low' && hr.deviation === 'high' && (hr.state === 'watch' || hr.unsustained)) {
        add(P.P4, P.P4.tier, ['Sleep: below your usual range', 'Resting heart rate: above your usual range']);
      }
    }
    return out;
  }

  /* ---------- Body regions ---------- */
  function rollup(items) {
    var considered = items.filter(function (s) { return s.state !== 'nodata' || s.expected; });
    if (!considered.length) { return 'nodata'; }
    return worstState(considered.map(function (s) { return s.state; }));
  }
  function regionSymptomStatus(regionId, sym) {
    if (sym.state === 'nodata') { return { id: 'symptoms', label: 'Symptoms', state: 'nodata', expected: true, reason: 'No symptom check today.' }; }
    var reg = sym.byRegion[regionId];
    if (!reg) { return { id: 'symptoms', label: 'Symptoms', state: 'ok', expected: true, reason: 'No symptoms reported here today.' }; }
    return { id: 'symptoms', label: 'Symptoms', state: reg.state, expected: true, entries: reg.entries,
             reason: plural(reg.entries.length, 'symptom') + ' reported here today.' };
  }
  function evalRegions(content, ind, patterns) {
    var out = {};
    content.regions.forEach(function (r) {
      var items = r.items.map(function (id) { return ind[id]; }).filter(Boolean);
      items.push(regionSymptomStatus(r.id, ind.symptoms));
      var pats = patterns.filter(function (p) { return p.regions.indexOf(r.id) !== -1; });
      var state = rollup(items.concat(pats.map(function (p) { return { state: p.state, expected: true }; })));
      out[r.id] = { id: r.id, name: r.name, state: state, items: items, patterns: pats };
    });
    return out;
  }

  /* ---------- Spacewalk readiness summary (never a go or no-go) ---------- */
  function readiness(ind, patterns, ctx) {
    var evaIn = isNum(ctx.evaDay) ? ctx.evaDay - ctx.day : null;
    var acts = [], cautions = [], missing = [];
    var core = ['sleep', 'rt', 'symptoms'];
    Object.keys(ind).forEach(function (id) {
      var s = ind[id];
      if (s.state === 'act') { acts.push(s.label + ': ' + s.reason); }
      else if (s.state === 'watch') { cautions.push(s.label + ': ' + s.reason); }
      else if (core.indexOf(id) !== -1 && (s.state === 'nodata' || s.state === 'check')) { missing.push(s.label); }
    });
    patterns.forEach(function (p) { (p.tier === 1 ? acts : cautions).unshift(p.title + ': ' + p.supporting.join('; ') + '.'); });
    var level = acts.length ? 'act' : cautions.length ? 'caution' : missing.length ? 'incomplete' : 'clear';
    var headline = {
      act: 'Act-now items are open',
      caution: 'Caution flags for the flight surgeon',
      incomplete: 'Incomplete: some inputs are missing',
      clear: 'No flags in today\'s data'
    }[level];
    return {
      evaInDays: evaIn, level: level, headline: headline, acts: acts, cautions: cautions, missing: missing,
      inputs: core.map(function (id) { return { id: id, label: ind[id].label, state: ind[id].state, valueText: ind[id].valueText, reason: ind[id].reason }; }),
      note: 'This summary supports the flight surgeon\'s readiness decision. It is not a go or no-go.'
    };
  }

  /* ---------- Escalation routing ---------- */
  function route(tier, environment, ix) {
    var env = ix.env[environment] || ix.env.station;
    return {
      environment: environment, label: env.label, steps: (tier === 1 ? env.tier1 : env.tier2).slice(),
      link: env.link, evac: env.evac, oneWayDelayMin: env.oneWayDelayMin,
      earliestReplyMin: isNum(env.oneWayDelayMin) ? env.oneWayDelayMin * 2 : null
    };
  }

  /* Which route a report takes by default, and who may see it. Private by default. */
  function suggestRoute(tier, behavioural, flagged, ix) {
    if (tier === 1) { return 'urgent'; }
    /* Decision 4.2: a new Amsler distortion reaches the flight surgeon without waiting for the weekly conference. */
    var urgentAmsler = !ix || !ix.amsler || ix.amsler.urgentReport;
    if (urgentAmsler && (flagged || []).some(function (f) { return (f.id === 'P3' || f.id === 'amsler') && f.state === 'watch'; })) { return 'urgent'; }
    /* Decisions 3.2 and 3.3: an urgent limit sends the report as Urgent too. */
    if ((flagged || []).some(function (f) { return f.urgent && f.state === 'watch'; })) { return 'urgent'; }
    return behavioural ? 'ppc' : 'pmc';
  }
  function audience(tier) {
    return tier === 1
      ? { crewMember: true, crewMedicalOfficer: true, flightSurgeon: true, crewmates: false, missionControl: false }
      : { crewMember: true, crewMedicalOfficer: false, flightSurgeon: true, crewmates: false, missionControl: false };
  }

  /* ---------- Everything for one crew member on one day ---------- */
  function evaluate(ctx, content) {
    ctx._series = {};
    var ind = {};
    content.indicators.forEach(function (def) {
      if (def.id === 'rt') { ind.rt = evalReaction(ctx); }
      else if (def.id === 'amsler') { ind.amsler = evalAmsler(ctx); }
      else if (def.id === 'symptoms') { ind.symptoms = evalSymptoms(ctx); }
      else { ind[def.id] = evalIndicator(def, ctx); }
    });
    var patterns = evalPatterns(ind, ctx);
    var regions = evalRegions(content, ind, patterns);
    var states = Object.keys(regions).map(function (k) { return regions[k].state; });
    var flagged = [];
    patterns.forEach(function (p) {
      flagged.push({ kind: 'pattern', id: p.id, label: p.title, state: p.state, tier: p.tier, reason: p.supporting.join('. ') + '.', ruleIds: p.ruleIds, placeholder: p.placeholder });
    });
    Object.keys(ind).forEach(function (id) {
      var s = ind[id];
      if (s.state === 'act' || s.state === 'watch' || s.state === 'check') {
        flagged.push({ kind: 'indicator', id: id, label: s.label, state: s.state, tier: STATES[s.state].tier, reason: s.reason, ruleIds: s.ruleIds, placeholder: !!s.placeholder, urgent: !!s.urgent });
      }
    });
    /* Worst first; patterns before single readings; otherwise keep the order the rules were evaluated in. */
    flagged.sort(function (a, b) { return rank(b.state) - rank(a.state) || ((a.kind === 'pattern') === (b.kind === 'pattern') ? 0 : (a.kind === 'pattern' ? -1 : 1)); });
    var dailyMissing = content.indicators.filter(function (d) { return d.schedule === 'daily' && ind[d.id].state === 'nodata'; }).map(function (d) { return d.id; });
    return {
      crewId: ctx.crewId, day: ctx.day, environment: ctx.environment,
      indicators: ind, patterns: patterns, regions: regions,
      overall: worstState(states) || 'nodata', flagged: flagged, dailyMissing: dailyMissing,
      readiness: readiness(ind, patterns, ctx)
    };
  }

  /* ---------- SBAR report text ---------- */
  function lastValues(readings, crewId, key, day, n) {
    var s = seriesFor(readings, crewId, key).filter(function (p) { return p.day <= day && p.day > day - n; });
    return s.map(function (p) { return 'day ' + p.day + ': ' + fmt(key, p.value); }).join(', ');
  }
  function buildSbar(res, ctx, content, crew) {
    var env = ctx.ix.env[ctx.environment] || ctx.ix.env.station;
    var items = res.flagged.filter(function (f) { return f.state === 'act' || f.state === 'watch'; });
    var tier1 = items.some(function (f) { return f.state === 'act'; });
    var who = (crew ? crew.name + (crew.role ? ' (' + crew.role + ')' : '') : 'Crew member');
    var S = who + ', mission day ' + res.day + '. Location: ' + env.label + '. ' +
      (items.length ? plural(items.length, 'item') + ' flagged: ' + items.map(function (f) { return f.label + ' (' + STATES[f.state].word + ')'; }).join('; ') + '.' : 'No items are flagged today.');
    var bLines = [];
    content.indicators.forEach(function (def) {
      var st = res.indicators[def.id];
      if (!st || !def.parts.length) { return; }
      var involved = st.state === 'act' || st.state === 'watch' ||
        res.patterns.some(function (p) { return (p.id === 'P1' && def.id === 'sleep') || (p.id === 'P2' && (def.id === 'temp' || def.id === 'hr')) || (p.id === 'P4' && (def.id === 'sleep' || def.id === 'hr')); });
      if (!involved) { return; }
      def.parts.forEach(function (p) {
        var ps = st.parts.filter(function (x) { return x.key === p.key; })[0];
        var line = def.label + (def.parts.length > 1 ? ' - ' + p.label : '') + ' (' + def.unit + '), last 7 days: ' + lastValues(ctx.readings, ctx.crewId, p.key, res.day, 7) + '.';
        if (ps && ps.band && ps.band.ready) { line += ' Usual range ' + fmtBand(p.key, ps.band.low) + ' to ' + fmtBand(p.key, ps.band.high) + '.'; }
        bLines.push(line);
      });
    });
    var rt = res.indicators.rt;
    if (rt && rt.test) { bLines.push('Reaction test on mission day ' + rt.test.day + ': ' + rt.valueText + '. ' + rt.reason); }
    if (rt && rt.feel) { bLines.push('Self-rated alertness just before the test: ' + rt.feel.rating + ' of 10' + (rt.feel.band ? ' (usually about ' + fmtRating(rt.feel.band.median) + ')' : '') + '.'); }
    var am = res.indicators.amsler;
    if (am && am.newCount > 0) { bLines.push('Amsler grid: ' + am.reason); }
    var sy = res.indicators.symptoms;
    if (sy && sy.entries.length) {
      bLines.push('Symptoms today: ' + sy.entries.map(function (e) {
        var def = content.symptoms.filter(function (x) { return x.id === e.symptomId; })[0];
        return (def ? def.label : (e.note || e.symptomId)) + (e.severity ? ' (' + ['', 'mild', 'moderate', 'severe'][e.severity] + ')' : '');
      }).join('; ') + '.');
    }
    if (isNum(ctx.evaDay) && ctx.evaDay >= res.day) { bLines.push('A spacewalk is planned for mission day ' + ctx.evaDay + '.'); }
    var B = bLines.length ? bLines.join('\n') : 'No relevant background recorded.';
    var ruleIds = uniq([].concat.apply([], items.map(function (f) { return f.ruleIds; })));
    var A = 'Rule-based summary from Crewcial. This is not a diagnosis. ' +
      (res.patterns.length ? 'Patterns: ' + res.patterns.map(function (p) { return p.title; }).join('; ') + '. ' : '') +
      (ruleIds.length ? 'Rules applied: ' + ruleIds.join(', ') + '. ' : '') +
      (anyPlaceholder(ruleIds, ctx.ix) ? 'Some of these rules are placeholders and are not clinically validated.' : '');
    var R = tier1
      ? 'Requesting urgent guidance from the flight surgeon. Crew medical officer informed: yes / no.'
      : (items.length ? 'Requesting review at the next private medical conference. Self-care started: yes / no.' : 'No request.');
    if (isNum(ctx.evaDay) && ctx.evaDay - res.day >= 0 && ctx.evaDay - res.day <= 2) {
      R += ' A spacewalk is planned for mission day ' + ctx.evaDay + '. Requesting the readiness decision.';
    }
    return { S: S, B: B, A: A.replace(/\s+$/, ''), R: R, tier: tier1 ? 1 : (items.length ? 2 : 0) };
  }

  /* ---------- Streak of completed daily checks ---------- */
  function streak(checks, crewId, day) {
    var done = {};
    checks.forEach(function (c) { if (c.crewId === crewId) { done[c.day] = 1; } });
    var d = done[day] ? day : day - 1, n = 0;
    while (d >= 1 && done[d]) { n++; d--; }
    return n;
  }

  /* ---------- Band history for charts ---------- */
  function bandSeries(readings, crewId, key, fromDay, toDay, ix, phaseStartDay) {
    var rule = ix.base[key];
    if (!rule) { return []; }
    var series = seriesFor(readings, crewId, key), out = [];
    for (var d = fromDay; d <= toDay; d++) {
      var b = computeBaseline(series, d, ix.cfg, rule, phaseStartDay || 1, ix.plaus[key], restKeyOf(key, ix));
      out.push({ day: d, ready: b.ready, low: b.ready ? b.low : null, high: b.ready ? b.high : null });
    }
    return out;
  }

  /* ---------- Rules screen and release gate ---------- */
  function describeRule(r, ix) {
    var u = r.unit ? ' ' + r.unit : '';
    switch (r.type) {
      case 'plausibility': return 'Entries outside ' + r.min + ' to ' + r.max + u + ' show "Re-check".';
      case 'absolute': return (r.tier === 2 ? 'Watch, with the report set to Urgent, when the reading is ' : 'Act now when the reading is ') + opWords(r.op) + ' ' + r.value + u + '.' + (r.tier === 2 ? ' A red-flag symptom with it makes it Act now.' : '') + (r.personal ? ' The flight surgeon can set a lower limit for one person, down to ' + r.personal.min + u + '.' : '');
      case 'context': return 'Readings marked after exercise or after caffeine are not judged. Re-measure after ' + r.waitMin + ' minutes with no exercise or caffeine, then ' + r.restMin + ' minutes\' rest.';
      case 'reference': return 'In range from ' + r.min + ' to ' + r.max + u + '. ' + (r.highState === 'check' ? 'Below shows Watch. Above shows Re-check: measure again first.' : 'Outside shows Watch.');
      case 'baseline':
        var nDays = r.sustainDays || ix.cfg.sustainDays;
        return 'Watch when the reading is ' + (r.direction === 'both' ? 'above or below' : r.direction === 'low' ? 'below' : 'above') +
          ' the personal band' + (nDays > 1 ? ' for ' + nDays + ' days in a row' : ' (one reading is enough)') + '. Band half-width is kept between ' + r.minHalfWidth + ' and ' + r.maxHalfWidth + '.';
      case 'baseline-tests': return 'Watch when response speed is below the personal band from the last ' + r.windowTests + ' tests (at least ' + r.minTests + '). Smallest band half-width: ' + r.minHalfWidthPct + '%.';
      case 'baseline-alert': return 'Compares the alertness you report before each reaction test (0 tired to 10 alert) with your own last ' + r.windowTests + ' ratings (at least ' + r.minTests + '). Band half-width is kept between ' + r.minHalfWidth + ' and ' + r.maxHalfWidth + ' points. On its own it never raises a flag.';
      case 'redflag': return 'Act now when this symptom is reported, whatever the readings are.';
      case 'symptom': return 'Watch when any symptom that is not a red flag is reported.';
      case 'amsler': return 'Watch when ' + r.minNewSquares + ' or more squares are newly marked, compared with the previous map of the same eye.' + (r.urgentReport ? ' The report is set to Urgent.' : '');
      case 'pattern':
        if (r.id === 'P1') { return 'Sleep of ' + r.shortSleepHours + ' hours or less (or below the personal band) together with a reaction test slower than the personal band.'; }
        if (r.id === 'P2') { return 'Temperature above the personal band together with heart rate above the personal band. Act now if a red-flag symptom is also reported.'; }
        if (r.id === 'P3') { return 'A newly marked Amsler square. Act now if a headache or a vision symptom is reported the same day.'; }
        if (r.id === 'P4') { return 'Sleep below the personal band together with resting heart rate above the personal band.'; }
        if (r.id === 'P5') { return 'Your alertness rating is inside your own usual range while your reaction test is slower than your own usual range. Needs a full-length test.'; }
        return r.note || '';
      case 'baseline-config': return 'Personal band: median plus or minus ' + r.k + ' robust standard deviations of ' + r.windowDays + ' days' +
        (r.method === 'rolling' ? ', ending ' + (r.lagDays || 0) + ' days before today so that a current episode does not shift it' : ' of the calibration period') +
        '. Starts after ' + r.calibrationDays + ' days and ' + r.minReadings + ' readings.';
      case 'schedule': return 'Reaction test every ' + r.reactionEveryDays + ' days, after a night of ' + r.reactionAfterSleepAtOrBelowH + ' hours or less, and the day before a spacewalk. Amsler grid every ' + r.amslerEveryDays + ' days and after a reported change in vision.';
      case 'protocol':
        if (r.id === 'RT-PROTO') { return (r.durationSec / 60) + '-minute test, a stimulus every ' + (r.isiMinMs / 1000) + ' to ' + (r.isiMaxMs / 1000) + ' seconds, lapse at ' + r.lapseMs + ' ms or slower, false start under ' + r.falseStartMs + ' ms.'; }
        if (r.id === 'AM-PROTO') { return (r.sizeMm / 10) + ' cm grid of ' + r.gridN + ' by ' + r.gridN + ' squares of ' + r.squareMm + ' mm, viewed at about ' + r.distanceCm + ' cm, one eye at a time.'; }
        return r.note || '';
      default: return r.note || '';
    }
  }
  function releaseCheck(data) {
    var ix = indexRules(data), placeholders = [], unsigned = [];
    ix.all.forEach(function (r) {
      if (r.status === 'placeholder') { placeholders.push(r.id); }
      else if (!r.signed) { unsigned.push(r.id); }
    });
    return { ready: placeholders.length === 0 && unsigned.length === 0, total: ix.all.length, placeholders: placeholders, unsigned: unsigned };
  }

  return {
    STATES: STATES, PATTERN_REGIONS: PATTERN_REGIONS,
    median: median, mad: mad, fmt: fmt, plural: plural, rank: rank, worstState: worstState,
    indexRules: indexRules, seriesFor: seriesFor, computeBaseline: computeBaseline, deviationOf: deviationOf,
    evalKey: evalKey, evalIndicator: evalIndicator, evalReaction: evalReaction, evalAmsler: evalAmsler,
    evalSymptoms: evalSymptoms, evalPatterns: evalPatterns, evalRegions: evalRegions,
    reactionDue: reactionDue, amslerDue: amslerDue, reactionTests: reactionTests, amslerTests: amslerTests, feelVsPerform: feelVsPerform,
    readiness: readiness, route: route, suggestRoute: suggestRoute, audience: audience, evaluate: evaluate, buildSbar: buildSbar, streak: streak,
    fmtBand: fmtBand, bandSeries: bandSeries, describeRule: describeRule, releaseCheck: releaseCheck, isPlausible: isPlausible, unitOf: unitOf, notRested: notRested, personalLimit: personalLimit
  };
});
