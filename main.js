// ============ CONFIG ============
const CONFIG = {
  MAX_HEARTS: 5,
  BALLISTA_COUNT: 4,
  BALLISTA_COOLDOWN: 400,
  BOLT_SPEED: 2500,
  LEGIONARY_SPEED: 140, LEGIONARY_HP: 1, LEGIONARY_SQUAD_SIZE: 5,
  TESTUDO_SPEED: 80, TESTUDO_HP: 3, TESTUDO_WIDTH: 180, TESTUDO_HEIGHT: 140,
  SIEGE_TOWER_SPEED: 55, SIEGE_TOWER_HP: 5, SIEGE_TOWER_WIDTH: 120, SIEGE_TOWER_HEIGHT: 160,
  LEGIONARY_SCORE: 100, TESTUDO_SCORE: 300, SIEGE_TOWER_SCORE: 500,
  PERFECT_WAVE_BONUS: 200, BOSS_CLEAR_BONUS: 1000,
  BOB_AMPLITUDE: 2.5, BOB_FREQUENCY: 6, DUST_INTERVAL: 100,
  SHAKE_DECAY: 0.9, SCALE_MIN: 0.7, SCALE_MAX: 1.0,
  WAVES_PER_LEVEL: 5, WAVE_PAUSE: 2000, MAX_LEVEL: 50, BOSS_INTERVAL: 5,
  TAP_RADIUS_MULTIPLIER: 1.2,
  COLORS: {
    GROUND: '#c4a87c', GROUND_DARK: '#a8884a',
    WALL_STONE: '#c4a87c', WALL_DARK: '#8a7560', WALL_BRICK: '#a08060',
    SHIELD_RED: '#b5452a', GOLD: '#c4a035',
    BOLT_GOLD: '#daa520', FLASH_GOLD: '#ffd700',
    WOOD_BROWN: '#4a2a12', WOOD_LIGHT: '#6b4423',
    HEART_RED: '#cc3333', HEART_GREY: '#555555',
    UI_BG: 'rgba(20, 10, 4, 0.75)', UI_TEXT: '#f0e6d0', UI_GOLD: '#daa520',
    DUST: '#b09870', SHADOW: 'rgba(0,0,0,0.15)', CREST_RED: '#8b2020',
  }
};

// ============ POWER-UPS ============
const POWERUP_TYPES = [
  { id: 'WALL_REPAIR', name: 'Repair', color: '#4ecdc4', icon: '♥' },
  { id: 'SORTIE',      name: 'Sortie', color: '#e67e22', icon: '⚔' },
  { id: 'FIRE_BOLTS',  name: 'Fire',   color: '#e74c3c', icon: '🔥' },
];

// ============ GAME STATE ============
const state = {
  screen: 'TITLE',
  score: 0, bestScore: 0, level: 1, wave: 0,
  hearts: CONFIG.MAX_HEARTS, multiplier: 1, consecutiveKills: 0,
  waveEnemiesTotal: 0, waveEnemiesRemaining: 0, waveDamage: 0,
  entities: [], bolts: [], particles: [], popups: [],
  ballistae: [], powerUps: [null, null, null], collectibles: [],
  defenders: [],
  awardedPowerupLevels: [],
  pendingPowerupTimer: -1,
  repairSweepX: -1,
  shake: { x: 0, y: 0, intensity: 0, duration: 0 },
  ambientParticles: [], sparkles: [], sparkleTimer: 0.7, wallFlash: 0,
  time: 0, deltaTime: 0, lastTime: 0,
  firstPlay: true, paused: false, fireBoltsTimer: 0,
  briefingPage: 0,
  callsign: '',
  leaderboardData: null,
  saveStatus: '',
  myRank: null,
  saveInFlight: false,
  scoreSubmitted: false,
};

// ============ CANVAS SETUP ============
let canvas, ctx;
let gameWidth, gameHeight;
let wallY;
let wallHeight, walkwayHeight;
let mouseX = -100, mouseY = -100;
const isTouchDevice = (typeof window !== 'undefined') && ('ontouchstart' in window);
const decorations = { dunes: [], ripples: [], rocks: [], buildings: [], palms: [] };

function resize() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');

  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Canvas fills the entire window
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.style.position = 'absolute';
  canvas.style.left = '0';
  canvas.style.top = '0';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;

  // Game dimensions = window dimensions (no scaling, no letterbox)
  gameWidth = w;
  gameHeight = h;

  // Wall position: always bottom 18% of screen
  wallY = Math.floor(gameHeight * 0.82);
  wallHeight = gameHeight - wallY;
  walkwayHeight = Math.floor(wallHeight * 0.4);

  generateDecorations();
  initAmbientParticles();

  if (state.ballistae.length === 0) {
    initBallistae();
  } else {
    repositionBallistae();
  }
}

function generateDecorations() {
  const fieldH = wallY;

  // Sand dune patches — percentage positions across the desert
  const dunePcts = [
    [0.16, 0.14, 55, 22], [0.60, 0.10, 70, 25], [0.77, 0.26, 50, 18],
    [0.28, 0.36, 65, 22], [0.87, 0.48, 60, 24], [0.41, 0.58, 55, 20],
    [0.71, 0.71, 70, 26], [0.19, 0.82, 60, 22],
  ];
  decorations.dunes = dunePcts.map(([px, py, rx, ry]) => ({
    x: px * gameWidth, y: py * fieldH, rx, ry,
  }));

  // Sand ripple baseline Y values
  decorations.ripples = [0.18, 0.34, 0.49, 0.66, 0.81].map(p => p * fieldH);

  // Tiny scattered rocks
  const rockPcts = [
    [0.07, 0.18, 1.5], [0.24, 0.26, 2], [0.45, 0.16, 1.5], [0.63, 0.32, 1.8],
    [0.83, 0.21, 2], [0.12, 0.42, 1.5], [0.35, 0.49, 1.8], [0.65, 0.55, 2],
    [0.93, 0.64, 1.5], [0.15, 0.68, 1.8], [0.51, 0.80, 2], [0.85, 0.86, 1.5],
  ];
  decorations.rocks = rockPcts.map(([px, py, r]) => ({
    x: px * gameWidth, y: py * fieldH, r,
  }));

  // City strip: buildings + palms below the walkway
  const cityH = wallHeight - walkwayHeight;
  decorations.buildings = [
    [0.07, 0.24, 60, 45], [0.19, 0.21, 50, 40], [0.35, 0.28, 70, 50],
    [0.53, 0.21, 55, 38], [0.68, 0.26, 65, 48], [0.83, 0.19, 50, 36],
  ].map(([px, py, w, h]) => ({
    x: px * gameWidth, y: py * cityH, w, h,
  }));
  decorations.palms = [
    [0.16, 0.35, 9], [0.32, 0.31, 11], [0.51, 0.38, 8],
    [0.65, 0.33, 10], [0.80, 0.36, 9],
  ].map(([px, py, r]) => ({ x: px * gameWidth, y: py * cityH, r }));
}

// ============ ASSET LOADER ============
const SPRITES = {};
const SPRITE_FILES = {
  testudo: 'assets/sprites/testudo.png',
  legionary: 'assets/sprites/legionary.png',
  siegeTower: 'assets/sprites/siege_tower.png',
  wall: 'assets/sprites/wall.png',
  city: 'assets/sprites/city.png',
  defender: 'assets/sprites/defender.png',
  borderFrame: 'assets/sprites/border_frame.png',
  mosaic_tile: 'assets/sprites/mosaic_tile.png',
};

// PNGs with white/checkered backgrounds: force the cleaner code-drawn fallback
const USE_SPRITE = {
  legionary: true,
  testudo: true,
  siegeTower: false,
  wall: false,
  city: false,
  mosaic_tile: true,
};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function initAssets() {
  for (const [key, src] of Object.entries(SPRITE_FILES)) {
    loadImage(src).then(img => { if (img) SPRITES[key] = img; });
  }
}

// ============ INPUT HANDLER ============
function getGameCoords(clientX, clientY) {
  return { x: clientX, y: clientY };
}

function handleGameplayTap(x, y) {
  // Collectible pickup
  for (let i = 0; i < state.collectibles.length; i++) {
    const c = state.collectibles[i];
    if (Math.hypot(x - c.x, y - c.y) < 30) {
      const slot = state.powerUps.findIndex(p => !p);
      if (slot !== -1 && !state.powerUps.some(p => p && p.id === c.type.id)) {
        state.powerUps[slot] = c.type;
        spawnImpactBurst(c.x, c.y, [c.type.color, '#ffffff'], 14);
        AudioManager.play('powerup_collect');
      }
      state.collectibles.splice(i, 1);
      return;
    }
  }

  // Power-up rail tap
  for (let i = 0; i < 3; i++) {
    const px = gameWidth - 50;
    const py = 80 + i * 50;
    if (x >= px && x <= px + 40 && y >= py && y <= py + 40 && state.powerUps[i]) {
      activatePowerUp(i);
      return;
    }
  }

  let nearest = null;
  let bestDist = Infinity;
  for (const entity of state.entities) {
    if (!entity.alive || entity.crumbling) continue;
    const scale = entityScale(entity);
    const hitRadius = entity.width * scale * CONFIG.TAP_RADIUS_MULTIPLIER;
    const d = Math.hypot(x - entity.x, y - entity.y);
    if (d < hitRadius && d < bestDist) {
      bestDist = d;
      nearest = entity;
    }
  }
  if (nearest) {
    fireBoltFromNearest(nearest.x, nearest.y);
  }
}

function handleInput(clientX, clientY) {
  AudioManager.init();
  const { x, y } = getGameCoords(clientX, clientY);
  if (x < 0 || x > gameWidth || y < 0 || y > gameHeight) return;

  // Sound toggle button — top-right HUD, only active during gameplay-related screens
  if (state.screen === 'PLAYING' || state.screen === 'PAUSED' || state.screen === 'LEVEL_UP' || state.screen === 'BOSS_WARNING') {
    const tb = soundToggleBounds();
    if (pointInRect(x, y, tb)) {
      AudioManager.toggle();
      return;
    }
  }

  switch (state.screen) {
    case 'TITLE':
      if (state.firstPlay) {
        state.briefingPage = 0;
        state.screen = 'BRIEFING';
      } else {
        startGame();
      }
      break;
    case 'BRIEFING':
      if (x < gameWidth * 0.4) {
        state.firstPlay = false;
        startGame();
      } else {
        if (state.briefingPage >= BRIEFING_PAGES.length - 1) {
          state.firstPlay = false;
          startGame();
        } else {
          state.briefingPage += 1;
        }
      }
      break;
    case 'LEVEL_UP':
    case 'BOSS_WARNING':
      // Resume play — next wave kicks off immediately
      betweenWaves = false;
      betweenWaveTimer = 0;
      if (state.waveEnemiesTotal === 0 && waveSpawnQueue.length === 0) {
        spawnWave();
      }
      state.screen = 'PLAYING';
      // Reward a power-up every 3rd level (during the upcoming wave)
      if (state.level % 3 === 0 && !state.awardedPowerupLevels.includes(state.level)) {
        state.pendingPowerupTimer = 1.5;
      }
      break;
    case 'GAME_OVER':
      handleGameOverTap(x, y);
      break;
    case 'PAUSED':
      state.screen = 'PLAYING';
      state.paused = false;
      break;
    case 'PLAYING':
      handleGameplayTap(x, y);
      break;
  }
}

