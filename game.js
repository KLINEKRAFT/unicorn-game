const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TILE = 64;
const WORLD_WIDTH = 4600;
const GRAVITY = 0.52;

const input = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};

const state = {
  running: false,
  gameOver: false,
  score: 0,
  cameraX: 0,
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
  left: 'assets/button_left.png',
  right: 'assets/button_right.png',
  jump: 'assets/button_jump.png',
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
    img.onerror = reject;
    img.src = src;
  });
}

async function loadAssets() {
  const promises = Object.entries(assetPaths).map(([key, src]) => loadImage(key, src));
  await Promise.all(promises);
}

const player = {
  x: 120,
  y: 0,
  w: 112,
  h: 112,
  vx: 0,
  vy: 0,
  speed: 4.2,
  jumpPower: 12.8,
  grounded: false,
  frame: 0,
  frameTimer: 0,
  facing: 1,
};

let groundSegments = [];
let platforms = [];
let collectibles = [];
let finishZone = { x: WORLD_WIDTH - 220, y: 0, w: 90, h: 180 };

function resetWorld() {
  state.running = false;
  state.gameOver = false;
  state.score = 0;
  state.cameraX = 0;
  scoreEl.textContent = '0';

  player.x = 120;
  player.y = 0;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.frame = 0;
  player.frameTimer = 0;
  player.facing = 1;

  groundSegments = [
    { x: 0, y: 600, width: 7, height: 2 },
    { x: 512, y: 568, width: 4, height: 3 },
    { x: 896, y: 632, width: 5, height: 2 },
    { x: 1280, y: 568, width: 4, height: 3 },
    { x: 1664, y: 600, width: 5, height: 2 },
    { x: 2112, y: 632, width: 4, height: 2 },
    { x: 2496, y: 568, width: 5, height: 3 },
    { x: 3008, y: 632, width: 4, height: 2 },
    { x: 3392, y: 568, width: 5, height: 3 },
    { x: 3904, y: 600, width: 6, height: 2 },
  ];

  platforms = [
    { x: 320, y: 468, width: 2 },
    { x: 704, y: 430, width: 2 },
    { x: 1088, y: 504, width: 2 },
    { x: 1472, y: 430, width: 2 },
    { x: 1888, y: 500, width: 3 },
    { x: 2464, y: 448, width: 2 },
    { x: 2912, y: 388, width: 2 },
    { x: 3296, y: 480, width: 2 },
    { x: 3712, y: 420, width: 2 },
  ];

  collectibles = [
    { x: 368, y: 404 },
    { x: 474, y: 404 },
    { x: 748, y: 364 },
    { x: 1140, y: 438 },
    { x: 1510, y: 364 },
    { x: 1976, y: 432 },
    { x: 2130, y: 558 },
    { x: 2522, y: 382 },
    { x: 2972, y: 322 },
    { x: 3360, y: 414 },
    { x: 3770, y: 352 },
    { x: 4010, y: 536 },
  ].map((item, index) => ({
    ...item,
    size: 42,
    collected: false,
    bob: Math.random() * Math.PI * 2,
    spriteKey: foodKeys[index % foodKeys.length],
  }));

  const startGround = groundSegments[0];
  player.y = startGround.y - player.h;
  finishZone.y = 420;

  gameOverScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  startScreen.classList.add('visible');
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
      solids.push({ x: plat.x + c * TILE, y: plat.y, w: TILE, h: TILE, floating: true });
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

  if (player.y > HEIGHT + 220) {
    const nearest = groundSegments.find((seg) => seg.x + seg.width * TILE > Math.max(player.x - 200, 0)) || groundSegments[0];
    player.x = Math.max(nearest.x + 20, 80);
    player.y = nearest.y - player.h;
    player.vx = 0;
    player.vy = 0;
  }

  player.x = clamp(player.x, 0, WORLD_WIDTH - player.w);

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

  if (rectsOverlap(player.x, player.y, player.w, player.h, finishZone.x, finishZone.y, finishZone.w, finishZone.h)) {
    endGame();
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

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawWorld();
  drawCollectibles();
  drawFinishFlag();
  drawPlayer();
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

  ctx.fillStyle = '#4f3722';
  ctx.fillRect(x + 40, finishZone.y - 110, 8, 170);
  ctx.fillStyle = '#ffe65a';
  ctx.beginPath();
  ctx.moveTo(x + 48, finishZone.y - 108);
  ctx.lineTo(x + 118, finishZone.y - 84);
  ctx.lineTo(x + 48, finishZone.y - 60);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2c1f10';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('FINISH', x + 30, finishZone.y - 124);
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
  ctx.drawImage(sprite, sx, sy, frameWidth, frameHeight, -player.w / 2, -player.h / 2, player.w, player.h);
  ctx.restore();
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  finalScoreEl.textContent = `Score: ${state.score}`;
  gameOverScreen.classList.remove('hidden');
}

function gameLoop() {
  if (state.running) updatePlayer();
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
