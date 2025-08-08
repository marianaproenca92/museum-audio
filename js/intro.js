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

  // Create canvas for matrix effect
  const canvas = document.createElement("canvas");
  canvas.id = "matrixCanvas";
  document.body.insertBefore(canvas, introDiv);
  const ctx = canvas.getContext("2d");
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  
  const letters = "アァイィウヴエェオカキクケコサシスセソタチツテトナニヌネノ0123456789#@*&%";
  const fontSize = 14;
  const columns = canvas.width / fontSize;
  const drops = Array(Math.floor(columns)).fill(1);
  
  function drawMatrix() {
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f0";
    ctx.font = fontSize + "px monospace";
    for (let i = 0; i < drops.length; i++) {
      const text = letters.charAt(Math.floor(Math.random() * letters.length));
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }
  const matrixInterval = setInterval(drawMatrix, 35);

  // Glitch phrases & images
  const glitchPhrases = [
    "[MEMÓRIA CORROMPIDA]", "[PRESENÇA DETETADA]",
    "[ERRO DE INTEGRAÇÃO]", "[ACESSO NÃO AUTORIZADO]", "[FRAGMENTO INSTÁVEL]"
  ];
  const glitchImages = [
    "img/glitch1.jpeg"
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
  
  function randomGlitchImage() {
      const img = document.createElement("img");
      img.src = glitchImages[Math.floor(Math.random() * glitchImages.length)];
      img.style.position = "absolute";
      img.style.maxWidth = Math.floor(Math.random() * 150 + 80) + "px"; // 80–230px
      img.style.top = Math.random() * window.innerHeight + "px";
      img.style.left = Math.random() * window.innerWidth + "px";
      img.style.filter = `contrast(${150 + Math.random() * 100}%) hue-rotate(${Math.floor(Math.random() * 360)}deg)`;
      img.style.transform = `rotate(${Math.floor(Math.random() * 15) - 7}deg)`;
      img.style.animation = "glitchPulse 0.15s infinite alternate";
      img.style.zIndex = "3";
      document.body.appendChild(img);
      setTimeout(() => img.remove(), 300); // remove after 0.3s
  }
  const imgInterval = setInterval(randomGlitchImage, 1500);

  // Text sequence for Matrix intro
  const introLines = [
    "[ ACEDENDO AO NÓ DE ARQUIVO... ]",
    "[ A DESCODIFICAR MEMÓRIAS ANTIGAS... ]",
    "[ A PREPARAR REPRODUÇÃO... ]"
  ];
  let currentLine = 0;
  
  function nextIntroLine() {
    if (currentLine < introLines.length) {
      introDiv.textContent = introLines[currentLine];
      currentLine++;
      setTimeout(nextIntroLine, 1500);
    } else {
      clearInterval(matrixInterval);
      clearInterval(textInterval);
      clearInterval(imgInterval);
      document.getElementById('intro').style.display = 'none';
      document.getElementById('content').style.display = 'block';
      if (typeof callback === "function") callback();
    }
  }
  nextIntroLine();
}
