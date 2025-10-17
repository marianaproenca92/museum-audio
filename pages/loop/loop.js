function LoopLoaderInit() {
  const content = document.getElementById('content');

  function pickEffects() {
    const pool = ["desync", "pixel", "blackout", "scantear", "flatline"];
    pool.sort(() => Math.random() - 0.5);
    return pool.slice(0, 1 + Math.floor(Math.random() * 2)).join(" ");
  }

  function cycle() {
    if (content) content.style.display = "none";       // defeat router reveal
    document.body.dataset.effects = pickEffects();     // swap break FX each pass (optional)
    document.body.dataset.drama = String(2 + (Math.random() * 2 | 0)); // 2..3

    if (window.GlitchLoader && window.GlitchLoader.startFromData) {
      window.GlitchLoader.startFromData();             // re-run the loader immediately
    }
  }

  // on every loader completion, instantly start again
  document.addEventListener("loader:done", cycle);

  // kick off the first cycle right now
  cycle();
}
