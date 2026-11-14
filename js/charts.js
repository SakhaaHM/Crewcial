/*! Crewcial - trend chart (inline SVG, no library).
 * One series on one axis: the person's readings as a line, their own usual range
 * as a shaded band, and a marker on every day that was flagged. Colour is used
 * only for status, and every status also has its own marker shape.
 * AI-assistance disclosure: generated with Claude (Anthropic) for Team Crewcial,
 * NASA Space Apps Challenge 2026.
 */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var W = 640, H = 250, M = { l: 46, r: 64, t: 16, b: 30 };
  /* The drawing uses the container's own width, so text stays at its true size on a phone. */
  function fit(container) {
    W = Math.max(280, Math.round(container.clientWidth || 640));
    H = W < 440 ? 210 : 250;
    M = W < 440 ? { l: 38, r: 46, t: 14, b: 28 } : { l: 46, r: 64, t: 16, b: 30 };
  }

  function niceStep(span, target) {
    var raw = span / Math.max(1, target), pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), n = raw / pow;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
  }
  function ticks(lo, hi, target) {
    var step = niceStep(hi - lo || 1, target), out = [], v = Math.ceil(lo / step) * step;
    for (; v <= hi + step * 1e-6; v += step) { out.push(Math.round(v / step) * step); }
    return { step: step, values: out };
  }
  function trimNum(v, step) {
    var d = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
    return Number(v).toFixed(d);
  }
  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) { n.setAttribute(k, attrs[k]); } }
    if (text !== undefined) { n.textContent = text; }
    return n;
  }
  function marker(state, x, y) {
    var g = el('g', { 'class': 'mk mk--' + state }), r = W < 440 ? 5.5 : 6.5;
    if (state === 'act') { g.appendChild(el('path', { d: 'M' + x + ' ' + (y - r) + ' L' + (x + r) + ' ' + y + ' L' + x + ' ' + (y + r) + ' L' + (x - r) + ' ' + y + ' Z' })); }
    else if (state === 'watch') { g.appendChild(el('path', { d: 'M' + x + ' ' + (y - r) + ' L' + (x + r) + ' ' + (y + r - 1.5) + ' L' + (x - r) + ' ' + (y + r - 1.5) + ' Z' })); }
    else { g.appendChild(el('circle', { cx: x, cy: y, r: 4.5 })); }
    return g;
  }

  /* opts: { title, unit, points:[{day,value,state,word}], band:[{day,low,high}], fmt(value), empty } */
  function render(container, opts) {
    container.textContent = '';
    fit(container);
    var pts = (opts.points || []).filter(function (p) { return typeof p.value === 'number' && isFinite(p.value); });
    if (!pts.length) {
      var p0 = document.createElement('p'); p0.className = 'chart-empty'; p0.textContent = opts.empty || 'No readings in this period.';
      container.appendChild(p0); return;
    }
    var fmt = opts.fmt || function (v) { return String(v); };
    var fmtBand = opts.fmtBand || fmt;
    var band = (opts.band || []).filter(function (b) { return b.low !== null && b.high !== null; });
    var x0 = opts.fromDay, x1 = opts.toDay;
    if (x1 === x0) { x1 = x0 + 1; }
    var lo = Infinity, hi = -Infinity;
    pts.forEach(function (p) { lo = Math.min(lo, p.value); hi = Math.max(hi, p.value); });
    band.forEach(function (b) { lo = Math.min(lo, b.low); hi = Math.max(hi, b.high); });
    var pad = (hi - lo || 1) * 0.08; lo -= pad; hi += pad;
    var tk = ticks(lo, hi, 5);
    function X(d) { return M.l + (d - x0) / (x1 - x0) * (W - M.l - M.r); }
    function Y(v) { return M.t + (hi - v) / (hi - lo) * (H - M.t - M.b); }

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'class': 'chart-svg',
      'aria-label': opts.title + '. ' + pts.length + ' readings from mission day ' + pts[0].day + ' to ' + pts[pts.length - 1].day + '. Latest: ' + fmt(pts[pts.length - 1].value) + ' ' + (opts.unit || '') + '.' });

    /* Grid and y labels */
    tk.values.forEach(function (v) {
      if (v < lo || v > hi) { return; }
      svg.appendChild(el('line', { x1: M.l, x2: W - M.r, y1: Y(v), y2: Y(v), 'class': 'grid' }));
      svg.appendChild(el('text', { x: M.l - 8, y: Y(v) + 4, 'class': 'axis', 'text-anchor': 'end' }, trimNum(v, tk.step)));
    });
    /* X labels: mission days */
    var xt = ticks(x0, x1, W < 440 ? 4 : 6);
    xt.values.forEach(function (d) {
      if (d < x0 || d > x1 || d !== Math.round(d)) { return; }
      svg.appendChild(el('text', { x: X(d), y: H - 9, 'class': 'axis', 'text-anchor': 'middle' }, 'Day ' + d));
    });
    svg.appendChild(el('line', { x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b, 'class': 'grid grid--base' }));

    /* Usual-range band: one polygon per run of consecutive days */
    var run = [];
    function flush() {
      if (run.length < 2) { run = []; return; }
      var top = run.map(function (b) { return X(b.day) + ',' + Y(b.high); });
      var bot = run.slice().reverse().map(function (b) { return X(b.day) + ',' + Y(b.low); });
      svg.appendChild(el('polygon', { points: top.concat(bot).join(' '), 'class': 'band' }));
      run = [];
    }
    band.forEach(function (b, i) {
      if (run.length && b.day !== band[i - 1].day + 1) { flush(); }
      run.push(b);
    });
    flush();

    /* The line */
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.day).toFixed(1) + ' ' + Y(p.value).toFixed(1); }).join(' ');
    svg.appendChild(el('path', { d: d, 'class': 'line' }));
    /* Markers on flagged days, plus the latest point */
    pts.forEach(function (p, i) {
      var flagged = p.state === 'act' || p.state === 'watch' || p.state === 'check';
      if (flagged) { svg.appendChild(marker(p.state, X(p.day), Y(p.value))); }
      else if (i === pts.length - 1 || opts.allMarkers) { svg.appendChild(el('circle', { cx: X(p.day), cy: Y(p.value), r: 4, 'class': 'mk mk--end' })); }
    });
    /* Direct label on the latest point */
    var last = pts[pts.length - 1];
    var ly = Math.max(M.t + 10, Math.min(H - M.b - 4, Y(last.value) + 4));
    svg.appendChild(el('text', { x: X(last.day) + 10, y: ly, 'class': 'endlabel' }, fmt(last.value)));

    /* Hover layer */
    var cross = el('line', { y1: M.t, y2: H - M.b, 'class': 'cross', visibility: 'hidden' });
    var hit = el('rect', { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b, 'class': 'hit', tabindex: '0', 'aria-label': 'Move left and right to read each day' });
    svg.appendChild(cross); svg.appendChild(hit);
    container.appendChild(svg);

    var tip = document.createElement('div'); tip.className = 'chart-tip'; tip.hidden = true;
    var tv = document.createElement('strong'), tl = document.createElement('span'), tb = document.createElement('span');
    tip.appendChild(tv); tip.appendChild(tl); tip.appendChild(tb);
    container.appendChild(tip);
    var bandByDay = {}; band.forEach(function (b) { bandByDay[b.day] = b; });
    var cur = pts.length - 1;
    function show(i) {
      cur = Math.max(0, Math.min(pts.length - 1, i));
      var p = pts[cur], px = X(p.day);
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
      tv.textContent = fmt(p.value) + (opts.unit ? ' ' + opts.unit : '');
      tl.textContent = 'Mission day ' + p.day + (p.word ? ' · ' + p.word : '');
      var b = bandByDay[p.day];
      tb.textContent = b ? 'Usual range ' + fmtBand(b.low) + ' to ' + fmtBand(b.high) : '';
      tip.hidden = false;
      var frac = px / W;
      tip.style.left = (frac * 100) + '%';
      tip.className = 'chart-tip' + (frac > 0.6 ? ' chart-tip--left' : '');
    }
    function hide() { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; }
    function nearest(evt) {
      var r = svg.getBoundingClientRect();
      var day = x0 + ((evt.clientX - r.left) / r.width * W - M.l) / (W - M.l - M.r) * (x1 - x0);
      var best = 0, bd = Infinity;
      pts.forEach(function (p, i) { var dd = Math.abs(p.day - day); if (dd < bd) { bd = dd; best = i; } });
      return best;
    }
    hit.addEventListener('pointermove', function (e) { show(nearest(e)); });
    hit.addEventListener('pointerdown', function (e) { show(nearest(e)); });
    hit.addEventListener('pointerleave', hide);
    hit.addEventListener('focus', function () { show(cur); });
    hit.addEventListener('blur', hide);
    hit.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { show(cur - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { show(cur + 1); e.preventDefault(); }
    });
  }

  root.Crewcial = root.Crewcial || {};
  root.Crewcial.Charts = { render: render, ticks: ticks };
})(typeof self !== 'undefined' ? self : this);
