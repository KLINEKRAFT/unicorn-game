const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const startScreen = document.getElementById("start-screen");
const endScreen = document.getElementById("end-screen");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const endTitle = document.getElementById("end-title");
const finalScoreEl = document.getElementById("final-score");
const scoreEl = document.getElementById("score");
const healthUi = document.getElementById("health-ui");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TILE = 64;
const WORLD_WIDTH = 4200;
const GRAVITY = 0.55;
const MAX_FALL = 14;

const input = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};

const state = {
  started: false,
  ended: false,
  won: false,
  score: 0,
  cameraX: 0,
  level: 1,
  lastTime: 0,
  portalOpen: false,
  portalPulse: 0,
  transitioning: false,
  transitionTimer: 0,
  grassAnim: 0
};

const images = {};
const particles = [];

const assetPaths = {
  player: "assets/unicorn_run.png",

  bg1: "assets/background/background_layer_1.png",
  bg2: "assets/background/background_layer_2.png",
  bg3: "assets/background/background_layer_3.png",
  bg4: "assets/background/background_layer_4.png",
  bg5: "assets/background/background_layer_5.png",
  bg6: "assets/background/background_layer_6.png",

  tile_top_left: "assets/dirt_tiles/tile_top_left.png",
  tile_top_center: "assets/dirt_tiles/tile_top_center.png",
  tile_top_right: "assets/dirt_tiles/tile_top_right.png",
  tile_middle_left: "assets/dirt_tiles/tile_middle_left.png",
  tile_middle_center: "assets/dirt_tiles/tile_middle_center.png",
  tile_middle_right: "assets/dirt_tiles/tile_middle_right.png",
  tile_bottom_left: "assets/dirt_tiles/tile_bottom_left.png",
  tile_bottom_center: "assets/dirt_tiles/tile_bottom_center.png",
  tile_bottom_right: "assets/dirt_tiles/tile_bottom_right.png",
  tile_floating: "assets/dirt_tiles/tile_floating.png",

  apple: "assets/food/apple.png",
  avacado: "assets/food/avacado.png",
  banana: "assets/food/banana.png",
  cherry: "assets/food/cherry.png",
  grape: "assets/food/grape.png",
  kiwi: "assets/food/kiwi.png",
  lemon: "assets/food/lemon.png",
  peach: "assets/food/peach.png",
  pear: "assets/food/pear.png",
  pineapple: "assets/food/pineapple.png",
  strawberry: "assets/food/strawberry.png",
  watermelon: "assets/food/watermelon.png",

  hp1: "assets/health_bar/healthbar_1.png",
  hp2: "assets/health_bar/healthbar_2.png",
  hp3: "assets/health_bar/healthbar_3.png",
  hp4: "assets/health_bar/healthbar_4.png",
  hp5: "assets/health_bar/healthbar_5.png",
  hpEmpty: "assets/health_bar/healthbar_empty.png",
};

const foodKeys = [
  "apple", "avacado", "banana", "cherry", "grape", "kiwi",
  "lemon", "peach", "pear", "pineapple", "strawberry", "watermelon"
];

const bgKeys = ["bg6", "bg5", "bg4", "bg3", "bg2", "bg1"];
const bgSpeeds = [0.02, 0.05, 0.09, 0.14, 0.24, 0.38];

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
  facing: 1,
  frame: 0,
  frameTimer: 0,
  spawnX: 120,
  spawnY: 0,
  health: 5,
  invincibleTimer: 0,
};

let groundSegments = [];
let floatingPlatforms = [];
let hazards = [];
let collectibles = [];
let finishZone = { x: WORLD_WIDTH - 220, y: 430, w: 120, h: 160 };

