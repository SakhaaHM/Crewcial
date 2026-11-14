/*! Crewcial - the astronaut figure on the home screen.
 * AI-assistance disclosure: this file was generated with Claude (Anthropic) for
 * Team Crewcial, NASA Space Apps Challenge 2026. It draws a fictional astronaut in
 * an exploration-style spacesuit. The demo crew are invented and belong to no real
 * astronaut. The figure is labelled "AI-generated illustration" inside the drawing.
 *
 * How it works: the suit, face and helmet are drawn once as decoration (they ignore
 * taps). Eight body systems are drawn on top as a see-through "scan" layer. Each one
 * sits inside a link made by the app (js/app.js), and the link's status class decides
 * how it is painted (css/app.css): parts in range stay faint, a part that needs
 * attention is lit in its status colour. Skin is shown as a tint over the suit.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Crewcial = root.Crewcial || {}; root.Crewcial.Figure = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CX = 110;
  /* The head is drawn around (110, 56) and placed at (110, 60), 6% larger. */
  var HEAD_T = 'matrix(1.06 0 0 1.06 -6.6 0.64)';
  var HAIRS = ['long', 'bun', 'curly', 'short'];
  var DEFAULTS = {
    f: { body: 'f', skin: '#c48e69', shade: '#a2704e', hair: 'bun', hairColor: '#2a211d', beard: false },
    m: { body: 'm', skin: '#b7815f', shade: '#956348', hair: 'short', hairColor: '#221b17', beard: false }
  };
  /* Body shapes. f and m differ in shoulders, waist, arms and face. */
  var BODY = {
    f: { sh: 43, chest: 37, waist: 29, hip: 35, organK: 1,
         arm: [[66, 121], [62, 155], [57.5, 190], [54.5, 220], [52.5, 250]], armW: [12.5, 12.5, 11.5, 11, 9.5],
         leg: [[91, 266], [90, 300], [89.5, 336], [89.5, 365], [90, 390]], legW: [17, 15.5, 13.5, 12, 10] },
    m: { sh: 49, chest: 42, waist: 35, hip: 36, organK: 1.12,
         arm: [[60, 121], [56, 155], [50.5, 190], [47.5, 220], [45.5, 250]], armW: [14, 14, 13, 12.5, 10.5],
         leg: [[90.5, 266], [89.5, 300], [89, 336], [89, 365], [89.5, 390]], legW: [18, 16.5, 14, 12.5, 10.5] }
  };

  /* ---------- Small helpers ---------- */
  function n(v) { return Math.round(v * 100) / 100; }
  function hex(v, d) { return /^#[0-9a-fA-F]{6}$/.test(v || '') ? v : d; }
  function mix(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), out = '#';
    [16, 8, 0].forEach(function (s) {
      var c = Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
      out += ('0' + c.toString(16)).slice(-2);
    });
    return out;
  }
  /* Rewrites every x,y pair of a path that uses only M, L, C, Q and Z. */
  function mapPath(d, fn) {
    var tokens = d.match(/[MLCQZ]|-?\d*\.?\d+/g), out = [], buf = [];
    tokens.forEach(function (t) {
      if (/[MLCQZ]/.test(t)) { out.push(t); return; }
      buf.push(Number(t));
      if (buf.length === 2) { var p = fn(buf[0], buf[1]); out.push(n(p[0]) + ' ' + n(p[1])); buf = []; }
    });
    return out.join(' ');
  }
  function mirror(d) { return mapPath(d, function (x, y) { return [2 * CX - x, y]; }); }
  function widen(d, k) { return k === 1 ? d : mapPath(d, function (x, y) { return [CX + (x - CX) * k, y]; }); }
  function both(d) { return d + ' ' + mirror(d); }
  /* A smooth path through points (Catmull-Rom). */
  function spline(pts, closed) {
    var d = 'M' + n(pts[0][0]) + ' ' + n(pts[0][1]), len = pts.length;
    var last = closed ? len : len - 1;
    for (var i = 0; i < last; i++) {
      var p0 = pts[closed ? (i - 1 + len) % len : Math.max(i - 1, 0)], p1 = pts[i];
      var p2 = pts[(i + 1) % len], p3 = pts[closed ? (i + 2) % len : Math.min(i + 2, len - 1)];
      d += ' C' + n(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + n(p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
           n(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + n(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + n(p2[0]) + ' ' + n(p2[1]);
    }
    return d + (closed ? ' Z' : '');
  }
  /* A limb outline around an axis with a half-width at each axis point. */
  function limb(axis, widths) {
    var left = [], right = [];
    axis.forEach(function (p, i) {
      var a = axis[Math.max(i - 1, 0)], b = axis[Math.min(i + 1, axis.length - 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len, ny = dx / len;
      left.push([p[0] + nx * widths[i], p[1] + ny * widths[i]]);
      right.push([p[0] - nx * widths[i], p[1] - ny * widths[i]]);
    });
    return spline(left.concat(right.reverse()), true);
  }
  /* Where a limb axis is at height y, and its half-width there. */
  function at(axis, widths, y) {
    for (var i = 0; i < axis.length - 1; i++) {
      if (y <= axis[i + 1][1]) {
        var t = (y - axis[i][1]) / (axis[i + 1][1] - axis[i][1]);
        return { x: axis[i][0] + (axis[i + 1][0] - axis[i][0]) * t, w: widths[i] + (widths[i + 1] - widths[i]) * t };
      }
    }
    return { x: axis[axis.length - 1][0], w: widths[widths.length - 1] };
  }
  function flipAxis(axis) { return axis.map(function (p) { return [2 * CX - p[0], p[1]]; }); }
  function el(tag, attrs) {
    var s = '<' + tag;
    Object.keys(attrs).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) { s += ' ' + k + '="' + attrs[k] + '"'; } });
    return s + '/>';
  }
  function path(d, cls, extra) { var a = { d: d, 'class': cls }; if (extra) { Object.keys(extra).forEach(function (k) { a[k] = extra[k]; }); } return el('path', a); }
  function ellipse(cx, cy, rx, ry, cls, extra) { var a = { cx: n(cx), cy: n(cy), rx: n(rx), ry: n(ry), 'class': cls }; if (extra) { Object.keys(extra).forEach(function (k) { a[k] = extra[k]; }); } return el('ellipse', a); }
  function band(axis, widths, y, h, sag) {
    var a = at(axis, widths, y), b = at(axis, widths, y + h);
    return 'M' + n(a.x - a.w - 0.4) + ' ' + n(y) + ' Q' + n(a.x) + ' ' + n(y + sag) + ' ' + n(a.x + a.w + 0.4) + ' ' + n(y) +
           ' L' + n(b.x + b.w + 0.4) + ' ' + n(y + h) + ' Q' + n(b.x) + ' ' + n(y + h + sag) + ' ' + n(b.x - b.w - 0.4) + ' ' + n(y + h) + ' Z';
  }
  function arcAcross(axis, widths, y, sag) {
    var a = at(axis, widths, y);
    return 'M' + n(a.x - a.w + 1) + ' ' + n(y) + ' Q' + n(a.x) + ' ' + n(y + sag) + ' ' + n(a.x + a.w - 1) + ' ' + n(y);
  }

  function normalize(look) {
    look = look || {};
    var body = look.body === 'm' ? 'm' : 'f', d = DEFAULTS[body];
    return { body: body, skin: hex(look.skin, d.skin), shade: hex(look.shade, d.shade),
             hair: HAIRS.indexOf(look.hair) !== -1 ? look.hair : d.hair, hairColor: hex(look.hairColor, d.hairColor),
             beard: body === 'm' && !!look.beard };
  }
  function defaultLook(body) { var d = DEFAULTS[body === 'm' ? 'm' : 'f']; return { body: d.body, skin: d.skin, shade: d.shade, hair: d.hair, hairColor: d.hairColor, beard: d.beard }; }

  /* ---------- The suit (decoration) ---------- */
  function torsoPath(b) {
    var L = [[86, 98], [CX - b.sh + 7, 102], [CX - b.sh, 112], [CX - b.sh + 1, 126], [CX - b.chest, 140], [CX - b.chest, 170],
             [CX - b.chest + 3, 200], [CX - b.waist, 228], [CX - b.waist + 0.5, 242], [CX - b.hip + 1.5, 256], [CX - b.hip, 270],
             [CX - b.hip + 2.5, 284], [96, 290]];
    var R = L.slice().reverse().map(function (p) { return [2 * CX - p[0], p[1]]; });
    return spline([[CX, 96]].concat(L, [[CX, 292]], R), true);
  }
  function glovePath(w, wide, side) {
    /* side -1: left hand (thumb toward the body, on its right); +1: right hand. */
    var x = w[0], y = w[1] + 1, k = wide, s = side;
    var d = 'M' + n(x - 9 * k) + ' ' + n(y) + ' C' + n(x - 10.6 * k) + ' ' + n(y + 10) + ' ' + n(x - 11 * k) + ' ' + n(y + 20) + ' ' + n(x - 9 * k) + ' ' + n(y + 28) +
            ' C' + n(x - 7.4 * k) + ' ' + n(y + 32.6) + ' ' + n(x - 1 * k) + ' ' + n(y + 34.2) + ' ' + n(x + 3 * k) + ' ' + n(y + 32.6) +
            ' C' + n(x + 7.2 * k) + ' ' + n(y + 31) + ' ' + n(x + 9.4 * k) + ' ' + n(y + 26.4) + ' ' + n(x + 9.6 * k) + ' ' + n(y + 20) +
            ' L' + n(x + 9.4 * k) + ' ' + n(y) + ' Z';
    if (s > 0) { d = mapPath(d, function (px, py) { return [2 * x - px, py]; }); }
    return d;
  }
  function thumbPath(w, wide, side) {
    var x = w[0], y = w[1] + 1, k = wide;
    var d = 'M' + n(x + 7.6 * k) + ' ' + n(y + 7) + ' C' + n(x + 12.4 * k) + ' ' + n(y + 8.6) + ' ' + n(x + 13.2 * k) + ' ' + n(y + 15) + ' ' + n(x + 11.2 * k) + ' ' + n(y + 19.6) +
            ' C' + n(x + 10 * k) + ' ' + n(y + 22.2) + ' ' + n(x + 7.4 * k) + ' ' + n(y + 21.6) + ' ' + n(x + 7.2 * k) + ' ' + n(y + 18.8) + ' Z';
    if (side > 0) { d = mapPath(d, function (px, py) { return [2 * x - px, py]; }); }
    return d;
  }
  function bootPath(bx) {
    return 'M' + n(bx - 10.5) + ' 390 L' + n(bx + 10.5) + ' 390 C' + n(bx + 11.5) + ' 398 ' + n(bx + 14) + ' 404 ' + n(bx + 14) + ' 411' +
           ' C' + n(bx + 14) + ' 417 ' + n(bx + 10) + ' 421 ' + n(bx + 5) + ' 421 L' + n(bx - 5) + ' 421 C' + n(bx - 10) + ' 421 ' + n(bx - 14) + ' 417 ' + n(bx - 14) + ' 411' +
           ' C' + n(bx - 14) + ' 404 ' + n(bx - 11.5) + ' 398 ' + n(bx - 10.5) + ' 390 Z';
  }

  function suit(b) {
    var s = '';
    var armL = b.arm, armR = flipAxis(b.arm), legL = b.leg, legR = flipAxis(b.leg);
    /* Life-support backpack, seen behind the shoulders */
    s += ellipse(CX, 421, 58, 4.2, 'f-ground');
    s += el('rect', { x: CX - b.chest - 2, y: 84, width: 2 * (b.chest + 2), height: 96, rx: 10, 'class': 'f-pack' });
    /* Legs and boots */
    [[legL, -1], [legR, 1]].forEach(function (pair) {
      var ax = pair[0], side = pair[1], last = ax[ax.length - 1];
      s += path(limb(ax, b.legW), side < 0 ? 'f-suit' : 'f-suit f-suit--r') + path(limb(ax, b.legW), 'f-vshade');
      [326, 333, 340].forEach(function (y) { s += path(arcAcross(ax, b.legW, y, 3.6), 'f-seam'); });
      s += path('M' + n(at(ax, b.legW, 280).x + side * 7) + ' 280 Q' + n(at(ax, b.legW, 300).x + side * 8) + ' 300 ' + n(at(ax, b.legW, 318).x + side * 6) + ' 318', 'f-fold');
      s += path('M' + n(at(ax, b.legW, 350).x - side * 5) + ' 350 Q' + n(at(ax, b.legW, 362).x - side * 6.5) + ' 362 ' + n(at(ax, b.legW, 374).x - side * 5) + ' 376', 'f-fold');
      s += path(band(ax, b.legW, 382, 7, 1.6), 'f-joint');
      s += path(bootPath(last[0]), 'f-boot');
      s += el('rect', { x: n(last[0] - 14.6), y: 415.5, width: 29.2, height: 5.6, rx: 2.8, 'class': 'f-sole' });
      s += path('M' + n(last[0] - 11) + ' 405 Q' + n(last[0]) + ' 401 ' + n(last[0] + 11) + ' 405', 'f-seam');
    });
    /* Torso */
    var torso = torsoPath(b);
    s += path(torso, 'f-suit') + path(torso, 'f-vshade');
    s += path('M' + (CX - b.chest + 2) + ' 178 Q' + CX + ' 196 ' + (CX + b.chest - 2) + ' 178', 'f-seam');
    s += path('M' + (CX - b.waist - 1.5) + ' 229 Q' + CX + ' 234.5 ' + (CX + b.waist + 1.5) + ' 229 L' + (CX + b.waist + 1) + ' 240 Q' + CX + ' 245.5 ' + (CX - b.waist - 1) + ' 240 Z', 'f-joint');
    s += path('M' + (CX - b.hip + 3) + ' 262 Q' + (CX - 18) + ' 268 ' + (CX - 3) + ' 266 M' + (CX + b.hip - 3) + ' 262 Q' + (CX + 18) + ' 268 ' + (CX + 3) + ' 266', 'f-seam');
    s += path('M' + CX + ' 246 L' + CX + ' 290', 'f-fold');
    s += el('circle', { cx: CX - b.waist + 6, cy: 214, r: 3.2, 'class': 'f-joint' }) + el('circle', { cx: CX + b.waist - 6, cy: 214, r: 3.2, 'class': 'f-joint' });
    /* Arms, shoulder caps, gloves */
    [[armL, -1], [armR, 1]].forEach(function (pair) {
      var ax = pair[0], side = pair[1], top = ax[0], wr = ax[ax.length - 1], k = b.armW[0] / 12.5;
      s += path(limb(ax, b.armW), side < 0 ? 'f-suit' : 'f-suit f-suit--r') + path(limb(ax, b.armW), 'f-vshade');
      s += el('circle', { cx: n(top[0]), cy: n(top[1] + 1), r: n(b.armW[0] + 1.2), 'class': side < 0 ? 'f-suit' : 'f-suit f-suit--r' });
      s += el('circle', { cx: n(top[0]), cy: n(top[1] + 1), r: n(b.armW[0] - 3), 'class': 'f-seam' });
      s += path(band(ax, b.armW, 140, 4.5, 1.4), 'f-joint');
      [182, 188.5, 195].forEach(function (y) { s += path(arcAcross(ax, b.armW, y, 3), 'f-seam'); });
      s += path('M' + n(at(ax, b.armW, 206).x - side * 4) + ' 206 Q' + n(at(ax, b.armW, 222).x - side * 5.5) + ' 222 ' + n(at(ax, b.armW, 238).x - side * 4) + ' 240', 'f-fold');
      /* Patch on each upper arm: a flag-like tape on the left, a round mission patch on the right */
      var pa = at(ax, b.armW, 158);
      if (side < 0) { s += el('rect', { x: n(pa.x - 6), y: 153, width: 12, height: 8, rx: 1.2, 'class': 'f-patch' }) + path('M' + n(pa.x - 6) + ' 155.7 L' + n(pa.x + 6) + ' 155.7 M' + n(pa.x - 6) + ' 158.4 L' + n(pa.x + 6) + ' 158.4', 'f-patch-line'); }
      else { s += el('circle', { cx: n(pa.x), cy: 157, r: 5.4, 'class': 'f-patch' }) + el('circle', { cx: n(pa.x), cy: 157, r: 3.2, 'class': 'f-patch-line' }) + el('circle', { cx: n(pa.x + 1.3), cy: 155.8, r: 0.9, 'class': 'f-patch-dot' }); }
      s += path(band(ax, b.armW, 244, 7.5, 1.6), 'f-joint');
      s += path(glovePath(wr, k, side), 'f-glove') + path(thumbPath(wr, k, side), 'f-glove');
      s += path('M' + n(wr[0] - 3 * k * -side) + ' ' + n(wr[1] + 24) + ' L' + n(wr[0] - 3 * k * -side) + ' ' + n(wr[1] + 32) +
                ' M' + n(wr[0] + 1 * k * -side) + ' ' + n(wr[1] + 25) + ' L' + n(wr[0] + 1 * k * -side) + ' ' + n(wr[1] + 33.5), 'f-fold');
    });
    return { art: s, torso: torso,
             upper: [torso, limb(armL, b.armW), limb(armR, b.armW), glovePath(armL[armL.length - 1], b.armW[0] / 12.5, -1), glovePath(armR[armR.length - 1], b.armW[0] / 12.5, 1)].join(' ') };
  }

  /* ---------- Head, face and hair (decoration) ---------- */
  /* A closed outline around (cx, cy) whose radius ripples, for curly hair. */
  function ripple(cx, cy, rx, ry, waves, amp, from, to) {
    var pts = [], steps = 72;
    for (var i = 0; i <= steps; i++) {
      var a = (from + (to - from) * i / steps) * Math.PI / 180, k = 1 + amp * Math.cos(waves * a);
      pts.push([cx + rx * k * Math.cos(a), cy - ry * k * Math.sin(a)]);
    }
    return pts;
  }
  function hairBack(L) {
    var f = { fill: L.hairColor };
    if (L.hair === 'long') { return path('M88.6 44 C87.4 58 86.8 72 88.4 86 C89 90.4 91.8 93 96 93 L124 93 C128.2 93 131 90.4 131.6 86 C133.2 72 132.6 58 131.4 44 C129.8 31.5 121.5 24.5 110 24.5 C98.5 24.5 90.2 31.5 88.6 44 Z', 'f-hair', f); }
    if (L.hair === 'curly') { return path(spline(ripple(CX, 49, 27, 29.5, 15, 0.05, -38, 218), true), 'f-hair', f); }
    if (L.hair === 'bun') { return el('circle', { cx: CX, cy: 22, r: 8.4, 'class': 'f-hair', fill: L.hairColor }); }
    return '';
  }
  function hairFront(L) {
    var f = { fill: L.hairColor }, hl = 'f-hair-hl';
    if (L.hair === 'long') {
      var side = 'M110 27.4 C102.4 27.2 95.4 31.2 92.5 38.6 C90.5 43.9 89.5 50.2 89.3 57.2 C89.1 66.2 89.5 76.2 91.1 86.4 L94.7 86.4 C93.3 76.6 92.7 66.6 93.1 58.1 C93.5 50.2 94.8 44.2 97.8 40 C101.1 35.2 105.6 32.6 110 31.8 Z';
      return path(both(side), 'f-hair', f) + path('M103 31.5 C99 34.5 96.4 39.5 95.4 45.5 M117 31.5 C121 34.5 123.6 39.5 124.6 45.5', hl);
    }
    if (L.hair === 'bun') {
      return path('M90.4 51 C89.6 36.5 98.6 27.2 110 27.2 C121.4 27.2 130.4 36.5 129.6 51 C128.6 45.4 126.6 41.6 122.8 38.8 C117.6 35 107 34.6 100.6 37.4 C95.4 39.7 92 44.6 90.4 51 Z', 'f-hair', f) +
             path('M103.2 28.4 C101.2 31 100.2 34 100.6 37.4 M112 30 C117 31 121.6 33.4 124.6 37.4', hl) +
             path('M104.6 28.8 Q110 26.4 115.4 28.8', 'f-hair-tie') + path('M104.6 19.5 C106.6 16.8 112.4 16.6 115 19.6 M103.6 23.6 C106.6 25.6 113.2 25.6 116.4 23.4', hl);
    }
    if (L.hair === 'curly') {
      /* A curly fringe over the top of the forehead, and a few curls for texture */
      var top = ripple(CX, 47, 21.6, 21.4, 13, 0.06, 18, 162);
      var under = ripple(CX, 52, 15.6, 17.6, 11, 0.07, 150, 30);
      var s = path(spline(top.concat(under), true), 'f-hair', f);
      [[96, 29], [104, 25], [113, 24.6], [122, 27.6], [88.6, 40], [131.2, 40], [86.6, 52], [133.4, 53], [87.6, 64], [132.4, 65], [99.4, 33.2], [118.6, 32.4]].forEach(function (p) {
        s += path('M' + n(p[0] - 2.4) + ' ' + n(p[1] + 0.8) + ' C' + n(p[0] - 1.6) + ' ' + n(p[1] - 1.8) + ' ' + n(p[0] + 1.8) + ' ' + n(p[1] - 1.8) + ' ' + n(p[0] + 2.4) + ' ' + n(p[1] + 0.4), hl);
      });
      return s;
    }
    if (L.hair === 'short') {
      return path('M89.6 50 C88.6 40 92 30.5 101 26.8 C106 24.8 114 24.6 119.4 26.6 C128 29.8 131.6 39 130.4 50 C129.6 45.2 128.4 41.6 126.2 39.6 C124.6 38.2 122.8 37.4 120.6 37.8 C117.4 36.2 113.6 35.6 110 35.8 C106.4 35.6 102.6 36.2 99.4 37.8 C97.2 37.4 95.4 38.2 93.8 39.6 C91.6 41.6 90.4 45.2 89.6 50 Z', 'f-hair', f) +
             path('M97 30.6 C101.6 28.4 106.4 27.8 111 28.2 M114.6 28.6 C119.4 29.4 123.6 31.4 126.4 34.6 M100.6 33.6 C104.6 32 108.4 31.6 112 31.8', hl);
    }
    return '';
  }
  function head(L, ids) {
    var m = L.body === 'm', s = '', clips = '';
    var lip = mix(L.shade, '#8a4943', 0.42), dark = mix(L.hairColor, '#000000', 0.3);
    s += hairBack(L);
    s += path(m ? 'M101.6 66 L118.4 66 L119 97 L101 97 Z' : 'M103.2 66 L116.8 66 L117.4 97 L102.6 97 Z', 'f-neck');
    s += ellipse(CX, m ? 82.6 : 81.2, m ? 9.5 : 8.6, 3.2, 'f-chinshade');
    if (L.hair === 'short' || L.hair === 'bun') {
      var ex = m ? 88.8 : 90.4, ery = m ? 6 : 5.4;
      s += ellipse(ex, 55.5, m ? 3 : 2.6, ery, 'f-ear') + ellipse(2 * CX - ex, 55.5, m ? 3 : 2.6, ery, 'f-ear');
    }
    s += path(m ? 'M110 28 C122.4 28 131 36.5 131 49.5 C131 59.5 129.8 66.8 126.6 72.4 C123 78.4 116.8 81.5 110 81.5 C103.2 81.5 97 78.4 93.4 72.4 C90.2 66.8 89 59.5 89 49.5 C89 36.5 97.6 28 110 28 Z'
                : 'M110 29 C121.2 29 129.5 37.5 129.5 50 C129.5 59.5 127.6 66.5 123.8 71.8 C120.2 76.6 115.4 80 110 80 C104.6 80 99.8 76.6 96.2 71.8 C92.4 66.5 90.5 59.5 90.5 50 C90.5 37.5 98.8 29 110 29 Z', 'f-face');
    s += path(m ? 'M127.6 58 C127 66.5 122 75.5 112 79.8' : 'M126.6 58.5 C126 66 121.4 74.4 112 78.4', 'f-jawshade');
    /* Eyes: the iris is clipped by the eye opening, so the upper lid covers its top */
    [-1, 1].forEach(function (side, i) {
      var x = m ? (side < 0 ? 101.7 : 118.3) : (side < 0 ? 102 : 118), y = 54.6, w = m ? 3.8 : 4, h = m ? 1.45 : 1.6;
      var eye = 'M' + n(x - w) + ' ' + n(y + 0.25) + ' C' + n(x - w * 0.6) + ' ' + n(y - h * 1.15) + ' ' + n(x + w * 0.6) + ' ' + n(y - h * 1.2) + ' ' + n(x + w) + ' ' + n(y - 0.15) +
                ' C' + n(x + w * 0.6) + ' ' + n(y + h * 0.95) + ' ' + n(x - w * 0.6) + ' ' + n(y + h) + ' ' + n(x - w) + ' ' + n(y + 0.25) + ' Z';
      var id = ids.eye + i;
      clips += '<clipPath id="' + id + '"><path d="' + eye + '"/></clipPath>';
      s += path(eye, 'f-eyewhite');
      s += '<g clip-path="url(#' + id + ')">' + el('circle', { cx: n(x + 0.15), cy: n(y - 0.15), r: m ? 1.85 : 1.95, 'class': 'f-iris' }) +
           el('circle', { cx: n(x + 0.15), cy: n(y - 0.15), r: 0.9, 'class': 'f-pupil' }) + '</g>';
      s += el('circle', { cx: n(x + 0.75), cy: n(y - 0.75), r: 0.48, 'class': 'f-glint' });
      s += path('M' + n(x - w - 0.35) + ' ' + n(y + 0.2) + ' C' + n(x - w * 0.6) + ' ' + n(y - h * 1.3 - 0.4) + ' ' + n(x + w * 0.6) + ' ' + n(y - h * 1.35 - 0.4) + ' ' + n(x + w + 0.35) + ' ' + n(y - 0.25), 'f-lid', { stroke: dark });
      s += path('M' + n(x - w * 0.7) + ' ' + n(y + h * 0.95) + ' C' + n(x - w * 0.2) + ' ' + n(y + h * 1.3) + ' ' + n(x + w * 0.3) + ' ' + n(y + h * 1.3) + ' ' + n(x + w * 0.75) + ' ' + n(y + h * 0.8), 'f-lowlid', { stroke: L.shade });
      if (!m) { var ox = side < 0 ? x - w - 0.35 : x + w + 0.35; s += path('M' + n(ox) + ' ' + n(y + (side < 0 ? 0.2 : -0.25)) + ' L' + n(ox + side * 1.2) + ' ' + n(y - 1.1), 'f-lid', { stroke: dark }); }
      var brow = m ? 'M96.4 50 C99.2 48.2 103.8 47.8 107.2 49' : 'M97 49.9 C99.4 47.5 103.8 47.1 106.7 48.6';
      s += path(side < 0 ? brow : mirror(brow), m ? 'f-brow f-brow--m' : 'f-brow', { stroke: L.hairColor });
    });
    /* Nose and mouth */
    s += path('M111.4 55.2 C112 58.6 113.4 61.2 112.6 63.4', 'f-noseline', { stroke: L.shade });
    s += path('M107 63.8 C108.2 64.9 111.8 64.9 113 63.8', 'f-noseline', { stroke: L.shade });
    s += ellipse(110.1, 62.4, 1.3, 0.9, 'f-nosehl');
    if (m) {
      s += path('M105.2 70.6 C107.8 71.4 112.2 71.4 114.8 70.6', 'f-mouth', { stroke: mix(lip, '#000000', 0.35) });
      s += path('M106.6 71.9 C108.6 73.2 111.4 73.2 113.4 71.9', 'f-lipshade', { stroke: lip });
    } else {
      s += path('M104.8 70.1 C106.7 69 108.6 68.7 110 69.4 C111.4 68.7 113.3 69 115.2 70.1 C113 70.9 107 70.9 104.8 70.1 Z', 'f-lip', { fill: lip });
      s += path('M105.2 70.4 C107 70.9 113 70.9 114.8 70.4 C113.6 73.3 106.4 73.3 105.2 70.4 Z', 'f-lip', { fill: mix(lip, '#ffffff', 0.08) });
      s += path('M104.9 70.3 C107.5 71 112.5 71 115.1 70.3', 'f-mouth', { stroke: mix(lip, '#000000', 0.38) });
    }
    if (L.beard) {
      s += path('M89.6 56 C89.8 64 91.6 70.5 95.5 75.5 C99.5 80.5 104.5 83 110 83 C115.5 83 120.5 80.5 124.5 75.5 C128.4 70.5 130.2 64 130.4 56 L128.4 56.6 C128 62.6 126 66.8 121.8 69.4 C118.8 71.2 116.2 72.6 114.6 73.6 C112.6 74.6 107.4 74.6 105.4 73.6 C103.8 72.6 101.2 71.2 98.2 69.4 C94 66.8 92 62.6 91.6 56.6 Z', 'f-beard', { fill: L.hairColor });
      s += path('M103.6 69.1 C106 67.4 108.6 67.2 110 67.9 C111.4 67.2 114 67.4 116.4 69.1 C114.2 69.2 112 68.9 110 69.5 C108 68.9 105.8 69.2 103.6 69.1 Z', 'f-beard', { fill: L.hairColor });
    }
    s += hairFront(L);
    return { art: s, clips: clips };
  }

  /* ---------- Body systems (the scan layer) ---------- */
  function tube(d, cls) { return path(d, 'bp-tube-o ' + cls) + path(d, 'bp-tube-i ' + cls); }
  function organs(b) {
    var k = b.organK, o = {};
    var lungR = 'M101.5 111 C95.6 111 90.4 118.4 86.4 128.6 C82.4 139 79.6 151.4 78.6 163.8 C78.1 170.2 79.8 174.4 85 173.8 C91 173.2 97 171.6 101.5 170 C103.5 169.2 104.5 167 104.5 164 L104.5 131 C104.5 124.6 104 114.2 101.5 111 Z';
    var lungL = 'M118.5 111 C124.4 111 129.6 118.4 133.6 128.6 C137.6 139 140.4 151.4 141.4 163.8 C141.9 170.2 140.2 174.4 135 173.8 C131 173.4 127 172.4 123.5 171.2 C121 170.4 119.5 168 120.5 165 C122 160 122.5 155 119.5 151 C117.5 148.5 115.5 146 115.5 140 L115.5 131 C115.5 124.6 116 114.2 118.5 111 Z';
    var airway = 'M108 104 L112 104 L112 122 C114.2 123.4 116.4 126.2 117.8 129.6 L115.6 130.6 C114.4 128 112.4 125.6 110 124.6 C107.6 125.6 105.6 128 104.4 130.6 L102.2 129.6 C103.6 126.2 105.8 123.4 108 122 Z';
    o.lungs = [path(widen(lungR, k), 'bp-shape'), path(widen(lungL, k), 'bp-shape'), path(airway, 'bp-shape'),
               path(widen('M82.2 146.4 C89 145 96.4 143.4 104.5 141.6 M80.4 161 C88 154.6 96 146 104.5 136.4 M139.6 159 C132 153.6 124 145 115.5 136.4', k), 'bp-detail'),
               path('M108.6 108 L111.4 108 M108.6 112 L111.4 112 M108.6 116 L111.4 116 M108.6 120 L111.4 120', 'bp-detail')].join('');
    var heart = 'M104.5 140.6 C104 136 107.6 133.6 111 134.2 C114 134.8 116 133.2 118.6 133.6 C122.6 134.4 125.6 137.8 126.6 142.4 C128.6 151 129 159 125.5 165.5 C123.5 169 120 170.5 117 168.5 C112.5 165.5 107.5 160.5 105 154 C103.8 150 104.8 145 104.5 140.6 Z';
    o.heart = [path(heart, 'bp-shape'), path('M117.6 136.4 C116.6 146 118.6 157 123.6 166 M108.4 140.8 C110.6 139.6 113 139.2 115.4 140', 'bp-detail')].join('');
    var liver = 'M79.5 177 C86 172 100 171 113 172.6 C119.5 173.4 123.5 175.2 123 178 C122.6 180.4 118.6 182 113.4 184.6 C106.6 188.2 99 192.6 91.4 196.4 C87 198.6 82.4 199.6 80.2 197.2 C78 194.8 77.4 189.6 77.6 185 C77.8 181.4 78.2 178.6 79.5 177 Z';
    var stomach = 'M120 177 C122 172.5 132 172 136.5 177 C141 182 141 193 136.5 199.5 C132.5 205 124 207.5 117 204 C113.8 202.4 112.6 199.8 113.4 197.4 C114.2 195.4 116.6 195.2 118.6 195.6 C122 196.2 125.4 194.6 126.6 191 C127.8 187.6 125.4 184 122.6 182.4 C120.4 181.2 119.4 179.2 120 177 Z';
    var colon = 'M89.6 249 L89.6 215 C89.6 210.6 92.6 208 97 208 L123 208 C127.4 208 130.4 210.6 130.4 215 L130.4 246 C130.4 250 127.6 252 123.6 252 L116 252';
    var small = 'M99 216.4 L121 216.4 C124 216.4 124 222.8 121 222.8 L99 222.8 C96 222.8 96 229.2 99 229.2 L121 229.2 C124 229.2 124 235.6 121 235.6 L99 235.6 C96 235.6 96 242 99 242 L118 242';
    o.metabolic = [el('rect', { x: n(CX - 32 * k), y: 174, width: n(64 * k), height: 80, 'class': 'bp-hit' }),
                   tube(widen(colon, k), 'bp-tube--colon'), tube(widen(small, k), 'bp-tube--small'),
                   path(widen(stomach, k), 'bp-shape'), path(widen(liver, k), 'bp-shape')].join('');
    var neck = [[103.4, 85.6, 1.5, 1.9], [103, 91, 1.4, 1.8]], arm = [[CX - b.chest + 4.5, 137.5, 1.8, 2.2], [CX - b.chest + 6.5, 144, 1.6, 2]];
    function pair(p) { return ellipse(p[0], p[1], p[2], p[3], 'bp-shape bp-node') + ellipse(2 * CX - p[0], p[1], p[2], p[3], 'bp-shape bp-node'); }
    o.immune = '<g transform="' + HEAD_T + '">' + el('rect', { x: 92, y: 74, width: 36, height: 30, 'class': 'bp-hit' }) + neck.map(pair).join('') + '</g>' + arm.map(pair).join('');
    var femur = 'M91.2 266.2 C93.6 264.4 97.8 265.2 98.6 268.2 C99.2 270.8 97.6 273 95 273.6 C93.4 274 92.6 275.2 92.4 277.4 L92 320.6 C93.4 321 95.4 322.2 95.6 324.6 C95.8 328.6 93 331.4 89.6 331.4 C86.2 331.4 83.6 328.6 84 324.8 C84.2 322.6 85.8 321.2 87.4 320.6 L87.8 277 C87.8 272.6 88.8 268 91.2 266.2 Z';
    var tibia = 'M84.6 341.5 C84.6 339.8 94.6 339.8 94.6 341.5 C94.6 344.2 93 345.6 92 346.6 L91.8 384 C93.4 384.6 94.2 386.2 93.8 388 C93.4 389.6 91.6 390.4 89.8 390.2 L87.6 390 C86.2 389.8 85.8 388.6 86.4 387.4 L87.6 385.2 L87.4 346.6 C86 345.6 84.6 344 84.6 341.5 Z';
    var fibula = 'M83 345.2 C83 343.6 85.6 343.6 85.6 345.2 L85.2 386.6 C85.2 387.6 83.2 387.6 83.2 386.6 Z';
    var legHit = 'M' + (CX - b.hip - 1) + ' 262 L' + (CX - 2) + ' 262 L' + (CX - 2) + ' 422 L' + (CX - b.hip - 6) + ' 422 Z';
    o.msk = path(both(legHit), 'bp-hit') + [femur, tibia, fibula].map(function (d) { return path(d, 'bp-shape') + path(mirror(d), 'bp-shape'); }).join('') +
            ellipse(89.6, 336.4, 3.4, 4.2, 'bp-shape') + ellipse(2 * CX - 89.6, 336.4, 3.4, 4.2, 'bp-shape');
    var brain = 'M110 26.6 C99.2 25.8 91.6 32.6 91.4 41 C91.3 45.6 94.6 48.2 100.2 47.6 C104.4 47.2 107.6 47.8 110 48.6 C112.4 47.8 115.6 47.2 119.8 47.6 C125.4 48.2 128.7 45.6 128.6 41 C128.4 32.6 120.8 25.8 110 26.6 Z';
    o.brain = '<g transform="' + HEAD_T + '">' + el('rect', { x: 88, y: 12, width: 44, height: 36, 'class': 'bp-hit' }) + path(brain, 'bp-shape') +
              path('M110 27.4 L110 47.8 M95.2 36 C97.6 33.4 100.4 37.4 103.2 34.4 C105 32.6 106.6 33.8 107.6 32.4 M94.2 42.6 C97.2 40.4 99.8 44 103 41.4 C105 39.8 106.4 41.8 108 40.6 M124.8 36 C122.4 33.4 119.6 37.4 116.8 34.4 C115 32.6 113.4 33.8 112.4 32.4 M125.8 42.6 C122.8 40.4 120.2 44 117 41.4 C115 39.8 113.6 41.8 112 40.6', 'bp-detail') + '</g>';
    var ex = b === BODY.m ? 101.7 : 102;
    o.eyes = '<g transform="' + HEAD_T + '">' + el('rect', { x: 93, y: 48.6, width: 34, height: 12.6, 'class': 'bp-hit' }) + ellipse(ex, 54.6, 6.4, 4.4, 'bp-ring') + ellipse(2 * CX - ex, 54.6, 6.4, 4.4, 'bp-ring') + '</g>';
    o.face = '<g transform="' + HEAD_T + '">' + el('ellipse', { cx: CX, cy: 66, rx: 20, ry: 15, 'class': 'bp-hit' }) + '</g>';
    return o;
  }

  /* ---------- Helmet (decoration, in front) ---------- */
  function helmet() {
    var s = '';
    s += ellipse(CX, 55, 40, 44, 'f-glass');
    s += path('M77.4 44 C78.4 30 90 17.6 106 15.2', 'f-glare');
    s += path('M81.6 58 C81 54 81.2 50.4 82 47.4', 'f-glare f-glare--2');
    s += ellipse(139.4, 32, 2.6, 6.4, 'f-glare-dot', { transform: 'rotate(28 139.4 32)' });
    return s;
  }

  /* wrap(id, inner) is supplied by the app and returns the region's link. */
  function svg(look, wrap, label) {
    var L = normalize(look), b = BODY[L.body], st = suit(b), o = organs(b), hd = head(L, { eye: 'cw-eye' });
    var light = mix(L.skin, '#ffffff', 0.06);
    var defs = '<defs>' +
      '<pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" class="hatch-line"/></pattern>' +
      '<filter id="cwglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<linearGradient id="cw-suit" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="s-lo2"/><stop offset=".32" class="s-hi"/><stop offset=".72" class="s-mid"/><stop offset="1" class="s-lo"/></linearGradient>' +
      '<linearGradient id="cw-suit-r" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="s-hi"/><stop offset=".45" class="s-mid"/><stop offset="1" class="s-lo"/></linearGradient>' +
      '<linearGradient id="cw-joint" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="j-hi"/><stop offset="1" class="j-lo"/></linearGradient>' +
      '<linearGradient id="cw-glove" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="g-hi"/><stop offset="1" class="g-lo"/></linearGradient>' +
      '<linearGradient id="cw-boot" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="b-hi"/><stop offset="1" class="b-lo"/></linearGradient>' +
      '<linearGradient id="cw-pack" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="p-hi"/><stop offset="1" class="p-lo"/></linearGradient>' +
      '<radialGradient id="cw-glass" cx=".42" cy=".36" r=".72"><stop offset="0" class="gl-0"/><stop offset=".72" class="gl-1"/><stop offset="1" class="gl-2"/></radialGradient>' +
      '<radialGradient id="cw-face" cx=".44" cy=".42" r=".74"><stop offset="0" stop-color="' + light + '"/><stop offset=".5" stop-color="' + L.skin + '"/><stop offset="1" stop-color="' + L.shade + '"/></radialGradient>' +
      '<linearGradient id="cw-neck" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="' + L.skin + '"/><stop offset="1" stop-color="' + L.shade + '"/></linearGradient>' +
      '<linearGradient id="cw-vshade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="vs-0"/><stop offset="1" class="vs-1"/></linearGradient>' + hd.clips +
      '</defs>';
    var art = '<g class="fig-art" aria-hidden="true">' + st.art +
      '<ellipse cx="110" cy="99" rx="27" ry="6.5" class="f-ring"/><g transform="' + HEAD_T + '">' + hd.art + '</g>' +
      '<path d="M83 99 C83 107.6 137 107.6 137 99" class="f-ring f-ring--front"/></g>';
    var parts = wrap('skin', o.face + path(st.upper, 'bp-tint')) +
      wrap('msk', o.msk) + wrap('metabolic', o.metabolic) + wrap('lungs', o.lungs) + wrap('heart', o.heart) +
      wrap('immune', o.immune) + wrap('eyes', o.eyes) + wrap('brain', o.brain);
    return '<svg viewBox="0 0 220 432" role="group" data-figure="' + L.body + '" aria-label="' + label + '">' + defs + art + parts +
      '<g class="fig-glass" aria-hidden="true">' + helmet() + '</g>' +
      '<text x="110" y="430" text-anchor="middle" class="fig-note">AI-generated illustration</text></svg>';
  }

  return { svg: svg, normalize: normalize, defaultLook: defaultLook, HAIRS: HAIRS };
});
