/* Crewcial - unit tests for the rules engine.
 * Run: node --test tests/engine.test.js
 * These tests use fixture rules (tests/fixtures.js), so they keep passing when the
 * app's placeholder numbers are replaced by signed-off values.
 * AI-assistance disclosure: generated with Claude (Anthropic) for Team Crewcial. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const F = require('./fixtures.js');
const C = F.Content;

const rules = F.fixtureRules();
const def = id => C.indicators.find(d => d.id === id);
const evalInd = (id, o) => E.evalIndicator(def(id), F.ctxOf(E, o.rules || rules, o));

test('median and MAD', () => {
  assert.equal(E.median([3, 1, 2]), 2);
  assert.equal(E.median([4, 1, 2, 3]), 2.5);
  assert.equal(E.mad([1, 2, 3, 4, 100]), 1);
  assert.ok(Number.isNaN(E.median([])));
});

test('no reading today is "No data", never "In your range"', () => {
  const readings = F.without(F.steadyDays('a', 20), 'a', 20, 'hr');
  const s = evalInd('hr', { readings });
  assert.equal(s.state, 'nodata');
  assert.equal(s.expected, true);
});

test('an implausible entry shows Re-check and never raises an alarm', () => {
  const readings = F.setToday(F.steadyDays('a', 20), 'a', 20, 'hr', 700);
  const s = evalInd('hr', { readings });
  assert.equal(s.state, 'check');
  assert.deepEqual(s.ruleIds, ['PL-HR']);
  assert.match(s.reason, /typing error/);
});

test('a Tier 1 limit fires during calibration: it skips the baseline', () => {
  const readings = F.setToday(F.steadyDays('a', 2), 'a', 2, 'hr', 160);
  const s = evalInd('hr', { readings, day: 2 });
  assert.equal(s.state, 'act');
  assert.deepEqual(s.ruleIds, ['A-HR-HI']);
});

test('a slow drift that the baseline has absorbed still hits the Tier 1 limit', () => {
  let readings = [];
  for (let d = 1; d <= 40; d++) { readings.push(F.reading('a', d, 'hr', 60 + d * 2.3)); }   // creeps up every day
  const s = evalInd('hr', { readings, day: 40 });
  assert.equal(s.state, 'act');
});

test('during the calibration period the state is "Learning your normal"', () => {
  const s = evalInd('hr', { readings: F.steadyDays('a', 3), day: 3 });
  assert.equal(s.state, 'calibrating');
  assert.match(s.reason, /learning your normal/i);
});

test('a reading inside the personal band is "In your range"', () => {
  const s = evalInd('hr', { readings: F.steadyDays('a', 20) });
  assert.equal(s.state, 'ok');
  assert.ok(s.parts[0].band.ready);
});

test('one reading outside the band is Re-check; two days in a row is Watch', () => {
  let readings = F.setToday(F.steadyDays('a', 20), 'a', 20, 'hr', 80);
  let s = evalInd('hr', { readings });
  assert.equal(s.state, 'check');
  assert.equal(s.parts[0].unsustained, true);
  readings = F.setToday(readings, 'a', 19, 'hr', 81);
  s = evalInd('hr', { readings });
  assert.equal(s.state, 'watch');
  assert.equal(s.deviation, 'high');
  assert.match(s.reason, /2 days in a row/);
});

test('two days outside the band in opposite directions is not a sustained change', () => {
  let readings = F.setToday(F.steadyDays('a', 20), 'a', 20, 'hr', 80);
  readings = F.setToday(readings, 'a', 19, 'hr', 42);
  assert.equal(evalInd('hr', { readings }).state, 'check');
});

test('sleep: one short night is Watch, and a long night is not flagged', () => {
  let readings = F.setToday(F.steadyDays('a', 20), 'a', 20, 'sleep', 4.5);
  assert.equal(evalInd('sleep', { readings }).state, 'watch');
  readings = F.setToday(readings, 'a', 20, 'sleep', 11);
  assert.equal(evalInd('sleep', { readings }).state, 'ok');
});

test('implausible past values are left out of the baseline', () => {
  let readings = F.steadyDays('a', 20);
  readings = F.setToday(readings, 'a', 15, 'hr', 900);
  readings = F.setToday(readings, 'a', 16, 'hr', 1);
  const s = evalInd('hr', { readings });
  assert.equal(s.state, 'ok');
  assert.ok(Math.abs(s.parts[0].band.median - 60) <= 1);
});

test('the band lags behind today, so a current episode does not widen it', () => {
  const lagged = F.fixtureRules({ baseline: { lagDays: 5, windowDays: 10 } });
  let readings = F.steadyDays('a', 30);
  for (let d = 26; d <= 30; d++) { readings = F.setToday(readings, 'a', d, 'temp', 38.2); }
  const s = evalInd('temp', { readings, day: 30, rules: lagged });
  assert.equal(s.state, 'watch');
  assert.ok(s.parts[0].band.high < 37.5, 'band stayed near the usual temperature');
  assert.equal(s.parts[0].band.to, 24);
});

test('the band half-width is capped, so a very variable person is still flagged', () => {
  let readings = [];
  const noisy = [4, 9, 5, 8.5, 4.5, 9, 5, 8, 4, 9, 5.5, 8.5, 4.5, 9, 5, 8, 4, 9, 5, 8.5];
  noisy.forEach((v, i) => readings.push(F.reading('a', i + 1, 'sleep', v)));
  readings.push(F.reading('a', 21, 'sleep', 3));
  const s = evalInd('sleep', { readings, day: 21 });
  assert.ok(s.parts[0].band.halfWidth <= 1.5 + 1e-9);
  assert.equal(s.state, 'watch');
});

test('blood pressure: lower number not below upper number is Re-check', () => {
  let readings = F.setToday(F.steadyDays('a', 20), 'a', 20, 'bp_sys', 70);
  readings = F.setToday(readings, 'a', 20, 'bp_dia', 110);
  const s = evalInd('bp', { readings });
  assert.equal(s.state, 'check');
  assert.match(s.reason, /lower number/);
});

test('blood pressure shows both numbers and takes the worse part', () => {
  let readings = F.setToday(F.steadyDays('a', 20), 'a', 20, 'bp_sys', 150);
  readings = F.setToday(readings, 'a', 20, 'bp_dia', 70);
  readings = F.setToday(readings, 'a', 19, 'bp_sys', 152);
  const s = evalInd('bp', { readings });
  assert.equal(s.state, 'watch');
  assert.equal(s.valueText, '150/70 mmHg');
});

test('a reading taken only when indicated uses the reference range and the Tier 1 limit', () => {
  const base = F.steadyDays('a', 20);
  assert.equal(evalInd('spo2', { readings: base.concat([F.reading('a', 20, 'spo2', 98)]) }).state, 'ok');
  assert.equal(evalInd('spo2', { readings: base.concat([F.reading('a', 20, 'spo2', 94)]) }).state, 'watch');
  assert.equal(evalInd('spo2', { readings: base.concat([F.reading('a', 20, 'spo2', 90)]) }).state, 'act');
  const none = evalInd('spo2', { readings: base });
  assert.equal(none.state, 'nodata');
  assert.equal(none.expected, false);
});

test('reaction test: needs earlier tests on the same device, then flags a slow result', () => {
  const o = { readings: F.steadyDays('a', 20), symptoms: F.noSymptoms('a', [20]) };
  let tests = [F.rtTest('a', 20, 4.0)];
  assert.equal(E.evalReaction(F.ctxOf(E, rules, Object.assign({ tests }, o))).state, 'calibrating');
  tests = [F.rtTest('a', 5, 4.0), F.rtTest('a', 10, 4.1), F.rtTest('a', 15, 3.95), F.rtTest('a', 20, 4.05)];
  assert.equal(E.evalReaction(F.ctxOf(E, rules, Object.assign({ tests }, o))).state, 'ok');
  tests[3] = F.rtTest('a', 20, 3.3);
  const slow = E.evalReaction(F.ctxOf(E, rules, Object.assign({ tests }, o)));
  assert.equal(slow.state, 'watch');
  assert.equal(slow.deviation, 'low');
  tests[3] = F.rtTest('a', 20, 3.3, { device: 'dev-b' });
  assert.equal(E.evalReaction(F.ctxOf(E, rules, Object.assign({ tests }, o))).state, 'calibrating');
});

test('reaction test: a demo-length test is labelled as not valid', () => {
  const tests = [F.rtTest('a', 20, 4.0, { durationSec: 20 })];
  const s = E.evalReaction(F.ctxOf(E, rules, { readings: F.steadyDays('a', 20), tests }));
  assert.equal(s.demoLength, true);
  assert.match(s.reason, /not a valid result/);
});

test('reaction test is due after short sleep, before a spacewalk and on the cadence', () => {
  const steady = F.steadyDays('a', 20);
  const recent = [F.rtTest('a', 18, 4.0)];
  let due = E.reactionDue(F.ctxOf(E, rules, { readings: steady, tests: recent }), recent);
  assert.equal(due.due, false);
  due = E.reactionDue(F.ctxOf(E, rules, { readings: F.setToday(steady, 'a', 20, 'sleep', 5.5), tests: recent }), recent);
  assert.equal(due.due, true);
  assert.match(due.why.join(' '), /slept 5.5 hours/);
  due = E.reactionDue(F.ctxOf(E, rules, { readings: steady, tests: recent, evaDay: 21 }), recent);
  assert.match(due.why.join(' '), /spacewalk is planned tomorrow/);
  const old = [F.rtTest('a', 12, 4.0)];
  due = E.reactionDue(F.ctxOf(E, rules, { readings: steady, tests: old }), old);
  assert.match(due.why.join(' '), /8 days ago/);
  const today = [F.rtTest('a', 20, 4.0)];
  assert.equal(E.reactionDue(F.ctxOf(E, rules, { readings: F.setToday(steady, 'a', 20, 'sleep', 5), tests: today, evaDay: 21 }), today).due, false);
});

test('a due reaction test that has not been done is "No data", not green', () => {
  const tests = [F.rtTest('a', 5, 4.0), F.rtTest('a', 10, 4.1), F.rtTest('a', 15, 3.95), F.rtTest('a', 19, 4.05)];
  const readings = F.setToday(F.steadyDays('a', 20), 'a', 20, 'sleep', 5);
  const s = E.evalReaction(F.ctxOf(E, rules, { readings, tests }));
  assert.equal(s.state, 'nodata');
  assert.equal(s.expected, true);
});

test('Amsler grid: newly marked squares are flagged against the previous map of the same eye', () => {
  let tests = [F.amTest('a', 30, 'R', []), F.amTest('a', 30, 'L', []), F.amTest('a', 60, 'R', [10, 11]), F.amTest('a', 60, 'L', [])];
  let s = E.evalAmsler(F.ctxOf(E, rules, { day: 61, tests }));
  assert.equal(s.state, 'watch');
  assert.equal(s.newCount, 2);
  assert.deepEqual(s.eyes.R.newCells, [10, 11]);
  tests = tests.concat([F.amTest('a', 61, 'R', [10, 11]), F.amTest('a', 61, 'L', [])]);
  s = E.evalAmsler(F.ctxOf(E, rules, { day: 61, tests }));
  assert.equal(s.state, 'ok', 'the same squares again are not new');
});

test('Amsler grid: a first map with marks is flagged, and a clean map is in range', () => {
  assert.equal(E.evalAmsler(F.ctxOf(E, rules, { day: 10, tests: [F.amTest('a', 10, 'R', [5])] })).state, 'watch');
  assert.equal(E.evalAmsler(F.ctxOf(E, rules, { day: 10, tests: [F.amTest('a', 10, 'R', []), F.amTest('a', 10, 'L', [])] })).state, 'ok');
});

test('Amsler grid is due on the schedule, stays due when overdue, and after a vision symptom', () => {
  const clean30 = [F.amTest('a', 30, 'R', []), F.amTest('a', 30, 'L', [])];
  assert.equal(E.evalAmsler(F.ctxOf(E, rules, { day: 29, tests: [] })).due, false);
  assert.equal(E.evalAmsler(F.ctxOf(E, rules, { day: 30, tests: [] })).due, true);
  assert.equal(E.evalAmsler(F.ctxOf(E, rules, { day: 45, tests: [] })).due, true);
  assert.equal(E.evalAmsler(F.ctxOf(E, rules, { day: 45, tests: clean30 })).due, false);
  const overdue = E.evalAmsler(F.ctxOf(E, rules, { day: 63, tests: clean30 }));
  assert.equal(overdue.due, true);
  assert.equal(overdue.state, 'nodata');
  const sym = E.evalAmsler(F.ctxOf(E, rules, { day: 45, tests: clean30, symptoms: [F.symptom('a', 45, 'vision_change', 'eyes')] }));
  assert.match(sym.dueWhy.join(' '), /change in vision/);
});

test('symptoms: none, an ordinary symptom, a red flag, and no entry', () => {
  const mk = symptoms => E.evalSymptoms(F.ctxOf(E, rules, { symptoms }));
  assert.equal(mk([]).state, 'nodata');
  assert.equal(mk(F.noSymptoms('a', [20])).state, 'ok');
  const w = mk([F.symptom('a', 20, 'headache', 'brain')]);
  assert.equal(w.state, 'watch');
  assert.deepEqual(w.ruleIds, ['SY-ANY']);
  const r = mk([F.symptom('a', 20, 'chest_pain', 'heart'), F.symptom('a', 20, 'headache', 'brain')]);
  assert.equal(r.state, 'act');
  assert.equal(r.byRegion.heart.state, 'act');
  assert.equal(r.byRegion.brain.state, 'watch');
  assert.equal(mk(F.noSymptoms('a', [20]).concat([F.symptom('a', 20, 'headache', 'brain')])).state, 'watch', 'a reported symptom wins over "none"');
});

/* ---------- Patterns, regions, readiness ---------- */
function evaluate(o) { return E.evaluate(F.ctxOf(E, o.rules || rules, o), C); }
const slowTests = [F.rtTest('a', 5, 4.0), F.rtTest('a', 10, 4.1), F.rtTest('a', 15, 3.95), F.rtTest('a', 20, 3.3)];
const okTests = [F.rtTest('a', 5, 4.0), F.rtTest('a', 10, 4.1), F.rtTest('a', 15, 3.95), F.rtTest('a', 20, 4.05)];

