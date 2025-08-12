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

  // Boot
  window.addEventListener('DOMContentLoaded', ()=>{
    glitchCycle();
    $$('.type').forEach(el=>typewrite(el));
    initRun();
    initDiff();
  });
})();