(function(){
  const $=(q,el=document)=>el.querySelector(q);
  const stage=$('.bouquet-stage');
  const catcher=$('#catcher');
  const scoreEl=$('#score');
  const goalEl=$('#goal');
  const banner=$('#banner');
  const status=$('#status');
  const slider=$('#tilt');
  const btnTilt=$('#btnTilt');

  let dots=[];            // {el,x,y,vy,ax}
  let running=false; let raf=0; let spawnT=0;
  let score=0; const GOAL=12; goalEl.textContent=GOAL;
  let ctrl=0;             // -1..1 normalized control (tilt or slider)

  // --- Audio (optional, uses page JSON "audio") ---
  let bgm; function prepareBgm(){ if(bgm) return bgm; const src=document.body.dataset.audio; if(!src) return null; bgm=new Audio(src); bgm.loop=true; bgm.preload='auto'; bgm.volume=0; return bgm; }
  function fadeVol(a,to=1,ms=500){ if(!a) return; const from=a.volume; const t0=performance.now(); function step(t){ const p=Math.min(1,(t-t0)/ms); a.volume=from+(to-from)*p; if(p<1) requestAnimationFrame(step); } requestAnimationFrame(step); }

  function playBgm(){ const a=prepareBgm(); if(!a) return; a.play().then(()=>fadeVol(a,.85,400)).catch(()=>{}); }
  function stopBgm(){ if(!bgm) return; fadeVol(bgm,0,250); setTimeout(()=>{ try{ bgm.pause(); }catch{} }, 260); }

  function wantGyro(){
    if(typeof DeviceOrientationEvent==='undefined'){ status.textContent='[tilt] indisponível — usa a barra'; return; }
    if(DeviceOrientationEvent.requestPermission){ // iOS
      DeviceOrientationEvent.requestPermission().then(state=>{
        if(state==='granted'){ window.addEventListener('deviceorientation', onTilt, true); status.textContent='[tilt] ativo'; btnTilt.disabled=true; }
        else { status.textContent='[tilt] negado — usa a barra'; }
      }).catch(()=>{ status.textContent='[tilt] erro — usa a barra'; });
    } else {
      window.addEventListener('deviceorientation', onTilt, true); status.textContent='[tilt] ativo'; btnTilt.disabled=true;
    }
  }

  function onTilt(e){
    const g = e.gamma; // -90..90 (left..right)
    if(typeof g!=='number') return;
    const n = Math.max(-1, Math.min(1, g/30)); // clamp
    ctrl = n;
  }
  slider.addEventListener('input', ()=>{ ctrl = slider.value/100; });
  btnTilt.addEventListener('click', ()=>{ playBgm(); wantGyro(); }, { once:true });

  function spawn(){
    if(!stage) return;
    const el=document.createElement('span');
    el.className='dot'+(Math.random()<0.18?' heart':'');
    el.textContent = el.classList.contains('heart')? '❤' : (Math.random()<0.5? '•' : (Math.random()<0.5? '·' : '✶'));
    stage.appendChild(el);
    const rect=stage.getBoundingClientRect();
    const x = Math.random()*(rect.width-24)+12; // padding
    const y = -20; const vy = 1.2 + Math.random()*1.2; // px/ms
    const ax = (Math.random()*0.0008 - 0.0004); // slight drift
    dots.push({el,x,y,vy,ax,vx:(Math.random()*0.06-0.03)});
    el.style.transform=`translate(${x}px, ${y}px)`;
  }

  function moveCatcher(dt){
    const rect=stage.getBoundingClientRect();
    const w=140; // catcher width
    const cx = (rect.width - w)/2 + ctrl * (rect.width - w)/2;
    catcher.style.transform = `translate(${cx}px, -0px)`; // bottom via CSS
    catcher.dataset.cx = cx; catcher.dataset.cw = w;
  }

  function tick(t){
    if(!running){ raf=0; return; }
    if(!spawnT) spawnT=t;
    const dt = Math.min(32, t - (tick._lt||t)); tick._lt=t;

    // spawn every 180ms, faster over time
    if(t - spawnT > 180){ spawn(); spawnT=t; }

    const rect=stage.getBoundingClientRect();
    const chY = rect.height - 36; // catcher y approx
    const cx = parseFloat(catcher.dataset.cx||'0');
    const cw = parseFloat(catcher.dataset.cw||'140');

    for(let i=dots.length-1;i>=0;i--){
      const d=dots[i];
      d.vx += d.ax * dt; // slight sideways drift
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.el.style.transform = `translate(${d.x}px, ${d.y}px)`;

      // collision (simple AABB)
      if(d.y>chY-22 && d.y<chY+8 && d.x>cx-6 && d.x<cx+cw+6){
        score++; scoreEl.textContent=score; d.el.remove(); dots.splice(i,1);
        navigator.vibrate?.(8);
        if(score>=GOAL){ win(); break; }
        continue;
      }
      // off screen
      if(d.y>rect.height+24){ d.el.remove(); dots.splice(i,1); }
    }

    moveCatcher(dt);
    raf = requestAnimationFrame(tick);
  }

  function win(){
    running=false; if(raf) cancelAnimationFrame(raf);
    banner.hidden=false; banner.animate([{opacity:0, transform:'translateY(60%) scale(0.98)'},{opacity:1, transform:'translateY(50%) scale(1)'}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
    document.body.classList.add('glitch-pulse'); setTimeout(()=>document.body.classList.remove('glitch-pulse'), 480);
    playBgm(); // fade in page audio if provided
  }

  function start(){
    running=true; score=0; scoreEl.textContent='0'; banner.hidden=true; ctrl=0; moveCatcher(0);
    if(!raf) raf=requestAnimationFrame(tick);
  }

  const run=()=>{ try{ start(); }catch(e){ console.error('[bouquet] init failed', e); } };
  if(document.body.classList.contains('is-loaded')) run();
  else document.addEventListener('loader:done', run, { once:true });

  document.addEventListener('page:leave', ()=>{ running=false; if(raf) cancelAnimationFrame(raf); dots.splice(0).forEach(d=>d.el.remove()); stopBgm(); }, { once:true });
})();