function makeLevel(levelNumber) {
  const groundY = 596;
  const gapBase = levelNumber === 1 ? 56 : 72;

  groundSegments = [
    { x: 0, y: groundY, width: 8, height: 3 },
    { x: 8 * TILE + gapBase, y: groundY + 12, width: 4, height: 3 },
    { x: 12 * TILE + gapBase + 40, y: groundY - 8, width: 5, height: 3 },
    { x: 17 * TILE + gapBase + 78, y: groundY + 10, width: 4, height: 3 },
    { x: 21 * TILE + gapBase + 116, y: groundY - 10, width: 6, height: 3 },
    { x: 27 * TILE + gapBase + 158, y: groundY + 10, width: 4, height: 3 },
    { x: 31 * TILE + gapBase + 195, y: groundY - 8, width: 5, height: 3 },
    { x: 36 * TILE + gapBase + 236, y: groundY, width: 8, height: 3 }
  ];

  floatingPlatforms = [
    { x: 360, y: 500, width: 2 },
    { x: 680, y: 480, width: 2 },
    { x: 980, y: 485, width: 2 },
    { x: 1420, y: 470, width: 2 },
    { x: 1860, y: 490, width: 2 },
    { x: 2300, y: 470, width: 2 },
    { x: 2730, y: 485, width: 2 },
    { x: 3170, y: 468, width: 2 },
    { x: 3580, y: 490, width: 2 }
  ];

  hazards = [
    { x: 770, y: 620, w: 54, h: 28 },
    { x: 1670, y: 618, w: 54, h: 28 },
    { x: 2560, y: 620, w: 54, h: 28 },
    { x: 3380, y: 620, w: 54, h: 28 }
  ];

  collectibles = [
    { x: 390, y: 430 }, { x: 705, y: 410 }, { x: 1010, y: 415 },
    { x: 1250, y: 530 }, { x: 1450, y: 400 }, { x: 1895, y: 420 },
    { x: 2140, y: 530 }, { x: 2320, y: 400 }, { x: 2770, y: 415 },
    { x: 3000, y: 530 }, { x: 3200, y: 398 }, { x: 3630, y: 430 }
  ].map((item, i) => ({
    ...item,
    size: 42,
    collected: false,
    bob: Math.random() * Math.PI * 2,
    spriteKey: foodKeys[i % foodKeys.length],
  }));

  finishZone = { x: WORLD_WIDTH - 180, y: 430, w: 120, h: 160 };
}

function resetWorld(keepHealth = false) {
  state.started = false;
  state.ended = false;
  state.won = false;
  state.cameraX = 0;
  state.lastTime = 0;
  state.portalOpen = false;
  state.portalPulse = 0;
  state.transitioning = false;
  state.transitionTimer = 0;
  particles.length = 0;

  if (!keepHealth) {
    state.score = 0;
    scoreEl.textContent = "0";
    player.health = 5;
  }

  makeLevel(state.level);

  const startGround = groundSegments[0];
  player.x = 120;
  player.y = startGround.y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.facing = 1;
  player.frame = 0;
  player.frameTimer = 0;
  player.invincibleTimer = 0;
  player.spawnX = 120;
  player.spawnY = startGround.y - player.h;

  updateHealthHud();

  startScreen.classList.remove("hidden");
  endScreen.classList.add("hidden");
}

function updateHealthHud() {
  const map = {
    5: "assets/health_bar/healthbar_5.png",
    4: "assets/health_bar/healthbar_4.png",
    3: "assets/health_bar/healthbar_3.png",
    2: "assets/health_bar/healthbar_2.png",
    1: "assets/health_bar/healthbar_1.png",
    0: "assets/health_bar/healthbar_empty.png",
  };
  healthUi.src = map[player.health];
}

function setButtonHold(element, key) {
  const onDown = (event) => {
    event.preventDefault();
    input[key] = true;
    if (key === "jump") input.jumpPressed = true;
  };

  const onUp = (event) => {
    event.preventDefault();
    input[key] = false;
  };

  element.addEventListener("pointerdown", onDown);
  element.addEventListener("pointerup", onUp);
  element.addEventListener("pointerleave", onUp);
  element.addEventListener("pointercancel", onUp);
}

