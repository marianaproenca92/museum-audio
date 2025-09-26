// Tiny timing game: tap when needle is in the green center
const pageBase = document.body?.dataset?.pageBase || '';
const join = (u) => (/^([a-z]+:)?\/\//i.test(u) || u.startsWith('/')) ? u : (pageBase ? pageBase + u : u);

// preload the cake song
const sfxCake = new Audio(join('cake.mp3'));
sfxCake.preload = 'auto';


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

  function spawnCrumbs(count=16){
    const tray = document.querySelector('.cake__tray');
    if(!tray) return;
    const box = document.createElement('div');
    box.className = 'crumbs';
    for(let i=0;i<count;i++){
      const s = document.createElement('span');
      s.className = 'crumb';
      s.style.setProperty('--tx', (Math.random()*80 - 40).toFixed(1) + 'px');
      s.style.setProperty('--dy', (50 + Math.random()*48).toFixed(1) + 'px');
      s.style.setProperty('--delay', (Math.random()*0.08).toFixed(2) + 's');
      box.appendChild(s);
    }
    tray.appendChild(box);
    setTimeout(()=> box.remove(), 1200);
  }


  function play(){
    const wrap = $('#cake-game');
    const needle = $('.meter__needle', wrap);
    const knife = $('.cake__knife', wrap);
    const result = $('#result');
    const btn = $('#btn-start');

    result.textContent = '';
    result.className = 'cake__result';
    // DO NOT disable the button here — we want the second tap to register
    wrap.classList.add('cake--armed');
    running = true;
    t0 = performance.now() + Math.random()*400;
    speed = 1.4 + Math.random()*0.8;

    const loop = (t)=>{
      if(!running) return;
      const k = (Math.sin((t - t0) * 0.006 * speed) + 1) / 2;
      const pct = k*100;
      needle.style.left = pct + '%';
      needle.setAttribute('aria-valuenow', String(pct|0));
      const dx = (k - 0.5) * 40;
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
    // REMOVE the aria-disabled guard so the second tap works
    if(!running){
      FX.beep(640, 80);
      play();
      this.textContent = 'CORTAR!';
      this.classList.add('crt-btn--danger');
    } else {
      const ok = judge();
      stop();
      this.textContent = 'NOVO CORTE';
      this.classList.remove('crt-btn--danger');
      const out = document.getElementById('result');
      if(ok){
        const wrap = document.getElementById('cake-game');
        wrap.classList.remove('cake--armed');
        wrap.classList.add('cake--cut');
        spawnCrumbs(18);

        out.textContent = 'CORTE LIMPO — PROTOCOLO VALIDADO';
        out.classList.add('cake__result--ok');
        // play the cake song
        try {
          sfxCake.currentTime = 0;
          sfxCake.play();
        } catch(_) {}

        FX.beep(1000, 140);
        setTimeout(()=>FX.beep(1200, 120), 120);
        try { window.TerminalGlitch?.glitchOnce?.('medium'); } catch(_) {}
      }else{
        out.textContent = 'CORTE TORTO — TENTAR NOVAMENTE';
        out.classList.add('cake__result--bad');
        FX.beep(320, 220);
      }
    }
  }

  function init(){
    // run once, no matter who calls (router, DOM ready, loader:done)
    if (init._done) return;
    init._done = true;
    const btn = document.getElementById('btn-start');
    if(!btn) return;
    btn.addEventListener('click', onStart, { passive: true });
  }


  return { init };
})();

// ---- resilient bootstrap: works with or without the router ----
// 1) If loader fires an event, wire up then.
window.addEventListener('loader:done', () => window.Cake?.init?.(), { once: true });
// 2) Also wire on DOM ready (covers the "mirror" style pages that self-init).
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  // next tick so #arena has time to be injected
  setTimeout(() => window.Cake?.init?.(), 0);
} else {
  document.addEventListener('DOMContentLoaded', () => window.Cake?.init?.(), { once: true });
}