test('P1 fatigue pattern needs both short sleep and a slow reaction test', () => {
  const steady = F.steadyDays('a', 20), none = F.noSymptoms('a', [20]);
  const short = F.setToday(steady, 'a', 20, 'sleep', 5);
  assert.deepEqual(evaluate({ readings: short, tests: slowTests, symptoms: none }).patterns.map(p => p.id), ['P1']);
  assert.deepEqual(evaluate({ readings: short, tests: okTests, symptoms: none }).patterns.map(p => p.id), []);
  assert.deepEqual(evaluate({ readings: steady, tests: slowTests, symptoms: none }).patterns.map(p => p.id), []);
});

test('P2 possible infection: temperature and heart rate both above the band; Act now with a red flag', () => {
  let readings = F.setToday(F.steadyDays('a', 20), 'a', 20, 'temp', 38.1);
  readings = F.setToday(readings, 'a', 20, 'hr', 76);
  let res = evaluate({ readings, tests: okTests, symptoms: F.noSymptoms('a', [20]) });
  assert.deepEqual(res.patterns.map(p => p.id + ':' + p.tier), ['P2:2']);
  assert.equal(res.regions.immune.state, 'watch');
  res = evaluate({ readings, tests: okTests, symptoms: [F.symptom('a', 20, 'chest_pain', 'heart')] });
  assert.deepEqual(res.patterns.map(p => p.id + ':' + p.tier), ['P2:1']);
  const onlyTemp = F.setToday(F.steadyDays('a', 20), 'a', 20, 'temp', 38.1);
  assert.deepEqual(evaluate({ readings: onlyTemp, tests: okTests, symptoms: F.noSymptoms('a', [20]) }).patterns, []);
});

