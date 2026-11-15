/* Crewcial - scenario tests (spec V2), data-integrity tests and the demo story.
 * Run: node --test tests/scenarios.test.js
 * Scenario logic uses fixture rules. The demo story and the integrity checks use
 * the app's real data files, whose clinical numbers are still placeholders.
 * AI-assistance disclosure: generated with Claude (Anthropic) for Team Crewcial. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const D = require('../js/demo.js');
const F = require('./fixtures.js');
const C = F.Content;
const Rules = require('../data/rules.js');
const Sources = require('../data/sources.js');

const rules = F.fixtureRules();
const okTests = [F.rtTest('a', 5, 4.0), F.rtTest('a', 10, 4.1), F.rtTest('a', 15, 3.95), F.rtTest('a', 20, 4.05)];
const slowTests = [F.rtTest('a', 5, 4.0), F.rtTest('a', 10, 4.1), F.rtTest('a', 15, 3.95), F.rtTest('a', 20, 3.3)];
const run = o => { const ctx = F.ctxOf(E, rules, o); return { ctx, res: E.evaluate(ctx, C) }; };

/* Each scenario states the expected overall state and escalation, then checks the actual result. */
const table = [];
function scenario(name, expected, fn) {
  test('Scenario: ' + name, () => {
    const actual = fn();
    table.push({ name, expected, actual });
    assert.deepEqual(actual, expected);
  });
}

