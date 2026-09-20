/* ============================================================
   PAINTED — animation.js
   Real-brushstroke reveal, brush choreography, Win98 mascot
   ============================================================ */

(() => {
  'use strict';

  const MASCOT_SETS = {
    artsy:   { folder: 'artsy',   frames: 8 },
    photo:   { folder: 'photo',   frames: 9 },
    glasses: { folder: 'glasses', frames: 8 },
    howdy:   { folder: 'howdy',   frames: 7 }
  };
  const SET_ORDER = ['artsy', 'photo', 'glasses', 'howdy'];
  const FRAME_MS = 300;

  const TRAVEL_MS = 220;
  const REVEAL_MS = 500;
  const OVERLAP_MS = 100;

  const FACTS = [
    "I paint with my heart, not just my hands.",
    "My favourite colour is burgundy.",
    "I've been creating since I was little.",
    "Butterflies are my favourite muse.",
    "Every painting holds a little magic.",
    "I love painting at sunset.",
    "Glitter makes everything better.",
    "My studio is my happy place.",
    "I believe art should feel like a warm hug.",
    "Follow for more ✨"
  ];

  // ---------- SPRITES ----------
  const spriteContainers = {
    butterflies: document.getElementById('spriteButterflies'),
    glitter:     document.getElementById('spriteGlitter'),
    notes:       document.getElementById('spriteNotes'),
    hearts:      document.getElementById('spriteHearts')
  };

  const SPRITE_POOLS = {
    butterflies: { glyphs: ['🦋'], size: [16, 24], anim: 'float-across', dur: [16, 26], count: 8 },
    glitter:     { glyphs: ['✨','⭐','💫'], size: [10, 16], anim: 'twinkle', dur: [1.8, 3.2], count: 14 },
    notes:       { glyphs: ['🎵','🎶'], size: [12, 18], anim: 'float-up', dur: [11, 17], count: 10 },
    hearts:      { glyphs: ['💕','💖','💗'], size: [12, 20], anim: 'float-up', dur: [10, 16], count: 10 }
  };

  function spawnSprites(key, container) {
    const cfg = SPRITE_POOLS[key];
    for (let i = 0; i < cfg.count; i++) {
      const el = document.createElement('div');
      el.className = 'sprite';
      el.textContent = cfg.glyphs[Math.floor(Math.random() * cfg.glyphs.length)];
      const size  = rnd(cfg.size[0], cfg.size[1]);
      const dur   = rnd(cfg.dur[0],  cfg.dur[1]);
      const delay = Math.random() * dur;
      el.style.fontSize = size + 'px';
      el.style.top  = (Math.random() * 90) + '%';
      el.style.left = (Math.random() * 90) + '%';
      if (cfg.anim === 'float-across') {
        el.style.animation = `${cfg.anim} ${dur}s linear ${delay}s infinite`;
      } else if (cfg.anim === 'float-up') {
        el.style.animation = `${cfg.anim} ${dur}s ease-out ${delay}s infinite`;
      } else {
        el.style.animation = `${cfg.anim} ${dur}s ease-in-out ${delay}s infinite`;
      }
      container.appendChild(el);
    }
  }

  spriteContainers.butterflies.classList.add('active');
  spawnSprites('butterflies', spriteContainers.butterflies);

  document.querySelectorAll('.toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.toggle;
      const container = spriteContainers[key];
      const isOn = container.classList.toggle('active');
      btn.classList.toggle('toggle--on', isOn);
      btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      if (isOn && container.children.length === 0) spawnSprites(key, container);
    });
  });

  function rnd(min, max) { return Math.random() * (max - min) + min; }

  // ---------- BRUSH + REVEAL ----------
  const brush = document.getElementById('brush');
  const paletteWrap = document.querySelector('.palette-wrap');
  const vial = document.getElementById('vial');
  const swipeEls = Array.from(document.querySelectorAll('.swipe'));
  const startButtons = document.getElementById('startButtons');
  const clickBtn = document.getElementById('clickToPaint');
  const skipBtn  = document.getElementById('skipToLinks');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tipTo(x, y, rot = 22) {
    return `translate(${x}px, ${y}px) translate(-50%, -100%) rotate(${rot}deg)`;
  }

  async function moveTipTo(x, y, duration = TRAVEL_MS, easing = 'ease-out', rot = 22) {
    const current = getComputedStyle(brush).transform;
    const start = current === 'none' ? tipTo(x, y, rot) : current;
    const anim = brush.animate(
      [{ transform: start }, { transform: tipTo(x, y, rot) }],
      { duration, easing, fill: 'forwards' }
    );
    await anim.finished;
  }

  async function dip(intoEl, ms = 260) {
    const anim = brush.animate(
      [
        { transform: getComputedStyle(brush).transform },
        { transform: getComputedStyle(brush).transform + ' scale(0.86)' },
        { transform: getComputedStyle(brush).transform }
      ],
      { duration: ms, easing: 'ease-in-out' }
    );
    await anim.finished;
  }

  function revealSwipe(el) {
    return new Promise(resolve => {
      const paint = el.querySelector('.swipe-paint');
      if (!paint) return resolve();
      const anim = paint.animate(
        [
          { '--reveal': '0%' },
          { '--reveal': '100%' }
        ],
        { duration: REVEAL_MS, easing: 'ease-out', fill: 'forwards' }
      );
      // Fallback for browsers that don't animate custom properties natively
      // by also toggling the CSS variable directly.
      paint.style.setProperty('--reveal', '0%');
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / REVEAL_MS);
        paint.style.setProperty('--reveal', (t * 100) + '%');
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  let hasPainted = false;
  let isPainting = false;

  async function runBrushSequence() {
    if (isPainting || hasPainted) return;
    isPainting = true;
    startButtons.classList.add('hidden');

    if (prefersReducedMotion) {
      swipeEls.forEach(el => {
        const p = el.querySelector('.swipe-paint');
        if (p) p.style.setProperty('--reveal', '100%');
      });
      hasPainted = true;
      isPainting = false;
      return;
    }

    brush.classList.add('visible');
    await new Promise(r => setTimeout(r, 80));

    const wrapRect = paletteWrap.getBoundingClientRect();

    // Enter from upper-left
    await moveTipTo(wrapRect.width * 0.18, wrapRect.height * 0.22, 260);

    // Dip into vial
    const vr = vial.getBoundingClientRect();
    await moveTipTo(
      vr.left - wrapRect.left + vr.width / 2,
      vr.top  - wrapRect.top  + vr.height * 0.75,
      220
    );
    await dip(vial);

    // Paint each swipe: move brush to swipe start, then reveal
    for (const el of swipeEls) {
      const r = el.getBoundingClientRect();
      const startX = r.left - wrapRect.left + 6;
      const startY = r.top  - wrapRect.top  + 8;
      await moveTipTo(startX, startY, TRAVEL_MS);

      const revealPromise = revealSwipe(el);
      await new Promise(res => setTimeout(res, Math.max(0, REVEAL_MS - OVERLAP_MS)));
      await revealPromise;
    }

    // Dip into mini palette strip
    const strip = document.querySelector('.pw-palette-strip');
    if (strip) {
      const sr = strip.getBoundingClientRect();
      await moveTipTo(
        sr.left - wrapRect.left + sr.width / 2,
        sr.top  - wrapRect.top  + sr.height * 0.6,
        240
      );
      await dip(strip, 220);
    }

    // Settle in thumb hole
    await moveTipTo(wrapRect.width * 0.5, wrapRect.height * 0.88, 260, 'ease-in-out', 35);

    hasPainted = true;
    isPainting = false;
  }

  function skipToLinks() {
    if (hasPainted) return;
    startButtons.classList.add('hidden');
    swipeEls.forEach(el => {
      const p = el.querySelector('.swipe-paint');
      if (p) p.style.setProperty('--reveal', '100%');
    });
    hasPainted = true;
  }

  clickBtn.addEventListener('click', runBrushSequence);
  skipBtn.addEventListener('click', skipToLinks);

  setTimeout(() => { if (!hasPainted) runBrushSequence(); }, 8000);

  // ---------- MASCOT ----------
  const mascotSprite = document.getElementById('mascotSprite');
  const mascotEl     = document.getElementById('mascot');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playIcon     = document.getElementById('playIcon');
  const outfitBtn    = document.getElementById('outfitBtn');
  const speechBubble = document.getElementById('speechBubble');

  let currentSet = 'artsy';
  let currentFrame = 1;
  let isPlaying = true;
  let frameTimer = null;

  function updateSprite() {
    const info = MASCOT_SETS[currentSet];
    mascotSprite.src = `images/${info.folder}/frame${currentFrame}.png`;
  }
  function advanceFrame() {
    const info = MASCOT_SETS[currentSet];
    currentFrame = (currentFrame % info.frames) + 1;
    updateSprite();
  }
  function startTimer() { stopTimer(); frameTimer = setInterval(advanceFrame, FRAME_MS); }
  function stopTimer()  { if (frameTimer) { clearInterval(frameTimer); frameTimer = null; } }

  function setPlaying(playing) {
    isPlaying = playing;
    if (playing) {
      startTimer();
      playIcon.textContent = '⏸';
      playPauseBtn.setAttribute('aria-label', 'Pause animation');
    } else {
      stopTimer();
      playIcon.textContent = '▶';
      playPauseBtn.setAttribute('aria-label', 'Play animation');
    }
  }

  setPlaying(true);
  playPauseBtn.addEventListener('click', () => setPlaying(!isPlaying));
  outfitBtn.addEventListener('click', () => {
    const idx = (SET_ORDER.indexOf(currentSet) + 1) % SET_ORDER.length;
    currentSet = SET_ORDER[idx];
    currentFrame = 1;
    updateSprite();
  });

  let factIndex = 0;
  mascotEl.addEventListener('click', showFact);
  mascotEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showFact(); }
  });

  function showFact() {
    speechBubble.textContent = FACTS[factIndex];
    speechBubble.classList.add('show');
    factIndex = (factIndex + 1) % FACTS.length;
    clearTimeout(showFact._t);
    showFact._t = setTimeout(() => speechBubble.classList.remove('show'), 3500);
  }

})();