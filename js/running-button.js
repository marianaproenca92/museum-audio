// Runaway button that NEVER stops (mobile-friendly)
// Drop-in swap for your current running-button.js
(function(){
  const $=(q,el=document)=>el.querySelector(q);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  window.initRunawayButton=function(opts){
    const arena = $(opts.arena);
    const overlay = $('#rb-overlay');
    const btn = $(opts.btn);
    const pad = Number(opts.padding ?? 12);
    if(!arena || !overlay || !btn) return;

    // Layering
    document.body.appendChild(overlay);
    if(btn.parentElement!==overlay) overlay.appendChild(btn);
    btn.style.position='absolute';

    const arenaRect = ()=>arena.getBoundingClientRect();

    // Start centered
    (function center(){
      const ar = arenaRect(); const bw = btn.offsetWidth||190, bh = btn.offsetHeight||48;
      btn.style.left = Math.round(ar.left + (ar.width - bw)/2) + 'px';
      btn.style.top  = Math.round(ar.top  + (ar.height- bh)/2) + 'px';
    })();

    let lastX=null,lastY=null; // remember last pointer position
    const R0=160; // flee radius

    function moveAway(mx,my){
      const br = btn.getBoundingClientRect();
      const ar = arenaRect();
      const cx = br.left + br.width/2, cy = br.top + br.height/2;
      const dist = Math.hypot(cx-mx, cy-my), R = R0;
      if(dist < R){
        const angle = Math.atan2(cy-my, cx-mx) + (Math.random()-0.5)*0.9;
        const step  = Math.max(60, R - dist) + 140;
        let nx = (parseFloat(btn.style.left)||0) + Math.cos(angle)*step;
        let ny = (parseFloat(btn.style.top )||0) + Math.sin(angle)*step;
        nx = clamp(nx, Math.round(ar.left + pad),   Math.round(ar.right  - br.width  - pad));
        ny = clamp(ny, Math.round(ar.top  + pad),   Math.round(ar.bottom - br.height - pad));
        // Unstick if clamped to same spot
        const px = parseFloat(btn.style.left)||0, py = parseFloat(btn.style.top)||0;
        if(Math.abs(nx-px)<1 && Math.abs(ny-py)<1){
          nx = clamp(px + (Math.random()>.5? 24 : -24), Math.round(ar.left + pad), Math.round(ar.right  - br.width  - pad));
          ny = clamp(py + (Math.random()>.5? 24 : -24), Math.round(ar.top  + pad), Math.round(ar.bottom - br.height - pad));
        }
        btn.style.left = nx + 'px';
        btn.style.top  = ny + 'px';
      }
    }

    // Desktop hover
    document.addEventListener('mousemove', e=>{ lastX=e.clientX; lastY=e.clientY; moveAway(e.clientX,e.clientY); }, {passive:true});

    // Touch: react on touchstart + move
    document.addEventListener('touchstart', e=>{
      const t=e.touches[0]; if(!t) return; lastX=t.clientX; lastY=t.clientY; moveAway(t.clientX,t.clientY);
    }, {passive:true});
    document.addEventListener('touchmove', e=>{
      const t=e.touches[0]; if(!t) return; lastX=t.clientX; lastY=t.clientY; moveAway(t.clientX,t.clientY);
    }, {passive:true});

    // Taps should NEVER catch — convert any tap into a dodge and kill the click
    btn.addEventListener('pointerdown', e=>{ lastX=e.clientX; lastY=e.clientY; moveAway(e.clientX,e.clientY); e.preventDefault(); });
    btn.addEventListener('click', e=>{ e.preventDefault(); if(lastX!=null) moveAway(lastX,lastY); });

    // Keep inside on resize/rotate
    new ResizeObserver(()=>{
      const br=btn.getBoundingClientRect(), ar=arenaRect();
      const nx=clamp(parseFloat(btn.style.left)||0, Math.round(ar.left+pad), Math.round(ar.right - br.width - pad));
      const ny=clamp(parseFloat(btn.style.top )||0, Math.round(ar.top +pad), Math.round(ar.bottom- br.height- pad));
      btn.style.left=nx+'px'; btn.style.top=ny+'px';
    }).observe(arena);
  };
})();
