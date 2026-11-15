/*! Crewcial - Amsler grid self-test.
 * Geometry follows the standard chart (data/rules.js, AM-PROTO): a 10 cm square
 * of 20 by 20 squares with a centre dot, one eye at a time. The person taps the
 * squares where lines look wavy, blurred or missing. A smaller screen draws a
 * smaller grid and shortens the viewing distance in proportion.
 * This is a screening aid in a prototype, not a validated eye test.
 * AI-assistance disclosure: generated with Claude (Anthropic) for Team Crewcial,
 * NASA Space Apps Challenge 2026.
 */
(function (root) {
  'use strict';
  var DEFAULT_PX_PER_MM = 96 / 25.4;
  var CARD_SHORT_MM = 53.98;   // short edge of a standard bank card (stand-in calibration aid)

  function gridSvg(n, cells, fresh, interactive) {
    var on = {}, isNew = {};
    (cells || []).forEach(function (c) { on[c] = 1; });
    (fresh || []).forEach(function (c) { isNew[c] = 1; });
    var s = '<svg class="am-svg' + (interactive ? ' am-svg--live' : '') + '" viewBox="0 0 ' + n + ' ' + n + '" ' +
            (interactive ? 'role="group" aria-label="Amsler grid. Tap the squares where lines look wavy, blurred or missing."' : 'role="img" aria-label="Amsler grid map with ' + (cells || []).length + ' marked squares"') + '>';
    s += '<rect x="0" y="0" width="' + n + '" height="' + n + '" class="am-bg"/>';
    for (var i = 0; i < n * n; i++) {
      var x = i % n, y = Math.floor(i / n);
      if (interactive || on[i]) {
        s += '<rect x="' + x + '" y="' + y + '" width="1" height="1" data-i="' + i + '" class="am-cell' + (on[i] ? ' am-cell--on' : '') + (isNew[i] ? ' am-cell--new' : '') + '"/>';
      }
    }
    for (var k = 0; k <= n; k++) {
      s += '<line x1="' + k + '" y1="0" x2="' + k + '" y2="' + n + '" class="am-line"/><line x1="0" y1="' + k + '" x2="' + n + '" y2="' + k + '" class="am-line"/>';
    }
    s += '<circle cx="' + (n / 2) + '" cy="' + (n / 2) + '" r="0.24" class="am-dot"/></svg>';
    return s;
  }

  /* opts: { proto, pxPerMm (or null), onCalibrate(pxPerMm), onDone(results, info) } */
  function mount(el, opts) {
    var proto = opts.proto, n = proto.gridN;
    var st = { step: opts.pxPerMm ? 'R' : 'calib', pxPerMm: opts.pxPerMm || DEFAULT_PX_PER_MM, calibrated: !!opts.pxPerMm, marks: { R: {}, L: {} }, results: [], info: null };

    function sizeInfo() {
      var full = proto.sizeMm * st.pxPerMm;
      var avail = Math.max(160, Math.min(el.clientWidth || 320, (root.innerHeight || 700) - 220));
      var size = Math.min(full, avail);
      var scaled = size < full - 1;
      return { size: size, scaled: scaled, distanceCm: Math.max(8, Math.round(proto.distanceCm * size / full)), percent: Math.round(size / full * 100) };
    }
    function drawCalib() {
      el.innerHTML =
        '<div class="am-cal">' +
          '<h2>Set your screen size</h2>' +
          '<p>Hold the short edge of a bank card under the bar. Move the slider until the bar is exactly as wide as the card. Crewcial can then draw the grid at its true size.</p>' +
          '<div class="am-bar" id="am-bar"></div>' +
          '<label class="vh" for="am-size">Bar width</label>' +
          '<input type="range" id="am-size" min="2.5" max="9" step="0.01" value="' + st.pxPerMm.toFixed(2) + '">' +
          '<div class="row"><button type="button" class="btn btn--primary" id="am-cal-save">Save screen size</button>' +
          '<button type="button" class="btn btn--quiet" id="am-cal-skip">Skip this step</button></div>' +
          '<p class="hint">If you skip, the grid size is a guess and the result is marked as not calibrated.</p>' +
        '</div>';
      var bar = el.querySelector('#am-bar'), slider = el.querySelector('#am-size');
      function setBar() { bar.style.width = (CARD_SHORT_MM * parseFloat(slider.value)) + 'px'; }
      setBar();
      slider.addEventListener('input', setBar);
      el.querySelector('#am-cal-save').addEventListener('click', function () {
        st.pxPerMm = parseFloat(slider.value); st.calibrated = true;
        if (opts.onCalibrate) { opts.onCalibrate(st.pxPerMm); }
        st.step = 'R'; draw();
      });
      el.querySelector('#am-cal-skip').addEventListener('click', function () { st.calibrated = false; st.step = 'R'; draw(); });
    }
    function drawEye(eye) {
      var info = sizeInfo(); st.info = info;
      var other = eye === 'R' ? 'left' : 'right', name = eye === 'R' ? 'Right eye' : 'Left eye';
      var cells = Object.keys(st.marks[eye]).map(Number);
      el.innerHTML =
        '<div class="am-eye">' +
          '<h2>' + name + (eye === 'R' ? ' (1 of 2)' : ' (2 of 2)') + '</h2>' +
          '<ol class="steps">' +
            '<li>Wear your reading correction if you use one.</li>' +
            '<li>Cover your ' + other + ' eye.</li>' +
            '<li>Hold the screen about <strong>' + info.distanceCm + ' cm</strong> from your eye.</li>' +
            '<li>Look only at the centre dot.</li>' +
            '<li>Tap every square where lines look wavy, blurred or missing.</li>' +
          '</ol>' +
          '<div class="am-wrap" id="am-wrap">' + gridSvg(n, cells, [], true) + '</div>' +
          '<p class="hint">' + (info.scaled ? 'This screen is too small for the full 10 cm grid, so it is drawn at ' + info.percent + '% and the viewing distance is shortened to match. ' : '') +
            (st.calibrated ? '' : 'Screen size not calibrated.') + '</p>' +
          '<div class="row">' +
            '<button type="button" class="btn" id="am-normal">Lines look normal in this eye</button>' +
            '<button type="button" class="btn btn--primary" id="am-save">Save ' + cells.length + ' marked square' + (cells.length === 1 ? '' : 's') + '</button>' +
          '</div>' +
        '</div>';
      var wrap = el.querySelector('#am-wrap'), save = el.querySelector('#am-save');
      wrap.style.width = info.size + 'px'; wrap.style.height = info.size + 'px';
      save.disabled = cells.length === 0;
      wrap.addEventListener('click', function (e) {
        var t = e.target, i = t && t.getAttribute ? t.getAttribute('data-i') : null;
        if (i === null) { return; }
        if (st.marks[eye][i]) { delete st.marks[eye][i]; t.classList.remove('am-cell--on'); }
        else { st.marks[eye][i] = 1; t.classList.add('am-cell--on'); }
        var c = Object.keys(st.marks[eye]).length;
        save.textContent = 'Save ' + c + ' marked square' + (c === 1 ? '' : 's');
        save.disabled = c === 0;
      });
      function next(list) {
        st.results.push({ eye: eye, cells: list.sort(function (a, b) { return a - b; }) });
        if (eye === 'R') { st.step = 'L'; draw(); }
        else { opts.onDone(st.results, { gridN: n, calibrated: st.calibrated, scaled: info.scaled, percent: info.percent }); }
      }
      el.querySelector('#am-normal').addEventListener('click', function () { st.marks[eye] = {}; next([]); });
      save.addEventListener('click', function () { next(Object.keys(st.marks[eye]).map(Number)); });
    }
    function draw() { if (st.step === 'calib') { drawCalib(); } else { drawEye(st.step); } }
    draw();
    return { destroy: function () {} };
  }

  root.Crewcial = root.Crewcial || {};
  root.Crewcial.Amsler = { mount: mount, gridSvg: gridSvg };
})(typeof self !== 'undefined' ? self : this);
