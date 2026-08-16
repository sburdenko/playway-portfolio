// Every stop on the Fife trail set the visitor a task — load a cannon, build a
// castle, take up the bow. This is that bow: five arrows, a wind that changes
// each shot, and the medal the app hands out at the end.
import { onStage } from "./frames.js";

const WORLD = { w: 100, h: 56 };
const GROUND = 46;
const BOW = { x: 13, y: GROUND - 7 };
const TARGET = { x: 70, y: GROUND - 12, r: 7 };
const GRAVITY = 24;
const WIND_LINES = 7;
const DRAW_SECONDS = 0.85;
const MAX_SPEED = 48;
const ARROWS = 5;

// Rings from the middle out, as a fraction of the target's radius.
const RINGS = [
  { at: 0.2, score: 10, colour: "#ffd76a", name: "gold" },
  { at: 0.4, score: 8, colour: "#ff7ab8", name: "red" },
  { at: 0.6, score: 6, colour: "#70f2d1", name: "blue" },
  { at: 0.8, score: 4, colour: "#8fb6cc", name: "black" },
  { at: 1, score: 2, colour: "#eaf7ff", name: "outer" },
];

const MEDALS = [
  { from: 40, name: "Gold medal", colour: "#ffd76a" },
  { from: 28, name: "Silver medal", colour: "#dfe9f2" },
  { from: 16, name: "Bronze medal", colour: "#d79a63" },
  { from: 0, name: "No medal", colour: "#89a8ba" },
];

const medalFor = (score) => MEDALS.find((medal) => score >= medal.from);

const ringFor = (distance) => {
  const fraction = distance / TARGET.r;
  return RINGS.find((ring) => fraction <= ring.at) ?? null;
};