function resetToTitle() {
  state.screen = 'TITLE';
  state.entities = [];
  state.bolts = [];
  state.particles = [];
  state.popups = [];
  state.sparkles = [];
  state.collectibles = [];
  state.defenders = [];
  state.powerUps = [null, null, null];
  state.awardedPowerupLevels = [];
  state.pendingPowerupTimer = -1;
  state.fireBoltsTimer = 0;
  state.repairSweepX = -1;
  state.wallFlash = 0;
  state.shake.x = 0; state.shake.y = 0; state.shake.intensity = 0; state.shake.duration = 0;
  waveSpawnQueue = [];
  waveSpawnTimer = 0;
  betweenWaves = false;
  betweenWaveTimer = 0;
  state.leaderboardData = null;
  state.saveStatus = '';
  state.myRank = null;
  state.saveInFlight = false;
  state.scoreSubmitted = false;
}

function handleGameOverTap(x, y) {
  const b = gameOverButtons();
  if (b.callsign && pointInRect(x, y, b.callsign)) {
    const name = prompt('Enter your callsign:', state.callsign || '');
    if (name) {
      state.callsign = name.replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 20);
      if (state.callsign) trySubmitAndRefresh();
    }
    return;
  }
  if (b.share && pointInRect(x, y, b.share)) {
    const text = `I defended Palmyra to Level ${state.level} with ${state.score.toLocaleString()} points! Can you beat me? 🏛️ Play: https://palmyra.anmol.be`;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    return;
  }
  if (b.again && pointInRect(x, y, b.again)) {
    startGame();
    return;
  }
  if (b.menu && pointInRect(x, y, b.menu)) {
    resetToTitle();
    return;
  }
  // Any tap outside known buttons does nothing — prevents accidental restart
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// ============ ENTITIES ============

function entityScale(entity) {
  const t = Math.max(0, Math.min(1, entity.y / wallY));
  return CONFIG.SCALE_MIN + (CONFIG.SCALE_MAX - CONFIG.SCALE_MIN) * t;
}

function createLegionarySquad(x, y, speedMultiplier = 1) {
  return {
    type: 'legionary',
    x: x,
    y: y,
    soldiers: Array.from({length: CONFIG.LEGIONARY_SQUAD_SIZE}, () => ({
      offsetX: (Math.random() - 0.5) * 50,
      offsetY: (Math.random() - 0.5) * 40,
      bobPhase: Math.random() * Math.PI * 2,
      renderOffsetY: 0,
    })),
    hp: CONFIG.LEGIONARY_HP,
    speed: CONFIG.LEGIONARY_SPEED * speedMultiplier,
    alive: true,
    width: 100,
    height: 90,
    flashTimer: 0,
    crumbling: false,
    crumbleTimer: 0.3,
    dustTimer: 0,
    pathStartX: x,
    pathControlX: x + (Math.random() - 0.5) * 80,
    pathEndX: x + (Math.random() - 0.5) * 30,
    pathStartY: -50,
    spawnY: -50,
  };
}

function renderLegionarySquad(ctx, entity) {
  const scale = entityScale(entity);
  const flashing = entity.flashTimer > 0;

  if (USE_SPRITE.legionary && SPRITES.legionary) {
    const w = entity.width * scale;
    const h = entity.height * scale;
    const bob = Math.sin(state.time / 1000 * 6) * 2;
    ctx.save();
    if (flashing) ctx.filter = 'brightness(1.8)';
    ctx.drawImage(SPRITES.legionary, entity.x - w / 2, entity.y - h / 2 + bob, w, h);
    ctx.restore();
    return;
  }

  for (const s of entity.soldiers) {
    const sx = entity.x + s.offsetX;
    const sy = entity.y + s.offsetY + (s.renderOffsetY || 0);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);

    // Soft shadow under the soldier
    ctx.fillStyle = CONFIG.COLORS.SHADOW;
    ctx.beginPath();
    ctx.ellipse(0, 14, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body torso hint behind the shield (dark armor)
    ctx.fillStyle = flashing ? '#ffd0c0' : '#2a1a0a';
    ctx.fillRect(-3, 1, 6, 8);

    // Helmet — outer dark circle 8px
    ctx.fillStyle = flashing ? '#ffffff' : '#2a1a0a';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    // Inner lighter highlight 5px
    ctx.fillStyle = flashing ? '#ffe6a8' : '#6b5030';
    ctx.beginPath();
    ctx.arc(-1.5, -2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Red crest line across helmet top, 10px wide
    ctx.strokeStyle = CONFIG.COLORS.CREST_RED;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5, -7);
    ctx.lineTo(5, -7);
    ctx.stroke();

    // Shield — red rounded rect 10×16 with gold trim + boss
    ctx.fillStyle = flashing ? '#ffb0a0' : CONFIG.COLORS.SHIELD_RED;
    const shieldX = 5, shieldY = -4, shieldW = 10, shieldH = 16, shieldR = 2;
    ctx.beginPath();
    ctx.moveTo(shieldX + shieldR, shieldY);
    ctx.lineTo(shieldX + shieldW - shieldR, shieldY);
    ctx.quadraticCurveTo(shieldX + shieldW, shieldY, shieldX + shieldW, shieldY + shieldR);
    ctx.lineTo(shieldX + shieldW, shieldY + shieldH - shieldR);
    ctx.quadraticCurveTo(shieldX + shieldW, shieldY + shieldH, shieldX + shieldW - shieldR, shieldY + shieldH);
    ctx.lineTo(shieldX + shieldR, shieldY + shieldH);
    ctx.quadraticCurveTo(shieldX, shieldY + shieldH, shieldX, shieldY + shieldH - shieldR);
    ctx.lineTo(shieldX, shieldY + shieldR);
    ctx.quadraticCurveTo(shieldX, shieldY, shieldX + shieldR, shieldY);
    ctx.closePath();
    ctx.fill();
    // Gold border
    ctx.strokeStyle = CONFIG.COLORS.GOLD;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Gold dot center, 2px
    ctx.fillStyle = CONFIG.COLORS.GOLD;
    ctx.beginPath();
    ctx.arc(shieldX + shieldW / 2, shieldY + shieldH / 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Sword — 12px silver line with crossguard
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-14, 8);
    ctx.stroke();
    // Crossguard 4px, brown
    ctx.strokeStyle = '#5a3018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7.5, -1.5);
    ctx.lineTo(-4.5, 1.5);
    ctx.stroke();

    ctx.restore();
  }
}

function createTestudo(x, y, speedMultiplier) {
  return {
    type: 'testudo',
    x: x, y: y,
    hp: CONFIG.TESTUDO_HP, maxHp: CONFIG.TESTUDO_HP,
    speed: CONFIG.TESTUDO_SPEED * speedMultiplier,
    alive: true,
    width: CONFIG.TESTUDO_WIDTH, height: CONFIG.TESTUDO_HEIGHT,
    cracks: [],
    flashTimer: 0,
    crumbling: false, crumbleTimer: 0.3,
    dustTimer: 0,
    spawnY: -50,
    pathStartX: x, pathControlX: x, pathEndX: x,
  };
}

function generateCrack(entity) {
  const points = [];
  let x = Math.random() * entity.width * 0.8;
  let y = Math.random() * entity.height * 0.3;
  for (let i = 0; i < 4; i++) {
    x += Math.random() * 15 - 5;
    y += Math.random() * 15 + 5;
    points.push({ x, y });
  }
  entity.cracks.push(points);
}

