function runGlitchIntro(callback, customSets) {
  const glitchSets = customSets || [
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
