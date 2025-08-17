(function(){
  const $=(q,el=document)=>el.querySelector(q);
  let camStream=null, rec=null, listening=false, lastTap=0;

  // Acceptable negatives (normalize accents & case before matching)
  const YES=['sim','siiiim','claro','obvio','óbvio','com certeza','yes','yep','yeah'];
  const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').trim();
  const isYes=s=>{ const t=norm(s); return YES.some(w=> t===norm(w) || t.startsWith(norm(w)+' ') || t.includes(' '+norm(w)+' ') || t.endsWith(' '+norm(w))); };
  
  function petals(n=20){
    const stage=$('.mirror-stage'); if(!stage) return;
    for(let i=0;i<n;i++){
      const p=document.createElement('img'); p.className='petal';
      p.src='/museum-audio/img/petals/p'+(1+(i%6))+'.png';
      p.style.left=(50+(Math.random()*40-20))+'%'; p.style.top='10%'; p.style.opacity='.9';
      stage.appendChild(p);
      const dx=(Math.random()*60-30), dy=80+Math.random()*40, r=90+Math.random()*180;
      p.animate([{transform:'translate(0,0) rotate(0deg)',opacity:.95},{transform:`translate(${dx}vw,${dy}vh) rotate(${r}deg)`,opacity:0}],{duration:1500+Math.random()*800,easing:'cubic-bezier(.2,.7,.2,1)'}).finished.finally(()=>p.remove());
    }
  }

  function hearts(n=14){
    const stage=$('.mirror-stage'); if(!stage) return;
    for(let i=0;i<n;i++){
      const h=document.createElement('span');
      h.className='heart';
      h.textContent='❤'; // works without assets
      const size=18+Math.random()*24; // px
      h.style.fontSize=size+'px';
      h.style.left=(10+Math.random()*80)+'%';
      h.style.top=(20+Math.random()*20)+'%';
      stage.appendChild(h);
      const dx=(Math.random()*60-30), dy=80+Math.random()*40, rot=(Math.random()*120-60);
      h.animate([
        { transform:'translate(0,0) rotate(0deg)', opacity:.95 },
        { transform:`translate(${dx}vw, ${dy}vh) rotate(${rot}deg)`, opacity:0 }
      ], { duration:1300+Math.random()*900, easing:'cubic-bezier(.22,.7,.2,1)' })
      .finished.finally(()=>h.remove());
    }
  }

  function flash(){
    const stage=$('.mirror-stage'); if(!stage) return;
    const f=document.createElement('div'); f.className='reveal-flash'; stage.appendChild(f);
    f.animate([{opacity:0},{opacity:1},{opacity:0}],{duration:360, easing:'ease-out'}).finished.finally(()=>f.remove());
  }

 
  function reveal(){
    $('#askFeedback').innerHTML = '<span class="ok">FAIREST DETECTED // NOIVA CONFIRMADA</span>';

    const img=$('#groomBride');
    const vid=$('#mirrorCam');

    const show = () => {
      flash();
      // SFX (optional, ignore errors if file missing)
      try{ if(!sfx){ sfx=new Audio('/museum-audio/sfx/chime.mp3'); sfx.preload='auto'; sfx.volume=.9; } sfx.currentTime=0; sfx.play().catch(()=>{}); }catch{}

      img.hidden=false;                 // allow CSS to show it
      document.querySelector('#mirror').classList.add('revealed');

      // extra zoom‑in on the photo for drama (on top of opacity transition)
      img.animate([
        { transform:'scaleX(-1) scale(1.06)', opacity:0 },
        { transform:'scaleX(-1) scale(1.00)', opacity:1 }
      ], { duration:420, easing:'cubic-bezier(.2,.7,.2,1)', fill:'forwards' });

      // fade out camera
      if(vid && !vid.hidden){
        vid.animate([{opacity:1},{opacity:0}],{duration:280,fill:'forwards'})
          .finished?.then(()=>{ vid.hidden=true; }).catch(()=>{ vid.hidden=true; });
      }

      // particles
      petals(22);
      hearts(16);

      document.body.classList.add('glitch-pulse');
      setTimeout(()=>document.body.classList.remove('glitch-pulse'), 480);
    };

    if(!img.getAttribute('src')){ img.onload=show; img.src='img/mirror/mirror.jpg'; }
    else { show(); }
  }

  function roast(){
    const lines=['Sistema de vaidade a 110%… resposta incorreta!','Falha crítica: o espelho discorda 👀','Hmm… não foi isso que a fada disse.'];
    $('#askFeedback').innerHTML = '<span class="nope">'+ lines[Math.floor(Math.random()*lines.length)] +'</span>';
  }

  function handleAnswer(text){ isYes(text) ? reveal() : roast(); }

  function bindVoice(){
    const btn=$('#btnListen'); if(!btn) return;
   const hasSR = ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    // Fallback: if no SR, show typed puzzle instead of a reveal button
    if(!hasSR){
      btn.disabled=true; btn.textContent='Sem voz — escreve “Sim”';
      const input=$('#answer'), ok=$('#btnSubmit');
      if(input && ok){ input.hidden=false; ok.hidden=false; ok.addEventListener('click', ()=> handleAnswer(input.value)); }
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    rec = new SR(); rec.lang='pt-PT'; rec.interimResults=false; rec.maxAlternatives=4;
    rec.onresult = (e)=>{ const alts=[...e.results[0]].map(r=>r.transcript); handleAnswer(alts[0]||''); };
    rec.onerror = ()=>{ $('#askFeedback').textContent='[voz] erro — tenta novamente'; };
    rec.onend = ()=>{ listening=false; btn.setAttribute('aria-pressed','false'); };

    btn.addEventListener('click', ()=>{
      if(listening){ rec.stop(); return; }
      listening=true; btn.setAttribute('aria-pressed','true'); $('#askFeedback').textContent='[voz] a ouvir…';
      try{ rec.start(); }catch{ listening=false; btn.setAttribute('aria-pressed','false'); }
    });
  }

  async function startCam(){
    try{
      camStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' }, audio:false });
      const v=$('#mirrorCam'); v.srcObject=camStream; v.hidden=false; $('#mirrorHint').textContent='';
    }catch{
      return;
    }
  }

  function stopCam(){ camStream?.getTracks().forEach(t=>t.stop()); camStream=null; }

  function bindUI(){
    const stage=$('.mirror-stage');
    stage.addEventListener('click', ()=>{ const now=Date.now(); if(now-lastTap<400) reveal(); lastTap=now; });
  }

  function start(){
    bindUI(); bindVoice(); startCam();
    document.addEventListener('page:leave', stopCam, { once:true });
    window.addEventListener('visibilitychange', ()=>{ if(document.hidden) stopCam(); });
  }

  const run=()=>{ try{ start(); }catch(e){ console.error('[mirror-espelho] init failed', e); } };
  if(document.body.classList.contains('is-loaded')) run();
  else document.addEventListener('loader:done', run, { once:true });
})();