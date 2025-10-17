function NotFoundInit() {
  const log = document.getElementById('nf-log');
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const act = btn.getAttribute('data-action');

    if (act === 'home') {
      location.href = 'shell.html';
      return;
    }
    if (act === 'scan') {
      if (window.GlitchLoader && window.GlitchLoader.startFromData) {
        log.textContent = 'a varrer índice...';
        window.GlitchLoader.startFromData();
        document.addEventListener('loader:done', function onDone() {
          document.removeEventListener('loader:done', onDone);
          log.textContent = 'resultado: referência inexistente (404)';
        });
      } else {
        log.textContent = 'loader indisponível';
      }
    }
  });
}
