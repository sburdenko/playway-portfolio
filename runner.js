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
  sky: "#1b1a16",
  ground: "#3a352a",
  runner: "#e9c46a",
  rock: "#6d6455",
  beast: "#c1553a",
  arrow: "#f2e8cf",
  bolt: "#e8622f",
  line: "rgba(242, 232, 207, 0.22)",
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
    ctx.fillStyle = PALETTE.sky;
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);

    ctx.strokeStyle = PALETTE.line;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
      const x = ((i * 80 - (frame * 0.6) % 80) + 400) % 400;
      ctx.beginPath();
      ctx.moveTo(x, 18);
      ctx.lineTo(x, GROUND - 6);
      ctx.stroke();
    }

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
    window.requestAnimationFrame(loop);
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
  window.requestAnimationFrame(loop);
};

document.querySelectorAll(".runner").forEach(mount);