test('P3 vision change: Watch alone, Act now with a headache the same day', () => {
  const tests = okTests.concat([F.amTest('a', 10, 'R', []), F.amTest('a', 20, 'R', [44])]);
  let res = evaluate({ readings: F.steadyDays('a', 20), tests, symptoms: F.noSymptoms('a', [20]) });
  assert.deepEqual(res.patterns.map(p => p.id + ':' + p.tier), ['P3:2']);
  assert.equal(res.regions.eyes.state, 'watch');
  res = evaluate({ readings: F.steadyDays('a', 20), tests, symptoms: [F.symptom('a', 20, 'headache', 'brain')] });
  assert.deepEqual(res.patterns.map(p => p.id + ':' + p.tier), ['P3:1']);
  assert.equal(res.regions.eyes.state, 'act');
});

test('P4 strain watch: sleep below the band together with heart rate above it', () => {
  let readings = F.setToday(F.steadyDays('a', 20), 'a', 20, 'sleep', 4.5);
  readings = F.setToday(readings, 'a', 20, 'hr', 75);
  const res = evaluate({ readings, tests: okTests, symptoms: F.noSymptoms('a', [20]) });
  assert.ok(res.patterns.some(p => p.id === 'P4'));
});

test('a normal day is all "In your range"', () => {
  const res = evaluate({ readings: F.steadyDays('a', 20), tests: okTests, symptoms: F.noSymptoms('a', [20]) });
  assert.equal(res.overall, 'ok');
  assert.deepEqual(res.flagged, []);
  assert.equal(res.readiness.level, 'clear');
  Object.values(res.regions).forEach(r => assert.equal(r.state, 'ok', r.id));
});

