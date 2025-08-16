/*
  terms-vanilla.shell.js — Robust scroll-to-accept gate
  Fixes:
  - Unlocks the checkbox when content fits (no scroll needed)
  - Works reliably on iOS/Android (min-height:0 + touch events)
  - Handles dynamic content height (images/fonts) via observers
  - Tolerates fractional scroll values (rounding)
*/
(function(){
  'use strict';
  const $ = (q, el=document) => el.querySelector(q);

  function fetchFirst(paths){
    const go = i => fetch(paths[i], {credentials:'same-origin'})
      .then(r=>{ if(!r.ok) throw new Error(r.status); return r.text(); })
      .catch(e => i+1<paths.length ? go(i+1) : Promise.reject(e));
    return go(0);
  }

  function injectTerms(html){
    const box = $('#scrollbox');
    if(!box) return;

    // ensure scroll container is focusable & scrollable
    box.tabIndex = 0;
    box.style.webkitOverflowScrolling = 'touch';

    const hasBody = /<body[\s\S]*?>[\s\S]*<\/body>/i.test(html);
    if (hasBody){ const tmp=document.createElement('html'); tmp.innerHTML=html; box.innerHTML = tmp.querySelector('body').innerHTML; }
    else { box.innerHTML = html; }

    // sentinel at the end for intersection-based unlock
    let sentinel = box.querySelector('#scroll-sentinel');
    if(!sentinel){ sentinel = document.createElement('div'); sentinel.id='scroll-sentinel'; sentinel.style.cssText='height:1px;'; box.appendChild(sentinel); }

    box.scrollTop = 0;
  }

  function wireScrollGate(){
    const box = $('#scrollbox');
    const chk = $('#chk');
    const btn = $('#btn-accept');
    const win = $('.term-window') || document.getElementById('terms') || document.body; if(!box||!chk||!btn) return;;
    if(!box || !chk || !btn || !win) return;

    // Reset state
    chk.checked = false;
    chk.indeterminate = false;
    chk.disabled = true;   // locked until bottom reached
    btn.disabled = true;   // locked until checked
    btn.setAttribute('aria-disabled','true');

    const atBottom = () => Math.ceil(box.scrollTop + box.clientHeight) >= Math.floor(box.scrollHeight - 1);
    const unlock   = () => { chk.disabled = false; btn.disabled = !chk.checked; btn.setAttribute('aria-disabled', String(btn.disabled)); };
    const update   = () => { if (atBottom()) unlock(); };

    // If content already fits the viewport, unlock immediately
    if (box.scrollHeight <= box.clientHeight + 1) unlock();

    // Observe bottom sentinel for dynamic content/images
    const sentinel = box.querySelector('#scroll-sentinel');
    if (sentinel && 'IntersectionObserver' in window){
      const io = new IntersectionObserver((entries)=>{
        if(entries.some(e=>e.isIntersecting)) unlock();
      }, {root: box, threshold: 0.01});
      io.observe(sentinel);
    }

    // Common user interactions that should re-check position
    box.addEventListener('scroll', update, {passive:true});
    box.addEventListener('wheel',  update, {passive:true});
    box.addEventListener('touchmove', update, {passive:true});
    window.addEventListener('resize', update, {passive:true});
    box.addEventListener('keydown', e=>{ if(e.key==='End' || e.key==='PageDown' || e.key==='ArrowDown' || e.key===' '){ setTimeout(update,0); } });

    // Late-loading media/fonts may change height
    box.querySelectorAll('img,video,iframe').forEach(el=> el.addEventListener('load', ()=>update(), {once:true}));
    document.fonts && document.fonts.ready && document.fonts.ready.then(update).catch(()=>{});

    chk.addEventListener('change', () => { btn.disabled = !chk.checked; btn.setAttribute('aria-disabled', String(btn.disabled)); });

    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      win.classList.add('accepted');
      document.dispatchEvent(new CustomEvent('terms:accepted'));
      btn.disabled = true; btn.setAttribute('aria-disabled','true');
      btn.textContent = 'Aceite';
    });
  }

  function wireAudio(){
    let audio; const host = document.getElementById('terms');
    const src = host?.dataset?.audio || '/audio/botas.mp3';
    document.addEventListener('terms:accepted', () => {
      if(!audio){ audio = new Audio(src); audio.preload = 'auto'; audio.volume = 1.0; }
      audio.currentTime = 0; audio.play().catch(()=>{});
    });
  }

  function init(){
    const host = document.getElementById('terms');
    if(host) host.style.display = 'block';

    const explicit = host?.dataset?.termsUrl; // optional override
    const paths = explicit ? [explicit] : [
      'content/terms-content.html', './terms-content.html',
      '/museum-audio/terms-content.html', '/terms-content.html'
    ];

    fetchFirst(paths)
      .then(injectTerms)
      .catch(()=> injectTerms('<p><strong>[Aviso]</strong> Não foi possível carregar <code>terms-content</code>.</p>'))
      .finally(() => { wireScrollGate(); });

    wireAudio();
  }

  function startWhenLoaded(){
    const run = () => { try{ init(); } catch(e){ console.error('[terms] init failed', e); } };
    if (document.body.classList.contains('is-loaded')) return run();
    document.addEventListener('loader:done', run, { once:true });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', startWhenLoaded, { once:true });
  else startWhenLoaded();
})();
