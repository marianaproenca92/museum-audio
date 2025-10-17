function EncryptedInit() {
  const btn = document.getElementById('btn-des');
  const msg = document.getElementById('msg');
  if (!btn) return;

  btn.addEventListener('click', function () {
    msg.textContent = 'palavra-passe errada';
  });
}
