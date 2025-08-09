// terms-flow.js
// Handles: scroll-to-unlock checkbox, wax seal break, reveal "Ativar Registo", and play audio.
// Auto-initializes on DOM ready; no calls needed.

(function () {
  function init() {
    const termsBox = document.getElementById('terms-container');
    const checkbox = document.getElementById('accept');
    const playBtn  = document.getElementById('play-btn');
    const waxSeal  = document.getElementById('wax-seal');
    const audioEl  = document.getElementById('ritual-audio');

    if (!termsBox || !checkbox || !playBtn || !waxSeal || !audioEl) return;

    let hasScrolled = false;

    const tryUnlock = () => {
        if (!hasScrolled) return; // only unlock after a scroll
        const scrollPos = termsBox.scrollTop + termsBox.clientHeight;
        const tol = 4; // px
        if (scrollPos >= termsBox.scrollHeight - tol) {
            checkbox.disabled = false;
        }
    };

    termsBox.addEventListener('scroll', () => {
        hasScrolled = true;
        tryUnlock();
    }, { passive: true });
    // check once in case the viewport is already tall
    requestAnimationFrame(tryUnlock);

    // accepting the terms triggers the wax seal & reveals play button
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        waxSeal.style.display = 'block';
        waxSeal.classList.remove('break');
        setTimeout(() => {
          waxSeal.classList.add('break');
          setTimeout(() => {
            waxSeal.style.display = 'none';
            playBtn.style.display = 'inline-block';
            playBtn.focus({ preventScroll: true });
          }, 600); // matches crack animation
        }, 800);
      } else {
        waxSeal.style.display = 'none';
        waxSeal.classList.remove('break');
        playBtn.style.display = 'none';
      }
    });

    // show audio + play
    const showAndPlay = async () => {
      audioEl.style.display = 'block';
      try {
        await audioEl.play();
      } catch {
        // if autoplay blocked, controls are already visible
      }
      playBtn.style.display = 'none';
    };
    playBtn.addEventListener('click', showAndPlay);
    playBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showAndPlay(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
