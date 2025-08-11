// Glitch Loader — a tiny state machine loader that "always glitches"
// API: GlitchLoader.start(opts)
(function(){
  const $ = (q, el=document) => el.querySelector(q);
  const deco = s => s.replace(/<err>(.*?)<\/err>/g, '<span class="err">$1<\/span>');

  // Optional use of your existing SFX if present; otherwise minimal bleeps
  const Audio = (() => {
    let ac; const ctx = () => ac || (ac = (()=>{ try{return new (window.AudioContext||window.webkitAudioContext)();}catch(_){return null;} })());
    const beep = (f=640, d=.022) => { if (window.SFX?.beep) { try{ SFX.beep(f,d); return; }catch(_){} } const c=ctx(); if(!c) return; const o=c.createOscillator(), g=c.createGain(); o.type='square'; o.frequency.value=f; g.gain.value=.06; o.connect(g).connect(c.destination); o.start(); setTimeout(()=>{ try{o.stop();}catch(_){} g.disconnect(); }, d*1000+30); };
    const hum = { o:null, g:null };
    return {
      startHum(){ if (window.SFX?.startHum){ try{ SFX.startHum(); return; }catch(_){} } const c=ctx(); if(!c) return; hum.o=c.createOscillator(); hum.g=c.createGain(); hum.o.type='sawtooth'; hum.o.frequency.value=70; hum.g.gain.value=.035; hum.o.connect(hum.g).connect(c.destination); hum.o.start(); },
      tick(){ beep(640+Math.random()*240,.018); },
      stopHum(){ if (window.SFX?.stopHum){ try{ SFX.stopHum(); return; }catch(_){} } try{ hum.o?.stop(); hum.o?.disconnect(); hum.g?.disconnect(); if(ac) ac.close(); }catch(_){} ac=null; hum.o=null; hum.g=null; }
    };
  })();

  function makeOverlay(titleText){
    const host = document.createElement('div'); host.className = 'gl-loader';
    host.innerHTML = `
      <div class="gl-term gl-flick">
        <div class="gl-head"><span class="gl-dot"></span><span class="gl-dot"></span><span class="gl-dot"></span>
          <span class="gl-title">${titleText||'ARQUIVO // ARRANQUE'}</span>
        </div>
        <section class="gl-panel">
          <strong class="label">ARQUIVO // RASTREIO</strong>
          <pre class="gl-bootlog" id="gl-bootlog"></pre>
          <small class="muted">(se o ecrã tremer, é normal — os espíritos mexem nos cabos)</small>
        </section>
        <div class="gl-foot"><small>estado: a iniciar…</small><small id="gl-sess"></small></div>
      </div>`;
    document.body.appendChild(host);
    const sess = Math.random().toString(36).slice(2,8).toUpperCase();
    host.querySelector('#gl-sess').textContent = `sessão ${sess}`;
    return host;
  }

  function pick(n, arr){ const a=[...arr], r=[]; while(a.length && r.length<n){ r.push(a.splice(Math.random()*a.length|0,1)[0]); } return r; }

  // core writer (falls back to inline list if no bank provided)
  function writeBootlog(outEl, bankLines, onBreak, onDone){
    const lines = pick(6 + Math.floor(Math.random()*3), bankLines && bankLines.length? bankLines : [
      "> montar volume: /dev/ALMA … OK",
      "> varrer poeira residual … 3 … 2 … 1 …",
      "> verificação: integridade narrativa — <err>INCONSISTENTE</err>",
      "> compor índice … 13/256 entradas … (as teimosas primeiro)",
      "> driver 'paciencia.sys' não encontrado — prosseguir mesmo assim",
      "> tentativa de arranque sonoro … rrr—st … <err>falhou</err>",
      "> fallback de segurança: abrir por curiosidade"
    ]);

    // Inject one forced BREAK point somewhere in the middle
    const breakAt = 2 + (Math.random()*Math.min(4, lines.length-3))|0;

    let i=0; Audio.startHum();
    (function write(){
      if(i>=lines.length){ Audio.stopHum(); onDone && onDone(); return; }
      let ln = deco(lines[i++]) + "\n"; let j=0;
      (function tick(){
        outEl.innerHTML += ln.slice(j, j+1);
        if (j % 7 === 0) Audio.tick();
        j++;
        if(j<=ln.length){ setTimeout(tick, 16); }
        else {
          // trigger a glitch break once
          if(i===breakAt){
            const term = outEl.closest('.gl-term'); term?.classList.add('gl-broken');
            onBreak && onBreak();
            setTimeout(()=>{ term?.classList.remove('gl-broken'); setTimeout(write, 240); }, 360);
          } else {
            setTimeout(write, 220);
          }
        }
      })();
    })();
  }

  // Public API
  window.GlitchLoader = {
    /**
     * @param {Object} opts
     * @param {string|Element} [opts.bank] - selector/element with JSON lines (<script type="application/json">[]) — optional
     * @param {string} [opts.title] - title in the CRT header
     * @param {function} [opts.onReady] - fired when overlay is inserted
     * @param {function} [opts.onBreak] - fired on the intentional glitch/break
     * @param {function} [opts.onDone] - fired when bootlog completes (overlay will fade)
     * @param {boolean} [opts.keep] - if true, do not auto‑remove overlay (you hide it yourself)
     */
    start(opts={}){
      const host = makeOverlay(opts.title);
      const out = host.querySelector('#gl-bootlog');

      // resolve bank lines if given
      let bankLines = null;
      if (opts.bank){
        const bankEl = typeof opts.bank === 'string' ? $(opts.bank) : opts.bank;
        try { bankLines = JSON.parse((bankEl?.textContent||'[]').trim()); } catch(_) { bankLines = null; }
      }

      opts.onReady && opts.onReady(host);
      host.dispatchEvent(new CustomEvent('loader:ready', { bubbles:true, detail:{ host } }));

      writeBootlog(out, bankLines, () => {
        opts.onBreak && opts.onBreak(host);
        host.dispatchEvent(new CustomEvent('loader:break', { bubbles:true, detail:{ host } }));
      }, () => {
        opts.onDone && opts.onDone(host);
        host.dispatchEvent(new CustomEvent('loader:done', { bubbles:true, detail:{ host } }));
        if(!opts.keep){ host.style.transition = 'opacity .28s ease'; host.style.opacity = '0'; setTimeout(()=>host.remove(), 300); }
      });

      return host;
    }
  };
})();