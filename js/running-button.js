// running-button.js — button in fixed overlay, clamped to #arena rect
(function(){
  const $ = (q, el=document) => el.querySelector(q);
  const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));
  const tryPlay = async el => { try{ await el.play(); return true; } catch(_){ return false; } };

  window.initRunawayButton = function(opts){
    const arena = $(opts.arena);
    const overlay = $('#rb-overlay');
    const btn = $(opts.btn);
    const audio = $(opts.audio);
    const panel = $(opts.audioPanel);
    const pad = Number(opts.padding ?? 12);
    if(!arena || !overlay || !btn) return;

    // ensure overlay paints last and contains the button
    document.body.appendChild(overlay);
    if(btn.parentElement !== overlay) overlay.appendChild(btn);
    btn.style.position = 'absolute';

    const arenaRect = () => arena.getBoundingClientRect();

    // initial center (viewport coords)
    (function center(){
      const ar = arenaRect(); const bw = btn.offsetWidth || 190, bh = btn.offsetHeight || 48;
      btn.style.left = Math.round(ar.left + (ar.width - bw)/2) + 'px';
      btn.style.top  = Math.round(ar.top  + (ar.height- bh)/2) + 'px';
    })();

    let caught=false, evades=0, mercy=false, R0=160;

    function moveAway(mx,my){
      if(caught) return;
      const br = btn.getBoundingClientRect(), ar = arenaRect();
      const cx = br.left + br.width/2, cy = br.top + br.height/2;
      const dist = Math.hypot(cx-mx, cy-my), R = mercy ? 90 : R0;
      if(dist < R){
        evades++;
        const angle = Math.atan2(cy-my, cx-mx) + (Math.random()-0.5)*0.9;
        const step  = Math.max(60, R - dist) + (mercy ? 18 : 140);
        let nx = (parseFloat(btn.style.left)||0) + Math.cos(angle)*step;
        let ny = (parseFloat(btn.style.top )||0) + Math.sin(angle)*step;
        nx = clamp(nx, Math.round(ar.left + pad),   Math.round(ar.right  - br.width  - pad));
        ny = clamp(ny, Math.round(ar.top  + pad),   Math.round(ar.bottom - br.height - pad));
        btn.style.left = nx + 'px'; btn.style.top  = ny + 'px';
        
      }
    }

    function toast(msg){ const el = $('#toast'); if(!el) return; el.textContent = msg; el.classList.add('show'); clearTimeout(el.__t); el.__t=setTimeout(()=>el.classList.remove('show'),1200); }
    document.addEventListener('mousemove', e=> moveAway(e.clientX,e.clientY));
    document.addEventListener('touchmove', e=>{ const t=e.touches[0]; if(t) moveAway(t.clientX,t.clientY); }, {passive:true});

    btn.addEventListener('click', async ()=>{
      if(caught) return; caught=true; btn.classList.add('is-caught'); btn.setAttribute('aria-pressed','true');
      if(panel) panel.hidden=false;
      if(audio){
        audio.hidden=false; audio.controls=true;
        const ok = await tryPlay(audio);
        const hint = document.getElementById('audio-hint');
        if(!ok && hint){ hint.textContent='toque para iniciar o som.'; const arm=async()=>{ const ok2=await tryPlay(audio); if(ok2){ hint.textContent='a reproduzir.'; document.removeEventListener('pointerdown',arm); document.removeEventListener('keydown',arm);} }; document.addEventListener('pointerdown',arm); document.addEventListener('keydown',arm);} else if(hint){ hint.textContent='a reproduzir.'; }
      }
      if(typeof opts.onPlay==='function'){ try{ opts.onPlay(); }catch(_){ } }
    });

    new ResizeObserver(()=>{ // keep inside arena on resize
      const br = btn.getBoundingClientRect(), ar = arenaRect();
      const nx = clamp(parseFloat(btn.style.left)||0, Math.round(ar.left + pad), Math.round(ar.right  - br.width  - pad));
      const ny = clamp(parseFloat(btn.style.top )||0, Math.round(ar.top  + pad), Math.round(ar.bottom - br.height - pad));
      btn.style.left = nx + 'px'; btn.style.top = ny + 'px';
    }).observe(arena);
  };
})();
