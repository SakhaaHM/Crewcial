/*! Crewcial - app shell and screens.
 * AI-assistance disclosure: this file was generated with Claude (Anthropic) for
 * Team Crewcial, NASA Space Apps Challenge 2026. Clinical rules and guidance are
 * data (data/rules.js, data/content.js), signed off by the team's physician.
 * Not a medical device. Advisory prototype only.
 */
(function () {
  'use strict';
  var CW = window.Crewcial;
  var E = CW.Engine, C = CW.Content, RULES = CW.Rules, SOURCES = CW.Sources, Demo = CW.Demo, Store = CW.Storage, Charts = CW.Charts, Figure = CW.Figure;
  var ix = E.indexRules(RULES);
  var RELEASE = E.releaseCheck(RULES);
  var APP_VERSION = '0.8.0';
  var DAY_MS = 86400000;
  var srcById = {}, indById = {}, regionById = {}, symById = {};
  SOURCES.forEach(function (s) { srcById[s.id] = s; });
  C.indicators.forEach(function (d) { indById[d.id] = d; });
  C.regions.forEach(function (r) { regionById[r.id] = r; });
  C.symptoms.forEach(function (s) { symById[s.id] = s; });

  var app = document.getElementById('app');
  var state = null;
  var ui = { route: 'home', param: '', lastRoute: null, form: null, formError: '', trendSpan: 30, report: null, cmoDone: {}, confirm: '', notice: '', exportOpen: false, importError: '', mounted: null, timers: [], alertness: null };
  var SHORT = { act: 'Act now', watch: 'Watch', check: 'Re-check', nodata: 'No data', calibrating: 'Learning', ok: 'In range' };
  var ROUTES = ['home', 'checkin', 'results', 'trends', 'trend', 'region', 'readiness', 'reaction', 'amsler', 'report', 'reports', 'cmo', 'learn', 'rules', 'setup', 'about', 'more'];

  /* ---------- Small helpers ---------- */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function persist() { Store.save(state); }
  function cur() {
    for (var i = 0; i < state.crew.length; i++) { if (state.crew[i].id === state.settings.crewId) { return state.crew[i]; } }
    state.settings.crewId = state.crew[0].id;
    return state.crew[0];
  }
  function today() {
    var m = state.mission;
    if (m.fixedDay) { return m.fixedDay; }
    return Math.max(1, Math.floor((Date.now() - m.startTs) / DAY_MS) + 1);
  }
  function mine(list) { var id = cur().id; return list.filter(function (x) { return x.crewId === id; }); }
  function ctxFor(day) {
    var me = cur();
    return { ix: ix, crewId: me.id, day: day || today(), phaseStartDay: state.mission.phaseStartDay || 1, environment: state.mission.environment,
             evaDay: (me.evaDay === null || me.evaDay === undefined || me.evaDay === '') ? null : Number(me.evaDay),
             readings: mine(state.readings), tests: mine(state.tests), symptoms: mine(state.symptoms),
             limits: (state.limits && state.limits[me.id]) || null };
  }
  function evaluateNow() { return E.evaluate(ctxFor(), C); }
  function go(hash) { if (location.hash === '#' + hash) { render(); } else { location.hash = hash; } }
  function plural(n, w) { return E.plural(n, w); }
  function timeOf(ts) { var d = new Date(ts); return isNaN(d) ? '' : ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function mmss(ms) { var s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  var ICONS = {
    act: '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2 14.5 13.5h-13z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 6.3v3.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.5" r=".9" fill="currentColor"/></svg>',
    watch: '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3 14 13H2z" fill="currentColor"/></svg>',
    ok: '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.6 6.4 12 13 4.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    calibrating: '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.2 2.4"/></svg>',
    nodata: '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    check: '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M12.6 8a4.6 4.6 0 1 1-1.4-3.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12.9 2.4v3H9.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function tile(st, word) { return '<span class="tile tile--' + st + '">' + ICONS[st] + '<span>' + esc(word || E.STATES[st].word) + '</span></span>'; }
  function shortCite(s) { return s.citation.length > 96 ? s.citation.slice(0, 93).replace(/\s+\S*$/, '') + '…' : s.citation; }
  function sourceList(ids, open) {
    var list = (ids || []).filter(function (id) { return srcById[id]; });
    if (!list.length) { return ''; }
    var items = list.map(function (id) {
      var s = srcById[id];
      return s.url ? '<a href="' + esc(s.url) + '">' + esc(shortCite(s)) + '</a>' : esc(shortCite(s));
    });
    if (open) { return '<p class="src">Source' + (list.length > 1 ? 's' : '') + ': ' + items.join('; ') + '</p>'; }
    return '<details class="srcs"><summary>' + (list.length > 1 ? list.length + ' sources' : '1 source') + '</summary><ul>' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></details>';
  }
  /* Rules screen: a rule's grey note and its references open with one tap. */
  function ruleMore(r) {
    var n = (r.sourceIds || []).filter(function (id) { return srcById[id]; }).length;
    if (!r.note && !n) { return ''; }
    var label = (r.note ? 'Note' : '') + (r.note && n ? ' and ' : '') + (n ? (n > 1 ? n + ' sources' : '1 source') : '');
    return '<details class="rule-more"><summary>' + label + '</summary>' + (r.note ? '<p class="note">' + esc(r.note) + '</p>' : '') + sourceList(r.sourceIds, true) + '</details>';
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function niceDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] + ' ' + m[1] : (iso || ''); }
  function ruleBadge(r) {
    if (r.disabled) { return '<span class="badge badge--pending">Switched off</span>'; }
    if (r.status === 'placeholder') { return '<span class="badge badge--placeholder">Placeholder</span>'; }
    if (r.signed) { return '<span class="badge badge--signed">Signed off</span>'; }
    return '<span class="badge badge--pending">' + (r.status === 'proposed' ? 'Team-proposed' : 'Sourced') + ', awaiting sign-off</span>';
  }
  function steps(list) { return '<ol class="steps">' + list.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>'; }
  /* The instruction texts carry a Draft label only while Content.textsSigned is empty.
     A guidance set marked reviewed: true was approved on its own by the physician. */
  var SIGNED = !!C.textsSigned;
  var DRAFT = SIGNED ? '' : '<p class="draft">Draft guidance, not yet reviewed by the team\'s physician.</p>';
  var REVIEWED = '<p class="reviewed">Steps reviewed by the team\'s physician.</p>';
  function stepLabel(set) { return (SIGNED || (set && set.reviewed)) ? REVIEWED : DRAFT; }
  /* Minimal cards (0.3.0): the essentials stay in view; everything else sits behind one Details tap. */
  function more(inner, label) { return inner ? '<details class="more"><summary>' + esc(label || 'Details') + '</summary><div class="more-b">' + inner + '</div></details>' : ''; }
  function nextStep(t) { return t ? '<p class="next"><strong>Next:</strong> ' + esc(t) + '</p>' : ''; }

  /* ---------- State ---------- */
  function demoState() {
    var m = Demo.generateMission({ now: Date.now() });
    m.mission.fixedDay = 74;
    return { schema: 1, settings: { crewId: 'c3', reactionSeconds: ix.rtProto.durationSec, demoSpeed: true, theme: 'auto', pxPerMm: null },
             mission: m.mission, crew: m.crew, readings: m.readings, tests: m.tests, symptoms: m.symptoms, checks: m.checks, reports: m.reports };
  }
  function emptyState() {
    return { schema: 1, settings: { crewId: 'u1', reactionSeconds: ix.rtProto.durationSec, demoSpeed: false, theme: 'auto', pxPerMm: null },
             mission: { environment: 'station', startTs: Date.now(), phaseStartDay: 1, demo: false },
             crew: [{ id: 'u1', name: 'Crew member 1', role: '', isCmo: false, evaDay: null }],
             readings: [], tests: [], symptoms: [], checks: [], reports: [] };
  }
  function applyTheme() {
    var t = state.settings.theme;
    if (t === 'light' || t === 'dark') { document.documentElement.setAttribute('data-theme', t); }
    else if (ui.themeSet) { document.documentElement.removeAttribute('data-theme'); }
    ui.themeSet = t === 'light' || t === 'dark';
  }

  /* ---------- Shell ---------- */
  var NAV_ALL = [['home', 'Home'], ['checkin', 'Today\'s check'], ['results', 'Today\'s results'], ['trends', 'Trends'], ['readiness', 'Spacewalk readiness'],
                 ['reaction', 'Reaction test'], ['amsler', 'Amsler grid'], ['reports', 'Reports'], ['cmo', 'CMO checklists'], ['learn', 'Learn'],
                 ['rules', 'Rules and sources'], ['setup', 'Setup'], ['about', 'About']];
  var NAV_TABS = [['home', 'Home'], ['checkin', 'Check-in'], ['trends', 'Trends'], ['reports', 'Reports'], ['more', 'More']];
  function navGroup(route) {
    if (route === 'region' || route === 'results') { return route === 'results' ? 'results' : 'home'; }
    if (route === 'trend') { return 'trends'; }
    if (route === 'report') { return 'reports'; }
    return route;
  }
  function shell(body) {
    var me = cur(), env = ix.env[state.mission.environment], group = navGroup(ui.route);
    var delay = (env.oneWayDelayMin !== null && env.oneWayDelayMin !== undefined) ? 'Delay up to ' + env.oneWayDelayMin + ' min'
      : (env.delayLabel || (state.mission.environment === 'station' ? 'Real-time link' : 'Short link delay'));
    var place = { station: 'Space station', lunar: 'Lunar base', mars: 'Mars transit' }[state.mission.environment] || env.label;
    var crewOpts = state.crew.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === me.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
    var tabGroup = ['home', 'checkin', 'trends', 'reports'].indexOf(group) !== -1 ? group : (group === 'results' ? 'home' : 'more');
    var h = '';
    h += '<header class="top"><a class="brand" href="#home" aria-label="Crewcial home"><svg class="brand-mark" viewBox="0 0 22 22" aria-hidden="true"><rect x="1" y="1" width="20" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5" y="5" width="4" height="12" rx="1" fill="currentColor"/><path d="M12 11.3l2 2.1 3.4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="brand-name">Crewcial</span></a>' +
         '<label class="crewpick"><span class="vh">Crew member</span><select id="crew-select" data-chg="crew">' + crewOpts + '</select></label></header>';
    h += '<div class="context"><span class="chip" title="' + esc(env.label) + '">' + esc(place) + '</span><span class="chip">Mission day ' + today() + '</span><span class="chip">' + esc(delay) + '</span></div>';
    if (state.mission.demo || !RELEASE.ready) {
      h += '<p class="banner">' + (state.mission.demo ? '<span class="banner--demo"><strong>Simulated data.</strong></span> ' : '') +
        (RELEASE.ready ? '' : '<span class="banner--proto">' + RELEASE.placeholders.length + ' of ' + RELEASE.total + ' clinical rules are placeholders. <a href="#rules">Rules</a></span>') + '</p>';
    }
    h += '<div class="layout"><nav class="rail" aria-label="All sections"><ul>' + NAV_ALL.map(function (n) {
      return '<li><a href="#' + n[0] + '"' + (group === n[0] ? ' aria-current="page"' : '') + '>' + esc(n[1]) + '</a></li>';
    }).join('') + '</ul></nav><main id="main" tabindex="-1">' + body + '</main></div>';
    h += '<nav class="tabs" aria-label="Main sections"><ul>' + NAV_TABS.map(function (n) {
      return '<li><a href="#' + n[0] + '"' + (tabGroup === n[0] ? ' aria-current="page"' : '') + '>' + esc(n[1]) + '</a></li>';
    }).join('') + '</ul></nav>';
    h += '<footer class="foot">Prototype, not a medical device. <a href="#about">About</a></footer>';
    return h;
  }

  /* ---------- Body figure ----------
     0.5.1: a realistic astronaut for each crew member (js/figure.js): three women and
     one man in the demo. The eight body systems still light up by status. */
  function demoLook(id) { var d = Demo.CREW.filter(function (x) { return x.id === id; })[0]; return d ? d.look : null; }
  function lookOf(c) { return c.look || demoLook(c.id) || Figure.defaultLook('f'); }
  function bodyFigure(res) {
    var me = cur();
    function g(id, inner) {
      var st = res.regions[id].state;
      return '<a href="#region-' + id + '" class="bp bp--' + st + '" aria-label="' + esc(regionById[id].name + ': ' + E.STATES[st].word) + '">' + inner + '</a>';
    }
    return '<figure class="bodyfig">' + Figure.svg(lookOf(me), g, esc(me.name + ', astronaut figure. Each body part opens its status.')) + '</figure>';
  }

  /* ---------- Screens ---------- */
  var screens = {};

  screens.home = function (res) {
    var me = cur(), day = today();
    var top = res.flagged.filter(function (f) { return f.state === 'act' || f.state === 'watch'; });
    var checkDone = state.checks.some(function (c) { return c.crewId === me.id && c.day === day; });
    var title, sub, cta;
    if (res.overall === 'act') { title = top[0].label; var nAct = top.filter(function (f) { return f.state === 'act'; }).length; sub = plural(nAct, 'item') + (nAct === 1 ? ' needs' : ' need') + ' action now.'; cta = ['results', 'See what to do']; }
    else if (res.overall === 'watch') { title = top[0].label; sub = plural(top.length, 'item') + ' to look at today.'; cta = ['results', 'See what to do']; }
    else if (res.overall === 'check') { title = 'A reading needs a second look'; sub = 'Open today\'s results to see which one.'; cta = ['results', 'See today\'s results']; }
    else if (res.overall === 'nodata') { title = checkDone ? 'Some of today\'s data is missing' : 'Today\'s check is not done'; sub = 'Missing data is never shown as in range.'; cta = checkDone ? ['results', 'See what is missing'] : ['checkin', 'Start today\'s check']; }
    else if (res.overall === 'calibrating') { title = 'Crewcial is learning your normal'; sub = 'Only Act-now limits are active for now.'; cta = ['results', 'See today\'s results']; }
    else { title = 'Everything entered today is in your range'; sub = 'Nothing is flagged.'; cta = ['results', 'See today\'s results']; }
    var h = '<h1 class="vh">Home</h1>';
    h += '<section class="annun annun--' + res.overall + '" aria-label="Overall status">' +
         '<div class="annun-state">' + tile(res.overall) + '</div><p class="annun-title">' + esc(title) + '</p><p class="annun-sub">' + esc(sub) + '</p>' +
         '<a class="btn btn--primary" href="#' + cta[0] + '">' + esc(cta[1]) + '</a></section>';

    var lines = [];
    var streak = E.streak(state.checks, me.id, day);
    lines.push('<li><span class="k">Today\'s check</span><span class="v">' + (checkDone ? 'Done' + (streak > 1 ? ', ' + streak + ' days in a row' : '') : 'Not done yet') + '</span>' +
               (checkDone ? '<a href="#checkin">Edit</a>' : '<a href="#checkin">Start</a>') + '</li>');
    var rt = res.indicators.rt, am = res.indicators.amsler;
    if (rt.due) { lines.push('<li><span class="k">Reaction test</span><span class="v">Due: ' + esc(rt.dueWhy.join(' and ')) + '</span><a href="#reaction">Run</a></li>'); }
    if (am.due) { lines.push('<li><span class="k">Amsler grid</span><span class="v">Due: ' + esc(am.dueWhy.join(' and ')) + '</span><a href="#amsler">Run</a></li>'); }
    var rd = res.readiness;
    if (rd.evaInDays !== null && rd.evaInDays >= 0) {
      var when = rd.evaInDays === 0 ? 'today' : rd.evaInDays === 1 ? 'tomorrow' : 'in ' + rd.evaInDays + ' days';
      lines.push('<li><span class="k">Spacewalk ' + when + '</span><span class="v">Readiness summary: ' + esc({ act: 'Act-now items open', caution: 'Caution flags', incomplete: 'Incomplete', clear: 'No flags' }[rd.level]) + '</span><a href="#readiness">Open</a></li>');
    }
    h += '<ul class="facts">' + lines.join('') + '</ul>';

    h += '<section class="bodygrid" aria-label="Status by body system">' + bodyFigure(res) + '<ul class="rtiles">' + C.regions.map(function (r) {
      var st = res.regions[r.id].state;
      return '<li><a class="rtile rtile--' + st + '" href="#region-' + r.id + '"><span class="rtile-name">' + esc(r.short) + '</span><span class="rtile-state">' + ICONS[st] + '<span>' + SHORT[st] + '</span></span></a></li>';
    }).join('') + '</ul></section>';
    return h;
  };

  function actionsFor(st) {
    var g = C.guidance[st.id] || {}, gen = C.guidance.generic;
    if (st.state === 'act') {
      var t1 = (g.t1 || gen.t1).slice();
      /* Re-measure first when a reading, not a symptom, set off the Act-now limit. */
      if (st.id !== 'symptoms' && st.id !== 'rt' && st.id !== 'amsler' && gen.remeasure) { t1 = [gen.remeasure].concat(t1.filter(function (x) { return !/^Repeat the measurement/.test(x); })); }
      else if (st.id === 'symptoms') { t1 = t1.filter(function (x) { return !/^Repeat the measurement/.test(x); }); }
      return { list: t1, src: g.sourceIds };
    }
    if (st.state === 'watch') {
      /* Blood sugar has its own steps for low, low and urgent, and high. */
      if (st.id === 'glucose' && g.low) { return { list: st.deviation === 'low' ? (st.urgent ? g.lowUrgent : g.low) : g.highUrgent, src: g.sourceIds }; }
      if (st.urgent && g.urgent) { return { list: g.urgent, src: g.sourceIds }; }
      return { list: g.t2 || gen.t2, src: g.sourceIds };
    }
    if (st.state === 'check') {
      var parts = st.parts || [];
      var selfOnly = st.id === 'mood' || st.id === 'sleep';
      if (parts.some(function (p) { return p.notRested; })) { return { list: gen.notRested, src: ix.context ? ix.context.sourceIds : [] }; }
      if (parts.some(function (p) { return p.implausible; }) || /lower number/.test(st.reason)) {
        var fix = ['Check the entry for a typing error.', 'Measure again and save the new value.'];
        if (parts.some(function (p) { return p.dangerSide; })) { fix.push(gen.dangerSide); }
        return { list: fix, src: [] };
      }
      if (parts.some(function (p) { return p.refHigh; }) && g.recheck) { return { list: g.recheck, src: g.sourceIds }; }
      return { list: selfOnly ? [] : gen.recheck, src: [] };
    }
    return { list: [], src: [] };
  }
  function whyColour(ruleIds, pre) {
    var rs = (ruleIds || []).map(function (id) { return ix.byId[id]; }).filter(Boolean);
    if (!rs.length && !pre) { return ''; }
    return '<details class="whyc"><summary>Why this colour?</summary>' + (pre || '') + rs.map(function (r) {
      return '<div class="rule"><p class="rule-h"><code>' + esc(r.id) + '</code> ' + ruleBadge(r) + ' <span class="ver">version ' + esc(r.version) + '</span></p><p>' + esc(E.describeRule(r, ix)) + '</p>' +
             (r.note ? '<p class="note">' + esc(r.note) + '</p>' : '') + sourceList(r.sourceIds) + '</div>';
    }).join('') + '</details>';
  }
  function whyInSpace(id) {
    var def = indById[id];
    if (!def) { return ''; }
    var q = def.learn.q3 && def.learn.q3.text ? def.learn.q3 : def.learn.q2;
    return '<div class="why"><h4>Why it matters in space</h4><p>' + esc(q.text) + '</p>' + sourceList(q.sourceIds) + '</div>';
  }
  function tellBlock(tier, behavioural) {
    var r = E.route(tier, state.mission.environment, ix);
    var list = r.steps.slice();
    if (behavioural && tier !== 1) { list.push('Or use the private psychological conference instead.'); }
    return '<div class="tell"><h4>Who to tell</h4>' + steps(list) + '</div>';
  }
  /* Which readings each pattern already covers, so their steps are not repeated. */
  var PATTERN_MEMBERS = { P1: ['sleep', 'rt'], P2: ['temp', 'hr'], P3: ['amsler'], P4: ['sleep', 'hr'], P5: ['rt'] };
  function coveredBy(id, res) {
    if (!res) { return null; }
    for (var i = 0; i < res.patterns.length; i++) { if ((PATTERN_MEMBERS[res.patterns[i].id] || []).indexOf(id) !== -1) { return res.patterns[i]; } }
    return null;
  }
  function cardLinks(st) {
    var def = indById[st.id], links = [];
    if (def && def.parts.length) { links.push('<a href="#trend-' + st.id + '">See the trend</a>'); }
    if (st.id === 'rt') { links.push('<a href="#trend-rt">See the trend</a>', '<a href="#reaction">Run the test</a>'); }
    if (st.id === 'amsler') { links.push('<a href="#amsler">Open the grid test</a>'); }
    if (def) { links.push('<a href="#learn-' + st.id + '">Learn about this check</a>'); }
    return '<p class="links">' + links.join('') + '</p>';
  }
  /* Card for anything that needs a look: status, number, one line and the next step in view.
     Act now keeps all its steps and who to tell in view. The rest sits behind one Details tap. */
  function statusCard(st, res) {
    var def = indById[st.id], flagged = st.state === 'act' || st.state === 'watch' || st.state === 'check';
    var pat = flagged && st.state !== 'act' ? coveredBy(st.id, res) : null;
    var h = '<article class="card card--' + st.state + '" id="card-' + st.id + '">', extra = '';
    h += '<header class="card-h">' + tile(st.state) + '<h3>' + esc(st.label) + '</h3>' + (st.valueText ? '<span class="val">' + esc(st.valueText) + '</span>' : '') + '</header>';
    h += '<p class="reason">' + esc(st.reason) + '</p>';
    if (st.id === 'symptoms' && st.entries && st.entries.length) { h += '<ul class="support">' + st.entries.map(function (e) { return '<li>' + esc(symLabel(e)) + '</li>'; }).join('') + '</ul>'; }
    if (st.id === 'rt' && st.feel) { h += feelHead(st.feel); extra += feelText(st.feel); }
    if (def && def.isPrivate) { h += '<p class="private">Private. Crewmates never see this.</p>'; }
    if (flagged) {
      if (pat) { h += '<p class="covered">Part of the ' + esc(pat.title.toLowerCase()) + '. <button type="button" class="linkbtn" data-act="jump" data-id="card-' + pat.id + '">Go to its steps</button></p>'; }
      else {
        var a = actionsFor(st);
        if (st.state === 'act') {
          if (a.list.length) { h += '<div class="do"><h4>What to do now</h4>' + steps(a.list) + '</div>'; extra += stepLabel(null); }
          h += tellBlock(1, st.id === 'mood');
        } else {
          if (a.list.length) { h += nextStep(a.list[0]); extra += '<div class="do"><h4>What to do now</h4>' + steps(a.list) + stepLabel(null) + '</div>'; }
          if (st.urgent && st.state === 'watch') { h += '<p class="urgent-tag">Urgent, not an emergency</p>'; extra += '<div class="tell"><h4>Who to tell</h4>' + steps(C.guidance.generic.urgentTell) + '</div>'; }
          else if (st.state !== 'check') { extra += tellBlock(E.STATES[st.state].tier, st.id === 'mood'); }
        }
      }
      extra += whyInSpace(st.id);
      if (st.placeholder) { extra += '<p class="ph"><span class="badge badge--placeholder">Placeholder</span> The rule behind this flag is not clinically reviewed yet.</p>'; }
    }
    extra += whyColour(st.ruleIds);
    h += more(extra) + cardLinks(st) + '</article>';
    return h;
  }
  /* How you feel versus how you performed, shown with the reaction test result. */
  var FEEL_WORDS = { learning: 'Still learning your usual', aligned: 'They agree', tired: 'You feel more tired than you test', aware: 'They agree: tired and slower', blindspot: 'Blind spot' };
  function feelHead(f) { return '<p class="feel feel--' + f.state + '"><strong>How you feel versus how you performed:</strong> <span class="feel-w">' + esc(FEEL_WORDS[f.state] || '') + '</span></p>'; }
  function feelText(f) { return '<p class="feel-t">' + esc(f.text) + '</p>'; }
  /* Compact row: used for readings that are in range, still learning, or missing. */
  function statusRow(st) {
    var def = indById[st.id];
    var link = def && def.parts.length ? '<a href="#trend-' + st.id + '">Trend</a>' : st.id === 'rt' ? '<a href="#reaction">Test</a>' : st.id === 'amsler' ? '<a href="#amsler">Test</a>' : st.id === 'symptoms' ? '<a href="#checkin">Edit</a>' : '';
    var showReason = st.state === 'nodata' || st.state === 'check';
    var inner = (showReason ? '' : '<p class="reason">' + esc(st.reason) + '</p>') + (st.id === 'rt' && st.feel ? feelHead(st.feel) + feelText(st.feel) : '');
    return '<li class="srow srow--' + st.state + '" id="card-' + st.id + '"><div class="srow-h">' + tile(st.state) + '<span class="srow-name">' + esc(st.label) + '</span>' +
      (st.valueText ? '<span class="val">' + esc(st.valueText) + '</span>' : '') + '</div>' + (showReason ? '<p class="reason">' + esc(st.reason) + '</p>' : '') +
      '<div class="srow-f">' + whyColour(st.ruleIds, inner) + link + '</div></li>';
  }
  function patternCard(p) {
    var g = C.guidance[p.id] || {}, list = p.state === 'act' ? C.guidance.generic.t1 : (g.t2 || C.guidance.generic.t2), extra = '';
    /* 0.7.0: urgent, not an emergency (a spacewalk today or tomorrow): the hold step and the urgent "Who to tell". */
    var urgent = !!p.urgent && p.state === 'watch';
    var label = stepLabel(p.state !== 'act' && g.t2 ? g : null);
    if (urgent) { /* the urgent "Who to tell" lines are shown once, in their own block */
      var ut = C.guidance.generic.urgentTell;
      list = list.filter(function (x) { return ut.indexOf(x) === -1; }).concat([C.guidance.generic.urgentHold]);
    }
    var h = '<article class="card card--' + p.state + ' card--pattern" id="card-' + p.id + '">';
    h += '<header class="card-h">' + tile(p.state) + '<h3>' + esc(p.title) + '</h3></header>';
    h += '<ul class="support">' + p.supporting.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
    if (p.state === 'act') { h += '<div class="do"><h4>What to do now</h4>' + steps(list) + '</div>' + tellBlock(p.tier, false); extra += stepLabel(null); }
    else {
      h += nextStep(list[0]);
      if (urgent) { h += '<p class="urgent-tag">Urgent, not an emergency</p>'; }
      extra += '<div class="do"><h4>What to do now</h4>' + steps(list) + label + '</div>' +
        (urgent ? '<div class="tell"><h4>Who to tell</h4>' + steps(C.guidance.generic.urgentTell) + '</div>' : tellBlock(p.tier, false));
    }
    if (p.placeholder) { extra += '<p class="ph"><span class="badge badge--placeholder">Placeholder</span> This pattern is not clinically reviewed yet.</p>'; }
    extra += whyColour(p.ruleIds);
    h += more(extra);
    h += '<p class="links"><a href="#cmo-' + p.id + '">Open the CMO checklist</a><a href="#report">Write a report</a></p></article>';
    return h;
  }
  function groundCard() {
    var env = ix.env[state.mission.environment];
    return '<section class="card ground"><h2>Reaching the ground</h2><p>' + esc(env.link) + '</p>' + more('<p>' + esc(env.evac) + '</p><p class="note">' + esc(C.app.medication) + '</p>' + sourceList(env.sourceIds)) + '</section>';
  }

  screens.results = function (res) {
    var top = res.flagged.filter(function (f) { return f.state === 'act' || f.state === 'watch'; });
    var h = '<h1>Today\'s results</h1><p class="lede">Mission day ' + res.day + ', ' + esc(cur().name) + '. ' + tile(res.overall) + ' ' +
      (top.length ? plural(top.length, 'item') + ' flagged.' : res.overall === 'nodata' ? 'Some data is missing.' : 'Nothing is flagged.') + '</p>';
    if (res.patterns.length) { h += '<h2>Patterns</h2>' + res.patterns.map(patternCard).join(''); }
    var order = { act: 0, watch: 1, check: 2, nodata: 3, calibrating: 4, ok: 5 };
    var list = C.indicators.map(function (d) { return res.indicators[d.id]; }).sort(function (a, b) { return order[a.state] - order[b.state]; });
    var need = list.filter(function (s) { return s.state === 'act' || s.state === 'watch' || s.state === 'check'; });
    var missing = list.filter(function (s) { return s.state === 'nodata'; });
    var rest = list.filter(function (s) { return s.state === 'ok' || s.state === 'calibrating'; });
    if (need.length) { h += '<h2>Needs a look</h2>' + need.map(function (s) { return statusCard(s, res); }).join(''); }
    if (missing.length) { h += '<h2>No data</h2><ul class="srows">' + missing.map(statusRow).join('') + '</ul>'; }
    if (rest.length) { h += '<h2>In range or still learning</h2><ul class="srows">' + rest.map(statusRow).join('') + '</ul>'; }
    h += groundCard();
    h += '<div class="row"><a class="btn btn--primary" href="#report">Write a report</a><a class="btn" href="#readiness">Spacewalk readiness</a><a class="btn" href="#checkin">Edit today\'s check</a></div>';
    return h;
  };

  screens.region = function (res) {
    var r = regionById[ui.param];
    if (!r) { return screens.home(res); }
    var reg = res.regions[r.id];
    var h = '<p class="crumb"><a href="#home">Home</a></p><h1>' + esc(r.name) + '</h1><p class="lede">' + tile(reg.state) + '</p>';
    h += '<section class="card"><p>' + esc(r.does) + '</p><h2>Spaceflight risks</h2><ul class="support">' + r.hazards.map(function (z) { return '<li>' + esc(z.risk) + '</li>'; }).join('') + '</ul>' +
      more('<ul class="hazards">' + r.hazards.map(function (z) { return '<li><p>' + esc(z.text) + '</p>' + sourceList(z.sourceIds) + '</li>'; }).join('') + '</ul>', 'How spaceflight affects it') + '</section>';
    if (reg.patterns.length) { h += reg.patterns.map(patternCard).join(''); }
    reg.items.forEach(function (it) {
      if (it.id === 'symptoms') {
        h += '<article class="card card--' + it.state + '"><header class="card-h">' + tile(it.state, it.state === 'ok' ? 'None reported' : null) + '<h3>Symptoms here</h3></header><p class="reason">' + esc(it.reason) + '</p>';
        if (it.entries) { h += '<ul class="support">' + it.entries.map(function (e) { return '<li>' + esc(symLabel(e)) + '</li>'; }).join('') + '</ul>'; }
        h += '<p class="links"><a href="#checkin">Report a symptom</a></p></article>';
      } else { h += (it.state === 'ok' || it.state === 'calibrating' || it.state === 'nodata') ? '<ul class="srows">' + statusRow(it) + '</ul>' : statusCard(it, reg.patterns.length ? res : null); }
    });
    return h;
  };
  function symLabel(e) {
    var d = symById[e.symptomId];
    return (d ? d.label : (e.note || 'Other symptom')) + (e.severity ? ' (' + ['', 'mild', 'moderate', 'severe'][e.severity] + ')' : '');
  }

  /* ----- Daily check-in ----- */
  function lastValue(key, beforeDay) {
    var s = E.seriesFor(mine(state.readings), cur().id, key);
    for (var i = s.length - 1; i >= 0; i--) { if (s[i].day < beforeDay) { return s[i]; } }
    return null;
  }
  function newForm() {
    var day = today(), me = cur(), f = { day: day, values: {}, touched: {}, quality: '', ctx: { rested: true, postExercise: false, caffeine: false }, symMode: null, symptoms: [], openRegion: null, startedAt: Date.now() };
    C.indicators.forEach(function (d) { d.parts.forEach(function (p) {
      var todayR = state.readings.filter(function (r) { return r.crewId === me.id && r.day === day && r.indicator === p.key; }).pop();
      f.values[p.key] = todayR ? String(todayR.value) : '';
      if (todayR && p.slider) { f.touched[p.key] = true; }
      if (todayR && p.key === 'sleep' && todayR.context && todayR.context.quality) { f.quality = todayR.context.quality; }
    }); });
    var todays = state.symptoms.filter(function (s) { return s.crewId === me.id && s.day === day; });
    var real = todays.filter(function (s) { return s.symptomId !== 'none'; });
    if (real.length) { f.symMode = 'some'; f.symptoms = real.map(function (s) { return { symptomId: s.symptomId, region: s.region, severity: s.severity || 1, note: s.note || '' }; }); }
    else if (todays.length) { f.symMode = 'none'; }
    return f;
  }
  function numField(p, hintText) {
    var f = ui.form, v = f.values[p.key];
    return '<div class="field"><label for="in-' + p.key + '">' + esc(p.label) + '</label><div class="stepper">' +
      '<button type="button" class="stepbtn" data-act="step" data-key="' + p.key + '" data-dir="-1" aria-label="Lower ' + esc(p.label) + '">−</button>' +
      '<input id="in-' + p.key + '" data-key="' + p.key + '" type="number" inputmode="decimal" min="' + p.min + '" max="' + p.max + '" step="' + p.step + '" value="' + esc(v) + '" autocomplete="off">' +
      '<button type="button" class="stepbtn" data-act="step" data-key="' + p.key + '" data-dir="1" aria-label="Raise ' + esc(p.label) + '">+</button></div>' +
      (hintText ? '<p class="hint">' + esc(hintText) + '</p>' : '') + '</div>';
  }
  function lastHint(def) {
    var parts = def.parts.map(function (p) { var l = lastValue(p.key, ui.form.day); return l ? { v: E.fmt(p.key, l.value), day: l.day } : null; });
    if (parts.some(function (x) { return !x; })) { return ''; }
    return 'Last entry, mission day ' + parts[0].day + ': ' + parts.map(function (x) { return x.v; }).join('/') + ' ' + def.unit;
  }
  function symptomBox() {
    var f = ui.form, h = '';
    h += '<div class="seg" role="group" aria-label="Symptoms today">' +
      '<button type="button" data-act="sym-mode" data-mode="none" aria-pressed="' + (f.symMode === 'none') + '">No symptoms today</button>' +
      '<button type="button" data-act="sym-mode" data-mode="some" aria-pressed="' + (f.symMode === 'some') + '">I have a symptom</button></div>';
    if (f.symMode === 'some') {
      h += '<p class="hint">Choose the part of the body, then the symptom.</p><div class="chips">' + C.regions.map(function (r) {
        return '<button type="button" class="chipbtn" data-act="sym-region" data-id="' + r.id + '" aria-pressed="' + (f.openRegion === r.id) + '">' + esc(r.short) + '</button>';
      }).join('') + '</div>';
      if (f.openRegion) {
        var chosen = {}; f.symptoms.forEach(function (s) { chosen[s.symptomId] = 1; });
        h += '<div class="chips chips--sub">' + C.symptoms.filter(function (s) { return s.region === f.openRegion; }).map(function (s) {
          return '<button type="button" class="chipbtn" data-act="sym-toggle" data-id="' + s.id + '" aria-pressed="' + (!!chosen[s.id]) + '">' + esc(s.label) + '</button>';
        }).join('') + '</div>';
      }
      if (f.symptoms.length) {
        h += '<ul class="symlist">' + f.symptoms.map(function (s, i) {
          return '<li><span class="symname">' + esc(symById[s.symptomId] ? symById[s.symptomId].label : s.symptomId) + '</span><span class="seg seg--small" role="group" aria-label="How bad">' +
            [1, 2, 3].map(function (n) { return '<button type="button" data-act="sym-sev" data-i="' + i + '" data-n="' + n + '" aria-pressed="' + (s.severity === n) + '">' + ['', 'Mild', 'Moderate', 'Severe'][n] + '</button>'; }).join('') +
            '</span><button type="button" class="linkbtn" data-act="sym-remove" data-i="' + i + '">Remove</button></li>';
        }).join('') + '</ul>';
      }
    }
    return h;
  }
  screens.checkin = function () {
    if (!ui.form || ui.form.day !== today() || ui.form.crewId !== cur().id) { ui.form = newForm(); ui.form.crewId = cur().id; ui.formError = ''; }
    var f = ui.form, bp = indById.bp, hr = indById.hr, temp = indById.temp, sleep = indById.sleep, mood = indById.mood;
    var h = '<h1>Today\'s check</h1><p class="lede">Mission day ' + f.day + '. Aim for 2 minutes. <span class="timer" id="ci-timer" aria-live="off">0:00</span></p>';
    h += '<form id="checkin" novalidate>';
    h += '<fieldset class="card"><legend>' + esc(bp.label) + ' <span class="unit">' + esc(bp.unit) + '</span></legend><p class="how">' + esc(bp.howTo) + '</p><div class="pair">' + numField(bp.parts[0]) + numField(bp.parts[1]) + '</div><p class="hint">' + esc(lastHint(bp)) + '</p></fieldset>';
    h += '<fieldset class="card"><legend>' + esc(hr.label) + ' <span class="unit">' + esc(hr.unit) + '</span></legend><p class="how">' + esc(hr.howTo) + '</p>' + numField(hr.parts[0], lastHint(hr)) + '</fieldset>';
    h += '<fieldset class="card"><legend>' + esc(temp.label) + ' <span class="unit">' + esc(temp.unit) + '</span></legend><p class="how">' + esc(temp.howTo) + '</p>' + numField(temp.parts[0], lastHint(temp)) + '</fieldset>';
    h += '<fieldset class="card"><legend>How you measured</legend><div class="checks">' +
      [['rested', 'I rested for 5 minutes first'], ['postExercise', 'I had just exercised'], ['caffeine', 'I had caffeine in the last hour']].map(function (c) {
        return '<label class="tick"><input type="checkbox" id="cx-' + c[0] + '" data-ctx="' + c[0] + '"' + (f.ctx[c[0]] ? ' checked' : '') + '><span>' + c[1] + '</span></label>';
      }).join('') + '</div></fieldset>';
    h += '<fieldset class="card"><legend>' + esc(sleep.label) + ' <span class="unit">hours</span></legend><p class="how">' + esc(sleep.howTo) + '</p>' + numField(sleep.parts[0], lastHint(sleep)) +
      '<div class="seg seg--small" role="group" aria-label="Sleep quality">' + ['Poor', 'Fair', 'Good'].map(function (q) {
        return '<button type="button" data-act="quality" data-q="' + q + '" aria-pressed="' + (f.quality === q) + '">' + q + '</button>';
      }).join('') + '</div></fieldset>';
    h += '<fieldset class="card"><legend>' + esc(mood.label) + '</legend><p class="how">' + esc(mood.howTo) + '</p>' + mood.parts.map(function (p) {
      var set = !!f.touched[p.key];
      return '<div class="field"><label for="in-' + p.key + '">' + esc(p.label) + ' <output id="out-' + p.key + '" for="in-' + p.key + '">' + (set ? esc(f.values[p.key]) : 'Not set') + '</output></label>' +
        '<input class="slider" id="in-' + p.key + '" data-key="' + p.key + '" data-slider="1" type="range" min="' + p.min + '" max="' + p.max + '" step="1" value="' + (set ? esc(f.values[p.key]) : p.start) + '">' +
        '<div class="ends"><span>' + esc(p.lowLabel) + '</span><span>' + esc(p.highLabel) + '</span></div></div>';
    }).join('') + '<p class="note">' + esc(mood.scaleNote || '') + '</p></fieldset>';
    h += '<fieldset class="card"><legend>Symptoms</legend><p class="how">' + esc(indById.symptoms.howTo) + '</p><div id="sym-box">' + symptomBox() + '</div></fieldset>';
    h += '<details class="card extra"><summary>Add a reading taken for a reason</summary>' +
      [indById.spo2, indById.glucose].map(function (d) { return '<div class="extra-item"><p class="how"><strong>' + esc(d.label) + '</strong> <span class="unit">' + esc(d.unit) + '</span>. ' + esc(d.howTo) + '</p>' + numField(d.parts[0], lastHint(d)) + '</div>'; }).join('') + '</details>';
    h += '<p class="error" id="ci-error" role="alert">' + esc(ui.formError) + '</p>';
    h += '<div class="row row--sticky"><button type="button" class="btn btn--primary" data-act="save-check">Save today\'s check</button><span class="hint">Empty readings are saved as No data.</span></div></form>';
    return h;
  };
  function saveCheck() {
    var f = ui.form, me = cur(), day = f.day, nowIso = new Date().toISOString(), vals = {}, bad = [];
    Object.keys(f.values).forEach(function (k) {
      var raw = String(f.values[k]).trim();
      var isSlider = k === 'mood' || k === 'stress';
      if (isSlider && !f.touched[k]) { return; }
      if (raw === '') { return; }
      var n = Number(raw.replace(',', '.'));
      if (!isFinite(n)) { bad.push(k); return; }
      vals[k] = n;
    });
    if (bad.length) { ui.formError = 'One entry is not a number. Check it and save again.'; setError(); return; }
    if ((vals.bp_sys === undefined) !== (vals.bp_dia === undefined)) { ui.formError = 'Enter both blood pressure numbers, or leave both empty.'; setError(); return; }
    var ctx = { rested: !!f.ctx.rested, postExercise: !!f.ctx.postExercise, caffeine: !!f.ctx.caffeine, device: 'standard' };
    Object.keys(vals).forEach(function (k) {
      state.readings = state.readings.filter(function (r) { return !(r.crewId === me.id && r.day === day && r.indicator === k); });
      var c = (k === 'sleep') ? { quality: f.quality || '' } : (k === 'mood' || k === 'stress') ? {} : ctx;
      state.readings.push({ id: uid('r'), crewId: me.id, day: day, ts: nowIso, indicator: k, value: vals[k], context: c, source: 'manual' });
    });
    if (f.symMode === 'none' || (f.symMode === 'some' && f.symptoms.length)) {
      state.symptoms = state.symptoms.filter(function (s) { return !(s.crewId === me.id && s.day === day); });
      if (f.symMode === 'none') { state.symptoms.push({ id: uid('s'), crewId: me.id, day: day, ts: nowIso, symptomId: 'none', region: 'all', severity: 0, note: '', source: 'manual' }); }
      else { f.symptoms.forEach(function (s) { state.symptoms.push({ id: uid('s'), crewId: me.id, day: day, ts: nowIso, symptomId: s.symptomId, region: s.region, severity: s.severity, note: s.note || '', source: 'manual' }); }); }
    }
    var res = E.evaluate(ctxFor(day), C);
    if (!res.dailyMissing.length) {
      state.checks = state.checks.filter(function (c) { return !(c.crewId === me.id && c.day === day); });
      state.checks.push({ crewId: me.id, day: day, ts: nowIso, seconds: Math.round((Date.now() - f.startedAt) / 1000) });
    }
    persist(); ui.form = null; ui.formError = '';
    go('results');
  }
  function setError() { var e = document.getElementById('ci-error'); if (e) { e.textContent = ui.formError; e.scrollIntoView({ block: 'center' }); } }

  /* ----- Trends ----- */
  var TREND_IDS = ['sleep', 'bp', 'hr', 'temp', 'mood', 'rt', 'spo2', 'glucose'];
  screens.trends = function (res) {
    var first = res.flagged.filter(function (f) { return f.kind === 'indicator' && TREND_IDS.indexOf(f.id) !== -1; })[0];
    ui.param = first ? first.id : 'sleep';
    return screens.trend(res);
  };
  screens.trend = function (res) {
    var id = TREND_IDS.indexOf(ui.param) !== -1 ? ui.param : 'sleep', def = indById[id], st = res.indicators[id];
    var h = '<h1>Trends</h1><div class="chips" role="group" aria-label="Choose a reading">' + TREND_IDS.map(function (t) {
      return '<a class="chipbtn" href="#trend-' + t + '"' + (t === id ? ' aria-current="true"' : '') + '>' + esc(indById[t].label) + '</a>';
    }).join('') + '</div>';
    h += '<div class="seg seg--small" role="group" aria-label="Period">' + [[14, '14 days'], [30, '30 days'], [0, 'Whole mission']].map(function (s) {
      return '<button type="button" data-act="span" data-n="' + s[0] + '" aria-pressed="' + (ui.trendSpan === s[0]) + '">' + s[1] + '</button>';
    }).join('') + '</div>';
    h += '<section class="card"><header class="card-h">' + tile(st.state) + '<h2>' + esc(def.label) + '</h2>' + (st.valueText ? '<span class="val">' + esc(st.valueText) + '</span>' : '') + '</header><p class="reason">' + esc(st.reason) + '</p>';
    if (id === 'rt') { h += '<h3 class="chart-t">Median reaction time <span class="unit">ms, lower is faster</span></h3><div class="chart" data-chart="rt"></div>'; }
    else { def.parts.forEach(function (p) { h += '<h3 class="chart-t">' + esc(def.parts.length > 1 ? p.label : def.label) + ' <span class="unit">' + esc(def.unit) + '</span></h3><div class="chart" data-chart="' + p.key + '"></div>'; }); }
    h += '<ul class="legend"><li><span class="key key--line"></span>Your readings</li>' + (id === 'rt' || id === 'spo2' || id === 'glucose' ? '' : '<li><span class="key key--band"></span>Your usual range</li>') +
      '<li><span class="key key--watch"></span>Watch</li><li><span class="key key--act"></span>Act now</li><li><span class="key key--check"></span>Re-check</li></ul>';
    h += '<details class="tablev"><summary>Show as a table</summary><div class="tablewrap" id="trend-table"></div></details></section>';
    h += '<p class="links"><a href="#learn-' + id + '">Learn about this check</a></p>';
    return h;
  };
  function trendData(key) {
    var day = today(), from = ui.trendSpan ? Math.max(1, day - ui.trendSpan + 1) : 1, me = cur();
    if (key === 'rt') {
      var tests = E.reactionTests(ctxFor(day)).filter(function (t) { return t.day >= from; });
      return { from: from, to: day, unit: 'ms', title: 'Median reaction time', label: 'Median reaction time', band: [], allMarkers: true, fmt: function (v) { return String(Math.round(v)); },
        points: tests.map(function (t) { var s = E.evalReaction(ctxFor(t.day)); return { day: t.day, value: t.metrics.medianRt, state: s.state, word: E.STATES[s.state] ? E.STATES[s.state].word : '' }; }) };
    }
    var readings = mine(state.readings);
    var series = E.seriesFor(readings, me.id, key).filter(function (p) { return p.day >= from && p.day <= day; });
    var def = C.indicators.filter(function (d) { return d.parts.some(function (p) { return p.key === key; }); })[0];
    var expected = def.schedule === 'daily';
    var partLabel = def.parts.length > 1 ? def.parts.filter(function (p) { return p.key === key; })[0].label : def.label;
    return { from: from, to: day, unit: E.unitOf(key, ix), title: def.label, label: partLabel, allMarkers: !expected,
      fmt: function (v) { return E.fmt(key, v); }, fmtBand: function (v) { return E.fmtBand(key, v); },
      band: E.bandSeries(readings, me.id, key, from, day, ix, state.mission.phaseStartDay || 1),
      points: series.map(function (p) { var s = E.evalKey(key, ctxFor(p.day), expected); return { day: p.day, value: p.value, state: s.state, word: E.STATES[s.state].word }; }) };
  }
  function mountCharts() {
    var nodes = app.querySelectorAll('.chart[data-chart]'), rows = [];
    Array.prototype.forEach.call(nodes, function (n) {
      var key = n.getAttribute('data-chart'), d = trendData(key);
      Charts.render(n, { title: d.title, unit: d.unit, points: d.points, band: d.band, fromDay: d.from, toDay: d.to, fmt: d.fmt, fmtBand: d.fmtBand, allMarkers: d.allMarkers, empty: 'No readings in this period.' });
      d.points.forEach(function (p) { rows.push({ day: p.day, key: d.label, value: d.fmt(p.value) + ' ' + d.unit, word: p.word }); });
    });
    var tw = document.getElementById('trend-table');
    if (tw) {
      rows.sort(function (a, b) { return b.day - a.day || (a.key < b.key ? -1 : 1); });
      var t = document.createElement('table'); t.className = 'tbl';
      t.innerHTML = '<thead><tr><th scope="col">Mission day</th><th scope="col">Reading</th><th scope="col">Value</th><th scope="col">Status</th></tr></thead>';
      var tb = document.createElement('tbody');
      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        [r.day, r.key, r.value, r.word].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
        tb.appendChild(tr);
      });
      t.appendChild(tb); tw.appendChild(t);
    }
  }

  /* ----- Spacewalk readiness ----- */
  screens.readiness = function (res) {
    var rd = res.readiness, me = cur();
    var lvl = { act: 'act', caution: 'watch', incomplete: 'nodata', clear: 'ok' }[rd.level];
    var when = rd.evaInDays === null || rd.evaInDays < 0 ? 'No spacewalk is planned for ' + me.name + '.' :
      'A spacewalk is planned ' + (rd.evaInDays === 0 ? 'today' : rd.evaInDays === 1 ? 'tomorrow' : 'in ' + rd.evaInDays + ' days') + ', on mission day ' + me.evaDay + '.';
    var h = '<h1>Spacewalk readiness</h1><p class="lede">' + esc(when) + '</p>';
    h += '<section class="annun annun--' + lvl + '"><div class="annun-state">' + tile(lvl, { act: 'Act now', caution: 'Caution', incomplete: 'Incomplete', clear: 'No flags' }[rd.level]) + '</div><p class="annun-title">' + esc(rd.headline) + '</p><p class="annun-sub">' + esc(rd.note) + '</p></section>';
    h += '<section class="card"><h2>What the summary is built from</h2><ul class="inputs">' + rd.inputs.map(function (i) {
      return '<li>' + tile(i.state) + '<div><p class="in-name">' + esc(i.label) + (i.valueText ? ': ' + esc(i.valueText) : '') + '</p>' + (i.state === 'ok' || i.state === 'calibrating' ? '' : '<p class="reason">' + esc(i.reason) + '</p>') + '</div></li>';
    }).join('') + '</ul></section>';
    if (rd.acts.length) { h += '<section class="card card--act"><h2>Act-now items</h2><ul class="support">' + rd.acts.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section>'; }
    if (rd.cautions.length) { h += '<section class="card card--watch"><h2>Caution flags</h2><ul class="support">' + rd.cautions.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section>'; }
    if (rd.missing.length) { h += '<section class="card card--nodata"><h2>Missing inputs</h2><ul class="support">' + rd.missing.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section>'; }
    h += '<section class="card"><h2>Who decides</h2><p>The flight surgeon decides. Crewcial only prepares the summary.</p>' + more('<p>The flight surgeon on the ground judges readiness for a spacewalk from recent medical, fitness and performance data.</p>' + sourceList(['nasa-3001-medops'])) + '</section>';
    h += '<div class="row"><a class="btn btn--primary" href="#report">Send this summary to the flight surgeon</a><a class="btn" href="#reaction">Run the reaction test</a></div>';
    return h;
  };

  /* ----- Reports (SBAR) ----- */
  function newReport(res) {
    var c = ctxFor(), s = E.buildSbar(res, c, C, cur());
    var behavioural = res.flagged.length > 0 && res.flagged.every(function (f) { return f.id === 'mood' || f.state === 'check'; }) && res.flagged.some(function (f) { return f.id === 'mood' && f.state === 'watch'; });
    return { day: res.day, crewId: cur().id, S: s.S, B: s.B, A: s.A, R: s.R, tier: s.tier, route: E.suggestRoute(s.tier, behavioural, res.flagged, ix), approved: false };
  }
  screens.report = function (res) {
    if (!ui.report || ui.report.day !== res.day || ui.report.crewId !== cur().id) { ui.report = newReport(res); }
    var r = ui.report, env = E.route(r.tier || 2, state.mission.environment, ix), aud = E.audience(r.route === 'urgent' ? 1 : 2);
    var h = '<p class="crumb"><a href="#reports">Reports</a></p><h1>New report</h1><p class="lede">Crewcial has filled in the four parts. Read them, change anything, then approve.</p>';
    h += '<form id="report" novalidate>';
    [['S', 'Situation'], ['B', 'Background'], ['A', 'Assessment'], ['R', 'Request']].forEach(function (p) {
      h += '<div class="field"><label for="rp-' + p[0] + '">' + p[1] + '</label><textarea id="rp-' + p[0] + '" data-rp="' + p[0] + '" rows="' + (p[0] === 'B' ? 6 : 3) + '">' + esc(r[p[0]]) + '</textarea></div>';
    });
    h += '<fieldset class="card"><legend>Route</legend>' + [['pmc', 'Queue for my next private medical conference'], ['urgent', 'Send now as urgent'], ['ppc', 'Queue for my private psychological conference']].map(function (o) {
      return '<label class="tick"><input type="radio" name="rp-route" value="' + o[0] + '" data-rp-route="1"' + (r.route === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
    }).join('') + '<p class="hint" id="rp-aud">' + esc(audienceText(r.route)) + '</p></fieldset>';
    h += '<section class="card"><h2>Link to the ground</h2><p>' + esc(env.link) + '</p><p>' + esc(env.evac) + '</p>' + sourceList(ix.env[state.mission.environment].sourceIds) + '</section>';
    h += '<label class="tick tick--approve"><input type="checkbox" id="rp-approve" data-rp-approve="1"' + (r.approved ? ' checked' : '') + '><span>I have read this report and I approve sending it.</span></label>';
    h += '<p class="error" id="rp-error" role="alert"></p>';
    h += '<div class="row"><button type="button" class="btn btn--primary" data-act="send-report">Send or queue the report</button><button type="button" class="btn btn--quiet" data-act="reset-report">Start again from today\'s data</button></div><p class="hint">Simulated link. Nothing leaves this device.</p></form>';
    void aud;
    return h;
  };
  function audienceText(route) {
    if (route === 'urgent') { return 'Seen by you, the crew medical officer and the flight surgeon. Not by other crewmates or the wider control team.'; }
    if (route === 'ppc') { return 'Seen by you and the behavioural health team only.'; }
    return 'Seen by you and the flight surgeon only. Not by the crew medical officer, other crewmates or the wider control team.';
  }
  function sendReport() {
    var r = ui.report, err = document.getElementById('rp-error');
    if (!r.approved) { if (err) { err.textContent = 'Tick the box to approve the report before sending it.'; } return; }
    var env = ix.env[state.mission.environment], now = Date.now();
    var scale = state.settings.demoSpeed ? 1000 : 60000;
    var rep = { id: uid('p'), crewId: r.crewId, day: r.day, ts: new Date(now).toISOString(), route: r.route, environment: state.mission.environment, oneWayDelayMin: env.oneWayDelayMin,
                approved: true, sbar: { S: r.S, B: r.B, A: r.A, R: r.R }, status: r.route === 'urgent' ? 'sent' : 'queued', source: 'manual' };
    if (r.route === 'urgent' && typeof env.oneWayDelayMin === 'number') { rep.sentAt = now; rep.arriveAt = now + env.oneWayDelayMin * scale; rep.replyAt = now + env.oneWayDelayMin * 2 * scale; rep.scale = scale; }
    state.reports.push(rep); persist(); ui.report = null;
    go('reports');
  }
  function reportStatus(rep) {
    if (rep.status === 'queued') { return rep.route === 'ppc' ? 'Queued for the private psychological conference' : 'Queued for the next private medical conference'; }
    if (!rep.arriveAt) { return rep.route === 'urgent' ? 'Sent on the link to the ground' : 'Sent at the private medical conference'; }
    var now = Date.now(), k = 60000 / rep.scale;
    if (now < rep.arriveAt) { return 'On its way to Earth. Arrives in ' + mmss((rep.arriveAt - now) * k); }
    if (now < rep.replyAt) { return 'Delivered to Earth. Earliest possible reply in ' + mmss((rep.replyAt - now) * k); }
    return 'Delivered. A reply could arrive from now on';
  }
  screens.reports = function () {
    var list = mine(state.reports).slice().sort(function (a, b) { return String(b.ts) < String(a.ts) ? -1 : 1; });
    var h = '<h1>Reports</h1><p class="lede">Reports are private. You approve each one before it is sent.</p><div class="row"><a class="btn btn--primary" href="#report">Write a report</a></div>';
    if (!list.length) { return h + '<p class="empty">No reports yet. A report gathers today\'s flags into four short parts for the flight surgeon.</p>'; }
    h += list.map(function (rep) {
      var live = rep.arriveAt && Date.now() < rep.replyAt;
      return '<article class="card report" id="rep-' + esc(rep.id) + '"><header class="card-h"><h2>Mission day ' + rep.day + '</h2><span class="val">' + esc({ pmc: 'Private medical conference', urgent: 'Urgent', ppc: 'Private psychological conference' }[rep.route]) + '</span></header>' +
        '<p class="repstat" data-rep="' + esc(rep.id) + '"' + (live ? ' data-live="1"' : '') + '>' + esc(reportStatus(rep)) + '</p>' +
        (rep.arriveAt && state.settings.demoSpeed && rep.scale === 1000 ? '<p class="hint">Demo speed: 1 second on screen is 1 minute of mission time.</p>' : '') +
        '<details><summary>Read the report</summary><dl class="sbar"><dt>Situation</dt><dd>' + esc(rep.sbar.S) + '</dd><dt>Background</dt><dd>' + esc(rep.sbar.B) + '</dd><dt>Assessment</dt><dd>' + esc(rep.sbar.A) + '</dd><dt>Request</dt><dd>' + esc(rep.sbar.R) + '</dd></dl>' +
        '<button type="button" class="btn btn--quiet" data-act="copy-report" data-id="' + esc(rep.id) + '">Copy the text</button></details></article>';
    }).join('');
    return h + '<p class="hint">Simulated link. Nothing leaves this device.</p>';
  };

  /* ----- Tests ----- */
  /* Asked just before the test: 0 tired to 10 alert (scale in data/rules.js, RT-PROTO). */
  function alertQuestion() {
    var sc = ix.rtProto.alertness, btns = '';
    for (var i = sc.min; i <= sc.max; i++) {
      btns += '<button type="button" data-act="alert" data-n="' + i + '" aria-pressed="' + (ui.alertness === i) + '" aria-label="' + i + (i === sc.min ? ', ' + sc.lowLabel : i === sc.max ? ', ' + sc.highLabel : '') + '">' + i + '</button>';
    }
    return '<section class="card" id="rt-alert"><h2>How alert do you feel right now?</h2>' +
      '<div class="scale11" role="group" aria-label="Alertness from ' + sc.min + ' (' + esc(sc.lowLabel) + ') to ' + sc.max + ' (' + esc(sc.highLabel) + ')">' + btns + '</div>' +
      '<p class="scale-ends"><span>' + sc.min + ' ' + esc(sc.lowLabel) + '</span><span>' + sc.max + ' ' + esc(sc.highLabel) + '</span></p>' +
      '<p class="hint" id="rt-alert-hint">' + (ui.alertness === null ? 'Answer first, then start the test.' : 'You chose ' + ui.alertness + '. Now start the test.') + '</p></section>';
  }
  screens.reaction = function (res) {
    var rt = res.indicators.rt, secs = state.settings.reactionSeconds, full = secs >= ix.rtProto.durationSec;
    var h = '<h1>Reaction test</h1><p class="lede">' + (rt.due ? 'Due because ' + esc(rt.dueWhy.join(' and ')) + '.' : 'Not due today. You can still run it.') + '</p>';
    h += '<details class="card howto"><summary>How it works' + (full ? '' : ' <span class="badge badge--placeholder">Demo length</span>') + '</summary>' + steps(['Use the same device every time.', 'Tap Start, then wait. A millisecond counter appears after 1 to 4 seconds.', 'Tap as fast as you can each time the counter appears.', 'Keep going until the test ends.']) +
      (full ? '' : '<p class="ph">' + secs + ' seconds instead of 3 minutes. A demo-length result is not valid.</p>') + sourceList(ix.rtProto.sourceIds) + '</details>';
    h += alertQuestion();
    h += '<div id="rt-root"></div>';
    if (rt.test) { h += '<h2>Latest result</h2>' + statusCard(rt); }
    h += '<p class="links"><a href="#trend-rt">See the trend</a><a href="#setup">Change the test length</a></p>';
    return h;
  };
  screens.amsler = function (res) {
    var am = res.indicators.amsler, me = cur(), n = ix.amProto.gridN;
    var h = '<h1>Amsler grid</h1><p class="lede">' + (am.due ? 'Due because ' + esc(am.dueWhy.join(' and ')) + '.' : 'Not due today. You can still run it.') + '</p>';
    h += '<div id="am-root"></div>';
    var eyes = Object.keys(am.eyes);
    if (eyes.length) {
      h += '<h2>Latest maps</h2><div class="maps">' + ['R', 'L'].filter(function (e) { return am.eyes[e]; }).map(function (e) {
        var x = am.eyes[e];
        return '<figure class="map">' + CW.Amsler.gridSvg(n, x.cells, x.newCells, false) + '<figcaption>' + (e === 'R' ? 'Right eye' : 'Left eye') + ', mission day ' + x.day + '. ' +
          (x.cells.length ? plural(x.cells.length, 'marked square') + (x.newCells.length ? ', ' + x.newCells.length + ' new' : ', none new') + '.' : 'No distortion marked.') + '</figcaption></figure>';
      }).join('') + '</div>' + statusCard(am);
    }
    h += '<details class="card howto"><summary>About this test</summary><p>' + esc(ix.amProto.note) + '</p>' + sourceList(ix.amProto.sourceIds) + '</details>';
    void me;
    return h;
  };

  /* ----- CMO checklists ----- */
  screens.cmo = function (res) {
    var id = C.cmoChecklists[ui.param] ? ui.param : (res.patterns[0] ? res.patterns[0].id : 'generic');
    var cl = C.cmoChecklists[id];
    var h = '<h1>Crew medical officer checklist</h1><p class="lede">For the crew medical officer, who may not be a physician.</p>';
    h += sourceList(['nasa-cmo-2024', 'nasa-cmo-2021', 'jaxa-medops']);
    h += '<div class="chips" role="group" aria-label="Choose a checklist">' + Object.keys(C.cmoChecklists).map(function (k) {
      return '<a class="chipbtn" href="#cmo-' + k + '"' + (k === id ? ' aria-current="true"' : '') + '>' + esc(C.cmoChecklists[k].title) + '</a>';
    }).join('') + '</div>';
    h += '<section class="card"><h2>' + esc(cl.title) + '</h2>' + (SIGNED ? '<p class="note">' + esc(C.cmoNote) + '</p>' : '<p class="ph"><span class="badge badge--placeholder">Draft</span> Process steps only; clinical steps await the physician.</p>') + '<ul class="todo">' + cl.steps.map(function (s, i) {
      var key = id + ':' + i;
      return '<li><label class="tick"><input type="checkbox" data-cmo="' + key + '"' + (ui.cmoDone[key] ? ' checked' : '') + '><span>' + esc(s) + '</span></label></li>';
    }).join('') + '</ul><p class="note">' + esc(C.app.medication) + '</p></section>';
    h += '<div class="row"><a class="btn btn--primary" href="#report">Write the report</a><a class="btn" href="#results">Back to today\'s results</a></div>';
    return h;
  };

  /* ----- Learn ----- */
  screens.learn = function () {
    var def = indById[ui.param];
    if (!def) {
      return '<h1>Learn</h1><p class="lede">Each check answers the same five questions.</p><ul class="menu">' + C.indicators.map(function (d) {
        return '<li><a href="#learn-' + d.id + '"><span>' + esc(d.label) + '</span><span class="note">' + esc({ daily: 'Every day', indicated: 'Only when there is a reason', scheduled: 'On a schedule' }[d.schedule]) + '</span></a></li>';
      }).join('') + '</ul><section class="card"><h2>The five hazards of human spaceflight</h2><ul class="support">' + C.hazards.map(function (z) { return '<li>' + esc(z.name) + '</li>'; }).join('') + '</ul>' + sourceList(['nasa-hrp-hazards']) + '</section>';
    }
    var h = '<p class="crumb"><a href="#learn">Learn</a></p><h1>' + esc(def.label) + '</h1><p class="lede">' + esc(def.howTo) + '</p>';
    if (!SIGNED) { h += '<p class="ph"><span class="badge badge--placeholder">Draft</span> Awaiting the physician\'s review.</p>'; }
    ['q1', 'q2', 'q3', 'q4', 'q5'].forEach(function (q) {
      var a = def.learn[q];
      if (!a || !a.text) { return; } /* 0.6.1: no checked source yet, so the question is hidden */
      h += '<details class="card qa"><summary>' + esc(C.learnQuestions[q]) + '</summary><p>' + esc((q === 'q5' && !SIGNED ? 'Draft: ' : '') + a.text) + '</p>' + sourceList(a.sourceIds) + '</details>';
    });
    return h;
  };

  /* ----- Rules and sources ----- */
  screens.rules = function () {
    var groups = [['pattern', 'Combined patterns'], ['absolute', 'Act-now and urgent limits'], ['redflag', 'Red-flag symptoms'], ['baseline', 'Change from your own range'], ['baseline-tests', 'Reaction test'], ['baseline-alert', 'How you feel versus how you perform'],
                  ['amsler', 'Amsler grid'], ['symptom', 'Other symptoms'], ['reference', 'Reference ranges'], ['plausibility', 'Entry checks'], ['baseline-config', 'How your range is worked out'],
                  ['schedule', 'When tests are due'], ['protocol', 'Test protocols'], ['context', 'Measurement conditions']];
    var h = '<h1>Rules and sources</h1><p class="lede">Every colour in Crewcial comes from a rule listed here.</p>';
    h += '<section class="annun annun--' + (RELEASE.ready ? 'ok' : 'nodata') + '"><div class="annun-state">' + tile(RELEASE.ready ? 'ok' : 'nodata', RELEASE.ready ? 'Ready' : 'Not ready for release') + '</div>' +
      (RELEASE.ready
        ? '<p class="annun-title">All ' + RELEASE.total + ' rules are sourced and signed off</p><p class="annun-sub">Signed by the team\'s physician. Rules version ' + esc(RULES.version) + ', ' + esc(niceDate(RULES.updated)) + '.</p></section>'
        : '<p class="annun-title">' + RELEASE.placeholders.length + ' of ' + RELEASE.total + ' rules are placeholders</p><p class="annun-sub">' + RELEASE.unsigned.length + ' more are sourced and await sign-off. Rules version ' + esc(RULES.version) + ', ' + esc(niceDate(RULES.updated)) + '.</p></section>');
    groups.forEach(function (g) {
      var rs = ix.all.filter(function (r) { return r.type === g[0]; });
      if (!rs.length) { return; }
      h += '<h2>' + g[1] + '</h2><ul class="rules">' + rs.map(function (r) {
        return '<li class="rule" id="rule-' + esc(r.id) + '"><p class="rule-h"><code>' + esc(r.id) + '</code> ' + ruleBadge(r) + (r.title ? ' <strong>' + esc(r.title) + '</strong>' : (r.target && r.target !== 'pattern' ? ' <span class="ver">' + esc(r.symptomId ? (symById[r.symptomId] || {}).label : r.target.replace('_', ' ')) + '</span>' : '')) + '</p>' +
          '<p>' + esc(E.describeRule(r, ix)) + '</p>' + ruleMore(r) + '</li>';
      }).join('') + '</ul>';
    });
    if (ix.disabled && ix.disabled.length) {
      h += '<h2>Switched off</h2><ul class="rules rules--off">' + ix.disabled.map(function (r) {
        return '<li class="rule-off" id="rule-' + esc(r.id) + '"><p class="rule-h"><code>' + esc(r.id) + '</code> ' + ruleBadge(r) + (r.title ? ' <strong>' + esc(r.title) + '</strong>' : '') + '</p>' + ruleMore(r) + '</li>';
      }).join('') + '</ul>';
    }
    h += '<h2>Sources</h2><details class="card srcall"><summary>All ' + SOURCES.length + ' sources</summary><ol class="sources">' + SOURCES.map(function (s) {
      return '<li id="src-' + esc(s.id) + '"><span class="kind">' + esc(s.kind) + '</span> ' + esc(s.citation) + (s.url ? ' <a href="' + esc(s.url) + '">Open the source</a>' : '') + (s.url ? ' <span class="note">Accessed ' + esc(niceDate(s.accessed)) + '.</span>' : '') + '</li>';
    }).join('') + '</ol></details>';
    return h;
  };

  /* ----- Setup, About, More ----- */
  screens.setup = function () {
    var me = cur(), m = state.mission, s = state.settings;
    var h = '<h1>Setup</h1>';
    if (ui.notice) { h += '<p class="banner banner--ok" role="status">' + esc(ui.notice) + '</p>'; }
    if (!Store.persistent) { h += '<p class="banner banner--proto">This browser is not saving data. It will be lost when you close the page.</p>'; }
    h += '<section class="card"><h2>Where the crew is</h2>' + Object.keys(ix.env).map(function (k) {
      var e = ix.env[k];
      return '<label class="tick tick--block"><input type="radio" name="env" value="' + k + '" data-chg="env"' + (m.environment === k ? ' checked' : '') + '><span><strong>' + esc(e.label) + '</strong><br>' + esc(e.link) + ' ' + esc(e.evac) + '</span></label>';
    }).join('') + sourceList(ix.env[m.environment].sourceIds) + '</section>';
    h += '<section class="card"><h2>Crew member</h2><div class="field"><label for="su-name">Name</label><input id="su-name" type="text" data-chg="crew-name" value="' + esc(me.name) + '" autocomplete="off"></div>' +
      '<div class="field"><label for="su-role">Role</label><input id="su-role" type="text" data-chg="crew-role" value="' + esc(me.role) + '" autocomplete="off"></div>' +
      '<div class="field" role="radiogroup" aria-labelledby="su-fig"><p class="flabel" id="su-fig">Figure on Home</p>' + [['f', 'Woman'], ['m', 'Man']].map(function (o) {
        return '<label class="tick"><input type="radio" name="figure" value="' + o[0] + '" data-chg="crew-figure"' + (lookOf(me).body === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
      }).join('') + '</div>' +
      '<div class="field"><label for="su-eva">Next spacewalk, as a mission day</label><input id="su-eva" type="number" inputmode="numeric" min="1" step="1" data-chg="crew-eva" value="' + esc(me.evaDay === null || me.evaDay === undefined ? '' : me.evaDay) + '"><p class="hint">Leave empty if none is planned. Today is mission day ' + today() + '.</p></div>' +
      '<div class="row"><button type="button" class="btn" data-act="add-crew">Add a crew member</button></div></section>';
    h += '<section class="card"><h2>Mission day</h2>' + (m.fixedDay ? '<p>The demo clock is held at mission day ' + m.fixedDay + ' so the story stays the same.</p><div class="row"><button type="button" class="btn" data-act="next-day">Move to the next day</button></div>'
      : '<p>Today is mission day ' + today() + '. The day advances by itself.</p>') + '</section>';
    h += '<section class="card"><h2>Mission phase</h2><p>Started on mission day ' + (m.phaseStartDay || 1) + '. A new phase, such as landing on Mars, restarts "Learning your normal" for the whole crew.</p>' +
      '<div class="row"><button type="button" class="btn" data-act="ask" data-what="phase">Start a new mission phase today</button></div></section>';
    var lim = (state.limits && state.limits[me.id]) || {};
    h += '<section class="card"><h2>Personal limits, set by the flight surgeon</h2><p>Only for ' + esc(me.name) + '. Leave empty for the standard limit.</p>' +
      ['A-HR-LO', 'A-BPS-LO'].map(function (id) {
        var r = ix.byId[id];
        if (!r || !r.personal) { return ''; }
        var name = id === 'A-HR-LO' ? 'Low heart rate, Act now at or below' : 'Low systolic blood pressure, Act now at or below';
        return '<div class="field"><label for="su-' + id + '">' + name + ' <span class="unit">' + esc(r.unit) + '</span></label><input id="su-' + id + '" type="number" inputmode="numeric" min="' + r.personal.min + '" max="' + r.personal.max + '" step="1" data-chg="limit" data-rule="' + id + '" value="' + esc(lim[id] === undefined ? '' : lim[id]) + '" placeholder="' + r.value + '">' +
          '<p class="hint">Standard ' + r.value + ' ' + esc(r.unit) + '. It can be set from ' + r.personal.min + ' to ' + r.personal.max + '.</p></div>';
      }).join('') + '</section>';
    h += '<section class="card"><h2>Reaction test length</h2>' + [[ix.rtProto.durationSec, '3 minutes. The valid test.'], [ix.rtProto.demoDurationSec, ix.rtProto.demoDurationSec + ' seconds. For demonstrations only.']].map(function (o) {
      return '<label class="tick"><input type="radio" name="rtlen" value="' + o[0] + '" data-chg="rtlen"' + (s.reactionSeconds === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
    }).join('') + '</section>';
    h += '<section class="card"><h2>Display</h2>' + [['auto', 'Match this device'], ['light', 'Light'], ['dark', 'Dark']].map(function (o) {
      return '<label class="tick"><input type="radio" name="theme" value="' + o[0] + '" data-chg="theme"' + (s.theme === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
    }).join('') + '<label class="tick"><input type="checkbox" data-chg="demospeed"' + (s.demoSpeed ? ' checked' : '') + '><span>Show message delays at demo speed: 1 second is 1 minute</span></label></section>';
    h += '<section class="card"><h2>Data on this device</h2><p>Everything stays in this browser. Nothing is sent anywhere.</p><div class="row">' +
      '<button type="button" class="btn" data-act="ask" data-what="demo">Load the demo mission</button><button type="button" class="btn" data-act="ask" data-what="empty">Start an empty mission</button>' +
      '<button type="button" class="btn" data-act="export">Export the data</button></div>';
    if (ui.confirm) {
      h += '<div class="confirm" role="alertdialog" aria-label="Confirm"><p>' + (ui.confirm === 'demo' ? 'Load the demo mission? This replaces everything stored on this device.' : ui.confirm === 'phase' ? 'Start a new mission phase today? Crewcial learns everyone\'s normal again for ' + ix.cfg.calibrationDays + ' days.' : 'Start an empty mission? This removes everything stored on this device.') + '</p><div class="row">' +
        '<button type="button" class="btn btn--danger" data-act="confirm-yes">Yes, replace the data</button><button type="button" class="btn" data-act="confirm-no">Keep the data</button></div></div>';
    }
    if (ui.exportOpen) {
      h += '<div class="field"><label for="su-export">Exported data</label><textarea id="su-export" rows="6" readonly></textarea><div class="row"><button type="button" class="btn" data-act="copy-export">Copy the text</button><a class="btn btn--quiet" id="su-download" download="crewcial-data.json" href="#setup">Download as a file</a></div></div>';
    }
    h += '<div class="field"><label for="su-import">Import data: paste exported text here</label><textarea id="su-import" rows="3"></textarea><p class="error" id="su-import-error" role="alert">' + esc(ui.importError) + '</p><div class="row"><button type="button" class="btn" data-act="import">Import the pasted text</button></div></div></section>';
    return h;
  };
  screens.about = function () {
    var a = C.app;
    var signed = RELEASE.total - RELEASE.placeholders.length - RELEASE.unsigned.length;
    var nTxt = RELEASE.ready ? String(RELEASE.total) : signed + ' of ' + RELEASE.total;
    return '<h1>About Crewcial</h1><p class="lede">' + esc(a.tagline) + '</p>' +
      (a.apart ? '<section class="card apart"><h2>What sets it apart</h2><p class="apart-lead">' + esc(a.positioning) + '</p><ul class="support">' + a.apart.map(function (x) {
        return '<li><strong>' + esc(x[0]) + ':</strong> ' + esc(x[1].replace('{n}', nTxt)) + '</li>';
      }).join('') + '</ul></section>' : '') +
      '<section class="card"><h2>What it is for</h2><p>' + esc(a.intendedUse) + '</p></section>' +
      '<section class="card"><h2>Who made it</h2><p>' + esc(a.team) + ', for the ' + esc(a.challenge) + '.</p><p class="note">Crewcial is a challenge entry. It is not affiliated with or endorsed by NASA or any space agency.</p></section>' +
      '<section class="card"><h2>How AI was used</h2><ul class="support">' + a.siDisclosure.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section>' +
      '<section class="card"><h2>Version</h2><p>App ' + esc(APP_VERSION) + '. Rules ' + esc(RULES.version) + ' of ' + esc(niceDate(RULES.updated)) + '. ' + SOURCES.length + ' sources.</p><p class="links"><a href="#rules">Rules and sources</a></p></section>';
  };
  screens.more = function () {
    return '<h1>More</h1><ul class="menu">' + NAV_ALL.filter(function (n) { return ['home', 'checkin', 'trends', 'reports'].indexOf(n[0]) === -1; }).map(function (n) {
      return '<li><a href="#' + n[0] + '"><span>' + esc(n[1]) + '</span></a></li>';
    }).join('') + '</ul>';
  };

  /* ---------- Render ---------- */
  function stopTimers() {
    ui.timers.forEach(function (t) { clearInterval(t); });
    ui.timers = [];
    if (ui.mounted && ui.mounted.destroy) { ui.mounted.destroy(); }
    ui.mounted = null;
  }
  function render() {
    stopTimers();
    var res = evaluateNow();
    var fn = screens[ui.route] || screens.home;
    app.innerHTML = shell(fn(res));
    afterRender(res);
    if (ui.lastRoute !== ui.route + '-' + ui.param) {
      ui.lastRoute = ui.route + '-' + ui.param;
      window.scrollTo(0, 0);
      var main = document.getElementById('main');
      if (main && ui.booted) { main.focus({ preventScroll: true }); }
    }
    ui.booted = true;
  }
  function afterRender(res) {
    if (ui.route === 'trends' || ui.route === 'trend') { mountCharts(); }
    if (ui.route === 'checkin') {
      var t = document.getElementById('ci-timer');
      var upd = function () { if (t && ui.form) { t.textContent = mmss(Date.now() - ui.form.startedAt); } };
      upd(); ui.timers.push(setInterval(upd, 1000));
    }
    if (ui.route === 'reaction') {
      ui.mounted = CW.Reaction.mount(document.getElementById('rt-root'), { proto: ix.rtProto, durationSec: state.settings.reactionSeconds,
        canStart: function () { return ui.alertness !== null; }, blockedText: 'First choose how alert you feel, above',
        onDone: function (metrics) {
        state.tests.push({ id: uid('t'), crewId: cur().id, day: today(), ts: new Date().toISOString(), type: 'reaction', durationSec: state.settings.reactionSeconds, device: Store.deviceId(), metrics: metrics, alertness: ui.alertness, source: 'manual' });
        ui.alertness = null;
        persist(); render();
        var card = document.getElementById('card-rt'); if (card) { card.scrollIntoView({ block: 'center' }); }
      } });
    }
    if (ui.route === 'amsler') {
      ui.mounted = CW.Amsler.mount(document.getElementById('am-root'), { proto: ix.amProto, pxPerMm: state.settings.pxPerMm,
        onCalibrate: function (v) { state.settings.pxPerMm = v; persist(); },
        onDone: function (results, info) {
          var nowIso = new Date().toISOString();
          results.forEach(function (r, i) {
            state.tests.push({ id: uid('t'), crewId: cur().id, day: today(), ts: nowIso + i, type: 'amsler', eye: r.eye, gridN: info.gridN, cells: r.cells, calibrated: info.calibrated, scaled: info.scaled, source: 'manual' });
          });
          persist(); render();
          var card = document.getElementById('card-amsler'); if (card) { card.scrollIntoView({ block: 'center' }); }
        } });
    }
    if (ui.route === 'reports') {
      var live = app.querySelectorAll('.repstat[data-live]');
      if (live.length) {
        ui.timers.push(setInterval(function () {
          Array.prototype.forEach.call(app.querySelectorAll('.repstat[data-live]'), function (n) {
            var rep = state.reports.filter(function (r) { return r.id === n.getAttribute('data-rep'); })[0];
            if (rep) { n.textContent = reportStatus(rep); }
          });
        }, 250));
      }
    }
    if (ui.route === 'setup' && ui.exportOpen) {
      var ta = document.getElementById('su-export'), dl = document.getElementById('su-download'), text = Store.exportText(state);
      if (ta) { ta.value = text; }
      /* A page shown inside another page (such as the claude.ai preview) cannot start
         downloads, so the link is offered only when Crewcial is the top page. */
      var framed = false;
      try { framed = window.self !== window.top; } catch (e) { framed = true; }
      if (dl) { if (window.claude || framed) { dl.hidden = true; } else { try { dl.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); } catch (e) { dl.hidden = true; } } }
    }
    void res;
  }

  /* ---------- Events ---------- */
  function onHash() {
    var h = (location.hash || '').replace(/^#/, ''), m = /^(region|trend|learn|cmo)-(.+)$/.exec(h);
    var route = m ? m[1] : (h || 'home'), param = m ? m[2] : '';
    if (ROUTES.indexOf(route) === -1) { route = 'home'; param = ''; }
    if (route !== 'setup') { ui.confirm = ''; ui.notice = ''; ui.exportOpen = false; ui.importError = ''; }
    ui.route = route; ui.param = param;
    render();
  }
  function stepValue(key, dir) {
    var input = document.getElementById('in-' + key), part = null;
    C.indicators.forEach(function (d) { d.parts.forEach(function (p) { if (p.key === key) { part = p; } }); });
    if (!input || !part) { return; }
    var curV = parseFloat(input.value), next;
    if (isNaN(curV)) { var last = lastValue(key, ui.form.day); next = last ? last.value : part.start; }
    else { next = curV + dir * part.step; }
    next = Math.max(part.min, Math.min(part.max, next));
    var digits = part.step < 1 ? (String(part.step).split('.')[1] || '').length : 0;
    input.value = next.toFixed(digits);
    ui.form.values[key] = input.value;
  }
  function redrawSymptoms() { var box = document.getElementById('sym-box'); if (box) { box.innerHTML = symptomBox(); } }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) { return; }
    var act = t.getAttribute('data-act'), f = ui.form;
    switch (act) {
      case 'step': stepValue(t.getAttribute('data-key'), Number(t.getAttribute('data-dir'))); break;
      case 'alert':
        if (ui.mounted && ui.mounted.running && ui.mounted.running()) { break; }
        ui.alertness = Number(t.getAttribute('data-n'));
        Array.prototype.forEach.call(document.querySelectorAll('#rt-alert [data-act="alert"]'), function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-n')) === ui.alertness)); });
        var ah = document.getElementById('rt-alert-hint'); if (ah) { ah.textContent = 'You chose ' + ui.alertness + '. Now start the test.'; }
        var rh = document.getElementById('rt-hint'); if (rh) { rh.textContent = 'Tap here or press the space bar to begin'; }
        break;
      case 'quality': f.quality = f.quality === t.getAttribute('data-q') ? '' : t.getAttribute('data-q');
        Array.prototype.forEach.call(t.parentNode.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-q') === f.quality)); }); break;
      case 'sym-mode': f.symMode = t.getAttribute('data-mode'); if (f.symMode === 'none') { f.symptoms = []; f.openRegion = null; } redrawSymptoms(); break;
      case 'sym-region': f.openRegion = f.openRegion === t.getAttribute('data-id') ? null : t.getAttribute('data-id'); redrawSymptoms(); break;
      case 'sym-toggle':
        var sid = t.getAttribute('data-id'), at = -1;
        f.symptoms.forEach(function (s, i) { if (s.symptomId === sid) { at = i; } });
        if (at === -1) { f.symptoms.push({ symptomId: sid, region: symById[sid].region, severity: 1, note: '' }); } else { f.symptoms.splice(at, 1); }
        redrawSymptoms(); break;
      case 'sym-sev': f.symptoms[Number(t.getAttribute('data-i'))].severity = Number(t.getAttribute('data-n')); redrawSymptoms(); break;
      case 'sym-remove': f.symptoms.splice(Number(t.getAttribute('data-i')), 1); redrawSymptoms(); break;
      case 'save-check': saveCheck(); break;
      case 'span': ui.trendSpan = Number(t.getAttribute('data-n')); render(); break;
      case 'send-report': sendReport(); break;
      case 'reset-report': ui.report = null; render(); break;
      case 'skip':
        e.preventDefault();
        var mainEl = document.getElementById('main');
        if (mainEl) { mainEl.focus(); }
        break;
      case 'jump':
        var target = document.getElementById(t.getAttribute('data-id'));
        if (target) { target.scrollIntoView({ block: 'start' }); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
        break;
      case 'copy-report':
        var rep = state.reports.filter(function (r) { return r.id === t.getAttribute('data-id'); })[0];
        if (rep) { copyText('SITUATION\n' + rep.sbar.S + '\n\nBACKGROUND\n' + rep.sbar.B + '\n\nASSESSMENT\n' + rep.sbar.A + '\n\nREQUEST\n' + rep.sbar.R, t); }
        break;
      case 'add-crew':
        var nid = uid('u');
        state.crew.push({ id: nid, name: 'Crew member ' + (state.crew.length + 1), role: '', isCmo: false, evaDay: null });
        state.settings.crewId = nid; persist(); render(); break;
      case 'next-day': state.mission.fixedDay += 1; persist(); ui.notice = 'Moved to mission day ' + state.mission.fixedDay + '.'; render(); break;
      case 'ask': ui.confirm = t.getAttribute('data-what'); render(); break;
      case 'confirm-no': ui.confirm = ''; render(); break;
      case 'confirm-yes':
        if (ui.confirm === 'phase') { state.mission.phaseStartDay = today(); ui.notice = 'A new mission phase starts on mission day ' + today() + '. Crewcial is learning everyone\'s normal again.'; ui.confirm = ''; persist(); render(); break; }
        state = ui.confirm === 'demo' ? demoState() : emptyState();
        ui.notice = ui.confirm === 'demo' ? 'The demo mission is loaded.' : 'An empty mission is ready. Start with today\'s check.';
        ui.confirm = ''; ui.form = null; ui.report = null; persist(); applyTheme(); render(); break;
      case 'export': ui.exportOpen = !ui.exportOpen; render(); break;
      case 'copy-export': copyText(Store.exportText(state), t); break;
      case 'import':
        var box = document.getElementById('su-import'), r = Store.importText(box ? box.value : '');
        if (!r.ok) { ui.importError = r.error; render(); break; }
        state = r.state; ui.importError = ''; ui.notice = 'The data was imported.'; ui.form = null; ui.report = null; persist(); applyTheme(); render(); break;
      default: break;
    }
  }
  function copyText(text, btn) {
    var done = function (ok) { if (btn) { var old = btn.textContent; btn.textContent = ok ? 'Copied' : 'Copy failed. Select the text and copy it yourself.'; setTimeout(function () { btn.textContent = old; }, 2500); } };
    try { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
  }
  function onInput(e) {
    var t = e.target;
    if (!t || !t.getAttribute) { return; }
    if (ui.form && t.getAttribute('data-key')) {
      var key = t.getAttribute('data-key');
      ui.form.values[key] = t.value;
      if (t.getAttribute('data-slider')) { ui.form.touched[key] = true; var o = document.getElementById('out-' + key); if (o) { o.textContent = t.value; } }
    }
    if (ui.report && t.getAttribute('data-rp')) { ui.report[t.getAttribute('data-rp')] = t.value; }
  }
  function onChange(e) {
    var t = e.target;
    if (!t || !t.getAttribute) { return; }
    if (ui.form && t.getAttribute('data-ctx')) { ui.form.ctx[t.getAttribute('data-ctx')] = t.checked; return; }
    if (t.getAttribute('data-cmo')) { ui.cmoDone[t.getAttribute('data-cmo')] = t.checked; return; }
    if (ui.report && t.getAttribute('data-rp-route')) { ui.report.route = t.value; var a = document.getElementById('rp-aud'); if (a) { a.textContent = audienceText(t.value); } return; }
    if (ui.report && t.getAttribute('data-rp-approve')) { ui.report.approved = t.checked; return; }
    var chg = t.getAttribute('data-chg');
    if (!chg) { return; }
    var me = cur();
    if (chg === 'crew') { state.settings.crewId = t.value; ui.form = null; ui.report = null; persist(); render(); }
    else if (chg === 'env') { state.mission.environment = t.value; ui.report = null; persist(); render(); }
    else if (chg === 'crew-name') { me.name = t.value.trim() || me.name; persist(); render(); }
    else if (chg === 'crew-role') { me.role = t.value.trim(); persist(); }
    else if (chg === 'crew-figure') { var dl = demoLook(me.id); me.look = (dl && dl.body === t.value) ? dl : Figure.defaultLook(t.value); persist(); }
    else if (chg === 'crew-eva') { var n = parseInt(t.value, 10); me.evaDay = isNaN(n) ? null : n; persist(); }
    else if (chg === 'rtlen') { state.settings.reactionSeconds = Number(t.value); persist(); }
    else if (chg === 'theme') { state.settings.theme = t.value; persist(); applyTheme(); }
    else if (chg === 'demospeed') { state.settings.demoSpeed = t.checked; persist(); }
    else if (chg === 'limit') {
      var rid = t.getAttribute('data-rule'), rr = ix.byId[rid], v = parseInt(t.value, 10);
      state.limits = state.limits || {}; state.limits[me.id] = state.limits[me.id] || {};
      if (isNaN(v) || !rr || !rr.personal) { delete state.limits[me.id][rid]; }
      else { state.limits[me.id][rid] = Math.max(rr.personal.min, Math.min(rr.personal.max, v)); }
      persist(); render();
    }
  }

  /* ---------- Boot ---------- */
  function boot() {
    var hot = window.claude && window.claude.hot;
    state = (hot && hot.data && hot.data.schema === 1) ? hot.data : Store.load();
    if (!state || state.schema !== 1 || !state.crew || !state.crew.length) { state = demoState(); persist(); }
    if (hot && hot.snapshot) { try { hot.snapshot(function () { return state; }); } catch (e) { /* not in the viewer */ } }
    applyTheme();
    window.addEventListener('hashchange', onHash);
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('submit', function (e) { e.preventDefault(); });
    onHash();
  }
  CW.App = { boot: boot, getState: function () { return state; }, render: render };
  boot();
})();
