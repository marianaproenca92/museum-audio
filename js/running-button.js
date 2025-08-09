// js/runaway_button.js
function initRunawayButton(opts = {}) {
  const sel = (q) => typeof q === 'string' ? document.querySelector(q) : q;
  const btn   = sel(opts.btn || '#runaway-btn');
  const audio = sel(opts.audio || '#ritual-audio');
  const PADDING = Number.isFinite(opts.padding) ? opts.padding : 20;

  if (!btn) return;

  // Preparar medição segura
  const _preStyle = { vis: btn.style.visibility, disp: btn.style.display };
  btn.style.visibility = 'hidden';
  btn.style.display = 'block';

  requestAnimationFrame(() => {
    move(true);
    btn.style.visibility = _preStyle.vis || 'visible';
    btn.style.display    = _preStyle.disp  || 'block';
  });

    btn.addEventListener('pointerenter', () => move(), { passive: true });
    btn.addEventListener('pointermove',  () => move(), { passive: true });
    btn.addEventListener('pointerdown',  () => move(), { passive: true });
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') move(); }, { passive: true });


  btn.addEventListener('click', () => {
    btn.style.display = 'none';
    if (audio) {
      audio.style.display = 'block';
      audio.play().catch(()=>{});
      if (typeof opts.onPlay === 'function') opts.onPlay();
    }
  });

  window.addEventListener('resize', clamp, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(clamp, 240), { passive: true });

  function vwvh() {
    const vw = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    const vh = Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight);
    return { vw, vh };
  }
  function measure() {
    const r = btn.getBoundingClientRect();
    return { w: r.width || btn.offsetWidth || 200, h: r.height || btn.offsetHeight || 60 };
  }
  function bounds() {
    const { vw, vh } = vwvh();
    const { w, h } = measure();
    return {
      minX: PADDING,
      minY: PADDING,
      maxX: Math.max(PADDING, vw - w - PADDING),
      maxY: Math.max(PADDING, vh - h - PADDING)
    };
  }
  function clamp() {
    const { minX, minY, maxX, maxY } = bounds();
    const r = btn.getBoundingClientRect();
    let x = Math.min(Math.max(r.left, minX), maxX);
    let y = Math.min(Math.max(r.top,  minY), maxY);
    btn.style.left = x + 'px';
    btn.style.top  = y + 'px';
  }
  function move(initial=false) {
    const { minX, minY, maxX, maxY } = bounds();
    if (maxX <= minX || maxY <= minY) {
      btn.style.left = minX + 'px';
      btn.style.top  = minY + 'px';
      return;
    }
    // evita saltos mínimos (parece “teleporte” inútil)
    const r = btn.getBoundingClientRect();
    let nx, ny, tries = 0;
    do {
      nx = Math.round(minX + Math.random() * (maxX - minX));
      ny = Math.round(minY + Math.random() * (maxY - minY));
      tries++;
    } while (tries < 8 && Math.hypot(nx - r.left, ny - r.top) < 40);
    btn.style.left = nx + 'px';
    btn.style.top  = ny + 'px';
    if (initial) requestAnimationFrame(clamp);
  }
}

window.initRunawayButton = initRunawayButton;
