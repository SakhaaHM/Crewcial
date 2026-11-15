/* Test fixtures for Crewcial. These numbers exist only to exercise the logic.
 * They are NOT the app's rules and NOT clinical values.
 * AI-assistance disclosure: generated with Claude (Anthropic) for Team Crewcial. */
'use strict';
const Content = require('../data/content.js');

function fixtureRules(over) {
  const base = {
    version: 'test', updated: 'test',
    baseline: Object.assign({ id: 'BL', type: 'baseline-config', status: 'published', signed: true, method: 'rolling',
      calibrationDays: 5, minReadings: 5, windowDays: 10, lagDays: 0, k: 3, sustainDays: 2, sourceIds: [] }, (over && over.baseline) || {}),
    environments: {
      station: { label: 'Space station', oneWayDelayMin: null, link: 'Real-time link.', evac: 'Under 24 hours.', tier1: ['CMO now.', 'Flight surgeon now.'], tier2: ['Self-care.', 'Next conference.'], sourceIds: [] },
      lunar: { label: 'Lunar base or rover', oneWayDelayMin: null, link: 'Short delay.', evac: 'Up to 2 weeks.', tier1: ['CMO now, open checklist.', 'Flight surgeon now, short delay.'], tier2: ['Self-care.', 'Next conference.'], sourceIds: [] },
      mars: { label: 'Mars transit or surface', oneWayDelayMin: 20, link: 'Up to 20 minutes one way.', evac: 'May not be feasible.', tier1: ['CMO now, start checklist. Do not wait for the ground.', 'Urgent report. A reply takes at least 40 minutes.'], tier2: ['Self-care.', 'Next conference, stored and forwarded.'], sourceIds: [] }
    },
    schedule: { id: 'SCH', type: 'schedule', status: 'published', signed: true, reactionEveryDays: 7, reactionAfterSleepAtOrBelowH: 6, reactionBeforeEvaDays: 1, reactionFreshDays: 1, amslerEveryDays: 30, amslerOnVisionSymptom: true, sourceIds: [] },
    reactionTest: { id: 'RT-PROTO', type: 'protocol', status: 'published', signed: true, durationSec: 180, isiMinMs: 1000, isiMaxMs: 4000, feedbackMs: 1000, lapseMs: 355, falseStartMs: 100, timeoutMs: 10000, demoDurationSec: 20, sourceIds: [] },
    amslerTest: { id: 'AM-PROTO', type: 'protocol', status: 'published', signed: true, gridN: 20, sizeMm: 100, squareMm: 5, distanceCm: 33, cardWidthMm: 85.6, sourceIds: [] },
    rules: [
      { id: 'PL-BPS', type: 'plausibility', target: 'bp_sys', min: 50, max: 260, unit: 'mmHg' },
      { id: 'PL-BPD', type: 'plausibility', target: 'bp_dia', min: 30, max: 160, unit: 'mmHg' },
      { id: 'PL-HR', type: 'plausibility', target: 'hr', min: 20, max: 250, unit: 'bpm' },
      { id: 'PL-TEMP', type: 'plausibility', target: 'temp', min: 30, max: 45, unit: '°C' },
      { id: 'PL-SLEEP', type: 'plausibility', target: 'sleep', min: 0, max: 16, unit: 'h' },
      { id: 'PL-MOOD', type: 'plausibility', target: 'mood', min: 0, max: 100, unit: '/100' },
      { id: 'PL-STRESS', type: 'plausibility', target: 'stress', min: 0, max: 100, unit: '/100' },
      { id: 'PL-GLU', type: 'plausibility', target: 'glucose', min: 20, max: 600, unit: 'mg/dL' },
      { id: 'PL-SPO2', type: 'plausibility', target: 'spo2', min: 50, max: 100, unit: '%', danger: 'low' },
      { id: 'CX-REST', type: 'context', target: 'vitals', keys: ['hr', 'bp_sys', 'bp_dia', 'temp'], waitMin: 30, restMin: 5 },
      { id: 'A-HR-HI', type: 'absolute', target: 'hr', op: '>=', value: 150, unit: 'bpm', tier: 1 },
      { id: 'A-HR-LO', type: 'absolute', target: 'hr', op: '<=', value: 40, unit: 'bpm', tier: 1, personal: { min: 30, max: 40 } },
      { id: 'A-SPO2-LO', type: 'absolute', target: 'spo2', op: '<=', value: 91, unit: '%', tier: 1 },
      { id: 'R-SPO2', type: 'reference', target: 'spo2', min: 96, max: 100, unit: '%', tier: 2 },
      { id: 'A-TEMP-HI', type: 'absolute', target: 'temp', op: '>=', value: 39.1, unit: '°C', tier: 2, urgentReport: true },
      { id: 'A-GLU-LO', type: 'absolute', target: 'glucose', op: '<', value: 54, unit: 'mg/dL', tier: 2, urgentReport: true },
      { id: 'A-GLU-HI', type: 'absolute', target: 'glucose', op: '>=', value: 200, unit: 'mg/dL', tier: 2, urgentReport: true },
      { id: 'R-GLU', type: 'reference', target: 'glucose', min: 70, max: 140, highState: 'check', unit: 'mg/dL', tier: 2 },
      { id: 'B-BPS', type: 'baseline', target: 'bp_sys', direction: 'both', minHalfWidth: 10, maxHalfWidth: 20, tier: 2 },
      { id: 'B-BPD', type: 'baseline', target: 'bp_dia', direction: 'both', minHalfWidth: 8, maxHalfWidth: 15, tier: 2 },
      { id: 'B-HR', type: 'baseline', target: 'hr', direction: 'both', minHalfWidth: 5, maxHalfWidth: 20, tier: 2 },
      { id: 'B-TEMP', type: 'baseline', target: 'temp', direction: 'both', minHalfWidth: 0.4, maxHalfWidth: 1, tier: 2 },
      { id: 'B-SLEEP', type: 'baseline', target: 'sleep', direction: 'low', minHalfWidth: 1, maxHalfWidth: 1.5, sustainDays: 1, tier: 2 },
      { id: 'B-MOOD', type: 'baseline', target: 'mood', direction: 'low', minHalfWidth: 15, maxHalfWidth: 25, tier: 2 },
      { id: 'B-STRESS', type: 'baseline', target: 'stress', direction: 'high', minHalfWidth: 15, maxHalfWidth: 25, tier: 2 },
      { id: 'B-RT', type: 'baseline-tests', target: 'rt', metric: 'meanSpeed', direction: 'low', minHalfWidthPct: 8, minTests: 3, windowTests: 10, tier: 2 },
      { id: 'B-ALERT', type: 'baseline-alert', target: 'alertness', direction: 'low', minHalfWidth: 1, maxHalfWidth: 2, minTests: 3, windowTests: 10, tier: 2 },
      { id: 'RF-CHEST-PAIN', type: 'redflag', target: 'symptoms', symptomId: 'chest_pain', tier: 1 },
      { id: 'RF-CONFUSION', type: 'redflag', target: 'symptoms', symptomId: 'confusion', tier: 1 },
      { id: 'SY-ANY', type: 'symptom', target: 'symptoms', tier: 2 },
      { id: 'AM-NEW', type: 'amsler', target: 'amsler', minNewSquares: 1, tier: 2, urgentReport: true },
      { id: 'P1', type: 'pattern', target: 'pattern', title: 'Fatigue pattern', tier: 2, shortSleepHours: 6 },
      { id: 'P2', type: 'pattern', target: 'pattern', title: 'Possible infection pattern', tier: 2, tier1WithRedFlag: true },
      { id: 'P3', type: 'pattern', target: 'pattern', title: 'Vision change pattern', tier: 2, tier1WithSymptoms: ['headache', 'vision_change'] },
      { id: 'P4', type: 'pattern', target: 'pattern', title: 'Strain or illness watch', tier: 2 },
      { id: 'P5', type: 'pattern', target: 'pattern', title: 'Blind spot', tier: 2 }
    ].map(r => Object.assign({ status: 'published', signed: true, version: 1, sourceIds: [] }, r))
  };
  return base;
}

