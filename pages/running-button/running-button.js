(function(){
  const $=(q,el=document)=>el.querySelector(q);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  function ensureArena(){
    let overlay=$('#rb-overlay');
    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='rb-overlay';
      overlay.className='rb-overlay';
      overlay.setAttribute('aria-live','polite');
      overlay.hidden=true;
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function ensureButton(){
    let btn=$('#btn-floating');
    if(!btn){
      btn=document.createElement('button');
      btn.id='btn-floating';
      btn.className='rb-btn';
      btn.type='button';
      btn.textContent='AGARRA-ME SE CONSEGUIRES';
      btn.hidden=true;
      document.body.appendChild(btn);
    }
    return btn;
  }

  function injectCssOnce(){
    if(document.querySelector('style[data-rb]')) return;
    const css = `
      .rb-overlay{position:fixed;inset:0;z-index:30;pointer-events:none;}
      .rb-btn{position:absolute;z-index:31;pointer-events:auto;padding:.9rem 1.1rem;border:1px solid currentColor;border-radius:999px;background:transparent;font:600 15px/1.1 system-ui, sans-serif;}
    `;
    const tag=document.createElement('style'); tag.dataset.rb='1'; tag.appendChild(document.createTextNode(css));
    document.head.appendChild(tag);
  }

  function initRunaway(){
    injectCssOnce();
    const overlay=ensureArena();
    const btn=ensureButton();

    // Layering and initial placement
    document.body.appendChild(overlay);
    overlay.hidden=false;
    if(btn.parentElement!==overlay) overlay.appendChild(btn);
    btn.hidden=false;

    const pad=16;
    const arenaRect = ()=>overlay.getBoundingClientRect();

    (function center(){
      const ar=arenaRect(); const bw=btn.offsetWidth||190, bh=btn.offsetHeight||48;
      btn.style.left = Math.round((ar.width - bw)/2) + 'px';
      btn.style.top  = Math.round((ar.height- bh)/2) + 'px';
    })();

    const R0=160; // flee radius
    let lastX=null,lastY=null;

    function moveAway(mx,my){
      const br = btn.getBoundingClientRect();
      const ar = arenaRect();
      const cx = br.left + br.width/2, cy = br.top + br.height/2;
      const dist = Math.hypot(cx-mx, cy-my);
      if(dist < R0){
        const angle = Math.atan2(cy-my, cx-mx) + (Math.random()-0.5)*0.9;
        const step  = Math.max(60, R0 - dist) + 140;
        let nx = (parseFloat(btn.style.left)||0) + Math.cos(angle)*step;
        let ny = (parseFloat(btn.style.top )||0) + Math.sin(angle)*step;
        const ar=arenaRect();
        nx = clamp(nx, 0+pad, Math.max(0, ar.width  - br.width  - pad));
        ny = clamp(ny, 0+pad, Math.max(0, ar.height - br.height - pad));
        const px = parseFloat(btn.style.left)||0, py = parseFloat(btn.style.top)||0;
        if(Math.abs(nx-px)<1 && Math.abs(ny-py)<1){ nx += (Math.random()>.5? 24 : -24); ny += (Math.random()>.5? 24 : -24); }
        btn.style.left = nx + 'px';
        btn.style.top  = ny + 'px';
      }
    }

    // Desktop + touch
    document.addEventListener('mousemove', e=>{ lastX=e.clientX; lastY=e.clientY; moveAway(e.clientX,e.clientY); }, {passive:true});
    document.addEventListener('touchstart', e=>{ const t=e.touches[0]; if(!t) return; lastX=t.clientX; lastY=t.clientY; moveAway(t.clientX,t.clientY); }, {passive:true});
    document.addEventListener('touchmove',  e=>{ const t=e.touches[0]; if(!t) return; lastX=t.clientX; lastY=t.clientY; moveAway(t.clientX,t.clientY); }, {passive:true});

    // Never let a tap succeed
    btn.addEventListener('pointerdown', e=>{ lastX=e.clientX; lastY=e.clientY; moveAway(e.clientX,e.clientY); e.preventDefault(); });
    btn.addEventListener('click', e=>{ e.preventDefault(); if(lastX!=null) moveAway(lastX,lastY); });

    // Keep inside on resize/rotate
    new ResizeObserver(()=>{
      const br=btn.getBoundingClientRect(); const ar=arenaRect();
      const nx=clamp(parseFloat(btn.style.left)||0, pad, Math.max(0, ar.width  - br.width  - pad));
      const ny=clamp(parseFloat(btn.style.top )||0, pad, Math.max(0, ar.height - br.height - pad));
      btn.style.left=nx+'px'; btn.style.top=ny+'px';
    }).observe(overlay);
  }

  function startWhenReady(){
    const booted = ()=> document.body.classList.contains('is-loaded');
    const go = ()=> { try{ initRunaway(); }catch(e){ console.error('[running-button] init failed', e); } };
    if(booted()) return go();
    document.addEventListener('loader:done', go, { once:true });
  }

  // Kick off
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', startWhenReady, {once:true});
  else startWhenReady();
})();