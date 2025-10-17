function RedactedInit() {
  const pct = document.getElementById('pct');
  const fill = document.getElementById('fill');
  const status = document.getElementById('status');

  let p = 0;
  const iv = setInterval(() => {
    // Crawl up to 13% then wobble a bit, never revealing content
    if (p < 13) {
      p += 1 + Math.floor(Math.random() * 3);
      if (p > 13) p = 13;
    } else {
      p += (Math.random() < 0.5 ? -1 : 1); // tiny wobble 12–14
      if (p < 12) p = 12;
      if (p > 14) p = 14;
    }
    pct.textContent = p + '%';
    if (fill) fill.style.width = p + '%';

    if (status && Math.random() < 0.08) {
      const msgs = [
        'metadados ilegíveis',
        'autor redigido',
        'trecho removido',
        'permissões insuficientes',
        'chave de auditoria expirada'
      ];
      status.textContent = msgs[Math.floor(Math.random() * msgs.length)];
    }
  }, 180);
}
