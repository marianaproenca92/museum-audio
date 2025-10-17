function RepairInit() {
  const pct = document.getElementById('pct');
  const fill = document.getElementById('fill');
  const status = document.getElementById('status');
  const btnRepair = document.getElementById('btn-repair');
  const btnHome = document.getElementById('btn-home');

  if (btnHome) {
    btnHome.addEventListener('click', function () {
      location.href = 'shell.html';
    });
  }

  if (!btnRepair || !pct || !fill || !status) return;

  btnRepair.addEventListener('click', function () {
    status.textContent = 'a reparar...';
    pct.textContent = '0%';
    fill.style.width = '0%';

    let p = 0;
    const iv = setInterval(() => {
      p += 8 + Math.floor(Math.random() * 12);
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        pct.textContent = '100%';
        fill.style.width = '100%';
        status.textContent = 'concluído: 0 ficheiros reparados';
        return;
      }
      pct.textContent = p + '%';
      fill.style.width = p + '%';
    }, 160);
  });
}
