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
function ensureRoomAudio(url, { autoplay, loop } = {}) {
    if (!url) return;
    let audio = document.querySelector('audio[data-room-audio]');
    if (!audio) {
        audio = document.createElement('audio');
        audio.dataset.roomAudio = '1';
        document.body.appendChild(audio);
    }
    if (audio.src !== url) audio.src = url;
    if (loop) audio.loop = true;
    if (autoplay) audio.play().catch(() => console.warn('Autoplay failed'));
}
  async function start() {
    console.log('Router: Starting with id=', getParam('id', 'room1')); // Debug log
    const id = getParam('id', 'room1');
    const base = `pages/${id}/`;
    document.body.dataset.pageBase = base;
    const path = `${base}${id}.json`;

    let data = {};
    try {
        data = await loadJSON(path);
        console.log('Router: Loaded JSON', data); // Debug log
    } catch (e) {
        console.warn('Router: missing/invalid', path, e);
        data = { title: 'ARQUIVO // EM FALHA', subtitle: id, html: '<p>O arquivo indicado não existe. Verifica o QR ou o JSON.</p>' };
    }

    // Set body datasets, audio, glitcher, etc. (unchanged)
    const body = document.body;
    if (data.title) setGlitchText($('.title'), data.title);
    if (data.subtitle) setGlitchText($('.subtitle'), data.subtitle);
    if (data.description) $('#content').innerHTML = data.description;
    await loadStyles(asArray(data.styles).map(u => joinUrl(base, u)));
    if (data.cssVars) setCssVars(data.cssVars);
    if (data.css) injectInlineCss(data.css);
    const audioUrl = data.audio ? joinUrl(base, data.audio) : '';
    body.dataset.audio = audioUrl;
    ensureRoomAudio(audioUrl, { autoplay: !!data.audioAutoplay, loop: !!data.audioLoop });
    if (data.glitcher) {
        body.dataset.glitch = (data.glitcher.on === false) ? 'off' : 'on';
        if (data.glitcher.level) body.dataset.glitchLevel = data.glitcher.level;
        if (data.glitcher.modes) body.dataset.glitchModes = Array.isArray(data.glitcher.modes) ? data.glitcher.modes.join(' ') : String(data.glitcher.modes);
    }
    if (data.textTear) {
        body.dataset.texttear = (data.textTear.on === false) ? 'off' : 'on';
        if (data.textTear.targets) body.dataset.texttearTargets = Array.isArray(data.textTear.targets) ? data.textTear.targets.join(',') : String(data.textTear.targets);
        if (data.textTear.density != null) body.dataset.texttearDensity = String(data.textTear.density);
        if (data.textTear.amp != null) body.dataset.texttearAmp = String(data.textTear.amp);
        if (data.textTear.freq != null) body.dataset.texttearFreq = String(data.textTear.freq);
        if (data.textTear.rgb != null) body.dataset.texttearRgb = data.textTear.rgb ? 'on' : 'off';
    }

    // Arena HTML
    const arenaEl = document.getElementById('arena');
    if (arenaEl) {
        try {
            if (data.arenaHtml) arenaEl.innerHTML = data.arenaHtml;
            else if (data.arenaHtmlUrl) arenaEl.innerHTML = await loadText(joinUrl(base, data.arenaHtmlUrl));
            console.log('Router: Arena HTML loaded'); // Debug log
        } catch (e) {
            console.warn('Arena HTML load failed', e);
        }
    }

    // Load page-specific scripts BEFORE loader
    const scripts = asArray(data.scripts).map(u => joinUrl(base, u));
    if (scripts.length) {
        try {
            await loadScripts(scripts);
            console.log('Router: Scripts loaded', scripts); // Debug log
        } catch (e) {
            console.warn('Script failed', e);
        }
    }

    // Router→Loader handshake
    window.__shellConfigReady = true;
    document.dispatchEvent(new CustomEvent('shell:config', { detail: { id, data } }));

    (function startLoaderWhenReady() {
        console.log('Router: Starting loader'); // Debug log
        if (window.GlitchLoader?.startFromData) {
            window.GlitchLoader.startFromData();
        } else {
            document.addEventListener('glitch:ready', () => window.GlitchLoader.startFromData(), { once: true });
            setTimeout(startLoaderWhenReady, 0);
        }
    })();

    // Reveal content
    const cssReady = loadStyles(asArray(data.styles).map(u => joinUrl(base, u)));
    const reveal = async () => {
        await cssReady;
        const c = $('#content');
        if (c) c.style.removeProperty('display');
        console.log('Router: Content revealed'); // Debug log
    };
    document.addEventListener('loader:done', reveal, { once: true });

    // Load screen-glitcher after loader
    document.addEventListener('loader:done', async () => {
        await loadScripts(['base/screen-glitcher.js']);
        console.log('Router: Screen glitcher loaded'); // Debug log
    }, { once: true });

    // Run init
    const init = data.init || null;
    const when = (init && init.when) || 'afterLoader';
    function runInit() {
        if (!init || !init.fn) return;
        try {
            const fn = (typeof init.fn === 'function') ? init.fn : window[init.fn];
            const args = Array.isArray(init.args) ? init.args : (init.args ? [init.args] : []);
            if (typeof fn === 'function') fn.apply(window, args);
            console.log('Router: Init function ran', init.fn); // Debug log
        } catch (e) {
            console.warn('Init failed', e);
        }
    }

    if (when === 'immediate') {
        runInit();
    } else if (when === 'afterLoader') {
        if (window.__loaderDone) runInit();
        else document.addEventListener('loader:done', runInit, { once: true });
    } else {
        if (document.readyState !== 'loading') runInit();
        else document.addEventListener('DOMContentLoaded', runInit, { once: true });
    }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
})();