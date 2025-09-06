/*
  shell-router.js
  --------------------
  • Router is the orchestrator: sets JSON → <body data-*> and explicitly starts the loader.
  • Supports: subtitle + description, inline bootlog, glitcher/textTear, per-page styles + scripts,
              arenaHtml / arenaHtmlUrl, audio, and the loader handshake/reveal.

  Include BEFORE the loader in shell.html:
    <script defer src="js/shell-router.js"></script>
    <script defer src="js/glitch-loader.js"></script>
    <script defer src="js/screen-glitcher.js"></script>
*/

// Tell the loader not to autostart; the router will trigger it
window.__GL_MANUAL = true;
function isAbs(u){ return /^([a-z]+:)?\/\//i.test(u) || (u||'').startsWith('/'); }
function joinUrl(base,u){ return isAbs(u) ? u : (base + u).replace(/\\/g,'/'); }
const asArray = v => Array.isArray(v) ? v : (v ? [v] : []);

(function(){
  const $ = (q, el=document) => el.querySelector(q);
  function getParam(name, fallback){ const u=new URL(location.href); return u.searchParams.get(name)||fallback; }
  async function loadJSON(url){ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status+' '+url); return r.json(); }
  async function loadText(url){ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status+' '+url); return r.text(); }

  // CSS loader with caching
  const injectedCSS = new Set();
  function loadStyles(urls){
    if(!urls||!urls.length) return Promise.resolve();
    const jobs = urls.map(href=> new Promise((res,rej)=>{
      if(!href) return res();
      if(injectedCSS.has(href)) return res();
      const link=document.createElement('link');
      link.rel='stylesheet'; link.href=href;
      link.onload=()=>{ injectedCSS.add(href); res(); };
      link.onerror=()=>rej(new Error('Failed CSS '+href));
      document.head.appendChild(link);
    }));
    return Promise.allSettled(jobs).then(()=>{});
  }
  function injectInlineCss(css){ if(!css) return; const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s); }
  function setCssVars(vars){ if(!vars) return; const root=document.documentElement.style; for(const k in vars){ try{ root.setProperty(k, vars[k]); }catch(_){} } }

  // Script loader with caching
  const injectedJS = new Set();
  function loadScripts(urls){
    if(!urls||!urls.length) return Promise.resolve();
    const jobs = urls.map(src=> new Promise((res,rej)=>{
      if(!src) return res();
      if(injectedJS.has(src)) return res();
      const s=document.createElement('script'); s.src=src; s.defer=true;
      s.onload=()=>{ injectedJS.add(src); res(); };
      s.onerror=()=>rej(new Error('Failed JS '+src));
      document.head.appendChild(s);
    }));
    return Promise.allSettled(jobs).then(()=>{});
  }

  function setGlitchText(el, text){ if(!el) return; el.textContent=text||''; el.setAttribute('data-text', text||''); el.setAttribute('aria-label', text||''); }
  function ensureRoomAudio(url, {autoplay=false, loop=false}={}){
    let a = document.getElementById('room-audio');
    if(!a){ a = document.createElement('audio'); a.id='room-audio'; a.preload='metadata'; const src=document.createElement('source'); src.type='audio/mpeg'; a.appendChild(src); document.body.appendChild(a); }
    const srcEl=a.querySelector('source'); if(srcEl) srcEl.src=url||''; a.loop=!!loop;
    if(autoplay && url){ a.autoplay=true; a.muted=true; a.play().catch(()=>{}); } else { a.autoplay=false; }
    return a;
  }

  async function start(){    
    const id = getParam('id','room1');
    const base = `pages/${id}/`;
    document.body.dataset.pageBase = base;
    const path = `${base}${id}.json`;
     
    let data={};
    try{ data=await loadJSON(path); }
    catch(e){ console.warn('Router: missing/invalid', path, e); data={ title:'ARQUIVO // EM FALHA', subtitle:id, html:'<p>O arquivo indicado não existe. Verifica o QR ou o JSON.</p>' }; }

    // Header
    setGlitchText($('#hdr-title'), data.title||'');

    // Subtitle & Description
    { const sub=$('#content-subtitle'); if(sub){ if(data.subtitleHtml) sub.innerHTML=data.subtitleHtml; else sub.textContent=data.subtitle||''; } }
    { const desc=$('#content-description'); if(desc){ if(data.descriptionHtml) desc.innerHTML=data.descriptionHtml; else desc.textContent=data.description||''; } }

    // Optional content block
    if($('#content-body') && data.html){ $('#content-body').innerHTML = data.html; }

    // Body classes & CSS vars early
    const body=document.body;
    const classes = Array.isArray(data.bodyClass) ? data.bodyClass : (typeof data.bodyClass==='string' ? data.bodyClass.split(/\s+/) : []);
    classes.filter(Boolean).forEach(c=> body.classList.add(c));
    setCssVars(data.cssVars);

    // Per-page CSS
    const styles =asArray(data.styles).map(u => joinUrl(base, u));
    const cssReady = loadStyles(styles);
    if(data.inlineCss) injectInlineCss(data.inlineCss);

    // ----- Loader config via <body data-*> -----
    // effects
    let effects=[]; if(Array.isArray(data.effects)) effects=data.effects; else if(typeof data.effects==='string') effects=data.effects.split(/[\s,]+/);
    if(!effects.length) effects=['shake'];
    body.dataset.effects = effects.join(' ');

    // bootlog: inline object/array OR URL string
    if (data.bootlog && typeof data.bootlog === 'object') {
      window.__bootlog = data.bootlog; // consumed by glitch-loader
      delete body.dataset.bootlog;     // avoid fetch
    } else if (typeof data.bootlog === 'string') { body.dataset.bootlog = joinUrl(base, data.bootlog); }

    if(data.detour)  body.dataset.detour = joinUrl(base, data.detour);
    if(data.drama!=null) body.dataset.drama=String(data.drama);
    body.dataset.typewriter = (data.typewriter===false)?'off':'on';
    if(data.loaderTitle!==undefined) body.dataset.title = data.loaderTitle; else body.dataset.title = data.title||document.title||'';
    if(data.pageTitle) document.title=data.pageTitle;

    // MAIN page audio
    if(data.audio){ 
      const audioUrl = joinUrl(base, data.audio);
      body.dataset.audio = audioUrl;
      ensureRoomAudio(audioUrl, { autoplay: !!data.audioAutoplay, loop: !!data.audioLoop });
    }

    // Glitcher modes for screen-glitcher.js v3
    if (data.glitcher){
      body.dataset.glitch = (data.glitcher.on === false) ? 'off' : 'on';
      if (data.glitcher.level)  body.dataset.glitchLevel = data.glitcher.level;         // light|medium|heavy
      if (data.glitcher.modes)  body.dataset.glitchModes = Array.isArray(data.glitcher.modes)
        ? data.glitcher.modes.join(' ')
        : String(data.glitcher.modes);
    }

    // Text tear settings (optional)
    if (data.textTear){
      body.dataset.texttear = (data.textTear.on === false) ? 'off' : 'on';
      if (data.textTear.targets)
        body.dataset.texttearTargets = Array.isArray(data.textTear.targets)
          ? data.textTear.targets.join(',')
          : String(data.textTear.targets);
      if (data.textTear.density != null) body.dataset.texttearDensity = String(data.textTear.density);
      if (data.textTear.amp     != null) body.dataset.texttearAmp     = String(data.textTear.amp);
      if (data.textTear.freq    != null) body.dataset.texttearFreq    = String(data.textTear.freq);
      if (data.textTear.rgb     != null) body.dataset.texttearRgb     = data.textTear.rgb ? 'on' : 'off';
    }

    // Arena HTML (inline or external)
    const arenaEl = document.getElementById('arena');
    if(arenaEl){
      try{
        if(data.arenaHtml){ arenaEl.innerHTML = data.arenaHtml; }
        else if (data.arenaHtmlUrl){ arenaEl.innerHTML = await loadText(joinUrl(base, data.arenaHtmlUrl)); }
      }catch(e){ console.warn('Arena HTML load failed', e); }
    }

    // Router→Loader handshake + explicit start
    window.__shellConfigReady = true; // optional flag others can read
    document.dispatchEvent(new CustomEvent('shell:config', { detail: { id, data } }));

    (function startLoaderWhenReady(){
      if (window.GlitchLoader?.startFromData) {
        window.GlitchLoader.startFromData();
      } else {
        document.addEventListener('glitch:ready', ()=> window.GlitchLoader.startFromData(), { once:true });
        setTimeout(startLoaderWhenReady, 0);
      }
    })();

    // Reveal content after loader and CSS are ready
    const reveal = async ()=>{ await cssReady; const c=$('#content'); if(c) c.style.removeProperty('display'); };
    document.addEventListener('loader:done', reveal, { once:true });

    // Load screen‑glitcher only after the overlay is gone
    document.addEventListener('loader:done', async () => {
        await loadScripts(['base/screen-glitcher.js']);
    }, { once:true });

    // Page-specific scripts + optional init
    const scripts = asArray(data.scripts).map(u => joinUrl(base, u));
    const init = data.init||null; // {fn, args, when}
    if(scripts.length){ try{ await loadScripts(scripts); } catch(e){ console.warn('script failed', e); } }

    const runInit = ()=>{
      if(!init||!init.fn) return; const fn=(window[init.fn]||window[init.fn.split('.').pop()]);
      if(typeof fn==='function'){ try{ fn(init.args||{}); }catch(err){ console.warn('init failed', err); } }
      else { console.warn('init fn not found:', init && init.fn); }
    };
    const when = (init && init.when)||'afterLoader';
    if(when==='immediate') runInit(); else document.addEventListener('loader:done', runInit, { once:true });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();