scenario('S1 normal day', { overall: 'ok', flags: [], route: 'none' }, () => {
  const { res } = run({ readings: F.steadyDays('a', 20), tests: okTests, symptoms: F.noSymptoms('a', [20]) });
  return { overall: res.overall, flags: res.flagged.map(f => f.id), route: 'none' };
});
scenario('S2 missing data is never green', { overall: 'nodata', greenRegions: 0, missing: 6 }, () => {
  const { res } = run({ readings: F.without(F.steadyDays('a', 20), 'a', 20), tests: okTests, symptoms: [] });
  return { overall: res.overall, greenRegions: Object.values(res.regions).filter(r => r.state === 'ok').length, missing: res.dailyMissing.length };
});
scenario('S3 implausible entry asks for a re-check, with no alarm', { state: 'check', tier1: false, tier2: false }, () => {
  const { res } = run({ readings: F.setToday(F.steadyDays('a', 20), 'a', 20, 'temp', 368), tests: okTests, symptoms: F.noSymptoms('a', [20]) });
  return { state: res.indicators.temp.state, tier1: res.flagged.some(f => f.state === 'act'), tier2: res.flagged.some(f => f.state === 'watch') };
});
scenario('S4 red-flag symptom is Act now and goes to the CMO first', { overall: 'act', firstStep: 'CMO now.', route: 'urgent', cmoSees: true }, () => {
  const { res, ctx } = run({ readings: F.steadyDays('a', 20), tests: okTests, symptoms: [F.symptom('a', 20, 'chest_pain', 'heart', 3)] });
  return { overall: res.overall, firstStep: E.route(1, 'station', ctx.ix).steps[0], route: E.suggestRoute(1, false), cmoSees: E.audience(1).crewMedicalOfficer };
});
scenario('S5 fatigue pattern the day before a spacewalk gives a Caution summary', { patterns: ['P1'], readiness: 'caution', evaInDays: 1, goNoGo: false }, () => {
  const { res } = run({ readings: F.setToday(F.steadyDays('a', 20), 'a', 20, 'sleep', 5), tests: slowTests, symptoms: F.noSymptoms('a', [20]), evaDay: 21 });
  return { patterns: res.patterns.map(p => p.id), readiness: res.readiness.level, evaInDays: res.readiness.evaInDays, goNoGo: /\bgo\b(?! or no-go)/i.test(res.readiness.headline) };
});
scenario('S6 possible infection pattern', { patterns: ['P2'], tier: 2, region: 'watch' }, () => {
  let r = F.setToday(F.steadyDays('a', 20), 'a', 20, 'temp', 38.1); r = F.setToday(r, 'a', 20, 'hr', 76);
  const { res } = run({ readings: r, tests: okTests, symptoms: F.noSymptoms('a', [20]) });
  return { patterns: res.patterns.map(p => p.id), tier: res.patterns[0].tier, region: res.regions.immune.state };
});
scenario('S7 vision change pattern goes to the flight surgeon', { patterns: ['P3'], eyes: 'watch', inReport: true }, () => {
  const tests = okTests.concat([F.amTest('a', 10, 'R', []), F.amTest('a', 20, 'R', [44, 45])]);
  const { res, ctx } = run({ readings: F.steadyDays('a', 20), tests, symptoms: F.noSymptoms('a', [20]) });
  const sbar = E.buildSbar(res, ctx, C, { name: 'T', role: '' });
  return { patterns: res.patterns.map(p => p.id), eyes: res.regions.eyes.state, inReport: /Amsler grid: Right eye: 2 newly marked squares/.test(sbar.B) };
});
scenario('S8 calibration period: only Act-now limits are active', { normal: 'calibrating', outlier: 'calibrating', tier1: 'act' }, () => {
  const base = F.steadyDays('a', 3);
  const a = run({ day: 3, readings: base }).res.indicators.hr.state;
  const b = run({ day: 3, readings: F.setToday(base, 'a', 3, 'hr', 95) }).res.indicators.hr.state;
  const c = run({ day: 3, readings: F.setToday(base, 'a', 3, 'hr', 170) }).res.indicators.hr.state;
  return { normal: a, outlier: b, tier1: c };
});
scenario('S9 switching location changes the escalation and shows the delay', { sameSteps: false, stationReply: null, marsReply: 40 }, () => {
  const ix = E.indexRules(rules);
  const s = E.route(1, 'station', ix), m = E.route(1, 'mars', ix);
  return { sameSteps: JSON.stringify(s.steps) === JSON.stringify(m.steps), stationReply: s.earliestReplyMin, marsReply: m.earliestReplyMin };
});
scenario('S10 a Watch item is private: it waits for the private medical conference', { route: 'pmc', cmo: false, crewmates: false, missionControl: false, mood: 'ppc' }, () => {
  const a = E.audience(2);
  return { route: E.suggestRoute(2, false), cmo: a.crewMedicalOfficer, crewmates: a.crewmates, missionControl: a.missionControl, mood: E.suggestRoute(2, true) };
});
scenario('S11 a single odd reading is a re-check, and the second day makes it Watch', { day1: 'check', day2: 'watch' }, () => {
  const one = F.setToday(F.steadyDays('a', 20), 'a', 20, 'bp_sys', 150);
  const two = F.setToday(one, 'a', 19, 'bp_sys', 149);
  return { day1: run({ readings: one }).res.indicators.bp.state, day2: run({ readings: two }).res.indicators.bp.state };
});
scenario('S12 a Tier 1 limit beats a baseline the drift has absorbed', { state: 'act' }, () => {
  const readings = []; for (let d = 1; d <= 40; d++) readings.push(F.reading('a', d, 'hr', 60 + d * 2.3));
  return { state: run({ day: 40, readings }).res.indicators.hr.state };
});

scenario('S13 blind spot: feels as usual but tests slower, the day before a spacewalk', { patterns: ['P5', 'P1'], feel: 'blindspot', readiness: 'caution', inReport: true }, () => {
  const tests = [F.rtTest('a', 5, 4.0, { alertness: 8 }), F.rtTest('a', 10, 4.1, { alertness: 7 }), F.rtTest('a', 15, 3.95, { alertness: 8 }), F.rtTest('a', 20, 3.3, { alertness: 8 })];
  const { res, ctx } = run({ readings: F.setToday(F.steadyDays('a', 20), 'a', 20, 'sleep', 5), tests, symptoms: F.noSymptoms('a', [20]), evaDay: 21 });
  const sbar = E.buildSbar(res, ctx, C, { name: 'T', role: '' });
  return { patterns: res.patterns.map(p => p.id), feel: res.indicators.rt.feel.state, readiness: res.readiness.level,
           inReport: /Self-rated alertness just before the test: 8 of 10/.test(sbar.B) && /Blind spot/.test(sbar.A) };
});

