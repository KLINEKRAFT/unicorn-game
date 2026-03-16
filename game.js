const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const endTitle = document.getElementById('end-title');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const healthBarEl = document.getElementById('health-bar');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TILE = 64;
const WORLD_WIDTH = 5056;
const GRAVITY = 0.52;
const MAX_HEALTH = 5;
const RESPAWN_INVULN_MS = 1400;

const input = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};

const state = {
  running: false,
  ended: false,
  score: 0,
  cameraX: 0,
  health: MAX_HEALTH,
  damageFlash: 0,
};

const images = {};
const assetPaths = {
  sprite: 'assets/unicorn_run.png',
  bg1: 'assets/background/background_layer_1.png',
  bg2: 'assets/background/background_layer_2.png',
  bg3: 'assets/background/background_layer_3.png',
  bg4: 'assets/background/background_layer_4.png',
  bg5: 'assets/background/background_layer_5.png',
  bg6: 'assets/background/background_layer_6.png',
  tileTopLeft: 'assets/dirt_tiles/tile_top_left.png',
  tileTopCenter: 'assets/dirt_tiles/tile_top_center.png',
  tileTopRight: 'assets/dirt_tiles/tile_top_right.png',
  tileMiddleLeft: 'assets/dirt_tiles/tile_middle_left.png',
  tileMiddleCenter: 'assets/dirt_tiles/tile_middle_center.png',
  tileMiddleRight: 'assets/dirt_tiles/tile_middle_right.png',
  tileBottomLeft: 'assets/dirt_tiles/tile_bottom_left.png',
  tileBottomCenter: 'assets/dirt_tiles/tile_bottom_center.png',
  tileBottomRight: 'assets/dirt_tiles/tile_bottom_right.png',
  tileFloating: 'assets/dirt_tiles/tile_floating.png',
  apple: 'assets/food/apple.png',
  banana: 'assets/food/banana.png',
  cherry: 'assets/food/cherry.png',
  grape: 'assets/food/grape.png',
  kiwi: 'assets/food/kiwi.png',
  lemon: 'assets/food/lemon.png',
  peach: 'assets/food/peach.png',
  pear: 'assets/food/pear.png',
  pineapple: 'assets/food/pineapple.png',
  strawberry: 'assets/food/strawberry.png',
  watermelon: 'assets/food/watermelon.png',
  avacado: 'assets/food/avacado.png',
};

const foodKeys = ['apple', 'banana', 'cherry', 'grape', 'kiwi', 'lemon', 'peach', 'pear', 'pineapple', 'strawberry', 'watermelon', 'avacado'];

function loadImage(key, src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      images[key] = img;
      resolve();
    };
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function loadAssets() {
  await Promise.all(Object.entries(assetPaths).map(([key, src]) => loadImage(key, src)));
}

const player = {
  x: 120,
  y: 0,
  w: 112,
  h: 112,
  vx: 0,
  vy: 0,
  speed: 4.4,
  jumpPower: 12.8,
  grounded: false,
  frame: 0,
  frameTimer: 0,
  facing: 1,
  invulnerableUntil: 0,
  spawnX: 120,
  spawnY: 0,
};

let groundSegments = [];
let platforms = [];
let collectibles = [];
let hazards = [];
let finishZone = { x: WORLD_WIDTH - 200, y: 0, w: 80, h: 180 };

function buildLevel() {
  groundSegments = [
    { x: 0, y: 608, width: 6, height: 2 },
    { x: 448, y: 576, width: 4, height: 3 },
    { x: 832, y: 640, width: 3, height: 2 },
    { x: 1152, y: 576, width: 5, height: 3 },
    { x: 1664, y: 608, width: 4, height: 2 },
    { x: 2048, y: 544, width: 5, height: 4 },
    { x: 2624, y: 608, width: 4, height: 2 },
    { x: 3008, y: 544, width: 5, height: 4 },
    { x: 3584, y: 608, width: 4, height: 2 },
    { x: 3968, y: 576, width: 5, height: 3 },
    { x: 4544, y: 608, width: 6, height: 2 },
  ];

  platforms = [
    { x: 300, y: 468, width: 2 },
    { x: 704, y: 428, width: 2 },
    { x: 1280, y: 448, width: 2 },
    { x: 1520, y: 384, width: 2 },
    { x: 1920, y: 470, width: 2 },
    { x: 2368, y: 404, width: 3 },
    { x: 2890, y: 390, width: 2 },
    { x: 3328, y: 456, width: 2 },
    { x: 3872, y: 392, width: 2 },
    { x: 4256, y: 352, width: 2 },
  ];

  hazards = [
    { x: 980, y: 608, w: 72, h: 32 },
    { x: 2250, y: 512, w: 72, h: 32 },
    { x: 3230, y: 512, w: 72, h: 32 },
    { x: 4130, y: 544, w: 72, h: 32 },
  ];

  collectibles = [
    { x: 340, y: 404 },
    { x: 468, y: 530 },
    { x: 754, y: 364 },
    { x: 1290, y: 384 },
    { x: 1540, y: 320 },
    { x: 1758, y: 542 },
    { x: 1960, y: 406 },
    { x: 2432, y: 338 },
    { x: 2762, y: 548 },
    { x: 2940, y: 324 },
    { x: 3380, y: 390 },
    { x: 3902, y: 326 },
    { x: 4296, y: 286 },
    { x: 4728, y: 544 },
  ].map((item, index) => ({
    ...item,
    size: 42,
    collected: false,
    bob: Math.random() * Math.PI * 2,
    spriteKey: foodKeys[index % foodKeys.length],
  }));

  finishZone = { x: WORLD_WIDTH - 240, y: 398, w: 90, h: 200 };
}

