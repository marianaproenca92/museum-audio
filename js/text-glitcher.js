/*! TextGlitcher v1.0 – reusable text glitch & scrambler (PT-PT safe copy) */
(function (root) {
  const rnd = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;

  function ensureDataText(el){
    // Keep data-text in sync so ::before/::after show the same content
    if (!el) return;
    el.dataset.text = el.textContent.trim();
  }

  function pulse(el){
    if (!el) return;
    el.classList.add('glx-slice','glx-flicker');
    setTimeout(()=> el.classList.remove('glx-slice','glx-flicker'), 320);
  }

  // Letter scrambler – short, recover original, spoiler-safe
  function scramble(el, opts={}){
    if (!el || el.dataset.scrambling === '1') return;
    const duration = opts.duration ?? rnd(150, 300);
    const density  = opts.density  ?? 0.4;   // how much to scramble initially
    const charset  = opts.charset  ?? "!#%&*+?@/\\|[]{}<>-_=~";
    const original = el.textContent;
    let t = 0; el.dataset.scrambling = '1';

    const tick = ()=>{
      const out = original.split('').map((ch)=>{
        if (ch === ' ') return ' ';
        if (t < duration*0.6 && Math.random() < density)  return charset[rnd(0, charset.length-1)];
        if (t < duration && Math.random() < 0.15)         return charset[rnd(0, charset.length-1)];
        return ch;
      }).join('');
      el.textContent = out; ensureDataText(el);
      t += 30;
      if (t < duration) requestAnimationFrame(tick);
      else { el.textContent = original; ensureDataText(el); el.dataset.scrambling = '0'; }
    };
    tick();
  }

  // Auto loop that randomly glitches provided targets
  function startAutoLoop(targets, options={}){
    const tickMs = options.tickMs ?? 1200;
    const chance = options.chance ?? 0.18;
    const scramChance = options.scrambleChance ?? 0.6;

    // keep data-text mirrored
    const sync = ()=> targets.forEach(ensureDataText);
    sync();
    const mo = new MutationObserver(sync);
    targets.forEach(el => mo.observe(el, { characterData:true, subtree:true, childList:true }));

    const id = setInterval(()=>{
      if (targets.length === 0) return;
      if (Math.random() < chance){
        const el = targets[rnd(0, targets.length-1)];
        pulse(el);
        if (Math.random() < scramChance) scramble(el);
      }
    }, tickMs);
    return ()=> clearInterval(id);
  }

  function markTargets(selectors){
    // Add .glx and data-text to each match
    const nodes = [];
    selectors.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        if (!el.classList.contains('glx')) el.classList.add('glx');
        ensureDataText(el);
        nodes.push(el);
      });
    });
    return nodes;
  }

  // Public API
  const API = {
    init(opts={}){
      // opts.targets: CSS selectors to target (array or string)
      // opts.auto: start auto loop (boolean)
      // opts.autoOptions: { tickMs, chance, scrambleChance }
      const sel = Array.isArray(opts.targets) ? opts.targets : (opts.targets ? [opts.targets] : []);
      const targets = markTargets(sel);
      let stop = null;
      if (opts.auto) stop = startAutoLoop(targets, opts.autoOptions || {});
      return { targets, stop, pulse, scramble };
    },
    pulse,
    scramble,
    markTargets,
    startAutoLoop
  };

  root.TextGlitcher = API;
})(window);
