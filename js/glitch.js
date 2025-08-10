/* ===== Glitch helpers, audio bleep, RUN button logic ===== */
(function(){
  const $ = (q, el=document) => el.querySelector(q);
  const $$ = (q, el=document) => Array.from(el.querySelectorAll(q));

  // Boot beeps
  const beep = (freq=920, dur=0.04) => {
    try{
      const a = new (window.AudioContext||window.webkitAudioContext)();
      const o = a.createOscillator(); const g = a.createGain();
      o.type = 'square'; o.frequency.value = freq; o.connect(g);
      g.connect(a.destination); g.gain.setValueAtTime(0.07, a.currentTime);
      o.start(); o.stop(a.currentTime+dur);
    }catch(e){/* no audio */}
  };

  // Typewriter effect
  function typewrite(el, speed=18){
    const text = el.dataset.text || el.textContent; el.textContent='';
    let i=0; const tick=()=>{ el.textContent += text[i++]; if(i<text.length){ if(i%7===0) beep(640, .02); requestAnimationFrame(tick);} };
    tick();
  }

  // Glitch title shimmer
  function glitchCycle(){
    $$('.glitch').forEach(el=>{
      el.classList.add('flick');
      setTimeout(()=>el.classList.remove('flick'), 1400 + Math.random()*800);
    });
    setTimeout(glitchCycle, 1800 + Math.random()*1200);
  }

  // RUN button — wiggles away from pointer & jumps to random project
  const PROJECTS = [
    'botas.html','prisioneiro.html','maquina-fotografica.html','casaco-malha.html','pizza.html',
    'barretina.html','luvas.html','padel.html','pc.html','unhas.html','bigo.html','bonsai.html','socorro.html','almas.html'
  ];

  function initRun(){
    $$('.run-btn').forEach(btn=>{
      btn.addEventListener('mousemove', (e)=>{
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - r.left)/r.width - .5;
        const dy = (e.clientY - r.top)/r.height - .5;
        btn.style.transform = `translate(${dx*12}px, ${dy*8}px)`;
      });
      btn.addEventListener('mouseleave', ()=> btn.style.transform = 'translate(0,0)');
      btn.addEventListener('click', (e)=>{
        e.preventDefault(); beep(1020,.06);
        const pool = (btn.dataset.pool||'').split(',').map(s=>s.trim()).filter(Boolean);
        const list = pool.length? pool : PROJECTS;
        const pick = list[Math.floor(Math.random()*list.length)];
        window.location.href = pick;
      });
    });
  }

  // Differences game
  function initDiff(){
    const host = $('#diff-host'); if(!host) return;
    const targets = JSON.parse(host.dataset.points || '[]'); // [{x:%, y:%},...]
    let found=0; const markers=[]; const tol=4; // tolerance in percentage points
    const badge = $('.badge', host);

    function mark(xp, yp){
      const m = document.createElement('div'); m.className='marker';
      m.style.left = xp+'%'; m.style.top = yp+'%';
      host.appendChild(m); markers.push(m);
      beep(860,.07);
    }

    function hit(xp, yp, t){
      return Math.abs(xp - t.x) <= tol && Math.abs(yp - t.y) <= tol;
    }

    host.addEventListener('click', (e)=>{
      const r = host.getBoundingClientRect();
      const xp = ( (e.clientX - r.left) / r.width ) * 100;
      const yp = ( (e.clientY - r.top) / r.height ) * 100;
      const i = targets.findIndex(t=>!t.found && hit(xp,yp,t));
      if(i>-1){ targets[i].found=true; found++; mark(targets[i].x, targets[i].y); badge.textContent = `${found}/${targets.length}`; }
      else { beep(240,.08); host.classList.add('shake'); setTimeout(()=>host.classList.remove('shake'), 180); }
      if(found===targets.length){ $('.status').textContent = '≡ divergências resolvidas: acesso desbloqueado ≡'; beep(1280,.09); }
    });
  }

  // Boot
  window.addEventListener('DOMContentLoaded', ()=>{
    glitchCycle();
    $$('.type').forEach(el=>typewrite(el));
    initRun();
    initDiff();
  });
})();