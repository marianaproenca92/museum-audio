(function(){
  const $=(q,el=document)=>el.querySelector(q);
  let camStream=null, rec=null, listening=false, lastTap=0;

  // Acceptable negatives (normalize accents & case before matching)
  const NEG = ['não','nao','no','nope','nah','nunca','jamais','nem pensar','claro que não','claro que nao','negative','negativo'];
  const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').trim();
  const isNeg = s => { const t=norm(s); return NEG.some(w=> t===norm(w) || t.startsWith(norm(w)+' ') || t.includes(' '+norm(w)+' ') || t.endsWith(' '+norm(w))); };

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

  function reveal(){
    $('#askFeedback').innerHTML = '<span class="ok">FAIREST DETECTED // NOIVA CONFIRMADA</span>';
    document.querySelector('#mirror').classList.add('revealed');
    petals(24);
    document.body.classList.add('glitch-pulse'); setTimeout(()=>document.body.classList.remove('glitch-pulse'), 450);
  }

  function roast(){
    const lines=['Sistema de vaidade a 110%… resposta incorreta!','Falha crítica: o espelho discorda 👀','Hmm… não foi isso que a fada disse.'];
    $('#askFeedback').innerHTML = '<span class="nope">'+ lines[Math.floor(Math.random()*lines.length)] +'</span>';
  }

  function handleAnswer(text){ isNeg(text) ? reveal() : roast(); }

  function bindVoice(){
    const btn=$('#btnListen'); if(!btn) return;
    if(!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)){
      btn.disabled=true; btn.textContent='Sem voz — usa Revelar'; return;
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
      $('#mirrorHint').textContent='Sem câmara? Diz “não” ou toca 2x';
    }
  }

  function stopCam(){ camStream?.getTracks().forEach(t=>t.stop()); camStream=null; }

  function bindUI(){
    const stage=$('.mirror-stage');
    stage.addEventListener('click', ()=>{ const now=Date.now(); if(now-lastTap<400) reveal(); lastTap=now; });
    $('#btnReveal')?.addEventListener('click', reveal);
  }

  function start(){
    $('#groomBride').src='/museum-audio/img/mirror/groom-bride.jpg';
    bindUI(); bindVoice(); startCam();
    document.addEventListener('page:leave', stopCam, { once:true });
    window.addEventListener('visibilitychange', ()=>{ if(document.hidden) stopCam(); });
  }

  const run=()=>{ try{ start(); }catch(e){ console.error('[mirror-espelho] init failed', e); } };
  if(document.body.classList.contains('is-loaded')) run();
  else document.addEventListener('loader:done', run, { once:true });
})();