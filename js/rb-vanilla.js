(function(){
  'use strict';
  const $ = (q, el=document) => el.querySelector(q);

  function resolveBootBank(){
    const url = document.body.dataset.bootlog;
    if(!url) return Promise.resolve([]);
    return fetch(url, {credentials:'same-origin'})
      .then(r=>r.text())
      .then(t=>{ try{return JSON.parse(t);} catch{return t.split(/\r?\n/).filter(Boolean);} })
      .catch(()=>[]);
  }

  function killOverlays(){
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-loaded');
    document.querySelectorAll('.gl-loader, .gl-overlay, [data-glitch-overlay], .matrix-intro, .intro').forEach(el=> el.remove());
  }

  function seedSession(){ const el = $('#sess'); if (el) el.textContent = Math.random().toString(36).slice(2,8).toUpperCase(); }

  function makeFullViewport(){
    const hole = $('#rb-overlay');
    hole.hidden = false;
    // ensure it spans the viewport even after mobile UI chrome changes
    const set = ()=>{ hole.style.width = window.innerWidth + 'px'; hole.style.height = window.innerHeight + 'px'; };
    set(); window.addEventListener('resize', set);
  }

  function makeUncatchable(btn, area){
    // never allow a successful click
    const pad = 24; // keep away from edges
    const bounds = ()=>({ w: area.clientWidth, h: area.clientHeight });
    const reposition = ()=>{
      const {w,h} = bounds();
      const bw = btn.offsetWidth || 120, bh = btn.offsetHeight || 48;
      const x = Math.max(pad, Math.floor(Math.random()*(Math.max(1, w - bw - pad*2))) + pad);
      const y = Math.max(pad, Math.floor(Math.random()*(Math.max(1, h - bh - pad*2))) + pad);
      btn.style.transform = `translate(${x}px, ${y}px)`;
    };

    // evade on proximity + on click attempt
    const flee = (e)=>{ if(e) e.preventDefault(); reposition(); };
    btn.addEventListener('pointerenter', ()=> requestAnimationFrame(flee));
    btn.addEventListener('pointerdown', flee, {passive:false});
    // wander periodically to feel "alive"
    setInterval(reposition, 1600);

    // initial spawn
    requestAnimationFrame(reposition);
  }

  function removeFacilitarText(){
    // remove any DOM node that contains the phrase "vou facilitar"
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
    const toRemove = [];
    while(walk.nextNode()){
      const el = walk.currentNode;
      if (/vou\s+facilitar/i.test(el.textContent||'')) toRemove.push(el);
    }
    toRemove.forEach(el=> el.remove());
  }

  window.addEventListener('DOMContentLoaded', function(){
    resolveBootBank().then(bank => {
      GlitchLoader.start({
        bank,
        title: 'ARQUIVO // O BOTÃO FUGITIVO',
        onBreak: host => { host.querySelector('.gl-title').textContent = 'CONTER // OBJETO MOVEDIÇO'; },
        onDone: () => {
          killOverlays();
          $('#content').style.display = 'block';

          // Full‑screen arena lives in the overlay portal
          makeFullViewport();
          const hole = $('#rb-overlay');
          const btn  = $('#btn-floating');
          btn.hidden = false;

          // Keep your original behavior for SFX/toast, but make it uncatchable
          if (window.initRunawayButton){
            // Use the overlay as arena (fills the viewport)
            initRunawayButton({
              arena:'#rb-overlay',
              btn:'#btn-floating',
              audio:'#ritual-audio',
              audioPanel:'#audio-panel',
              toast:'#toast',
              padding:16,
              // If your script supports a flag, set it; otherwise our flee handlers win
              uncatchable:true,
              onPlay: () => { $('#post').style.display='block'; }
            });
          }

          // Hard override to guarantee it's never caught
          makeUncatchable(btn, hole);
          removeFacilitarText();
          seedSession();
        }
      });
    });
  });
})();