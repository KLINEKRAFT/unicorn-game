const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startOverlay = document.getElementById("startOverlay");
const startButton = document.getElementById("startButton");
const scoreValue = document.getElementById("scoreValue");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const jumpBtn = document.getElementById("jumpBtn");

const GAME_WIDTH = 720;
const GAME_HEIGHT = 1280;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

const TILE = 64;
const WORLD_WIDTH = 5200;
const GRAVITY = 0.75;
const MAX_FALL = 20;
const PLAYER_SPEED = 5.5;
const JUMP_POWER = -15;

let gameStarted = false;
let assetsLoaded = false;
let score = 0;
let cameraX = 0;
let frameCount = 0;
let levelComplete = false;

const keys = {
  left: false,
  right: false,
  jump: false
};

function makeImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const images = {
  playerSheet: makeImage("unicorn_run.png"),

  bg1: makeImage("background/background_layer_1.png"),
  bg2: makeImage("background/background_layer_2.png"),
  bg3: makeImage("background/background_layer_3.png"),
  bg4: makeImage("background/background_layer_4.png"),
  bg5: makeImage("background/background_layer_5.png"),
  bg6: makeImage("background/background_layer_6.png"),

  topLeft: makeImage("dirt_tiles/tile_top_left.png"),
  topCenter: makeImage("dirt_tiles/tile_top_center.png"),
  topRight: makeImage("dirt_tiles/tile_top_right.png"),
  middleLeft: makeImage("dirt_tiles/tile_middle_left.png"),
  middleCenter: makeImage("dirt_tiles/tile_middle_center.png"),
  middleRight: makeImage("dirt_tiles/tile_middle_right.png"),
  bottomLeft: makeImage("dirt_tiles/tile_bottom_left.png"),
  bottomCenter: makeImage("dirt_tiles/tile_bottom_center.png"),
  bottomRight: makeImage("dirt_tiles/tile_bottom_right.png"),
  floating: makeImage("dirt_tiles/tile_floating.png"),

  apple: makeImage("food/apple.png"),
  avacado: makeImage("food/avacado.png"),
  banana: makeImage("food/banana.png"),
  cherry: makeImage("food/cherry.png"),
  grape: makeImage("food/grape.png"),
  kiwi: makeImage("food/kiwi.png"),
  lemon: makeImage("food/lemon.png"),
  peach: makeImage("food/peach.png"),
  pear: makeImage("food/pear.png"),
  pineapple: makeImage("food/pineapple.png"),
  strawberry: makeImage("food/strawberry.png"),
  watermelon: makeImage("food/watermelon.png")
};

const bgLayers = [
  { img: images.bg1, speed: 0.1 },
  { img: images.bg2, speed: 0.18 },
  { img: images.bg3, speed: 0.28 },
  { img: images.bg4, speed: 0.4 },
  { img: images.bg5, speed: 0.55 },
  { img: images.bg6, speed: 0.75 }
];

const foodImages = [
  images.apple,
  images.avacado,
  images.banana,
  images.cherry,
  images.grape,
  images.kiwi,
  images.lemon,
  images.peach,
  images.pear,
  images.pineapple,
  images.strawberry,
  images.watermelon
];

function waitForAssets() {
  const list = Object.values(images);
  let loaded = 0;

  return new Promise((resolve) => {
    const done = () => {
      loaded++;
      if (loaded === list.length) resolve();
    };

    list.forEach((img) => {
      if (img.complete) {
        done();
      } else {
        img.onload = done;
        img.onerror = done;
      }
    });
  });
}

const player = {
  x: 140,
  y: 820,
  w: 132,
  h: 132,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1,
  frame: 0,
  frameTick: 0
};

const platforms = [];
const collectibles = [];
const finishFlag = {
  x: WORLD_WIDTH - 220,
  y: 0,
  w: 26,
  h: 260
};

function addGroundSegment(startCol, endCol, topRow, thickness = 4) {
  for (let col = startCol; col <= endCol; col++) {
    for (let row = topRow; row < topRow + thickness; row++) {
      let tile = images.middleCenter;

      const isTop = row === topRow;
      const isBottom = row === topRow + thickness - 1;
      const isLeft = col === startCol;
      const isRight = col === endCol;

      if (isTop && isLeft) tile = images.topLeft;
      else if (isTop && isRight) tile = images.topRight;
      else if (isTop) tile = images.topCenter;
      else if (isBottom && isLeft) tile = images.bottomLeft;
      else if (isBottom && isRight) tile = images.bottomRight;
      else if (isBottom) tile = images.bottomCenter;
      else if (isLeft) tile = images.middleLeft;
      else if (isRight) tile = images.middleRight;

      platforms.push({
        x: col * TILE,
        y: row * TILE,
        w: TILE,
        h: TILE,
        img: tile
      });
    }
  }
}

