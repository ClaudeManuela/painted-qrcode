/* ============================================================
   PAINTED — animation.js
   Brush moves across swipes, clip-path reveal synced
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

  const TRAVEL_MS = 200;
  const REVEAL_MS = 650;
  const OVERLAP_MS = 120;

  const FACTS = [
    "omg hi thank you for actually clicking i was worried people wouldn't notice",
    "I like to change my hair every month, right now my hair is white and curly.",
    "I made this website by myself (and many other software and hardware gadgets).",
    "My cat's name is captain america but he answers to Chris Evans too.",
    "I taught myself 6 languages and I'm learning korean now.",
    "All of the animations are photos of me that i pixelated one by one to make it animated.",
    "I have the opposite of a sense of direction, I get lost in ways that shock me.",
    "it took me like two days to figure out the paint swipe animation,this was most of my weekend.",
    "my favorite shows are attack on titan, Dr. stone, and assassination classroom.",
    "uhhh what else....thanks for reading this far!"
  ];

  // ---------- SPRITES ----------
  const spriteContainers = {
    butterflies: document.getElementById('spriteButterflies'),
    glitter:     document.getElementById('spriteGlitter'),
    notes:       document.getElementById('spriteNotes'),
    hearts:      document.getElementById('spriteHearts')
  };

  const SPRITE_POOLS = {
    butterflies: { glyphs: ['🦋', '𓂃 ࣪˖ ִֶָ𐀔', 'ཐི༏ཋྀ', '᭪༊'], size: [14, 22], anim: 'float-across', dur: [16, 26], count: 8 },
    glitter:     { glyphs: ['✨','⭐','💫'], size: [8, 14], anim: 'twinkle', dur: [1.8, 3.2], count: 14 },
    notes:       { glyphs: ['🎵','🎶'], size: [10, 16], anim: 'float-up', dur: [11, 17], count: 10 },
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

  // ---------- BRUSH ----------
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

  async function animateBrush(fromXY, toXY, duration, rot = 22, easing = 'ease-out') {
    const from = fromXY || { x: 0, y: 0 };
    const anim = brush.animate(
      [
        { transform: tipTo(from.x, from.y, rot) },
        { transform: tipTo(toXY.x, toXY.y, rot) }
      ],
      { duration, easing, fill: 'forwards' }
    );
    await anim.finished;
    return toXY;
  }

  async function dipBounce(ms = 240) {
    const current = getComputedStyle(brush).transform;
    const anim = brush.animate(
      [
        { transform: current },
        { transform: current + ' scale(0.86)' },
        { transform: current }
      ],
      { duration: ms, easing: 'ease-in-out' }
    );
    await anim.finished;
  }

  // Animate a swipe reveal while the brush rides the leading edge.
  // We compute the swipe's pixel bounds, animate clip-path on the image,
  // and drive the brush tip from left to right.
  function revealSwipeWithBrush(el, brushStartXY) {
    return new Promise(async (resolve) => {
      const paint = el.querySelector('.swipe-paint');
      if (!paint) return resolve();

      const wrapRect = paletteWrap.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const leftX = r.left - wrapRect.left + 4;
      const rightX = r.right - wrapRect.left - 4;
      const centerY = r.top - wrapRect.top + r.height / 2;
      const tipY = r.top - wrapRect.top + r.height * 0.65;

      // Move brush to the start of the swipe first
      const startXY = await animateBrush(brushStartXY, { x: leftX, y: tipY }, TRAVEL_MS, 15);

      // Then ride the leading edge while revealing
      const revealAnim = paint.animate(
        [
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0 0 0)' }
        ],
        { duration: REVEAL_MS, easing: 'ease-out', fill: 'forwards' }
      );

      const brushAnim = brush.animate(
        [
          { transform: tipTo(leftX, tipY, 15) },
          { transform: tipTo(rightX, tipY, 15) }
        ],
        { duration: REVEAL_MS, easing: 'ease-out', fill: 'forwards' }
      );

      await Promise.all([revealAnim.finished, brushAnim.finished]);

      el.classList.add('painted');
      resolve({ x: rightX, y: tipY });
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
        el.classList.add('painted');
        const p = el.querySelector('.swipe-paint');
        if (p) p.style.clipPath = 'inset(0 0 0 0)';
      });
      hasPainted = true;
      isPainting = false;
      return;
    }

    brush.classList.add('visible');
    await new Promise(r => setTimeout(r, 80));

    const wrapRect = paletteWrap.getBoundingClientRect();

    // 1. Enter from upper-left
    let brushXY = await animateBrush(
      { x: wrapRect.width * 0.1, y: wrapRect.height * 0.15 },
      { x: wrapRect.width * 0.18, y: wrapRect.height * 0.24 },
      260
    );

    // 2. Dip into vial
    const vr = vial.getBoundingClientRect();
    brushXY = await animateBrush(
      brushXY,
      {
        x: vr.left - wrapRect.left + vr.width / 2,
        y: vr.top  - wrapRect.top  + vr.height * 0.75
      },
      220
    );
    await dipBounce(260);

    // 3. Reveal each swipe in order
    for (const el of swipeEls) {
      brushXY = await revealSwipeWithBrush(el, brushXY);
      await new Promise(r => setTimeout(r, OVERLAP_MS));
    }

    // 4. Dip into mini palette strip
    const strip = document.querySelector('.pw-palette-strip');
    if (strip) {
      const sr = strip.getBoundingClientRect();
      brushXY = await animateBrush(
        brushXY,
        {
          x: sr.left - wrapRect.left + sr.width / 2,
          y: sr.top  - wrapRect.top  + sr.height * 0.6
        },
        240
      );
      await dipBounce(220);
    }

    // 5. Settle beside the website swipe (last thing painted)
await animateBrush(
  brushXY,
  { x: brushXY.x + 18, y: brushXY.y + 30 },
  260,
  40,
  'ease-in-out'
);

    hasPainted = true;
    isPainting = false;
  }

  function skipToLinks() {
    if (hasPainted) return;
    startButtons.classList.add('hidden');
    swipeEls.forEach(el => {
      el.classList.add('painted');
      const p = el.querySelector('.swipe-paint');
      if (p) p.style.clipPath = 'inset(0 0 0 0)';
    });
    hasPainted = true;
  }

  clickBtn.addEventListener('click', runBrushSequence);
  skipBtn.addEventListener('click', skipToLinks);

  // NO auto-paint timer — user must choose.

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