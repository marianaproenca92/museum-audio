/* Glitch Loader v3 — Fallout-style terminal with per-page break effects
 * Features
 *  - Loads bootlog lines from a JSON URL (simple array OR {beforeBreak:[], afterBreak:[]})
 *  - Optional detour bootlog JSON to swap after the BREAK (to "load something else")
 *  - Per-page visual BREAK effect selection (shake | flatline | desync | scantear | pixel | blackout)
 *  - Clean CSS loading: pass one bundle CSS or one CSS per effect (auto-injected <link>)
 *
 * Usage (HTML, per page):
 *  <link rel="stylesheet" href="/css/glitch-loader.css">                 // base CRT styles
 *  <script defer src="/js/glitch-loader.v3.js"></script>
 *  <body data-bootlog="/bootlogs/botas.json"
 *        data-detour="/bootlogs/pizza.json"              // optional
 *        data-break="flatline"                           // choose effect per page
 *        data-break-css="/css/break-flatline.css">       // one CSS (or comma-separated list)
 *
 * Or programmatic:
 *  GlitchLoader.start({ title:'MUSEU // BOTAS', bootlogUrl:'/bootlogs/botas.json',
 *    detourUrl:'/bootlogs/pizza.json', effect:'scantear', effectCss:'/css/break-scantear.css' });
 */
