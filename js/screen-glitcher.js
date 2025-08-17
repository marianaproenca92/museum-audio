/*
  screen-glitcher.fixed.js — terminal‑authentic
  ------------------------------------------------------------
  Replaces "white flash" and "camera shake" with subtle CRT‑like effects:
   • Tear bar (soft)
   • Raster roll (scanline drift) + phosphor dim
   • V‑hold slip (tiny vertical drift & snap)
   • Optional light RGB fringe

  Keeps TEXT TEAR system intact.
  Loads after your loader (the script already waits for 'loader:done').

  Public API (compatible + extended):
    TerminalGlitch.glitchOnce('tear'|'glitch'|'raster'|'vhold'|'bug')
    TerminalGlitch.panic(ms)
    TerminalGlitch.textTear.burst(ms)
    TerminalGlitch.stop()
*/
(function(){
  'use strict';

  // ----------------------- utils -----------------------
  const $ = (q,el=document)=>el.querySelector(q);
  const $$ = (q,el=document)=>Array.from(el.querySelectorAll(q));
  const rnd = (min,max)=> min + Math.random()*(max-min);
  const wait = (ms)=> new Promise(res=> setTimeout(res, ms));
  const prefersReduced = ()=> window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  // ----------------------- CSS -------------------------
  const CSS = `
  :root{ --tg-acc: var(--accent, #28ff7a); --tg-glow: rgba(39,255,140,.35); --tg-scan: color-mix(in oklab, var(--scanline,#0b1a0f) 55%, transparent); }
  .tg-root{ position: relative; }
  .tg-overlay{ position: absolute; inset: 0; pointer-events:none; }

  /* Static scanlines overlay */
  .tg-scanlines{ background: repeating-linear-gradient(0deg, transparent 0 2px, var(--tg-scan) 2px 3px); mix-blend-mode: overlay; opacity:.18; }

  /* Tear bar — lower contrast + slower scroll */
  .tg-tear{ background: linear-gradient(180deg, transparent 0 45%, rgba(255,255,255,.035) 47%, transparent 50%, rgba(0,0,0,.06) 52%, transparent 55%); background-size: 100% 26px; opacity:0; }
  @keyframes tg-tear-scroll{ from{ background-position-y: 0 } to{ background-position-y: 26px } }
  .tg-tear.on{ opacity:.18; animation: tg-tear-scroll .22s linear infinite; }

  /* Phosphor dim — brief overall brightness dip */
  .tg-dim{ opacity:0; background: radial-gradient(120% 80% at 50% 50%, rgba(0,0,0,.22), rgba(0,0,0,.35)); }
  @keyframes tg-dim-pulse{ 0%{opacity:0} 40%{opacity:.28} 100%{opacity:0} }
  .tg-dim.on{ animation: tg-dim-pulse .20s ease-out; }

  /* V‑hold slip — tiny vertical drift & snap */
  @keyframes tg-vhold-snap{ 0%{ transform: translateY(0) } 60%{ transform: translateY(-1.2px) } 100%{ transform: translateY(0) } }
  .tg-vhold .terminal{ animation: tg-vhold-snap .18s steps(3,end); }

  /* RGB fringe — lighter, tighter */
  .tg-rgb .terminal{ position:relative; }
  .tg-rgb .terminal::before,
  .tg-rgb .terminal::after{ content:""; position:absolute; inset:-1px; pointer-events:none; mix-blend-mode:screen; filter: blur(.6px) contrast(1.06) saturate(1.05); }
  .tg-rgb .terminal::before{ background: currentColor; transform: translate(-.5px,0); box-shadow: 0 0 0 9999px rgba(255,42,109,.22) inset; opacity:.45 }
  .tg-rgb .terminal::after { background: currentColor; transform: translate(.5px,0);  box-shadow: 0 0 0 9999px rgba(42,179,255,.22) inset; opacity:.45 }
  
  /* Pixel/bug blocks overlay; filled at runtime */
  .tg-bugs{ contain: layout; }
  .tg-bug{ position:absolute; background: rgba(0,0,0,.85); mix-blend-mode: difference; box-shadow: 0 0 10px rgba(255,255,255,.18); }

  /* Raster roll — faint scanlines drifting slowly */
  .tg-raster{ opacity:0; background:
      repeating-linear-gradient(to bottom, rgba(255,255,255,.04) 0 1px, rgba(0,0,0,0) 1px 3px),
      linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.12)); }
  @keyframes tg-raster-roll{ from{ background-position-y: 0, 0 } to{ background-position-y: 3px, 0 } }
  .tg-raster.on{ opacity:.22; animation: tg-raster-roll .35s linear infinite; }

  @media (prefers-reduced-motion: reduce){
    .tg-dim.on, .tg-raster.on, .tg-vhold .terminal{ animation-duration: .01ms; animation-iteration-count: 1; }
  }

  /* Text pulse for [data-glitch] */
  @keyframes tg-text-flick{ 0%{opacity:.6} 100%{opacity:1} }
  .glitching{ animation: tg-text-flick .06s linear both; text-shadow: 0 0 6px var(--tg-glow); }

  /* TEXT TEAR stripes */
  .tt-wrap{ position: relative; display: inline-block; }
  .tt-overlay{ position:absolute; inset:0; pointer-events:none; mix-blend-mode:normal; }
  .tt-text{ position:absolute; left:0; right:0; white-space:pre-wrap; will-change: transform; color: currentColor; text-shadow: 0 0 6px rgba(39,255,140,.28); }
  .tt-overlay[data-rgb="on"] .tt-text::before,
  .tt-overlay[data-rgb="on"] .tt-text::after{ content: attr(data-txt); position:absolute; inset:0; pointer-events:none; mix-blend-mode:screen; filter: blur(.4px); opacity:.7; }
  .tt-overlay[data-rgb="on"] .tt-text::before{ color:#ff2a6d; transform: translateX(-1px); }
  .tt-overlay[data-rgb="on"] .tt-text::after{  color:#2ab3ff; transform: translateX( 1px); }
  `;

  function injectCSS(){ if(document.getElementById('tg-style')) return; const s=document.createElement('style'); s.id='tg-style'; s.textContent=CSS; document.head.appendChild(s); }

  // ----------------------- overlays --------------------
  function ensureRoot(root){
    const r = root || $('.terminal') || $('#content') || document.body;
    if(!r) throw new Error('TerminalGlitch: no root element');
    if(!r.classList.contains('tg-root')) r.classList.add('tg-root');
    const have = (cls)=> r.querySelector(':scope > .'+cls);
    const make = (cls)=>{ const d=document.createElement('div'); d.className='tg-overlay '+cls; r.appendChild(d); return d; };
    const scan   = have('tg-scanlines') || make('tg-scanlines');
    const tear   = have('tg-tear')      || make('tg-tear');
    const raster = have('tg-raster')    || make('tg-raster');
    const dim    = have('tg-dim')       || make('tg-dim');
    const bugs   = have('tg-bugs')      || ( ()=>{ const d=make('tg-bugs'); d.style.inset='0'; return d; } )();
    return { r, scan, tear, raster, dim, bugs };
  }

  function bugBurst(bugsLayer, howMany){
    const n = Math.max(4, Math.round(howMany||rnd(6,12)));
    const vw = bugsLayer.clientWidth || innerWidth;
    const vh = bugsLayer.clientHeight || innerHeight;
    for(let i=0;i<n;i++){
      const b=document.createElement('div'); b.className='tg-bug';
      const w = rnd(40, vw*0.35), h = rnd(10, vh*0.12);
      const x = rnd(0, vw-w), y = rnd(0, vh-h);
      b.style.left = x+'px'; b.style.top=y+'px'; b.style.width=w+'px'; b.style.height=h+'px';
      b.style.transform = `translateZ(0) skewX(${rnd(-2,2).toFixed(1)}deg)`;
      bugsLayer.appendChild(b);
      setTimeout(()=> b.remove(), 240 + rnd(0,120));
    }
  }

  // --- new, subtle bursts ---
  async function tearBurst(root, overlays, ms){ overlays.tear.classList.add('on'); await wait(ms||320); overlays.tear.classList.remove('on'); }
  async function glitchBurst(root, overlays, ms){ root.classList.add('tg-rgb'); overlays.raster.classList.add('on'); overlays.dim.classList.add('on'); await wait(ms||260); overlays.raster.classList.remove('on'); overlays.dim.classList.remove('on'); root.classList.remove('tg-rgb'); }
  async function vHoldSlip(root, overlays, ms){ root.classList.add('tg-vhold'); overlays.raster.classList.add('on'); await wait(ms||180); root.classList.remove('tg-vhold'); overlays.raster.classList.remove('on'); }
  async function heavySequence(root, overlays){ await tearBurst(root, overlays, 240); bugBurst(overlays.bugs, rnd(8,16)); await glitchBurst(root, overlays, 240); await vHoldSlip(root, overlays, 160); }

  // -------------------- [data-glitch] pulses --------------------
  function primeGlitchTargets(root=document){ const els=root.querySelectorAll('[data-glitch]'); els.forEach(el=>{ if(!el.hasAttribute('data-text')) el.setAttribute('data-text', el.textContent.trim()); }); return els; }
  function pulseText(el, dur=320){ if(!el) return; el.classList.add('glitching'); setTimeout(()=>el.classList.remove('glitching'), dur); }
  function startAmbientText(root){ const targets=Array.from(root.querySelectorAll('[data-glitch]')); if(!targets.length) return ()=>{}; let stop=false; (function tick(){ if(stop) return; if(Math.random()<0.18) pulseText(targets[(Math.random()*targets.length)|0], 280); setTimeout(tick, 800+Math.random()*800); })(); return ()=>{ stop=true; }; }

  // -------------------- TEXT TEAR (unchanged) -------------------
  function getRect(el){ const r=el.getBoundingClientRect(); return { w:r.width, h:r.height }; }
  function msRand(base, span){ return (base + (Math.random()*2-1)*span)|0; }
  function cloneStyles(from, to){ const cs=getComputedStyle(from); ['font','fontFamily','fontWeight','fontSize','lineHeight','letterSpacing','textTransform','textDecoration','textShadow','textRendering','-webkit-font-smoothing','-moz-osx-font-smoothing'].forEach(p=>{ try{ to.style[p]=cs[p]; }catch(_){} }); }

  function buildStripes(el, { density=8, rgb=true }={}){
    let wrap = el.closest('.tt-wrap'); if(!wrap){ wrap=document.createElement('span'); wrap.className='tt-wrap'; el.parentNode.insertBefore(wrap, el); wrap.appendChild(el); }
    let ov = wrap.querySelector(':scope > .tt-overlay'); if(!ov){ ov=document.createElement('span'); ov.className='tt-overlay'; wrap.appendChild(ov); }
    ov.dataset.rgb = rgb ? 'on' : 'off'; ov.textContent='';
    const rect=getRect(el); const H=Math.max(1,rect.h); const N=clamp(density|0,3,18);
    const heights=[]; let remain=H; for(let i=0;i<N;i++){ const left=N-i; const min=Math.max(1,Math.floor(H/(N*1.8))); const max=Math.max(min,Math.floor(H/(N*0.9))); const h=(i===N-1)?remain:clamp(Math.floor(Math.random()*(max-min+1)+min),1,remain-(left-1)*min); heights.push(h); remain-=h; }
    let top=0; const stripes=[]; const baseTxt=el.textContent; for(let i=0;i<N;i++){ const h=heights[i]; const s=document.createElement('span'); s.className='tt-text'; s.dataset.txt=baseTxt; cloneStyles(el,s); s.style.clipPath=`inset(${top}px 0 ${Math.max(0,H-top-h)}px 0)`; s.style.top='0px'; s.style.transform='translateX(0)'; s.textContent=baseTxt; ov.appendChild(s); stripes.push({el:s,top,h}); top+=h; }
    return { wrap:wrap, ov:ov, stripes }; }

  function animateStripes(stripes, { amp=2.6 }={}){ for(const s of stripes){ const dir=Math.random()<.5?-1:1; const mag=Math.random()**.8*amp; s.el.style.transform=`translate3d(${(dir*mag).toFixed(2)}px,0,0)`; } }
  function resetStripes(stripes){ for(const s of stripes){ s.el.style.transform='translate3d(0,0,0)'; } }

  // -------------------- main init + API -------------------------
  let ambientTimer=null, textTimer=null;
  const API = {
    _root:null,_ov:null,_stopText:null,_tt:{instances:[], ro:null, cfg:null},
    init(opts={}){
      if(prefersReduced()) return;
      injectCSS();
      const base = ensureRoot( typeof opts.root==='string' ? $(opts.root) : (opts.root||$('.terminal')||document.body) );
      const root = base.r; this._root=root; this._ov=base;
      // text primes
      primeGlitchTargets(root); this._stopText = startAmbientText(root);
      // ambient terminal bursts
      const level = (opts.level||'medium');
      const every = level==='heavy'? 900 : level==='light'? 1800 : level==='subtle'? 2400 : 1300;
      const modes = Array.isArray(opts.modes)? opts.modes : String(opts.modes||'tear glitch bug').split(/[\s,]+/).filter(Boolean);
      ambientTimer = setInterval(()=>{
        const choices=[];
        if(modes.includes('tear'))   choices.push(()=>tearBurst(root, base, 260));
        if(modes.includes('glitch') || modes.includes('raster') || modes.includes('rgb')) choices.push(()=>glitchBurst(root, base, 240));
        if(modes.includes('vhold'))  choices.push(()=>vHoldSlip(root, base, 180));
        if(modes.includes('bug'))    choices.push(()=>bugBurst(base.bugs));
        if(choices.length) choices[(Math.random()*choices.length)|0]();
      }, every);
      // TEXT TEAR auto (unchanged)
      if(opts.textTear && opts.textTear.on!==false){ this.textTear.start( Object.assign({ targets:['#hdr-title','#content-subtitle'], density:8, amp:2.6, freq:140, rgb:true }, opts.textTear) ); }
    },
    glitchOnce(kind='auto'){ const root=this._root, ov=this._ov; if(!root||!ov) return; if(kind==='tear') return tearBurst(root, ov, 260); if(kind==='bug') return bugBurst(ov.bugs); if(kind==='glitch'||kind==='raster'||kind==='rgb') return glitchBurst(root, ov, 240); if(kind==='vhold') return vHoldSlip(root, ov, 180); const pool=['tear','glitch','vhold','bug']; return this.glitchOnce(pool[(Math.random()*pool.length)|0]); },
    async panic(ms=900){ const root=this._root, ov=this._ov; if(!root||!ov) return; const t0=Date.now(); while(Date.now()-t0 < ms){ await heavySequence(root, ov); await wait(80+Math.random()*120); } },
    stop(){ if(ambientTimer) clearInterval(ambientTimer); ambientTimer=null; if(this._stopText) this._stopText(); this.textTear.stop(); },

    // --- TEXT TEAR control (unchanged) ---
    textTear: {
      start: function(cfg){
        const self = TerminalGlitch; self._tt.cfg = cfg||{}; const sels = Array.isArray(cfg.targets)? cfg.targets : String(cfg.targets||'#hdr-title,#content-subtitle').split(',');
        const found=[]; sels.forEach(sel=> $$(sel.trim()).forEach(el=> { const inst = buildStripes(el, { density: cfg.density||8, rgb: cfg.rgb!==false }); found.push(inst); }));
        self._tt.instances = found;
        if(!self._tt.ro){ self._tt.ro = new ResizeObserver(()=>{ const old = self._tt.instances.slice(); self._tt.instances.length=0; old.forEach(it=>{ try{ it.ov.remove(); }catch(_){} }); const f2=[]; sels.forEach(sel=> $$(sel.trim()).forEach(el=> f2.push(buildStripes(el, { density: cfg.density||8, rgb: cfg.rgb!==false })))); self._tt.instances = f2; }); self._tt.ro.observe(document.body); }
        if(textTimer) clearInterval(textTimer); textTimer = setInterval(()=>{ const stripes=self._tt.instances.flatMap(i=>i.stripes); animateStripes(stripes, { amp: cfg.amp||2.6 }); }, clamp(cfg.freq||140, 60, 600));
      },
      stop: function(){ if(textTimer) clearInterval(textTimer); textTimer=null; const self=TerminalGlitch; self._tt.instances.forEach(it=> resetStripes(it.stripes)); },
      async burst(ms=520){ const self=TerminalGlitch; const stripes=self._tt.instances.flatMap(i=>i.stripes); const t0=Date.now(); while(Date.now()-t0 < ms){ animateStripes(stripes, { amp: (self._tt.cfg?.amp||2.6)*1.6 }); await wait(60); } resetStripes(stripes); }
    }
  };

  window.TerminalGlitch = API;

  // -------------------- Auto-start from <body data-*> -----------
  function autoInitFromDataset(){
    const b=document.body; if(!b) return;
    const enabled = (b.dataset.glitch||'on')!=='off'; if(!enabled) return;
    const level = b.dataset.glitchLevel||'medium';
    const modes = (b.dataset.glitchModes||'tear glitch bug').split(/[\s,]+/).filter(Boolean);
    const ttOn = (b.dataset.texttear||'off')!=='off';
    const targets = (b.dataset.texttearTargets||'#hdr-title,#content-subtitle').split(',').map(s=>s.trim()).filter(Boolean);
    const density = parseInt(b.dataset.texttearDensity||'8',10);
    const amp = parseFloat(b.dataset.texttearAmp||'2.6');
    const freq = parseInt(b.dataset.texttearFreq||'140',10);
    const rgb  = (b.dataset.texttearRgb||'on')!=='off';
    TerminalGlitch.init({ level, modes, textTear: ttOn? { on:true, targets, density, amp, freq, rgb } : null });
  }

  const boot = ()=>{ try{ if(!prefersReduced()) autoInitFromDataset(); }catch(e){ /* silent */ } };
  if(document.readyState==='loading'){
    document.addEventListener('loader:done', boot, { once:true });
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();