scenario('S14 a reading taken after exercise is not judged: re-measure first', { hr: 'check', notRested: true, tier1: false, inBand: true }, () => {
  const base = F.without(F.steadyDays('a', 20), 'a', 20, 'hr');
  const readings = base.concat([F.reading('a', 20, 'hr', 155, { context: { rested: false, postExercise: true, caffeine: false } })]);
  const { res, ctx } = run({ readings, tests: okTests, symptoms: F.noSymptoms('a', [20]) });
  const hr = res.indicators.hr.parts[0];
  const band = E.computeBaseline(E.seriesFor(readings, 'a', 'hr'), 21, ctx.ix.cfg, ctx.ix.base.hr, 1, ctx.ix.plaus.hr, true);
  return { hr: res.indicators.hr.state, notRested: !!hr.notRested, tier1: res.flagged.some(f => f.state === 'act'), inBand: band.high < 100 };
});
scenario('S15 the flight surgeon sets a lower heart-rate limit for a fit crew member', { standard: 'act', personal: 'check', floor: 30 }, () => {
  const readings = F.setToday(F.steadyDays('a', 20, { hr: 46 }), 'a', 20, 'hr', 38);
  const standard = run({ readings, tests: okTests, symptoms: F.noSymptoms('a', [20]) }).res.indicators.hr.state;
  const personal = run({ readings, tests: okTests, symptoms: F.noSymptoms('a', [20]), limits: { 'A-HR-LO': 35 } }).res.indicators.hr.state;
  const floor = E.personalLimit({ value: 40, personal: { min: 30, max: 40 } }, { limits: { x: 1 } }).value === 40 &&
    E.personalLimit({ id: 'A-HR-LO', value: 40, personal: { min: 30, max: 40 } }, { limits: { 'A-HR-LO': 20 } }).value;
  return { standard, personal, floor };
});
scenario('S16 an impossible value on the dangerous side says when to act', { state: 'check', dangerSide: true, saysAct: true }, () => {
  const { res } = run({ readings: F.steadyDays('a', 20).concat([F.reading('a', 20, 'spo2', 45)]), tests: okTests, symptoms: F.noSymptoms('a', [20]) });
  const s = res.indicators.spo2;
  return { state: s.state, dangerSide: !!s.parts[0].dangerSide, saysAct: /act now/.test(s.reason) };
});
scenario('S17 new confusion is a red flag', { overall: 'act', route: 'urgent' }, () => {
  const { res } = run({ readings: F.steadyDays('a', 20), tests: okTests, symptoms: [F.symptom('a', 20, 'confusion', 'brain')] });
  return { overall: res.overall, route: E.suggestRoute(1, false) };
});
scenario('S18 a new Amsler distortion goes to the flight surgeon as an urgent report', { eyes: 'watch', route: 'urgent' }, () => {
  const tests = okTests.concat([F.amTest('a', 10, 'R', []), F.amTest('a', 20, 'R', [44, 45])]);
  const { res, ctx } = run({ readings: F.steadyDays('a', 20), tests, symptoms: F.noSymptoms('a', [20]) });
  return { eyes: res.regions.eyes.state, route: E.suggestRoute(2, false, res.flagged, ctx.ix) };
});

