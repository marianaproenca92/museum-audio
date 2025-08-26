// ============================
// bouquet.js
// ============================
(function(){
  'use strict';
  const $=(q,el=document)=>el.querySelector(q);
  const root = $('#bouquet'); if(!root) return;

  const stage  = $('.bouquet-stage', root);
  const catcher= $('#catcher', root);
  const scoreEl= $('#score', root);
  const goalEl = $('#goal', root);
  const banner = $('#banner', root);
  const cover  = $('#cover', root);
  const btnStart=$('#btnStart', root);

  // ===== config/state =====
  const GOAL=12; if(goalEl) goalEl.textContent=String(GOAL);
  let running=false, raf=0, lastT=0, nextSpawn=0, score=0;
  let catCenter=0.5;      // 0..1 of stage width
  let ctrl=0;             // -1..1 from tilt/keys; drag sets catCenter directly
  let dragging=false;
  const dots=[];          // {el,x,y,w,h,vx,vy}

  // ===== helpers =====
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const sRect = ()=>stage.getBoundingClientRect();
  const cHalf = ()=> (catcher.offsetWidth||110)/2;

  function placeCatcher(){
    const w=sRect().width;
    const px = clamp(catCenter*w, cHalf(), w - cHalf());
    catcher.style.left = Math.round(px) + 'px'; // left + translateX(-50%)
  }

  // ===== controls =====
  // Drag
  stage.addEventListener('pointerdown',ev=>{
    dragging=true;
    stage.setPointerCapture?.(ev.pointerId);
    const r=sRect();
    catCenter=clamp((ev.clientX - r.left)/r.width, 0, 1);
    placeCatcher();
  });
  stage.addEventListener('pointermove',ev=>{
    if(!dragging) return;
    const r=sRect();
    catCenter=clamp((ev.clientX - r.left)/r.width, 0, 1);
    placeCatcher();
  });
  ['pointerup','pointercancel','lostpointercapture']
    .forEach(t=>stage.addEventListener(t,()=>{ dragging=false; }));

  // Keys
  window.addEventListener('keydown',e=>{
    if(!running) return;
    if(e.key==='ArrowLeft')  ctrl=-0.9;
    if(e.key==='ArrowRight') ctrl= 0.9;
  });
  window.addEventListener('keyup',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight') ctrl=0;
  });

  // Optional: tilt on mobile (permission asked on start)
  function enableTilt(){
    const onTilt=e=>{
      const g=typeof e.gamma==='number'?e.gamma:0;
      const b=typeof e.beta ==='number'?e.beta :0;
      const v=Math.abs(g)>Math.abs(b)?g:b;
      ctrl=clamp(v/30,-1,1);
    };
    if(typeof DeviceOrientationEvent==='undefined') return;
    if(DeviceOrientationEvent.requestPermission){
      DeviceOrientationEvent.requestPermission()
        .then(s=>{ if(s==='granted') window.addEventListener('deviceorientation',onTilt,true); })
        .catch(()=>{});
    }else{
      window.addEventListener('deviceorientation', onTilt, true);
    }
  }

  // ===== game loop =====
  function spawn(){
    const r=sRect();
    const el=document.createElement('div');
    el.className='dot';
    stage.appendChild(el);
    const w=14;
    const x=Math.random()*(r.width - w) + w/2;
    const y=-w;
    dots.push({ el, x, y, w, h:w, vx:(Math.random()-.5)*0.5, vy:0.9+Math.random()*0.4 });
    el.style.transform=`translate(${Math.round(x-w/2)}px, ${Math.round(y-w/2)}px)`;
  }

  function intersects(d){
    const s=sRect();
    const c=catcher.getBoundingClientRect();
    const cx0=c.left - s.left, cx1=c.right - s.left;
    const cy0=c.top  - s.top , cy1=c.bottom - s.top;
    const px=d.x, py=d.y; // dot center in stage coords
    return (px>=cx0 && px<=cx1) && (py + d.h*0.5 >= cy0 && py - d.h*0.5 <= cy1);
  }

  function loop(t){
    const dt=Math.min(3,(t-lastT)/16.666||1); lastT=t;
    const r=sRect();

    if(!dragging){
      catCenter = clamp(catCenter + ctrl*0.03*dt, 0, 1);
      placeCatcher();
    }

    if(t>=nextSpawn){ spawn(); nextSpawn = t + 650; }

    for(let i=dots.length-1;i>=0;i--){
      const d=dots[i];
      d.vy = Math.min(3.2, d.vy + 0.05*dt);
      d.vx = clamp(d.vx + ctrl*0.01*dt, -1, 1);
      d.x = clamp(d.x + d.vx*3.0*dt, d.w*0.5, r.width - d.w*0.5);
      d.y += d.vy*3.0*dt;

      d.el.style.transform=`translate(${Math.round(d.x - d.w/2)}px, ${Math.round(d.y - d.h/2)}px)`;

      if(intersects(d)){
        d.el.remove(); dots.splice(i,1);
        score++; scoreEl && (scoreEl.textContent=String(score));
        if(score>=GOAL){
          running=false; cancelAnimationFrame(raf);
          banner && (banner.hidden=false);
          return;
        }
      }else if(d.y - d.h/2 > r.height + 24){
        d.el.remove(); dots.splice(i,1);
      }
    }

    if(running) raf=requestAnimationFrame(loop);
  }

  // ===== start/stop =====
  function startGame(){
    if(running) return;
    running=true; score=0; scoreEl && (scoreEl.textContent='0');
    banner && (banner.hidden=true);

    // hide overlay completely
    if(cover){
      cover.hidden=true;
      cover.style.display='none';
      cover.style.pointerEvents='none';
      cover.setAttribute('aria-hidden','true');
    }

    // reset
    catCenter=0.5; placeCatcher();
    dots.splice(0).forEach(d=>d.el.remove());
    lastT=performance.now(); nextSpawn=lastT+350;
    raf=requestAnimationFrame(loop);

    enableTilt();
  }

  // robust single-click start
  btnStart && btnStart.addEventListener('click', e=>{
    e.preventDefault(); e.stopPropagation(); startGame();
  });
  cover && cover.addEventListener('click', e=>{
    if(e.target===cover) startGame(); // tap outside button also starts
  });
})();
