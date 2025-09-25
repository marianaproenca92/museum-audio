// Tiny timing game: tap when needle is in the green center
window.Cake = (function(){
  const $ = (q, el=document) => el.querySelector(q);

  // lightweight sfx using WebAudio (no assets)
  const FX = {
    ctx: null,
    ctxEnsure(){ if(!this.ctx){ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); } return this.ctx; },
    beep(freq=740, ms=120, vol=0.07){
      try{
        const a=this.ctxEnsure(), t=a.currentTime;
        const o=a.createOscillator(); o.type='square'; o.frequency.value=freq;
        const g=a.createGain(); g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t+ms/1000);
        o.connect(g).connect(a.destination); o.start(t); o.stop(t+ms/1000);
      }catch(_){}
    }
  };
  window.addEventListener('pointerdown', ()=>FX.ctxEnsure()?.resume?.(), { once:true, passive:true });

  let raf=null, running=false, t0=0, speed=1.6;

  function play(){
    const wrap = $('#cake-game');
    const needle = $('.meter__needle', wrap);
    const knife = $('.cake__knife', wrap);
    const result = $('#result');
    const btn = $('#btn-start');

    result.textContent = '';
    result.className = 'cake__result';
    btn.setAttribute('aria-disabled', 'true');
    wrap.classList.add('cake--armed');
    running = true;
    t0 = performance.now() + Math.random()*400;      // slight random start
    speed = 1.4 + Math.random()*0.8;                 // vary difficulty per round

    const loop = (t)=>{
      if(!running) return;
      const k = (Math.sin((t - t0) * 0.006 * speed) + 1) / 2; // 0..1
      const pct = k*100;
      needle.style.left = pct + '%';
      needle.setAttribute('aria-valuenow', String(pct|0));
      // parallax the knife a tiny bit
      const dx = (k - 0.5) * 40; // +-20px
      knife.style.setProperty('--x', dx.toFixed(1) + 'px');
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function stop(){
    running = false;
    if(raf){ cancelAnimationFrame(raf); raf=null; }
    const wrap = $('#cake-game');
    wrap.classList.remove('cake--armed');
    $('#btn-start').removeAttribute('aria-disabled');
  }

  function judge(){
    // success if needle ∈ [35%, 65%]
    const needle = document.querySelector('.meter__needle');
    const left = parseFloat(needle.style.left) || 0;
    return left >= 35 && left <= 65;
  }

  function onStart(){
    if(this.getAttribute('aria-disabled') === 'true') return;
    if(!running){
      FX.beep(640, 80);
      play();
      this.textContent = 'CORTAR!';
      this.classList.add('crt-btn--danger');
    } else {
      // user attempts the cut
      const ok = judge();
      stop();
      this.textContent = 'NOVO CORTE';
      this.classList.remove('crt-btn--danger');
      const out = document.getElementById('result');
      if(ok){
        out.textContent = 'CORTE LIMPO — AUTORIZADO A SERVIR 🥂';
        out.classList.add('cake__result--ok');
        FX.beep(1000, 140);
        setTimeout(()=>FX.beep(1200, 120), 120);
        // quick terminal glitch shimmer for drama (if your screen glitcher is active)
        try{ window.TerminalGlitch?.glitchOnce?.('medium'); }catch(_){}
      }else{
        out.textContent = 'CORTE TORTO — TENTAR NOVAMENTE';
        out.classList.add('cake__result--bad');
        FX.beep(320, 220);
      }
    }
  }

  function init(){
    const btn = document.getElementById('btn-start');
    if(!btn) return;
    btn.addEventListener('click', onStart);
  }

  return { init };
})();