scenario('S19 a temperature of 39.4 °C on its own is urgent, not an emergency (decision 3.3)', { temp: 'watch', urgent: true, act: false, route: 'urgent' }, () => {
  const readings = F.setToday(F.steadyDays('a', 20), 'a', 20, 'temp', 39.4);
  const { res, ctx } = run({ readings, tests: okTests, symptoms: F.noSymptoms('a', [20]) });
  const t = res.indicators.temp;
  return { temp: t.state, urgent: !!t.urgent, act: res.flagged.some(f => f.state === 'act'), route: E.suggestRoute(2, false, res.flagged, ctx.ix) };
});
scenario('S20 the same temperature with new confusion is Act now', { overall: 'act', temp: 'watch' }, () => {
  const readings = F.setToday(F.steadyDays('a', 20), 'a', 20, 'temp', 39.6);
  const { res } = run({ readings, tests: okTests, symptoms: [F.symptom('a', 20, 'confusion', 'brain')] });
  return { overall: res.overall, temp: res.indicators.temp.state };
});
scenario('S21 the blood-sugar ladder, checked when something prompts it (decision 3.2)', {
  52: 'watch urgent', 62: 'watch', 100: 'ok', 168: 'check', 210: 'watch urgent'
}, () => {
  const out = {};
  [52, 62, 100, 168, 210].forEach(v => {
    const { res } = run({ readings: F.steadyDays('a', 20).concat([F.reading('a', 20, 'glucose', v)]), tests: okTests, symptoms: F.noSymptoms('a', [20]) });
    const g = res.indicators.glucose;
    out[v] = g.state + (g.urgent ? ' urgent' : '');
  });
  return out;
});

const blindTests = [F.rtTest('a', 5, 4.0, { alertness: 8 }), F.rtTest('a', 10, 4.1, { alertness: 7 }), F.rtTest('a', 15, 3.95, { alertness: 8 }), F.rtTest('a', 20, 3.3, { alertness: 8 })];
const blindRun = evaDay => run({ readings: F.setToday(F.steadyDays('a', 20), 'a', 20, 'sleep', 5), tests: blindTests, symptoms: F.noSymptoms('a', [20]), evaDay });
scenario('S22 a blind spot the day before a spacewalk is urgent, not an emergency (signed 15 Nov 2026)', {
  patterns: ['P5 urgent', 'P1 urgent'], overall: 'watch', act: false, route: 'urgent', request: true, why: true
}, () => {
  const { res, ctx } = blindRun(21);
  const sbar = E.buildSbar(res, ctx, C, { name: 'T', role: '' });
  return { patterns: res.patterns.map(p => p.id + (p.urgent ? ' urgent' : '')), overall: res.overall, act: res.flagged.some(f => f.state === 'act'),
           route: E.suggestRoute(2, false, res.flagged, ctx.ix),
           request: /^Urgent, not an emergency\. Requesting a reply from the flight surgeon within 24 hours\./.test(sbar.R),
           why: res.patterns.every(p => p.supporting.indexOf('A spacewalk is planned tomorrow') !== -1) };
});
scenario('S23 the same findings stay on the weekly route unless a spacewalk is today or tomorrow', {
  none: 'P5,P1 pmc', inThreeDays: 'P5,P1 pmc', today: 'P5 urgent,P1 urgent urgent'
}, () => {
  const show = evaDay => { const { res, ctx } = blindRun(evaDay); return res.patterns.map(p => p.id + (p.urgent ? ' urgent' : '')).join(',') + ' ' + E.suggestRoute(2, false, res.flagged, ctx.ix); };
  return { none: show(null), inThreeDays: show(23), today: show(20) };
});

test('scenario table is complete', () => {
  assert.equal(table.length, 23);
  if (process.env.CREWCIAL_PRINT) {
    console.log('\n| Scenario | Expected | Actual | Pass |\n|---|---|---|---|');
    table.forEach(t => console.log('| ' + t.name + ' | `' + JSON.stringify(t.expected) + '` | `' + JSON.stringify(t.actual) + '` | ' + (JSON.stringify(t.expected) === JSON.stringify(t.actual) ? 'yes' : 'NO') + ' |'));
  }
});

