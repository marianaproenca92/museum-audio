const DEBUG = true;
const dbg = (...a)=> DEBUG && console.log('[Bonsai]', ...a);
const warn = (...a)=> console.warn('[Bonsai]', ...a);

(function(){
  const $ = (q, el=document) => el.querySelector(q);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  let running = false, lastTs = 0, rAF = 0;

  // inputs
  let pressWater = false, pressVent = false, shadeOn = false;

  // vitals
  let moisture = 20, sun = 55, temp = 24, nutrients = 55, pests = 10, health = 100, mood = 50;
  let timeLeft = 40;

  // target ranges (“zen” bands)
  const M_OK = [60,75], S_OK = [45,65], T_OK = [18,26], N_OK = [50,70], P_MAX = 30;

  // unlimited charges now
  let fertUnlimited = true, sprayUnlimited = true;

  // make shade feel snappier for a short window after toggling
  let shadeSnapTimer = 0;

  const ui = {};
  let windLoop = null; // interval for vent wind effects

  function lock(btn, on){ btn.setAttribute('aria-disabled', on ? 'true' : 'false'); }

  function setRunning(on){
    running = on;
    const controls = [ui.waterBtn, ui.shadeBtn, ui.ventBtn, ui.fertBtn, ui.sprayBtn];
    controls.forEach(b => { if (!b) return; b.hidden = !on; lock(b, !on); });
    if (ui.startBtn) ui.startBtn.hidden = on;
    if (ui.root) ui.root.classList.toggle('playing', on);
  }

  // ---------- VISUAL FX (auto-injected styles) ----------
  function injectFxStyles(){
    if(document.getElementById('bonsai-efx-style')) return;
    const css = `
    @keyframes bonsai-drip { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(120px);opacity:0} }
    @keyframes bonsai-shade-pulse { 0%{opacity:0} 20%{opacity:.25} 60%{opacity:.18} 100%{opacity:0} }
    @keyframes bonsai-wind { 0%{transform:translateX(0) translateY(0);opacity:0} 10%{opacity:.7} 100%{transform:translateX(160px) translateY(-12px);opacity:0} }
    @keyframes bonsai-spark { 0%{transform:translateY(0) scale(.6);opacity:0}
                               20%{opacity:1}
                               100%{transform:translateY(-70px) scale(1);opacity:0} }
    @keyframes bonsai-mist { 0%{transform:translate(0,0);opacity:.0}
                             10%{opacity:.5}
                             100%{transform:translate(80px,-10px);opacity:0} }
    .bonsai-efx-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}
    .bonsai-drips{position:absolute;left:0;right:0;top:20px;height:160px;pointer-events:none}
    .bonsai-drip{position:absolute;width:3px;height:18px;background:currentColor;border-radius:2px;opacity:.85;animation:bonsai-drip .8s linear forwards}
    .bonsai-shadePulse{position:absolute;inset:0;background:#000;opacity:0;animation:bonsai-shade-pulse .6s ease-out forwards}
    .bonsai-wind{position:absolute;width:90px;height:2px;background:currentColor;opacity:0;border-radius:2px;animation:bonsai-wind 1.1s ease-out forwards}
    .bonsai-spark{position:absolute;width:6px;height:6px;border-radius:50%;background:currentColor;opacity:0;animation:bonsai-spark 1s ease-out forwards;box-shadow:0 0 10px currentColor}
    .bonsai-mist{position:absolute;width:18px;height:10px;border-radius:10px;background:currentColor;opacity:0;filter:blur(2px);animation:bonsai-mist .9s ease-out forwards}
    `;
    const s = document.createElement('style');
    s.id = 'bonsai-efx-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function efxLayer(){
    let layer = ui.root.querySelector('.bonsai-efx-layer');
    if(!layer){
      layer = document.createElement('div');
      layer.className = 'bonsai-efx-layer';
      ui.root.appendChild(layer);
    }
    return layer;
  }

  function stageRect(){
    const st = ui.root.querySelector('.bonsai-stage') || ui.root;
    return st.getBoundingClientRect();
  }

  function rand(min,max){ return Math.random()*(max-min)+min; }

  // water drops (kept from before)
  function elDrip(){
    const area = ui.root.querySelector('.drips');
    if(!area) return;
    const d = document.createElement('div');
    d.className = 'bonsai-drip';
    d.style.left = (40 + Math.random()*120) + 'px';
    d.style.color = getComputedStyle(ui.root).getPropertyValue('--accent-water') || '#6cf';
    area.appendChild(d);
    d.addEventListener('animationend', () => d.remove());
  }

  // shade quick pulse
  function fxShadePulse(){
    const layer = efxLayer();
    const pulse = document.createElement('div');
    pulse.className = 'bonsai-shadePulse';
    layer.appendChild(pulse);
    pulse.addEventListener('animationend', ()=> pulse.remove());
  }

  // vent wind lines (spawn one)
  function fxWindOnce(){
    const layer = efxLayer();
    const w = document.createElement('div');
    w.className = 'bonsai-wind';
    const r = stageRect();
    w.style.left = rand(10, 40) + 'px';
    w.style.top = rand(r.height*0.35, r.height*0.65) + 'px';
    w.style.color = getComputedStyle(ui.root).getPropertyValue('--accent-vent') || '#9cf';
    layer.appendChild(w);
    w.addEventListener('animationend', ()=> w.remove());
  }

  // fertilizer sparkles
  function fxSparkles(count=8){
    const layer = efxLayer();
    const r = stageRect();
    for(let i=0;i<count;i++){
      const s = document.createElement('div');
      s.className = 'bonsai-spark';
      s.style.left = (r.width*0.45 + rand(-18,18)) + 'px';
      s.style.top = (r.height*0.62 + rand(-6,6)) + 'px';
      s.style.color = getComputedStyle(ui.root).getPropertyValue('--accent-fert') || '#fc6';
      s.style.animationDuration = (0.7 + Math.random()*0.5) + 's';
      s.style.transform = 'translateY(0) scale(' + rand(0.6,1) + ')';
      layer.appendChild(s);
      s.addEventListener('animationend', ()=> s.remove());
    }
  }

  // spray mist
  function fxMist(count=10){
    const layer = efxLayer();
    const r = stageRect();
    for(let i=0;i<count;i++){
      const m = document.createElement('div');
      m.className = 'bonsai-mist';
      m.style.left = (r.width*0.35 + rand(-12,12)) + 'px';
      m.style.top = (r.height*0.45 + rand(-6,6)) + 'px';
      m.style.color = getComputedStyle(ui.root).getPropertyValue('--accent-spray') || '#cff';
      m.style.animationDuration = (0.6 + Math.random()*0.5) + 's';
      layer.appendChild(m);
      m.addEventListener('animationend', ()=> m.remove());
    }
  }
  // ------------------------------------------------------

  function updateUI(){
    const el = (id)=>document.getElementById(id);

    const mf = el('moistureFill'); if(mf) mf.style.width = moisture + '%';
    const sv = el('moistureVal');  if(sv) sv.textContent = Math.round(moisture);

    const sf = el('sunFill');      if(sf) sf.style.width = sun + '%';
    const sv2= el('sunVal');       if(sv2) sv2.textContent = Math.round(sun);

    const tf = el('tempFill');     if(tf) tf.style.width = clamp((temp - 10)/30*100, 0, 100) + '%';
    const tv = el('tempVal');      if(tv) tv.textContent = Math.round(temp);

    const nf = el('nutFill');      if(nf) nf.style.width = nutrients + '%';
    const nv = el('nutVal');       if(nv) nv.textContent = Math.round(nutrients);

    const pf = el('pestFill');     if(pf) pf.style.width = clamp(pests, 0, 100) + '%';
    const pv = el('pestVal');      if(pv) pv.textContent = Math.round(pests);

    const mo = el('moodFill');     if(mo) mo.style.width = clamp(mood, 0, 100) + '%';
    const mv = el('moodVal');      if(mv) mv.textContent = Math.round(mood);

    const hf = el('healthFill');   if(hf) hf.style.width = clamp(health, 0, 100) + '%';

    const tm = el('timeFillMini'); if(tm) tm.style.width = (100 - clamp((timeLeft/40)*100, 0, 100)) + '%';

    const fb = el('fertBadge');    if(fb) fb.textContent = fertUnlimited ? '∞' : '';
    const sb = el('sprayBadge');   if(sb) sb.textContent = sprayUnlimited ? '∞' : '';

    if (ui.shadeBtn) {
      ui.shadeBtn.setAttribute('aria-pressed', shadeOn ? 'true' : 'false');
    }
  }

  function moodScore(){
    const inR = (v,a,b)=>v>=a&&v<=b;
    let s = 0;
    s += inR(moisture, ...M_OK) ? 25 : 0;
    s += inR(sun, ...S_OK) ? 20 : 0;
    s += inR(temp, ...T_OK) ? 20 : 0;
    s += inR(nutrients, ...N_OK) ? 20 : 0;
    s += pests < P_MAX ? 15 : 0;
    const penalty = Math.max(0, 30 - health) * 0.5;
    return clamp(s - penalty, 0, 100);
  }

  function underFrac(v, low){ return v < low ? (low - v) / Math.max(1, low) : 0; }
  function overFrac(v, high, max=100){ return v > high ? (v - high) / Math.max(1, max - high) : 0; }
  function bandFrac(v, low, high, max=100){
    return Math.max( underFrac(v, low), overFrac(v, high, max) );
  }

  function physics(dt, t){
    // SUN with quick snap right after shade toggle
    const wave = Math.sin(t * 0.25) * 8;
    const sunTarget = (shadeOn ? 42 : 72) + wave;
    const fast = shadeSnapTimer > 0 ? 2.0 : 0.45;
    sun = lerp(sun, clamp(sunTarget, 0, 100), fast * dt);

    // MOISTURE
    const evap = 3.4, pour = 22;
    if(pressWater){
      moisture = clamp(moisture + pour*dt, 0, 100);
      if(Math.random()<0.3) elDrip();
      temp = lerp(temp, temp - 0.5, 0.6*dt);
    } else {
      const sunBoost = 1 + (Math.max(0, sun - 65) / 35) * 0.25;
      moisture = clamp(moisture - evap*sunBoost*dt, 0, 100);
    }

    // TEMP
    let envTarget = lerp(17, 34, sun/100) - (shadeOn ? 1.4 : 0);
    temp = lerp(temp, envTarget, 0.38*dt);
    if(pressVent) temp = lerp(temp, 18, 1.25*dt);

    // NUTRIENTS slow decay
    nutrients = clamp(nutrients - 2.0*dt, 0, 100);

    // PESTS growth
    let pestGrowth = 0;
    pestGrowth += Math.max(0, (moisture-62)*0.05);
    pestGrowth += Math.max(0, (nutrients-58)*0.035);
    pestGrowth += Math.max(0, (sun-60)*0.02);
    if (shadeOn) pestGrowth *= 0.6;
    if (pressVent) pestGrowth *= 0.85;
    pests = clamp(pests + pestGrowth*dt, 0, 100);

    // HEALTH penalties scale with distance from safe bands
    const mBad = bandFrac(moisture, M_OK[0], M_OK[1]);
    const sBad = bandFrac(sun, S_OK[0], S_OK[1]);
    const tUnder = underFrac(temp, T_OK[0]);
    const tOver  = overFrac(temp, T_OK[1], 50);
    const nBad = bandFrac(nutrients, N_OK[0], N_OK[1]);
    const pBad = overFrac(pests, P_MAX, 100);

    const wMoistLow=6, wMoistHigh=12, wSun=5, wTempLow=8, wTempHigh=10, wNutr=5, wPest=14;

    const moistPenalty = underFrac(moisture, M_OK[0]) * wMoistLow + overFrac(moisture, M_OK[1]) * wMoistHigh;
    const tempPenalty  = tUnder * wTempLow + tOver * wTempHigh;

    const totalPenalty =
      moistPenalty +
      sBad * wSun +
      tempPenalty +
      nBad * wNutr +
      pBad * wPest;

    const badCount = [moistPenalty>0, sBad>0, tempPenalty>0, nBad>0, pBad>0].filter(Boolean).length;
    const multi = 1 + (badCount>=3 ? 0.4 : badCount>=2 ? 0.2 : 0);

    health = clamp(health - totalPenalty * 0.9 * multi * dt, 0, 100);

    // gentle recovery if comfy
    const comfy =
      moisture>20 && moisture<82 &&
      temp>16 && temp<28 &&
      pests<40 &&
      bandFrac(sun, S_OK[0], S_OK[1])===0 &&
      bandFrac(nutrients, N_OK[0], N_OK[1])===0;
    if(comfy) health = clamp(health + 3.2*dt, 0, 100);

    mood = moodScore();
  }

  function checkWin(){
    const inR = (v,a,b)=>v>=a&&v<=b;
    return inR(moisture, ...M_OK) && inR(sun, ...S_OK) && inR(temp, ...T_OK) && inR(nutrients, ...N_OK) && pests < P_MAX && health > 0;
  }

  function endRound(){
    cancelAnimationFrame(rAF); rAF = 0; running = false;
    [ui.waterBtn, ui.shadeBtn, ui.ventBtn, ui.fertBtn, ui.sprayBtn].forEach(b=>b && lock(b,true));
    const good = checkWin();
    if(good){ ui.status.textContent = 'VITÓRIA ZEN…'; try{window.TerminalGlitch&&window.TerminalGlitch.glitchOnce('medium');}catch(_){} }
    else if(health<=0){ ui.status.textContent='GAME OVER BOTÂNICO…'; try{window.TerminalGlitch&&window.TerminalGlitch.panic(900);}catch(_){} }
    else { ui.status.textContent='Quase zen, mas não.'; try{window.TerminalGlitch&&window.TerminalGlitch.glitchOnce('subtle');}catch(_){} }
  }

  function tick(ts){
    if(!rAF) dbg('tick() first frame');
    rAF = requestAnimationFrame(tick);
    if(!lastTs){ lastTs = ts; return; }
    const dt = Math.min(0.05, (ts - lastTs)/1000); lastTs = ts;
    if(!running) return;
    timeLeft = Math.max(0, timeLeft - dt);
    if (shadeSnapTimer > 0) shadeSnapTimer = Math.max(0, shadeSnapTimer - dt);
    physics(dt, ts/1000);
    updateUI();
    if(timeLeft <= 0){ dbg('time over'); endRound(); }
  }

  function startRound(){
    dbg('startRound: clicked');
    moisture=20; sun=55; temp=24; nutrients=55; pests=10; health=100; mood=50;
    timeLeft=40; shadeOn=false; pressWater=false; pressVent=false;
    shadeSnapTimer = 0;
    ui.status.textContent = 'Boa sorte...';
    setRunning(true);
    updateUI();
    lastTs=0; cancelAnimationFrame(rAF); rAF=requestAnimationFrame(tick);
    dbg('round started. rAF=', rAF);
  }

  // Pointer helpers (works on touch + mouse)
  function addHold(btn, onDown, onUp){
    btn.addEventListener('pointerdown', e => {
      if(btn.getAttribute('aria-disabled') === 'true') return;
      btn.setPointerCapture && btn.setPointerCapture(e.pointerId);
      onDown(e);
    });
    btn.addEventListener('pointerup', onUp);
    btn.addEventListener('pointercancel', onUp);
    btn.addEventListener('pointerleave', onUp);
  }

  function bind(){
    injectFxStyles();
    console.log('[Bonsai] bind() start');

    ui.root = document.getElementById('bonsai-game');
    if(!ui.root){ console.error('[Bonsai] #bonsai-game not found'); return; }

    ui.startBtn = $('#startBtn') || $('#btnStart') || $('#playBtn');
    ui.retryBtn = $('#retryBtn') || $('#tryAgainBtn');

    ui.waterBtn = $('#waterBtn');
    ui.shadeBtn = $('#shadeBtn') || $('#lightBtn');
    ui.ventBtn  = $('#ventBtn')  || $('#pruneBtn');
    ui.fertBtn  = $('#fertBtn')  || $('#feedBtn');
    ui.sprayBtn = $('#sprayBtn');
    ui.status   = $('#status') || $('#statusText');

    // build a drips area if not present
    if(!ui.root.querySelector('.drips')){
      const d = document.createElement('div');
      d.className = 'drips';
      ui.root.appendChild(d);
    }

    // Hide/lock controls initially
    const controls = [ui.waterBtn, ui.shadeBtn, ui.ventBtn, ui.fertBtn, ui.sprayBtn].filter(Boolean);
    controls.forEach(b => { b.hidden = true; lock(b, true); });
    if(ui.startBtn) ui.startBtn.hidden = false;
    if(ui.retryBtn) ui.retryBtn.hidden = true;

    // Start
    if(ui.startBtn){
      ui.startBtn.addEventListener('click', ()=>{ startRound(); });
      ui.startBtn.addEventListener('pointerdown', e=>{ e.preventDefault(); startRound(); });
    }else{
      const stage = ui.root.querySelector('.bonsai-stage') || ui.root;
      stage.addEventListener('click', ()=>{ if(!running) startRound(); });
    }

    // Retry
    if(ui.retryBtn){
      ui.retryBtn.addEventListener('click', ()=>{ startRound(); });
    }

    // Actions
    if(ui.waterBtn) addHold(
      ui.waterBtn,
      ()=>{ if(!running) return; pressWater = true; ui.status && (ui.status.textContent='Água a caminho…'); },
      ()=>{ pressWater = false; if(running && ui.status) ui.status.textContent='Pousaste o regador.'; }
    );

    if(ui.shadeBtn) ui.shadeBtn.addEventListener('click', ()=>{
      if(!running || ui.shadeBtn.getAttribute('aria-disabled')==='true') return;
      shadeOn = !shadeOn;
      shadeSnapTimer = 1.2;
      ui.status && (ui.status.textContent = shadeOn ? 'Modo sombra ON' : 'Luz direta ON');
      fxShadePulse();
      updateUI();
    });

    if(ui.ventBtn) addHold(
      ui.ventBtn,
      ()=>{ if(!running) return; pressVent = true; ui.status && (ui.status.textContent='Ventilar…');
            if(!windLoop) windLoop = setInterval(fxWindOnce, 180); fxWindOnce(); },
      ()=>{ pressVent = false; if(windLoop){ clearInterval(windLoop); windLoop=null; } }
    );

    if(ui.fertBtn) ui.fertBtn.addEventListener('click', ()=>{
      if(!running || ui.fertBtn.getAttribute('aria-disabled')==='true') return;
      nutrients = clamp(nutrients+22,0,100);
      if(nutrients>75) pests = clamp(pests+6,0,100);
      ui.status && (ui.status.textContent='Boost vitaminado aplicado.');
      fxSparkles(8);
      updateUI();
    });

    if(ui.sprayBtn) ui.sprayBtn.addEventListener('click', ()=>{
      if(!running || ui.sprayBtn.getAttribute('aria-disabled')==='true') return;
      pests = clamp(pests-40,0,100);
      temp = clamp(temp+0.8,10,40);
      ui.status && (ui.status.textContent='Spray anti-pragas.');
      fxMist(12);
      updateUI();
    });

    updateUI();
    console.log('[Bonsai] bind() done');
  }

  window.BonsaiGameInit = function(){ bind(); };
  if(window.__loaderDone){ try{ window.BonsaiGameInit(); }catch(_){} }
  else { document.addEventListener('loader:done', () => { try{ window.BonsaiGameInit(); }catch(_){} }, { once: true }); }
})();