function addFloatingPlatform(startCol, tilesWide, row) {
  for (let i = 0; i < tilesWide; i++) {
    platforms.push({
      x: (startCol + i) * TILE,
      y: row * TILE,
      w: TILE,
      h: TILE,
      img: images.floating
    });
  }
}

function addCollectible(x, y, points = 10) {
  const img = foodImages[collectibles.length % foodImages.length];
  collectibles.push({
    x,
    y,
    w: 54,
    h: 54,
    img,
    points,
    collected: false,
    bobOffset: Math.random() * Math.PI * 2
  });
}

function buildLevel() {
  platforms.length = 0;
  collectibles.length = 0;

  addGroundSegment(0, 14, 16, 4);
  addGroundSegment(16, 26, 15, 5);
  addGroundSegment(29, 40, 16, 4);
  addGroundSegment(43, 56, 14, 6);
  addGroundSegment(59, 71, 16, 4);
  addGroundSegment(74, 81, 15, 5);

  addFloatingPlatform(8, 3, 12);
  addFloatingPlatform(12, 3, 10);
  addFloatingPlatform(20, 3, 11);
  addFloatingPlatform(24, 2, 9);
  addFloatingPlatform(33, 3, 12);
  addFloatingPlatform(47, 3, 10);
  addFloatingPlatform(52, 2, 8);
  addFloatingPlatform(63, 3, 11);
  addFloatingPlatform(68, 2, 9);

  const spots = [
    [620, 860], [850, 700], [1130, 580], [1460, 650], [1710, 760],
    [2050, 860], [2230, 630], [2510, 540], [2790, 760], [3120, 640],
    [3410, 470], [3650, 760], [3890, 860], [4180, 700], [4470, 600],
    [4790, 820]
  ];

  spots.forEach(([x, y]) => addCollectible(x, y));
  finishFlag.y = 16 * TILE - 260;
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function resetGame() {
  score = 0;
  scoreValue.textContent = score;
  cameraX = 0;
  levelComplete = false;

  player.x = 140;
  player.y = 820;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.facing = 1;
  player.frame = 0;
  player.frameTick = 0;

  buildLevel();
}

function startGame() {
  resetGame();
  gameStarted = true;
  startOverlay.classList.add("hidden");
}

function endGame() {
  gameStarted = false;
  startOverlay.classList.remove("hidden");
  startButton.textContent = "PLAY AGAIN";
}

startButton.addEventListener("click", startGame);

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
  if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW") keys.jump = true;
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW") keys.jump = false;
});

function bindHold(button, keyName) {
  const press = (e) => {
    e.preventDefault();
    keys[keyName] = true;
  };
  const release = (e) => {
    e.preventDefault();
    keys[keyName] = false;
  };

  button.addEventListener("touchstart", press, { passive: false });
  button.addEventListener("touchend", release, { passive: false });
  button.addEventListener("touchcancel", release, { passive: false });
  button.addEventListener("mousedown", press);
  button.addEventListener("mouseup", release);
  button.addEventListener("mouseleave", release);
}

bindHold(leftBtn, "left");
bindHold(rightBtn, "right");

jumpBtn.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    if (player.onGround && gameStarted) {
      player.vy = JUMP_POWER;
      player.onGround = false;
    }
  },
  { passive: false }
);

jumpBtn.addEventListener("mousedown", (e) => {
  e.preventDefault();
  if (player.onGround && gameStarted) {
    player.vy = JUMP_POWER;
    player.onGround = false;
  }
});

function updatePlayer() {
  player.vx = 0;

  if (keys.left) {
    player.vx = -PLAYER_SPEED;
    player.facing = -1;
  }
  if (keys.right) {
    player.vx = PLAYER_SPEED;
    player.facing = 1;
  }

  player.x += player.vx;

  player.onGround = false;
  for (const p of platforms) {
    if (rectsOverlap(player, p)) {
      if (player.vx > 0) {
        player.x = p.x - player.w;
      } else if (player.vx < 0) {
        player.x = p.x + p.w;
      }
    }
  }

  player.vy += GRAVITY;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;
  player.y += player.vy;

  for (const p of platforms) {
    if (rectsOverlap(player, p)) {
      if (player.vy > 0) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      } else if (player.vy < 0) {
        player.y = p.y + p.h;
        player.vy = 0;
      }
    }
  }

  if (player.x < 0) player.x = 0;
  if (player.x + player.w > WORLD_WIDTH) player.x = WORLD_WIDTH - player.w;

  if (player.y > GAME_HEIGHT + 300) {
    endGame();
  }

  for (const item of collectibles) {
    if (!item.collected && rectsOverlap(player, item)) {
      item.collected = true;
      score += item.points;
      scoreValue.textContent = score;
    }
  }

  if (rectsOverlap(player, finishFlag)) {
    levelComplete = true;
    endGame();
  }

  const moving = keys.left || keys.right;
  if (moving) {
    player.frameTick++;
    if (player.frameTick >= 7) {
      player.frame = (player.frame + 1) % 6;
      player.frameTick = 0;
    }
  } else {
    player.frame = 0;
    player.frameTick = 0;
  }
}