const mount = (root) => {
  const canvas = root.querySelector(".archer__canvas");
  const stateOut = root.querySelector("[data-shot]");
  const noteOut = root.querySelector("[data-shot-note]");
  const scoreOut = root.querySelector("[data-score]");
  const arrowsOut = root.querySelector("[data-arrows]");
  const windOut = root.querySelector("[data-wind]");
  const againButton = root.querySelector("[data-again]");
  if (!canvas || !stateOut || !noteOut || !scoreOut || !arrowsOut || !windOut || !againButton) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const view = { scale: 1, offsetX: 0, offsetY: 0 };

  const fit = () => {
    const box = canvas.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    view.scale = Math.min(box.width / WORLD.w, box.height / WORLD.h);
    view.offsetX = (box.width - WORLD.w * view.scale) / 2;
    view.offsetY = (box.height - WORLD.h * view.scale) / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const sx = (x) => view.offsetX + x * view.scale;
  const sy = (y) => view.offsetY + y * view.scale;
  const su = (u) => u * view.scale;

  // The bow is either resting or being drawn; arrows look after themselves,
  // so the next one can be nocked while the last is still in the air.
  let phase = "ready";
  let aim = { x: 60, y: GROUND - 22 };
  let power = 0;
  let flying = [];
  let wind = 0;
  let shots = 0;
  let score = 0;
  let landed = [];
  let last = 0;
  let clock = 0;
  let streaks = [];

  const newWind = () => {
    wind = Math.round((Math.random() * 2 - 1) * 5);
    // Streamlines rather than specks: a long line that undulates as it travels
    // and curls at its head reads as moving air, where a short dash reads as an
    // insect.
    streaks = Array.from({ length: WIND_LINES }, () => ({
      x: Math.random() * WORLD.w,
      y: 4 + Math.random() * (GROUND - 13),
      len: 16 + Math.random() * 22,
      amp: 0.5 + Math.random() * 1.3,
      wave: 0.18 + Math.random() * 0.22,
      phase: Math.random() * Math.PI * 2,
      drift: 0.75 + Math.random() * 0.6,
      curl: 0.7 + Math.random() * 0.8,
    }));
  };

  const report = () => {
    scoreOut.textContent = String(score);
    arrowsOut.textContent = `${Math.max(0, ARROWS - shots)}`;
    windOut.textContent = wind === 0 ? "still" : `${Math.abs(wind)} ${wind > 0 ? "→" : "←"}`;
  };

  const finish = () => {
    const medal = medalFor(score);
    phase = "done";
    stateOut.textContent = medal.name;
    noteOut.textContent = `${score} of ${ARROWS * 10} points. In the app this is where the stamp goes on your map.`;
    const metal = medal.name.split(" ")[0].toLowerCase();
    if (metal === "no") delete root.dataset.medal;
    else root.dataset.medal = metal;
  };

  const nextArrow = () => {
    if (shots >= ARROWS) {
      phase = "spent";
      stateOut.textContent = "Last arrow away";
      noteOut.textContent = "Waiting for it to land.";
      return;
    }
    phase = "ready";
    power = 0;
    newWind();
    report();
    stateOut.textContent = `Arrow ${shots + 1} of ${ARROWS}`;
    noteOut.textContent = wind === 0
      ? "No wind on this one. Aim with the pointer, hold to draw, let go to loose."
      : `Wind ${Math.abs(wind)} to the ${wind > 0 ? "right" : "left"}. Aim off it.`;
  };

  const angle = () => Math.atan2(aim.y - BOW.y, aim.x - BOW.x);

  const loose = () => {
    const a = angle();
    const speed = MAX_SPEED * (0.4 + 0.6 * power);
    flying = [...flying, {
      x: BOW.x + Math.cos(a) * 2.4,
      y: BOW.y + Math.sin(a) * 2.4,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      wind,
      best: Infinity,
      inside: false,
    }];
    shots += 1;
    report();
    nextArrow();
  };

  const land = (hit) => {
    landed = [...landed, hit];
    if (hit.ring) {
      score += hit.ring.score;
      stateOut.textContent = `${hit.ring.score} points`;
      noteOut.textContent = `In the ${hit.ring.name}.`;
    } else {
      stateOut.textContent = "Missed";
      noteOut.textContent = "Straight past it. The wind is worth aiming off.";
    }
    report();
  };

  // One arrow's flight. Returns the arrow's next state, or null once it has
  // landed and been scored.
  const advance = (shaft, dt) => {
    const next = {
      ...shaft,
      x: shaft.x + shaft.vx * dt,
      y: shaft.y + shaft.vy * dt,
      vx: shaft.vx + shaft.wind * dt,
      vy: shaft.vy + GRAVITY * dt,
    };
    const heading = Math.atan2(shaft.vy, shaft.vx);

    // Once the arrow is over the target, keep it moving until it stops getting
    // closer to the middle: where it stops is the ring it scored, not the rim
    // it happened to cross first.
    const reach = Math.hypot(next.x - TARGET.x, next.y - TARGET.y);
    if (reach <= TARGET.r) {
      if (reach < shaft.best) return { ...next, best: reach, inside: true };
      land({ x: shaft.x, y: shaft.y, angle: heading, ring: ringFor(shaft.best) });
      return null;
    }
    if (shaft.inside) {
      land({ x: shaft.x, y: shaft.y, angle: heading, ring: ringFor(shaft.best) });
      return null;
    }
    if (next.y >= GROUND || next.x > WORLD.w + 6) {
      land({ x: Math.min(next.x, WORLD.w + 4), y: GROUND, angle: heading, ring: null });
      return null;
    }
    return next;
  };

  const step = (dt) => {
    clock += dt;
    if (phase === "drawing") power = Math.min(1, power + dt / DRAW_SECONDS);

    flying = flying.map((shaft) => advance(shaft, dt)).filter(Boolean);
    if (shots >= ARROWS && flying.length === 0 && phase !== "done") finish();

    streaks = streaks.map((streak) => {
      const x = streak.x + wind * streak.drift * dt * 5;
      const phase = streak.phase + dt * (1.4 + Math.abs(wind) * 0.5);
      const reborn = { ...streak, phase, y: 4 + Math.random() * (GROUND - 13) };
      if (x > WORLD.w + streak.len) return { ...reborn, x: -streak.len };
      if (x < -streak.len) return { ...reborn, x: WORLD.w + streak.len };
      return { ...streak, x, phase };
    });
  };

  const drawTarget = () => {
    [...RINGS].reverse().forEach((ring) => {
      ctx.beginPath();
      ctx.arc(sx(TARGET.x), sy(TARGET.y), su(TARGET.r * ring.at), 0, Math.PI * 2);
      ctx.strokeStyle = ring.colour;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(234, 247, 255, 0.45)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx(TARGET.x), sy(TARGET.y + TARGET.r));
    ctx.lineTo(sx(TARGET.x), sy(GROUND));
    ctx.stroke();
  };

  // A figure holding the bow, rather than a bow floating on its own.
  const drawArcher = () => {
    const hip = { x: BOW.x - 0.6, y: BOW.y + 3.4 };
    const shoulder = { x: BOW.x - 0.6, y: BOW.y + 0.4 };
    ctx.strokeStyle = "rgba(234, 247, 255, 0.8)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx(hip.x), sy(hip.y));
    ctx.lineTo(sx(shoulder.x), sy(shoulder.y));
    ctx.moveTo(sx(hip.x), sy(hip.y));
    ctx.lineTo(sx(hip.x - 1.5), sy(GROUND));
    ctx.moveTo(sx(hip.x), sy(hip.y));
    ctx.lineTo(sx(hip.x + 1.6), sy(GROUND));
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sx(shoulder.x), sy(shoulder.y - 1.5), su(1.05), 0, Math.PI * 2);
    ctx.stroke();

    // Front arm out to the grip, back arm following the string.
    const a = angle();
    const pull = 1.6 + power * 2.2;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx(shoulder.x), sy(shoulder.y));
    ctx.lineTo(sx(BOW.x), sy(BOW.y));
    ctx.moveTo(sx(shoulder.x), sy(shoulder.y));
    ctx.lineTo(sx(BOW.x - Math.cos(a) * pull), sy(BOW.y - Math.sin(a) * pull));
    ctx.stroke();
  };

  const drawBow = () => {
    const a = angle();
    const pull = su(1.6 + power * 2.2);
    const bx = sx(BOW.x);
    const by = sy(BOW.y);

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(a);
    ctx.strokeStyle = "#eaf7ff";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, su(3.4), -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();

    // String, pulled back by however long the shot has been held.
    const tipY = Math.sin(Math.PI * 0.42) * su(3.4);
    const tipX = Math.cos(Math.PI * 0.42) * su(3.4);
    ctx.strokeStyle = "rgba(234, 247, 255, 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tipX, -tipY);
    ctx.lineTo(-pull, 0);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    if (phase === "ready" || phase === "drawing") {
      ctx.strokeStyle = "#70f2d1";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-pull, 0);
      ctx.lineTo(su(3.6), 0);
      ctx.stroke();
    }
    ctx.restore();

    if (phase === "drawing") {
      ctx.strokeStyle = "rgba(112, 242, 209, 0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx(4), sy(GROUND + 4));
      ctx.lineTo(sx(4 + 16 * power), sy(GROUND + 4));
      ctx.stroke();
    }
  };

  // The air itself, moving: each line trails away behind its head, waves as it
  // goes, and curls over at the front the way a gust does. Everything about it
  // — speed, wave height, how tightly it curls — comes off the wind's strength.
  const drawWind = () => {
    if (wind === 0) return;
    const strength = Math.min(1, Math.abs(wind) / 5);
    const dir = Math.sign(wind);

    streaks.forEach((streak) => {
      const length = streak.len * (0.45 + strength * 0.75);
      const tailX = streak.x - dir * length;
      const grad = ctx.createLinearGradient(sx(tailX), 0, sx(streak.x), 0);
      grad.addColorStop(0, "rgba(112, 242, 209, 0)");
      grad.addColorStop(0.65, `rgba(112, 242, 209, ${0.09 + strength * 0.16})`);
      grad.addColorStop(1, `rgba(112, 242, 209, ${0.16 + strength * 0.3})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;

      ctx.beginPath();
      const steps = 30;
      let headY = streak.y;
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const x = tailX + dir * length * t;
        // The wave is flat where the line thins out and deepest in the middle.
        const swell = Math.sin(Math.PI * t) * streak.amp * (0.35 + strength);
        const y = streak.y + Math.sin(x * streak.wave + streak.phase) * swell;
        if (i === 0) ctx.moveTo(sx(x), sy(y));
        else ctx.lineTo(sx(x), sy(y));
        headY = y;
      }
      ctx.stroke();

      // The curl at the head, opening the way the wind blows.
      const radius = streak.curl * (0.4 + strength * 1.1);
      const spin = Math.sin(streak.phase) > 0 ? 1 : -1;
      ctx.strokeStyle = `rgba(112, 242, 209, ${0.14 + strength * 0.26})`;
      ctx.beginPath();
      ctx.arc(
        sx(streak.x + dir * radius * 0.2),
        sy(headY - spin * radius),
        su(radius),
        spin > 0 ? Math.PI * 0.15 : -Math.PI * 0.15,
        spin > 0 ? Math.PI * 1.35 : -Math.PI * 1.35,
        spin < 0,
      );
      ctx.stroke();
    });
  };

  const drawArrow = (shaft, colour) => {
    ctx.save();
    ctx.translate(sx(shaft.x), sy(shaft.y));
    ctx.rotate(shaft.angle);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(su(-3.2), 0);
    ctx.lineTo(su(0.6), 0);
    ctx.stroke();
    ctx.restore();
  };

  const draw = () => {
    const box = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, box.width, box.height);

    ctx.strokeStyle = "rgba(234, 247, 255, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(GROUND));
    ctx.lineTo(sx(WORLD.w), sy(GROUND));
    ctx.stroke();

    drawWind();
    drawTarget();
    landed.forEach((shaft) => drawArrow(shaft, shaft.ring ? shaft.ring.colour : "rgba(234, 247, 255, 0.35)"));
    flying.forEach((shaft) => drawArrow({ ...shaft, angle: Math.atan2(shaft.vy, shaft.vx) }, "#eaf7ff"));
    drawArcher();
    drawBow();
  };

  const loop = (now) => {
    if (view.scale === 1 && canvas.width === 0) fit();
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
  };

  const track = (event) => {
    const box = canvas.getBoundingClientRect();
    aim = {
      x: (event.clientX - box.left - view.offsetX) / view.scale,
      y: (event.clientY - box.top - view.offsetY) / view.scale,
    };
  };

  canvas.addEventListener("pointermove", (event) => {
    if (phase === "ready" || phase === "drawing") track(event);
  });

  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    if (phase !== "ready") return;
    track(event);
    phase = "drawing";
    power = 0;
  });

  const release = () => {
    if (phase === "drawing") loose();
  };

  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  canvas.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (phase === "ready") { phase = "drawing"; power = 0; }
      else if (phase === "drawing") loose();
      return;
    }
    const lean = event.key === "ArrowUp" ? -1.4 : event.key === "ArrowDown" ? 1.4 : 0;
    if (lean === 0) return;
    event.preventDefault();
    aim = { x: aim.x, y: aim.y + lean };
  });

  againButton.addEventListener("click", () => {
    shots = 0;
    score = 0;
    landed = [];
    flying = [];
    delete root.dataset.medal;
    nextArrow();
  });

  fit();
  nextArrow();
  if (typeof ResizeObserver === "function") new ResizeObserver(fit).observe(canvas);
  else window.addEventListener("resize", fit);

  onStage(canvas, loop);
};

document.querySelectorAll(".archer").forEach(mount);
