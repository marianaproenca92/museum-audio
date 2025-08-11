// bootlogger.js — typed log + subtle audio (hum + key ticks)
(function(){
  const $ = (q, el=document) => el.querySelector(q);
  const deco = s => s.replace(/<err>(.*?)<\/err>/g, '<span class="err">$1</span>');

  // Minimal audio helper (fallback if SFX isn't available)
  const BootAudio = (() => {
    let ac, humOsc, humGain;
    function ctx(){ if (ac) return ac;
      try { ac = new (window.AudioContext||window.webkitAudioContext)(); } catch(_){}
      return ac;
    }
    return {
      startHum(){
        if (window.SFX && SFX.startHum){ try{ SFX.startHum(); return; }catch(_){} }
        const c = ctx(); if (!c) return;
        humOsc = c.createOscillator(); humGain = c.createGain();
        humOsc.type = 'sawtooth'; humOsc.frequency.value = 70;       // low hum
        humGain.gain.value = 0.035;                                  // quiet
        humOsc.connect(humGain).connect(c.destination);
        humOsc.start();
      },
      tick(){
        if (window.SFX && SFX.beep){ try{ SFX.beep(680 + Math.random()*140, .02); return; }catch(_){} }
        const c = ctx(); if (!c) return;
        const o = c.createOscillator(), g = c.createGain();
        o.type='square'; o.frequency.value = 640 + Math.random()*240;
        g.gain.value = 0.06; o.connect(g).connect(c.destination);
        o.start(); setTimeout(()=>{ try{o.stop();}catch(_){} g.disconnect(); }, 42);
      },
      stopHum(){
        if (window.SFX && SFX.stopHum){ try{ SFX.stopHum(); return; }catch(_){} }
        try{ humOsc.stop(); humOsc.disconnect(); humGain.disconnect(); }catch(_){}
        try{ ac && ac.close(); }catch(_){}
        ac = null; humOsc = null; humGain = null;
      }
    };
  })();

  // Public API
  window.startBootLogger = function startBootLogger(outSel, bankSel, onDone){
    const out = typeof outSel==='string' ? $(outSel) : outSel;
    const bankEl = typeof bankSel==='string' ? $(bankSel) : bankSel;
    if(!out || !bankEl){ onDone && onDone(); return; }

    let bank = [];
    try{ bank = JSON.parse(bankEl.textContent.trim()); }catch(_){}

    const pick = (n,a)=>{ const b=[...a], r=[]; while(b.length && r.length<n){ r.push(b.splice(Math.random()*b.length|0,1)[0]); } return r; };
    const lines = pick(6+Math.floor(Math.random()*3), bank)
      .concat(["> continua a leitura. quando ele parar, eu começo a falar."]);

    let i=0;
    BootAudio.startHum(); // start the ambient hum

    (function write(){
      if(i>=lines.length){
        BootAudio.stopHum();
        document.dispatchEvent(new CustomEvent('rb:bootlog-finished'));
        onDone && onDone();
        return;
      }
      const ln = deco(lines[i++])+"\n"; let j=0;
      (function tick(){
        out.innerHTML += ln.slice(j, j+1);
        if (j % 7 === 0) BootAudio.tick();   // little key tick every few chars
        j++;
        if(j<=ln.length){ setTimeout(tick, 16); }
        else            { setTimeout(write, 220); }
      })();
    })();
  };
})();
