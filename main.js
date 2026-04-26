// ============ CONFIG ============
const CONFIG = {
  GAME_WIDTH: 750,
  GAME_HEIGHT: 1334,
  WALL_Y: 1100,
  WALL_HEIGHT: 234,
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
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let gameScale = 1;
let gameOffsetX = 0;
let gameOffsetY = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  const aspectGame = CONFIG.GAME_WIDTH / CONFIG.GAME_HEIGHT;
  const aspectWin = winW / winH;

  let cssW, cssH;
  if (aspectWin > aspectGame) {
    // Window is wider than the game → letterbox sides (desktop)
    cssH = winH;
    cssW = winH * aspectGame;
  } else {
    // Window is taller/narrower than the game → fit to width (mobile)
    cssW = winW;
    cssH = winW / aspectGame;
  }

  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  gameScale = canvas.width / CONFIG.GAME_WIDTH;
  gameOffsetX = (winW - cssW) / 2;
  gameOffsetY = (winH - cssH) / 2;

  ctx.setTransform(gameScale, 0, 0, gameScale, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

function screenToGame(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * CONFIG.GAME_WIDTH;
  const y = ((clientY - rect.top) / rect.height) * CONFIG.GAME_HEIGHT;
  return { x, y };
}

// ============ ASSET LOADER ============
// TODO Prompt 3

// ============ INPUT HANDLER ============
function getGameCoords(clientX, clientY) {
  return {
    x: (clientX - gameOffsetX) / gameScale,
    y: (clientY - gameOffsetY) / gameScale,
  };
}

function handleGameplayTap(x, y) {
  // Prompt 2: no enemies yet — fire toward whatever was tapped.
  // Later prompts will pick the nearest enemy first.
  fireBoltFromNearest(x, y);
}

function handleInput(clientX, clientY) {
  const { x, y } = getGameCoords(clientX, clientY);
  if (x < 0 || x > CONFIG.GAME_WIDTH || y < 0 || y > CONFIG.GAME_HEIGHT) return;

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
// TODO Prompt 3

// ============ PARTICLE SYSTEM ============
// TODO Prompt 6

// ============ JUICE EFFECTS ============
// TODO Prompt 6

// ============ WAVE SPAWNER ============
// TODO Prompt 4

// ============ COLLISION ============
// TODO Prompt 4

// ============ UI RENDERER ============
// TODO Prompt 3

// ============ POWER-UPS ============
// TODO Prompt 7

// ============ AUDIO ============
// TODO Prompt 8

// ============ LEADERBOARD API ============
// TODO Prompt 8

// ============ BALLISTAE ============
function initBallistae() {
  state.ballistae = Array.from({length: CONFIG.BALLISTA_COUNT}, (_, i) => ({
    x: (CONFIG.GAME_WIDTH / (CONFIG.BALLISTA_COUNT + 1)) * (i + 1),
    y: CONFIG.WALL_Y + 30,
    cooldownUntil: 0,
    recoilTimer: 0,
  }));
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
  ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.font = 'bold 52px serif';
  ctx.fillText('PALMYRA', CONFIG.GAME_WIDTH / 2, 420);

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '26px serif';
  ctx.fillText('272 AD', CONFIG.GAME_WIDTH / 2, 470);
  ctx.globalAlpha = 1;

  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.fillRect(CONFIG.GAME_WIDTH / 2 - 50, 488, 100, 2);

  const pulse = 0.5 + 0.5 * Math.sin(state.time / 400);
  ctx.globalAlpha = 0.4 + 0.6 * pulse;
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '28px serif';
  ctx.fillText('TAP TO PLAY', CONFIG.GAME_WIDTH / 2, 750);
  ctx.globalAlpha = 1;
}

function renderOverlayPlaceholder(ctx, label) {
  ctx.fillStyle = 'rgba(20, 10, 4, 0.75)';
  ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '32px serif';
  ctx.fillText(label, CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2);
}

function renderLevelUp(ctx)    { renderOverlayPlaceholder(ctx, 'LEVEL UP — tap to continue'); }
function renderBossWarning(ctx){ renderOverlayPlaceholder(ctx, 'BOSS INCOMING — tap to continue'); }
function renderGameOver(ctx)   { renderOverlayPlaceholder(ctx, 'GAME OVER — tap to restart'); }
function renderPaused(ctx)     { renderOverlayPlaceholder(ctx, 'PAUSED — tap to resume'); }

function renderWallPlaceholder(ctx) {
  // Solid wall band
  ctx.fillStyle = CONFIG.COLORS.WALL_STONE;
  ctx.fillRect(0, CONFIG.WALL_Y, CONFIG.GAME_WIDTH, CONFIG.WALL_HEIGHT);
  // Crenellation row along the top edge of the wall
  ctx.fillStyle = CONFIG.COLORS.WALL_DARK;
  const merlonW = 36, merlonH = 18, gap = 24;
  const stride = merlonW + gap;
  for (let x = 4; x < CONFIG.GAME_WIDTH; x += stride) {
    ctx.fillRect(x, CONFIG.WALL_Y - merlonH, merlonW, merlonH);
  }
}

function renderHUD(ctx) {
  ctx.textBaseline = 'top';

  // Score top-left
  ctx.textAlign = 'left';
  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.font = 'bold 28px serif';
  ctx.fillText(String(state.score), 20, 18);

  // Level top-center
  ctx.textAlign = 'center';
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = 'bold 24px serif';
  ctx.fillText(`LV ${state.level}/${CONFIG.MAX_LEVEL}`, CONFIG.GAME_WIDTH / 2, 22);

  // Hearts top-right
  ctx.textAlign = 'right';
  ctx.font = '26px serif';
  let heartStr = '';
  for (let i = 0; i < CONFIG.MAX_HEARTS; i++) {
    heartStr += i < state.hearts ? '♥' : '♡';
  }
  ctx.fillStyle = CONFIG.COLORS.HEART_RED;
  ctx.fillText(heartStr, CONFIG.GAME_WIDTH - 20, 20);
}

function renderPlaying(ctx) {
  // Sand-colored ground covers the whole canvas; wall sits over it
  ctx.fillStyle = CONFIG.COLORS.GROUND;
  ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

  renderWallPlaceholder(ctx);

  for (const b of state.ballistae) renderBallista(ctx, b);

  renderBolts(ctx);

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
  ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

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

// ============ EVENT LISTENERS ============
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

// ============ INIT ============
function init() {
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  try { state.bestScore = parseInt(localStorage.getItem('palmyra_best') || '0'); } catch(e) {}
  initBallistae();
  requestAnimationFrame(gameLoop);
}
document.addEventListener('DOMContentLoaded', init);