function resetWorld() {
  state.running = false;
  state.ended = false;
  state.score = 0;
  state.cameraX = 0;
  state.health = MAX_HEALTH;
  state.damageFlash = 0;
  scoreEl.textContent = '0';
  updateHealthBar();

  buildLevel();

  player.x = 120;
  player.y = groundSegments[0].y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.frame = 0;
  player.frameTimer = 0;
  player.facing = 1;
  player.invulnerableUntil = 0;
  player.spawnX = 120;
  player.spawnY = groundSegments[0].y - player.h;

  endScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
}

function setButtonHold(element, key) {
  const onDown = (event) => {
    event.preventDefault();
    input[key] = true;
    if (key === 'jump') input.jumpPressed = true;
  };
  const onUp = (event) => {
    event.preventDefault();
    input[key] = false;
  };

  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointerleave', onUp);
  element.addEventListener('pointercancel', onUp);
}

function setupControls() {
  setButtonHold(document.getElementById('left-btn'), 'left');
  setButtonHold(document.getElementById('right-btn'), 'right');
  setButtonHold(document.getElementById('jump-btn'), 'jump');

  window.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = true;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = true;
    if (event.code === 'ArrowUp' || event.code === 'Space' || event.code === 'KeyW') {
      if (!input.jump) input.jumpPressed = true;
      input.jump = true;
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = false;
    if (event.code === 'ArrowUp' || event.code === 'Space' || event.code === 'KeyW') input.jump = false;
  });
}

function updatePlayer() {
  let move = 0;
  if (input.left) move -= 1;
  if (input.right) move += 1;

  player.vx = move * player.speed;
  if (move !== 0) player.facing = move;

  if (input.jumpPressed && player.grounded) {
    player.vy = -player.jumpPower;
    player.grounded = false;
  }
  input.jumpPressed = false;

  if (!input.jump && player.vy < -5) {
    player.vy += 0.45;
  }

  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;
  player.grounded = false;

  const solids = [];

  groundSegments.forEach((seg) => {
    for (let c = 0; c < seg.width; c++) {
      for (let r = 0; r < seg.height; r++) {
        solids.push({ x: seg.x + c * TILE, y: seg.y + r * TILE, w: TILE, h: TILE });
      }
    }
  });

  platforms.forEach((plat) => {
    for (let c = 0; c < plat.width; c++) {
      solids.push({ x: plat.x + c * TILE, y: plat.y, w: TILE, h: TILE });
    }
  });

  for (const tile of solids) {
    if (!rectsOverlap(player.x, player.y, player.w, player.h, tile.x, tile.y, tile.w, tile.h)) continue;

    const prevBottom = player.y - player.vy + player.h;
    const prevTop = player.y - player.vy;
    const prevRight = player.x - player.vx + player.w;
    const prevLeft = player.x - player.vx;

    if (prevBottom <= tile.y + 8 && player.vy >= 0) {
      player.y = tile.y - player.h;
      player.vy = 0;
      player.grounded = true;
      continue;
    }

    if (prevTop >= tile.y + tile.h - 8 && player.vy < 0) {
      player.y = tile.y + tile.h;
      player.vy = 0;
      continue;
    }

    if (prevRight <= tile.x + 8 && player.vx > 0) {
      player.x = tile.x - player.w;
      continue;
    }

    if (prevLeft >= tile.x + tile.w - 8 && player.vx < 0) {
      player.x = tile.x + tile.w;
      continue;
    }
  }

  const now = performance.now();

  hazards.forEach((hazard) => {
    if (rectsOverlap(player.x + 12, player.y + 12, player.w - 24, player.h - 20, hazard.x, hazard.y, hazard.w, hazard.h)) {
      if (now > player.invulnerableUntil) {
        applyDamage(1);
      }
    }
  });

  collectibles.forEach((item) => {
    item.bob += 0.08;
    if (item.collected) return;
    const bobY = item.y + Math.sin(item.bob) * 6;
    if (rectsOverlap(player.x + 18, player.y + 16, player.w - 36, player.h - 28, item.x, bobY, item.size, item.size)) {
      item.collected = true;
      state.score += 10;
      scoreEl.textContent = String(state.score);
    }
  });

  updateCheckpoint();

  if (player.y > HEIGHT + 220) {
    applyDamage(1, true);
  }

  player.x = clamp(player.x, 0, WORLD_WIDTH - player.w);

  if (rectsOverlap(player.x, player.y, player.w, player.h, finishZone.x, finishZone.y, finishZone.w, finishZone.h)) {
    endRun(true);
    return;
  }

  if (Math.abs(player.vx) > 0.1 || !player.grounded) {
    player.frameTimer += 1;
    if (player.frameTimer > 5) {
      player.frame = (player.frame + 1) % 12;
      player.frameTimer = 0;
    }
  } else {
    player.frame = 0;
    player.frameTimer = 0;
  }

  const targetCamera = clamp(player.x - WIDTH * 0.38, 0, WORLD_WIDTH - WIDTH);
  state.cameraX += (targetCamera - state.cameraX) * 0.12;
}

