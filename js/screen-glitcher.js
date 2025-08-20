/*!
 * TerminalGlitch v1.3 — realistic CRT terminal failings
 * - RGB tears now vary per pass in focus/size/offset (subtle + believable)
 * - Keeps shake (vhold) OFF by default; enable via data-glitch-modes if wanted
 *
 * Recommended <body> setup:
 *   <body
 *     data-glitch="on"
 *     data-glitch-level="subtle"                 // try medium/heavy for evaluation
 *     data-glitch-modes="tear flicker fringe"    // includes colored fringe; no vhold (shake)
 *     data-fringe-strength="0.12"                 // 0..0.5; default 0.08
 *     data-rgb-tear-variance="1.0"               // 0..2; higher = more variation (default 1)
 *     data-texttear="off">
 */
(function (window, document) {
  'use strict';

  const ALLOWED_MODES = new Set(['tear', 'flicker', 'glitch', 'vhold', 'fringe']); // "glitch" aliases to "flicker"
  const DEFAULTS = {
    on: true,
    level: 'subtle',               // subtle | medium | heavy
    modes: ['tear', 'flicker', 'fringe'], // no vhold by default (no shake)
    textTear: false,
    fringeStrength: 0.08,          // base opacity for color fringe layer
    rgbTearVariance: 1.0           // 0..2 — scales randomness in RGB tear focus/size
  };

  const State = {
    enabled: true,
    reduce: false,
    level: 'subtle',
    modes: new Set(DEFAULTS.modes),
    textTear: false,
    running: false,
    rafs: new Set(),
    timers: new Set(),
    fringeBase: DEFAULTS.fringeStrength,
    rgbVar: DEFAULTS.rgbTearVariance
  };

  const Dom = {
    styleEl: null,
    overlay: null,
    scan: null,
    tear: null,
    tearR: null,
    tearC: null,
    dimmer: null,
    fringe: null,
  };

  // ---------- utilities ----------
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const rnd = (min, max) => Math.random() * (max - min) + min;
  const now = () => performance.now();

  function addTimer(id) { State.timers.add(id); return id; }
  function clearAllTimers() { State.timers.forEach(id => clearTimeout(id)); State.timers.clear(); }
  function addRaf(id) { State.rafs.add(id); return id; }
  function clearAllRafs() { State.rafs.forEach(id => cancelAnimationFrame(id)); State.rafs.clear(); }

  function readDataset() {
    const ds = (document.body && document.body.dataset) || {};
    const on = (ds.glitch || 'on') !== 'off';
    const level = (ds.glitchLevel || DEFAULTS.level).toLowerCase();
    let modes = (ds.glitchModes || DEFAULTS.modes.join(' '))
      .split(/\s+/g)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    modes = modes.map(m => m === 'glitch' ? 'flicker' : m).filter(m => ALLOWED_MODES.has(m));
    const textTear = (ds.texttear || 'off') === 'on';
    const fringeStrength = parseFloat(ds.fringeStrength || DEFAULTS.fringeStrength);
    const rgbTearVariance = parseFloat(ds.rgbTearVariance || ds.rgbTearvariance || ds.rgbtearVariance || ds.rgbtearvariance || DEFAULTS.rgbTearVariance);

    return { on, level, modes, textTear, fringeStrength, rgbTearVariance };
  }

  function applyOptions(opts) {
    const o = Object.assign({}, DEFAULTS, opts || {}, readDataset());
    State.enabled = !!o.on;
    State.level = ['subtle','medium','heavy'].includes(o.level) ? o.level : 'subtle';
    State.modes = new Set((o.modes && o.modes.length ? o.modes : DEFAULTS.modes).filter(m => ALLOWED_MODES.has(m)));
    State.textTear = !!o.textTear;
    State.reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    State.fringeBase = clamp(isFinite(o.fringeStrength) ? o.fringeStrength : DEFAULTS.fringeStrength, 0, 0.5);
    State.rgbVar = clamp(isFinite(o.rgbTearVariance) ? o.rgbTearVariance : DEFAULTS.rgbTearVariance, 0, 2);
  }

  // ---------- DOM / CSS ----------
  const CSS = `
  .tg-overlay{position:fixed;inset:0;pointer-events:none;z-index:2147483647;}
  .tg-scan{position:absolute;inset:0;opacity:.22;background:
    repeating-linear-gradient(to bottom,rgba(255,255,255,0.02) 0 1px,rgba(0,0,0,0.02) 1px 2px)}
  .tg-tear{position:absolute;left:0;width:100%;height:14px;opacity:0;transform:translateY(-20px);
    background:linear-gradient(to bottom,rgba(255,255,255,0)0,rgba(255,255,255,.28)50%,rgba(255,255,255,0)100%);
    filter:blur(.2px);will-change:transform,opacity}
  /* RGB tear fringes — height/blur adjusted per pass */
  .tg-tear-r,.tg-tear-c{position:absolute;left:0;width:100%;height:3px;opacity:0;transform:translateY(-20px);will-change:transform,opacity,filter}
  .tg-tear-r{background:linear-gradient(to bottom,rgba(255,0,0,0)0,rgba(255,0,0,.55)50%,rgba(255,0,0,0)100%)}
  .tg-tear-c{background:linear-gradient(to bottom,rgba(0,255,255,0)0,rgba(0,255,255,.55)50%,rgba(0,255,255,0)100%)}
  .tg-dimmer{position:absolute;inset:0;opacity:var(--tg-flicker, 0);
    background:radial-gradient(ellipse at center,rgba(255,255,255,0) 0%,rgba(0,0,0,.05) 70%,rgba(0,0,0,.22) 100%)}
  .tg-fringe{position:absolute;inset:0;mix-blend-mode:screen;}
  .tg-fringe::before,.tg-fringe::after{content:"";position:absolute;inset:0}
  .tg-fringe::before{transform:translateX(.6px);background:linear-gradient(90deg,rgba(255,0,0,.28),transparent 40%,transparent 60%,rgba(0,255,255,.28))}
  .tg-fringe::after{transform:translateX(-.6px);background:linear-gradient(90deg,rgba(0,255,0,.22),transparent 40%,transparent 60%,rgba(255,0,255,.22))}
  html.tg-vshift body{transform:translateY(-.6px);} /* used only if vhold enabled */
  @media (prefers-reduced-motion: reduce){
    .tg-scan{opacity:.12}
    html.tg-vshift body{transform:none}
  }
  /* text shimmer (brief) */
  .tg-text-shimmer{position:relative}
  .tg-text-shimmer::after{content:attr(data-glitch-label);position:absolute;left:0;top:0;right:0;bottom:0;opacity:.3;filter:blur(.3px);}
  `;

  function ensureDom() {
    if (Dom.overlay) return;
    Dom.styleEl = document.createElement('style');
    Dom.styleEl.id = 'tg-styles';
    Dom.styleEl.textContent = CSS;
    document.head.appendChild(Dom.styleEl);

    Dom.overlay = document.createElement('div');
    Dom.overlay.className = 'tg-overlay';

    Dom.scan = document.createElement('div');
    Dom.scan.className = 'tg-scan';

    Dom.tear = document.createElement('div');
    Dom.tear.className = 'tg-tear';

    Dom.tearR = document.createElement('div');
    Dom.tearR.className = 'tg-tear-r';

    Dom.tearC = document.createElement('div');
    Dom.tearC.className = 'tg-tear-c';

    Dom.dimmer = document.createElement('div');
    Dom.dimmer.className = 'tg-dimmer';

    Dom.fringe = document.createElement('div');
    Dom.fringe.className = 'tg-fringe';
    Dom.fringe.style.opacity = String(State.fringeBase);

    Dom.overlay.appendChild(Dom.scan);
    Dom.overlay.appendChild(Dom.tear);
    Dom.overlay.appendChild(Dom.tearR);
    Dom.overlay.appendChild(Dom.tearC);
    Dom.overlay.appendChild(Dom.dimmer);
    document.body.appendChild(Dom.overlay);
  }

  function destroyDom() {
    if (Dom.overlay && Dom.overlay.parentNode) Dom.overlay.parentNode.removeChild(Dom.overlay);
    if (Dom.styleEl && Dom.styleEl.parentNode) Dom.styleEl.parentNode.removeChild(Dom.styleEl);
    Dom.styleEl = Dom.overlay = Dom.scan = Dom.tear = Dom.tearR = Dom.tearC = Dom.dimmer = Dom.fringe = null;
  }

  // ---------- effects ----------
  function scheduleTear() {
    if (!State.modes.has('tear') || State.reduce) return; // skip with reduced motion
    const [min,max] = freqForLevel('tear');
    addTimer(setTimeout(() => { doTear(); scheduleTear(); }, rnd(min, max)));
  }

  function doTear() {
    if (!Dom.overlay) return;
    const h = window.innerHeight + 40; // travel distance
    const startY = -20, endY = h;

    // ---- Per-pass randomization for realistic focus/size ----
    const v = State.rgbVar; // 0..2 variance scale

    // Base white tear height slightly varies (focus breathing)
    const baseTearH = clamp(14 * (1 + (Math.random()-0.5) * 0.25 * v), 10, 18);
    Dom.tear.style.height = baseTearH + 'px';

    // Colored fringes: height/blur/opacity/vertical offset vary subtly per pass
    const rH = clamp(rnd(2,5) * (1 + (v-1)*0.6), 1.5, 6);
    const cH = clamp(rnd(2,5) * (1 + (v-1)*0.6), 1.5, 6);
    Dom.tearR.style.height = rH + 'px';
    Dom.tearC.style.height = cH + 'px';

    const rBlur = clamp(rnd(0.15, 1.1) * (1 + (v-1)*0.8), 0, 2.0);
    const cBlur = clamp(rnd(0.15, 1.1) * (1 + (v-1)*0.8), 0, 2.0);
    Dom.tearR.style.filter = `blur(${rBlur}px)`;
    Dom.tearC.style.filter = `blur(${cBlur}px)`;

    const rOp = clamp(rnd(0.58, 0.9), 0.4, 1);
    const cOp = clamp(rnd(0.58, 0.9), 0.4, 1);
    Dom.tearR.style.opacity = String(rOp);
    Dom.tearC.style.opacity = String(cOp);

    // Separation and vertical offsets (simulate misaligned guns / scan)
    const sepAmp = clamp(rnd(0.6, 1.6) * (1 + (v-1)*0.5), 0.4, 2.2);
    const vOffBase = clamp(rnd(1.0, 3.2) * (1 + (v-1)*0.5), 0.6, 4.0);
    const rYoff = vOffBase * rnd(0.8, 1.2);
    const cYoff = vOffBase * rnd(0.8, 1.2);

    Dom.tear.style.opacity = '0.26';
    if (State.modes.has('fringe')) {
      pulseFringe(Math.max(0.22, State.fringeBase + 0.12), 220);
    }

    const dur = durForLevel('tear');
    const t0 = now();
    function step(t) {
      const k = clamp((t - t0) / dur, 0, 1);
      const y = startY + (endY - startY) * k;
      Dom.tear.style.transform = `translateY(${y}px)`;
      if (State.modes.has('fringe')) {
        // Opposite X offsets with a hint of noise and breathing to simulate focus drift
        const wob = Math.sin(t*0.035) * sepAmp + (Math.random()-0.5) * 0.3 * v; // px
        const rDx = Math.abs(wob);
        const cDx = -Math.abs(wob);
        Dom.tearR.style.transform = `translateY(${y - rYoff}px) translateX(${rDx}px)`;
        Dom.tearC.style.transform = `translateY(${y + cYoff}px) translateX(${cDx}px)`;
      }
      if (k < 1 && State.running) addRaf(requestAnimationFrame(step));
      else {
        Dom.tear.style.opacity = '0';
        Dom.tear.style.transform = `translateY(${startY}px)`;
        Dom.tearR.style.opacity = '0';
        Dom.tearC.style.opacity = '0';
        Dom.tearR.style.transform = `translateY(${startY - rYoff}px)`;
        Dom.tearC.style.transform = `translateY(${startY + cYoff}px)`;
      }
    }
    addRaf(requestAnimationFrame(step));
  }

  // ---- FLICKER (replaces shake by default) ----
  function scheduleFlicker() {
    if (!(State.modes.has('flicker') || State.modes.has('glitch'))) return;
    const [min,max] = freqForLevel('flicker');
    addTimer(setTimeout(() => { flickerBurst(); scheduleFlicker(); }, rnd(min, max)));
  }

  function setFlicker(v) {
    if (!Dom.dimmer) return;
    const val = clamp(v, 0, 0.6); // tasteful cap
    Dom.dimmer.style.setProperty('--tg-flicker', String(val));
    if (State.modes.has('fringe') && Dom.fringe) {
      // raise fringe with flicker for visibility
      Dom.fringe.style.opacity = String(clamp(State.fringeBase + val*0.7, 0, 0.5));
    }
  }

  function pulseFringe(targetOpacity, ms) {
    if (!Dom.fringe) return;
    const start = parseFloat(Dom.fringe.style.opacity || State.fringeBase);
    Dom.fringe.style.opacity = String(clamp(targetOpacity, 0, 0.5));
    addTimer(setTimeout(() => { Dom.fringe && (Dom.fringe.style.opacity = String(start)); }, ms || 180));
  }

  function flickerBurst(intensity) {
    let amp;
    if (typeof intensity === 'number') amp = clamp(intensity, 0.04, 0.6);
    else {
      const lvl = intensity || State.level;
      amp = lvl === 'heavy' ? rnd(0.22,0.42) : lvl === 'medium' ? rnd(0.14,0.28) : rnd(0.08,0.18);
    }
    const pattern = pick(['pop','stutter','flutter']);
    if (pattern === 'pop') return flickerPop(amp);
    if (pattern === 'stutter') return flickerStutter(amp);
    return flickerFlutter(amp);
  }

  function flickerPop(amp) {
    const t0 = now();
    const up = rnd(50,110), down = rnd(80,160);
    function step(t) {
      const k = t - t0;
      if (k <= up) setFlicker(amp * easeOutQuad(k/up));
      else if (k <= up + down) setFlicker(amp * (1 - easeInQuad((k - up)/down)));
      else { setFlicker(0); return; }
      addRaf(requestAnimationFrame(step));
    }
    addRaf(requestAnimationFrame(step));
  }

  function flickerStutter(amp) {
    const blips = Math.round(rnd(2,4));
    let i = 0;
    function one() {
      if (i++ >= blips) { setFlicker(0); return; }
      const a = amp * rnd(0.6, 1);
      setFlicker(a);
      addTimer(setTimeout(() => { setFlicker(0); addTimer(setTimeout(one, rnd(30, 110))); }, rnd(40, 120)));
    }
    one();
  }

  function flickerFlutter(amp) {
    const t0 = now();
    const dur = rnd(260, 820);
    function step(t) {
      const k = (t - t0) / dur;
      if (k >= 1) { setFlicker(0); return; }
      const s = (Math.sin(t*0.06) + Math.sin(t*0.17 + 1.4)) * 0.25 + 0.5; // 0..1
      const n = (Math.random() - 0.5) * 0.3; // noise
      setFlicker(clamp((s + n) * amp, 0, amp));
      addRaf(requestAnimationFrame(step));
    }
    addRaf(requestAnimationFrame(step));
  }

  // Optional: vhold (kept for compatibility if user explicitly enables it)
  function scheduleVHold() {
    if (!State.modes.has('vhold') || State.reduce) return;
    const [min,max] = freqForLevel('vhold');
    addTimer(setTimeout(() => { doVHold(rnd(70, 160)); scheduleVHold(); }, rnd(min, max)));
  }
  function doVHold(ms) {
    document.documentElement.classList.add('tg-vshift');
    addTimer(setTimeout(() => document.documentElement.classList.remove('tg-vshift'), clamp(ms, 60, 200)));
  }

  function scheduleTextShimmer() {
    if (!State.textTear || State.reduce) return;
    const [min,max] = freqForLevel('text');
    addTimer(setTimeout(() => { shimmerOnce(); scheduleTextShimmer(); }, rnd(min, max)));
  }

  function shimmerOnce() {
    const candidates = Array.from(document.querySelectorAll('[data-glitch]')).filter(el => el.offsetParent !== null);
    if (!candidates.length) return;
    const el = candidates[Math.floor(Math.random()*candidates.length)];
    const label = el.textContent.trim();
    el.setAttribute('data-glitch-label', label);
    el.classList.add('tg-text-shimmer');
    addTimer(setTimeout(() => el.classList.remove('tg-text-shimmer'), 90));
  }

  // helpers for frequencies/durations based on intensity level
  function freqForLevel(kind) {
    switch (State.level) {
      case 'heavy':
        if (kind === 'tear') return [2600, 5200];
        if (kind === 'flicker') return [1400, 3400];
        if (kind === 'vhold') return [3600, 7200];
        return [4500, 9000]; // text shimmer
      case 'medium':
        if (kind === 'tear') return [5200, 11000];
        if (kind === 'flicker') return [2600, 7200];
        if (kind === 'vhold') return [7600, 14000];
        return [9000, 16000];
      default: // subtle
        if (kind === 'tear') return [9000, 17000];
        if (kind === 'flicker') return [5200, 12000];
        if (kind === 'vhold') return [12000, 22000];
        return [14000, 26000];
    }
  }

  function durForLevel(kind) {
    switch (State.level) {
      case 'heavy': return kind === 'tear' ? 900 : 160; // ms
      case 'medium': return kind === 'tear' ? 800 : 140;
      default: return kind === 'tear' ? 720 : 120;
    }
  }

  // ---------- public API ----------
  function start() {
    if (State.running) return;
    applyOptions();
    if (!State.enabled) return;

    ensureDom();

    if (State.modes.has('fringe') && !State.reduce && !Dom.fringe.parentNode) {
      Dom.fringe.style.opacity = String(State.fringeBase);
      Dom.overlay.appendChild(Dom.fringe); // sits on top of dimmer
    }

    State.running = true;

    scheduleTear();
    scheduleFlicker();
    scheduleVHold(); // only if user enabled it
    scheduleTextShimmer();
  }

  function stop() {
    State.running = false;
    clearAllTimers();
    clearAllRafs();
    if (Dom.overlay) {
      setFlicker(0);
      if (Dom.fringe) Dom.fringe.style.opacity = String(State.fringeBase);
      document.documentElement.classList.remove('tg-vshift');
      destroyDom();
    }
  }

  function glitchOnce(intensity = 'subtle') {
    // Quick tear + visible flicker + fringe pulse
    const prev = State.level;
    State.level = ['subtle','medium','heavy'].includes(intensity) ? intensity : prev;
    if (State.modes.has('fringe')) pulseFringe(Math.max(0.26, State.fringeBase + 0.16), 220);
    doTear();
    flickerBurst(intensity);
    State.level = prev;
  }

  function panic(ms = 1200) {
    if (State.reduce) { flickerBurst('medium'); return; }
    const endAt = Date.now() + ms;
    (function loop() {
      if (Date.now() > endAt || !State.running) { setFlicker(0); if (Dom.fringe) Dom.fringe.style.opacity = String(State.fringeBase); return; }
      if (State.modes.has('fringe')) pulseFringe(Math.max(0.28, State.fringeBase + 0.2), 160);
      flickerBurst('heavy');
      addTimer(setTimeout(loop, rnd(70, 160)));
    })();
  }

  const TerminalGlitch = {
    init: (opts) => { if (State.running) return; applyOptions(opts); start(); },
    stop,
    glitchOnce,
    panic,
    textTear: {
      burst(times = 3, withinMs = 600) {
        if (State.reduce) return;
        const els = Array.from(document.querySelectorAll('[data-glitch]'));
        if (!els.length) return;
        const step = () => {
          els.forEach(el => {
            const label = el.textContent.trim();
            el.setAttribute('data-glitch-label', label);
            el.classList.add('tg-text-shimmer');
            addTimer(setTimeout(() => el.classList.remove('tg-text-shimmer'), 90));
          });
        };
        for (let i=0;i<times;i++) addTimer(setTimeout(step, rnd(0, withinMs)));
      }
    }
  };

  // expose
  window.TerminalGlitch = TerminalGlitch;

  // auto-init: wait for loader:done if it fires, otherwise DOM ready fallback
  function autoInit() {
    applyOptions();
    if (!State.enabled) return;
    start();
  }

  let started = false;
  function tryStart() { if (!started) { started = true; autoInit(); } }

  window.addEventListener('loader:done', tryStart, { once: true });
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    addTimer(setTimeout(tryStart, 600));
  } else {
    document.addEventListener('DOMContentLoaded', () => addTimer(setTimeout(tryStart, 600)), { once: true });
  }

  // ----- helpers -----
  function easeOutQuad(t){return 1-(1-t)*(1-t)}
  function easeInQuad(t){return t*t}
  function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}

})(window, document);
