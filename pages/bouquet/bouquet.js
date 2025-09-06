// ============================
// bouquet.js
// ============================

const DEBUG = false; // flip to true while debugging
const log = (...a)=>{ if(DEBUG) console.log(...a); };

console.log('Bouquet.js: File loaded'); // Debug log
window.initBouquet = function() {
    console.log('initBouquet: Starting initialization'); // Debug log
    'use strict';
    const $ = (q, el = document) => el.querySelector(q);
    const root = $('#bouquet');
    if (!root) {
        console.error('initBouquet: #bouquet element not found'); // Debug log
        return;
    }
    if (root.dataset.initialized === '1') {
        console.log('initBouquet: Already initialized, skipping'); // Debug log
        return;
    }
    root.dataset.initialized = '1';

    const stage = $('.bouquet-stage', root);
    const catcher = $('#catcher', root);
    const scoreEl = $('#score', root);
    const goalEl = $('#goal', root);
    const banner = $('#banner', root);
    const cover = $('#cover', root);
    const btnStart = $('#btnStart', root);

    // Debug logs for DOM elements
    console.log('initBouquet: stage found:', !!stage);
    console.log('initBouquet: catcher found:', !!catcher);
    console.log('initBouquet: scoreEl found:', !!scoreEl);
    console.log('initBouquet: goalEl found:', !!goalEl);
    console.log('initBouquet: banner found:', !!banner);
    console.log('initBouquet: cover found:', !!cover);
    console.log('initBouquet: btnStart found:', !!btnStart);

    if (!btnStart) {
        console.error('initBouquet: #btnStart not found, cannot bind click event'); // Debug log
        return;
    }

    // ===== config/state =====
    const GOAL = 12;
    if (goalEl) goalEl.textContent = String(GOAL);
    let running = false, raf = 0, lastT = 0, nextSpawn = 0, score = 0;
    let catCenter = 0.5; // 0..1 of stage width
    let ctrl = 0; // -1..1 from tilt/keys; drag sets catCenter directly
    let dragging = false;
    const dots = []; // {el,x,y,w,h,vx,vy}

    // ===== helpers =====
    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
    const sRect = () => stage.getBoundingClientRect();
    const cHalf = () => (catcher.offsetWidth || 110) / 2;

    function placeCatcher() {
        const w = sRect().width;
        const px = clamp(catCenter * w, cHalf(), w - cHalf());
        catcher.style.left = Math.round(px) + 'px';
    }

    // ===== controls =====
    stage.addEventListener('pointerdown', ev => {
        // Ignore clicks on btnStart or cover
        if (ev.target.closest('#btnStart, #cover')) {
            console.log('initBouquet: Ignoring pointerdown on btnStart or cover'); // Debug log
            return;
        }
        console.log('initBouquet: Pointer down on stage'); // Debug log
        dragging = true;
        stage.setPointerCapture?.(ev.pointerId);
        const r = sRect();
        catCenter = clamp((ev.clientX - r.left) / r.width, 0, 1);
        placeCatcher();
    });
    stage.addEventListener('pointermove', ev => {
        if (!dragging) return;
        console.log('initBouquet: Pointer move on stage'); // Debug log
        const r = sRect();
        catCenter = clamp((ev.clientX - r.left) / r.width, 0, 1);
        placeCatcher();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t =>
        stage.addEventListener(t, () => {
            console.log('initBouquet: Pointer event ended:', t); // Debug log
            dragging = false;
        })
    );

    window.addEventListener('keydown', e => {
        if (!running) return;
        if (e.key === 'ArrowLeft') ctrl = -0.9;
        if (e.key === 'ArrowRight') ctrl = 0.9;
        console.log('initBouquet: Keydown:', e.key); // Debug log
    });
    window.addEventListener('keyup', e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') ctrl = 0;
        console.log('initBouquet: Keyup:', e.key); // Debug log
    });

    function enableTilt() {
        console.log('initBouquet: Enabling tilt'); // Debug log
        const onTilt = e => {
            const g = typeof e.gamma === 'number' ? e.gamma : 0;
            const b = typeof e.beta === 'number' ? e.beta : 0;
            const v = Math.abs(g) > Math.abs(b) ? g : b;
            ctrl = clamp(v / 30, -1, 1);
            console.log('initBouquet: Tilt detected, ctrl:', ctrl); // Debug log
        };
        if (typeof DeviceOrientationEvent === 'undefined') {
            console.warn('initBouquet: DeviceOrientationEvent not supported'); // Debug log
            return;
        }
        if (DeviceOrientationEvent.requestPermission) {
            DeviceOrientationEvent.requestPermission()
                .then(s => {
                    if (s === 'granted') window.addEventListener('deviceorientation', onTilt, true);
                    console.log('initBouquet: Tilt permission:', s); // Debug log
                })
                .catch(() => console.warn('initBouquet: Tilt permission denied')); // Debug log
        } else {
            window.addEventListener('deviceorientation', onTilt, true);
        }
    }

    // ===== game loop =====
    function spawn() {
        console.log('initBouquet: Spawning petal'); // Debug log
        const r = sRect();
        const el = document.createElement('div');
        el.className = 'dot';
        stage.appendChild(el);
        const w = 14;
        const x = Math.random() * (r.width - w) + w / 2;
        const y = -w;
        dots.push({ el, x, y, w, h: w, vx: (Math.random() - 0.5) * 0.5, vy: 0.9 + Math.random() * 0.4 });
        el.style.transform = `translate(${Math.round(x - w / 2)}px, ${Math.round(y - w / 2)}px)`;
    }

    function intersects(d) {
        const s = sRect();
        const c = catcher.getBoundingClientRect();
        const cx0 = c.left - s.left, cx1 = c.right - s.left;
        const cy0 = c.top - s.top, cy1 = c.bottom - s.top;
        const px = d.x, py = d.y;
        return (px >= cx0 && px <= cx1) && (py + d.h * 0.5 >= cy0 && py - d.h * 0.5 <= cy1);
    }

    function loop(t) {
        console.log('initBouquet: Game loop running, time:', t); // Debug log
        const dt = Math.min(3, (t - lastT) / 16.666 || 1);
        lastT = t;
        const r = sRect();

        if (!dragging) {
            catCenter = clamp(catCenter + ctrl * 0.03 * dt, 0, 1);
            placeCatcher();
        }

        if (t >= nextSpawn) {
            spawn();
            nextSpawn = t + 650;
        }

        for (let i = dots.length - 1; i >= 0; i--) {
            const d = dots[i];
            d.vy = Math.min(3.2, d.vy + 0.05 * dt);
            d.vx = clamp(d.vx + ctrl * 0.01 * dt, -1, 1);
            d.x = clamp(d.x + d.vx * 3.0 * dt, d.w * 0.5, r.width - d.w * 0.5);
            d.y += d.vy * 3.0 * dt;

            d.el.style.transform = `translate(${Math.round(d.x - d.w / 2)}px, ${Math.round(d.y - d.w / 2)}px)`;

            if (intersects(d)) {
                console.log('initBouquet: Petal caught, score:', score + 1); // Debug log
                d.el.remove();
                dots.splice(i, 1);
                score++;
                scoreEl && (scoreEl.textContent = String(score));
                if (score >= GOAL) {
                    console.log('initBouquet: Game won, score:', score); // Debug log
                    running = false;
                    cancelAnimationFrame(raf);
                   banner && (banner.hidden = false);
                    // Play audio on game completion
                    const audio = document.querySelector('audio[data-room-audio]');
                    if (audio) {
                        console.log('initBouquet: Playing bouquet.mp3 on game completion'); // Debug log
                        audio.play().catch(e => console.warn('initBouquet: Audio play failed:', e));
                    } else {
                        console.warn('initBouquet: Audio element not found'); // Debug log
                    }
                    return;
                }
            } else if (d.y - d.h / 2 > r.height + 24) {
                console.log('initBouquet: Petal missed, removing'); // Debug log
                d.el.remove();
                dots.splice(i, 1);
            }
        }

        if (running) raf = requestAnimationFrame(loop);
    }

    function startGame() {
        console.log('initBouquet: startGame called'); // Debug log
        if (running) {
            console.log('initBouquet: Game already running'); // Debug log
            return;
        }
        running = true;
        score = 0;
        scoreEl && (scoreEl.textContent = '0');
        banner && (banner.hidden = true);

        if (cover) {
            cover.hidden = true;
            cover.style.display = 'none';
            cover.style.pointerEvents = 'none';
            cover.setAttribute('aria-hidden', 'true');
        }

        catCenter = 0.5;
        placeCatcher();
        dots.splice(0).forEach(d => d.el.remove());
        lastT = performance.now();
        nextSpawn = lastT + 350;
        raf = requestAnimationFrame(loop);

        enableTilt();
    }

    // Robust click handler for btnStart
    btnStart.addEventListener('click', e => {
        console.log('initBouquet: COMEÇAR button clicked'); // Debug log
        e.preventDefault();
        e.stopPropagation();
        startGame();
    });

    // Cover click handler
    cover && cover.addEventListener('click', e => {
        if (e.target === cover) {
            console.log('initBouquet: Cover clicked'); // Debug log
            startGame();
        }
    });

    console.log('initBouquet: Initialization complete'); // Debug log
};

(function(){
    console.log('Bouquet.js: Boot starting'); // Debug log
    const boot = () => {
        console.log('Bouquet.js: Boot running initBouquet'); // Debug log
        window.initBouquet && window.initBouquet();
    };
    // Only listen for loader:done to avoid multiple inits
    if (window.__loaderDone) {
        console.log('Bouquet.js: Loader already done, booting'); // Debug log
        boot();
    } else {
        document.addEventListener('loader:done', () => {
            console.log('Bouquet.js: loader:done received'); // Debug log
            boot();
        }, { once: true });
    }
})();