function updateCheckpoint() {
  for (const seg of groundSegments) {
    const segCenter = seg.x + (seg.width * TILE) * 0.5;
    if (player.x > segCenter && seg.x > player.spawnX + 160) {
      player.spawnX = seg.x + 24;
      player.spawnY = seg.y - player.h;
    }
  }
}

function applyDamage(amount, forceRespawn = false) {
  state.health = Math.max(0, state.health - amount);
  state.damageFlash = 10;
  updateHealthBar();

  if (state.health <= 0) {
    endRun(false);
    return;
  }

  respawnPlayer(forceRespawn);
}

function respawnPlayer(forceRespawn) {
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.invulnerableUntil = performance.now() + RESPAWN_INVULN_MS;
  if (forceRespawn) {
    state.cameraX = clamp(player.x - WIDTH * 0.3, 0, WORLD_WIDTH - WIDTH);
  }
}

function updateHealthBar() {
  const key = state.health <= 0 ? 'empty' : String(state.health);
  const filename = key === 'empty' ? 'healthbar_empty.png' : `healthbar_${key}.png`;
  healthBarEl.src = `assets/health_bar/${filename}`;
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawWorld();
  drawHazards();
  drawCollectibles();
  drawFinishFlag();
  drawPlayer();
  if (state.damageFlash > 0) drawDamageFlash();
}

function drawBackground() {
  const layers = [
    { key: 'bg1', speed: 0.08, y: 0, h: HEIGHT },
    { key: 'bg2', speed: 0.14, y: 0, h: HEIGHT },
    { key: 'bg3', speed: 0.22, y: 10, h: HEIGHT - 10 },
    { key: 'bg4', speed: 0.32, y: 80, h: HEIGHT - 80 },
    { key: 'bg5', speed: 0.5, y: 160, h: HEIGHT - 120 },
    { key: 'bg6', speed: 0.72, y: 250, h: HEIGHT - 110 },
  ];

  layers.forEach((layer) => {
    const img = images[layer.key];
    const drawWidth = img.width * (layer.h / img.height);
    let x = -(state.cameraX * layer.speed) % drawWidth;
    if (x > 0) x -= drawWidth;
    for (; x < WIDTH; x += drawWidth) {
      ctx.drawImage(img, x, layer.y, drawWidth, layer.h);
    }
  });
}

function drawWorld() {
  groundSegments.forEach((seg) => drawGroundBlock(seg));
  platforms.forEach((plat) => drawPlatform(plat));
}

