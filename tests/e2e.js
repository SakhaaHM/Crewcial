/* Crewcial - end-to-end test in a real browser (spec V4).
 * Opens index.html from disk (so it also proves the app runs offline), walks every
 * screen, completes a check-in, a reaction test, an Amsler test and a report, and
 * fails on any console error, dead link, unhandled button or sideways scroll.
 * Run: node tests/e2e.js     (needs Playwright and Chrome on this machine)
 * AI-assistance disclosure: generated with Claude (Anthropic) for Team Crewcial. */
'use strict';
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const SHOTS = path.join(__dirname, 'shots');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail || '' }); if (!ok) console.log('  FAIL  ' + name + (detail ? ' -> ' + detail : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function goto(page, hash) { await page.evaluate(h => { location.hash = h; }, hash); await sleep(120); }
async function text(page, sel) { return page.evaluate(s => { const n = document.querySelector(s); return n ? n.textContent : null; }, sel); }
async function noSideScroll(page, label) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('no sideways scroll: ' + label, over <= 1, 'overflow ' + over + 'px');
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(URL);
  await sleep(300);

  /* ---- Static checks: every link and every button leads somewhere ---- */
  const appJs = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  const handled = new Set([...appJs.matchAll(/case '([a-z-]+)':/g)].map(m => m[1]));
  const used = new Set([...appJs.matchAll(/data-act="([a-z-]+)"/g)].map(m => m[1]));
  const unhandled = [...used].filter(a => !handled.has(a));
  check('every button action has a handler', unhandled.length === 0, unhandled.join(', '));

  /* ---- Home: the demo opens in a working state ---- */
  check('title is Crewcial', (await page.title()) === 'Crewcial');
  check('demo banner is shown', /Simulated data/.test(await text(page, '.banner--demo') || ''));
  check('no placeholder banner: every rule is signed (0.5.0)', (await page.locator('.banner--proto').count()) === 0);
  check('home shows Watch and leads with the blind spot', /Watch/.test(await text(page, '.annun') || '') && /Blind spot/.test(await text(page, '.annun-title') || ''));
  check('home has 8 body-system tiles', (await page.locator('.rtile').count()) === 8);
  check('body figure has 8 clickable parts', (await page.locator('.bodyfig a.bp').count()) === 8);
  check('the figure is labelled as AI-generated inside the drawing', /AI-generated/.test(await text(page, '.bodyfig svg .fig-note') || ''));
  /* 0.5.2: About opens with what sets Crewcial apart, with the live rule count */
  await goto(page, 'about');
  check('About opens with what sets Crewcial apart', await page.evaluate(() => { const c = document.querySelector('main .card'); return !!c && /What sets it apart/.test(c.textContent) && /physician's judgment on board/.test(c.textContent) && /47 rules signed off/.test(c.textContent) && c.querySelectorAll('li').length === 4; }));
  await goto(page, 'home');
  /* 0.5.1: a realistic astronaut per crew member; the flagged body system is lit */
  check('the figure is named for the crew member shown', /^Zahra, astronaut figure/.test(await page.getAttribute('.bodyfig svg', 'aria-label') || ''));
  check('Zahra is drawn as a woman, with her brain lit as Watch', (await page.locator('.bodyfig svg[data-figure="f"]').count()) === 1 && (await page.locator('.bodyfig a.bp--watch[href="#region-brain"]').count()) === 1 && (await page.locator('.bodyfig a.bp--watch').count()) === 1);
  check('the figure is to scale: Bones and muscles shows the lumbar spine, the pelvis, both kneecaps, and the thigh and calf muscles', await page.evaluate(() => {
    var a = document.querySelector('.bodyfig a[href="#region-msk"]');
    return !!a && a.querySelectorAll('.bp-spine').length === 1 && a.querySelectorAll('.bp-pelvis').length === 2 && a.querySelectorAll('.bp-patella').length === 2 && a.querySelectorAll('.bp-muscle').length === 2;
  }));
  check('muscles stay hidden while Bones and muscles is in range, so the calm figure stays simple', await page.evaluate(() => {
    var m = document.querySelector('.bodyfig a.bp--ok[href="#region-msk"] .bp-muscle');
    return !!m && getComputedStyle(m).opacity === '0';
  }));
  check('each kneecap sits in front of the femur, above the tibia', await page.evaluate(() => {
    var a = document.querySelector('.bodyfig a[href="#region-msk"]'), p = a.querySelector('.bp-patella').getBBox();
    var shapes = Array.prototype.slice.call(a.querySelectorAll('.bp-shape')).filter(function (e) { return !/bp-(muscle|patella|spine|pelvis)/.test(e.getAttribute('class')); });
    var femur = shapes[0].getBBox(), tibia = shapes[2].getBBox();
    return p.y + p.height / 2 < femur.y + femur.height && p.y + p.height <= tibia.y + 2 && femur.y + femur.height > p.y;
  }));
  check('the suit, face and helmet ignore taps', await page.evaluate(() => ['.fig-art', '.fig-glass'].every(s => getComputedStyle(document.querySelector(s)).pointerEvents === 'none')));
  await page.click('.bodyfig a[href="#region-brain"] .bp-shape');
  await sleep(150);
  check('tapping the lit brain on the figure opens Brain and sleep, through the helmet glass', /#region-brain$/.test(page.url()));
  await goto(page, 'home');
  await page.click('.bodyfig a[href="#region-lungs"] .bp-shape >> nth=0');
  await sleep(150);
  check('tapping the lungs on the figure opens Lungs', /#region-lungs$/.test(page.url()));
  await goto(page, 'home');
  check('brain tile is lit as Watch', (await page.locator('.rtile--watch').count()) === 1);
  check('mission day chip reads 74', /Mission day 74/.test(await text(page, '.context') || ''));
  check('delay chip shows the Mars delay', /20 min/.test(await text(page, '.context') || ''));
  await noSideScroll(page, 'home');
  await page.screenshot({ path: path.join(SHOTS, '01-home-phone.png') });

  /* ---- Every route renders, has a heading, and no link is dead ---- */
  const routes = ['home', 'checkin', 'results', 'trends', 'trend-bp', 'trend-hr', 'trend-temp', 'trend-sleep', 'trend-mood', 'trend-rt', 'trend-spo2', 'trend-glucose',
    'region-brain', 'region-eyes', 'region-heart', 'region-lungs', 'region-metabolic', 'region-immune', 'region-msk', 'region-skin',
    'readiness', 'reaction', 'amsler', 'report', 'reports', 'cmo', 'cmo-P1', 'cmo-P2', 'cmo-P3', 'cmo-P5', 'cmo-generic', 'learn',
    'learn-bp', 'learn-hr', 'learn-temp', 'learn-sleep', 'learn-mood', 'learn-glucose', 'learn-spo2', 'learn-rt', 'learn-amsler', 'learn-symptoms', 'rules', 'setup', 'about', 'more'];
  const known = new Set(routes);
  const deadLinks = new Set();
  for (const r of routes) {
    await goto(page, r);
    const h1 = await page.locator('main h1').count();
    check('route #' + r + ' renders one main heading', h1 === 1, 'h1 count ' + h1);
    await noSideScroll(page, '#' + r);
    const hrefs = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="#"]')).map(a => a.getAttribute('href').slice(1)));
    hrefs.forEach(h => { if (h && h !== 'main' && !known.has(h)) deadLinks.add(r + ' -> #' + h); });
  }
  check('no dead internal links', deadLinks.size === 0, [...deadLinks].join('; '));

  /* ---- Results for the demo persona ---- */
  await goto(page, 'results');
  check('results show the fatigue pattern card', (await page.locator('#card-P1').count()) === 1);
  check('sleep card is Watch with the personal range', /Watch/.test(await text(page, '#card-sleep') || '') && /Below your usual range/.test(await text(page, '#card-sleep') || ''));
  check('pattern card says what to do and who to tell', /What to do now/.test(await text(page, '#card-P1') || '') && /Who to tell/.test(await text(page, '#card-P1') || ''));
  check('Mars routing mentions the 40-minute reply', /40 minutes or more/.test(await text(page, '.ground') || ''));
  check('results show the blind-spot card', (await page.locator('#card-P5').count()) === 1 && /Blind spot/.test(await text(page, '#card-P5') || ''));
  check('the reaction card compares how she feels with how she performed', /How you feel versus how you performed/.test(await text(page, '#card-rt') || '') && /8 of 10/.test(await text(page, '#card-rt') || ''));
  check('readings covered by a pattern do not repeat its steps', /Part of the fatigue pattern/.test(await text(page, '#card-sleep') || '') && !/What to do now/.test(await text(page, '#card-sleep') || ''));
  check('the medication rule is stated once on the page', ((await text(page, 'main')) || '').split('Take medication only as directed').length === 2);
  check('signed rules carry no placeholder badge on her cards (0.4.0)', (await page.locator('#card-P1 .badge--placeholder').count()) === 0 && (await page.locator('#card-P1 .badge--signed').count()) >= 1);
  check('a Watch card shows one next step and folds the rest behind Details', (await page.locator('#card-P1 > .next').count()) === 1 && (await page.locator('#card-P1 > details.more:not([open])').count()) === 1 && (await page.locator('#card-P1 > .tell').count()) === 0);
  check('sources on result cards are folded, never written out', (await page.locator('main p.src').count()) === 0 && (await page.locator('main details.srcs').count()) >= 1 && (await page.locator('main details.srcs[open]').count()) === 0);
  check('in-range rows keep their reason behind "Why this colour?"', (await page.locator('#card-bp > p.reason').count()) === 0 && /usual range/.test(await text(page, '#card-bp details.whyc') || ''));
  await page.locator('#card-sleep details.more > summary').click();
  await page.locator('#card-sleep details.whyc > summary').click();
  check('"Why this colour?" names the rule', /B-SLEEP/.test(await text(page, '#card-sleep details.whyc') || ''));
  await page.screenshot({ path: path.join(SHOTS, '02-results-phone.png'), fullPage: true });

  /* ---- Trends ---- */
  await goto(page, 'trend-sleep');
  await sleep(150);
  check('sleep trend draws a chart', (await page.locator('.chart svg.chart-svg').count()) === 1);
  check('sleep chart has a usual-range band', (await page.locator('.chart polygon.band').count()) >= 1);
  check('sleep chart marks the flagged days', (await page.locator('.chart .mk--watch').count()) >= 3);
  await page.locator('.tablev summary').click();
  check('table view lists the readings', (await page.locator('#trend-table tbody tr').count()) >= 25);
  await page.screenshot({ path: path.join(SHOTS, '03-trend-sleep-phone.png'), fullPage: true });
  await goto(page, 'trend-bp');
  await sleep(100);
  check('blood pressure shows two small charts on one unit', (await page.locator('.chart svg.chart-svg').count()) === 2);
  await goto(page, 'trend-rt');
  await sleep(100);
  check('reaction trend marks the slow tests', (await page.locator('.chart .mk--watch').count()) >= 1);

  /* ---- Readiness and report ---- */
  await goto(page, 'readiness');
  check('readiness shows Caution, never go or no-go', /Caution/.test(await text(page, '.annun') || '') && /not a go or no-go/.test(await text(page, '.annun') || ''));
  check('readiness names the spacewalk day', /tomorrow, on mission day 75/.test(await text(page, '.lede') || ''));
  await page.screenshot({ path: path.join(SHOTS, '04-readiness-phone.png'), fullPage: true });
  await goto(page, 'report');
  const sVal = await page.inputValue('#rp-S');
  check('report is pre-filled with the situation', /Zahra/.test(sVal) && /Fatigue pattern/.test(sVal));
  check('default route is the private medical conference', await page.isChecked('input[name="rp-route"][value="pmc"]'));
  await page.click('[data-act="send-report"]');
  check('a report cannot be sent without approval', /approve/.test(await text(page, '#rp-error') || ''));
  await page.check('input[name="rp-route"][value="urgent"]');
  check('audience text changes with the route', /crew medical officer and the flight surgeon/.test(await text(page, '#rp-aud') || ''));
  await page.check('#rp-approve');
  await page.screenshot({ path: path.join(SHOTS, '05-report-phone.png'), fullPage: true });
  await page.click('[data-act="send-report"]');
  await sleep(300);
  check('urgent report shows it is on its way to Earth', /On its way to Earth\. Arrives in/.test(await text(page, '.repstat[data-live]') || ''));
  await sleep(1200);
  const st1 = await text(page, '.repstat[data-live]');
  check('the delay countdown is running', /Arrives in 1[5-9]:/.test(st1 || ''), st1);
  await page.screenshot({ path: path.join(SHOTS, '06-reports-phone.png') });

  /* ---- Check-in as the commander, who has no data today ---- */
  await page.selectOption('#crew-select', 'c1');
  await goto(page, 'home');
  check('commander: home says the check is not done, nothing is green', /not done/.test(await text(page, '.annun-title') || '') && (await page.locator('.rtile--ok').count()) === 0);
  await goto(page, 'checkin');
  await page.fill('#in-bp_sys', '117'); await page.fill('#in-bp_dia', '75'); await page.fill('#in-hr', '57');
  await page.fill('#in-temp', '36.9'); await page.fill('#in-sleep', '7');
  await page.locator('#in-mood').focus(); await page.keyboard.press('ArrowRight'); await page.locator('#in-mood').fill('74');
  await page.locator('#in-stress').fill('28');
  await page.click('[data-act="sym-mode"][data-mode="none"]');
  await page.screenshot({ path: path.join(SHOTS, '07-checkin-phone.png'), fullPage: true });
  await page.click('[data-act="save-check"]');
  await sleep(250);
  check('saving the check opens the results', (await page.evaluate(() => location.hash)) === '#results');
  const cState = await page.evaluate(() => { const s = window.Crewcial.App.getState(); return { readings: s.readings.filter(r => r.crewId === 'c1' && r.day === 74).length, check: s.checks.some(c => c.crewId === 'c1' && c.day === 74) }; });
  check('seven readings and a completed check were stored', cState.readings === 7 && cState.check, JSON.stringify(cState));
  await goto(page, 'home');
  check('commander: after the check nothing is "No data"', (await page.locator('.rtile--nodata').count()) === 0, (await text(page, '.rtiles')) || '');
  /* stepper buttons */
  await goto(page, 'checkin');
  const before = await page.inputValue('#in-hr');
  await page.click('[data-act="step"][data-key="hr"][data-dir="1"]');
  check('the plus button raises the value by one', Number(await page.inputValue('#in-hr')) === Number(before) + 1);
  /* implausible entry */
  await page.fill('#in-temp', '368');
  await page.click('[data-act="save-check"]');
  await sleep(250);
  check('an implausible entry shows Re-check, not an alarm', /Re-check/.test(await text(page, '#card-temp') || '') && !/Act now/.test(await text(page, '#card-temp .tile') || ''));
  /* red flag */
  await goto(page, 'checkin');
  await page.fill('#in-temp', '36.9');
  await page.click('[data-act="sym-mode"][data-mode="some"]');
  await page.click('[data-act="sym-region"][data-id="heart"]');
  await page.click('[data-act="sym-toggle"][data-id="chest_pain"]');
  await page.click('[data-act="sym-sev"][data-n="3"]');
  await page.click('[data-act="save-check"]');
  await sleep(250);
  check('a red-flag symptom shows Act now', /Act now/.test(await text(page, '#card-symptoms .tile') || '') && /Chest pain \(severe\)/.test(await text(page, '#card-symptoms') || ''));
  check('an Act-now card keeps every step and who to tell in view', (await page.locator('#card-symptoms > .do').count()) === 1 && (await page.locator('#card-symptoms > .tell').count()) === 1);
  await goto(page, 'home');
  check('home lights up as Act now', (await page.locator('.annun--act').count()) === 1 && (await page.locator('.rtile--act').count()) === 1);
  check('one Act-now item reads "1 item needs action now."', /1 item needs action now\./.test(await text(page, '.annun-sub') || ''));
  await page.screenshot({ path: path.join(SHOTS, '08-home-actnow-phone.png') });
  /* blood pressure needs both numbers */
  await goto(page, 'checkin');
  await page.fill('#in-bp_dia', '');
  await page.click('[data-act="save-check"]');
  check('one blood pressure number alone is refused with a clear message', /both blood pressure numbers/.test(await text(page, '#ci-error') || ''));

  /* ---- Reaction test (demo length) ---- */
  await goto(page, 'setup');
  await page.check('input[name="rtlen"][value="20"]');
  await goto(page, 'reaction');
  check('demo-length warning is shown', /Demo length/.test(await text(page, 'main') || ''));
  const testsBefore = await page.evaluate(() => window.Crewcial.App.getState().tests.length);
  check('the alertness question offers 0 to 10', (await page.locator('#rt-alert [data-act="alert"]').count()) === 11);
  await page.focus('#rt-pad');
  await page.keyboard.press('Space');
  await sleep(150);
  check('the test does not start before the alertness question is answered', /First choose how alert you feel/.test(await text(page, '#rt-hint') || '') &&
    !(await page.evaluate(() => document.getElementById('rt-pad').classList.contains('rt-pad--run'))));
  await page.click('#rt-alert [data-act="alert"][data-n="6"]');
  check('the chosen rating is marked', (await page.getAttribute('#rt-alert [data-n="6"]', 'aria-pressed')) === 'true');
  await page.focus('#rt-pad');
  await page.keyboard.press('Space');
  const t0 = Date.now(); let presses = 0, early = false;
  while (Date.now() - t0 < 32000) {
    const done = await page.evaluate(n => window.Crewcial.App.getState().tests.length > n, testsBefore);
    if (done) break;
    const go = await page.evaluate(() => { const p = document.getElementById('rt-pad'); return !!p && p.classList.contains('rt-pad--go'); });
    if (go) { await sleep(180 + Math.random() * 60); await page.keyboard.press('Space'); presses++; }
    else if (!early && presses === 2) { early = true; await page.keyboard.press('Space'); }   // one deliberate early tap
    await sleep(20);
  }
  const rtSaved = await page.evaluate(n => { const s = window.Crewcial.App.getState(); return s.tests.length > n ? s.tests[s.tests.length - 1] : null; }, testsBefore);
  check('the reaction test finishes and is saved', !!rtSaved && rtSaved.type === 'reaction' && rtSaved.durationSec === 20, JSON.stringify(rtSaved && rtSaved.metrics));
  check('reaction metrics are sane', !!rtSaved && rtSaved.metrics.n >= 3 && rtSaved.metrics.medianRt > 100 && rtSaved.metrics.medianRt < 700 && rtSaved.metrics.falseStarts >= 1, JSON.stringify(rtSaved && rtSaved.metrics));
  check('the result is labelled as demo-length and not valid', /not a valid result/.test(await text(page, '#card-rt') || ''));
  check('the alertness rating is saved with the test', !!rtSaved && rtSaved.alertness === 6);
  check('the result shows how you feel versus how you performed', /How you feel versus how you performed/.test(await text(page, '#card-rt') || '') && /6 of 10/.test(await text(page, '#card-rt') || ''));
  await page.screenshot({ path: path.join(SHOTS, '09-reaction-phone.png'), fullPage: true });

  /* ---- Amsler grid ---- */
  await goto(page, 'amsler');
  check('amsler starts with the screen-size step', /Set your screen size/.test(await text(page, '#am-root') || ''));
  await page.click('#am-cal-skip');
  check('right eye comes first', /Right eye \(1 of 2\)/.test(await text(page, '#am-root') || ''));
  await page.locator('#am-wrap .am-cell[data-i="188"]').click();
  await page.locator('#am-wrap .am-cell[data-i="189"]').click();
  check('the save button counts the marked squares', /Save 2 marked squares/.test(await text(page, '#am-save') || ''));
  await page.screenshot({ path: path.join(SHOTS, '10-amsler-phone.png'), fullPage: true });
  await page.click('#am-save');
  check('left eye comes second', /Left eye \(2 of 2\)/.test(await text(page, '#am-root') || ''));
  await page.click('#am-normal');
  await sleep(250);
  const am = await page.evaluate(() => window.Crewcial.App.getState().tests.filter(t => t.type === 'amsler' && t.crewId === 'c1' && t.day === 74));
  check('two eye maps are saved', am.length === 2 && am.find(t => t.eye === 'R').cells.length === 2 && am.find(t => t.eye === 'L').cells.length === 0);
  check('the new distortion is flagged for the flight surgeon', /2 newly marked squares/.test(await text(page, '#card-amsler') || ''));

  /* ---- Rules, learn, setup ---- */
  await goto(page, 'rules');
  check('rules screen says every rule is sourced and signed off (0.5.0)', /All 47 rules are sourced and signed off/.test(await text(page, '.annun') || ''));
  check('all 47 rules and 46 sources are listed', (await page.locator('.rules .rule').count()) === 47 && (await page.locator('.sources li').count()) === 46);
  check('the switched-off pattern P4 is listed separately', (await page.locator('.rules--off .rule-off').count()) === 1);
  const sourcedRules = await page.evaluate(() => window.Crewcial.Rules.rules.filter(r => r.sourceIds && r.sourceIds.length).length);
  check('the Rules screen writes every source out in full', sourcedRules > 0 && (await page.locator('.rules p.src').count()) >= sourcedRules && (await page.locator('.rules details.srcs').count()) === 0, sourcedRules + ' sourced rules');
  await goto(page, 'learn-bp');
  check('learn answers the five questions, one fold-out each', (await page.locator('main details.card.qa').count()) === 5);
  { /* 0.6.1: no Learn page says "to be written", "Phase 3" or "placeholder" */
    const stale = [];
    for (const id of ['bp', 'hr', 'temp', 'sleep', 'mood', 'glucose', 'spo2', 'rt', 'amsler', 'symptoms']) {
      await goto(page, 'learn-' + id);
      const t = await page.evaluate(() => { document.querySelectorAll('main details').forEach(d => { d.open = true; }); return document.querySelector('main').textContent; });
      if (/to be written|phase 3|placeholder/i.test(t)) { stale.push(id); }
    }
    check('no Learn page shows stand-in wording', stale.length === 0, stale.join(', '));
    check('every indicator answers all five Learn questions, none left empty (0.6.2)', await page.evaluate(() => window.Crewcial.Content.indicators.every(function (i) { return ['q1', 'q2', 'q3', 'q4', 'q5'].every(function (q) { return i.learn[q] && i.learn[q].text.length > 5; }); })));
    await goto(page, 'learn-bp');
  }
  await page.focus('a.skip'); await page.keyboard.press('Enter'); await sleep(100);
  check('the skip link moves focus without leaving the screen', (await page.evaluate(() => location.hash + '|' + document.activeElement.id)) === '#learn-bp|main');
  await goto(page, 'setup');
  await page.check('input[name="env"][value="lunar"]');
  await sleep(150);
  check('the Moon shows its sourced delay in the header', /Lunar base/.test(await text(page, '.context') || '') && /Delay 4–12 s/.test(await text(page, '.context') || ''));
  await goto(page, 'results');
  check('Moon routing gives the few-seconds delay and no countdown wording', /a few seconds each way/.test(await text(page, 'main') || '') && !/40 minutes or more/.test(await text(page, 'main') || ''));
  await goto(page, 'setup');
  await page.check('input[name="env"][value="station"]');
  await sleep(150);
  check('switching location updates the header', /Space station/.test(await text(page, '.context') || '') && /Real-time link/.test(await text(page, '.context') || ''));
  await goto(page, 'results');
  check('station routing uses the real-time link', /real-time link/.test(await text(page, 'main') || '') && !/40 minutes or more/.test(await text(page, 'main') || ''));
  await goto(page, 'setup');
  await page.click('[data-act="export"]');
  await sleep(150);
  const exported = await page.inputValue('#su-export');
  let parsed = null; try { parsed = JSON.parse(exported); } catch (e) { /* stays null */ }
  check('export produces valid data', !!parsed && parsed.schema === 1 && parsed.crew.length === 4);

  /* ---- 0.4.0: prompts, scale note, personal limits, new mission phase ---- */
  /* ---- 0.5.0: urgent limits for temperature and blood sugar (decisions 3.2 and 3.3) ---- */
  await goto(page, 'checkin');
  await page.fill('#in-bp_sys', '117'); await page.fill('#in-bp_dia', '75');
  await page.fill('#in-temp', '39.4');
  await page.evaluate(() => { const d = document.querySelector('details.extra'); if (d) { d.open = true; } });
  await page.fill('#in-glucose', '52');
  await page.click('[data-act="sym-mode"][data-mode="none"]');
  await page.click('[data-act="save-check"]');
  await sleep(250);
  const tempCard = await text(page, '#card-temp') || '', gluCard = await text(page, '#card-glucose') || '';
  const urgHash = await page.evaluate(() => location.hash + ' ' + (document.querySelector('.error, .form-error, [role="alert"]') || {}).textContent);
  check('39.4 °C shows Watch at the urgent limit, not Act now', (await page.locator('#card-temp.card--watch').count()) === 1 && /urgent limit of 39\.1/.test(tempCard) && /Urgent, not an emergency/.test(tempCard), urgHash + ' | ' + tempCard.slice(0, 200));
  check('a blood sugar of 52 says treat now and is urgent, not an emergency', /15 g of fast-acting sugar/.test(gluCard) && /Urgent, not an emergency/.test(gluCard), gluCard.slice(0, 200));
  await page.screenshot({ path: path.join(SHOTS, '17-urgent-phone.png'), fullPage: true });
  await goto(page, 'report');
  check('the report for an urgent limit is set to Urgent', await page.isChecked('input[name="rp-route"][value="urgent"]'));
  await goto(page, 'checkin');
  check('blood sugar and SpO2 say when to add them', /shaky, sweaty, confused or very thirsty/.test(await text(page, 'details.extra') || '') && /short of breath/.test(await text(page, 'details.extra') || ''));
  check('the mood sliders are described as visual analogue scales', /Not a validated clinical scale/.test(await text(page, 'main') || '') && !/A validated scale will replace/.test(await text(page, 'main') || ''));
  await goto(page, 'setup');
  await page.fill('#su-A-HR-LO', '35'); await page.dispatchEvent('#su-A-HR-LO', 'change'); await sleep(150);
  const lim1 = await page.evaluate(() => { const s = window.Crewcial.App.getState(); return s.limits && s.limits.c1 ? s.limits.c1['A-HR-LO'] : null; });
  await page.fill('#su-A-HR-LO', '20'); await page.dispatchEvent('#su-A-HR-LO', 'change'); await sleep(150);
  const lim2 = await page.evaluate(() => { const s = window.Crewcial.App.getState(); return s.limits.c1['A-HR-LO']; });
  check('the flight surgeon can set a personal heart-rate limit, never below 30', lim1 === 35 && lim2 === 30, lim1 + ' ' + lim2);
  await page.fill('#su-A-HR-LO', ''); await page.dispatchEvent('#su-A-HR-LO', 'change'); await sleep(150);
  check('clearing it goes back to the standard limit', await page.evaluate(() => window.Crewcial.App.getState().limits.c1['A-HR-LO'] === undefined));
  await page.click('[data-act="ask"][data-what="phase"]');
  check('a new mission phase asks first', /learns everyone's normal again/.test(await text(page, '.confirm') || ''));
  await page.click('[data-act="confirm-yes"]'); await sleep(150);
  const ph = await page.evaluate(() => { const s = window.Crewcial.App.getState(); return { start: s.mission.phaseStartDay, day: s.mission.fixedDay }; });
  check('starting a new phase sets it to today', ph.start === ph.day, JSON.stringify(ph));
  await goto(page, 'results');
  check('after a new phase the readings are learning again', (await page.locator('main .tile--calibrating, main .st--calibrating, main [class*="calibrating"]').count()) >= 1);

  /* ---- Data survives a reload ---- */
  await page.reload(); await sleep(300);
  const kept = await page.evaluate(() => { const s = window.Crewcial.App.getState(); return { crew: s.settings.crewId, env: s.mission.environment, n: s.tests.length }; });
  check('data and settings survive a reload', kept.crew === 'c1' && kept.env === 'station', JSON.stringify(kept));

  /* ---- Import, empty mission, back to demo ---- */
  await goto(page, 'setup');
  await page.fill('#su-import', 'not json');
  await page.click('[data-act="import"]');
  check('a bad import is refused with a reason', /could not be read/.test(await text(page, '#su-import-error') || ''));
  await page.click('[data-act="ask"][data-what="empty"]');
  check('replacing the data asks first', /removes everything/.test(await text(page, '.confirm') || ''));
  await page.click('[data-act="confirm-yes"]');
  await sleep(200);
  const empty = await page.evaluate(() => { const s = window.Crewcial.App.getState(); return { crew: s.crew.length, readings: s.readings.length, demo: s.mission.demo }; });
  check('an empty mission has one crew member and no data', empty.crew === 1 && empty.readings === 0 && empty.demo === false);
  check('the demo banner is gone in a real mission', (await page.locator('.banner--demo').count()) === 0);
  await goto(page, 'home');
  check('empty mission: home invites the first check', /not done/.test(await text(page, '.annun-title') || ''));
  check('empty mission: the new crew member is drawn as a woman by default', (await page.locator('.bodyfig svg[data-figure="f"]').count()) === 1);
  await goto(page, 'setup');
  await page.click('input[name="figure"][value="m"]');
  await goto(page, 'home');
  check('Setup can switch the figure to a man', (await page.locator('.bodyfig svg[data-figure="m"]').count()) === 1 && (await page.evaluate(() => window.Crewcial.App.getState().crew[0].look.body)) === 'm');
  await goto(page, 'trends');
  check('empty mission: trends say there are no readings', /No readings/.test(await text(page, 'main') || ''));
  await goto(page, 'checkin');
  await page.fill('#in-bp_sys', '112'); await page.fill('#in-bp_dia', '70'); await page.fill('#in-hr', '60'); await page.fill('#in-temp', '36.8'); await page.fill('#in-sleep', '7.5');
  await page.locator('#in-mood').fill('70'); await page.locator('#in-stress').fill('30');
  await page.click('[data-act="sym-mode"][data-mode="none"]');
  await page.click('[data-act="save-check"]');
  await sleep(250);
  check('first day of a real mission shows "Learning your normal"', /Learning your normal/.test(await text(page, '#card-hr .tile') || '') && /no test has been done yet/.test(await text(page, '#card-rt') || ''));
  await page.screenshot({ path: path.join(SHOTS, '11-first-day-phone.png'), fullPage: true });
  await goto(page, 'setup');
  /* Set the box directly: typing a few hundred kilobytes through the test driver is very slow. */
  await page.evaluate(v => { document.getElementById('su-import').value = v; }, exported);
  await page.click('[data-act="import"]');
  await sleep(200);
  check('importing the exported text restores the mission', (await page.evaluate(() => window.Crewcial.App.getState().crew.length)) === 4);
  await page.click('[data-act="ask"][data-what="demo"]');
  await page.click('[data-act="confirm-yes"]');
  await sleep(200);
  check('the demo mission can be reloaded', (await page.evaluate(() => { const s = window.Crewcial.App.getState(); return s.mission.demo && s.settings.crewId === 'c3'; })) === true);

  /* ---- Other crew stories, dark theme, laptop ---- */
  await page.selectOption('#crew-select', 'c4');
  await goto(page, 'amsler');
  check('mission specialist: the day-60 eye maps are shown with new squares', (await page.locator('.map .am-cell--new').count()) === 3);
  await page.screenshot({ path: path.join(SHOTS, '12-amsler-maps-phone.png'), fullPage: true });
  await page.selectOption('#crew-select', 'c2');
  await goto(page, 'trend-temp');
  await page.click('[data-act="span"][data-n="0"]');
  await sleep(150);
  check('crew medical officer: the fever days are marked on the temperature trend', (await page.locator('.chart .mk--watch').count()) >= 2);
  await goto(page, 'home');
  check('Shihab is drawn as a man, with a beard', (await page.locator('.bodyfig svg[data-figure="m"]').count()) === 1 && (await page.locator('.bodyfig .f-beard').count()) > 0 && /^Shihab, astronaut figure/.test(await page.getAttribute('.bodyfig svg', 'aria-label') || ''));
  await page.screenshot({ path: path.join(SHOTS, '18-home-shihab-phone.png') });
  await page.selectOption('#crew-select', 'c4');
  await goto(page, 'home');
  check('Sadeem is drawn as a woman, with her eyes ringed as Watch', (await page.locator('.bodyfig svg[data-figure="f"]').count()) === 1 && (await page.locator('.bodyfig a.bp--watch[href="#region-eyes"] .bp-ring').count()) === 2);
  await page.selectOption('#crew-select', 'c1');
  await goto(page, 'home');
  check('Solara has no check today, so every part of her figure is hatched as No data', (await page.locator('.bodyfig svg[data-figure="f"]').count()) === 1 && (await page.locator('.bodyfig a.bp--nodata').count()) === 8);
  await page.selectOption('#crew-select', 'c3');
  await goto(page, 'home');
  await page.emulateMedia({ colorScheme: 'dark' });
  await sleep(100);
  await page.screenshot({ path: path.join(SHOTS, '13-home-dark-phone.png') });
  await goto(page, 'results');
  await page.screenshot({ path: path.join(SHOTS, '14-results-dark-phone.png') });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1280, height: 860 });
  await goto(page, 'home'); await sleep(150);
  check('laptop layout shows the side rail and hides the tab bar', (await page.locator('.rail').isVisible()) && !(await page.locator('.tabs').isVisible()));
  await page.screenshot({ path: path.join(SHOTS, '15-home-laptop.png') });
  await goto(page, 'trend-sleep'); await sleep(150);
  await page.screenshot({ path: path.join(SHOTS, '16-trend-laptop.png') });
  await page.setViewportSize({ width: 360, height: 740 });
  for (const r of ['home', 'results', 'checkin', 'trend-bp', 'report', 'rules', 'amsler']) { await goto(page, r); await sleep(80); await noSideScroll(page, '#' + r + ' at 360px'); }

  check('no console or page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log('\nEnd-to-end checks: ' + results.length + ' | passed: ' + (results.length - failed.length) + ' | failed: ' + failed.length);
  fs.writeFileSync(path.join(__dirname, 'e2e-result.json'), JSON.stringify({ total: results.length, failed: failed.length, results }, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('E2E CRASHED: ' + e.stack); process.exit(2); });
