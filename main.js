// ============ CONFIG ============
const CONFIG = {
  MAX_HEARTS: 5,
  BALLISTA_COUNT: 4,
  BALLISTA_COOLDOWN: 400,
  BOLT_SPEED: 2500,
  LEGIONARY_SPEED: 140, LEGIONARY_HP: 1, LEGIONARY_SQUAD_SIZE: 5,
  TESTUDO_SPEED: 80, TESTUDO_HP: 3, TESTUDO_WIDTH: 60, TESTUDO_HEIGHT: 48,
  SIEGE_TOWER_SPEED: 55, SIEGE_TOWER_HP: 5, SIEGE_TOWER_WIDTH: 70, SIEGE_TOWER_HEIGHT: 90,
  LEGIONARY_SCORE: 100, TESTUDO_SCORE: 300, SIEGE_TOWER_SCORE: 500,
  PERFECT_WAVE_BONUS: 200, BOSS_CLEAR_BONUS: 1000,
  BOB_AMPLITUDE: 2.5, BOB_FREQUENCY: 6, DUST_INTERVAL: 100,
  SHAKE_DECAY: 0.9, SCALE_MIN: 0.7, SCALE_MAX: 1.0,
  WAVES_PER_LEVEL: 10, WAVE_PAUSE: 2000, MAX_LEVEL: 50, BOSS_INTERVAL: 5,
  TAP_RADIUS_MULTIPLIER: 1.2,
  COLORS: {
    GROUND: '#e8dcc8', GROUND_DARK: '#d4c4a8',
    WALL_STONE: '#c4a87c', WALL_DARK: '#8a7560', WALL_BRICK: '#a08060',
    SHIELD_RED: '#b5452a', GOLD: '#c4a035',
    BOLT_GOLD: '#daa520', FLASH_GOLD: '#ffd700',
    WOOD_BROWN: '#4a2a12', WOOD_LIGHT: '#6b4423',
    HEART_RED: '#cc3333', HEART_GREY: '#555555',
    UI_BG: 'rgba(20, 10, 4, 0.75)', UI_TEXT: '#f0e6d0', UI_GOLD: '#daa520',
    DUST: '#b09870', SHADOW: 'rgba(0,0,0,0.15)', CREST_RED: '#8b2020',
  }
};

// ============ GAME STATE ============
const state = {
  screen: 'TITLE',
  score: 0, bestScore: 0, level: 1, wave: 0,
  hearts: CONFIG.MAX_HEARTS, multiplier: 1, consecutiveKills: 0,
  waveEnemiesTotal: 0, waveEnemiesRemaining: 0, waveDamage: 0,
  entities: [], bolts: [], particles: [], popups: [],
  ballistae: [], powerUps: [null, null, null], collectibles: [],
  shake: { x: 0, y: 0, intensity: 0, duration: 0 },
  ambientParticles: [], wallFlash: 0,
  time: 0, deltaTime: 0, lastTime: 0,
  firstPlay: true, paused: false, fireBoltsTimer: 0,
};

// ============ CANVAS SETUP ============
let canvas, ctx;
let gameWidth, gameHeight;
let wallY;
let wallHeight, walkwayHeight;
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
  // Prompt 2: no enemies yet — fire toward whatever was tapped.
  // Later prompts will pick the nearest enemy first.
  fireBoltFromNearest(x, y);
}

