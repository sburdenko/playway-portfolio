import { onStage } from "./frames.js";

const WORLD = { w: 320, h: 120 };
const GROUND = 96;
const RUNNER_X = 46;
const GRAVITY = 900;
const JUMP = -320;
const SPEED = 108;
const ARROW_SPEED = 260;
const BOLT_SPEED = 150;
const SPAWN_MIN = 0.85;
const SPAWN_MAX = 1.7;
const FIRE_MIN = 0.7;
const FIRE_MAX = 1.5;
const BOLT_Y = GROUND - 7;

const READY = "ready";
const RUNNING = "running";
const OVER = "over";

const ROCK = "rock";
const BEAST = "beast";

const PALETTE = {
  skyTop: "#0e0f0b",
  skyLow: "#4a3a1f",
  sun: "rgba(240, 205, 120, 0.06)",
  cloud: "#3b3220",
  ridge: "#221f16",
  hill: "#2f2819",
  // Early autumn: mostly still green, with roughly a third already turning.
  leafFar: "#2d3a1e",
  leafFarTurned: "#46351b",
  leafNear: "#3f5326",
  leafNearTurned: "#63481f",
  ground: "#241f16",
  runner: "#e9c46a",
  rock: "#6d6455",
  beast: "#c1553a",
  arrow: "#f2e8cf",
  bolt: "#e8622f",
};

// The backdrop repeats over one band, so each layer only needs its items laid
// out once and drawn at two offsets to cover the view.
const BAND = 560;

const spread = (count, make) =>
  Array.from({ length: count }, (_, i) => make(i, (i * BAND) / count + Math.random() * 26));

const RIDGE = spread(6, (i, x) => ({ x, w: 96 + Math.random() * 74, h: 32 + Math.random() * 22 }));
const HILLS = spread(7, (i, x) => ({ x, w: 104 + Math.random() * 70, h: 14 + Math.random() * 12 }));
const CLOUDS = spread(5, (i, x) => ({ x, y: 14 + Math.random() * 22, r: 4 + Math.random() * 3.4 }));

const TREES_FAR = spread(8, (i, x) => ({
  x,
  h: 9 + Math.random() * 6,
  cypress: Math.random() < 0.5,
  turned: Math.random() < 0.32,
}));

const TREES_NEAR = spread(7, (i, x) => ({
  x,
  h: 13 + Math.random() * 9,
  cypress: Math.random() < 0.45,
  turned: Math.random() < 0.32,
}));

const TAU = Math.PI * 2;

// Each layer is laid out once inside BAND and stamped twice, so the parallax
// wraps without ever growing an array.
const eachCopy = (items, travelled, speed, render) => {
  const shift = (travelled * speed) % BAND;
  for (const item of items) {
    const base = item.x - shift;
    for (const x of [base, base + BAND]) {
      if (x < -170 || x > WORLD.w + 170) continue;
      render(item, x);
    }
  }
};

const drawTree = (ctx, x, tree) => {
  if (tree.cypress) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND - tree.h);
    ctx.lineTo(x + tree.h * 0.18, GROUND);
    ctx.lineTo(x - tree.h * 0.18, GROUND);
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.fillRect(x - 0.6, GROUND - tree.h * 0.5, 1.2, tree.h * 0.5);
  ctx.beginPath();
  ctx.arc(x, GROUND - tree.h * 0.66, tree.h * 0.36, 0, TAU);
  ctx.fill();
};

const spawnGap = () => SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
const fireGap = () => FIRE_MIN + Math.random() * (FIRE_MAX - FIRE_MIN);

