/*! Crewcial - rules as data.
 * AI-assistance disclosure: this file was generated with Claude (Anthropic) for
 * Team Crewcial, NASA Space Apps Challenge 2026.
 *
 * READ THIS FIRST
 * Every rule has a status that says where its numbers come from:
 *   "published"   - from a source that was opened and checked (see sourceIds).
 *   "proposed"    - proposed by the team's physician herself (labelled as such).
 *   "placeholder" - an engineering stand-in so the software can run. NOT clinically
 *                   reviewed. The app shows a placeholder badge wherever such a rule
 *                   is used.
 * Every rule also has "signed": true only after the team's physician has reviewed
 * and approved it. A rule with no "signed" field counts as not signed.
 * tests/release-check.js fails while any rule is a placeholder or is not signed.
 * Nothing in this file is a validated clinical threshold.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Crewcial = root.Crewcial || {}; root.Crewcial.Rules = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PL = 'placeholder';
  var PR = 'proposed';
  var PUB = 'published';
  var NOTE_ENTRY2 = 'Data-entry bounds that catch typing errors, approved by the team\'s physician. They are not clinical limits.';
  var NOTE_NEWS2 = 'NEWS2 "red" value: 3 points in one vital sign, which NEWS2 escalates on its own. NEWS2 was built for acutely ill adults on Earth, so this is a conservative escalation line, not a validated space threshold.';
  var NOTE_RESTED = ' Applies to rested readings only (rule CX-REST).';
  var NOTE_BAND2 = 'The team physician\'s values. The band half-width is kept between a smallest value, so that a very steady person does not get a band that is too tight, and a largest value, so that a very variable person can still be flagged.';
  var NOTE_RF = 'Red-flag symptom chosen by the team\'s physician: Act now whatever the readings are.';
  var NOTE_ENTRY = 'Data-entry sanity bounds that catch typing errors. Not a clinical limit. Stand-in until reviewed.';
  var NOTE_EWS = 'Stand-in. A typical Earth single-parameter warning value recalled from NEWS2-style early-warning charts. Not yet checked against the published chart and not validated in spaceflight. Confirm or replace in Phase 3.';
  var NOTE_BAND = 'Stand-in. The band half-width is kept between a smallest value, so that a very steady person does not get a band that is too tight, and a largest value, so that a very variable person is still flagged for a big change. Decide both in Phase 3 (open decision D5).';

  return {
    version: '0.7.0',
    updated: '2026-11-15',

    /* How the personal baseline is computed. Open decision D5. */
    baseline: {
      id: 'BL-1', type: 'baseline-config', status: PR, signed: true, version: 1,
      method: 'rolling',       // "rolling": the last windowDays before today. "fixed": the calibration period only.
      calibrationDays: 14,     // days in the current mission phase before Tier 2 rules switch on
      minReadings: 7,          // plausible readings needed inside the window
      windowDays: 28,
      lagDays: 7,              // the window ends this many days before today, so a current episode does not shift the band
      k: 3,                    // band half-width = k x robust standard deviation (1.4826 x MAD)
      sustainDays: 2,          // days in a row outside the band before "Watch" (default; a rule may override)
      sourceIds: ['stahn-2017', 'leys-2013'],
      note: 'The team physician\'s method: a rolling 28-day window that ends 7 days before today (rolling because resting temperature drifts up over about 2.5 months in flight), a band of the median plus or minus 3 robust standard deviations, 14 learning days and at least 7 readings, and 2 days in a row before Watch (sleep: 1 day). A slow decline can be followed by a rolling window, so the Act-now limits and trend review still matter.'
    },

    /* Where the crew is. Facts are sourced; the wording of the steps is a draft.
     * oneWayDelayMin drives the report countdown, so it is set only where the delay is
     * minutes long. delayLabel is the short text for the header chip. */
    environments: {
      station: {
        label: 'Space station', oneWayDelayMin: null, delayLabel: 'Real-time link',
        link: 'Real-time consultation with flight surgeons is available over a near-instantaneous link.',
        evac: 'Evacuation is possible in under 24 hours.',
        tier1: ['Tell the crew medical officer now.',
                'Contact the flight surgeon now on the real-time link.'],
        tier2: ['Follow the self-care steps below.',
                'Add this to your next private medical conference report.'],
        sourceIds: ['nasa-exmo', 'nasa-chmo-podcast', 'nasa-3001-medops', 'csa-c2m2-2025'],
        note: 'The Canadian Space Agency describes audio-visual communication with the ISS as near-instantaneous (Mani et al., SpaceOps 2025). No delay figure is shown.'
      },
      lunar: {
        label: 'Lunar base or rover', oneWayDelayMin: null, delayLabel: 'Delay 4–12 s',
        link: 'Expect a delay of a few seconds each way on the link to the ground: about 4 to 12 seconds one way, per a NASA study for Artemis missions.',
        evac: 'Evacuation may take up to 2 weeks from lunar orbit.',
        tier1: ['Tell the crew medical officer now and open the on-board checklist.',
                'Contact the flight surgeon now. Expect a delay of a few seconds each way.'],
        tier2: ['Follow the self-care steps below.',
                'Add this to your next private medical conference report.'],
        sourceIds: ['nasa-exmo', 'nasa-3001-medops', 'nasa-cislunar-delay-2025'],
        note: 'A NASA study describes one-way delays on the order of 4 to 12 seconds for upcoming Artemis missions (Upasani et al., NASA HRP Investigators\' Workshop 2025). The real delay depends on the relay network. A delay of seconds needs no countdown, so none is shown.'
      },
      mars: {
        label: 'Mars transit or surface', oneWayDelayMin: 20,
        link: 'Messages take up to 20 minutes one way, so a reply can take 40 minutes or more.',
        evac: 'Evacuation may not be feasible.',
        tier1: ['Tell the crew medical officer now and start the on-board checklist. Do not wait for the ground.',
                'Send an urgent report to the flight surgeon. A reply can take 40 minutes or more.'],
        tier2: ['Follow the self-care steps below.',
                'Add this to your next private medical conference report. Reports are stored and forwarded.'],
        sourceIds: ['nasa-hrp-distance', 'nasa-exmo', 'nasa-3001-medops'],
        note: '20 minutes is the maximum one-way delay NASA gives for Mars. The real delay changes with distance.'
      }
    },

    /* When tests are due. */
    schedule: {
      id: 'SCH-1', type: 'schedule', status: PR, signed: true, version: 1,
      reactionEveryDays: 7,
      reactionAfterSleepAtOrBelowH: 6,
      reactionBeforeEvaDays: 1,
      reactionFreshDays: 1,        // a reaction test counts for today and the next N days
      amslerEveryDays: 30,
      amslerOnVisionSymptom: true,
      sourceIds: ['nasa-vision-2018', 'iss-sleep-study', 'nasa-3001-medops'],
      note: 'The team physician\'s cadence: a reaction test every 7 days, after a night of 6 hours or less (a published association) and the day before a spacewalk; an Amsler grid every 30 days and after any vision symptom. That is tighter than the ISS schedule of flight days 30 and 90 and 30 days before return.'
    },

    /* Reaction test protocol: the published PVT-B parameters. */
    reactionTest: {
      id: 'RT-PROTO', type: 'protocol', status: 'published', signed: true, version: 1,
      durationSec: 180, isiMinMs: 1000, isiMaxMs: 4000, feedbackMs: 1000,
      lapseMs: 355, falseStartMs: 100,
      timeoutMs: 30000,            // published: after 30 s without a response the trial is counted as a lapse
      demoDurationSec: 20,         // short version for demonstrations only; results are labelled as not valid
      alertness: { min: 0, max: 10, lowLabel: 'Tired', highLabel: 'Alert' },   // asked just before each test
      sourceIds: ['basner-2011', 'nasa-rst-spinoff', 'dev-2024'],
      note: 'Duration, interval, lapse threshold, false-start limit and the 30-second time-out follow the published PVT-B. Browser timing differs between devices, so results are compared only with the same person on the same device. This is not NASA\'s validated Reaction Self Test software. Just before each test the crew member rates how alert they feel from 0 (tired) to 10 (alert), the scale used before test sessions in a study of ISS astronauts (Dev et al. 2024).'
    },

    /* Amsler grid geometry. */
    amslerTest: {
      id: 'AM-PROTO', type: 'protocol', status: 'published', signed: true, version: 1,
      gridN: 20, sizeMm: 100, squareMm: 5, distanceCm: 33, cardWidthMm: 85.6,
      sourceIds: ['statpearls-amsler', 'nasa-vision-2017'],
      note: 'Chart 1 geometry: a 10 cm square of 20 squares a side, held at about 33 cm, signed by the team\'s physician. The card-width calibration (85.6 mm) is a stand-in aid, not checked against the card standard.'
    },

    rules: [
      /* ---------- Plausibility: catch typing errors ---------- */
      { id: 'PL-BPS', type: 'plausibility', target: 'bp_sys', min: 50, max: 260, unit: 'mmHg', danger: 'both', status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_ENTRY2 },
      { id: 'PL-BPD', type: 'plausibility', target: 'bp_dia', min: 30, max: 160, unit: 'mmHg', danger: 'both', status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_ENTRY2 },
      { id: 'PL-HR', type: 'plausibility', target: 'hr', min: 25, max: 230, unit: 'bpm', danger: 'both', status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_ENTRY2 },
      { id: 'PL-TEMP', type: 'plausibility', target: 'temp', min: 33, max: 43, unit: '°C', danger: 'both', status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_ENTRY2 },
      { id: 'PL-SLEEP', type: 'plausibility', target: 'sleep', min: 0, max: 16, unit: 'h', status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_ENTRY2 },
      { id: 'PL-MOOD', type: 'plausibility', target: 'mood', min: 0, max: 100, unit: '/100', status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_ENTRY2 },
      { id: 'PL-STRESS', type: 'plausibility', target: 'stress', min: 0, max: 100, unit: '/100', status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_ENTRY2 },
      { id: 'PL-GLU', type: 'plausibility', target: 'glucose', min: 20, max: 600, unit: 'mg/dL', danger: 'both', status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_ENTRY2 },
      { id: 'PL-SPO2', type: 'plausibility', target: 'spo2', min: 50, max: 100, unit: '%', danger: 'low', status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_ENTRY2 },

      /* ---------- Measurement conditions (decision 3.4) ---------- */
      { id: 'CX-REST', type: 'context', target: 'vitals', keys: ['hr', 'bp_sys', 'bp_dia', 'temp'], waitMin: 30, restMin: 5, status: PR, signed: true, version: 1, sourceIds: ['aha-bp-measure', 'nasa-iss-exercise'], note: 'Heart-rate, blood-pressure and temperature limits apply to rested readings only. A reading marked "after exercise" or "after caffeine" is not judged and is left out of the personal range; the person is asked to re-measure after 30 minutes with no exercise or caffeine, then 5 minutes\' rest. These are the American Heart Association\'s blood-pressure measurement instructions; using them for heart rate and temperature is the team physician\'s choice. Station crews exercise at least 2 hours a day.' },

      /* ---------- Tier 1 absolute limits: skip the baseline ---------- */
      { id: 'A-HR-HI',   type: 'absolute', target: 'hr',      op: '>=', value: 131,  unit: 'bpm',   tier: 1, status: PUB, signed: true, version: 1, sourceIds: ['rcp-news2', 'nasa-iss-exercise'], note: NOTE_NEWS2 + NOTE_RESTED },
      { id: 'A-HR-LO',   type: 'absolute', target: 'hr',      op: '<=', value: 40,   unit: 'bpm',   tier: 1, personal: { min: 30, max: 40 }, status: PUB, signed: true, version: 1, sourceIds: ['rcp-news2', 'rcp-news2-guidance', 'drezner-2017'], note: NOTE_NEWS2 + NOTE_RESTED + ' Fit people can have a resting heart rate of 30 bpm or more with no symptoms, so the flight surgeon can set a lower limit for one person, never below 30 bpm. NEWS2 guidance allows a trigger to be adapted for an individual after clinical assessment.' },
      { id: 'A-BPS-HI',  type: 'absolute', target: 'bp_sys',  op: '>',  value: 180,  unit: 'mmHg',  tier: 1, status: PUB, signed: true, version: 2, sourceIds: ['aha-acc-2025', 'aha-bp-readings'], note: '2025 AHA/ACC "severe hypertension": above 180/120 mmHg. The AHA advises waiting 5 minutes and measuring again, and contacting a clinician at once if it is still high. With chest pain, breathlessness, back pain, numbness, weakness, vision change or difficulty speaking it is an emergency.' + NOTE_RESTED },
      { id: 'A-BPD-HI',  type: 'absolute', target: 'bp_dia',  op: '>',  value: 120,  unit: 'mmHg',  tier: 1, status: PUB, signed: true, version: 1, sourceIds: ['aha-acc-2025', 'aha-bp-readings'], note: 'The diastolic half of the 2025 AHA/ACC severe-hypertension definition.' + NOTE_RESTED },
      { id: 'A-BPS-LO',  type: 'absolute', target: 'bp_sys',  op: '<=', value: 90,   unit: 'mmHg',  tier: 1, personal: { min: 50, max: 90 }, status: PUB, signed: true, version: 1, sourceIds: ['rcp-news2', 'norsk-2015'], note: NOTE_NEWS2 + NOTE_RESTED + ' 24-hour blood pressure ran 8-10 mmHg lower on long ISS flights, so the flight surgeon can set a lower limit for a person whose normal is low. There is no published floor.' },
      { id: 'A-TEMP-HI', type: 'absolute', target: 'temp',    op: '>=', value: 39.1, unit: '°C',    tier: 2, urgentReport: true, status: PR, signed: true, version: 2, sourceIds: ['rcp-news2', 'stahn-2017'], note: 'The team physician\'s rule (decision 3.3): urgent, not an emergency. NEWS2 scores 39.1 °C or more as 2, not a red 3, so a high temperature on its own shows Watch with an urgent report: tell the crew medical officer today, the flight surgeon replies within 24 hours, and safety-critical tasks wait until cleared. A red-flag symptom with it, such as new confusion, makes it Act now. Rested readings only (rule CX-REST): resting core temperature was about 1 °C higher on long ISS flights.' },
      { id: 'A-TEMP-LO', type: 'absolute', target: 'temp',    op: '<=', value: 35.0, unit: '°C',    tier: 1, status: PUB, signed: true, version: 1, sourceIds: ['rcp-news2'], note: NOTE_NEWS2 + NOTE_RESTED },
      { id: 'A-SPO2-LO', type: 'absolute', target: 'spo2',    op: '<=', value: 91,   unit: '%',     tier: 1, status: PUB, signed: true, version: 1, sourceIds: ['rcp-news2'], note: NOTE_NEWS2 + ' On SpO₂ scale 1.' },
      { id: 'A-GLU-LO',  type: 'absolute', target: 'glucose', op: '<',  value: 54,   unit: 'mg/dL', tier: 2, urgentReport: true, status: PUB, signed: true, version: 2, sourceIds: ['ada-2026-s6'], note: 'ADA Level 2 hypoglycaemia, which the ADA says requires immediate action: treat it now with fast-acting sugar. The team physician rates it urgent, not an emergency, when the person can treat it themselves (decision 3.2): Watch with an urgent report. Confusion or fainting makes it Act now (red flags). The ADA levels are written for people with diabetes; using them for healthy crew is the team physician\'s judgment.' },
      { id: 'A-GLU-HI',  type: 'absolute', target: 'glucose', op: '>=', value: 200,  unit: 'mg/dL', tier: 2, urgentReport: true, status: PUB, signed: true, version: 2, sourceIds: ['ada-2026-s2', 'hgc-2024'], note: '200 mg/dL is the ADA\'s random-glucose line for diagnosing diabetes when there are classic symptoms, and the glucose criterion for diabetic ketoacidosis in the 2024 consensus report. The team physician rates it urgent, not an emergency (decision 3.2): Watch with an urgent report. A red-flag symptom with it makes it Act now. Applying these lines to crew without diabetes is the team physician\'s judgment.' },

      /* ---------- Reference ranges for readings taken only when indicated ---------- */
      { id: 'R-SPO2', type: 'reference', target: 'spo2',    min: 96, max: 100, unit: '%',     tier: 2, status: PUB, signed: true, version: 1, sourceIds: ['rcp-news2', 'bts-2017'], note: 'NEWS2 scores 96% or more as 0, and the British Thoracic Society gives 96-98% as normal for healthy non-smoking adults.' },
      { id: 'R-GLU',  type: 'reference', target: 'glucose', min: 70, max: 140, highState: 'check', unit: 'mg/dL', tier: 2, status: PUB, signed: true, version: 2, sourceIds: ['ada-2026-s6', 'ada-2025-s16', 'shah-2019'], note: 'Blood sugar is checked only when something prompts it (decision 3.2). Below 70 is ADA Level 1 hypoglycaemia: Watch; treat with 15 g of fast-acting sugar and measure again after 15 minutes. From 141 to 199: re-measure first, the team physician\'s choice. The ADA treats glucose above 140 mg/dL as hyperglycaemia in hospital, and healthy adults without diabetes spent a median 96% of the day between 70 and 140 on continuous monitors.' },

      /* ---------- Tier 2: change from the person's own in-flight baseline ---------- */
      { id: 'B-BPS',    type: 'baseline', target: 'bp_sys', direction: 'both', minHalfWidth: 10, maxHalfWidth: 20,  tier: 2, status: PR, signed: true, version: 1, sourceIds: ['norsk-2015', 'iso-81060-2'], note: NOTE_BAND2 + ' A validated cuff may differ from the reference by up to 5 mmHg on average, with an SD of up to 8, so a smallest half-width of 10 avoids flagging device scatter.' },
      { id: 'B-BPD',    type: 'baseline', target: 'bp_dia', direction: 'both', minHalfWidth: 8, maxHalfWidth: 15,   tier: 2, status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_BAND2 },
      { id: 'B-HR',     type: 'baseline', target: 'hr',     direction: 'both', minHalfWidth: 8, maxHalfWidth: 15,   tier: 2, status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_BAND2 },
      { id: 'B-TEMP',   type: 'baseline', target: 'temp',   direction: 'both', minHalfWidth: 0.4, maxHalfWidth: 0.8, tier: 2, status: PR, signed: true, version: 1, sourceIds: ['stahn-2017'], note: NOTE_BAND2 },
      { id: 'B-SLEEP',  type: 'baseline', target: 'sleep',  direction: 'low',  minHalfWidth: 1.0, maxHalfWidth: 1.5, sustainDays: 1, tier: 2, status: PR, signed: true, version: 1, sourceIds: ['iss-sleep-study'], note: NOTE_BAND2 + ' One short night is enough to flag sleep.' },
      { id: 'B-MOOD',   type: 'baseline', target: 'mood',   direction: 'low',  minHalfWidth: 15, maxHalfWidth: 25,  tier: 2, status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_BAND2 + ' Mood is a 0-100 visual analogue scale, the team physician\'s choice.' },
      { id: 'B-STRESS', type: 'baseline', target: 'stress', direction: 'high', minHalfWidth: 15, maxHalfWidth: 25,  tier: 2, status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_BAND2 + ' Stress is a 0-100 visual analogue scale, the team physician\'s choice.' },
      { id: 'B-RT',     type: 'baseline-tests', target: 'rt', metric: 'meanSpeed', direction: 'low', minHalfWidthPct: 8, minTests: 3, windowTests: 10, tier: 2, status: PR, signed: true, version: 1, sourceIds: ['basner-2011', 'nasa-rst-spinoff'], note: 'The team physician\'s values. Compares response speed (the mean of 1/reaction time) with the same person\'s earlier tests of the same length on the same device, from the last 10 tests and after at least 3. The smallest band half-width is 8%.' },
      { id: 'B-ALERT',  type: 'baseline-alert', target: 'alertness', direction: 'low', minHalfWidth: 1, maxHalfWidth: 2, minTests: 3, windowTests: 10, tier: 2, status: PR, signed: true, version: 1, sourceIds: ['dev-2024'], note: 'The team physician\'s values. Compares how alert the person says they feel before the test (0 tired to 10 alert) with their own last 10 ratings: the median plus or minus 3 robust standard deviations, kept between 1 and 2 points, after at least 3 ratings. A low rating on its own never raises a flag.' },

      /* ---------- Symptoms ---------- */
      { id: 'RF-CHEST-PAIN', type: 'redflag', target: 'symptoms', symptomId: 'chest_pain',    tier: 1, status: PR, signed: true, version: 1, sourceIds: ['aha-bp-readings'], note: NOTE_RF },
      { id: 'RF-FAINT',      type: 'redflag', target: 'symptoms', symptomId: 'fainting',      tier: 1, status: PR, signed: true, version: 1, sourceIds: [], note: NOTE_RF },
      { id: 'RF-VISION',     type: 'redflag', target: 'symptoms', symptomId: 'vision_change', tier: 1, status: PR, signed: true, version: 1, sourceIds: ['nasa-hrp-risks', 'aha-bp-readings'], note: NOTE_RF },
      { id: 'RF-CONFUSION',  type: 'redflag', target: 'symptoms', symptomId: 'confusion',     tier: 1, status: PR, signed: true, version: 1, sourceIds: ['rcp-news2-guidance'], note: NOTE_RF + ' NEWS2 scores new confusion 3 points on its own. It also covers heat illness and severe low blood sugar.' },
      { id: 'RF-WEAKNESS',   type: 'redflag', target: 'symptoms', symptomId: 'weakness',      tier: 1, status: PR, signed: true, version: 1, sourceIds: ['aha-bp-readings'], note: NOTE_RF + ' The AHA lists numbness or weakness among the emergency signs.' },
      { id: 'RF-SPEECH',     type: 'redflag', target: 'symptoms', symptomId: 'speech',        tier: 1, status: PR, signed: true, version: 1, sourceIds: ['aha-bp-readings'], note: NOTE_RF + ' The AHA lists difficulty speaking among the emergency signs.' },
      { id: 'SY-ANY',        type: 'symptom',  target: 'symptoms', tier: 2, status: PR, signed: true, version: 1, sourceIds: ['nasa-3001-appe'], note: 'The team physician\'s rule: any reported symptom that is not a red flag shows Watch. The starting symptom list comes from the most likely conditions in NASA\'s sample model output.' },

      /* ---------- Amsler grid ---------- */
      { id: 'AM-NEW', type: 'amsler', target: 'amsler', minNewSquares: 1, tier: 2, urgentReport: true, status: PR, signed: true, version: 2, sourceIds: ['nasa-vision-2017', 'vision-assess-2023'], note: 'The team physician\'s rule: one or more newly marked squares, compared with the previous map of the same eye, shows Watch, and the report is set to Urgent so it does not wait for the weekly conference. With a headache or a vision symptom the same day it is Act now (P3).' },

      /* ---------- Combined patterns ---------- */
      { id: 'P1', type: 'pattern', target: 'pattern', title: 'Fatigue pattern', tier: 2, shortSleepHours: 6, urgentBeforeEvaDays: 1,
        status: PUB, signed: true, version: 2, sourceIds: ['iss-sleep-study', 'nasa-rst-spinoff', 'almadani-2025'],
        note: 'Short sleep together with a slower reaction test. The 6-hour figure is a published association in 24 ISS astronauts, not a validated cut-off, signed by the team\'s physician. When a spacewalk is planned for today or tomorrow it is urgent, not an emergency (the physician\'s value, signed 15 Nov 2026).' },
      { id: 'P2', type: 'pattern', target: 'pattern', title: 'Possible infection pattern', tier: 2, tier1WithRedFlag: true,
        status: PR, signed: true, version: 1, sourceIds: ['nasa-hrp-risks', 'stahn-2017'],
        note: 'The team physician\'s pattern: temperature above the personal band together with heart rate above the personal band, with or without breathing or skin symptoms. Act now when a red-flag symptom is also reported.' },
      { id: 'P3', type: 'pattern', target: 'pattern', title: 'Vision change pattern', tier: 2, tier1WithSymptoms: ['headache', 'vision_change'],
        status: PR, signed: true, version: 1, sourceIds: ['nasa-hrp-risks', 'nasa-vision-2017', 'vision-assess-2023'],
        note: 'The team physician\'s pattern: a new Amsler distortion shows Watch and goes to the flight surgeon as an urgent report. With a headache or a vision symptom the same day it is Act now.' },
      { id: 'P4', type: 'pattern', target: 'pattern', title: 'Strain or illness watch', tier: 2,
        status: PR, signed: true, disabled: true, version: 1, sourceIds: ['almadani-2025'],
        note: 'Switched off for the prototype by the team\'s physician: its only citation (Flynn-Evans et al. 2023) is unchecked, and it overlaps P1 and P2. Future work.' },
      { id: 'P5', type: 'pattern', target: 'pattern', title: 'Blind spot', tier: 2, urgentBeforeEvaDays: 1,
        status: PR, signed: true, version: 2, sourceIds: ['van-dongen-2003', 'iss-sleep-study', 'dev-2024'],
        note: 'You rate your alertness inside your usual range, but your reaction test is slower than your usual range. On Earth, after 14 days of 6 hours or less in bed, people were largely unaware of their growing deficits (Van Dongen 2003). Whether astronauts show the same blind spot in flight has not been tested. The team physician\'s pattern. When a spacewalk is planned for today or tomorrow it is urgent, not an emergency (signed 15 Nov 2026).' }
    ]
  };
});
