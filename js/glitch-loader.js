/*
  Glitch Loader v4 — single-effect attribute, default imagestorm path, strict bootlog JSON, failsafe cleanup, tinted ImageStorm
  ------------------------------------------------------------------------------------------------------
  Base deps (only two):
    • css/glitch-loader.css           (terminal shell)
    • css/glitch-break-effects.css    (visual effects classes)

  Per‑page usage:
    <link rel="stylesheet" href="css/glitch-loader.css">
    <link rel="stylesheet" href="css/glitch-break-effects.css">
    <script defer src="js/glitch-loader.js?v=4"></script>
    <body
      data-title="MUSEU // SALA X"
      data-bootlog="bootlogs/roomX.json"           <!-- REQUIRED to show lines; no fallback if present -->
      data-detour="bootlogs/roomX-detour.json"     <!-- optional extra lines after BREAK -->
      data-effect="scantear, imagestorm"           <!-- ONE attribute; CSV or space‑separated -->
      data-typewriter="on"                          <!-- on/off -->
      data-drama="3"                                <!-- 1..4 -->
      <!-- data-images-json can be omitted; a default constant is used -->
    >
*/
(function(){
  // ---------- constants ----------
  const DEFAULT_IMAGESTORM_LIST = 'img/glitch/images.json'; // used when imagestorm is selected and no data-images-json provided
  const KILL_SWITCH_MS_BASE = 9000; // hard failsafe to always clear overlay even if something stalls

  // ---------- utils ----------
  const $  = (q,el=document)=>el.querySelector(q);
  const $$ = (q,el=document)=>Array.from(el.querySelectorAll(q));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const jitter=(base,v=.35)=>Math.max(8,(base*(1+(Math.random()*2-1)*v))|0);

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
  window.addEventListener('pointerdown', ()=>AudioFX.unlock(), { once:true, passive:true });

  // ---------- overlay (matches your CSS shell) ----------
  function buildOverlay(title){
    const wrap=document.createElement('div'); wrap.className='gl-loader'; wrap.setAttribute('role','dialog'); wrap.setAttribute('aria-modal','true');
    const term=document.createElement('div'); term.className='gl-term';
    const head=document.createElement('div'); head.className='gl-head';
    head.innerHTML='<span class="gl-dot"></span><span class="gl-dot"></span><span class="gl-dot"></span><span class="gl-title"></span>';
    head.querySelector('.gl-title').textContent=title||'';
    const panel=document.createElement('div'); panel.className='gl-panel';
    const log=document.createElement('pre'); log.className='gl-bootlog'; log.id='gl-bootlog'; log.setAttribute('aria-live','polite');
    panel.appendChild(log);
    const foot=document.createElement('div'); foot.className='gl-foot'; foot.innerHTML='<span>status: CONNECT</span><span id="gl-time"></span>';
    term.appendChild(head); term.appendChild(panel); term.appendChild(foot); wrap.appendChild(term);
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
  // Inject once: tint/flicker styles for storm images
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
      // random CRT‑greenish params
      const hue = (90 + Math.random()*50)|0; // around green
      const sat = (1.6 + Math.random()*0.6).toFixed(2);
      const con = (1.2 + Math.random()*0.4).toFixed(2);
      const spd = (480 + Math.random()*520)|0;
      wrap.style.setProperty('--hue', hue+'deg');
      wrap.style.setProperty('--sat', sat);
      wrap.style.setProperty('--con', con);
      wrap.style.setProperty('--spd', spd+'ms');

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
  async function runSequence({ title, bootlogUrl, detourUrl, effects=['shake'], drama=2, typewriter=true, imagesJson='', onDone=null }={}){
    const { wrap, term, log } = buildOverlay(title||document.title||'');

    // hard failsafe (ensures overlay is always cleared)
    const killDelay = KILL_SWITCH_MS_BASE + drama*800;
    let killTimer = setTimeout(()=> hardClean(), killDelay);

    function hardClean(){
      try{ if(storm && storm.stop) storm.stop(); }catch(_){}
      try{ if(wrap.__clock) clearInterval(wrap.__clock); }catch(_){}
      try{ wrap.remove(); }catch(_){}
      document.dispatchEvent(new CustomEvent('glitch:done'));
      if(typeof onDone==='function'){ try{ onDone(); }catch(_){} }
      clearTimeout(killTimer); killTimer=null;
    }

    try{
      if(drama>=3) term.classList.add('gl-broken');

      // logs — STRICT: if bootlogUrl provided, do not use any fallback
      let before=[], after=[];
      if(bootlogUrl){ ({before,after}=await loadBootlog(bootlogUrl)); }
      else { before=['ACCESSING MEMORY ARCHIVE…','CHECKSUM → MISMATCH','REBUILDING INDEX…']; }
      if(detourUrl){ try{ const d=await loadBootlog(detourUrl); after=after.concat(d.before,d.after); }catch(_){} }

      // pre-break typing
      const speedBefore=Math.max(8,(26-4*drama));
      for(const line of before){ await typeLine(log,line,{ speed:speedBefore, drama, sfx:typewriter }); await sleep(80); }

      // BREAK visuals
      term.classList.add('gl-broken');
      runBreak(term,effects,drama);

      // imagestorm when selected
      const wantsStorm = effects.includes('imagestorm');
      var storm = wantsStorm ? ImageStorm(imagesJson||DEFAULT_IMAGESTORM_LIST,{ rate:1+drama*0.8, minSize:200, maxSize:520, lifetime:1600+drama*180 }) : null;
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
      const opts={
        title: b.dataset.title||document.title||'',
        bootlogUrl: b.dataset.bootlog||'',
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

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>API.startFromData());
  else API.startFromData();
})();