const mount = (root) => {
  const canvas = root.querySelector(".runner__canvas");
  const scoreOut = root.querySelector("[data-score]");
  const bestOut = root.querySelector("[data-best]");
  const hintOut = root.querySelector(".runner__hint");

  if (!canvas || !scoreOut || !bestOut || !hintOut) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = WORLD.w;
  canvas.height = WORLD.h;

  let phase = READY;
  let runner = { y: GROUND, vy: 0 };
  let things = [];
  let arrows = [];
  let bolts = [];
  let nextSpawn = spawnGap();
  let score = 0;
  let best = 0;
  let last = 0;
  let frame = 0;
  let travelled = 0;

  const skyFill = ctx.createLinearGradient(0, 0, 0, GROUND + 4);
  skyFill.addColorStop(0, PALETTE.skyTop);
  skyFill.addColorStop(1, PALETTE.skyLow);

  const reset = () => {
    runner = { y: GROUND, vy: 0 };
    things = [];
    arrows = [];
    bolts = [];
    nextSpawn = spawnGap();
    score = 0;
    phase = RUNNING;
    root.dataset.phase = RUNNING;
    hintOut.textContent = "Left click jumps · right click shoots";
  };

  const end = () => {
    phase = OVER;
    root.dataset.phase = OVER;
    best = Math.max(best, Math.floor(score));
    bestOut.textContent = String(best);
    hintOut.textContent = "Down. Click to run again.";
  };

  const jump = () => {
    if (phase !== RUNNING) return reset();
    if (runner.y < GROUND) return;
    runner = { ...runner, vy: JUMP };
  };

  const shoot = () => {
    if (phase !== RUNNING) return reset();
    if (arrows.length > 2) return;
    arrows = [...arrows, { x: RUNNER_X + 10, y: runner.y - 8 }];
  };

  const step = (dt) => {
    if (phase !== RUNNING) return;

    score += dt * 10;
    travelled += SPEED * dt;
    scoreOut.textContent = String(Math.floor(score));

    const vy = runner.vy + GRAVITY * dt;
    const y = Math.min(GROUND, runner.y + vy * dt);
    runner = { y, vy: y === GROUND ? 0 : vy };

    nextSpawn -= dt;
    if (nextSpawn <= 0) {
      nextSpawn = spawnGap();
      const kind = Math.random() < 0.55 ? ROCK : BEAST;
      things = [...things, { x: WORLD.w + 12, kind, fire: fireGap() }];
    }

    // A beast only looses a bolt once it is fully on screen and still ahead of
    // the runner, so nothing can spawn a shot already on top of the player.
    const loosed = [];
    things = things
      .map((t) => {
        const x = t.x - SPEED * dt;
        if (t.kind !== BEAST) return { ...t, x };
        const fire = t.fire - dt;
        if (fire > 0 || x > WORLD.w - 6 || x < RUNNER_X + 26) return { ...t, x, fire };
        loosed.push({ x: x - 7, y: BOLT_Y });
        return { ...t, x, fire: fireGap() };
      })
      .filter((t) => t.x > -18);

    arrows = arrows
      .map((a) => ({ ...a, x: a.x + ARROW_SPEED * dt }))
      .filter((a) => a.x < WORLD.w + 10);

    bolts = [...bolts, ...loosed]
      .map((b) => ({ ...b, x: b.x - BOLT_SPEED * dt }))
      .filter((b) => b.x > -10);

    const shotDown = new Set();
    const usedOnBolts = new Set();
    bolts.forEach((b, bi) => {
      arrows.forEach((a, ai) => {
        if (Math.abs(a.x - b.x) < 8 && Math.abs(a.y - b.y) < 7) {
          shotDown.add(bi);
          usedOnBolts.add(ai);
        }
      });
    });

    if (shotDown.size > 0) {
      score += shotDown.size * 6;
      bolts = bolts.filter((_, i) => !shotDown.has(i));
      arrows = arrows.filter((_, i) => !usedOnBolts.has(i));
    }

    const hitBeasts = new Set();
    const spentArrows = new Set();

    things.forEach((t, ti) => {
      if (t.kind !== BEAST) return;
      arrows.forEach((a, ai) => {
        if (Math.abs(a.x - t.x) < 9 && Math.abs(a.y - (GROUND - 8)) < 12) {
          hitBeasts.add(ti);
          spentArrows.add(ai);
        }
      });
    });

    if (hitBeasts.size > 0) {
      score += hitBeasts.size * 12;
      things = things.filter((_, i) => !hitBeasts.has(i));
      arrows = arrows.filter((_, i) => !spentArrows.has(i));
    }

    const clearance = GROUND - runner.y;

    const collided = things.some((t) => {
      if (Math.abs(t.x - RUNNER_X) > 10) return false;
      return t.kind === ROCK ? clearance < 14 : clearance < 10;
    });

    const shot = bolts.some((b) => Math.abs(b.x - RUNNER_X) < 8 && clearance < 12);

    if (collided || shot) end();
  };

  const draw = () => {
    frame += 1;

    ctx.fillStyle = skyFill;
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);

    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(252, 66, 12, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(252, 66, 21, 0, TAU);
    ctx.fill();

    ctx.fillStyle = PALETTE.cloud;
    eachCopy(CLOUDS, travelled, 0.05, (c, x) => {
      ctx.beginPath();
      ctx.arc(x, c.y, c.r, 0, TAU);
      ctx.arc(x + c.r, c.y + 1.4, c.r * 0.78, 0, TAU);
      ctx.arc(x - c.r * 0.95, c.y + 1.7, c.r * 0.66, 0, TAU);
      ctx.fill();
    });

    ctx.fillStyle = PALETTE.ridge;
    eachCopy(RIDGE, travelled, 0.13, (m, x) => {
      ctx.beginPath();
      ctx.moveTo(x - m.w / 2, GROUND);
      ctx.lineTo(x, GROUND - m.h);
      ctx.lineTo(x + m.w / 2, GROUND);
      ctx.closePath();
      ctx.fill();
    });

    eachCopy(TREES_FAR, travelled, 0.24, (t, x) => {
      ctx.fillStyle = t.turned ? PALETTE.leafFarTurned : PALETTE.leafFar;
      drawTree(ctx, x, t);
    });

    ctx.fillStyle = PALETTE.hill;
    eachCopy(HILLS, travelled, 0.34, (h, x) => {
      ctx.beginPath();
      ctx.ellipse(x, GROUND + 1, h.w / 2, h.h, 0, Math.PI, TAU);
      ctx.fill();
    });

    eachCopy(TREES_NEAR, travelled, 0.6, (t, x) => {
      ctx.fillStyle = t.turned ? PALETTE.leafNearTurned : PALETTE.leafNear;
      drawTree(ctx, x, t);
    });

    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, GROUND + 2, WORLD.w, WORLD.h - GROUND);

    ctx.fillStyle = PALETTE.arrow;
    arrows.forEach((a) => ctx.fillRect(a.x, a.y, 7, 2));

    ctx.fillStyle = PALETTE.bolt;
    bolts.forEach((b) => {
      ctx.fillRect(b.x, b.y, 6, 3);
      ctx.fillRect(b.x + 6, b.y + 1, 3, 1);
    });

    things.forEach((t) => {
      if (t.kind === ROCK) {
        ctx.fillStyle = PALETTE.rock;
        ctx.fillRect(t.x - 5, GROUND - 10, 11, 12);
      } else {
        ctx.fillStyle = PALETTE.beast;
        ctx.fillRect(t.x - 6, GROUND - 14, 13, 16);
        ctx.fillStyle = PALETTE.sky;
        ctx.fillRect(t.x - 3, GROUND - 10, 3, 3);
        ctx.fillRect(t.x + 1, GROUND - 10, 3, 3);
      }
    });

    const bob = runner.y === GROUND ? Math.sin(frame * 0.35) * 1.2 : 0;
    ctx.fillStyle = PALETTE.runner;
    ctx.fillRect(RUNNER_X - 6, runner.y - 16 + bob, 12, 18);
    ctx.fillRect(RUNNER_X + 4, runner.y - 12 + bob, 7, 3);
  };

  const loop = (now) => {
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
  };

  canvas.addEventListener("mousedown", (event) => {
    event.preventDefault();
    if (event.button === 2) shoot();
    else jump();
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  canvas.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter" && event.key !== "f") return;
    event.preventDefault();
    if (event.key === "f") shoot();
    else jump();
  });

  root.dataset.phase = READY;
  hintOut.textContent = "Click the strip to start";
  onStage(canvas, loop);
};

document.querySelectorAll(".runner").forEach(mount);
