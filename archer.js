// Every stop on the Fife trail set the visitor a task — load a cannon, build a
// castle, take up the bow. This is that bow: five arrows, a wind that changes
// each shot, and the medal the app hands out at the end.
const WORLD = { w: 100, h: 56 };
const GROUND = 46;
const BOW = { x: 13, y: GROUND - 7 };
const TARGET = { x: 70, y: GROUND - 12, r: 7 };
const GRAVITY = 24;
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

  // ready → drawing → flying → landed → (next arrow, or done)
  let phase = "ready";
  let aim = { x: 60, y: GROUND - 22 };
  let power = 0;
  let arrow = null;
  let wind = 0;
  let shots = 0;
  let score = 0;
  let landed = [];
  let last = 0;
  let settle = 0;

  const newWind = () => {
    wind = Math.round((Math.random() * 2 - 1) * 5);
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
    root.dataset.medal = medal.name.split(" ")[0].toLowerCase();
  };

  const nextArrow = () => {
    if (shots >= ARROWS) {
      finish();
      return;
    }
    phase = "ready";
    power = 0;
    arrow = null;
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
    arrow = {
      x: BOW.x + Math.cos(a) * 2.4,
      y: BOW.y + Math.sin(a) * 2.4,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      best: Infinity,
      inside: false,
    };
    phase = "flying";
    shots += 1;
    report();
  };

  const land = (hit) => {
    landed = [...landed, hit];
    phase = "landed";
    settle = 0;
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

  const step = (dt) => {
    if (phase === "drawing") power = Math.min(1, power + dt / DRAW_SECONDS);

    if (phase === "flying" && arrow) {
      const next = {
        x: arrow.x + arrow.vx * dt,
        y: arrow.y + arrow.vy * dt,
        vx: arrow.vx + wind * dt,
        vy: arrow.vy + GRAVITY * dt,
      };

      // Once the arrow is over the target, keep it moving until it stops
      // getting closer to the middle: where it stops is the ring it scored,
      // not the rim it happened to cross first.
      const reach = Math.hypot(next.x - TARGET.x, next.y - TARGET.y);
      if (reach <= TARGET.r) {
        next.inside = true;
        if (reach < arrow.best) {
          next.best = reach;
        } else {
          land({ x: arrow.x, y: arrow.y, angle: Math.atan2(arrow.vy, arrow.vx), ring: ringFor(arrow.best) });
          arrow = null;
          return;
        }
      } else if (arrow.inside) {
        land({ x: arrow.x, y: arrow.y, angle: Math.atan2(arrow.vy, arrow.vx), ring: ringFor(arrow.best) });
        arrow = null;
        return;
      }

      if (next.y >= GROUND || next.x > WORLD.w + 6) {
        land({ x: Math.min(next.x, WORLD.w + 4), y: GROUND, angle: Math.atan2(arrow.vy, arrow.vx), ring: null });
        arrow = null;
        return;
      }
      arrow = { ...next, best: Math.min(arrow.best, next.best ?? Infinity), inside: next.inside || arrow.inside };
    }

    if (phase === "landed") {
      settle += dt;
      if (settle > 1.1) nextArrow();
    }
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

    if (phase !== "flying") {
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

    drawTarget();
    landed.forEach((shaft) => drawArrow(shaft, shaft.ring ? shaft.ring.colour : "rgba(234, 247, 255, 0.35)"));
    if (arrow) drawArrow({ ...arrow, angle: Math.atan2(arrow.vy, arrow.vx) }, "#eaf7ff");
    drawBow();

    if (wind !== 0 && phase !== "done") {
      ctx.strokeStyle = "rgba(112, 242, 209, 0.5)";
      ctx.lineWidth = 1;
      const y = sy(8);
      const from = sx(42 - wind * 1.4);
      const to = sx(42 + wind * 1.4);
      ctx.beginPath();
      ctx.moveTo(from, y);
      ctx.lineTo(to, y);
      ctx.lineTo(to - Math.sign(wind) * su(1.4), y - su(0.9));
      ctx.stroke();
    }
  };

  const loop = (now) => {
    if (view.scale === 1 && canvas.width === 0) fit();
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    window.requestAnimationFrame(loop);
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
    delete root.dataset.medal;
    nextArrow();
  });

  fit();
  nextArrow();
  if (typeof ResizeObserver === "function") new ResizeObserver(fit).observe(canvas);
  else window.addEventListener("resize", fit);

  window.requestAnimationFrame(loop);
};

document.querySelectorAll(".archer").forEach(mount);
