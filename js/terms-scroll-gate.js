// terms-scroll-gate.js — Page scroll + checkbox unlock AUDIO (auto-start)
(function(){
  const $ = (q, el=document) => el.querySelector(q);

  function atBottom(){
    const y  = (window.pageYOffset || document.documentElement.scrollTop || 0);
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const sh = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    return y + vh >= sh - 4; // tolerance
  }

  function speak(lines){ try{ if(window.museumVoice) museumVoice.speak('#voice-terms', lines, { speed:24, gap:420 }); }catch(e){} }
  function chime(){ try{ if(window.SFX) SFX.chime(); }catch(e){} }
  async function tryPlay(audio){ if(!audio) return false; try{ await audio.play(); return true; } catch(_) { return false; } }

  function bind(){
    const ok    = $('#ok');
    const audio = $('#museum-audio');
    const panel = $('#audio-panel');
    const hint  = $('#audio-hint');
    const gate  = $('#gate-msg');

    let unlocked = false;

    function contentTooShort(){ return document.documentElement.scrollHeight <= (window.innerHeight + 8); }
    function canUnlock(){ const bottom = contentTooShort()? true : atBottom(); const accepted = ok? !!ok.checked : true; return bottom && accepted; }

    async function revealAndStart(){
      if(!panel || !audio) return;
      panel.style.display = '';
      hint.textContent = 'a iniciar…';
      const played = await tryPlay(audio);
      if(played){ chime(); hint.textContent = 'a reproduzir.'; gate && (gate.textContent = 'Acesso concedido.'); return; }
      hint.textContent = 'toque para iniciar o som.';
      const arm = async ()=>{
        const ok = await tryPlay(audio);
        if(ok){ chime(); hint.textContent = 'a reproduzir.'; gate && (gate.textContent = 'Acesso concedido.');
          document.removeEventListener('pointerdown', arm);
          document.removeEventListener('keydown', arm);
        }
      };
      document.addEventListener('pointerdown', arm);
      document.addEventListener('keydown', arm);
    }

    function update(){
      const allow = canUnlock();
      if(allow && !unlocked){ unlocked = true; speak(["> leitura concluída.", "> passagem aberta. escuta-me."]); revealAndStart(); }
      else if(gate){
        const needScroll = !(contentTooShort() || atBottom());
        const needAccept = ok && !ok.checked;
        gate.textContent = needScroll && needAccept ? 'Lê até ao fim e aceita para ouvir.' : needScroll ? 'Lê até ao fim para ouvir.' : needAccept ? 'Aceita as condições para ouvir.' : 'Acesso disponível.';
      }
    }

    if(ok){ ok.addEventListener('change', async ()=>{ try{ if(window.SFX) SFX.beep(ok.checked? 820:320, .04); }catch(_){ } if(canUnlock() && !unlocked){ unlocked = true; speak(["> leitura concluída.", "> passagem aberta. escuta-me."]); } if(canUnlock()){ await revealAndStart(); } else { update(); } }); }

    const onScroll = ()=> window.requestAnimationFrame(update);
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', onScroll);
    document.addEventListener('terms:loaded', update);

    speak(["> ligação estabelecida…", "> lê-me até ao fim e aceita o juramento."]); // pt-PT
    update();
  }

  document.addEventListener('DOMContentLoaded', bind);
})();