function renderTestudo(ctx, entity) {
  const scale = entityScale(entity);
  const flashing = entity.flashTimer > 0;
  const w = entity.width * scale;
  const h = entity.height * scale;
  const x0 = entity.x - w / 2;
  const y0 = entity.y - h / 2;

  if (USE_SPRITE.testudo && SPRITES.testudo) {
    ctx.save();
    if (flashing) ctx.filter = 'brightness(1.8)';
    ctx.drawImage(SPRITES.testudo, x0, y0, w, h);
    ctx.restore();
    if (entity.cracks.length > 0) {
      ctx.save();
      ctx.translate(x0, y0);
      ctx.scale(scale, scale);
      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = 3;
      for (const crack of entity.cracks) {
        ctx.beginPath();
        for (let i = 0; i < crack.length; i++) {
          const p = crack[i];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    return;
  }

  // Main red shield body — slightly brighter so gold pops
  ctx.fillStyle = flashing ? '#ffb0a0' : '#a83030';
  ctx.fillRect(x0, y0, w, h);

  // Dark outer border, 3px
  ctx.strokeStyle = '#1a0606';
  ctx.lineWidth = 3;
  ctx.strokeRect(x0, y0, w, h);

  // Grid 3 rows × 5 columns
  ctx.save();
  ctx.translate(x0, y0);
  ctx.scale(scale, scale);
  const innerW = entity.width;
  const innerH = entity.height;
  const cols = 5, rows = 3;
  const cellW = innerW / cols;
  const cellH = innerH / rows;

  // Dark red separators (2px)
  ctx.strokeStyle = '#600000';
  ctx.lineWidth = 2;
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, innerH);
    ctx.stroke();
  }
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(innerW, r * cellH);
    ctx.stroke();
  }

  // Gold decorations: curved wings + vertical line + center dot
  ctx.strokeStyle = CONFIG.COLORS.GOLD;
  ctx.fillStyle = CONFIG.COLORS.GOLD;
  ctx.lineWidth = 1.2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cellW + cellW / 2;
      const cy = r * cellH + cellH / 2;
      const wingW = cellW * 0.32;
      const wingH = cellH * 0.18;
      // Left wing — curved
      ctx.beginPath();
      ctx.moveTo(cx - wingW, cy + wingH * 0.4);
      ctx.quadraticCurveTo(cx - wingW * 0.6, cy - wingH, cx, cy);
      ctx.stroke();
      // Right wing — curved
      ctx.beginPath();
      ctx.moveTo(cx + wingW, cy + wingH * 0.4);
      ctx.quadraticCurveTo(cx + wingW * 0.6, cy - wingH, cx, cy);
      ctx.stroke();
      // Vertical line down the middle
      ctx.beginPath();
      ctx.moveTo(cx, cy - cellH * 0.25);
      ctx.lineTo(cx, cy + cellH * 0.32);
      ctx.stroke();
      // Center dot, 3px
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cracks
  if (entity.cracks.length > 0) {
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 3;
    for (const crack of entity.cracks) {
      ctx.beginPath();
      for (let i = 0; i < crack.length; i++) {
        const p = crack[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function createSiegeTower(x, y, speedMultiplier) {
  return {
    type: 'siegeTower',
    x: x, y: y,
    hp: CONFIG.SIEGE_TOWER_HP, maxHp: CONFIG.SIEGE_TOWER_HP,
    speed: CONFIG.SIEGE_TOWER_SPEED * speedMultiplier,
    alive: true,
    width: CONFIG.SIEGE_TOWER_WIDTH, height: CONFIG.SIEGE_TOWER_HEIGHT,
    scorchMarks: [],
    smoking: false,
    flashTimer: 0,
    crumbling: false, crumbleTimer: 0.4,
    dustTimer: 0,
    spawnY: -90,
    pathStartX: x, pathControlX: x, pathEndX: x,
  };
}

function renderSiegeTower(ctx, entity) {
  const scale = entityScale(entity);
  const flashing = entity.flashTimer > 0;
  const w = entity.width * scale;
  const h = entity.height * scale;
  const x0 = entity.x - w / 2;
  const y0 = entity.y - h / 2;

  if (USE_SPRITE.siegeTower && SPRITES.siegeTower) {
    ctx.save();
    if (flashing) ctx.filter = 'brightness(1.8)';
    ctx.drawImage(SPRITES.siegeTower, x0, y0, w, h);
    ctx.restore();
  } else {
    // Main brown body
    ctx.fillStyle = flashing ? '#d8b078' : '#5a3018';
    ctx.fillRect(x0, y0, w, h);
    // Outer dark border, 3px
    ctx.strokeStyle = '#0a0402';
    ctx.lineWidth = 3;
    ctx.strokeRect(x0, y0, w, h);

    ctx.save();
    ctx.translate(x0, y0);
    ctx.scale(scale, scale);
    const iw = entity.width;
    const ih = entity.height;

    // Wood plank vertical lines every 20px, lighter brown
    ctx.strokeStyle = '#6b4023';
    ctx.lineWidth = 1.2;
    for (let px = 20; px < iw; px += 20) {
      ctx.beginPath();
      ctx.moveTo(px, 4);
      ctx.lineTo(px, ih - 4);
      ctx.stroke();
    }

    // Cross-brace X (darker, 2px)
    ctx.strokeStyle = '#2a1408';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, 6); ctx.lineTo(iw - 6, ih - 6);
    ctx.moveTo(iw - 6, 6); ctx.lineTo(6, ih - 6);
    ctx.stroke();

    // Top platform — darker rect
    const platH = ih * 0.18;
    ctx.fillStyle = '#2a1408';
    ctx.fillRect(6, 6, iw - 12, platH);

    // 4 archers (red dots, 4px each) on platform
    ctx.fillStyle = '#cc3333';
    const archerY = 6 + platH / 2;
    for (let i = 0; i < 4; i++) {
      const ax = 12 + i * ((iw - 24) / 3);
      ctx.beginPath();
      ctx.arc(ax, archerY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wheels — two dark rects on each side, 10×18px
    ctx.fillStyle = '#0a0402';
    ctx.fillRect(-5, ih - 22, 10, 18);
    ctx.fillRect(iw - 5, ih - 22, 10, 18);
    ctx.fillRect(-5, ih - 44, 10, 18);
    ctx.fillRect(iw - 5, ih - 44, 10, 18);

    // Scorch marks — larger
    for (const s of entity.scorchMarks) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = '#0a0a04';
      const sr = Math.max(s.r, 10) + 4;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, sr, sr * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // Smoke (drawn in screen space above the tower)
  if (entity.smoking) {
    ctx.save();
    ctx.fillStyle = '#888';
    ctx.globalAlpha = 0.55;
    const driftT = state.time / 800;
    for (let i = 0; i < 3; i++) {
      const ox = Math.sin(driftT + i * 1.7) * 6 + (i - 1) * 8;
      const oy = -10 - i * 9 + Math.sin(driftT * 1.3 + i) * 2;
      ctx.beginPath();
      ctx.arc(entity.x + ox, y0 + oy, 5 + i * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function renderEntity(ctx, entity) {
  if (entity.type === 'legionary')      renderLegionarySquad(ctx, entity);
  else if (entity.type === 'testudo')   renderTestudo(ctx, entity);
  else if (entity.type === 'siegeTower') renderSiegeTower(ctx, entity);
}

function renderEntities(ctx) {
  // Render back-to-front so closer enemies draw on top
  const sorted = state.entities.filter(e => e.alive).slice().sort((a, b) => a.y - b.y);
  for (const e of sorted) {
    if (e.crumbling) {
      const maxCrumble = e.type === 'siegeTower' ? 0.4 : 0.3;
      const t = Math.max(0, e.crumbleTimer / maxCrumble);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.translate(e.x, e.y);
      ctx.scale(1, t);
      ctx.translate(-e.x, -e.y);
      renderEntity(ctx, e);
      ctx.restore();
    } else {
      renderEntity(ctx, e);
    }
  }
}

// ============ RENDERING — FALLBACK GRAPHICS ============
function renderGround(ctx) {
  if (USE_SPRITE.mosaic_tile && SPRITES.mosaic_tile) {
    // Tile the mosaic texture across the battlefield
    const tile = SPRITES.mosaic_tile;
    const tileSize = 256;
    for (let x = 0; x < gameWidth; x += tileSize) {
      for (let y = 0; y < wallY; y += tileSize) {
        ctx.drawImage(tile, x, y, tileSize, tileSize);
      }
    }
    // Subtle warm gradient overlay (lighter top, warmer toward wall)
    const grad = ctx.createLinearGradient(0, 0, 0, wallY);
    grad.addColorStop(0, 'rgba(180, 150, 100, 0.15)');
    grad.addColorStop(1, 'rgba(120, 80, 40, 0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, gameWidth, wallY);
  } else {
    // Fallback: deeper golden sand with gradient
    const grad = ctx.createLinearGradient(0, 0, 0, wallY);
    grad.addColorStop(0, '#c4a87c');
    grad.addColorStop(1, '#a8884a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, gameWidth, wallY);
  }

  // Sand dune patches — very subtle, just a hint of variation
  ctx.fillStyle = 'rgba(160, 130, 80, 0.08)';
  for (const d of decorations.dunes) {
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny scattered rocks — slightly less prominent
  ctx.fillStyle = 'rgba(74, 40, 8, 0.7)';
  for (const rock of decorations.rocks) {
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderWall(ctx) {
  const wallTop = wallY;
  const totalWallHeight = gameHeight - wallY;

  // 1. SOLID FILL — covers everything, kills any possible white gaps
  ctx.fillStyle = '#3d2414';
  ctx.fillRect(0, wallTop, gameWidth, totalWallHeight);

  // 2. WALKWAY — the top section where ballistae sit
  const walkwayHeightLocal = totalWallHeight * 0.2;
  ctx.fillStyle = '#8a7560';
  ctx.fillRect(0, wallTop, gameWidth, walkwayHeightLocal);

  // Stone block texture on walkway
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  for (let y = wallTop; y < wallTop + walkwayHeightLocal; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(gameWidth, y);
    ctx.stroke();
  }
  const stoneWidth = 35;
  for (let row = 0; row < walkwayHeightLocal / 14; row++) {
    const offset = (row % 2) * stoneWidth / 2;
    for (let x = offset; x < gameWidth; x += stoneWidth) {
      ctx.beginPath();
      ctx.moveTo(x, wallTop + row * 14);
      ctx.lineTo(x, wallTop + (row + 1) * 14);
      ctx.stroke();
    }
  }

  // 3. CRENELLATIONS — battlements along top edge
  const crenWidth = 22;
  const crenHeight = 14;
  const crenGap = 12;
  const crenStep = crenWidth + crenGap;
  ctx.fillStyle = '#6b5040';
  for (let x = crenGap / 2; x < gameWidth; x += crenStep) {
    ctx.fillRect(x, wallTop - crenHeight, crenWidth, crenHeight);
    // Top highlight
    ctx.fillStyle = '#8a7058';
    ctx.fillRect(x, wallTop - crenHeight, crenWidth, 3);
    ctx.fillStyle = '#6b5040';
  }

  // 4. WALL FACE — the tall outer wall below walkway
  const faceTop = wallTop + walkwayHeightLocal;
  const faceHeight = totalWallHeight * 0.35;
  ctx.fillStyle = '#7a6040';
  ctx.fillRect(0, faceTop, gameWidth, faceHeight);

  // Brick texture on wall face
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.8;
  const brickH = 16;
  const brickW = 45;
  for (let row = 0; row < faceHeight / brickH; row++) {
    const y = faceTop + row * brickH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(gameWidth, y);
    ctx.stroke();
    const offset = (row % 2) * brickW / 2;
    for (let x = offset; x < gameWidth; x += brickW) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + brickH);
      ctx.stroke();
    }
  }

  // Darker base at bottom of wall face
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(0, faceTop + faceHeight - 8, gameWidth, 8);

  // 5. CITY ZONE — buildings and palm trees behind the wall
  const cityTop = faceTop + faceHeight;
  const cityHeight = gameHeight - cityTop;

  // City ground
  ctx.fillStyle = '#6b5535';
  ctx.fillRect(0, cityTop, gameWidth, cityHeight);

  // Cobblestone hint
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  for (let y = cityTop; y < gameHeight; y += 10) {
    for (let x = 0; x < gameWidth; x += 12) {
      ctx.strokeRect(x + (Math.floor(y / 10) % 2) * 6, y, 12, 10);
    }
  }

  // Buildings — simple rectangles at fixed intervals
  const buildingColor = ['#8a7558', '#7a6548', '#9a8568', '#6a5538'];
  const buildingPositions = [];
  for (let x = 40; x < gameWidth - 40; x += 120 + Math.sin(x) * 30) {
    buildingPositions.push(x);
  }
  buildingPositions.forEach((bx, i) => {
    const bw = 50 + (i % 3) * 20;
    const bh = 25 + (i % 4) * 10;
    ctx.fillStyle = buildingColor[i % buildingColor.length];
    ctx.fillRect(bx, cityTop + 5, bw, bh);
    // Door
    ctx.fillStyle = '#3d2a18';
    ctx.fillRect(bx + bw / 2 - 4, cityTop + 5 + bh - 12, 8, 12);
    // Window
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(bx + 6, cityTop + 10, 6, 6);
    ctx.fillRect(bx + bw - 12, cityTop + 10, 6, 6);
  });

  // Palm trees — green circle canopy + thin trunk
  const palmPositions = [];
  for (let x = 80; x < gameWidth - 60; x += 160 + Math.cos(x) * 40) {
    palmPositions.push(x);
  }
  palmPositions.forEach(px => {
    // Trunk
    ctx.fillStyle = '#5a4020';
    ctx.fillRect(px - 2, cityTop + 2, 4, 20);
    // Canopy
    ctx.fillStyle = '#3a7a2a';
    ctx.beginPath();
    ctx.arc(px, cityTop + 2, 12, 0, Math.PI * 2);
    ctx.fill();
    // Darker canopy center
    ctx.fillStyle = '#2a5a1a';
    ctx.beginPath();
    ctx.arc(px, cityTop + 2, 7, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ============ PARTICLE SYSTEM ============

function spawnParticle(config) {
  if (state.particles.length >= 200) return;
  state.particles.push({
    x: config.x, y: config.y,
    vx: config.vx || 0, vy: config.vy || 0,
    life: config.life || 0.5, maxLife: config.life || 0.5,
    size: config.size || 3,
    color: config.color || CONFIG.COLORS.DUST,
    alpha: config.alpha != null ? config.alpha : 1,
    type: config.type || 'circle',
    rotation: config.rotation || 0,
    rotationSpeed: config.rotationSpeed || 0,
    growRate: config.growRate || 0,
  });
}

function updateParticles(dt) {
  if (state.particles.length > 200) {
    state.particles.splice(0, state.particles.length - 200);
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.rotation += p.rotationSpeed * dt;
    if (p.growRate) p.size += p.growRate * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function renderParticles(ctx) {
  for (const p of state.particles) {
    const alpha = p.alpha * Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    if (p.type === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.1, p.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function spawnDust(x, y) {
  spawnParticle({
    x, y,
    vx: (Math.random() - 0.5) * 30,
    vy: (Math.random() - 0.5) * 10,
    life: 0.4 + Math.random() * 0.2,
    size: 2 + Math.random() * 2,
    color: CONFIG.COLORS.DUST,
    alpha: 0.3,
  });
}

function spawnImpactBurst(x, y, palette, count) {
  const colors = Array.isArray(palette) ? palette : [palette];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 120;
    spawnParticle({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.2,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: Math.random() < 0.5 ? 'rect' : 'circle',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 10,
    });
  }
}

function spawnWallDebris(x, y) {
  const colors = [CONFIG.COLORS.WALL_DARK, CONFIG.COLORS.WALL_BRICK, CONFIG.COLORS.WALL_STONE, CONFIG.COLORS.SHIELD_RED];
  for (let i = 0; i < 10; i++) {
    spawnParticle({
      x: x + (Math.random() - 0.5) * 40,
      y,
      vx: (Math.random() - 0.5) * 200,
      vy: -100 - Math.random() * 100,
      life: 0.5 + Math.random() * 0.3,
      size: 3 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: 'rect',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 8,
    });
  }
}

function spawnSmoke(x, y) {
  spawnParticle({
    x, y,
    vx: (Math.random() - 0.5) * 20,
    vy: -30 - Math.random() * 30,
    life: 0.8 + Math.random() * 0.4,
    size: 4 + Math.random() * 4,
    color: 'rgb(100,100,100)',
    growRate: 8,
    alpha: 0.4,
  });
}

// ============ JUICE EFFECTS ============

function triggerShake(intensity, duration) {
  state.shake.intensity = Math.max(state.shake.intensity, intensity);
  state.shake.duration = Math.max(state.shake.duration, duration);
}

function updateShake(dt) {
  if (state.shake.duration > 0) {
    state.shake.x = (Math.random() - 0.5) * 2 * state.shake.intensity;
    state.shake.y = (Math.random() - 0.5) * 2 * state.shake.intensity;
    state.shake.duration -= dt;
    state.shake.intensity *= CONFIG.SHAKE_DECAY;
    if (state.shake.duration <= 0 || state.shake.intensity < 0.1) {
      state.shake.duration = 0;
      state.shake.intensity = 0;
      state.shake.x = 0;
      state.shake.y = 0;
    }
  } else {
    state.shake.x = 0;
    state.shake.y = 0;
  }
}

function spawnPopup(text, x, y) {
  state.popups.push({ text, x, y, alpha: 1, scale: 1.0, timer: 0.8, maxTimer: 0.8 });
}

function updatePopups(dt) {
  for (let i = state.popups.length - 1; i >= 0; i--) {
    const p = state.popups[i];
    p.y -= 40 * dt;
    p.scale = Math.min(1.3, p.scale + 0.5 * dt);
    p.timer -= dt;
    p.alpha = Math.max(0, p.timer / p.maxTimer);
    if (p.timer <= 0) state.popups.splice(i, 1);
  }
}

function renderPopups(ctx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px monospace';
  for (const p of state.popups) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale, p.scale);
    ctx.fillStyle = CONFIG.COLORS.FLASH_GOLD;
    ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function entityKillColors(type) {
  if (type === 'siegeTower') return [CONFIG.COLORS.WOOD_LIGHT, CONFIG.COLORS.WOOD_BROWN, '#cc6600'];
  return [CONFIG.COLORS.SHIELD_RED, CONFIG.COLORS.GOLD, CONFIG.COLORS.FLASH_GOLD];
}

function entityCrumbleColor(entity) {
  if (entity.type === 'siegeTower') return CONFIG.COLORS.WOOD_LIGHT;
  return CONFIG.COLORS.SHIELD_RED;
}

function renderShadows(ctx) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  for (const e of state.entities) {
    if (!e.alive || e.crumbling) continue;
    const scale = entityScale(e);
    const widthMult = e.type === 'siegeTower' ? 1.5 : 1;
    const rx = e.width * scale * 0.5 * widthMult;
    const ry = e.height * scale * 0.15;
    const cy = e.y + e.height * scale * 0.5 + 4;
    ctx.beginPath();
    ctx.ellipse(e.x, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateDustTrails(dt) {
  for (const e of state.entities) {
    if (!e.alive || e.crumbling) continue;
    e.dustTimer -= dt;
    if (e.dustTimer > 0) continue;
    e.dustTimer = CONFIG.DUST_INTERVAL / 1000;
    const scale = entityScale(e);
    const baseY = e.y + e.height * scale * 0.5;
    if (e.type === 'legionary') {
      const count = 2 + Math.floor(Math.random() * 2);
      const halfW = e.width * scale * 0.35;
      for (let i = 0; i < count; i++) {
        spawnParticle({
          x: e.x + (Math.random() - 0.5) * halfW * 2,
          y: baseY,
          vx: (Math.random() - 0.5) * 18,
          vy: -3 - Math.random() * 4,
          life: 0.4,
          size: 2 + Math.random(),
          color: CONFIG.COLORS.DUST,
          alpha: 0.35,
        });
      }
    } else if (e.type === 'testudo') {
      const count = 1 + Math.floor(Math.random() * 2);
      const halfW = e.width * scale * 0.3;
      for (let i = 0; i < count; i++) {
        spawnParticle({
          x: e.x + (Math.random() - 0.5) * halfW * 2,
          y: baseY,
          vx: (Math.random() - 0.5) * 18,
          vy: -3 - Math.random() * 4,
          life: 0.4,
          size: 3 + Math.random(),
          color: CONFIG.COLORS.DUST,
          alpha: 0.4,
        });
      }
    } else if (e.type === 'siegeTower') {
      const halfW = e.width * scale * 0.35;
      spawnDust(e.x - halfW, baseY);
      spawnDust(e.x + halfW, baseY);
    }
  }
}

function initAmbientParticles() {
  state.ambientParticles = [];
  for (let i = 0; i < 25; i++) {
    state.ambientParticles.push({
      x: Math.random() * gameWidth,
      y: Math.random() * wallY,
      speed: 10 + Math.random() * 30,
      size: 1 + Math.random(),
      alpha: 0.15 + Math.random() * 0.2,
    });
  }
}

function updateAmbientParticles(dt) {
  for (const p of state.ambientParticles) {
    p.x += p.speed * dt;
    if (p.x > gameWidth) p.x = 0;
  }
}

function renderAmbientParticles(ctx) {
  ctx.fillStyle = CONFIG.COLORS.DUST;
  for (const p of state.ambientParticles) {
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function updateSparkles(dt) {
  state.sparkleTimer -= dt;
  if (state.sparkleTimer <= 0) {
    if (state.sparkles.length < 5 && state.deltaTime <= 20) {
      state.sparkles.push({
        x: Math.random() * gameWidth,
        y: 60 + Math.random() * Math.max(60, wallY - 60),
        alpha: 0,
        phase: 'in',
        timer: 0.15,
      });
    }
    state.sparkleTimer = 0.5 + Math.random() * 0.5;
  }
  for (let i = state.sparkles.length - 1; i >= 0; i--) {
    const s = state.sparkles[i];
    s.timer -= dt;
    if (s.phase === 'in') {
      const t = 1 - Math.max(0, s.timer / 0.15);
      s.alpha = t * 0.6;
      if (s.timer <= 0) { s.phase = 'out'; s.timer = 0.15; }
    } else {
      const t = Math.max(0, s.timer / 0.15);
      s.alpha = t * 0.6;
      if (s.timer <= 0) state.sparkles.splice(i, 1);
    }
  }
}

function renderSparkles(ctx) {
  ctx.fillStyle = CONFIG.COLORS.FLASH_GOLD;
  for (const s of state.sparkles) {
    ctx.globalAlpha = s.alpha;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ============ WAVE SPAWNER ============
let waveSpawnQueue = [];
let waveSpawnTimer = 0;
let betweenWaves = false;
let betweenWaveTimer = 0;

function getLevelConfig(level) {
  const isBoss = level % CONFIG.BOSS_INTERVAL === 0;

  if (isBoss) {
    const bossLevel = level / CONFIG.BOSS_INTERVAL;
    const legCount = 2 + bossLevel;
    const testudoCount = Math.max(0, bossLevel - 1);
    const towerCount = bossLevel >= 4 ? 2 : 1;
    return {
      enemies: [
        ...Array(towerCount).fill('siegeTower'),
        ...Array(testudoCount).fill('testudo'),
        ...Array(legCount).fill('legionary'),
      ],
      speedMultiplier: 1.0 + (bossLevel - 1) * 0.1,
      isBoss: true,
    };
  }

  let legCount, testudoCount, speed;
  if (level === 1) {
    legCount = 3 + Math.floor(Math.random() * 2);
    testudoCount = 0;
    speed = 1.0;
  } else if (level === 2) {
    legCount = 3 + Math.floor(Math.random() * 2);
    testudoCount = 1;
    speed = 1.05;
  } else if (level <= 4) {
    legCount = 3 + Math.floor(Math.random() * 2);
    testudoCount = 1 + Math.floor(Math.random() * 2);
    speed = 1.1;
  } else if (level <= 9) {
    legCount = 4 + Math.floor(Math.random() * 2);
    testudoCount = 1 + Math.floor(Math.random() * 2);
    speed = 1.2;
  } else if (level <= 14) {
    legCount = 5 + Math.floor(Math.random() * 2);
    testudoCount = 2;
    speed = 1.3;
  } else if (level <= 19) {
    legCount = 5 + Math.floor(Math.random() * 3);
    testudoCount = 2 + Math.floor(Math.random() * 2);
    speed = 1.4;
  } else if (level <= 30) {
    legCount = 6 + Math.floor(Math.random() * 3);
    testudoCount = Math.floor(legCount * 0.4);
    speed = 1.5 + (level - 20) * 0.02;
  } else if (level <= 40) {
    legCount = 7 + Math.floor(Math.random() * 4);
    testudoCount = Math.floor(legCount * 0.5);
    speed = 1.8 + (level - 30) * 0.02;
  } else {
    legCount = 8 + Math.floor(Math.random() * 5);
    testudoCount = Math.floor(legCount * 0.6);
    speed = 2.0 + (level - 40) * 0.05;
  }

  return {
    enemies: [
      ...Array(testudoCount).fill('testudo'),
      ...Array(legCount).fill('legionary'),
    ],
    speedMultiplier: speed,
    isBoss: false,
  };
}

function spawnDelayForType(type) {
  if (type === 'siegeTower') return 1.5;
  if (type === 'testudo')    return 0.8;
  return 0.3 + Math.random() * 0.3; // legionary 300-600ms
}

function spawnWave() {
  const cfg = getLevelConfig(state.level);
  const enemies = cfg.enemies.slice();

  // Shuffle so testudos aren't always grouped at the front (but keep siege towers
  // at the very front of boss waves so the dramatic entry leads).
  const towers = enemies.filter(t => t === 'siegeTower');
  const rest   = enemies.filter(t => t !== 'siegeTower');
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const ordered = [...towers, ...rest];

  state.waveEnemiesTotal = ordered.length;
  state.waveEnemiesRemaining = ordered.length;
  state.waveDamage = 0;
  state.currentSpeedMult = cfg.speedMultiplier;

  waveSpawnQueue = ordered.map(type => ({ type, delay: spawnDelayForType(type) }));
  waveSpawnTimer = waveSpawnQueue[0].delay;
}

function spawnEnemyOfType(type) {
  const speedMult = state.currentSpeedMult || (1 + (state.level - 1) * 0.05);
  if (type === 'legionary') {
    const x = gameWidth * (0.1 + Math.random() * 0.8);
    state.entities.push(createLegionarySquad(x, -50, speedMult));
  } else if (type === 'testudo') {
    const x = gameWidth * (0.15 + Math.random() * 0.7);
    state.entities.push(createTestudo(x, -50, speedMult));
  } else if (type === 'siegeTower') {
    state.entities.push(createSiegeTower(gameWidth / 2, -90, speedMult));
  }
}

function updateWaveState(dt) {
  const dtSec = dt / 1000;

  // Stagger out queued spawns
  if (waveSpawnQueue.length > 0) {
    waveSpawnTimer -= dtSec;
    if (waveSpawnTimer <= 0) {
      const next = waveSpawnQueue.shift();
      spawnEnemyOfType(next.type);
      state.waveEnemiesRemaining = Math.max(0, state.waveEnemiesRemaining - 1);
      if (waveSpawnQueue.length > 0) {
        waveSpawnTimer = waveSpawnQueue[0].delay;
      }
    }
  }

  // Pause between waves
  if (betweenWaves) {
    betweenWaveTimer -= dtSec;
    if (betweenWaveTimer <= 0) {
      betweenWaves = false;
      spawnWave();
    }
    return;
  }

  // Wave complete: queue empty, no live enemies, no bolts in flight
  const aliveEnemies = state.entities.filter(e => e.alive && !e.crumbling).length;
  if (state.waveEnemiesTotal > 0 && waveSpawnQueue.length === 0 && aliveEnemies === 0 && state.bolts.length === 0) {
    state.waveEnemiesTotal = 0;

    if (state.waveDamage === 0) {
      const bonus = CONFIG.PERFECT_WAVE_BONUS * state.multiplier;
      state.score += bonus;
      spawnPopup(`PERFECT +${bonus}`, gameWidth / 2, wallY - 40);
    }

    state.wave += 1;
    if (state.wave >= CONFIG.WAVES_PER_LEVEL) {
      state.level += 1;
      state.wave = 0;
      state.waveDamage = 0;
      const nextIsBoss = state.level % CONFIG.BOSS_INTERVAL === 0;
      state.screen = nextIsBoss ? 'BOSS_WARNING' : 'LEVEL_UP';
      AudioManager.play(nextIsBoss ? 'boss_warning' : 'levelup');
    } else {
      betweenWaves = true;
      betweenWaveTimer = CONFIG.WAVE_PAUSE / 1000;
    }
  }
}

function startGame() {
  state.score = 0;
  state.level = 1;
  state.wave = 0;
  state.hearts = CONFIG.MAX_HEARTS;
  state.multiplier = 1;
  state.consecutiveKills = 0;
  state.waveEnemiesTotal = 0;
  state.waveEnemiesRemaining = 0;
  state.waveDamage = 0;
  state.entities = [];
  state.bolts = [];
  state.particles = [];
  state.popups = [];
  state.sparkles = [];
  state.sparkleTimer = 0.7;
  state.collectibles = [];
  state.defenders = [];
  state.powerUps = [null, null, null];
  state.awardedPowerupLevels = [];
  state.pendingPowerupTimer = -1;
  state.fireBoltsTimer = 0;
  state.repairSweepX = -1;
  state.wallFlash = 0;
  state.shake.x = 0; state.shake.y = 0; state.shake.intensity = 0; state.shake.duration = 0;
  waveSpawnQueue = [];
  waveSpawnTimer = 0;
  betweenWaves = false;
  betweenWaveTimer = 0;
  state.leaderboardData = null;
  state.saveStatus = '';
  state.myRank = null;
  state.saveInFlight = false;
  state.scoreSubmitted = false;
  initBallistae();
  spawnWave();
  state.screen = 'PLAYING';
}

// ============ COLLISION ============
function scoreForType(type) {
  if (type === 'testudo') return CONFIG.TESTUDO_SCORE;
  if (type === 'siegeTower') return CONFIG.SIEGE_TOWER_SCORE;
  return CONFIG.LEGIONARY_SCORE;
}

function updateEntities(dt) {
  const dtSec = dt / 1000;

  for (const entity of state.entities) {
    if (!entity.alive) continue;

    if (entity.flashTimer > 0) {
      entity.flashTimer = Math.max(0, entity.flashTimer - dtSec);
    }

    if (entity.crumbling) {
      entity.crumbleTimer -= dtSec;
      const color = entityCrumbleColor(entity);
      const halfW = entity.width * 0.4;
      const halfH = entity.height * 0.4;
      const burst = 2 + Math.floor(Math.random() * 2);
      for (let k = 0; k < burst; k++) {
        spawnParticle({
          x: entity.x + (Math.random() - 0.5) * halfW * 2,
          y: entity.y + (Math.random() - 0.5) * halfH * 2,
          vx: (Math.random() - 0.5) * 80,
          vy: -50 - Math.random() * 80,
          size: 2 + Math.random() * 3,
          color,
          type: 'rect',
          life: 0.4 + Math.random() * 0.3,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 6,
        });
      }
      if (entity.crumbleTimer <= 0) entity.alive = false;
      continue;
    }

    // Advance down the field
    entity.y += entity.speed * dtSec;

    // Bezier path along the descent
    const denom = (wallY - entity.spawnY) || 1;
    const progress = (entity.y - entity.spawnY) / denom;
    const t = Math.max(0, Math.min(1, progress));
    const u = 1 - t;
    entity.x = u * u * entity.pathStartX
             + 2 * u * t * entity.pathControlX
             + t * t * entity.pathEndX;

    // Soldier bobbing + small lateral drift
    if (entity.soldiers) {
      const timeSec = state.time / 1000;
      for (const s of entity.soldiers) {
        s.renderOffsetY = Math.sin(timeSec * CONFIG.BOB_FREQUENCY + s.bobPhase) * CONFIG.BOB_AMPLITUDE;
        s.offsetX += (Math.random() - 0.5) * 0.3;
        if (s.offsetX > 8) s.offsetX = 8;
        else if (s.offsetX < -8) s.offsetX = -8;
      }
    }
  }

  state.entities = state.entities.filter(e => e.alive);
  if (state.entities.length > 50) state.entities.length = 50;
}

function applyHitToEntity(entity, impactX, impactY) {
  entity.hp -= 1;
  entity.flashTimer = 0.05;

  if (entity.hp > 0) {
    if (entity.type === 'testudo') {
      generateCrack(entity);
      triggerShake(2, 0.1);
      spawnImpactBurst(impactX, impactY, entityKillColors('testudo'), 6);
      AudioManager.play('impact_heavy');
    } else if (entity.type === 'siegeTower') {
      entity.scorchMarks.push({
        x: Math.random() * 50 + 10,
        y: Math.random() * 60 + 15,
        r: 5 + Math.random() * 8,
      });
      if (entity.hp <= 2) entity.smoking = true;
      triggerShake(3, 0.15);
      spawnImpactBurst(impactX, impactY, entityKillColors('siegeTower'), 8);
      spawnSmoke(entity.x, entity.y - entity.height * 0.3);
      AudioManager.play('impact_wood');
    } else {
      AudioManager.play('impact_light');
    }
  }

  if (entity.hp <= 0) {
    entity.crumbling = true;
    entity.crumbleTimer = entity.type === 'siegeTower' ? 0.4 : 0.3;

    const baseScore = scoreForType(entity.type);
    const earned = baseScore * state.multiplier;
    state.score += earned;
    state.consecutiveKills += 1;
    if (state.consecutiveKills % 3 === 0 && state.multiplier < 5) {
      state.multiplier += 1;
    }

    spawnPopup(`+${earned}`, entity.x, entity.y);

    if (entity.type === 'siegeTower') {
      spawnImpactBurst(entity.x, entity.y, entityKillColors('siegeTower'), 12);
      triggerShake(8, 0.3);
      AudioManager.play('collapse');
    } else if (entity.type === 'testudo') {
      spawnImpactBurst(entity.x, entity.y, entityKillColors('testudo'), 10);
      triggerShake(4, 0.2);
      AudioManager.play('kill');
    } else {
      spawnImpactBurst(impactX, impactY, entityKillColors('legionary'), 8);
      triggerShake(2, 0.1);
      AudioManager.play('kill');
    }
  }
}

function checkCollisions() {
  // Bolt → Enemy
  for (const bolt of state.bolts) {
    if (!bolt.alive) continue;
    for (const entity of state.entities) {
      if (!entity.alive || entity.crumbling) continue;
      const scale = entityScale(entity);
      const hitRadius = (entity.width / 2) * scale * CONFIG.TAP_RADIUS_MULTIPLIER;
      const d = Math.hypot(bolt.x - entity.x, bolt.y - entity.y);
      if (d < hitRadius) {
        bolt.alive = false;
        const fire = state.fireBoltsTimer > 0;

        // Impact flash circle — small bright dot that swells and fades
        spawnParticle({
          x: bolt.x, y: bolt.y, size: fire ? 2 : 1,
          color: fire ? '#ff6633' : CONFIG.COLORS.FLASH_GOLD,
          life: 0.2, alpha: 0.8, growRate: fire ? 120 : 60,
        });

        if (fire) {
          spawnImpactBurst(bolt.x, bolt.y, ['#e74c3c', '#ff6633', '#ffaa33'], 16);
          // AoE: damage all enemies within 60px of impact (each takes 1 damage independently)
          for (const other of state.entities) {
            if (!other.alive || other.crumbling) continue;
            if (Math.hypot(bolt.x - other.x, bolt.y - other.y) < 60) {
              applyHitToEntity(other, bolt.x, bolt.y);
            }
          }
        } else {
          applyHitToEntity(entity, bolt.x, bolt.y);
        }
        break;
      }
    }
  }

  // Enemy → Wall
  for (const entity of state.entities) {
    if (!entity.alive || entity.crumbling) continue;
    if (entity.y + entity.height / 2 >= wallY) {
      entity.crumbling = true;
      entity.crumbleTimer = entity.type === 'siegeTower' ? 0.4 : 0.3;

      const damage = entity.type === 'siegeTower' ? 2 : 1;
      state.hearts -= damage;
      state.multiplier = 1;
      state.consecutiveKills = 0;
      state.waveDamage += damage;
      state.wallFlash = 0.3;

      const isSiege = entity.type === 'siegeTower';
      triggerShake(isSiege ? 10 : 5, isSiege ? 0.4 : 0.25);
      spawnWallDebris(entity.x, wallY);
      AudioManager.play('wall_hit');
      AudioManager.play('heart_lost');

      if (state.hearts <= 0) {
        state.hearts = 0;
        if (state.score > state.bestScore) {
          state.bestScore = state.score;
          try { localStorage.setItem('palmyra_best', String(state.bestScore)); } catch (e) {}
        }
        AudioManager.play('gameover');
        state.leaderboardData = null;
        state.saveStatus = '';
        state.myRank = null;
        state.scoreSubmitted = false;
        state.saveInFlight = false;
        refreshLeaderboard();
        state.screen = 'GAME_OVER';
      }
    }
  }

  state.bolts = state.bolts.filter(b => b.alive);
}

function renderWallFlash(ctx) {
  if (state.wallFlash > 0) {
    ctx.save();
    const a = Math.min(0.5, (state.wallFlash / 0.3) * 0.5);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(0, wallY - 12, gameWidth, wallHeight + 12);
    ctx.restore();
  }
}

// ============ UI RENDERER ============
function renderHUD(ctx) {
  // Top bar background
  ctx.fillStyle = CONFIG.COLORS.UI_BG;
  ctx.fillRect(0, 0, gameWidth, 50);

  ctx.textBaseline = 'top';

  // Left — score (with optional ×multiplier)
  ctx.textAlign = 'left';
  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.font = '18px monospace';
  const scoreText = state.score.toLocaleString();
  ctx.fillText(scoreText, 20, 16);
  if (state.multiplier > 1) {
    const scoreWidth = ctx.measureText(scoreText).width;
    ctx.fillStyle = '#e67e22';
    ctx.font = '14px monospace';
    ctx.fillText(`×${state.multiplier}`, 20 + scoreWidth + 6, 19);
  }

  // Center — level + wave progress bar
  const cx = gameWidth / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '14px monospace';
  ctx.fillText(`LV ${state.level} / 50`, cx, 8);

  const barW = 80, barH = 4;
  const barX = cx - barW / 2;
  const barY = 24;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = CONFIG.COLORS.WALL_DARK;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.restore();
  const fillW = (state.wave / CONFIG.WAVES_PER_LEVEL) * barW;
  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.fillRect(barX, barY, fillW, barH);

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '10px monospace';
  ctx.fillText(`${state.wave}/${CONFIG.WAVES_PER_LEVEL}`, cx, 32);
  ctx.restore();

  // Right — hearts ending at heartEnd, 20px apart (leaves room for sound toggle)
  ctx.textAlign = 'center';
  ctx.font = '18px monospace';
  const heartEnd = gameWidth - 60;
  for (let n = 1; n <= CONFIG.MAX_HEARTS; n++) {
    const x = heartEnd - (CONFIG.MAX_HEARTS - n) * 20;
    const filled = n <= state.hearts;
    ctx.fillStyle = filled ? CONFIG.COLORS.HEART_RED : CONFIG.COLORS.HEART_GREY;
    ctx.fillText('♥', x, 16);
  }

  // Sound toggle button — far right
  const tb = soundToggleBounds();
  ctx.save();
  ctx.globalAlpha = AudioManager.enabled ? 0.85 : 0.4;
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(AudioManager.enabled ? '🔊' : '🔇', tb.x + tb.w / 2, tb.y + tb.h / 2);
  ctx.restore();

  // Power-up rail — 3 slots stacked at the right edge
  for (let i = 0; i < 3; i++) {
    const px = gameWidth - 50;
    const py = 80 + i * 50;
    const power = state.powerUps[i];

    if (power) {
      // Filled slot with pulsing glow
      const pulse = 0.7 + 0.3 * Math.sin(state.time / 250 + i);

      ctx.save();
      ctx.globalAlpha = pulse * 0.3;
      ctx.fillStyle = power.color;
      ctx.beginPath();
      ctx.arc(px + 20, py + 20, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = power.color;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(px, py, 40, 40, 6);
        ctx.fill();
      } else {
        ctx.fillRect(px, py, 40, 40);
      }
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(power.icon, px + 20, py + 21);
      ctx.restore();
    } else {
      // Empty slot — dim outlined
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = CONFIG.COLORS.UI_TEXT;
      ctx.lineWidth = 1.5;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(px, py, 40, 40, 6);
        ctx.stroke();
      } else {
        ctx.strokeRect(px, py, 40, 40);
      }
      ctx.restore();
    }
  }

  // Fire-bolts countdown bar below the rail
  if (state.fireBoltsTimer > 0) {
    const barX = gameWidth - 50;
    const barY = 80 + 3 * 50 + 4;
    const barW = 40;
    const barH = 4;
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#3a1a0a';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.restore();
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(barX, barY, barW * (state.fireBoltsTimer / 10), barH);
  }
}

// ============ POWER-UPS ============

function spawnPowerUpCollectible() {
  const held = state.powerUps.filter(p => p).map(p => p.id);
  const available = POWERUP_TYPES.filter(t => !held.includes(t.id));
  if (available.length === 0) return;
  const type = available[Math.floor(Math.random() * available.length)];

  state.collectibles.push({
    type: type,
    x: -40,
    y: 60 + Math.random() * Math.max(40, wallY * 0.25),
    speed: 50 + Math.random() * 30,
    alive: true,
    glowPhase: 0,
    lifetime: 10,
  });
}

function updateCollectibles(dt) {
  for (let i = state.collectibles.length - 1; i >= 0; i--) {
    const c = state.collectibles[i];
    c.x += c.speed * dt;
    c.glowPhase += dt * 4;
    c.lifetime -= dt;
    if (c.x > gameWidth + 40 || c.lifetime <= 0) {
      state.collectibles.splice(i, 1);
    }
  }
}

function renderCollectibles(ctx) {
  for (const c of state.collectibles) {
    const pulse = 0.6 + 0.3 * Math.sin(c.glowPhase);

    // Glow halo
    ctx.save();
    ctx.globalAlpha = pulse * 0.35;
    ctx.fillStyle = c.type.color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = c.type.color;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(c.x - 18, c.y - 18, 36, 36, 8);
      ctx.fill();
    } else {
      ctx.fillRect(c.x - 18, c.y - 18, 36, 36);
    }
    ctx.restore();

    // Icon
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.type.icon, c.x, c.y);
    ctx.restore();
  }
}

function activatePowerUp(slotIndex) {
  const power = state.powerUps[slotIndex];
  if (!power) return;
  state.powerUps[slotIndex] = null;
  AudioManager.play('powerup_activate');

  if (power.id === 'WALL_REPAIR') {
    state.hearts = Math.min(state.hearts + 2, CONFIG.MAX_HEARTS);
    state.repairSweepX = 0;
    spawnPopup('+2 ♥', gameWidth / 2, wallY - 30);
  } else if (power.id === 'SORTIE') {
    for (let i = 0; i < 5; i++) {
      const x = gameWidth * (0.2 + (i / 4) * 0.6) + (Math.random() - 0.5) * 30;
      state.defenders.push(createDefender(x));
    }
    spawnPopup('SORTIE!', gameWidth / 2, wallY - 30);
  } else if (power.id === 'FIRE_BOLTS') {
    state.fireBoltsTimer = 10;
    spawnPopup('FIRE BOLTS!', gameWidth / 2, wallY - 30);
  }
}

function createDefender(x) {
  return {
    type: 'defender',
    x: x,
    y: wallY - 10,
    speed: 200,
    target: null,
    alive: true,
    lifetime: 8,
    width: 20,
    height: 25,
  };
}

function updateDefenders(dt) {
  for (let i = state.defenders.length - 1; i >= 0; i--) {
    const d = state.defenders[i];
    d.lifetime -= dt;
    if (d.lifetime <= 0) {
      state.defenders.splice(i, 1);
      continue;
    }

    // Pick the nearest live enemy
    let nearest = null;
    let bestDist = Infinity;
    for (const e of state.entities) {
      if (!e.alive || e.crumbling) continue;
      const dist = Math.hypot(e.x - d.x, e.y - d.y);
      if (dist < bestDist) { bestDist = dist; nearest = e; }
    }

    if (nearest) {
      const dx = nearest.x - d.x;
      const dy = nearest.y - d.y;
      const dist = Math.hypot(dx, dy) || 1;
      d.x += (dx / dist) * d.speed * dt;
      d.y += (dy / dist) * d.speed * dt;

      if (dist < 20) {
        nearest.hp -= 1;
        nearest.flashTimer = 0.05;
        spawnImpactBurst(d.x, d.y, ['#ffe6a8', CONFIG.COLORS.GOLD], 8);
        if (nearest.hp <= 0) {
          nearest.crumbling = true;
          nearest.crumbleTimer = nearest.type === 'siegeTower' ? 0.4 : 0.3;
          const earned = scoreForType(nearest.type) * state.multiplier;
          state.score += earned;
          spawnPopup(`+${earned}`, nearest.x, nearest.y);
        }
        state.defenders.splice(i, 1);
      }
    } else {
      // Walk forward if no enemy
      d.y -= d.speed * dt * 0.5;
      if (d.y < -30) state.defenders.splice(i, 1);
    }
  }
}

function renderDefenders(ctx) {
  for (const d of state.defenders) {
    if (SPRITES.defender) {
      ctx.drawImage(SPRITES.defender, d.x - d.width / 2, d.y - d.height / 2, d.width, d.height);
      continue;
    }

    ctx.save();
    ctx.translate(d.x, d.y);

    // Shadow
    ctx.fillStyle = CONFIG.COLORS.SHADOW;
    ctx.beginPath();
    ctx.ellipse(0, 9, 7, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet — cream/tan
    ctx.fillStyle = '#e8d59a';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff2c8';
    ctx.beginPath();
    ctx.arc(-1, -1.2, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Lighter shield
    ctx.fillStyle = '#c8d8a8';
    ctx.fillRect(4, -3, 6, 10);
    ctx.fillStyle = CONFIG.COLORS.GOLD;
    ctx.fillRect(7, -1, 0.8, 6);

    // Spear pointing up
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-4, -10);
    ctx.stroke();
    // Spear tip
    ctx.fillStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.lineTo(-6, -9);
    ctx.lineTo(-2, -9);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

function updatePowerUpsState(dt) {
  // Pending power-up reward spawn
  if (state.pendingPowerupTimer > 0) {
    state.pendingPowerupTimer -= dt;
    if (state.pendingPowerupTimer <= 0) {
      spawnPowerUpCollectible();
      state.awardedPowerupLevels.push(state.level);
      state.pendingPowerupTimer = -1;
    }
  }

  if (state.fireBoltsTimer > 0) {
    state.fireBoltsTimer = Math.max(0, state.fireBoltsTimer - dt);
  }

  if (state.repairSweepX >= 0) {
    state.repairSweepX += gameWidth / 0.5 * dt;
    if (state.repairSweepX > gameWidth) state.repairSweepX = -1;
  }
}

function renderRepairSweep(ctx) {
  if (state.repairSweepX < 0) return;
  ctx.save();
  const grad = ctx.createLinearGradient(state.repairSweepX - 30, 0, state.repairSweepX + 30, 0);
  grad.addColorStop(0, 'rgba(255,215,0,0)');
  grad.addColorStop(0.5, 'rgba(255,235,150,0.85)');
  grad.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(state.repairSweepX - 30, wallY - 12, 60, wallHeight + 12);
  ctx.restore();
}

// ============ BRIEFING ============
const BRIEFING_PAGES = [
  { subtitle: 'YOUR WEAPONS',       title: 'THE BALLISTAE',  body: 'Tap any enemy to fire. Your wall-mounted ballistae do the rest. The closer the enemy, the less time you have.', color: '#daa520' },
  { subtitle: 'KNOW YOUR ENEMY',    title: 'THE LEGIONS',    body: 'Roman soldiers march in squads — one hit destroys them. Shield formations require multiple strikes to break through.', color: '#b5452a' },
  { subtitle: 'ENEMY SIEGE REPORT', title: 'THREAT WARNING', body: 'Every 5 waves, a siege tower approaches. These armored giants require multiple direct hits. Prepare the ballistae.', color: '#e67e22' },
  { subtitle: 'MISSION OBJECTIVE',  title: 'DEFEND PALMYRA', body: 'The desert wind carries the sound of Roman drums. Man the ballistae. Stop every Roman. Leave nothing to chance.', color: '#4ecdc4' },
];

function renderBriefing(ctx) {
  ctx.fillStyle = '#1a0a04';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  const page = BRIEFING_PAGES[state.briefingPage];
  const cx = gameWidth / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Page dots near top
  const dotsY = gameHeight * 0.15;
  const dotSpacing = 18;
  const dotsTotal = BRIEFING_PAGES.length;
  const dotsStartX = cx - ((dotsTotal - 1) * dotSpacing) / 2;
  for (let i = 0; i < dotsTotal; i++) {
    ctx.beginPath();
    ctx.arc(dotsStartX + i * dotSpacing, dotsY, 5, 0, Math.PI * 2);
    if (i === state.briefingPage) {
      ctx.fillStyle = page.color;
      ctx.fill();
    } else {
      ctx.strokeStyle = page.color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Subtitle
  ctx.fillStyle = page.color;
  ctx.font = '14px monospace';
  ctx.fillText(page.subtitle, cx, gameHeight * 0.3);

  // Title
  ctx.font = 'bold 32px monospace';
  ctx.fillText(page.title, cx, gameHeight * 0.38);

  // Decorative line
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = page.color;
  ctx.fillRect(cx - 40, gameHeight * 0.42, 80, 2);
  ctx.restore();

  // Body
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '16px serif';
  const lines = wrapText(ctx, page.body, gameWidth * 0.7);
  let by = gameHeight * 0.48;
  for (const line of lines) {
    ctx.fillText(line, cx, by);
    by += 22;
  }

  // Buttons at bottom
  const btnY = gameHeight * 0.78;
  const isLast = state.briefingPage >= BRIEFING_PAGES.length - 1;

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SKIP', gameWidth * 0.15, btnY);
  ctx.restore();

  ctx.fillStyle = page.color;
  ctx.font = isLast ? 'bold 18px monospace' : 'bold 16px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(isLast ? '⚡ LAUNCH DEFENSE' : 'NEXT →', gameWidth * 0.85, btnY);
}

// ============ AUDIO ============
const AudioManager = {
  sounds: {},
  enabled: true,
  initialized: false,

  init() {
    if (this.initialized) return;
    const files = {
      fire: 'assets/audio/fire.mp3',
      impact_light: 'assets/audio/impact_light.mp3',
      impact_heavy: 'assets/audio/impact_heavy.mp3',
      impact_wood: 'assets/audio/impact_wood.mp3',
      wall_hit: 'assets/audio/wall_hit.mp3',
      kill: 'assets/audio/kill.mp3',
      collapse: 'assets/audio/collapse.mp3',
      powerup_collect: 'assets/audio/powerup_collect.mp3',
      powerup_activate: 'assets/audio/powerup_activate.mp3',
      levelup: 'assets/audio/levelup.mp3',
      boss_warning: 'assets/audio/boss_warning.mp3',
      heart_lost: 'assets/audio/heart_lost.mp3',
      gameover: 'assets/audio/gameover.mp3',
    };
    for (const [key, src] of Object.entries(files)) {
      try {
        const audio = new Audio();
        audio.src = src;
        audio.preload = 'auto';
        audio.volume = 0.5;
        this.sounds[key] = audio;
      } catch (e) {}
    }
    try {
      const stored = localStorage.getItem('palmyra_audio');
      if (stored === '0') this.enabled = false;
    } catch (e) {}
    this.initialized = true;
  },

  play(name) {
    if (!this.enabled) return;
    if (!this.initialized) this.init();
    const s = this.sounds[name];
    if (!s) return;
    try {
      if (s.currentTime > 0 && !s.ended) {
        const clone = s.cloneNode();
        clone.volume = s.volume;
        clone.play().catch(() => {});
        return;
      }
      s.currentTime = 0;
      s.play().catch(() => {});
    } catch (e) {}
  },

  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem('palmyra_audio', this.enabled ? '1' : '0'); } catch (e) {}
    return this.enabled;
  }
};

// ============ LEADERBOARD API ============
const API_BASE = '/api';

async function submitScore(callsign, score, level) {
  try {
    const resp = await fetch(API_BASE + '/score/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callsign, score, level }),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.warn('Score submit failed:', e);
    return null;
  }
}

async function getLeaderboard() {
  try {
    const resp = await fetch(API_BASE + '/leaderboard/');
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.leaderboard || [];
  } catch (e) {
    console.warn('Leaderboard fetch failed:', e);
    return [];
  }
}

async function refreshLeaderboard() {
  const data = await getLeaderboard();
  state.leaderboardData = data;
}

async function trySubmitAndRefresh() {
  if (!state.callsign || state.saveInFlight || state.scoreSubmitted) return;
  state.saveInFlight = true;
  state.saveStatus = 'Saving...';
  const result = await submitScore(state.callsign, state.score, state.level);
  state.saveInFlight = false;
  if (result && typeof result.rank === 'number') {
    state.myRank = result.rank;
    state.saveStatus = `Saved! Rank #${result.rank}`;
    state.scoreSubmitted = true;
  } else if (result) {
    state.saveStatus = 'Saved!';
    state.scoreSubmitted = true;
  } else {
    state.saveStatus = 'Save failed';
  }
  refreshLeaderboard();
}

// ============ BALLISTAE ============
function ballistaPosition(i) {
  return {
    x: (gameWidth / (CONFIG.BALLISTA_COUNT + 1)) * (i + 1),
    y: wallY + walkwayHeight / 3,
  };
}

function initBallistae() {
  state.ballistae = Array.from({length: CONFIG.BALLISTA_COUNT}, (_, i) => {
    const pos = ballistaPosition(i);
    return { x: pos.x, y: pos.y, cooldownUntil: 0, recoilTimer: 0 };
  });
}

function repositionBallistae() {
  for (let i = 0; i < state.ballistae.length; i++) {
    const pos = ballistaPosition(i);
    state.ballistae[i].x = pos.x;
    state.ballistae[i].y = pos.y;
  }
}

function updateBallistae(dt) {
  for (const b of state.ballistae) {
    if (b.recoilTimer > 0) b.recoilTimer = Math.max(0, b.recoilTimer - dt);
  }
}

function renderBallista(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);

  const recoilScale = b.recoilTimer > 0 ? 0.85 : 1.0;
  ctx.scale(recoilScale, recoilScale);

  ctx.fillStyle = '#5a3820';
  ctx.fillRect(-18, -4, 36, 12);
  ctx.fillStyle = '#6b4830';
  ctx.fillRect(-16, -3, 32, 4);

  ctx.strokeStyle = '#3d2414';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.quadraticCurveTo(-18, -18, -14, -28);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(10, -2);
  ctx.quadraticCurveTo(18, -18, 14, -28);
  ctx.stroke();

  ctx.fillStyle = '#888';
  ctx.beginPath();
  ctx.arc(-14, -28, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14, -28, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-14, -28);
  ctx.lineTo(14, -28);
  ctx.stroke();

  ctx.fillStyle = '#4a2a14';
  ctx.fillRect(-2, -24, 4, 22);

  if (b.recoilTimer <= 0) {
    ctx.fillStyle = '#c4a035';
    ctx.fillRect(-1.5, -30, 3, 14);
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(-3, -30);
    ctx.lineTo(3, -30);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#2a1a0a';
  ctx.beginPath();
  ctx.arc(-20, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(20, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a3a2a';
  ctx.beginPath();
  ctx.arc(-20, 4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(20, 4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function createBolt(fromX, fromY, targetX, targetY) {
  return {
    x: fromX, y: fromY,
    targetX: targetX, targetY: targetY,
    speed: CONFIG.BOLT_SPEED,
    trail: [{x: fromX, y: fromY}],
    alive: true,
  };
}

function fireBoltFromNearest(targetX, targetY) {
  const now = Date.now();
  let nearest = null;
  let bestDist = Infinity;
  for (const b of state.ballistae) {
    if (now < b.cooldownUntil) continue;
    const d = Math.hypot(b.x - targetX, b.y - targetY);
    if (d < bestDist) {
      bestDist = d;
      nearest = b;
    }
  }
  if (!nearest) return false;
  state.bolts.push(createBolt(nearest.x, nearest.y, targetX, targetY));
  nearest.cooldownUntil = now + CONFIG.BALLISTA_COOLDOWN;
  nearest.recoilTimer = 150;
  spawnParticle({
    x: nearest.x,
    y: nearest.y - 30,
    size: 4,
    color: '#ffd700',
    life: 0.15,
    alpha: 0.9,
    growRate: 40,
    vx: 0,
    vy: 0,
  });
  AudioManager.play('fire');
  return true;
}

function updateBolts(dt) {
  const dtSec = dt / 1000;
  for (const bolt of state.bolts) {
    const dx = bolt.targetX - bolt.x;
    const dy = bolt.targetY - bolt.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 5) { bolt.alive = false; continue; }
    const move = bolt.speed * dtSec;
    bolt.x += (dx / dist) * move;
    bolt.y += (dy / dist) * move;
    bolt.trail.unshift({x: bolt.x, y: bolt.y});
    if (bolt.trail.length > 6) bolt.trail.length = 6;
    if (bolt.y < -100 || bolt.y > gameHeight + 100) bolt.alive = false;
  }
  state.bolts = state.bolts.filter(b => b.alive);
  if (state.bolts.length > 20) state.bolts.length = 20;
}

function renderBolts(ctx) {
  const fire = state.fireBoltsTimer > 0;
  const trailColor = fire ? '#ff5522' : CONFIG.COLORS.BOLT_GOLD;
  const bodyColor  = fire ? '#ff8833' : CONFIG.COLORS.BOLT_GOLD;
  const dotColor   = fire ? '#ffdd33' : CONFIG.COLORS.FLASH_GOLD;

  for (const bolt of state.bolts) {
    const dx = bolt.targetX - bolt.x;
    const dy = bolt.targetY - bolt.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Trail: oldest → newest, fading & narrowing
    ctx.lineCap = 'round';
    ctx.strokeStyle = trailColor;
    for (let i = 0; i < bolt.trail.length - 1; i++) {
      const a = bolt.trail[i];
      const b = bolt.trail[i + 1];
      const t = i / Math.max(1, bolt.trail.length - 1);
      ctx.globalAlpha = Math.max(0.1, 1.0 - t * 0.9);
      ctx.lineWidth = Math.max(1, 3 - t * 2);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Bolt body — 3px gold line ~15px long along travel direction
    const tipX = bolt.x + dirX * 7.5;
    const tipY = bolt.y + dirY * 7.5;
    const tailX = bolt.x - dirX * 7.5;
    const tailY = bolt.y - dirY * 7.5;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Arrowhead at tip
    const perpX = -dirY;
    const perpY = dirX;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(tipX + dirX * 4, tipY + dirY * 4);
    ctx.lineTo(tipX + perpX * 3, tipY + perpY * 3);
    ctx.lineTo(tipX - perpX * 3, tipY - perpY * 3);
    ctx.closePath();
    ctx.fill();

    // Bright dot for visibility
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============ SCREENS ============
function renderTitle(ctx) {
  ctx.fillStyle = '#1a0a04';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  // Dimmed desert + wall for atmosphere
  ctx.save();
  ctx.globalAlpha = 0.3;
  renderGround(ctx);
  renderWall(ctx);
  for (const b of state.ballistae) renderBallista(ctx, b);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const cx = gameWidth / 2;
  const titleY = gameHeight * 0.35;

  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.font = 'bold 52px serif';
  ctx.fillText('PALMYRA', cx, titleY);

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '26px serif';
  ctx.fillText('272 AD', cx, titleY + 50);
  ctx.globalAlpha = 1;

  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.fillRect(cx - 50, titleY + 68, 100, 2);

  if (state.bestScore > 0) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
    ctx.font = '16px monospace';
    ctx.fillText(`BEST: ${state.bestScore.toLocaleString()}`, cx, titleY + 96);
    ctx.restore();
  }

  // Smoother breathing pulse using cosine-eased sine
  const raw = Math.sin(state.time / 600);
  const pulse = 0.5 + 0.5 * raw;
  const eased = pulse * pulse * (3 - 2 * pulse);
  ctx.globalAlpha = 0.45 + 0.55 * eased;
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '28px serif';
  ctx.fillText('TAP TO PLAY', cx, gameHeight * 0.62);
  ctx.globalAlpha = 1;
}

function renderOverlayPlaceholder(ctx, label) {
  ctx.fillStyle = 'rgba(20, 10, 4, 0.75)';
  ctx.fillRect(0, 0, gameWidth, gameHeight);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '32px serif';
  ctx.fillText(label, gameWidth / 2, gameHeight / 2);
}

function difficultyLabel(level) {
  if (level <= 5)  return 'Skirmish';
  if (level <= 10) return 'Assault';
  if (level <= 15) return 'Siege';
  if (level <= 20) return 'Onslaught';
  if (level <= 25) return 'Fury';
  if (level <= 30) return "Aurelian's Wrath";
  if (level <= 40) return 'Merciless';
  return 'Impossible';
}

function renderLevelUp(ctx) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  const cx = gameWidth / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.font = '20px monospace';
  ctx.fillText('◆ LEVEL UP ◆', cx, gameHeight * 0.3);

  ctx.fillStyle = '#4ecdc4';
  ctx.font = 'bold 72px monospace';
  ctx.fillText(String(state.level), cx, gameHeight * 0.42);

  ctx.fillStyle = '#ffffff';
  ctx.font = '24px monospace';
  ctx.fillText(difficultyLabel(state.level), cx, gameHeight * 0.5);

  const pulse = 0.5 + 0.5 * Math.sin(state.time / 400);
  ctx.globalAlpha = 0.4 + 0.6 * pulse;
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '20px serif';
  ctx.fillText('TAP TO CONTINUE', cx, gameHeight * 0.6);
  ctx.globalAlpha = 1;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function renderBossWarning(ctx) {
  ctx.fillStyle = 'rgba(30, 15, 0, 0.8)';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  const cx = gameWidth / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffb84d';
  ctx.font = '16px monospace';
  ctx.fillText('ENEMY SIEGE REPORT', cx, gameHeight * 0.28);

  ctx.fillStyle = '#ffb84d';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('THREAT WARNING', cx, gameHeight * 0.36);

  ctx.fillStyle = '#f0e6d0';
  ctx.font = '16px serif';
  const body = 'A siege tower approaches the walls. These armored giants require multiple direct hits. Prepare the ballistae.';
  const lines = wrapText(ctx, body, gameWidth * 0.7);
  let y = gameHeight * 0.46;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += 22;
  }

  const pulse = 0.5 + 0.5 * Math.sin(state.time / 400);
  ctx.globalAlpha = 0.4 + 0.6 * pulse;
  ctx.fillStyle = '#ffb84d';
  ctx.font = '20px serif';
  ctx.fillText('TAP TO DEFEND', cx, gameHeight * 0.6);
  ctx.globalAlpha = 1;
}

function renderPaused(ctx)     { renderOverlayPlaceholder(ctx, 'PAUSED — tap to resume'); }

function soundToggleBounds() {
  const w = 36, h = 36;
  return { x: gameWidth - w - 6, y: 7, w, h };
}

function gameOverButtons() {
  const cx = gameWidth / 2;
  const inputW = 250, inputH = 36;
  const shareW = Math.min(gameWidth * 0.7, 360), shareH = 44;
  const btnW = (shareW - 12) / 2, btnH = 40;

  const callsignY = gameHeight * 0.34;
  const shareY    = gameHeight * 0.44;
  const buttonsY  = gameHeight * 0.87;

  return {
    callsign: { x: cx - inputW / 2, y: callsignY, w: inputW, h: inputH },
    share:    { x: cx - shareW / 2, y: shareY,    w: shareW, h: shareH },
    again:    { x: cx - shareW / 2,                y: buttonsY, w: btnW, h: btnH },
    menu:     { x: cx - shareW / 2 + btnW + 12,    y: buttonsY, w: btnW, h: btnH },
  };
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }
}

function renderGameOver(ctx) {
  ctx.fillStyle = 'rgba(20, 10, 4, 0.85)';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = gameWidth / 2;
  const titleY = gameHeight * 0.10;
  const scoreY = gameHeight * 0.18;

  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.font = 'bold 44px serif';
  ctx.fillText('GAME OVER', cx, titleY);

  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.fillRect(cx - 60, titleY + 28, 120, 2);

  // Battle report
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '20px monospace';
  ctx.fillText(`Score    ${state.score.toLocaleString()}`, cx, scoreY);
  ctx.fillText(`Level    ${state.level}`, cx, scoreY + 28);
  ctx.fillText(`Best     ${state.bestScore.toLocaleString()}`, cx, scoreY + 56);

  const b = gameOverButtons();

  // Callsign label
  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.font = '14px monospace';
  ctx.fillText('YOUR CALLSIGN', cx, b.callsign.y - 14);

  // Callsign input rect
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  drawRoundedRect(ctx, b.callsign.x, b.callsign.y, b.callsign.w, b.callsign.h, 8);
  ctx.fill();
  ctx.strokeStyle = CONFIG.COLORS.UI_TEXT;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, b.callsign.x, b.callsign.y, b.callsign.w, b.callsign.h, 8);
  ctx.stroke();
  ctx.restore();

  if (state.callsign) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(`${state.callsign} ✓`, cx, b.callsign.y + b.callsign.h / 2);
  } else {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
    ctx.font = '14px monospace';
    ctx.fillText('Tap to enter…', cx, b.callsign.y + b.callsign.h / 2);
    ctx.restore();
  }

  // Save status (between callsign and share button)
  if (state.saveStatus) {
    ctx.save();
    ctx.fillStyle = state.saveStatus === 'Save failed' ? '#cc6666' : CONFIG.COLORS.UI_GOLD;
    ctx.font = '13px monospace';
    ctx.fillText(state.saveStatus, cx, b.callsign.y + b.callsign.h + 14);
    ctx.restore();
  }

  // WhatsApp share button
  ctx.fillStyle = '#25D366';
  drawRoundedRect(ctx, b.share.x, b.share.y, b.share.w, b.share.h, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('Share on WhatsApp 💬', cx, b.share.y + b.share.h / 2);

  // Leaderboard — top 10
  renderLeaderboardPanel(ctx, b);

  // Play Again
  ctx.fillStyle = '#4ecdc4';
  drawRoundedRect(ctx, b.again.x, b.again.y, b.again.w, b.again.h, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('PLAY AGAIN', b.again.x + b.again.w / 2, b.again.y + b.again.h / 2);

  // Main Menu
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = CONFIG.COLORS.UI_TEXT;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, b.menu.x, b.menu.y, b.menu.w, b.menu.h, 8);
  ctx.stroke();
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = 'bold 14px monospace';
  ctx.fillText('MAIN MENU', b.menu.x + b.menu.w / 2, b.menu.y + b.menu.h / 2);
  ctx.restore();
}

function renderLeaderboardPanel(ctx, b) {
  const cx = gameWidth / 2;
  const headerY = b.share.y + b.share.h + 24;
  const panelW = Math.min(gameWidth * 0.8, 380);
  const panelX = cx - panelW / 2;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.font = 'bold 18px monospace';
  ctx.fillText('🏆 TOP 100 GLOBAL', cx, headerY);
  ctx.restore();

  const data = state.leaderboardData;

  if (data === null) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading…', cx, headerY + 24);
    ctx.restore();
    return;
  }

  if (!Array.isArray(data) || data.length === 0) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Leaderboard unavailable', cx, headerY + 24);
    ctx.restore();
    return;
  }

  const rows = data.slice(0, 10);
  const rowH = 16;
  const startY = headerY + 18;
  const maxBottom = b.again.y - 12;
  const visibleRows = Math.max(3, Math.min(rows.length, Math.floor((maxBottom - startY) / rowH)));

  ctx.save();
  ctx.font = '13px monospace';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < visibleRows; i++) {
    const entry = rows[i];
    const rowY = startY + i * rowH;
    const isMe = state.myRank && entry.rank === state.myRank
      && entry.callsign === state.callsign && entry.score === state.score;

    if (isMe) {
      ctx.save();
      ctx.fillStyle = 'rgba(218, 165, 32, 0.18)';
      ctx.fillRect(panelX, rowY - rowH / 2 + 1, panelW, rowH - 2);
      ctx.restore();
    }

    const rankColor = entry.rank <= 3 ? CONFIG.COLORS.UI_GOLD : CONFIG.COLORS.UI_TEXT;
    ctx.fillStyle = rankColor;
    ctx.textAlign = 'left';
    ctx.fillText(`#${entry.rank}`, panelX + 10, rowY);

    ctx.fillStyle = isMe ? '#ffffff' : CONFIG.COLORS.UI_TEXT;
    ctx.textAlign = 'left';
    const callsign = (entry.callsign || '').substring(0, 14);
    ctx.fillText(callsign, panelX + 60, rowY);

    ctx.fillStyle = isMe ? '#ffffff' : CONFIG.COLORS.UI_GOLD;
    ctx.textAlign = 'right';
    ctx.fillText((entry.score || 0).toLocaleString(), panelX + panelW - 10, rowY);
  }
  ctx.restore();
}

function renderBorderFrame(ctx) {
  if (SPRITES.borderFrame) {
    ctx.drawImage(SPRITES.borderFrame, 0, 0, gameWidth, gameHeight);
    return;
  }

  const bw = 6;

  ctx.save();
  ctx.strokeStyle = '#8b3a2a';
  ctx.lineWidth = bw;
  ctx.strokeRect(bw / 2, bw / 2, gameWidth - bw, gameHeight - bw);

  ctx.strokeStyle = '#6b2a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(bw + 2, bw + 2, gameWidth - bw * 2 - 4, gameHeight - bw * 2 - 4);

  const cs = 10;
  ctx.fillStyle = '#8b3a2a';
  [
    [bw, bw],
    [gameWidth - bw - cs, bw],
    [bw, gameHeight - bw - cs],
    [gameWidth - bw - cs, gameHeight - bw - cs],
  ].forEach(([x, y]) => {
    ctx.fillRect(x, y, cs, cs);
  });
  ctx.restore();
}

function renderPlaying(ctx) {
  ctx.save();

  const hasTower = state.entities.some(e => e.type === 'siegeTower' && e.alive && !e.crumbling);
  const towerVibe = hasTower ? Math.sin(state.time / 1000 * 3) * 1 : 0;
  ctx.translate(state.shake.x + towerVibe, state.shake.y);

  renderGround(ctx);
  renderAmbientParticles(ctx);
  renderSparkles(ctx);
  renderShadows(ctx);
  renderEntities(ctx);
  renderDefenders(ctx);
  renderBolts(ctx);
  renderParticles(ctx);
  renderCollectibles(ctx);
  renderWall(ctx);
  renderWallFlash(ctx);
  renderRepairSweep(ctx);
  for (const b of state.ballistae) renderBallista(ctx, b);
  renderPopups(ctx);

  ctx.restore();

  renderHUD(ctx);
}

// ============ MAIN LOOP ============
function update(dt) {
  state.time += dt;
  const dtSec = dt / 1000;

  // Ambient atmosphere keeps drifting on every screen so the world feels alive
  updateAmbientParticles(dtSec);

  if (state.screen === 'PLAYING' && !state.paused) {
    updateBallistae(dt);
    updateBolts(dt);
    updateEntities(dt);
    updateDefenders(dtSec);
    checkCollisions();
    updateWaveState(dt);
    updateDustTrails(dtSec);
    updateShake(dtSec);
    updateParticles(dtSec);
    updatePopups(dtSec);
    updateSparkles(dtSec);
    updateCollectibles(dtSec);
    updatePowerUpsState(dtSec);
    if (state.wallFlash > 0) {
      state.wallFlash = Math.max(0, state.wallFlash - dtSec);
    }
  }
}

function renderCrosshair(ctx) {
  if (state.screen !== 'PLAYING') return;
  if (isTouchDevice) return;
  if (mouseX < 0 || mouseY < 0) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const size = 15;
  ctx.beginPath();
  ctx.moveTo(mouseX - size, mouseY);
  ctx.lineTo(mouseX - 5, mouseY);
  ctx.moveTo(mouseX + 5, mouseY);
  ctx.lineTo(mouseX + size, mouseY);
  ctx.moveTo(mouseX, mouseY - size);
  ctx.lineTo(mouseX, mouseY - 5);
  ctx.moveTo(mouseX, mouseY + 5);
  ctx.lineTo(mouseX, mouseY + size);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render() {
  ctx.fillStyle = '#1a0a04';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  switch (state.screen) {
    case 'TITLE':         renderTitle(ctx); break;
    case 'BRIEFING':      renderBriefing(ctx); break;
    case 'PLAYING':       renderPlaying(ctx); break;
    case 'LEVEL_UP':      renderPlaying(ctx); renderLevelUp(ctx); break;
    case 'BOSS_WARNING':  renderPlaying(ctx); renderBossWarning(ctx); break;
    case 'GAME_OVER':     renderPlaying(ctx); renderGameOver(ctx); break;
    case 'PAUSED':        renderPlaying(ctx); renderPaused(ctx); break;
    default:              renderTitle(ctx);
  }

  renderBorderFrame(ctx);
  renderCrosshair(ctx);
}

function gameLoop(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  let dt = timestamp - state.lastTime;
  state.lastTime = timestamp;
  if (dt > 50) dt = 50;
  state.deltaTime = dt;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// ============ INIT ============
function init() {
  resize();

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handleInput(e.clientX, e.clientY);
  });
  canvas.addEventListener('mousemove', (e) => {
    const coords = getGameCoords(e.clientX, e.clientY);
    mouseX = coords.x;
    mouseY = coords.y;
  });
  canvas.addEventListener('mouseleave', () => {
    mouseX = -100;
    mouseY = -100;
  });
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches && e.touches.length) {
      handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('dblclick', (e) => e.preventDefault());
  canvas.addEventListener('gesturestart', (e) => e.preventDefault());

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  try { state.bestScore = parseInt(localStorage.getItem('palmyra_best') || '0'); } catch(e) {}
  initAssets();
  requestAnimationFrame(gameLoop);
}
document.addEventListener('DOMContentLoaded', init);