(function(){
  const $ = (q, el=document) => el.querySelector(q);
  const on = (t, ev, fn, o) => t && t.addEventListener(ev, fn, o);

  // ---------- CSS helpers ----------
  function ensureCss(href){
    if(!href) return;
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    if(links.some(l => l.href && l.href.endsWith(href))) return; // tolerate absolute vs relative
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
  function ensureManyCss(hrefs){ (hrefs||[]).forEach(h => ensureCss(h.trim())); }

  // ---------- Bootlog loading ----------
  async function fetchJson(url){
    const r = await fetch(url, { cache:'no-store' });
    if(!r.ok) throw new Error('Failed to load '+url);
    return r.json();
  }
  function normalizeBanks(primary, detour){
    // Accept array OR {beforeBreak:[], afterBreak:[]} for each bank
    const toParts = (bank) => {
      if(!bank) return { before:[], after:[] };
      if(Array.isArray(bank)){
        const n = Math.max(2, Math.min(bank.length-1, Math.floor(bank.length*0.6)));
        return { before: bank.slice(0,n), after: bank.slice(n) };
      }
      const b4 = bank.beforeBreak || bank.initial || bank.before || [];
      const aft = bank.afterBreak  || bank.detour  || bank.after  || [];
      return { before: Array.isArray(b4)? b4 : [], after: Array.isArray(aft)? aft : [] };
    };
    const A = toParts(primary);
    const B = detour ? toParts(detour) : null;
    // If detour exists, we always swap to detour.after (or all of detour) after break
    return B ? { before: A.before, after: (B.before.length||B.after.length)? [...B.before, ...B.after] : [] }
             : A;
  }

  // ---------- DOM shell ----------
  function makeOverlay(titleText){
    const host = document.createElement('div'); host.className = 'gl-loader';
    host.innerHTML = `
      <div class="gl-term gl-flick">
        <div class="gl-head"><span class="gl-dot"></span><span class="gl-dot"></span><span class="gl-dot"></span>
          <span class="gl-title">${titleText||'ARQUIVO // ARRANQUE'}</span>
        </div>
        <section class="gl-panel">
          <strong class="label">ARQUIVO // RASTREIO</strong>
          <pre class="gl-bootlog" id="gl-bootlog" aria-live="polite"></pre>
          <small class="muted">(se o ecrã tremer, é normal — os espíritos mexem nos cabos)</small>
        </section>
        <div class="gl-foot"><small>estado: a iniciar…</small><small id="gl-sess"></small></div>
      </div>`;
    document.body.appendChild(host);
    const sess = Math.random().toString(36).slice(2,8).toUpperCase();
    host.querySelector('#gl-sess').textContent = `sessão ${sess}`;
    return host;
  }

  // ---------- Writer ----------
  function typeLines(outEl, lines, onBreak, onDone){
    const all = [...(lines.before||[]), '\n', '— — — INTERRUPÇÃO — — —', '\n'];
    const after = lines.after||[];
    let i = 0, j = 0, ln = all[0]||'';

    (function tick(){
      if(i >= all.length){
        // trigger BREAK once, then continue with after-lines
        onBreak && onBreak();
        typeAfter();
        return;
      }
      const ch = ln[j++] || '';
      outEl.innerHTML += ch;
      if(j <= ln.length){ setTimeout(tick, 16); }
      else { // next line
        i++; ln = all[i]||''; j = 0;
        setTimeout(tick, 22);
      }
    })();

    function typeAfter(){
      let k = 0, jj = 0, lna = after[0]||'';
      (function t2(){
        if(k >= after.length){ onDone && onDone(); return; }
        const ch = lna[jj++] || '';
        outEl.innerHTML += ch;
        if(jj <= lna.length){ setTimeout(t2, 16); }
        else { k++; lna = after[k]||''; jj = 0; setTimeout(t2, 22); }
      })();
    }
  }

  // ---------- Break effects (JS hooks) ----------
  const BreakFX = {
    async prepare(effect, effectCss){ // load CSS before firing
      const list = (typeof effectCss === 'string') ? effectCss.split(',') : (effectCss||[]);
      ensureManyCss(list);
    },
    run(effect, host){
      const term = host.querySelector('.gl-term'); if(!term) return;
      const log  = host.querySelector('#gl-bootlog');
      const add  = c => term.classList.add(c); const rem = c => term.classList.remove(c);
      switch(effect){
        case 'flatline': {
          add('fx-flatline');
          // optional ECG overlay element if CSS expects it
          const ecg = document.createElement('div'); ecg.className='fx-ecg-layer'; term.appendChild(ecg);
          setTimeout(()=>{ ecg.remove(); rem('fx-flatline'); }, 820);
          break; }
        case 'desync':   { add('fx-desync');   setTimeout(()=>rem('fx-desync'),   520); break; }
        case 'scantear': {
          const L=document.createElement('div'), B=document.createElement('div');
          L.className='fx-layer fx-top'; B.className='fx-layer fx-bot';
          // clone minimal to avoid heavy DOM cost
          const c1=document.createElement('div'); const c2=document.createElement('div');
          c1.className='fx-clone'; c2.className='fx-clone';
          c1.textContent = log ? log.textContent : ''; c2.textContent = c1.textContent;
          L.appendChild(c1); B.appendChild(c2);
          term.classList.add('fx-scantear'); term.appendChild(L); term.appendChild(B);
          setTimeout(()=>{ L.remove(); B.remove(); term.classList.remove('fx-scantear'); }, 560);
          break; }
        case 'pixel':    { add('fx-pixel');    setTimeout(()=>rem('fx-pixel'),    460); break; }
        case 'blackout': { add('fx-blackout'); setTimeout(()=>rem('fx-blackout'), 460); break; }
        case 'shake':
        default:         { add('gl-broken');   setTimeout(()=>rem('gl-broken'),   600); break; }
      }
    }
  };

  // ---------- Public API ----------
  window.GlitchLoader = {
    /**
     * @param {Object} opts
     * @param {string} [opts.title]
     * @param {string} [opts.bootlogUrl] - JSON URL for the intended page bootlog
     * @param {string} [opts.detourUrl]  - optional JSON URL for the detour (shown AFTER BREAK)
     * @param {string|string[]} [opts.css] - base CSS file(s) to ensure (e.g., '/css/glitch-loader.css')
     * @param {string|string[]} [opts.effectCss] - CSS file(s) for the selected break (bundle or per-effect)
     * @param {string} [opts.effect] - 'shake'|'flatline'|'desync'|'scantear'|'pixel'|'blackout'
     * @param {function} [opts.onDone]
     * @param {boolean} [opts.keep]
     */
    async start(opts={}){
      // Derive from <body> if present
      const b = document.body || {};
      const bootlogUrl = opts.bootlogUrl || b.dataset.bootlog;
      const detourUrl  = opts.detourUrl  || b.dataset.detour;
      const effect     = (opts.effect || b.dataset.break || 'shake').trim();
      const effectCss  = opts.effectCss || b.dataset.breakCss || '';
      const baseCss    = opts.css || b.dataset.loaderCss || '';

      // CSS (base + effect)
      ensureManyCss(Array.isArray(baseCss)? baseCss : (baseCss? [baseCss] : []));
      await BreakFX.prepare(effect, effectCss);

      // Build overlay
      const host = makeOverlay(opts.title);
      const out  = host.querySelector('#gl-bootlog');
      host.dispatchEvent(new CustomEvent('loader:ready', { bubbles:true, detail:{ host } }));

      // Load banks
      let primary=null, detour=null;
      try{ if(bootlogUrl) primary = await fetchJson(bootlogUrl); }catch(e){ primary = []; }
      try{ if(detourUrl)  detour  = await fetchJson(detourUrl);  }catch(e){ detour  = null; }
      const banks = normalizeBanks(primary, detour);

      // Type out with a single BREAK in the middle
      typeLines(out, banks, () => {
        BreakFX.run(effect, host);
        host.dispatchEvent(new CustomEvent('loader:break', { bubbles:true, detail:{ host, effect } }));
      }, () => {
        opts.onDone && opts.onDone(host);
        host.dispatchEvent(new CustomEvent('loader:done', { bubbles:true, detail:{ host } }));
        if(!opts.keep){ host.style.transition='opacity .28s ease'; host.style.opacity='0'; setTimeout(()=>host.remove(), 300); }
      });

      return host;
    }
  };

  // ---------- Auto-wire if page declares data-bootlog ----------
  function auto(){
    const b = document.body || {};
    if(!b.dataset || !b.dataset.bootlog) return;
    window.GlitchLoader.start({ title: document.title.replace(/-.*/, '').trim() || 'ARQUIVO' });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();