function setupControls() {
  setButtonHold(document.getElementById("left-btn"), "left");
  setButtonHold(document.getElementById("right-btn"), "right");
  setButtonHold(document.getElementById("jump-btn"), "jump");

  window.addEventListener("keydown", (event) => {
    if (event.code === "ArrowLeft" || event.code === "KeyA") input.left = true;
    if (event.code === "ArrowRight" || event.code === "KeyD") input.right = true;
    if (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "Space") {
      if (!input.jump) input.jumpPressed = true;
      input.jump = true;
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "ArrowLeft" || event.code === "KeyA") input.left = false;
    if (event.code === "ArrowRight" || event.code === "KeyD") input.right = false;
    if (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "Space") input.jump = false;
  });
}

function getSolidTiles() {
  const solids = [];

  groundSegments.forEach((seg) => {
    for (let c = 0; c < seg.width; c++) {
      for (let r = 0; r < seg.height; r++) {
        solids.push({
          x: seg.x + c * TILE,
          y: seg.y + r * TILE,
          w: TILE,
          h: TILE,
          type: "ground",
          col: c,
          row: r,
          segWidth: seg.width,
          segHeight: seg.height
        });
      }
    }
  });

  floatingPlatforms.forEach((plat) => {
    for (let c = 0; c < plat.width; c++) {
      solids.push({
        x: plat.x + c * TILE,
        y: plat.y,
        w: TILE,
        h: TILE,
        type: "floating",
        col: c,
        segWidth: plat.width
      });
    }
  });

  return solids;
}

function spawnSparkles(x, y, count = 12) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 3.4,
      vy: (Math.random() - 0.9) * 3.2,
      life: 24 + Math.random() * 12,
      size: 2 + Math.random() * 2,
      color: i % 2 === 0 ? "#fff47d" : "#ff8df5"
    });
  }
}

function damagePlayer(amount = 1) {
  if (player.invincibleTimer > 0 || state.ended || state.transitioning) return;

  player.health -= amount;
  if (player.health < 0) player.health = 0;
  player.invincibleTimer = 70;
  updateHealthHud();

  spawnSparkles(player.x + player.w / 2, player.y + player.h / 2, 14);

  if (player.health <= 0) {
    endGame(false);
    return;
  }

  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
}

