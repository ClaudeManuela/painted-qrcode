/* ============================================================
   PAINTED — animation.js
   Studios, sprite toggles, floating particles, mascot, facts
   ============================================================ */

(() => {
  'use strict';

  // ---------- CONFIG ----------
  const STUDIOS = ['artstudio', 'fashionstudio', 'cozycafe', 'monetgarden'];

  const MASCOT_SETS = {
    artsy:   { folder: 'artsy',   frames: 8 },
    photo:   { folder: 'photo',   frames: 9 },
    glasses: { folder: 'glasses', frames: 8 },
    howdy:   { folder: 'howdy',   frames: 7 }
  };

  const SET_ORDER = ['artsy', 'photo', 'glasses', 'howdy'];

  // EDIT THESE 10 FACTS TO YOUR OWN
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

  // ---------- STUDIO CYCLING ----------
  const studioChip  = document.getElementById('studioChip');
  const studioLabel = document.getElementById('studioLabel');
  let studioIndex = 0;

  studioChip.addEventListener('click', () => {
    studioIndex = (studioIndex + 1) % STUDIOS.length;
    document.body.dataset.bg = STUDIOS[studioIndex];

    // rotate swatch
    studioChip.classList.toggle('rotated');
    setTimeout(() => studioChip.classList.remove('rotated'), 800);
  });

  // Fade the label after 5 seconds (option C)
  setTimeout(() => studioLabel.classList.add('hidden'), 5000);

  // ---------- SPRITE TOGGLES ----------
  const spriteContainers = {
    butterflies: document.getElementById('spriteButterflies'),
    glitter:     document.getElementById('spriteGlitter'),
    notes:       document.getElementById('spriteNotes'),
    hearts:      document.getElementById('spriteHearts')
  };

  // butterflies ON by default
  spriteContainers.butterflies.classList.add('active');

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

  // ---------- SPRITE SPAWNING ----------
  const SPRITE_GLYPHS = {
    butterflies: '🦋',
    glitter:     '✨',
    notes:       '🎵',
    hearts:      '💕'
  };

  const SPRITE_STYLES = {
    butterflies: { size: [26, 40], anim: 'float-across',   dur: [14, 22], glyph: '🦋' },
    glitter:     { size: [14, 22], anim: 'twinkle',        dur: [1.5, 3], glyph: '✨' },
    notes:       { size: [18, 28], anim: 'float-up',       dur: [10, 16], glyph: '🎵' },
    hearts:      { size: [18, 30], anim: 'float-up',       dur: [9, 15],  glyph: '💕' }
  };

  function spawnSprites(key, container) {
    const cfg = SPRITE_STYLES[key];
    const count = key === 'butterflies' ? 6 : 12;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'sprite';
      el.textContent = cfg.glyph;

      const size = rnd(cfg.size[0], cfg.size[1]);
      const dur  = rnd(cfg.dur[0],  cfg.dur[1]);
      const delay = Math.random() * dur;
      const top  = Math.random() * 90;
      const left = Math.random() * 90;

      el.style.fontSize = size + 'px';
      el.style.top  = top + '%';
      el.style.left = left + '%';

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

  // Pre-spawn the default butterflies
  spawnSprites('butterflies', spriteContainers.butterflies);

  function rnd(min, max) { return Math.random() * (max - min) + min; }

  // ---------- MASCOT POSE CYCLING ----------
  const mascotSprite = document.getElementById('mascotSprite');
  const mascotEl     = document.getElementById('mascot');
  const outfitBtn    = document.getElementById('outfitBtn');
  const speechBubble = document.getElementById('speechBubble');

  let currentSet = 'artsy';
  let currentFrame = 1;

  function updateSprite() {
    const info = MASCOT_SETS[currentSet];
    mascotSprite.src = `images/${info.folder}/frame${currentFrame}.png`;
  }

  // Click mascot → next pose within the current set
  mascotEl.addEventListener('click', () => {
    const info = MASCOT_SETS[currentSet];
    currentFrame = (currentFrame % info.frames) + 1;
    updateSprite();
  });

  mascotEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      mascotEl.click();
    }
  });

  // Click "next outfit" → switch to next pose set
  outfitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const idx = (SET_ORDER.indexOf(currentSet) + 1) % SET_ORDER.length;
    currentSet = SET_ORDER[idx];
    currentFrame = 1;
    updateSprite();
  });

  // ---------- FACT CYCLING (long-press mascot or right-click for now) ----------
  // We'll use a small fact-cycle on a second interaction pattern:
  // tap mascot 2x quickly OR use the speech bubble. To keep UX simple,
  // the outfit button cycles sets, the mascot cycles frames,
  // and a fact appears every 5 frame-clicks.
  let factIndex = 0;
  let frameClickCount = 0;

  mascotEl.addEventListener('click', () => {
    frameClickCount++;
    if (frameClickCount % 5 === 0) {
      showFact();
    }
  });

  function showFact() {
    speechBubble.textContent = FACTS[factIndex];
    speechBubble.classList.add('show');
    factIndex = (factIndex + 1) % FACTS.length;
    clearTimeout(showFact._t);
    showFact._t = setTimeout(() => {
      speechBubble.classList.remove('show');
    }, 3500);
  }

  // Expose for manual testing from console: showFact()
  window.showFact = showFact;

})();