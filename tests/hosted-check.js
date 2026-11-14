/* Crewcial - "hosted" check (spec V4, second part).
 * The main browser test (tests/e2e.js) opens the app from disk. This one serves it
 * over http and repeats the basics in two stricter situations:
 *   1. as a normal web page (like GitHub Pages), with a strict content policy that
 *      only allows the app's own files, and
 *   2. inside a locked-down frame where browser storage is refused, downloads and
 *      pop-up dialogs are blocked (the hardest case a preview host can impose).
 * The content policy below is OUR approximation of a strict host. It is not a copy
 * of any real host's policy.
 * Run: node tests/hosted-check.js     (needs Playwright and Chrome on this machine)
 * AI-assistance disclosure: generated with Claude (Anthropic) for Team Crewcial. */
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json' };
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src data:; img-src data: blob:; connect-src 'none'; frame-src 'self'; base-uri 'none'; form-action 'none'";
const FRAME_PAGE = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>frame</title><link rel="icon" href="data:,"></head><body style="margin:0">' +
  '<iframe id="f" title="Crewcial" sandbox="allow-scripts" src="/app/index.html" style="border:0;width:390px;height:844px"></iframe></body></html>';

const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail || '' }); if (!ok) console.log('  FAIL  ' + name + (detail ? ' -> ' + detail : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const requested = [];

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  requested.push(url);
  if (url === '/frame.html') { res.writeHead(200, { 'Content-Type': TYPES['.html'] }); res.end(FRAME_PAGE); return; }
  /* The app is served under a sub-folder, as it will be on a project page. */
  if (url.indexOf('/app/') !== 0) { res.writeHead(404); res.end('not found'); return; }
  const rel = url.slice(5) || 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (file.indexOf(ROOT) !== 0 || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': CSP });
  fs.createReadStream(file).pipe(res);
});

async function basics(target, label, errors) {
  /* target is a Page or a Frame; both offer evaluate() and locator(). */
  const title = await target.evaluate(() => document.title);
  check(label + ': title is Crewcial', title === 'Crewcial', title);
  check(label + ': home shows the status headline', (await target.locator('.annun').count()) === 1);
  check(label + ': home has 8 body-system tiles', (await target.locator('.rtile').count()) === 8);
  const font = await target.evaluate(() => document.fonts.ready.then(() => document.fonts.check('600 20px "Barlow Semi Condensed"')));
  check(label + ': the embedded display font loaded', font === true);
  for (const r of ['results', 'trend-sleep', 'readiness', 'report', 'rules', 'learn-bp', 'setup', 'home']) {
    await target.evaluate(h => { location.hash = h; }, r);
    await sleep(120);
    const h1 = await target.locator('main h1').count();
    check(label + ': #' + r + ' renders', h1 === 1, 'h1 count ' + h1);
  }
  check(label + ': the sleep trend draws a chart', await target.evaluate(async () => {
    location.hash = 'trend-sleep'; await new Promise(r => setTimeout(r, 150));
    return !!document.querySelector('main svg');
  }));

  /* A full check-in must be saved and evaluated, even where storage is refused.
     Same steps as tests/e2e.js: the commander has no check today. */
  await target.evaluate(() => { location.hash = 'home'; });
  await sleep(120);
  await target.selectOption('#crew-select', 'c1');
  await target.evaluate(() => { location.hash = 'checkin'; });
  await sleep(150);
  await target.fill('#in-bp_sys', '117'); await target.fill('#in-bp_dia', '75'); await target.fill('#in-hr', '57');
  await target.fill('#in-temp', '36.9'); await target.fill('#in-sleep', '7');
  await target.fill('#in-mood', '74'); await target.fill('#in-stress', '28');
  await target.click('[data-act="sym-mode"][data-mode="none"]');
  await target.click('[data-act="save-check"]');
  await sleep(300);
  const saved = await target.evaluate(() => {
    const s = window.Crewcial.App.getState();
    return { hash: location.hash, readings: s.readings.filter(r => r.crewId === 'c1' && r.day === 74).length, check: s.checks.some(c => c.crewId === 'c1' && c.day === 74) };
  });
  check(label + ': a check-in is saved and opens the results', saved.hash === '#results' && saved.readings === 7 && saved.check, JSON.stringify(saved));
  check(label + ': the results name a status for the commander', /In your range|Watch|Act now|Re-check|Learning your normal/.test(await target.evaluate(() => (document.querySelector('main') || {}).textContent || '')));
  check(label + ': no console or page errors', errors.length === 0, errors.slice(0, 4).join(' | '));
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port;
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  let failed = 0;
  try {
    /* ---- 1. Normal web page under a strict content policy ---- */
    {
      const errors = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('requestfailed', q => errors.push('request failed: ' + q.url()));
      const bad = [];
      page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
      await page.goto(base + '/app/index.html');
      await sleep(400);
      await basics(page, 'web page', errors);
      check('web page: every file request succeeded', bad.length === 0, bad.join(', '));
      check('web page: storage is available and used', await page.evaluate(() => window.Crewcial.Storage.persistent === true || (typeof window.Crewcial.Storage.persistent === 'function' && window.Crewcial.Storage.persistent())));
      const outside = requested.filter(u => u.indexOf('/app/') !== 0 && u !== '/frame.html');
      check('web page: nothing was requested outside the app folder', outside.length === 0, outside.join(', '));
      /* The download link is offered here, because the app is the top page. */
      await page.evaluate(() => { location.hash = 'setup'; });
      await sleep(150);
      await page.evaluate(() => { const b = document.querySelector('[data-act="export"]'); if (b) { b.click(); } });
      await sleep(200);
      const dl = await page.evaluate(() => { const n = document.getElementById('su-download'); return n ? { hidden: n.hidden, href: (n.getAttribute('href') || '').slice(0, 5) } : null; });
      check('web page: the export offers a download link', dl && dl.hidden === false && dl.href === 'blob:', JSON.stringify(dl));
      await ctx.close();
    }

    /* ---- 2. Inside a locked-down frame: no storage, no downloads, no dialogs ---- */
    {
      const errors = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      let dialogs = 0;
      page.on('dialog', d => { dialogs++; d.dismiss().catch(() => {}); });
      const bad2 = [];
      page.on('response', r => { if (r.status() >= 400) bad2.push(r.status() + ' ' + r.url()); });
      await page.goto(base + '/frame.html');
      await sleep(600);
      const frame = page.frames().find(f => /\/app\/index\.html/.test(f.url()));
      check('locked frame: the app frame loaded', !!frame);
      if (frame) {
        const refused = await frame.evaluate(() => { try { window.localStorage.getItem('x'); return false; } catch (e) { return true; } });
        check('locked frame: the browser really refuses storage here', refused === true);
        await basics(frame, 'locked frame', errors);
        check('locked frame: the app says data is kept in memory only', await frame.evaluate(() => { const p = window.Crewcial.Storage.persistent; return (typeof p === 'function' ? p() : p) === false; }));
        await frame.evaluate(() => { location.hash = 'setup'; });
        await sleep(150);
        await frame.evaluate(() => { const b = document.querySelector('[data-act="export"]'); if (b) { b.click(); } });
        await sleep(200);
        const dl = await frame.evaluate(() => { const n = document.getElementById('su-download'); const t = document.getElementById('su-export'); return { link: n ? n.hidden : null, text: t ? t.value.length : 0 }; });
        check('locked frame: the download link is hidden', dl.link === true, JSON.stringify(dl));
        check('locked frame: the export text is still offered for copying', dl.text > 1000, JSON.stringify(dl));
        check('locked frame: no pop-up dialog was opened', dialogs === 0, String(dialogs));
        check('locked frame: every file request succeeded', bad2.length === 0, bad2.join(', '));
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  failed = results.filter(r => !r.ok).length;
  console.log('Hosted checks: ' + results.length + ' | passed: ' + (results.length - failed) + ' | failed: ' + failed);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); try { server.close(); } catch (x) { /* ignore */ } process.exit(1); });