/* ---------- The app's real data files ---------- */
test('data: rule ids are unique and every rule has a known status', () => {
  const ix = E.indexRules(Rules);
  const ids = ix.all.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  ix.all.forEach(r => assert.ok(['published', 'proposed', 'placeholder'].includes(r.status), r.id + ' status'));
});
test('data: every source id used anywhere exists in the sources list', () => {
  const known = new Set(Sources.map(s => s.id));
  assert.equal(known.size, Sources.length, 'source ids are unique');
  const used = [];
  E.indexRules(Rules).all.forEach(r => used.push(...(r.sourceIds || [])));
  Object.values(Rules.environments).forEach(e => used.push(...e.sourceIds));
  C.regions.forEach(r => r.hazards.forEach(h => used.push(...h.sourceIds)));
  C.symptoms.forEach(s => used.push(...s.sourceIds));
  C.indicators.forEach(i => Object.values(i.learn).forEach(q => used.push(...q.sourceIds)));
  Object.values(C.guidance).forEach(g => used.push(...(g.sourceIds || [])));
  used.forEach(id => assert.ok(known.has(id), 'unknown source ' + id));
});
test('data: a rule that claims a published source lists at least one', () => {
  E.indexRules(Rules).all.filter(r => r.status === 'published').forEach(r => assert.ok(r.sourceIds.length > 0, r.id));
});
test('data: every stored reading key has an entry-range rule, and input limits match it', () => {
  const ix = E.indexRules(Rules);
  C.indicators.forEach(i => i.parts.forEach(p => {
    assert.ok(ix.plaus[p.key], 'no plausibility rule for ' + p.key);
    assert.equal(p.min, ix.plaus[p.key].min, p.key + ' min');
    assert.equal(p.max, ix.plaus[p.key].max, p.key + ' max');
  }));
});
test('data: symptoms point at real regions, and red-flag and pattern rules point at real symptoms', () => {
  const regions = new Set(C.regions.map(r => r.id)), symptoms = new Set(C.symptoms.map(s => s.id));
  C.symptoms.forEach(s => assert.ok(regions.has(s.region), s.id));
  Rules.rules.filter(r => r.type === 'redflag').forEach(r => assert.ok(symptoms.has(r.symptomId), r.id));
  Rules.rules.filter(r => r.tier1WithSymptoms).forEach(r => r.tier1WithSymptoms.forEach(id => assert.ok(symptoms.has(id), r.id + ' ' + id)));
  C.regions.forEach(r => r.items.forEach(id => assert.ok(C.indicators.some(i => i.id === id), r.id + ' item ' + id)));
});
test('data: every rule can be described in words; every indicator answers all five questions, with no stand-in answers (0.6.2)', () => {
  const ix = E.indexRules(Rules);
  ix.all.forEach(r => assert.ok(E.describeRule(r, ix).length > 10, r.id));
  C.indicators.forEach(i => {
    ['q1', 'q2', 'q3', 'q4', 'q5'].forEach(q => assert.ok(i.learn[q] && typeof i.learn[q].text === 'string', i.id + ' ' + q));
    ['q1', 'q2', 'q3', 'q4', 'q5'].forEach(q => assert.ok(i.learn[q].text.length > 5, i.id + ' ' + q + ' answered'));
    ['q1', 'q2', 'q3', 'q4', 'q5'].forEach(q => assert.ok(!/to be written|phase 3|placeholder/i.test(i.learn[q].text), i.id + ' ' + q + ' stand-in'));
  });
});
test('data: the release gate is open: every rule is sourced and signed (0.5.0)', () => {
  const rc = E.releaseCheck(Rules);
  assert.equal(rc.ready, true);
  assert.equal(rc.placeholders.length, 0);
  assert.equal(rc.unsigned.length, 0);
});

