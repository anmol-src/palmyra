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
// TODO Prompt 2 — full gameplay tap-to-fire logic.
// Basic title-screen / screen-transition input is implemented in BASIC INPUT below.

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
// TODO Prompt 2

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

function renderPlayingPlaceholder(ctx) {
  // Empty dark canvas while gameplay is unimplemented.
  ctx.fillStyle = '#1a0a04';
  ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
}

// ============ MAIN LOOP ============
function update(dt) {
  state.time += dt;
  // Gameplay updates land in later prompts.
  if (state.screen === 'PLAYING' && !state.paused) {
    // TODO Prompt 4+: entity/wave/bolt updates
  }
}

function render() {
  ctx.fillStyle = '#1a0a04';
  ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

  switch (state.screen) {
    case 'TITLE':         renderTitle(ctx); break;
    case 'PLAYING':       renderPlayingPlaceholder(ctx); break;
    case 'LEVEL_UP':      renderPlayingPlaceholder(ctx); renderLevelUp(ctx); break;
    case 'BOSS_WARNING':  renderPlayingPlaceholder(ctx); renderBossWarning(ctx); break;
    case 'GAME_OVER':     renderPlayingPlaceholder(ctx); renderGameOver(ctx); break;
    case 'PAUSED':        renderPlayingPlaceholder(ctx); renderPaused(ctx); break;
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

// ============ BASIC INPUT ============
function handleTap(gameX, gameY) {
  switch (state.screen) {
    case 'TITLE':
      state.screen = 'PLAYING';
      state.firstPlay = false;
      break;
    case 'LEVEL_UP':
      state.screen = 'PLAYING';
      break;
    case 'BOSS_WARNING':
      state.screen = 'PLAYING';
      break;
    case 'GAME_OVER':
      // Reset minimal state and return to title.
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
      // TODO Prompt 2: tap-to-fire ballistae.
      break;
  }
}

function onPointerDown(e) {
  e.preventDefault();
  let clientX, clientY;
  if (e.touches && e.touches.length) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  const { x, y } = screenToGame(clientX, clientY);
  handleTap(x, y);
}

canvas.addEventListener('mousedown', onPointerDown, { passive: false });
canvas.addEventListener('touchstart', onPointerDown, { passive: false });
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ============ INIT ============
function init() {
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  try { state.bestScore = parseInt(localStorage.getItem('palmyra_best') || '0'); } catch(e) {}
  requestAnimationFrame(gameLoop);
}
document.addEventListener('DOMContentLoaded', init);
