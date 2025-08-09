function runGlitchIntro(callback) {
  // ===== Available intro styles =====
  const introStyles = [//basicGlitchIntro, 
    matrixGlitchIntro
  ];
  
  // Pick a random one
  const chosenIntro = introStyles[Math.floor(Math.random() * introStyles.length)];
  
  // Run it
  chosenIntro(callback);
}

/* ===== Style 2: Matrix Glitch ===== */
function matrixGlitchIntro(callback) {
  const introDiv = document.getElementById('intro');

  document.body.classList.add('lock');
  // Optionally hide content beneath to avoid flashes
  const content = document.getElementById('content');
  if (content) content.style.visibility = 'hidden';


  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.id = "matrixCanvas";
  document.body.insertBefore(canvas, introDiv);

  // Make it a true fullscreen overlay background
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.zIndex = '9998';
  canvas.style.pointerEvents = 'none';

  const ctx = canvas.getContext("2d");

  // --- define BEFORE resize() ---
  const letters = "01";//"アァイィウヴエェオカキクケコサシスセソタチツテトナニヌネノ0123456789#@*&%";
  const fontSize = 14;
  let columns = 0;
  let drops = [];

  const resize = () => {
    // clamp to visible viewport
    const vw = Math.min(window.innerWidth, document.documentElement.clientWidth);
    const vh = Math.min(window.innerHeight, document.documentElement.clientHeight);
    canvas.width  = vw;
    canvas.height = vh;

    columns = Math.floor(canvas.width / fontSize);
    drops = Array(columns).fill(1);
  };
  resize();
  window.addEventListener('resize', resize);

  function drawMatrix() {
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f0";
    ctx.font = fontSize + "px monospace";
    for (let i = 0; i < drops.length; i++) {
      const ch = letters.charAt(Math.floor(Math.random() * letters.length));
      ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  const matrixInterval = setInterval(drawMatrix, 35);

  // Flashing text
  const glitchPhrases = [
    "[MEMÓRIA CORROMPIDA]", "[PRESENÇA DETETADA]",
    "[ERRO DE INTEGRAÇÃO]", "[ACESSO NÃO AUTORIZADO]", "[FRAGMENTO INSTÁVEL]"
  ];
  
  function randomFlashText() {
    const flash = document.createElement("div");
    flash.className = "flash-text";
    flash.textContent = glitchPhrases[Math.floor(Math.random() * glitchPhrases.length)];
    flash.style.position = "fixed";
    flash.style.top = Math.random() * window.innerHeight + "px";
    flash.style.left = Math.random() * window.innerWidth + "px";
    flash.style.color = "red";
    flash.style.fontSize = "3vw";
    flash.style.textShadow = "0 0 5px red";
    flash.style.zIndex = "3";
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);
  }
  const textInterval = setInterval(randomFlashText, 500);

  function spawnGlitchImage(src, size, cx, cy, lifetime = 1500) {
    // parent = centered & optionally rotated
    const wrap = document.createElement("div");
    wrap.style.position = 'fixed';    // not static!
    wrap.style.zIndex = '9999';       // just under/over intro text as you prefer
    wrap.style.pointerEvents = 'none';

    wrap.className = "glitch-wrap";
    wrap.style.left = cx + "px";
    wrap.style.top  = cy + "px";
    wrap.style.transform = `translate(-50%, -50%) rotate(${Math.floor(Math.random()*15)-7}deg)`;

    // child = actual image + jitter
    const img = document.createElement("img");
    img.className = "glitch-img";
    img.src = src;
    img.style.width = size + "px";
    img.style.filter = `contrast(${150 + Math.random()*100}%) hue-rotate(${Math.floor(Math.random()*360)}deg)`;
    img.style.userSelect = "none";

    wrap.appendChild(img);
    document.body.appendChild(wrap);

    setTimeout(() => wrap.remove(), lifetime);
  }

  // Glitch images (start after JSON loads)
  let glitchImages = [];
  function startImageInterval() {

    // Tweak these to taste
    const MIN_PX = 200;  
    const MAX_PX = 470;  
    const LIFETIME_MS = 1500;
    const EDGE_MARGIN = 12; // keeps center away from extreme edges / notches

    return setInterval(() => {
      if (!glitchImages.length) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const size = Math.floor(Math.random() * (MAX_PX - MIN_PX + 1)) + MIN_PX;

      // pick a CENTER point guaranteed on-screen
      const cx = Math.floor(EDGE_MARGIN + Math.random() * (vw - EDGE_MARGIN*2));
      const cy = Math.floor(EDGE_MARGIN + Math.random() * (vh - EDGE_MARGIN*2));

      const src = glitchImages[Math.floor(Math.random() * glitchImages.length)];
      spawnGlitchImage(src, size, cx, cy, LIFETIME_MS);
    }, 1500);
  }
  let imgInterval = null;

  // If your folder really has a space, change path to 'img/%20glitch/images.json'
  fetch('img/glitch/images.json')
    .then(r => r.json())
    .then(data => {
      glitchImages = data;
      imgInterval = startImageInterval();
    })
    .catch(err => console.error('Failed to load glitch images JSON', err));

  // Intro lines & cleanup
  const introLines = [
    "[ ACEDENDO AO NÓ DE ARQUIVO... ]",
    "[ A DESCODIFICAR MEMÓRIAS ANTIGAS... ]",
    "[ A PREPARAR REPRODUÇÃO... ]"
  ];
  let currentLine = 0;

  function cleanupIntro() {
    clearInterval(matrixInterval);
    clearInterval(textInterval);
    if (imgInterval) clearInterval(imgInterval);

    // remove the matrix canvas
    const c = document.getElementById('matrixCanvas');
    if (c) c.remove();

    // remove any transient glitch nodes
    document.querySelectorAll(".flash-text, .glitch-wrap").forEach(el => el.remove());

    // hide intro, unlock scroll, reveal content
    const introDiv = document.getElementById('intro');
    if (introDiv) introDiv.style.display = 'none';
    document.body.classList.remove('lock');

    const content = document.getElementById('content');
    if (content) {
      content.style.visibility = 'visible';
      content.style.display = 'block';
    }

    if (typeof callback === "function") callback();
  }

  function nextIntroLine() {
    if (currentLine < introLines.length) {
      introDiv.textContent = introLines[currentLine++];
      setTimeout(nextIntroLine, 1500);
    } else cleanupIntro();
  }
  
  nextIntroLine();
}

