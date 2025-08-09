function glitchOnce(){
    board.classList.add('glitch');
    // occasional whole-terminal flicker for drama
    if (Math.random() < 0.35) document.querySelector('.terminal')?.classList.add('flicker');
    setTimeout(()=>{
      board.classList.remove('glitch');
      document.querySelector('.terminal')?.classList.remove('flicker');
    }, 320); // length of the animations
  }

  // Fire at unpredictable intervals
  setInterval(()=>{
    if (Math.random() < 0.12) glitchOnce();  // ~12% chance each tick
  }, 1200);

  // Bonus: manual trigger when user finds a diff
  function flashAndGlitch(msg){
    // your existing flash()
    flash(msg);
    glitchOnce();
  }
  // swap your markFound() call to flash() with flashAndGlitch() if you want the effect on every find