test('a body region with a missing daily reading is grey, never green', () => {
  const readings = F.without(F.steadyDays('a', 20), 'a', 20, 'temp');
  const res = evaluate({ readings, tests: okTests, symptoms: F.noSymptoms('a', [20]) });
  assert.equal(res.regions.immune.state, 'nodata');
  assert.equal(res.regions.heart.state, 'ok');
  assert.equal(res.overall, 'nodata');
  assert.deepEqual(res.dailyMissing, ['temp']);
});

test('a reading that is taken only when indicated does not grey out its region', () => {
  const res = evaluate({ readings: F.steadyDays('a', 20), tests: okTests, symptoms: F.noSymptoms('a', [20]) });
  assert.equal(res.indicators.spo2.state, 'nodata');
  assert.equal(res.regions.lungs.state, 'ok');
});

test('readiness summary: caution, act, incomplete, and it is never a go or no-go', () => {
  const none = F.noSymptoms('a', [20]);
  const short = F.setToday(F.steadyDays('a', 20), 'a', 20, 'sleep', 5);
  const caution = evaluate({ readings: short, tests: slowTests, symptoms: none, evaDay: 21 }).readiness;
  assert.equal(caution.level, 'caution');
  assert.equal(caution.evaInDays, 1);
  assert.match(caution.note, /not a go or no-go/);
  assert.match(caution.cautions[0], /Fatigue pattern/);
  const act = evaluate({ readings: F.steadyDays('a', 20), tests: okTests, symptoms: [F.symptom('a', 20, 'chest_pain', 'heart')] }).readiness;
  assert.equal(act.level, 'act');
  const inc = evaluate({ readings: F.steadyDays('a', 20), tests: okTests, symptoms: [] }).readiness;
  assert.equal(inc.level, 'incomplete');
  assert.deepEqual(inc.missing, ['Symptom check']);
});