function drawGroundBlock(seg) {
  for (let c = 0; c < seg.width; c++) {
    for (let r = 0; r < seg.height; r++) {
      let key = 'tileMiddleCenter';
      const top = r === 0;
      const bottom = r === seg.height - 1;
      const left = c === 0;
      const right = c === seg.width - 1;

      if (top && left) key = 'tileTopLeft';
      else if (top && right) key = 'tileTopRight';
      else if (top) key = 'tileTopCenter';
      else if (bottom && left) key = 'tileBottomLeft';
      else if (bottom && right) key = 'tileBottomRight';
      else if (bottom) key = 'tileBottomCenter';
      else if (left) key = 'tileMiddleLeft';
      else if (right) key = 'tileMiddleRight';

      drawTile(images[key], seg.x + c * TILE - state.cameraX, seg.y + r * TILE, TILE, TILE);
    }
  }
}

function drawPlatform(plat) {
  for (let c = 0; c < plat.width; c++) {
    drawTile(images.tileFloating, plat.x + c * TILE - state.cameraX, plat.y, TILE, TILE);
  }
}

function drawTile(img, x, y, w, h) {
  if (x + w < 0 || x > WIDTH) return;
  ctx.drawImage(img, x, y, w, h);
}

function drawHazards() {
  hazards.forEach((hazard) => {
    const x = hazard.x - state.cameraX;
    if (x < -hazard.w || x > WIDTH + hazard.w) return;

    ctx.fillStyle = '#4f1f54';
    ctx.fillRect(x, hazard.y + 10, hazard.w, 18);
    for (let i = 0; i < 4; i++) {
      const spikeX = x + i * (hazard.w / 4);
      ctx.fillStyle = '#ff75aa';
      ctx.beginPath();
      ctx.moveTo(spikeX + 8, hazard.y + 28);
      ctx.lineTo(spikeX + 18, hazard.y);
      ctx.lineTo(spikeX + 28, hazard.y + 28);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff1f6';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

function drawCollectibles() {
  collectibles.forEach((item) => {
    if (item.collected) return;
    const x = item.x - state.cameraX;
    if (x < -item.size || x > WIDTH + item.size) return;
    const y = item.y + Math.sin(item.bob) * 6;
    ctx.drawImage(images[item.spriteKey], x, y, item.size, item.size);
  });
}

function drawFinishFlag() {
  const x = finishZone.x - state.cameraX;
  if (x < -100 || x > WIDTH + 100) return;

  ctx.fillStyle = '#5b4125';
  ctx.fillRect(x + 40, finishZone.y - 118, 8, 180);
  ctx.fillStyle = '#ffe65a';
  ctx.beginPath();
  ctx.moveTo(x + 48, finishZone.y - 112);
  ctx.lineTo(x + 120, finishZone.y - 86);
  ctx.lineTo(x + 48, finishZone.y - 60);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2c1f10';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('FINISH', x + 28, finishZone.y - 126);
}

function drawPlayer() {
  const sprite = images.sprite;
  const cols = 6;
  const rows = 6;
  const frameWidth = sprite.width / cols;
  const frameHeight = sprite.height / rows;
  let frameIndex = player.frame;
  if (!player.grounded) frameIndex = 7;
  const sx = (frameIndex % cols) * frameWidth;
  const sy = Math.floor(frameIndex / cols) * frameHeight;

  ctx.save();
  const drawX = Math.round(player.x - state.cameraX + player.w / 2);
  const drawY = Math.round(player.y + player.h / 2);
  ctx.translate(drawX, drawY);
  ctx.scale(player.facing, 1);
  if (performance.now() < player.invulnerableUntil) {
    ctx.globalAlpha = Math.floor(performance.now() / 80) % 2 === 0 ? 0.45 : 0.9;
  }
  ctx.drawImage(sprite, sx, sy, frameWidth, frameHeight, -player.w / 2, -player.h / 2, player.w, player.h);
  ctx.restore();
}

function drawDamageFlash() {
  ctx.fillStyle = 'rgba(255, 60, 120, 0.18)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function endRun(won) {
  state.running = false;
  state.ended = true;
  endTitle.textContent = won ? 'Level Complete' : 'Game Over';
  finalScoreEl.textContent = `Score: ${state.score}`;
  endScreen.classList.remove('hidden');
}

function gameLoop() {
  if (state.running) updatePlayer();
  if (state.damageFlash > 0) state.damageFlash -= 1;
  draw();
  requestAnimationFrame(gameLoop);
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

startBtn.addEventListener('click', () => {
  state.running = true;
  startScreen.classList.add('hidden');
});

restartBtn.addEventListener('click', () => {
  resetWorld();
});

(async function init() {
  try {
    await loadAssets();
    setupControls();
    resetWorld();
    gameLoop();
  } catch (error) {
    console.error(error);
    alert('Some assets did not load. Double-check filenames and folder structure.');
  }
})();