function updatePlayer() {
  if (!state.started || state.ended || state.transitioning) return;

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
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;

  const prevX = player.x;
  const prevY = player.y;

  player.x += player.vx;
  player.y += player.vy;
  player.grounded = false;

  const solids = getSolidTiles();

  for (const tile of solids) {
    if (!rectsOverlap(player.x, player.y, player.w, player.h, tile.x, tile.y, tile.w, tile.h)) continue;

    const prevBottom = prevY + player.h;
    const prevTop = prevY;
    const prevRight = prevX + player.w;
    const prevLeft = prevX;

    if (prevBottom <= tile.y + 10 && player.vy >= 0) {
      player.y = tile.y - player.h;
      player.vy = 0;
      player.grounded = true;

      if (tile.type === "ground" && tile.row === 0) {
        player.spawnX = Math.max(tile.x - 10, 40);
        player.spawnY = tile.y - player.h;
      }
      continue;
    }

    if (prevTop >= tile.y + tile.h - 10 && player.vy < 0) {
      player.y = tile.y + tile.h;
      player.vy = 0;
      continue;
    }

    if (prevRight <= tile.x + 10 && player.vx > 0) {
      player.x = tile.x - player.w;
      continue;
    }

    if (prevLeft >= tile.x + tile.w - 10 && player.vx < 0) {
      player.x = tile.x + tile.w;
      continue;
    }
  }

  if (player.y > HEIGHT + 220) {
    damagePlayer(1);
  }

  hazards.forEach((hazard) => {
    if (rectsOverlap(player.x + 18, player.y + 14, player.w - 36, player.h - 24, hazard.x, hazard.y, hazard.w, hazard.h)) {
      damagePlayer(1);
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
      spawnSparkles(item.x + item.size / 2, bobY + item.size / 2, 12);
    }
  });

  state.portalOpen = collectibles.every(item => item.collected);

  if (state.portalOpen && rectsOverlap(player.x, player.y, player.w, player.h, finishZone.x, finishZone.y, finishZone.w, finishZone.h)) {
    startPortalTransition();
  }

  if (player.invincibleTimer > 0) player.invincibleTimer--;

  if (Math.abs(player.vx) > 0.1 || !player.grounded) {
    player.frameTimer += 1;
    if (player.frameTimer > 5) {
      player.frame = (player.frame + 1) % 6;
      player.frameTimer = 0;
    }
  } else {
    player.frame = 0;
    player.frameTimer = 0;
  }

  const targetCamera = clamp(player.x - WIDTH * 0.35, 0, WORLD_WIDTH - WIDTH);
  state.cameraX += (targetCamera - state.cameraX) * 0.12;
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= 1;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function startPortalTransition() {
  if (state.transitioning) return;
  state.transitioning = true;
  state.transitionTimer = 0;
  spawnSparkles(finishZone.x + finishZone.w / 2, finishZone.y + finishZone.h / 2, 28);
}

function updatePortalTransition() {
  if (!state.transitioning) return;

  state.transitionTimer += 1;
  if (state.transitionTimer > 50) {
    if (state.level === 1) {
      state.level = 2;
      resetWorld(true);
      startGame();
    } else {
      endGame(true);
    }
  }
}

function drawBackground() {
  bgKeys.forEach((key, i) => {
    const img = images[key];
    if (!img || !img.width || !img.height) return;

    const speed = bgSpeeds[i];
    const scale = HEIGHT / img.height;
    const drawWidth = img.width * scale;
    const drawHeight = HEIGHT;
    const baseX = -((state.cameraX * speed) % drawWidth);

    for (let j = -1; j < 3; j++) {
      ctx.drawImage(img, baseX + j * drawWidth, HEIGHT - drawHeight, drawWidth, drawHeight);
    }
  });
}

function drawTiles() {
  const solids = getSolidTiles();
  const sway = Math.sin(state.grassAnim) * 2;

  solids.forEach((tile) => {
    if (tile.x + tile.w < state.cameraX - TILE || tile.x > state.cameraX + WIDTH + TILE) return;

    const dx = Math.round(tile.x - state.cameraX);
    const dy = Math.round(tile.y);

    let img;

    if (tile.type === "floating") {
      img = images.tile_floating;
    } else {
      const isTop = tile.row === 0;
      const isBottom = tile.row === tile.segHeight - 1;
      const isLeft = tile.col === 0;
      const isRight = tile.col === tile.segWidth - 1;

      if (isTop && isLeft) img = images.tile_top_left;
      else if (isTop && isRight) img = images.tile_top_right;
      else if (isTop) img = images.tile_top_center;
      else if (isBottom && isLeft) img = images.tile_bottom_left;
      else if (isBottom && isRight) img = images.tile_bottom_right;
      else if (isBottom) img = images.tile_bottom_center;
      else if (isLeft) img = images.tile_middle_left;
      else if (isRight) img = images.tile_middle_right;
      else img = images.tile_middle_center;
    }

    if (img) {
      ctx.drawImage(img, dx, dy, TILE, TILE);

      const isAnimatedTop = tile.type === "floating" || tile.row === 0;
      if (isAnimatedTop) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "#9eff9e";
        ctx.fillRect(dx, dy + 4 + sway, TILE, 4);
        ctx.restore();
      }
    }
  });
}

function drawCollectibles() {
  collectibles.forEach((item) => {
    if (item.collected) return;
    const img = images[item.spriteKey];
    if (!img) return;

    const bobY = item.y + Math.sin(item.bob) * 6;
    const dx = Math.round(item.x - state.cameraX);
    const dy = Math.round(bobY);

    if (dx < -item.size || dx > WIDTH + item.size) return;
    ctx.drawImage(img, dx, dy, item.size, item.size);
  });
}

function drawHazards() {
  hazards.forEach((hazard) => {
    const dx = Math.round(hazard.x - state.cameraX);
    const dy = Math.round(hazard.y);
    if (dx < -hazard.w || dx > WIDTH + hazard.w) return;

    ctx.fillStyle = "#633a90";
    ctx.beginPath();
    ctx.moveTo(dx, dy + hazard.h);
    ctx.lineTo(dx + hazard.w * 0.2, dy);
    ctx.lineTo(dx + hazard.w * 0.4, dy + hazard.h);
    ctx.lineTo(dx + hazard.w * 0.6, dy);
    ctx.lineTo(dx + hazard.w * 0.8, dy + hazard.h);
    ctx.lineTo(dx + hazard.w, dy);
    ctx.lineTo(dx + hazard.w, dy + hazard.h);
    ctx.closePath();
    ctx.fill();
  });
}