function handleInput(clientX, clientY) {
  const { x, y } = getGameCoords(clientX, clientY);
  if (x < 0 || x > gameWidth || y < 0 || y > gameHeight) return;

  switch (state.screen) {
    case 'TITLE':
      state.screen = 'PLAYING';
      state.firstPlay = false;
      break;
    case 'LEVEL_UP':
    case 'BOSS_WARNING':
      state.screen = 'PLAYING';
      break;
    case 'GAME_OVER':
      state.score = 0;
      state.level = 1;
      state.wave = 0;
      state.hearts = CONFIG.MAX_HEARTS;
      state.entities = [];
      state.bolts = [];
      state.particles = [];
      state.popups = [];
      state.collectibles = [];
      state.screen = 'TITLE';
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

// ============ ENTITIES ============
// TODO Prompt 4

// ============ RENDERING — FALLBACK GRAPHICS ============
function renderGround(ctx) {
  // Sand base — fills everything above the wall
  ctx.fillStyle = CONFIG.COLORS.GROUND;
  ctx.fillRect(0, 0, gameWidth, wallY);

  // Sand dune patches
  ctx.fillStyle = CONFIG.COLORS.GROUND_DARK;
  for (const d of decorations.dunes) {
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sand ripple curves — gentle horizontal sine waves
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = CONFIG.COLORS.GROUND_DARK;
  ctx.lineWidth = 0.7;
  for (const baseY of decorations.ripples) {
    ctx.beginPath();
    for (let x = 0; x <= gameWidth; x += 6) {
      const y = baseY + Math.sin(x / 60) * 4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Tiny scattered rocks
  ctx.fillStyle = '#4a2808';
  for (const rock of decorations.rocks) {
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderWall(ctx) {
  if (SPRITES.wall) {
    ctx.drawImage(SPRITES.wall, 0, wallY, gameWidth, wallHeight);
    if (SPRITES.city) {
      ctx.drawImage(SPRITES.city, 0, wallY + walkwayHeight, gameWidth, wallHeight - walkwayHeight);
    }
    return;
  }

  // Walkway body
  ctx.fillStyle = CONFIG.COLORS.WALL_STONE;
  ctx.fillRect(0, wallY, gameWidth, walkwayHeight);

  // Stone block texture
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = CONFIG.COLORS.WALL_DARK;
  ctx.lineWidth = 0.6;
  const courseH = 17;
  for (let y = wallY + courseH; y < wallY + walkwayHeight; y += courseH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(gameWidth, y);
    ctx.stroke();
  }
  let row = 0;
  for (let y = wallY; y < wallY + walkwayHeight; y += courseH) {
    const offset = (row % 2 === 0) ? 0 : 20;
    for (let x = offset; x <= gameWidth; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, Math.min(y + courseH, wallY + walkwayHeight));
      ctx.stroke();
    }
    row++;
  }
  ctx.restore();

  // Crenellations along the top edge — distributed across full width
  ctx.fillStyle = CONFIG.COLORS.WALL_DARK;
  const merlonH = 12;
  const merlonCount = Math.max(1, Math.floor(gameWidth / 34));
  const stride = gameWidth / merlonCount;
  const merlonW = stride * 0.74;
  for (let i = 0; i < merlonCount; i++) {
    const x = i * stride + (stride - merlonW) / 2;
    ctx.fillRect(x, wallY - merlonH, merlonW, merlonH);
  }

  // Wall face below the walkway (brick)
  const cityBaseY = wallY + walkwayHeight;
  const cityH = wallHeight - walkwayHeight;
  ctx.fillStyle = CONFIG.COLORS.WALL_BRICK;
  ctx.fillRect(0, cityBaseY, gameWidth, cityH);

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = CONFIG.COLORS.WALL_DARK;
  ctx.lineWidth = 0.6;
  for (let y = cityBaseY + 15; y < wallY + wallHeight; y += 15) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(gameWidth, y);
    ctx.stroke();
  }
  ctx.restore();

  // City strip — buildings & palms peeking from below the walkway
  if (SPRITES.city) {
    ctx.drawImage(SPRITES.city, 0, cityBaseY, gameWidth, cityH);
  } else {
    ctx.fillStyle = '#d6b888';
    for (const b of decorations.buildings) {
      ctx.fillRect(b.x, cityBaseY + b.y, b.w, b.h);
    }
    ctx.fillStyle = '#5a7a3a';
    for (const p of decorations.palms) {
      ctx.beginPath();
      ctx.arc(p.x, cityBaseY + p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ============ PARTICLE SYSTEM ============
// TODO Prompt 6

// ============ JUICE EFFECTS ============
// TODO Prompt 6

// ============ WAVE SPAWNER ============
// TODO Prompt 4

// ============ COLLISION ============
// TODO Prompt 4

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

  // Right — hearts ending at gameWidth-30, 20px apart
  ctx.textAlign = 'center';
  ctx.font = '18px monospace';
  const heartEnd = gameWidth - 30;
  for (let n = 1; n <= CONFIG.MAX_HEARTS; n++) {
    const x = heartEnd - (CONFIG.MAX_HEARTS - n) * 20;
    const filled = n <= state.hearts;
    ctx.fillStyle = filled ? CONFIG.COLORS.HEART_RED : CONFIG.COLORS.HEART_GREY;
    ctx.fillText('♥', x, 16);
  }

  // Power-up rail — 3 outlined slots stacked at the right edge (Prompt 7 stub)
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.strokeStyle = CONFIG.COLORS.UI_TEXT;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const px = gameWidth - 50;
    const py = 80 + i * 50;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(px, py, 40, 40, 6);
      ctx.stroke();
    } else {
      ctx.strokeRect(px, py, 40, 40);
    }
  }
  ctx.restore();
}

// ============ POWER-UPS ============
// TODO Prompt 7

// ============ AUDIO ============
// TODO Prompt 8

// ============ LEADERBOARD API ============
// TODO Prompt 8

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
  if (b.recoilTimer > 0) {
    ctx.translate(b.x, b.y);
    ctx.scale(0.85, 0.85);
    ctx.translate(-b.x, -b.y);
  }
  // Dark base
  ctx.fillStyle = CONFIG.COLORS.WOOD_BROWN;
  ctx.fillRect(b.x - 8, b.y - 5, 16, 10);
  // V-shaped bow arms above the base
  ctx.strokeStyle = CONFIG.COLORS.WOOD_LIGHT;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(b.x, b.y - 5);
  ctx.lineTo(b.x - 9, b.y - 16);
  ctx.moveTo(b.x, b.y - 5);
  ctx.lineTo(b.x + 9, b.y - 16);
  ctx.stroke();
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
    if (bolt.y < -50) bolt.alive = false;
  }
  state.bolts = state.bolts.filter(b => b.alive);
}

function renderBolts(ctx) {
  for (const bolt of state.bolts) {
    const dx = bolt.targetX - bolt.x;
    const dy = bolt.targetY - bolt.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Trail: oldest → newest, fading & narrowing
    ctx.lineCap = 'round';
    ctx.strokeStyle = CONFIG.COLORS.BOLT_GOLD;
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
    ctx.fillStyle = CONFIG.COLORS.BOLT_GOLD;
    ctx.beginPath();
    ctx.moveTo(tipX + dirX * 4, tipY + dirY * 4);
    ctx.lineTo(tipX + perpX * 3, tipY + perpY * 3);
    ctx.lineTo(tipX - perpX * 3, tipY - perpY * 3);
    ctx.closePath();
    ctx.fill();

    // Bright dot for visibility
    ctx.fillStyle = CONFIG.COLORS.FLASH_GOLD;
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

  const pulse = 0.5 + 0.5 * Math.sin(state.time / 400);
  ctx.globalAlpha = 0.4 + 0.6 * pulse;
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

function renderLevelUp(ctx)    { renderOverlayPlaceholder(ctx, 'LEVEL UP — tap to continue'); }
function renderBossWarning(ctx){ renderOverlayPlaceholder(ctx, 'BOSS INCOMING — tap to continue'); }
function renderGameOver(ctx)   { renderOverlayPlaceholder(ctx, 'GAME OVER — tap to restart'); }
function renderPaused(ctx)     { renderOverlayPlaceholder(ctx, 'PAUSED — tap to resume'); }

function renderPlaying(ctx) {
  ctx.save();
  ctx.translate(state.shake.x, state.shake.y);

  renderGround(ctx);
  // renderEntities(ctx) — Prompt 4
  renderBolts(ctx);
  renderWall(ctx);
  for (const b of state.ballistae) renderBallista(ctx, b);
  // renderParticles(ctx) — Prompt 6

  ctx.restore();

  renderHUD(ctx);
}

// ============ MAIN LOOP ============
function update(dt) {
  state.time += dt;
  if (state.screen === 'PLAYING' && !state.paused) {
    updateBallistae(dt);
    updateBolts(dt);
    // TODO Prompt 4+: entity/wave updates
  }
}

function render() {
  ctx.fillStyle = '#1a0a04';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  switch (state.screen) {
    case 'TITLE':         renderTitle(ctx); break;
    case 'PLAYING':       renderPlaying(ctx); break;
    case 'LEVEL_UP':      renderPlaying(ctx); renderLevelUp(ctx); break;
    case 'BOSS_WARNING':  renderPlaying(ctx); renderBossWarning(ctx); break;
    case 'GAME_OVER':     renderPlaying(ctx); renderGameOver(ctx); break;
    case 'PAUSED':        renderPlaying(ctx); renderPaused(ctx); break;
    default:              renderTitle(ctx);
  }
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
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches && e.touches.length) {
      handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  try { state.bestScore = parseInt(localStorage.getItem('palmyra_best') || '0'); } catch(e) {}
  initAssets();
  requestAnimationFrame(gameLoop);
}
document.addEventListener('DOMContentLoaded', init);
