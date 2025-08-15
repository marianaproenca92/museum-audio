function glitchOnce(){
    board.classList.add('glitch');
    // occasional whole-terminal flicker for drama
    if (Math.random() < 0.35) document.querySelector('.terminal')?.classList.add('flicker');
    setTimeout(()=>{
      board.classList.remove('glitch');
      document.querySelector('.terminal')?.classList.remove('flicker');
    }, 320); // length of the animations
  }

  // Fire at unpredictable intervals
  setInterval(()=>{
    if (Math.random() < 0.12) glitchOnce();  // ~12% chance each tick
  }, 1200);

  // Bonus: manual trigger when user finds a diff
  function flashAndGlitch(msg){
    // your existing flash()
    flash(msg);
    glitchOnce();
  }
  // swap your markFound() call to flash() with flashAndGlitch() if you want the effect on every find

  // Tiny Text Glitch — non-destructive, no DOM rewriting
// Usage: add [data-glitch] to any element. This script auto-primes and runs subtle bursts.
// Also exposes window.gl.pulse(el) for manual pulses and wraps markFound() to pulse #t-sys.

(function () {
  // Copy each [data-glitch] element’s visible text into data-text (for ::before/::after mirrors)
  function primeGlitchTargets(root = document) {
    const els = root.querySelectorAll('[data-glitch]');
    els.forEach(el => {
      if (!el.hasAttribute('data-text')) {
        el.setAttribute('data-text', el.textContent.trim());
      }
    });
    return els;
  }

  // Briefly add/remove the .glitching class
  function pulse(el, dur = 320) {
    if (!el) return;
    el.classList.add('glitching');
    setTimeout(() => el.classList.remove('glitching'), dur);
  }

  // Random ambient bursts within a scope container
  function startBursts(scope = document, { chance = 0.18, min = 800, max = 1600, dur = 320 } = {}) {
    const targets = Array.from(scope.querySelectorAll('[data-glitch]'));
    if (!targets.length) return { stop() {} };

    let stopFlag = false;
    (function tick() {
      if (stopFlag) return;
      if (Math.random() < chance) pulse(targets[(Math.random() * targets.length) | 0], dur);
      setTimeout(tick, min + Math.random() * (max - min));
    })();

    return { stop: () => (stopFlag = true) };
  }

  // Respect reduced motion
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Public shim (so other scripts can trigger pulses)
  const gl = {
    pulse,
    scramble: () => {} // no-op: we don't mutate letters
  };
  window.gl = gl;

  function startAll() {
    if (prefersReducedMotion()) return;

    // Prime and start inside #content (avoids intro overlays)
    const content = document.getElementById('content') || document;
    primeGlitchTargets(content);
    startBursts(content, { chance: 0.18, min: 800, max: 1600, dur: 320 });

    // Nice UX: flicker when hovering any [data-glitch]
    document.addEventListener('pointerenter', (e) => {
      const el = e.target.closest && e.target.closest('[data-glitch]');
      if (el) pulse(el, 280);
    }, { passive: true });

    // If the differences game defines markFound, wrap it to pulse the system line
    const tryWrap = () => {
      if (typeof window.markFound === 'function') {
        const old = window.markFound;
        window.markFound = function wrappedMarkFound(idx) {
          old.call(this, idx);
          const sys = document.querySelector('#t-sys');
          if (sys) pulse(sys, 320);
        };
        return true;
      }
      return false;
    };

    // Wrap immediately if available; otherwise retry a few times (game script may load first anyway)
    if (!tryWrap()) {
      let attempts = 0;
      const id = setInterval(() => {
        attempts++;
        if (tryWrap() || attempts > 10) clearInterval(id);
      }, 200);
    }
  }

  // Run after DOM is ready (and after differences_game.js since it's included before this file)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAll);
  } else {
    startAll();
  }
})();
