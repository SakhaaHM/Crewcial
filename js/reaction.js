/*! Crewcial - reaction test, modelled on the published 3-minute PVT-B:
 * a counter appears after a random wait of 1 to 4 seconds and the person taps as
 * fast as they can. Protocol numbers come from data/rules.js (RT-PROTO).
 * Browser and screen timing differ between devices, so a result is compared only
 * with the same person's earlier tests on the same device. This is not NASA's
 * validated Reaction Self Test software.
 * AI-assistance disclosure: generated with Claude (Anthropic) for Team Crewcial,
 * NASA Space Apps Challenge 2026.
 */
(function (root) {
  'use strict';

  function median(a) {
    if (!a.length) { return NaN; }
    var s = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function metricsOf(rts, falseStarts, proto) {
    var speed = 0, lapses = 0;
    rts.forEach(function (rt) { speed += 1000 / rt; if (rt >= proto.lapseMs) { lapses++; } });
    return { n: rts.length, medianRt: Math.round(median(rts)), meanSpeed: rts.length ? Math.round(speed / rts.length * 1000) / 1000 : 0, lapses: lapses, falseStarts: falseStarts };
  }

  /* opts: { proto, durationSec, onDone(metrics), canStart(), blockedText } */
  function mount(el, opts) {
    var proto = opts.proto, duration = opts.durationSec * 1000;
    var clock = function () { return root.performance && root.performance.now ? root.performance.now() : Date.now(); };
    var st = { phase: 'ready', start: 0, stimT: 0, rts: [], falseStarts: 0, raf: 0, waitT: 0, blankT: 0, missT: 0, endT: 0, progT: 0 };

    el.innerHTML =
      '<div class="rt">' +
        '<button type="button" class="rt-pad" id="rt-pad">' +
          '<span class="rt-count" id="rt-count">Start</span>' +
          '<span class="rt-hint" id="rt-hint">Tap here or press the space bar to begin</span>' +
        '</button>' +
        '<div class="rt-bar" aria-hidden="true"><span id="rt-prog"></span></div>' +
        '<div class="rt-foot"><span id="rt-left"></span><button type="button" class="btn btn--quiet" id="rt-stop" hidden>Stop the test</button></div>' +
      '</div>';
    var pad = el.querySelector('#rt-pad'), count = el.querySelector('#rt-count'), hint = el.querySelector('#rt-hint');
    var prog = el.querySelector('#rt-prog'), left = el.querySelector('#rt-left'), stop = el.querySelector('#rt-stop');
    left.textContent = 'Length: ' + (opts.durationSec >= 60 ? (opts.durationSec / 60) + ' minutes' : opts.durationSec + ' seconds');

    function clearAll() {
      clearTimeout(st.waitT); clearTimeout(st.blankT); clearTimeout(st.missT); clearTimeout(st.endT); clearInterval(st.progT);
      if (st.raf) { root.cancelAnimationFrame(st.raf); st.raf = 0; }
    }
    function tick() {
      if (!st.stimT) { return; }
      count.textContent = Math.round(clock() - st.stimT) + ' ms';
      st.raf = root.requestAnimationFrame(tick);
    }
    function schedule() {
      clearTimeout(st.waitT); clearTimeout(st.blankT);
      var wait = proto.isiMinMs + Math.random() * (proto.isiMaxMs - proto.isiMinMs);
      st.waitT = setTimeout(stimulus, wait);
      st.blankT = setTimeout(function () {
        if (st.phase === 'run' && !st.stimT) { count.textContent = ''; hint.textContent = 'Wait for the counter'; }
      }, Math.min(proto.feedbackMs, wait - 50));
    }
    function stimulus() {
      if (st.phase !== 'run') { return; }
      st.stimT = clock();
      pad.classList.add('rt-pad--go'); hint.textContent = 'Tap now';
      tick();
      st.missT = setTimeout(function () {
        if (!st.stimT) { return; }
        st.rts.push(proto.timeoutMs); st.stimT = 0;
        if (st.raf) { root.cancelAnimationFrame(st.raf); st.raf = 0; }
        pad.classList.remove('rt-pad--go'); count.textContent = 'Missed'; hint.textContent = '';
        schedule();
      }, proto.timeoutMs);
    }
    function begin() {
      st.phase = 'run'; st.start = clock(); st.rts = []; st.falseStarts = 0; st.stimT = 0;
      count.textContent = ''; hint.textContent = 'Wait for the counter'; stop.hidden = false;
      pad.classList.add('rt-pad--run');
      st.endT = setTimeout(finish, duration);
      st.progT = setInterval(function () {
        var done = Math.min(1, (clock() - st.start) / duration);
        prog.style.width = (done * 100) + '%';
        left.textContent = Math.max(0, Math.ceil((duration - (clock() - st.start)) / 1000)) + ' seconds left';
      }, 250);
      schedule();
    }
    function respond() {
      if (st.phase === 'ready') {
        /* The alertness question must be answered before the test starts. */
        if (opts.canStart && !opts.canStart()) { hint.textContent = opts.blockedText || 'Answer the question above first'; return; }
        begin(); return;
      }
      if (st.phase !== 'run') { return; }
      var now = clock();
      if (!st.stimT) {                       // tapped before the counter appeared
        st.falseStarts++; count.textContent = 'Too early'; hint.textContent = 'Wait for the counter';
        schedule(); return;
      }
      var rt = now - st.stimT;
      st.stimT = 0; clearTimeout(st.missT);
      if (st.raf) { root.cancelAnimationFrame(st.raf); st.raf = 0; }
      pad.classList.remove('rt-pad--go');
      if (rt < proto.falseStartMs) { st.falseStarts++; count.textContent = 'Too early'; }
      else { st.rts.push(rt); count.textContent = Math.round(rt) + ' ms'; }
      hint.textContent = '';
      schedule();
    }
    function reset(message) {
      clearAll(); st.phase = 'ready'; st.stimT = 0;
      pad.classList.remove('rt-pad--go'); pad.classList.remove('rt-pad--run');
      count.textContent = 'Start'; hint.textContent = message || 'Tap here or press the space bar to begin';
      prog.style.width = '0%'; stop.hidden = true;
      left.textContent = 'Length: ' + (opts.durationSec >= 60 ? (opts.durationSec / 60) + ' minutes' : opts.durationSec + ' seconds');
    }
    function finish() {
      clearAll(); st.phase = 'done'; st.stimT = 0;
      pad.classList.remove('rt-pad--go'); pad.classList.remove('rt-pad--run');
      if (!st.rts.length) { reset('No valid responses, so nothing was saved. Tap to try again.'); return; }
      count.textContent = 'Done'; hint.textContent = 'Saving your result'; stop.hidden = true; prog.style.width = '100%';
      opts.onDone(metricsOf(st.rts, st.falseStarts, proto));
    }

    pad.addEventListener('pointerdown', function (e) { e.preventDefault(); pad.focus(); respond(); });
    pad.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) { respond(); } }
    });
    pad.addEventListener('click', function (e) { e.preventDefault(); });
    stop.addEventListener('click', function () { reset('Test stopped. Nothing was saved.'); });

    return { destroy: clearAll, metricsOf: metricsOf, running: function () { return st.phase === 'run'; } };
  }

  root.Crewcial = root.Crewcial || {};
  root.Crewcial.Reaction = { mount: mount, metricsOf: metricsOf, median: median };
})(typeof self !== 'undefined' ? self : this);
