(function(){
  'use strict';

  // ---------- constants ----------
  const DEFAULT_TITLE = 'MUSEU // ARQUIVO PRIVADO 2010 - 2025';
  const SUBTITLE_PREFIX = 'A CARREGAR ARQUIVO #';
  const DEFAULT_IMAGESTORM_LIST = 'glitch/images.json'; // used when imagestorm is selected and body has no data-images-json
  const KILL_SWITCH_MS_BASE = 9000; // hard failsafe to always clear overlay even if something stalls

  // ---------- utils ----------
  const $  = (q,el=document)=>el.querySelector(q);
  const $$ = (q,el=document)=>Array.from(el.querySelectorAll(q));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const jitter=(base,v=.35)=>Math.max(8,(base*(1+(Math.random()*2-1)*v))|0);
  const once=(fn)=>{ let done=false; return (...a)=>{ if(done) return; done=true; try{ return fn(...a);}catch(e){console.error(e);} } };

  function bigRidiculousNumber(){
    // 24-digit decimal number as a string: timestamp + random blocks
    const t = Date.now().toString();
    const rand = Array.from({length:14},()=>Math.floor(Math.random()*10)).join('');
    return (t+rand).slice(0,24); // ensure 24 digits
  }

  // ---------- audio (no assets) ----------
  const AudioFX={
    ctx:null,
    ensure(){ if(!this.ctx){ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); } return this.ctx; },
    unlock(){ try{ this.ensure().resume(); }catch(_){} },
    now(){ return this.ensure().currentTime; },
    tick(){ const ctx=this.ensure(); const t=this.now(); const dur=.015;
      const buf=ctx.createBuffer(1, ctx.sampleRate*dur, ctx.sampleRate);
      const ch0=buf.getChannelData(0); for(let i=0;i<ch0.length;i++){ ch0[i]=(Math.random()*2-1)*0.6; }
      const src=ctx.createBufferSource(); src.buffer=buf;
      const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2200; bp.Q.value=2.2;
      const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.35,t+0.005); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      src.connect(bp).connect(g).connect(ctx.destination); src.start(t);
    },
    buzz(ms=260){ const ctx=this.ensure(); const t=this.now(); const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(55,t);
      const g=ctx.createGain(); g.gain.setValueAtTime(0.001,t); g.gain.exponentialRampToValueAtTime(0.4,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+ms/1000);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t+ms/1000);
    },
    thump(){ const ctx=this.ensure(); const t=this.now(); const o=ctx.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(90,t); o.frequency.exponentialRampToValueAtTime(40,t+.18);
      const g=ctx.createGain(); g.gain.setValueAtTime(0.001,t); g.gain.exponentialRampToValueAtTime(0.7,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+.22);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t+.25);
    }
  };
  // Unlock on first tap (iOS)
  window.addEventListener('pointerdown', ()=>AudioFX.unlock(), { once:true, passive:true });

  // ---------- overlay (matches your CSS shell) ----------
  function injectSubtitleCSS(){
    if(document.getElementById('gl-subtitle-style')) return;
    const s=document.createElement('style'); s.id='gl-subtitle-style'; s.textContent=`
      .gl-subtitle{ margin:4px 0 8px; opacity:.9; letter-spacing:.04em; font-size:.95em; }
      .gl-subtitle strong{ font-weight:600; }
    `; document.head.appendChild(s);
  }

  function buildOverlay(title, subtitle){
    injectSubtitleCSS();
    const wrap=document.createElement('div'); wrap.className='gl-loader'; wrap.setAttribute('role','dialog'); wrap.setAttribute('aria-modal','true');
    const term=document.createElement('div'); term.className='gl-term';
    const head=document.createElement('div'); head.className='gl-head';
    head.innerHTML='<span class="gl-dot"></span><span class="gl-dot"></span><span class="gl-dot"></span><span class="gl-title"></span>';
    head.querySelector('.gl-title').textContent=title||'';
    const sub=document.createElement('div'); sub.className='gl-subtitle'; sub.innerHTML = subtitle||'';
    const panel=document.createElement('div'); panel.className='gl-panel';
    const log=document.createElement('pre'); log.className='gl-bootlog'; log.id='gl-bootlog'; log.setAttribute('aria-live','polite');
    panel.appendChild(log);
    const foot=document.createElement('div'); foot.className='gl-foot'; foot.innerHTML='<span>status: CONNECTED</span><span id="gl-time"></span>';
    term.appendChild(head); term.appendChild(sub); term.appendChild(panel); term.appendChild(foot); wrap.appendChild(term);
    document.body.appendChild(wrap);
    const tEl=$('#gl-time'); if(tEl){ const upd=()=>{tEl.textContent=new Date().toLocaleTimeString();}; upd(); wrap.__clock=setInterval(upd,1000); }
    return { wrap, term, log };
  }

  // ---------- typing ----------
  async function typeLine(el, text, { speed=26, drama=2, sfx=true }={}){
    for(let i=0;i<text.length;i++){
      const ch=text[i]; const span=document.createElement('span'); span.textContent=ch;
      if(/\S/.test(ch) && Math.random() < (0.06*drama)) span.style.textShadow='0 0 6px rgba(39,255,140,.35)';
      el.appendChild(span);
      if(sfx && /\S/.test(ch)) AudioFX.tick();
      await sleep(jitter(speed,.4));
    }
    el.appendChild(document.createTextNode('\n'));
  }

  // ---------- visual BREAK (CSS classes) ----------
  function applyEffect(term, name){
    switch(name){
      case 'flatline':{
        term.classList.add('fx-flatline');
        const layer=document.createElement('div'); layer.className='fx-ecg-layer'; term.appendChild(layer);
        break; }
      case 'desync': term.classList.add('fx-desync'); break;
      case 'pixel': term.classList.add('fx-pixel'); break;
      case 'blackout': term.classList.add('fx-blackout'); break;
      case 'scantear':{
        term.classList.add('fx-scantear');
        const top=document.createElement('div'); top.className='fx-layer fx-top';
        const bot=document.createElement('div'); bot.className='fx-layer fx-bot';
        const clone=document.createElement('div'); clone.className='fx-clone'; clone.textContent=($('#gl-bootlog')||{}).textContent||'';
        top.appendChild(clone.cloneNode(true)); bot.appendChild(clone); term.appendChild(top); term.appendChild(bot);
        break; }
      case 'shake': default: break;
    }
  }
  function runBreak(term, effects, drama){
    term.classList.add('gl-broken');
    effects.forEach(e=>applyEffect(term, e));
    AudioFX.buzz(220+drama*80); setTimeout(()=>AudioFX.thump(),160);
  }

  // ---------- Image Storm (as an effect) ----------
  (function injectStormCSS(){
    if(document.getElementById('gl-storm-style')) return;
    const s=document.createElement('style'); s.id='gl-storm-style'; s.textContent=`
      .gl-imgstorm { pointer-events:none; }
      .gl-imgstorm img { mix-blend-mode: screen; filter: hue-rotate(var(--hue, 110deg)) saturate(var(--sat,1.8)) contrast(var(--con,1.25)) brightness(1.05) drop-shadow(0 0 8px rgba(39,255,140,.35)); animation: storm-flicker var(--spd,680ms) steps(2,end) infinite; }
      @keyframes storm-flicker { 0%{filter: hue-rotate(var(--hue)) saturate(var(--sat)) contrast(var(--con)) brightness(1.05)} 50%{filter: hue-rotate(calc(var(--hue) + 12deg)) saturate(calc(var(--sat)*1.1)) contrast(calc(var(--con)*1.05)) brightness(1.1)} 100%{filter: hue-rotate(var(--hue)) saturate(var(--sat)) contrast(var(--con)) brightness(1.05)} }
    `; document.head.appendChild(s);
  })();

  function ImageStorm(jsonUrl,{lifetime=1800,minSize=180,maxSize=480,edge=12,rate=1}={}){
    let urls=[], timer=null;
    function spawn(src){
      const wrap=document.createElement('div'); wrap.className='gl-imgstorm'; wrap.style.cssText='position:fixed;z-index:10000;';
      const hue = (90 + Math.random()*50)|0; const sat = (1.6 + Math.random()*0.6).toFixed(2); const con = (1.2 + Math.random()*0.4).toFixed(2); const spd = (480 + Math.random()*520)|0;
      wrap.style.setProperty('--hue', hue+'deg'); wrap.style.setProperty('--sat', sat); wrap.style.setProperty('--con', con); wrap.style.setProperty('--spd', spd+'ms');
      const img=document.createElement('img'); img.src=src; img.draggable=false; img.style.userSelect='none'; img.style.width=((Math.random()*(maxSize-minSize)+minSize)|0)+'px';
      wrap.appendChild(img); document.body.appendChild(wrap);
      const vw=innerWidth,vh=innerHeight; const cx=(Math.random()*(vw-edge*2)+edge)|0; const cy=(Math.random()*(vh-edge*2)+edge)|0;
      wrap.style.left=cx+'px'; wrap.style.top=cy+'px'; wrap.style.transform=`translate(-50%,-50%) rotate(${(Math.random()*16-8).toFixed(1)}deg)`;
      const dx=(Math.random()*2-1)*30, dy=(Math.random()*2-1)*24;
      wrap.animate([
        { transform: wrap.style.transform, opacity: .0 },
        { transform: wrap.style.transform, opacity: 1, offset: .12 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`, opacity: .9, offset: .7 },
        { transform: `translate(calc(-50% + ${dx*1.6}px), calc(-50% + ${dy*1.6}px))`, opacity: 0 }
      ], { duration: lifetime, easing: 'ease-out' });
      setTimeout(()=>wrap.remove(), lifetime+80);
    }
    async function start(){
      const listUrl = jsonUrl || DEFAULT_IMAGESTORM_LIST;
      try{ const r=await fetch(listUrl,{cache:'no-store'}); urls=await r.json(); }
      catch(e){ console.warn('ImageStorm: failed to load', listUrl, e); urls=[]; }
      if(!urls || !urls.length) return;
      const interval=Math.max(260, 1200/Math.max(1,rate));
      timer=setInterval(()=>{ const src=urls[(Math.random()*urls.length)|0]; spawn(src); }, interval);
    }
    function stop(){ if(timer) clearInterval(timer); timer=null; $$('.gl-imgstorm').forEach(n=>n.remove()); }
    return { start, stop };
  }

  // ---------- bootlogs ----------
  async function loadBootlog(url){
    const r=await fetch(url,{cache:'no-store'}); const data=await r.json();
    if(Array.isArray(data)){
      const cut=Math.max(1,Math.floor(data.length*0.6));
      return { before:data.slice(0,cut), after:data.slice(cut) };
    }
    return { before:data.beforeBreak||[], after:data.afterBreak||[] };
  }

  // ---------- core ----------
  async function runSequence({ title, subtitle, bootlogUrl, detourUrl, bootlogInline=null, effects=['shake'], drama=2, typewriter=true, imagesJson='', onDone=null }={}){
    const { wrap, term, log } = buildOverlay(title||DEFAULT_TITLE, subtitle||'');

    // hard failsafe (ensures overlay is always cleared)
    const killDelay = KILL_SWITCH_MS_BASE + drama*800;
    let killTimer = setTimeout(()=> hardClean(), killDelay);

    const hardClean = once(function(){
      try{ if(storm && storm.stop) storm.stop(); }catch(_){}
      try{ if(wrap.__clock) clearInterval(wrap.__clock); }catch(_){}
      try{ wrap.remove(); }catch(_){}
      document.dispatchEvent(new CustomEvent('glitch:done'));
      // backwards-compat for pages listening to the old event name
      document.dispatchEvent(new CustomEvent('loader:done'));
      window.__loaderDone = true; // <-- add this
      // safety: unhide main content if a page kept it display:none
      const __main = document.getElementById('content');
      if (__main) __main.style.removeProperty('display');
      if(typeof onDone==='function'){ try{ onDone(); }catch(_){} }
      if(killTimer){ clearTimeout(killTimer); killTimer=null; }
    });

    let storm=null;

    try{
      if(drama>=3) term.classList.add('gl-broken');

      // logs — STRICT: if bootlogUrl provided, do not use fallback lines
      // logs — prefer INLINE, then URL, else tiny fallback
      let before=[], after=[];
      if (bootlogInline) {
        if (Array.isArray(bootlogInline)) {
          const cut = Math.max(1, Math.floor(bootlogInline.length * 0.6));
          before = bootlogInline.slice(0, cut);
          after  = bootlogInline.slice(cut);
        } else if (bootlogInline.before || bootlogInline.after) {
          before = bootlogInline.before || [];
          after  = bootlogInline.after  || [];
        }
      } else if (bootlogUrl) {
        try { ({ before, after } = await loadBootlog(bootlogUrl)); }
        catch (err) { before = [`[ERRO] Falha ao carregar: ${bootlogUrl}`]; after = []; console.warn(err); }
      } else {
        before = ['ACEDER AO ARQUIVO…','CHECKSUM → FALHA','REINDEXAR…'];
      }
      if(detourUrl){ try{ const d=await loadBootlog(detourUrl); after=after.concat(d.before,d.after); }catch(_){} }

      // pre-break typing
      const speedBefore=Math.max(8,(26-4*drama));
      for(const line of before){ await typeLine(log,line,{ speed:speedBefore, drama, sfx:typewriter }); await sleep(80); }

      // BREAK visuals
      term.classList.add('gl-broken');
      runBreak(term,effects,drama);

      // imagestorm when selected
      const wantsStorm = effects.includes('imagestorm');
      storm = wantsStorm ? ImageStorm(imagesJson||DEFAULT_IMAGESTORM_LIST,{ rate:1+drama*0.8, minSize:200, maxSize:520, lifetime:1600+drama*180 }) : null;
      if(storm) await storm.start();

      await sleep(240+drama*180);

      // post-break typing
      const speedAfter=Math.max(8,(22-4*drama));
      for(const line of after){ await typeLine(log,line,{ speed:speedAfter, drama, sfx:typewriter }); await sleep(80); }

      await sleep(260);
      hardClean();
    }catch(err){
      console.error('GlitchLoader error:', err);
      hardClean();
    }
  }

  // ---------- API & autostart ----------
  const API={
    start(opts){ return runSequence(opts||{}); },
    async startFromData(){
      const b=document.body;
      // Prefer data-effects; fallback to data-effect; default to 'shake'
      const csv=(b.dataset.effects||b.dataset.effect||'shake');
      const effects=csv.split(/[\s,]+/).map(s=>s.trim().toLowerCase()).filter(Boolean);

      // Title is constant by default; allow override via data-title if present
      const title = b.dataset.title && b.dataset.title.trim().length ? b.dataset.title : DEFAULT_TITLE;
      const ridic = bigRidiculousNumber();
      const subtitle = `<strong>${SUBTITLE_PREFIX}${ridic}</strong>`;

      const opts={
         title,
         subtitle,
         bootlogUrl: b.dataset.bootlog||'',
         bootlogInline: (typeof window.__bootlog === 'object') ? window.__bootlog : null,
         detourUrl: b.dataset.detour||'',
         effects,
         drama: clamp(parseInt(b.dataset.drama||'2',10)||2,1,4),
         typewriter: (b.dataset.typewriter||'on')!=='off',
         imagesJson: b.dataset.imagesJson||DEFAULT_IMAGESTORM_LIST,
         onDone: null
       };
      // optional extra effect css per page
      const effectCss=(b.dataset.effectCss||'').split(',').map(s=>s.trim()).filter(Boolean);
      for(const href of effectCss){ const link=document.createElement('link'); link.rel='stylesheet'; link.href=href; document.head.appendChild(link); }
      return runSequence(opts);
    }
  };
  window.GlitchLoader=API;

  // --- Manual mode + ready signal ---
  // If window.__GL_MANUAL === true or <body data-gl-manual="on">, do NOT autostart.
  // The router will call GlitchLoader.startFromData() after it sets <body data-*>.
  (function(){
    const signalReady = () => { try { document.dispatchEvent(new CustomEvent('glitch:ready')); } catch(_){} };
    signalReady(); // let the router know API is ready

    const b = document.body;
    const manual = (window.__GL_MANUAL === true) || (b && b.dataset.glManual === 'on');
    if (manual) return; // router will start us

    // default autostart (same behavior as before)
    const boot = once(()=>API.startFromData());
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded', boot, { once:true });
      window.addEventListener('load', boot, { once:true });
    } else {
      requestAnimationFrame(boot);
    }
  })();

})();