test('escalation steps depend on where the crew is', () => {
  const ix = E.indexRules(rules);
  const station = E.route(1, 'station', ix), mars = E.route(1, 'mars', ix);
  assert.notDeepEqual(station.steps, mars.steps);
  assert.equal(station.earliestReplyMin, null);
  assert.equal(mars.oneWayDelayMin, 20);
  assert.equal(mars.earliestReplyMin, 40);
  assert.match(mars.steps[0], /Do not wait for the ground/);
  assert.match(E.route(2, 'mars', ix).steps[1], /stored and forwarded/);
});

test('reports are private by default', () => {
  assert.equal(E.suggestRoute(2, false), 'pmc');
  assert.equal(E.suggestRoute(2, true), 'ppc');
  assert.equal(E.suggestRoute(1, false), 'urgent');
  const t2 = E.audience(2), t1 = E.audience(1);
  assert.equal(t2.crewMedicalOfficer, false);
  assert.equal(t2.crewmates, false);
  assert.equal(t2.missionControl, false);
  assert.equal(t1.crewMedicalOfficer, true);
  assert.equal(t1.crewmates, false);
});

test('SBAR text names the flags, the rules and the spacewalk, and says it is not a diagnosis', () => {
  const short = F.setToday(F.steadyDays('a', 20), 'a', 20, 'sleep', 5);
  const ctx = F.ctxOf(E, rules, { readings: short, tests: slowTests, symptoms: F.noSymptoms('a', [20]), evaDay: 21, environment: 'mars' });
  const res = E.evaluate(ctx, C);
  const s = E.buildSbar(res, ctx, C, { name: 'Test Person', role: 'Engineer' });
  assert.match(s.S, /Test Person \(Engineer\), mission day 20\. Location: Mars transit or surface\./);
  assert.match(s.S, /Fatigue pattern \(Watch\)/);
  assert.match(s.B, /Sleep \(h\), last 7 days/);
  assert.match(s.B, /Reaction test on mission day 20/);
  assert.match(s.A, /not a diagnosis/);
  assert.match(s.A, /P1/);
  /* 0.7.0, signed 15 Nov 2026: fatigue the day before a spacewalk is urgent, not an emergency */
  assert.match(s.R, /^Urgent, not an emergency\. Requesting a reply from the flight surgeon within 24 hours\./);
  assert.match(s.R, /readiness decision/);
  /* With no spacewalk near, the same findings ask for review at the weekly conference */
  const ctx2 = F.ctxOf(E, rules, { readings: short, tests: slowTests, symptoms: F.noSymptoms('a', [20]), environment: 'mars' });
  const s2 = E.buildSbar(E.evaluate(ctx2, C), ctx2, C, { name: 'Test Person', role: 'Engineer' });
  assert.match(s2.R, /next private medical conference/);
  assert.doesNotMatch(s2.R, /Urgent/);
  assert.equal(s.tier, 2);
});

