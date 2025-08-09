// intro-runner.js
// Global intro starter — call runIntro() from any page

function runIntro(callback) {
  // Create a container for the intro if it doesn't exist
  let introContainer = document.getElementById('intro');
  if (!introContainer) {
    introContainer = document.createElement('div');
    introContainer.id = 'intro';
    introContainer.className = 'wrap terminal';
    document.body.prepend(introContainer);
  }

  // Ensure intro is visible
  introContainer.style.display = 'block';

  // Run your matrix rain / glitch intro
  if (typeof startMatrixRain === 'function') startMatrixRain(introContainer);
  if (typeof runGlitchIntro === 'function') runGlitchIntro();

  // Listen for end event — or set timeout
  const introDuration = 6000; // ms
  setTimeout(() => {
    introContainer.style.display = 'none';
    if (typeof callback === 'function') callback();
  }, introDuration);
}