function drawPortal() {
  const dx = Math.round(finishZone.x - state.cameraX + finishZone.w / 2);
  const dy = Math.round(finishZone.y + finishZone.h / 2);
  const pulse = Math.sin(state.portalPulse) * 4;
  const outer = 34 + pulse;
  const inner = 20 + pulse * 0.4;

  ctx.save();

  if (!state.portalOpen) {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#7b5ca8";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(dx, dy, outer, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = "#ff7df0";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(dx, dy, outer, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#79f8ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(dx, dy, inner, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const a = state.portalPulse + i * (Math.PI / 3);
      const px = dx + Math.cos(a) * (outer + 4);
      const py = dy + Math.sin(a) * (outer + 4);
      ctx.fillStyle = i % 2 === 0 ? "#fff57c" : "#ffffff";
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
  }

  ctx.restore();
}

function drawParticles() {
  particles.forEach((p) => {
    const dx = Math.round(p.x - state.cameraX);
    const alpha = Math.max(0, p.life / 30);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(dx, Math.round(p.y), p.size, p.size);
    ctx.restore();
  });
}

function drawPlayer() {
  if (!images.player) return;

  const sprite = images.player;
  const columns = 6;
  const rows = 6;
  const frameWidth = sprite.width / columns;
  const frameHeight = sprite.height / rows;

  let frameX = player.frame;
  let frameY = 0;

  if (!player.grounded) {
    frameX = 2;
    frameY = player.facing >= 0 ? 0 : 1;
  } else if (Math.abs(player.vx) > 0.1) {
    frameY = player.facing >= 0 ? 0 : 1;
    frameX = player.frame % columns;
  } else {
    frameX = 0;
    frameY = player.facing >= 0 ? 0 : 1;
  }

  const dx = Math.round(player.x - state.cameraX);
  const dy = Math.round(player.y);

  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 5) % 2 === 0) {
    ctx.globalAlpha = 0.6;
  }

  ctx.drawImage(
    sprite,
    frameX * frameWidth,
    frameY * frameHeight,
    frameWidth,
    frameHeight,
    dx,
    dy,
    player.w,
    player.h
  );

  ctx.globalAlpha = 1;
}

function drawTransition() {
  if (!state.transitioning) return;

  const alpha = Math.min(1, state.transitionTimer / 40);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#0b1d2e");
  sky.addColorStop(1, "#cfe8df");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawBackground();
  drawTiles();
  drawCollectibles();
  drawHazards();
  drawPortal();
  drawParticles();
  drawPlayer();
  drawTransition();
}

function endGame(won) {
  state.ended = true;
  state.won = won;
  endTitle.textContent = won ? "LEVEL CLEAR" : "GAME OVER";
  finalScoreEl.textContent = `Score: ${state.score}`;
  endScreen.classList.remove("hidden");
}

function startGame() {
  startScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  state.started = true;
  state.ended = false;
}

function restartGame() {
  state.level = 1;
  resetWorld(false);
  startGame();
}

function gameLoop(timestamp = 0) {
  const delta = timestamp - state.lastTime;
  state.lastTime = timestamp;

  if (state.started && !state.ended) {
    state.portalPulse += 0.08;
    state.grassAnim += 0.08;
    updatePlayer(delta);
    updateParticles();
    updatePortalTransition();
  }

  draw();
  requestAnimationFrame(gameLoop);
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function init() {
  try {
    await loadAssets();
    setupControls();
    resetWorld(false);

    startBtn.addEventListener("click", startGame);
    restartBtn.addEventListener("click", restartGame);

    requestAnimationFrame(gameLoop);
  } catch (error) {
    console.error(error);
    alert("Some assets failed to load. Check filenames and folder paths.");
  }
}

init();