test('SBAR for a red flag asks for urgent guidance', () => {
  const ctx = F.ctxOf(E, rules, { readings: F.steadyDays('a', 20), tests: okTests, symptoms: [F.symptom('a', 20, 'chest_pain', 'heart', 3)] });
  const s = E.buildSbar(E.evaluate(ctx, C), ctx, C, { name: 'T', role: '' });
  assert.equal(s.tier, 1);
  assert.match(s.R, /urgent guidance/);
  assert.match(s.B, /Chest pain \(severe\)/);
});

test('streak counts days in a row with a completed check', () => {
  const checks = [1, 2, 3, 5, 6, 7].map(day => ({ crewId: 'a', day }));
  assert.equal(E.streak(checks, 'a', 7), 3);
  assert.equal(E.streak(checks, 'a', 8), 3, 'today not done yet keeps yesterday\'s streak');
  assert.equal(E.streak(checks, 'a', 9), 0);
  assert.equal(E.streak(checks, 'b', 7), 0);
});

test('band history for charts has one entry per day and no band before calibration', () => {
  const bs = E.bandSeries(F.steadyDays('a', 20), 'a', 'hr', 1, 20, E.indexRules(rules), 1);
  assert.equal(bs.length, 20);
  assert.equal(bs[2].ready, false);
  assert.equal(bs[19].ready, true);
  assert.ok(bs[19].low < 60 && bs[19].high > 60);
});