function updateCamera() {
  const target = player.x - GAME_WIDTH * 0.35;
  cameraX += (target - cameraX) * 0.12;

  const maxCam = WORLD_WIDTH - GAME_WIDTH;
  if (cameraX < 0) cameraX = 0;
  if (cameraX > maxCam) cameraX = maxCam;
}

function drawParallax() {
  const layers = bgLayers.filter((layer) => layer.img.complete);

  for (const layer of layers) {
    const img = layer.img;
    const scaledHeight = GAME_HEIGHT;
    const scaledWidth = img.width * (scaledHeight / img.height);

    let x = -(cameraX * layer.speed) % scaledWidth;
    if (x > 0) x -= scaledWidth;

    for (let drawX = x; drawX < GAME_WIDTH; drawX += scaledWidth) {
      ctx.drawImage(img, drawX, 0, scaledWidth, scaledHeight);
    }
  }
}

function drawPlatforms() {
  for (const p of platforms) {
    const screenX = p.x - cameraX;
    if (screenX + p.w < -10 || screenX > GAME_WIDTH + 10) continue;
    ctx.drawImage(p.img, screenX, p.y, p.w, p.h);
  }
}

function drawCollectibles() {
  for (const item of collectibles) {
    if (item.collected) continue;
    const screenX = item.x - cameraX;
    if (screenX + item.w < -20 || screenX > GAME_WIDTH + 20) continue;

    const bob = Math.sin(frameCount * 0.08 + item.bobOffset) * 8;
    ctx.drawImage(item.img, screenX, item.y + bob, item.w, item.h);
  }
}

function drawFinish() {
  const x = finishFlag.x - cameraX;
  if (x + finishFlag.w < 0 || x > GAME_WIDTH) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, finishFlag.y, 8, finishFlag.h);

  ctx.fillStyle = "#ff5fa2";
  ctx.beginPath();
  ctx.moveTo(x + 8, finishFlag.y);
  ctx.lineTo(x + 82, finishFlag.y + 34);
  ctx.lineTo(x + 8, finishFlag.y + 68);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  const cols = 6;
  const rows = 6;
  const frameWidth = images.playerSheet.width / cols;
  const frameHeight = images.playerSheet.height / rows;

  const sx = player.frame * frameWidth;
  const sy = 0;

  const dx = player.x - cameraX;
  const dy = player.y;

  ctx.save();

  if (player.facing === -1) {
    ctx.translate(dx + player.w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(
      images.playerSheet,
      sx,
      sy,
      frameWidth,
      frameHeight,
      0,
      0,
      player.w,
      player.h
    );
  } else {
    ctx.drawImage(
      images.playerSheet,
      sx,
      sy,
      frameWidth,
      frameHeight,
      dx,
      dy,
      player.w,
      player.h
    );
  }

  ctx.restore();
}

function drawStartScene() {
  drawParallax();

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(0, GAME_HEIGHT - 220, GAME_WIDTH, 220);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 46px Arial";
  ctx.textAlign = "center";
  ctx.fillText("UNICORN RUN", GAME_WIDTH / 2, 240);

  ctx.font = "28px Arial";
  ctx.fillText("Press Start", GAME_WIDTH / 2, 300);

  if (images.playerSheet.complete) {
    const cols = 6;
    const rows = 6;
    const frameWidth = images.playerSheet.width / cols;
    const frameHeight = images.playerSheet.height / rows;
    ctx.drawImage(
      images.playerSheet,
      0,
      0,
      frameWidth,
      frameHeight,
      GAME_WIDTH / 2 - 120,
      GAME_HEIGHT / 2 - 90,
      240,
      240
    );
  }
}

function drawGame() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawParallax();
  drawPlatforms();
  drawCollectibles();
  drawFinish();
  drawPlayer();

  if (levelComplete) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 42px Arial";
    ctx.fillText("LEVEL COMPLETE!", GAME_WIDTH / 2, 280);
  }
}

function loop() {
  frameCount++;

  if (!assetsLoaded) {
    ctx.fillStyle = "#1b2240";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "30px Arial";
    ctx.fillText("Loading...", GAME_WIDTH / 2, GAME_HEIGHT / 2);
    requestAnimationFrame(loop);
    return;
  }

  if (!gameStarted) {
    drawStartScene();
    requestAnimationFrame(loop);
    return;
  }

  updatePlayer();
  updateCamera();
  drawGame();

  requestAnimationFrame(loop);
}

waitForAssets().then(() => {
  assetsLoaded = true;
  resetGame();
});

loop();
