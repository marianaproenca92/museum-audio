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
const cover=$('#cover');
const btnStart=$('#btnStart');


let dots=[]; // {el,x,y,vy,ax,vx}
let running=false; let raf=0; let spawnT=0;
let score=0; const GOAL=12; goalEl.textContent=GOAL;
let ctrl=0; // -1..1 normalized control (tilt / drag / slider)


// --- Audio (optional, uses page JSON "audio") ---
let bgm; function prepareBgm(){ if(bgm) return bgm; const src=document.body.dataset.audio; if(!src) return null; bgm=new Audio(src); bgm.loop=true; bgm.preload='auto'; bgm.volume=0; return bgm; }
function fadeVol(a,to=1,ms=500){ if(!a) return; const from=a.volume; const t0=performance.now(); function step(t){ const p=Math.min(1,(t-t0)/ms); a.volume=from+(to-from)*p; if(p<1) requestAnimationFrame(step); } requestAnimationFrame(step); }
function playBgm(){ const a=prepareBgm(); if(!a) return; a.play().then(()=>fadeVol(a,.85,400)).catch(()=>{}); }
function stopBgm(){ if(!bgm) return; fadeVol(bgm,0,250); setTimeout(()=>{ try{ bgm.pause(); }catch{} }, 260); }


// --- Controls: tilt (if allowed) ---
function wantGyro(){
if(typeof DeviceOrientationEvent==='undefined'){ status.textContent='[tilt] indisponível — arrasta para mover'; return; }
if(DeviceOrientationEvent.requestPermission){ // iOS
DeviceOrientationEvent.requestPermission().then(state=>{
if(state==='granted'){ window.addEventListener('deviceorientation', onTilt, true); status.textContent='[tilt] ativo — também podes arrastar'; btnTilt && (btnTilt.disabled=true); }
else { status.textContent='[tilt] negado — arrasta para mover'; }
}).catch(()=>{ status.textContent='[tilt] erro — arrasta para mover'; });
} else {
window.addEventListener('deviceorientation', onTilt, true); status.textContent='[tilt] ativo — também podes arrastar'; btnTilt && (btnTilt.disabled=true);
}
}
})();