const WORLD = { w: 180, h: 260 };
const SHIP_Y = WORLD.h - 26;
const SHIP_SPEED = 108;
const SHOT_SPEED = 210;
const SHOT_GAP = 0.24;
const DIVE_SPEED = 58;
const FORMATION_ROWS = 3;
const FORMATION_COLS = 7;
const SWAY = 13;

const READY = "ready";
const RUNNING = "running";
const OVER = "over";

const PALETTE = {
  void: "#060a1c",
  star: "rgba(207, 225, 255, 0.75)",
  ship: "#60d8ff",
  shipGlow: "rgba(96, 216, 255, 0.28)",
  shot: "#eff4ff",
  foe: "#c06fff",
  foeDive: "#ff7ab8",
  spark: "#ffd76a",
};

const STARS = Array.from({ length: 34 }, () => ({
  x: Math.random() * WORLD.w,
  y: Math.random() * WORLD.h,
  z: 0.35 + Math.random() * 1,
}));

const buildWave = (wave) => {
  const foes = [];
  for (let r = 0; r < FORMATION_ROWS; r += 1) {
    for (let c = 0; c < FORMATION_COLS; c += 1) {
      foes.push({
        hx: 22 + c * 23,
        hy: 34 + r * 20,
        x: 22 + c * 23,
        y: 34 + r * 20,
        diving: false,
        vx: 0,
        vy: 0,
        wave,
      });
    }
  }
  return foes;
};

