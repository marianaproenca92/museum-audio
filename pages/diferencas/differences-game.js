// ===== CONFIG =====
const IMG_A = "img/diffs/base.jpg";  // original
const IMG_B = "img/diffs/diff.jpg";  // edit with funny differences
// Differences as [x%, y%, w%, h%] relative to the board frame
const DIFFS = [
    [15, 18, 12, 14],  // horns
    [62, 32, 10, 12],  // boutonnière color swap
    [78, 84, 10, 10],  // shoe detail
    [35, 74, 12, 10]   // ring hand
];

// If you have a glitch intro function from your site, call it. Otherwise, show content immediately.
if (typeof runGlitchIntro === "function") {
    document.getElementById('intro').style.display = 'block';
    runGlitchIntro(()=> document.getElementById('content').scrollIntoView({behavior:'smooth'}));
}

// ===== INIT =====
const imgA = document.getElementById('imgA');
const imgB = document.getElementById('imgB');
const overlay = document.getElementById('overlay');
const board   = document.getElementById('board');
const toast   = document.getElementById('toast');
const audio   = document.getElementById('voice');
const post    = document.getElementById('post');
const foundEl = document.getElementById('found');
const totalEl = document.getElementById('total');
const needEl  = document.getElementById('need');
const gallery = document.getElementById('gallery');
const slideA  = document.getElementById('slideA');
const slideB  = document.getElementById('slideB');

imgA.src = IMG_A; imgB.src = IMG_B;
totalEl.textContent = DIFFS.length;
needEl.textContent  = DIFFS.length;

const state = { found: new Array(DIFFS.length).fill(false) };

// Which slide is currently most visible?
function getActiveSlide(){
  const vr = gallery.getBoundingClientRect();
  const ar = slideA.getBoundingClientRect();
  const br = slideB.getBoundingClientRect();
  const visA = Math.max(0, Math.min(ar.right, vr.right) - Math.max(ar.left, vr.left));
  const visB = Math.max(0, Math.min(br.right, vr.right) - Math.max(br.left, vr.left));
  return visA >= visB ? { img: imgA, frame: slideA } : { img: imgB, frame: slideB };
}

// Compute the drawn image box for object-fit: contain; object-position: center
function getImageBox(img, frame){
  const W = frame.clientWidth, H = frame.clientHeight;
  const iw = img.naturalWidth  || W;
  const ih = img.naturalHeight || H;
  const s  = Math.min(W/iw, H/ih);
  const w = iw * s, h = ih * s;
  const x = (W - w) / 2;    // centered
  const y = (H - h) / 2;
  return { x, y, w, h };
}

function layoutHotspots(){
  const { img, frame } = getActiveSlide();
  const box = getImageBox(img, frame); // visible image rect inside the slide
  [...overlay.children].forEach((el, i) => {
    const [px, py, pw, ph] = DIFFS[i]; // % relative to the image content
    el.style.left   = (box.x + (px/100)*box.w) + 'px';
    el.style.top    = (box.y + (py/100)*box.h) + 'px';
    el.style.width  = ((pw/100)*box.w) + 'px';
    el.style.height = ((ph/100)*box.h) + 'px';
    el.style.opacity = state.found[i] ? 1 : 0;
  });
}

// Create hotspots (percentage-based → responsive)
DIFFS.forEach((_, i) => {
    const hs = document.createElement('div');
    hs.className = 'hotspot';
    hs.dataset.index = i;
    overlay.appendChild(hs);
});


new ResizeObserver(layoutHotspots).observe(board);
window.addEventListener('load', layoutHotspots);
gallery.addEventListener('scroll', () => requestAnimationFrame(layoutHotspots), { passive: true });
imgA.addEventListener('load', layoutHotspots);
imgB.addEventListener('load', layoutHotspots);


function markFound(i){
    if (i < 0 || state.found[i]) return;
    state.found[i] = true;
    overlay.querySelector(`.hotspot[data-index="${i}"]`).classList.add('found');
    flash(`[FRAGMENTO ${i+1} RECUPERADO]`);
    updateCount();
    if (state.found.every(Boolean)) unlock();
}
function updateCount(){
    foundEl.textContent = state.found.filter(Boolean).length;
}
function unlock(){
    audio.style.display = 'block';
    audio.play().catch(()=>{});
    post.style.display = 'block';
    flash('[MEMÓRIA REABERTA — REPRODUÇÃO INICIADA]');
}
function flash(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'), 900);
}

// Hit test (tap/click anywhere over overlay)
function hit(x, y){
    const b = board.getBoundingClientRect();
    const ox = x - b.left, oy = y - b.top;
    let idx = -1;
    [...overlay.children].forEach(hs=>{
    const r = hs.getBoundingClientRect();
    const hx = r.left - b.left, hy = r.top - b.top;
    if (ox >= hx && ox <= hx + r.width && oy >= hy && oy <= hy + r.height) idx = parseInt(hs.dataset.index,10);
    });
    return idx;
}
board.addEventListener('click', e => { const i = hit(e.clientX, e.clientY); if (i>=0) markFound(i); });
board.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; const i = hit(t.clientX, t.clientY);
    if (i>=0){ e.preventDefault(); markFound(i); }
}, {passive:false});

// Hint reveals one unfound rect briefly
document.getElementById('hint').addEventListener('click', ()=>{
    const i = state.found.indexOf(false);
    if (i === -1) return;
    const hs = overlay.querySelector(`.hotspot[data-index="${i}"]`);
    const old = hs.style.opacity; hs.style.opacity = 1;
    setTimeout(()=>{ if (!state.found[i]) hs.style.opacity = old; }, 2000);
});