/* ---------- The demo mission (simulated data, placeholder rules) ---------- */
const NOW = Date.UTC(2026, 10, 14, 6, 0, 0);
const mission = D.generateMission({ now: NOW });
const ix = E.indexRules(Rules);
function demoEval(crewId, day) {
  const crew = mission.crew.find(c => c.id === crewId);
  const ctx = { ix, crewId, day: day || 74, phaseStartDay: 1, environment: mission.mission.environment, evaDay: crew.evaDay,
                readings: mission.readings, tests: mission.tests, symptoms: mission.symptoms };
  return { ctx, crew, res: E.evaluate(ctx, C) };
}
test('demo: the generator is repeatable and everything is marked as demo data', () => {
  const again = D.generateMission({ now: NOW });
  assert.deepEqual(again, mission);
  mission.readings.forEach(r => assert.equal(r.source, 'demo'));
  assert.equal(mission.mission.demo, true);
  assert.equal(mission.crew.length, 4);
});
test('demo: no simulated reading trips an entry-range rule or a Tier 1 limit by accident', () => {
  mission.readings.forEach(r => {
    assert.ok(E.isPlausible(r.value, ix.plaus[r.indicator]), r.indicator + ' ' + r.value);
    (ix.abs[r.indicator] || []).forEach(a => {
      const hit = a.op === '>=' ? r.value >= a.value : a.op === '<=' ? r.value <= a.value : a.op === '>' ? r.value > a.value : r.value < a.value;
      assert.equal(hit, false, a.id + ' hit by ' + r.value + ' on day ' + r.day);
    });
  });
});
test('demo story: the flight engineer shows the fatigue pattern and the blind spot the day before a spacewalk', () => {
  const { res, ctx, crew } = demoEval('c3');
  assert.equal(res.overall, 'watch');
  assert.deepEqual(res.patterns.map(p => p.id), ['P5', 'P1']);   /* decision 2.2: the blind spot leads */
  assert.equal(res.indicators.rt.feel.state, 'blindspot');
  assert.equal(res.indicators.rt.feel.rating, 8);
  assert.equal(res.indicators.sleep.state, 'watch');
  assert.equal(res.indicators.rt.state, 'watch');
  assert.equal(res.regions.brain.state, 'watch');
  assert.equal(res.readiness.level, 'caution');
  assert.equal(res.readiness.evaInDays, 1);
  assert.equal(res.flagged.some(f => f.state === 'act'), false);
  /* 0.7.0, signed 15 Nov 2026: with her spacewalk tomorrow, both patterns are urgent, not an emergency */
  assert.deepEqual(res.patterns.map(p => !!p.urgent), [true, true]);
  assert.equal(E.suggestRoute(2, false, res.flagged, ctx.ix), 'urgent');
  const sbar = E.buildSbar(res, ctx, C, crew);
  assert.match(sbar.R, /^Urgent, not an emergency\. Requesting a reply from the flight surgeon within 24 hours\./);
  assert.match(sbar.S, /Zahra/);
  assert.doesNotMatch(sbar.A, /placeholders/);   /* 0.4.0: every rule behind her flags is signed */
});
test('demo: every simulated reaction test has an alertness rating from 0 to 10', () => {
  const rt = mission.tests.filter(t => t.type === 'reaction');
  assert.ok(rt.length > 0);
  rt.forEach(t => assert.ok(Number.isInteger(t.alertness) && t.alertness >= 0 && t.alertness <= 10, t.crewId + ' day ' + t.day));
});
test('demo story: the commander has not done today\'s check, so nothing is green', () => {
  const { res } = demoEval('c1');
  assert.equal(res.overall, 'nodata');
  assert.equal(Object.values(res.regions).filter(r => r.state === 'ok').length, 0);
});
test('demo story: the crew medical officer is in range today and had the infection pattern on days 40 to 43', () => {
  assert.equal(demoEval('c2').res.overall, 'ok');
  [40, 41, 42, 43].forEach(d => assert.ok(demoEval('c2', d).res.patterns.some(p => p.id === 'P2'), 'day ' + d));
  [39, 44].forEach(d => assert.equal(demoEval('c2', d).res.patterns.length, 0, 'day ' + d));
});
test('demo story: the mission specialist has a vision change from the day-60 eye check', () => {
  const { res } = demoEval('c4');
  assert.deepEqual(res.patterns.map(p => p.id), ['P3']);
  assert.equal(res.regions.eyes.state, 'watch');
  assert.equal(mission.reports.length, 1);
});
test('shadow-mode simulation runs and reports rates', () => {
  const out = require('./shadow.js').runShadow({ seed: 11, crewN: 6, days: 120 });
  assert.ok(out.events > 0);
  assert.ok(out.detectionRate >= 0 && out.detectionRate <= 1);
  assert.ok(out.falseAlertShare >= 0 && out.falseAlertShare <= 1);
  assert.equal(out.crewDays, 6 * (120 - out.firstDay + 1));
});