test('release gate: fixture rules are ready, and any placeholder or unsigned rule blocks release', () => {
  assert.equal(E.releaseCheck(rules).ready, true);
  const draft = F.fixtureRules();
  draft.rules[0].status = 'placeholder';
  draft.rules[1].signed = false;
  const rc = E.releaseCheck(draft);
  assert.equal(rc.ready, false);
  assert.deepEqual(rc.placeholders, ['PL-BPS']);
  assert.deepEqual(rc.unsigned, ['PL-BPD']);
});

/* ---------- How you feel versus how you perform (B-ALERT, P5) ---------- */
/* Three earlier full-length tests with ratings 7, 8, 7, then today's test. */
const rated = (todaySpeed, todayRating, extra) => [F.rtTest('a', 5, 4.0, { alertness: 7 }), F.rtTest('a', 10, 4.1, { alertness: 8 }), F.rtTest('a', 15, 3.95, { alertness: 7 }),
  F.rtTest('a', 20, todaySpeed, Object.assign({ alertness: todayRating }, extra || {}))];
const fvp = (tests, o) => E.evalReaction(F.ctxOf(E, rules, Object.assign({ readings: F.steadyDays('a', 20), symptoms: F.noSymptoms('a', [20]), tests }, o || {})));

test('feel versus perform: still learning until there are 3 earlier ratings', () => {
  const tests = [F.rtTest('a', 5, 4.0), F.rtTest('a', 10, 4.1, { alertness: 7 }), F.rtTest('a', 15, 3.95, { alertness: 8 }), F.rtTest('a', 20, 3.3, { alertness: 8 })];
  const s = fvp(tests);
  assert.equal(s.state, 'watch', 'the speed check itself still works');
  assert.equal(s.feel.state, 'learning');
  assert.match(s.feel.text, /ratings so far: 2/);
  assert.deepEqual(evaluate({ readings: F.steadyDays('a', 20), tests, symptoms: F.noSymptoms('a', [20]) }).patterns.map(p => p.id), []);
});

test('feel versus perform: a usual rating with a slow test is the blind spot (P5)', () => {
  const s = fvp(rated(3.3, 7));
  assert.equal(s.state, 'watch');
  assert.equal(s.feel.state, 'blindspot');
  assert.deepEqual(s.ruleIds, ['B-RT', 'B-ALERT']);
  assert.match(s.feel.text, /do not rely on how you feel today/);
  const res = evaluate({ readings: F.steadyDays('a', 20), tests: rated(3.3, 7), symptoms: F.noSymptoms('a', [20]) });
  assert.deepEqual(res.patterns.map(p => p.id), ['P5']);
  assert.equal(res.regions.brain.state, 'watch');
});

test('feel versus perform: feeling more tired and testing slower is not a blind spot', () => {
  const s = fvp(rated(3.3, 4));
  assert.equal(s.feel.state, 'aware');
  assert.deepEqual(evaluate({ readings: F.steadyDays('a', 20), tests: rated(3.3, 4), symptoms: F.noSymptoms('a', [20]) }).patterns.map(p => p.id), []);
});

test('feel versus perform: feeling tired with a normal test raises no flag', () => {
  const s = fvp(rated(4.05, 4));
  assert.equal(s.state, 'ok');
  assert.equal(s.feel.state, 'tired');
  const res = evaluate({ readings: F.steadyDays('a', 20), tests: rated(4.05, 4), symptoms: F.noSymptoms('a', [20]) });
  assert.equal(res.patterns.length, 0);
  assert.equal(res.overall, 'ok');
});

test('feel versus perform: both normal is aligned; a higher-than-usual rating is never a flag on its own', () => {
  assert.equal(fvp(rated(4.05, 7)).feel.state, 'aligned');
  assert.equal(fvp(rated(4.05, 10)).feel.state, 'aligned');
});

