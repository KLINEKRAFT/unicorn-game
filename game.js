const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const startScreen = document.getElementById("start-screen");
const endScreen = document.getElementById("end-screen");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const endTitle = document.getElementById("end-title");
const scoreEl = document.getElementById("score");
const finalScoreEl = document.getElementById("final-score");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TILE = 64;
const WORLD_WIDTH = 5000;
const GRAVITY = 0.55;
const MAX_FALL = 15;

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
  lastTime: 0,
};

const images = {};

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

const bgKeys = ["bg1", "bg2", "bg3", "bg4", "bg5", "bg6"];
const bgSpeeds = [0.05, 0.09, 0.14, 0.22, 0.32, 0.45];

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
  speed: 4.4,
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
let finishZone = { x: WORLD_WIDTH - 260, y: 420, w: 100, h: 180 };

function resetWorld() {
  state.started = false;
  state.ended = false;
  state.won = false;
  state.score = 0;
  state.cameraX = 0;
  state.lastTime = 0;
  scoreEl.textContent = "0";

  groundSegments = [
    { x: 0, y: 592, width: 7, height: 3 },
    { x: 520, y: 640, width: 2, height: 2 },
    { x: 710, y: 610, width: 4, height: 3 },
    { x: 1090, y: 670, width: 2, height: 2 },
    { x: 1300, y: 590, width: 5, height: 3 },
    { x: 1850, y: 645, width: 2, height: 2 },
    { x: 2040, y: 610, width: 4, height: 3 },
    { x: 2460, y: 680, width: 2, height: 2 },
    { x: 2660, y: 600, width: 5, height: 3 },
    { x: 3240, y: 640, width: 2, height: 2 },
    { x: 3440, y: 590, width: 5, height: 3 },
    { x: 4040, y: 635, width: 2, height: 2 },
    { x: 4240, y: 600, width: 6, height: 3 }
  ];

  floatingPlatforms = [
    { x: 300, y: 470, width: 2 },
    { x: 760, y: 420, width: 2 },
    { x: 1180, y: 500, width: 2 },
    { x: 1530, y: 430, width: 2 },
    { x: 2140, y: 470, width: 2 },
    { x: 2780, y: 430, width: 2 },
    { x: 3560, y: 410, width: 2 },
    { x: 4320, y: 445, width: 2 }
  ];

  hazards = [
    { x: 640, y: 610, w: 60, h: 34 },
    { x: 1235, y: 640, w: 60, h: 34 },
    { x: 1980, y: 615, w: 60, h: 34 },
    { x: 2610, y: 650, w: 60, h: 34 },
    { x: 3360, y: 615, w: 60, h: 34 },
    { x: 4180, y: 625, w: 60, h: 34 }
  ];

  collectibles = [
    { x: 360, y: 400 }, { x: 460, y: 400 }, { x: 820, y: 350 },
    { x: 1225, y: 430 }, { x: 1590, y: 360 }, { x: 1720, y: 360 },
    { x: 2200, y: 410 }, { x: 2420, y: 560 }, { x: 2840, y: 360 },
    { x: 3610, y: 340 }, { x: 4390, y: 380 }, { x: 4660, y: 530 }
  ].map((item, i) => ({
    ...item,
    size: 42,
    collected: false,
    bob: Math.random() * Math.PI * 2,
    spriteKey: foodKeys[i % foodKeys.length],
  }));

  const startGround = groundSegments[0];
  player.x = 120;
  player.y = startGround.y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.facing = 1;
  player.frame = 0;
  player.frameTimer = 0;
  player.health = 5;
  player.invincibleTimer = 0;
  player.spawnX = 120;
  player.spawnY = startGround.y - player.h;

  finishZone = { x: WORLD_WIDTH - 180, y: 420, w: 100, h: 180 };

  startScreen.classList.remove("hidden");
  endScreen.classList.add("hidden");
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

function damagePlayer(amount = 1) {
  if (player.invincibleTimer > 0 || state.ended) return;

  player.health -= amount;
  player.invincibleTimer = 70;

  if (player.health <= 0) {
    player.health = 0;
    endGame(false);
    return;
  }

  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
}

function updatePlayer() {
  if (!state.started || state.ended) return;

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

  if (player.y > HEIGHT + 250) {
    damagePlayer(1);
  }

  hazards.forEach((hazard) => {
    if (rectsOverlap(player.x + 16, player.y + 10, player.w - 32, player.h - 18, hazard.x, hazard.y, hazard.w, hazard.h)) {
      damagePlayer(1);
    }
  });

  collectibles.forEach((item) => {
    item.bob += 0.08;
    if (item.collected) return;

    const bobY = item.y + Math.sin(item.bob) * 6;

    if (
      rectsOverlap(
        player.x + 18,
        player.y + 16,
        player.w - 36,
        player.h - 28,
        item.x,
        bobY,
        item.size,
        item.size
      )
    ) {
      item.collected = true;
      state.score += 10;
      scoreEl.textContent = String(state.score);
    }
  });

  if (rectsOverlap(player.x, player.y, player.w, player.h, finishZone.x, finishZone.y, finishZone.w, finishZone.h)) {
    endGame(true);
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
      ctx.drawImage(
        img,
        baseX + j * drawWidth,
        HEIGHT - drawHeight,
        drawWidth,
        drawHeight
      );
    }
  });
}

function drawTiles() {
  const solids = getSolidTiles();

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
    } else {
      ctx.fillStyle = "#7a4d30";
      ctx.fillRect(dx, dy, TILE, TILE);
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

    ctx.fillStyle = "#5c3a8e";
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

function drawFinish() {
  const dx = Math.round(finishZone.x - state.cameraX);
  ctx.fillStyle = "#ffe98d";
  ctx.fillRect(dx + 32, finishZone.y, 8, finishZone.h);
  ctx.fillStyle = "#ff7ad9";
  ctx.fillRect(dx + 40, finishZone.y + 10, 40, 26);
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

function drawHealthBar() {
  const keyMap = {
    5: "hp5",
    4: "hp4",
    3: "hp3",
    2: "hp2",
    1: "hp1",
    0: "hpEmpty",
  };

  const img = images[keyMap[player.health]];
  if (!img) return;

  const drawWidth = 150;
  const scale = drawWidth / img.width;
  const drawHeight = img.height * scale;

  ctx.drawImage(img, WIDTH - drawWidth - 16, 12, drawWidth, drawHeight);
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawTiles();
  drawCollectibles();
  drawHazards();
  drawFinish();
  drawPlayer();
  drawHealthBar();
}

function endGame(won) {
  state.ended = true;
  state.won = won;
  endTitle.textContent = won ? "Level Complete" : "Game Over";
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
  resetWorld();
  startGame();
}

function gameLoop(timestamp = 0) {
  const delta = timestamp - state.lastTime;
  state.lastTime = timestamp;

  if (state.started && !state.ended) {
    updatePlayer(delta);
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
    resetWorld();

    startBtn.addEventListener("click", startGame);
    restartBtn.addEventListener("click", restartGame);

    requestAnimationFrame(gameLoop);
  } catch (error) {
    console.error(error);
    alert("Some assets failed to load. Check filenames and folder paths.");
  }
}

init();
