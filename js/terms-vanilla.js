(function(){
  'use strict';
  const $ = (q, el=document) => el.querySelector(q);

  function resolveBootBank(){
    const url = document.body.dataset.bootlog; // e.g., /bootlogs/terms.json or .txt
    if(!url) return Promise.resolve([]);
    return fetch(url, {credentials:'same-origin'}).then(r=>r.text()).then(text => {
      try { return JSON.parse(text); } catch { return text.split(/\r?\n/).filter(Boolean); }
    }).catch(()=>[]);
  }

  function fetchFirst(paths){
    const go = i => fetch(paths[i], {credentials:'same-origin'})
      .then(r=>{ if(!r.ok) throw new Error(r.status); return r.text(); })
      .catch(e => i+1<paths.length ? go(i+1) : Promise.reject(e));
    return go(0);
  }

  function injectTerms(html){
    const box = $('#scrollbox');
    const hasBody = /<body[\s\S]*?>[\s\S]*<\/body>/i.test(html);
    if (hasBody){ const tmp=document.createElement('html'); tmp.innerHTML=html; box.innerHTML = tmp.querySelector('body').innerHTML; }
    else { box.innerHTML = html; }
    box.scrollTop = 0;
  }

  function wireScrollGate(){
    const box = $('#scrollbox');
    const chk = $('#chk');
    const btn = $('#btn-accept');
    const win = $('.term-window');

    // Hard reset: some browsers restore form state on back/refresh
    chk.checked = false;            // force unchecked
    chk.indeterminate = false;      // be explicit
    chk.disabled = true;            // locked until bottom reached
    btn.disabled = true;            // locked until checked

    const atBottom = () => box.scrollTop + box.clientHeight >= box.scrollHeight - 6;
    const update = () => { if (atBottom()) { chk.disabled = false; btn.disabled = !chk.checked; } };

    box.addEventListener('scroll', update, {passive:true});
    box.addEventListener('keydown', e=>{ if(e.key==='End') setTimeout(update,0); });
    chk.addEventListener('change', () => btn.disabled = !chk.checked);

    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      win.classList.add('accepted');
      // notify audio, disable the button to avoid repeated clicks
      document.dispatchEvent(new CustomEvent('terms:accepted'));
      btn.disabled = true;
      btn.textContent = 'Aceite';
    });

    // NOTE: we removed any localStorage auto-accept so the box never pre-checks.
  }

  function killOverlays(){
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-loaded');
    document.querySelectorAll('.gl-loader, .gl-overlay, [data-glitch-overlay], .matrix-intro, .intro').forEach(el=> el.remove());
  }

  function wireAudio(){
    let audio; const host = document.getElementById('terms');
    const src = host?.dataset?.audio || '/audio/botas.mp3';
    document.addEventListener('terms:accepted', () => {
      if(!audio){ audio = new Audio(src); audio.preload = 'auto'; audio.volume = 1.0; }
      audio.currentTime = 0; audio.play().catch(()=>{});
    });
  }

  window.addEventListener('DOMContentLoaded', function(){
    resolveBootBank().then(bank => {
      GlitchLoader.start({
        bank,
        title: 'ARQUIVO // BOTAS',
        onBreak: host => host.querySelector('.gl-title').textContent = 'MUSEU // TERMOS & CONDIÇÕES',
        onDone: () => {
          killOverlays();
          document.getElementById('terms').style.display='block';
          fetchFirst(['/terms-content','/terms-content.html','./terms-content','./terms-content.html'])
            .then(injectTerms)
            .catch(()=> injectTerms('<p><strong>[Aviso]</strong> Não foi possível carregar <code>terms-content</code>.</p>'))
            .finally(wireScrollGate);
        }
      });
    });
    wireAudio();
  });
})();