const mount = (root) => {
  const canvas = root.querySelector(".scavenger__canvas");
  const scoreOut = root.querySelector("[data-score]");
  const waveOut = root.querySelector("[data-wave]");
  const hintOut = root.querySelector(".scavenger__hint");

  if (!canvas || !scoreOut || !waveOut || !hintOut) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = WORLD.w;
  canvas.height = WORLD.h;

  let phase = READY;
  let shipX = WORLD.w / 2;
  let aimX = WORLD.w / 2;
  let shots = [];
  let foes = [];
  let sparks = [];
  let wave = 1;
  let score = 0;
  let clock = 0;
  let cooldown = 0;
  let diveTimer = 1.6;
  let last = 0;

  const setPhase = (next, message) => {
    phase = next;
    root.dataset.phase = next;
    hintOut.textContent = message;
  };

  const reset = () => {
    shipX = WORLD.w / 2;
    aimX = WORLD.w / 2;
    shots = [];
    sparks = [];
    wave = 1;
    score = 0;
    clock = 0;
    diveTimer = 1.6;
    foes = buildWave(wave);
    scoreOut.textContent = "0";
    waveOut.textContent = "1";
    setPhase(RUNNING, "Move to aim · hold to fire");
  };

  const burst = (x, y, colour) => {
    for (let i = 0; i < 7; i += 1) {
      sparks = [
        ...sparks,
        {
          x,
          y,
          vx: (Math.random() - 0.5) * 90,
          vy: (Math.random() - 0.5) * 90,
          life: 0.42,
          colour,
        },
      ];
    }
  };

  const step = (dt) => {
    if (phase !== RUNNING) return;

    clock += dt;

    const toward = aimX - shipX;
    const reach = SHIP_SPEED * dt;
    shipX += Math.abs(toward) < reach ? toward : Math.sign(toward) * reach;
    shipX = Math.max(10, Math.min(WORLD.w - 10, shipX));

    cooldown -= dt;
    if (cooldown <= 0) {
      cooldown = SHOT_GAP;
      shots = [...shots, { x: shipX, y: SHIP_Y - 8 }];
    }

    shots = shots
      .map((s) => ({ ...s, y: s.y - SHOT_SPEED * dt }))
      .filter((s) => s.y > -6);

    const sway = Math.sin(clock * 1.15) * SWAY;

    diveTimer -= dt;
    const shouldDive = diveTimer <= 0 && foes.some((f) => !f.diving);
    if (shouldDive) {
      diveTimer = Math.max(0.5, 1.7 - wave * 0.12);
      const resting = foes.filter((f) => !f.diving);
      const pick = resting[Math.floor(Math.random() * resting.length)];
      pick.diving = true;
      pick.vx = (shipX - pick.x) * 0.35;
      pick.vy = DIVE_SPEED + wave * 5;
    }

    foes = foes
      .map((f) => {
        if (!f.diving) return { ...f, x: f.hx + sway, y: f.hy };
        return { ...f, x: f.x + f.vx * dt, y: f.y + f.vy * dt };
      })
      .filter((f) => f.y < WORLD.h + 14);

    const hitFoes = new Set();
    const spentShots = new Set();
    foes.forEach((f, fi) => {
      shots.forEach((s, si) => {
        if (hitFoes.has(fi) || spentShots.has(si)) return;
        if (Math.abs(s.x - f.x) < 7 && Math.abs(s.y - f.y) < 8) {
          hitFoes.add(fi);
          spentShots.add(si);
        }
      });
    });

    if (hitFoes.size > 0) {
      foes.forEach((f, i) => {
        if (hitFoes.has(i)) burst(f.x, f.y, f.diving ? PALETTE.foeDive : PALETTE.foe);
      });
      score += hitFoes.size * (10 + wave * 2);
      foes = foes.filter((_, i) => !hitFoes.has(i));
      shots = shots.filter((_, i) => !spentShots.has(i));
      scoreOut.textContent = String(score);
    }

    sparks = sparks
      .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, life: p.life - dt }))
      .filter((p) => p.life > 0);

    const struck = foes.some(
      (f) => Math.abs(f.x - shipX) < 9 && Math.abs(f.y - SHIP_Y) < 10,
    );

    if (struck) {
      burst(shipX, SHIP_Y, PALETTE.ship);
      setPhase(OVER, `Lost at ${score}. Move to launch again.`);
      return;
    }

    if (foes.length === 0) {
      wave += 1;
      waveOut.textContent = String(wave);
      diveTimer = 1.2;
      foes = buildWave(wave);
    }
  };

  const draw = () => {
    ctx.fillStyle = PALETTE.void;
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);

    STARS.forEach((s) => {
      const y = (s.y + clock * 14 * s.z) % WORLD.h;
      ctx.fillStyle = PALETTE.star;
      ctx.globalAlpha = 0.25 + s.z * 0.45;
      ctx.fillRect(s.x, y, 1, s.z > 0.9 ? 2 : 1);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = PALETTE.shot;
    shots.forEach((s) => ctx.fillRect(s.x - 0.5, s.y, 1.6, 5));

    foes.forEach((f) => {
      ctx.fillStyle = f.diving ? PALETTE.foeDive : PALETTE.foe;
      ctx.fillRect(f.x - 5, f.y - 3, 10, 6);
      ctx.fillRect(f.x - 7, f.y - 1, 3, 3);
      ctx.fillRect(f.x + 4, f.y - 1, 3, 3);
      ctx.fillRect(f.x - 1.5, f.y + 3, 3, 2);
    });

    sparks.forEach((p) => {
      ctx.fillStyle = p.colour;
      ctx.globalAlpha = Math.max(0, p.life / 0.42);
      ctx.fillRect(p.x, p.y, 1.6, 1.6);
    });
    ctx.globalAlpha = 1;

    if (phase !== OVER) {
      ctx.fillStyle = PALETTE.shipGlow;
      ctx.beginPath();
      ctx.arc(shipX, SHIP_Y, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = PALETTE.ship;
      ctx.beginPath();
      ctx.moveTo(shipX, SHIP_Y - 8);
      ctx.lineTo(shipX + 6, SHIP_Y + 5);
      ctx.lineTo(shipX, SHIP_Y + 2);
      ctx.lineTo(shipX - 6, SHIP_Y + 5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = PALETTE.spark;
      ctx.fillRect(shipX - 1, SHIP_Y + 4, 2, 2 + Math.sin(clock * 22) * 1.4);
    }
  };

  const loop = (now) => {
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    window.requestAnimationFrame(loop);
  };

  const aimFrom = (event) => {
    const box = canvas.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    aimX = ((point.clientX - box.left) / box.width) * WORLD.w;
    if (phase !== RUNNING) reset();
  };

  canvas.addEventListener("mousemove", aimFrom);
  canvas.addEventListener("mousedown", aimFrom);
  canvas.addEventListener("touchstart", (event) => {
    event.preventDefault();
    aimFrom(event);
  });
  canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();
    aimFrom(event);
  });

  canvas.addEventListener("keydown", (event) => {
    const nudge = event.key === "ArrowLeft" ? -14 : event.key === "ArrowRight" ? 14 : 0;
    if (nudge === 0) return;
    event.preventDefault();
    if (phase !== RUNNING) return reset();
    aimX = Math.max(10, Math.min(WORLD.w - 10, aimX + nudge));
  });

  foes = buildWave(1);
  setPhase(READY, "Move across the screen to launch");
  window.requestAnimationFrame(loop);
};

document.querySelectorAll(".scavenger").forEach(mount);
