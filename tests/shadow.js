/* Crewcial - shadow-mode simulation (spec V3).
 * Runs the app's rules over simulated crew-days that contain labelled events, and
 * counts how many events the rules flag and how many flags fall outside any event.
 *
 * WHAT THIS DOES AND DOES NOT SHOW
 * It verifies that the rule logic behaves as designed on SYNTHETIC data produced
 * by this project's own generator. It says nothing about clinical accuracy. While
 * the rules are placeholders, the rates are placeholders too.
 * Run: node tests/shadow.js            (prints a summary)
 * AI-assistance disclosure: generated with Claude (Anthropic) for Team Crewcial. */
'use strict';
const E = require('../js/engine.js');
const D = require('../js/demo.js');
const Rules = require('../data/rules.js');
const Content = require('../data/content.js');

/* Which flags count as detecting which kind of event. */
const RELEVANT = {
  fever: ['temp', 'hr', 'P2'],
  fatigue: ['sleep', 'rt', 'P1', 'P4'],
  bp_rise: ['bp'],
  low_mood: ['mood']
};
const RECOVERY_DAYS = 2;   // days after an event that still count as part of it

function runShadow(opts) {
  opts = opts || {};
  const sim = D.simulate({ seed: opts.seed || 7, crewN: opts.crewN || 20, days: opts.days || 180, eventsPerCrew: opts.eventsPerCrew || 3 });
  const ix = E.indexRules(opts.rules || Rules);
  const firstDay = ix.cfg.calibrationDays + 1;
  let events = 0, detected = 0, delaySum = 0, alertDays = 0, falseAlertDays = 0, quietDays = 0, crewDays = 0, recheckDays = 0;
  const byType = {};
  sim.crews.forEach(crew => {
    const firstAlert = crew.events.map(() => null);
    for (let day = firstDay; day <= sim.days; day++) {
      const ctx = { ix, crewId: crew.id, day, phaseStartDay: 1, environment: 'mars', evaDay: null, readings: crew.readings, tests: crew.tests, symptoms: crew.symptoms };
      const res = E.evaluate(ctx, Content);
      const alerts = res.flagged.filter(f => f.state === 'act' || f.state === 'watch').map(f => f.id);
      if (res.flagged.some(f => f.state === 'check')) recheckDays++;
      crewDays++;
      let inWindow = false;
      crew.events.forEach((ev, i) => {
        if (day >= ev.start && day <= ev.end + RECOVERY_DAYS) inWindow = true;
        if (day >= ev.start && day <= ev.end && firstAlert[i] === null && alerts.some(a => RELEVANT[ev.type].includes(a))) firstAlert[i] = day;
      });
      if (!inWindow) quietDays++;
      if (alerts.length) { alertDays++; if (!inWindow) falseAlertDays++; }
    }
    crew.events.forEach((ev, i) => {
      if (ev.start < firstDay) return;
      events++;
      const t = byType[ev.type] = byType[ev.type] || { events: 0, detected: 0 };
      t.events++;
      if (firstAlert[i] !== null) { detected++; t.detected++; delaySum += firstAlert[i] - ev.start; }
    });
  });
  return {
    seed: opts.seed || 7, crew: sim.crews.length, days: sim.days, firstDay, crewDays,
    events, detected, detectionRate: events ? detected / events : 0, meanDelayDays: detected ? delaySum / detected : null,
    alertDays, falseAlertDays, falseAlertShare: alertDays ? falseAlertDays / alertDays : 0,
    falseAlertsPer100QuietDays: quietDays ? 100 * falseAlertDays / quietDays : 0, recheckDays, byType,
    rulesVersion: (opts.rules || Rules).version, placeholderRules: E.releaseCheck(opts.rules || Rules).placeholders.length
  };
}

module.exports = { runShadow };

if (require.main === module) {
  const r = runShadow({ seed: 7, crewN: 20, days: 180 });
  const pct = x => (100 * x).toFixed(1) + '%';
  console.log('Crewcial shadow-mode simulation (SYNTHETIC data; rules version ' + r.rulesVersion + '; ' + r.placeholderRules + ' placeholder rules)');
  console.log('Simulated: ' + r.crew + ' crew x ' + r.days + ' days, evaluated from day ' + r.firstDay + ' = ' + r.crewDays + ' crew-days');
  console.log('Injected events: ' + r.events + ' | flagged: ' + r.detected + ' | detection rate: ' + pct(r.detectionRate) + ' (team target: at least 90%)');
  Object.keys(r.byType).forEach(k => console.log('  ' + k + ': ' + r.byType[k].detected + ' of ' + r.byType[k].events));
  console.log('Mean days from event start to first flag: ' + (r.meanDelayDays === null ? 'n/a' : r.meanDelayDays.toFixed(2)));
  console.log('Crew-days with an Act-now or Watch flag: ' + r.alertDays + ' | outside any event: ' + r.falseAlertDays + ' | false-alert share: ' + pct(r.falseAlertShare) + ' (team target: under 5% of alerts)');
  console.log('False-alert days per 100 quiet crew-days: ' + r.falseAlertsPer100QuietDays.toFixed(2));
  console.log('Crew-days with at least one Re-check prompt: ' + r.recheckDays + ' (' + pct(r.recheckDays / r.crewDays) + ')');
  console.log('This checks the logic on simulated data. It is not evidence of clinical accuracy.');
}
