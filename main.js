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
  ambientParticles: [], sparkles: [], sparkleTimer: 0.7, wallFlash: 0,
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
  const { x, y } = getGameCoords(clientX, clientY);
  if (x < 0 || x > gameWidth || y < 0 || y > gameHeight) return;

  switch (state.screen) {
    case 'TITLE':
      state.firstPlay = false;
      startGame();
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
      break;
    case 'GAME_OVER':
      state.screen = 'TITLE';
      state.entities = [];
      state.bolts = [];
      state.particles = [];
      state.popups = [];
      state.sparkles = [];
      state.collectibles = [];
      state.wallFlash = 0;
      state.shake.x = 0; state.shake.y = 0; state.shake.intensity = 0; state.shake.duration = 0;
      waveSpawnQueue = [];
      waveSpawnTimer = 0;
      betweenWaves = false;
      betweenWaveTimer = 0;
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
      offsetX: (Math.random() - 0.5) * 16,
      offsetY: (Math.random() - 0.5) * 12,
      bobPhase: Math.random() * Math.PI * 2,
      renderOffsetY: 0,
    })),
    hp: CONFIG.LEGIONARY_HP,
    speed: CONFIG.LEGIONARY_SPEED * speedMultiplier,
    alive: true,
    width: 40,
    height: 35,
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

  for (const s of entity.soldiers) {
    const sx = entity.x + s.offsetX;
    const sy = entity.y + s.offsetY + (s.renderOffsetY || 0);

    if (SPRITES.legionary) {
      const w = entity.width * scale;
      const h = entity.height * scale;
      ctx.save();
      if (flashing) ctx.filter = 'brightness(1.8)';
      ctx.drawImage(SPRITES.legionary, sx - w / 2, sy - h / 2, w, h);
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);

    // Soft shadow under the soldier
    ctx.fillStyle = CONFIG.COLORS.SHADOW;
    ctx.beginPath();
    ctx.ellipse(0, 9, 7, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet — dark circle with lighter inner highlight
    ctx.fillStyle = flashing ? '#ffffff' : '#3a2a18';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flashing ? '#ffe6a8' : '#5a4828';
    ctx.beginPath();
    ctx.arc(-1, -1.2, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Tiny crest
    ctx.strokeStyle = CONFIG.COLORS.CREST_RED;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, -8);
    ctx.stroke();

    // Shield — red rect with gold trim + boss
    ctx.fillStyle = flashing ? '#ffb0a0' : CONFIG.COLORS.SHIELD_RED;
    ctx.fillRect(4, -3, 6, 10);
    ctx.fillStyle = CONFIG.COLORS.GOLD;
    ctx.fillRect(7, -1, 0.8, 6);
    ctx.beginPath();
    ctx.arc(7.4, 2, 1, 0, Math.PI * 2);
    ctx.fill();

    // Sword — thin grey line
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, 1);
    ctx.lineTo(-9, 6);
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

  if (SPRITES.testudo) {
    ctx.save();
    if (flashing) ctx.filter = 'brightness(1.8)';
    ctx.drawImage(SPRITES.testudo, x0, y0, w, h);
    ctx.restore();
    if (entity.cracks.length > 0) {
      ctx.save();
      ctx.translate(x0, y0);
      ctx.scale(scale, scale);
      ctx.strokeStyle = '#1a0a04';
      ctx.lineWidth = 2;
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

  // Soft shadow
  ctx.save();
  ctx.fillStyle = CONFIG.COLORS.SHADOW;
  ctx.beginPath();
  ctx.ellipse(entity.x, entity.y + h / 2 + 3, w * 0.45, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Main red shield body
  ctx.fillStyle = flashing ? '#ffb0a0' : CONFIG.COLORS.SHIELD_RED;
  ctx.fillRect(x0, y0, w, h);

  // Dark border
  ctx.strokeStyle = '#1a0a04';
  ctx.lineWidth = 2;
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

  // Dark red separators
  ctx.strokeStyle = '#7a2a1a';
  ctx.lineWidth = 1;
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

  // Gold cross + dot in each cell
  ctx.strokeStyle = CONFIG.COLORS.GOLD;
  ctx.fillStyle = CONFIG.COLORS.GOLD;
  ctx.lineWidth = 0.8;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cellW + cellW / 2;
      const cy = r * cellH + cellH / 2;
      ctx.beginPath();
      ctx.moveTo(cx - cellW * 0.3, cy);
      ctx.lineTo(cx + cellW * 0.3, cy);
      ctx.moveTo(cx, cy - cellH * 0.3);
      ctx.lineTo(cx, cy + cellH * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cracks
  if (entity.cracks.length > 0) {
    ctx.strokeStyle = '#1a0a04';
    ctx.lineWidth = 2;
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

  if (SPRITES.siegeTower) {
    ctx.save();
    if (flashing) ctx.filter = 'brightness(1.8)';
    ctx.drawImage(SPRITES.siegeTower, x0, y0, w, h);
    ctx.restore();
  } else {
    // Shadow
    ctx.save();
    ctx.fillStyle = CONFIG.COLORS.SHADOW;
    ctx.beginPath();
    ctx.ellipse(entity.x, entity.y + h / 2 + 4, w * 0.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Main brown body
    ctx.fillStyle = flashing ? '#d8b078' : CONFIG.COLORS.WOOD_LIGHT;
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = CONFIG.COLORS.WOOD_BROWN;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, w, h);

    ctx.save();
    ctx.translate(x0, y0);
    ctx.scale(scale, scale);
    const iw = entity.width;
    const ih = entity.height;

    // Cross-brace X
    ctx.strokeStyle = CONFIG.COLORS.WOOD_BROWN;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, 4); ctx.lineTo(iw - 4, ih - 4);
    ctx.moveTo(iw - 4, 4); ctx.lineTo(4, ih - 4);
    ctx.stroke();

    // Platform near top
    ctx.fillStyle = '#3a1f0a';
    ctx.fillRect(6, 6, iw - 12, ih * 0.22);

    // Archers on platform
    ctx.fillStyle = '#cc3333';
    const archerY = 6 + ih * 0.11;
    for (let i = 0; i < 4; i++) {
      const ax = 10 + i * ((iw - 20) / 3);
      ctx.beginPath();
      ctx.arc(ax, archerY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wheels — dark rects on sides at the bottom
    ctx.fillStyle = '#1a0a04';
    ctx.fillRect(-3, ih - 14, 8, 12);
    ctx.fillRect(iw - 5, ih - 14, 8, 12);

    // Scorch marks
    for (const s of entity.scorchMarks) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#1a0a04';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r * 0.7, 0, 0, Math.PI * 2);
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
  if (state.deltaTime > 20 && state.particles.length > 100) {
    state.particles.splice(0, state.particles.length - 100);
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
  if (state.deltaTime > 20) return;
  ctx.fillStyle = CONFIG.COLORS.SHADOW;
  for (const e of state.entities) {
    if (!e.alive || e.crumbling) continue;
    const scale = entityScale(e);
    const sizeMult = e.type === 'siegeTower' ? 1.5 : 1;
    const rx = e.width * scale * 0.4 * sizeMult;
    const ry = e.height * scale * 0.15 * sizeMult;
    const cy = e.y + e.height * scale * 0.5 + 3;
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
    const baseY = e.y + e.height * scale * 0.45;
    if (e.type === 'legionary') {
      for (const s of e.soldiers) {
        spawnParticle({
          x: e.x + s.offsetX,
          y: e.y + s.offsetY + 6,
          vx: (Math.random() - 0.5) * 12,
          vy: -3 - Math.random() * 4,
          life: 0.3 + Math.random() * 0.2,
          size: 1 + Math.random(),
          color: CONFIG.COLORS.DUST,
          alpha: 0.3,
        });
      }
    } else if (e.type === 'testudo') {
      spawnDust(e.x, baseY);
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
  if (level <= 2) {
    legCount = 3 + Math.floor(Math.random() * 2);
    testudoCount = 0;
    speed = 1.0;
  } else if (level <= 4) {
    legCount = 3 + Math.floor(Math.random() * 2);
    testudoCount = 1;
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
  state.wallFlash = 0;
  state.shake.x = 0; state.shake.y = 0; state.shake.intensity = 0; state.shake.duration = 0;
  waveSpawnQueue = [];
  waveSpawnTimer = 0;
  betweenWaves = false;
  betweenWaveTimer = 0;
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
        entity.hp -= 1;
        entity.flashTimer = 0.05;

        // Impact flash circle — small bright dot that swells and fades
        spawnParticle({
          x: bolt.x, y: bolt.y, size: 1,
          color: CONFIG.COLORS.FLASH_GOLD,
          life: 0.2, alpha: 0.8, growRate: 60,
        });

        if (entity.hp > 0) {
          // Hit but not killed
          if (entity.type === 'testudo') {
            generateCrack(entity);
            triggerShake(2, 0.1);
            spawnImpactBurst(bolt.x, bolt.y, entityKillColors('testudo'), 6);
          } else if (entity.type === 'siegeTower') {
            entity.scorchMarks.push({
              x: Math.random() * 50 + 10,
              y: Math.random() * 60 + 15,
              r: 5 + Math.random() * 8,
            });
            if (entity.hp <= 2) entity.smoking = true;
            triggerShake(3, 0.15);
            spawnImpactBurst(bolt.x, bolt.y, entityKillColors('siegeTower'), 8);
            spawnSmoke(entity.x, entity.y - entity.height * 0.3);
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
          } else if (entity.type === 'testudo') {
            spawnImpactBurst(entity.x, entity.y, entityKillColors('testudo'), 10);
            triggerShake(4, 0.2);
          } else {
            spawnImpactBurst(bolt.x, bolt.y, entityKillColors('legionary'), 8);
            triggerShake(2, 0.1);
          }
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

      if (state.hearts <= 0) {
        state.hearts = 0;
        if (state.score > state.bestScore) {
          state.bestScore = state.score;
          try { localStorage.setItem('palmyra_best', String(state.bestScore)); } catch (e) {}
        }
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

function renderGameOver(ctx) {
  ctx.fillStyle = 'rgba(20, 10, 4, 0.85)';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = gameWidth / 2;
  const cy = gameHeight / 2;

  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.font = 'bold 48px serif';
  ctx.fillText('GAME OVER', cx, cy - 90);

  ctx.fillStyle = CONFIG.COLORS.UI_GOLD;
  ctx.fillRect(cx - 60, cy - 60, 120, 2);

  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '22px monospace';
  ctx.fillText(`Score    ${state.score.toLocaleString()}`, cx, cy - 20);
  ctx.fillText(`Level    ${state.level}`, cx, cy + 14);
  ctx.fillText(`Best     ${state.bestScore.toLocaleString()}`, cx, cy + 48);

  const pulse = 0.5 + 0.5 * Math.sin(state.time / 400);
  ctx.globalAlpha = 0.4 + 0.6 * pulse;
  ctx.fillStyle = CONFIG.COLORS.UI_TEXT;
  ctx.font = '20px serif';
  ctx.fillText('TAP TO CONTINUE', cx, cy + 110);
  ctx.globalAlpha = 1;
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
  renderBolts(ctx);
  renderParticles(ctx);
  renderWall(ctx);
  renderWallFlash(ctx);
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
    checkCollisions();
    updateWaveState(dt);
    updateDustTrails(dtSec);
    updateShake(dtSec);
    updateParticles(dtSec);
    updatePopups(dtSec);
    updateSparkles(dtSec);
    if (state.wallFlash > 0) {
      state.wallFlash = Math.max(0, state.wallFlash - dtSec);
    }
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