/* Build readings from compact specs. */
let seq = 0;
function reading(crewId, day, indicator, value, extra) {
  return Object.assign({ id: 'x' + (++seq), crewId, day, ts: '2030-01-' + String(day).padStart(3, '0') + 'T07:00:00Z', indicator, value, source: 'test' }, extra || {});
}
/* values: array for days startDay.. ; null means no reading that day */
function series(crewId, indicator, values, startDay) {
  const out = [];
  values.forEach((v, i) => { if (v !== null && v !== undefined) out.push(reading(crewId, (startDay || 1) + i, indicator, v)); });
  return out;
}
/* A steady, complete history for one person up to and including lastDay. */
function steadyDays(crewId, lastDay, over) {
  const v = Object.assign({ bp_sys: 112, bp_dia: 70, hr: 60, temp: 36.8, sleep: 7, mood: 70, stress: 30 }, over || {});
  let out = [];
  const wobble = [0, 1, -1, 0, 1, 0, -1];
  for (let d = 1; d <= lastDay; d++) {
    const w = wobble[d % wobble.length];
    out.push(reading(crewId, d, 'bp_sys', v.bp_sys + w * 2), reading(crewId, d, 'bp_dia', v.bp_dia + w), reading(crewId, d, 'hr', v.hr + w),
      reading(crewId, d, 'temp', Math.round((v.temp + w * 0.1) * 10) / 10), reading(crewId, d, 'sleep', v.sleep + w * 0.25),
      reading(crewId, d, 'mood', v.mood + w * 2), reading(crewId, d, 'stress', v.stress + w * 2));
  }
  return out;
}
function noSymptoms(crewId, days) {
  return days.map(d => ({ id: 'n' + (++seq), crewId, day: d, ts: 't' + d, symptomId: 'none', region: 'all', severity: 0 }));
}
function symptom(crewId, day, symptomId, region, severity) {
  return { id: 'y' + (++seq), crewId, day, ts: 't' + day, symptomId, region, severity: severity || 1 };
}
function rtTest(crewId, day, meanSpeed, extra) {
  return Object.assign({ id: 'q' + (++seq), crewId, day, ts: 'u' + String(day).padStart(3, '0'), type: 'reaction', durationSec: 180, device: 'dev-a',
    metrics: { n: 58, medianRt: Math.round(1000 / meanSpeed), meanSpeed, lapses: 1, falseStarts: 0 } }, extra || {});
}
function amTest(crewId, day, eye, cells) {
  return { id: 'a' + (++seq), crewId, day, ts: 'v' + String(day).padStart(3, '0') + eye, type: 'amsler', eye, gridN: 20, cells: cells || [], calibrated: true };
}
/* Replace today's value of one indicator. */
function setToday(readings, crewId, day, indicator, value) {
  return readings.filter(r => !(r.crewId === crewId && r.day === day && r.indicator === indicator)).concat([reading(crewId, day, indicator, value)]);
}
function without(readings, crewId, day, indicator) {
  return readings.filter(r => !(r.crewId === crewId && r.day === day && (!indicator || r.indicator === indicator)));
}
function ctxOf(Engine, rules, o) {
  return Object.assign({ ix: Engine.indexRules(rules), crewId: 'a', day: 20, phaseStartDay: 1, environment: 'station', evaDay: null, readings: [], tests: [], symptoms: [] }, o);
}

module.exports = { Content, fixtureRules, reading, series, steadyDays, noSymptoms, symptom, rtTest, amTest, setToday, without, ctxOf };
