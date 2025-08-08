function runGlitchIntro(callback) {
  // ===== Available intro styles =====
  const introStyles = [basicGlitchIntro, matrixGlitchIntro];
  
  // Pick a random one
  const chosenIntro = introStyles[Math.floor(Math.random() * introStyles.length)];
  
  // Run it
  chosenIntro(callback);
}

/* ===== Style 1: Basic Glitch Text ===== */
function basicGlitchIntro(callback) {
  const glitchSets = [
    ["[ ACEDENDO AO NÓ DE ARQUIVO... ]", "[ A DESCODIFICAR MEMÓRIAS ANTIGAS... ]", "[ A INICIAR SEQUÊNCIA... ]"],
    ["[ LIGANDO CIRCUITOS... ]", "[ SINCRONIZANDO COM O PASSADO... ]", "[ EXECUÇÃO ATIVADA... ]"],
    ["[ DETETADA PRESENÇA... ]", "[ A DESPERTAR REGISTOS DORMENTES... ]", "[ A GUARDAR ÚLTIMO SUSPIRO... ]"]
  ];
  
  const introMessages = glitchSets[Math.floor(Math.random() * glitchSets.length)];
  let step = 0;
  const introDiv = document.getElementById('intro');
  
  function nextGlitch() {
    if (step < introMessages.length) {
      introDiv.textContent = introMessages[step];
      step++;
      setTimeout(nextGlitch, 1500);
    } else {
      introDiv.style.display = 'none';
      document.getElementById('content').style.display = 'block';
      if (typeof callback === "function") callback();
    }
  }
  
  nextGlitch();
}

/* ===== Style 2: Matrix Glitch ===== */
function matrixGlitchIntro(callback) {
  const introDiv = document.getElementById('intro');

  // Matrix canvas
  const canvas = document.createElement("canvas");
  canvas.id = "matrixCanvas";
  document.body.insertBefore(canvas, introDiv);
  const ctx = canvas.getContext("2d");
  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const letters = "アァイィウヴエェオカキクケコサシスセソタチツテトナニヌネノ0123456789#@*&%";
  const fontSize = 14;
  let columns = Math.floor(canvas.width / fontSize);
  let drops = Array(columns).fill(1);

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
    flash.style.position = "absolute";
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

  // Glitch images (start after JSON loads)
  let glitchImages = [];
  function startImageInterval() {

    // Tweak these to taste
    const MIN_PX = 260;   // was ~120
    const MAX_PX = 520;   // was ~320
    const LIFETIME_MS = 1500; // was 300

    return setInterval(() => {
      if (!glitchImages.length) return;
      
      const img = document.createElement("img");
      img.className = "glitch-img";
      img.src = glitchImages[Math.floor(Math.random() * glitchImages.length)];
      
      const size = Math.floor(Math.random() * (MAX_PX - MIN_PX + 1)) + MIN_PX;
      img.style.width = size + "px";

      // Position & effect
      img.style.position = "absolute";
      img.style.top = Math.random() * window.innerHeight + "px";
      img.style.left = Math.random() * window.innerWidth + "px";
      img.style.filter = `contrast(${150 + Math.random() * 100}%) hue-rotate(${Math.floor(Math.random() * 360)}deg)`;
      img.style.transform = `rotate(${Math.floor(Math.random() * 15) - 7}deg)`;
      img.style.animation = "glitchPulse 0.2s infinite alternate"; // a tad slower looks nicer bigger
      img.style.pointerEvents = "none";  // don't block clicks
      img.style.userSelect = "none";
      img.style.zIndex = "3";

      document.body.appendChild(img);

      // Keep them around a bit longer
      setTimeout(() => img.remove(), LIFETIME_MS);
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

  function nextIntroLine() {
    if (currentLine < introLines.length) {
      introDiv.textContent = introLines[currentLine++];
      setTimeout(nextIntroLine, 1500);
    } else {
      clearInterval(matrixInterval);
      clearInterval(textInterval);
      if (imgInterval) clearInterval(imgInterval);
      window.removeEventListener('resize', resize);

      canvas.remove();
      document.querySelectorAll(".flash-text, .glitch-img").forEach(el => el.remove());

      introDiv.style.display = 'none';
      document.getElementById('content').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'auto' });

      if (typeof callback === "function") callback();
    }
  }
  nextIntroLine();
}