test('feel versus perform: no rating means no comparison and no P5', () => {
  const tests = [F.rtTest('a', 5, 4.0, { alertness: 7 }), F.rtTest('a', 10, 4.1, { alertness: 8 }), F.rtTest('a', 15, 3.95, { alertness: 7 }), F.rtTest('a', 20, 3.3)];
  const s = fvp(tests);
  assert.equal(s.feel, null);
  assert.deepEqual(s.ruleIds, ['B-RT']);
  assert.deepEqual(evaluate({ readings: F.steadyDays('a', 20), tests, symptoms: F.noSymptoms('a', [20]) }).patterns.map(p => p.id), []);
});

test('feel versus perform: a demo-length test never raises P5', () => {
  const short = () => ({ durationSec: 20 });
  const tests = [F.rtTest('a', 5, 4.0, Object.assign(short(), { alertness: 7 })), F.rtTest('a', 10, 4.1, Object.assign(short(), { alertness: 8 })),
    F.rtTest('a', 15, 3.95, Object.assign(short(), { alertness: 7 })), F.rtTest('a', 20, 3.3, Object.assign(short(), { alertness: 7 }))];
  assert.equal(fvp(tests).feel.state, 'blindspot');
  assert.deepEqual(evaluate({ readings: F.steadyDays('a', 20), tests, symptoms: F.noSymptoms('a', [20]) }).patterns.map(p => p.id), []);
});

test('feel versus perform: the alertness band is kept between 1 and 2 points', () => {
  /* Very steady ratings: band = median ± 1 (the smallest width). 6 is below it. */
  const steady = [8, 8, 8].map((r, i) => F.rtTest('a', 5 + i * 5, 4.0, { alertness: r }));
  let s = fvp(steady.concat([F.rtTest('a', 20, 3.3, { alertness: 6 })]));
  assert.equal(s.feel.band.high - s.feel.band.median, 1);
  assert.equal(s.feel.state, 'aware');
  /* Scattered ratings: the band is capped at ± 2, so a 4-point drop still counts as feeling tired. */
  const scattered = [10, 6, 8].map((r, i) => F.rtTest('a', 5 + i * 5, 4.0, { alertness: r }));
  s = fvp(scattered.concat([F.rtTest('a', 20, 3.3, { alertness: 4 })]));
  assert.equal(s.feel.band.high - s.feel.band.median, 2);
  assert.equal(s.feel.state, 'aware');
});

test('the report background includes the alertness rating', () => {
  const ctx = F.ctxOf(E, rules, { readings: F.steadyDays('a', 20), tests: rated(3.3, 7), symptoms: F.noSymptoms('a', [20]) });
  const sbar = E.buildSbar(E.evaluate(ctx, C), ctx, C, { name: 'T', role: '' });
  assert.match(sbar.B, /Self-rated alertness just before the test: 7 of 10 \(usually about 7\)/);
  assert.match(sbar.A, /Blind spot/);
  assert.match(sbar.A, /P5/);
});

test('a switched-off rule is not evaluated and does not hold back the release check', () => {
  const r = F.fixtureRules();
  r.rules.forEach(x => { if (x.id === 'P4') { x.disabled = true; } });
  const ix = E.indexRules(r);
  assert.equal(ix.patterns.P4, undefined);
  assert.equal(ix.disabled.length, 1);
  assert.equal(E.releaseCheck(r).total, E.releaseCheck(F.fixtureRules()).total - 1);
});
test('readings after exercise or caffeine stay out of the personal range', () => {
  const ix = E.indexRules(F.fixtureRules());
  const days = F.steadyDays('a', 20).filter(x => x.indicator === 'hr').map(x => x.day >= 15 ? Object.assign({}, x, { value: 120, context: { postExercise: true } }) : x);
  const series = E.seriesFor(days, 'a', 'hr');
  const b = E.computeBaseline(series, 21, ix.cfg, ix.base.hr, 1, ix.plaus.hr, true);
  assert.ok(b.high < 80, 'band ' + b.low + ' to ' + b.high);
});
