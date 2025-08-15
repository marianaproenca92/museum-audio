/*
  shell-router.js (v5)
  --------------------
  • Single shell page + per-room JSON.
  • Adds a MAIN per-page **audio** variable and helper element (#room-audio).
  • Supports **arenaHtml** (inline HTML) or **arenaHtmlUrl** (external HTML) to inject directly into #arena.
  • Keeps per-page styles, scripts, and init flow. Reveals content only after loader finishes AND CSS is ready.

  JSON additions (optional):
  {
    "audio": "audio/nodo09.mp3",
    "audioAutoplay": false,
    "audioLoop": false,

    "arenaHtml": "<div class=\"gallery\">...</div>",
    "arenaHtmlUrl": "partials/diferencas-gallery.html"
  }

  Notes:
  • Your shell should include <section id="arena" class="arena"></section> for arena injection.
  • Games/scripts can read the page audio via document.getElementById('room-audio') or body.dataset.audio.
*/
(function(){
  const $ = (q, el=document) => el.querySelector(q);
  function getParam(name, fallback){ const u=new URL(location.href); return u.searchParams.get(name)||fallback; }
  async function loadJSON(url){ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status+' '+url); return r.json(); }
  async function loadText(url){ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status+' '+url); return r.text(); }

  // --- CSS loader with caching ---
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
    return Promise.allSettled(jobs).then(()=>{}); // never block if one fails
  }

  function injectInlineCss(css){ if(!css) return; const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s); }
  function setCssVars(vars){ if(!vars) return; const root=document.documentElement.style; for(const k in vars){ try{ root.setProperty(k, vars[k]); }catch(_){} } }

  // --- Scripts loader with caching ---
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
    if(!a){
      a = document.createElement('audio'); a.id='room-audio'; a.preload='metadata';
      const src=document.createElement('source'); src.type='audio/mpeg'; a.appendChild(src);
      document.body.appendChild(a);
    }
    const srcEl = a.querySelector('source');
    if(srcEl) srcEl.src = url || '';
    a.loop = !!loop;
    if(autoplay && url){ a.autoplay = true; a.muted = true; a.play().catch(()=>{}); }
    else { a.autoplay = false; }
    return a;
  }

  async function start(){
    const id = getParam('id','room1');
    const path = `content/${id}.json`;
    let data={};
    try{ data=await loadJSON(path); }
    catch(e){ console.warn('Router: missing/invalid', path, e); data={ title:'ARQUIVO // EM FALHA', subtitle:id, html:'<p>O arquivo indicado não existe. Verifica o QR ou o JSON.</p>' }; }

    // Visible content (header & optional body snippet)
    setGlitchText($('#hdr-title'), data.title||'');
    if($('#content-body') && data.html){ $('#content-body').innerHTML = data.html; }

    // Subtitle (plain or HTML)
    {
        const sub = document.getElementById('content-subtitle');
        if (sub) {
            if (data.subtitleHtml) sub.innerHTML = data.subtitleHtml;
            else sub.textContent = data.subtitle || '';
        }
    }

    // NEW: Description (plain or HTML)
    {
        const desc = document.getElementById('content-description');
        if (desc) {
            if (data.descriptionHtml) desc.innerHTML = data.descriptionHtml;
            else desc.textContent = data.description || '';
        }
    }


    // Body classes & CSS vars (apply immediately so loader/arena inherit)
    const body=document.body;
    const classes = Array.isArray(data.bodyClass) ? data.bodyClass : (typeof data.bodyClass==='string' ? data.bodyClass.split(/\s+/) : []);
    classes.filter(Boolean).forEach(c=> body.classList.add(c));
    setCssVars(data.cssVars);

    // Kick off CSS loads as early as possible
    const styles = Array.isArray(data.styles) ? data.styles : (data.styles ? [data.styles] : []);
    const cssReady = loadStyles(styles);
    if(data.inlineCss) injectInlineCss(data.inlineCss);

    // Configure the loader via <body data-*>
    let effects=[]; if(Array.isArray(data.effects)) effects=data.effects; else if(typeof data.effects==='string') effects=data.effects.split(/[\s,]+/);
    if(!effects.length) effects=['shake'];
    body.dataset.effect = effects.join(' ');
    if(data.bootlog) body.dataset.bootlog=data.bootlog;
    if(data.detour)  body.dataset.detour=data.detour;
    if(data.drama!=null) body.dataset.drama=String(data.drama);
    body.dataset.typewriter = (data.typewriter===false)?'off':'on';
    if(data.loaderTitle!==undefined) body.dataset.title = data.loaderTitle; else body.dataset.title = data.title||document.title||'';
    if(data.pageTitle) document.title=data.pageTitle;

    // MAIN page audio
    if(data.audio){ body.dataset.audio=data.audio; ensureRoomAudio(data.audio, { autoplay: !!data.audioAutoplay, loop: !!data.audioLoop }); }

    // Arena HTML (inline or external). This is independent from #content-body.
    const arenaEl = document.getElementById('arena');
    if(arenaEl){
      try{
        if(data.arenaHtml){ arenaEl.innerHTML = data.arenaHtml; }
        else if(data.arenaHtmlUrl){ arenaEl.innerHTML = await loadText(data.arenaHtmlUrl); }
      }catch(e){ console.warn('Arena HTML load failed', e); }
    }

    // Reveal content only after loader finishes AND CSS promise resolved
    const reveal = async ()=>{ await cssReady; const c=$('#content'); if(c) c.style.removeProperty('display'); };
    document.addEventListener('loader:done', reveal, { once:true });

    // Page-specific scripts + optional init
    const scripts = Array.isArray(data.scripts) ? data.scripts : [];
    const init = data.init||null; // {fn, args, when}
    if(scripts.length){ try{ await loadScripts(scripts); } catch(e){ console.warn('script failed', e); } }

    const runInit = ()=>{
      if(!init||!init.fn) return; const fn=(window[init.fn]||window[init.fn.split('.').pop()]);
      if(typeof fn==='function'){ try{ fn(init.args||{}); }catch(err){ console.warn('init failed', err); } }
      else { console.warn('init fn not found:', init.fn); }
    };
    const when = (init && init.when)||'afterLoader';
    if(when==='immediate') runInit(); else document.addEventListener('loader:done', runInit, { once:true });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
