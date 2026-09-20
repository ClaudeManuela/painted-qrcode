/* ============================================================
   PAINTED — animation.js
   Sprites, uniform brush choreography, Win98 mascot controls
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
  const TRAVEL_MS = 300;   // brush travel between swipes
  const REVEAL_MS = 500;   // reveal duration for each swipe

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
    glitter:     { glyphs: ['✨', '⭐', '💫'], size: [10, 16], anim: 'twinkle', dur: [1.8, 3.2], count: 14 },
    notes:       { glyphs: ['🎵', '🎶'], size: [12, 18], anim: 'float-up', dur: [11, 17], count: 10 },
    hearts:      { glyphs: ['💕', '💖', '💗'], size: [12, 20], anim: 'float-up', dur: [10, 16], count: 10 }
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
      if (isOn && container.children.length === 0) {
        spawnSprites(key, container);
      }
    });
  });

  function rnd(min, max) { return Math.random() * (max - min) + min; }

  // ---------- BRUSH CHOREOGRAPHY ----------
  // Brush tip is at the bottom of its SVG. We position the brush so its TIP
  // lands on the top-left of the swipe (the point it starts painting from).
  const brush = document.getElementById('brush');
  const paletteWrap = document.querySelector('.palette-wrap');
  const swipeEls = Array.from(document.querySelectorAll('.swipe, .portfolio-swipe'));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function positionBrushTipAt(x, y) {
    // Brush is 26x78. Tip is at (50%, 100%) of its box. Since transform-origin
    // is 50% 100%, translate(-50%, -100%) puts the origin (tip) at (x, y).
    brush.style.transform =
      `translate(${x}px, ${y}px) translate(-50%, -100%) rotate(22deg)`;
  }

  function paintSwipe(el) {
    return new Promise(resolve => {
      const wrapRect = paletteWrap.getBoundingClientRect();
      const r = el.getBoundingClientRect();

      // Tip target: top-left corner of the swipe
      const tipX = r.left - wrapRect.left - 4;
      const tipY = r.top  - wrapRect.top  + 6;

      positionBrushTipAt(tipX, tipY);

      // Wait for travel to complete
      setTimeout(() => {
        el.classList.add('painted');
        // Wait for the reveal to finish
        setTimeout(resolve, REVEAL_MS);
      }, TRAVEL_MS);
    });
  }

  async function runBrushSequence() {
    if (prefersReducedMotion) {
      swipeEls.forEach(s => s.classList.add('painted'));
      return;
    }

    brush.classList.add('visible');

    // Small entry pause so brush is visible before first move
    await new Promise(r => setTimeout(r, 200));

    for (const el of swipeEls) {
      await paintSwipe(el);
    }

    // Brush rests at lower-center of palette
    const wrapRect = paletteWrap.getBoundingClientRect();
    positionBrushTipAt(wrapRect.width * 0.5, wrapRect.height * 0.82);
    brush.style.transform += ' rotate(35deg)';

    // Fade out after a beat
    setTimeout(() => brush.classList.remove('visible'), 800);
  }

  requestAnimationFrame(() => {
    setTimeout(runBrushSequence, 200);
  });

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

  function startTimer() {
    stopTimer();
    frameTimer = setInterval(advanceFrame, FRAME_MS);
  }

  function stopTimer() {
    if (frameTimer) { clearInterval(frameTimer); frameTimer = null; }
  }

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
  mascotEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showFact();
    }
  });

  function showFact() {
    speechBubble.textContent = FACTS[factIndex];
    speechBubble.classList.add('show');
    factIndex = (factIndex + 1) % FACTS.length;
    clearTimeout(showFact._t);
    showFact._t = setTimeout(() => speechBubble.classList.remove('show'), 3500);
  }

})();