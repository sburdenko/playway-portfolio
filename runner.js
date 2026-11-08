import { onStage } from "./frames.js";

const W = 960;
const H = 480;
const X = 175;
const FLOOR = 365;
const SPEED = 245;
const CLIFF = 5700;
const FINISH = 9500;

// Knee and hoof offsets for push-off, suspension, reach and ground contact.
const GALLOP = [
  [[-15, 12, -27, 25], [18, 8, 28, 19]],
  [[-21, 7, -33, 14], [12, 12, 8, 27]],
  [[-10, 4, -2, 10], [-2, 13, -14, 27]],
  [[10, 9, 20, 21], [-15, 8, -25, 15]],
  [[7, 14, 4, 29], [0, 3, 11, 9]],
  [[-5, 14, -13, 28], [17, 5, 30, 12]],
];

// Fixed opening encounters give each jump a readable approach and landing.
const PLATFORMS = [
  [0, 1050, 365], [1160, 720, 345], [2000, 840, 365],
  [2960, 780, 345], [3860, 780, 365], [4760, 940, 345],
];
const ENCOUNTERS = [
  [690, "spikes"], [1420, "enemy"], [1700, "spikes"],
  [2240, "enemy"], [2580, "spikes"], [3230, "spikes"],
  [3500, "enemy"], [4100, "enemy"], [4440, "spikes"],
  [5010, "enemy"], [5380, "spikes"],
];
const GATES = [
  [6600, 250], [7060, 190], [7520, 275], [7980, 205], [8440, 260], [8900, 185],
];

const mount = (root) => {
  const canvas = root.querySelector(".runner__canvas");
  const ctx = canvas.getContext("2d");
  const scoreOut = root.querySelector("[data-score]");
  const bestOut = root.querySelector("[data-best]");
  const hint = root.querySelector(".runner__hint");
  const action = root.querySelector(".runner__action");
  const stageOut = root.querySelector("[data-stage]");
  canvas.width = W;
  canvas.height = H;
  let phase = "ready";
  let mode = "run";
  let distance = 0;
  let y = FLOOR;
  let vy = 0;
  let grounded = true;
  let enemies = [];
  let arrows = [];
  let sparks = [];
  let cooldown = 0;
  let flightTime = 0;
  let wing = 0;
  let best = 0;
  let time = 0;
  let last = 0;
  let landing = 0;
  let jumpTime = 0;

  const setPhase = (value) => {
    phase = value;
    root.dataset.phase = value;
  };
  const reset = () => {
    distance = 0;
    time = 0;
    landing = 0;
    jumpTime = 0;
    y = FLOOR;
    vy = 0;
    grounded = true;
    mode = "run";
    flightTime = 0;
    wing = 0;
    cooldown = 0;
    arrows = [];
    sparks = [];
    enemies = ENCOUNTERS.map(([x, kind]) => ({ x, kind, alive: true,
      y: PLATFORMS.find(([start, width]) => x >= start && x <= start + width)[2] }));
    setPhase("running");
    root.dataset.mode = mode;
    scoreOut.textContent = "0";
    stageOut.textContent = "I · The sacred grove";
    action.textContent = "Jump";
    hint.textContent = "Tap / Space to jump · arrows fire automatically";
  };
  const finish = (won = false) => {
    setPhase(won ? "complete" : "over");
    best = Math.max(best, Math.floor(distance / 10));
    bestOut.textContent = best;
    action.textContent = "Run again";
    hint.textContent = won ? "The sanctuary is reached. Run again?" : "Tap / Space to try again";
  };
  const input = () => {
    if (phase !== "running") { reset(); return; }
    if (mode === "flight") {
      vy = -240;
      wing = 1;
    } else if (grounded && mode === "run") {
      vy = -540;
      jumpTime = 0;
      landing = 0;
      grounded = false;
    }
  };
  const burst = (x, yy) => {
    for (let i = 0; i < 12; i++) sparks.push({ x, y: yy,
      vx: Math.cos(i * Math.PI / 6) * 90, vy: Math.sin(i * Math.PI / 6) * 90, life: .5 });
  };
  const step = (dt) => {
    if (phase !== "running") return;
    time += dt;
    distance += (mode === "flight" ? 180 : SPEED) * dt;
    landing = Math.max(0, landing - dt);
    if (!grounded) jumpTime += dt;
    const worldX = distance + X;
    scoreOut.textContent = Math.floor(distance / 10);
    const oldY = y;
    const wasGrounded = grounded;
    if (mode === "run" && worldX > CLIFF) {
      mode = "fall";
      grounded = false;
      vy = 90;
      hint.textContent = "The cliff ends here…";
    }
    if (mode === "fall" && y > 400) {
      mode = "flight";
      vy = -280;
      wing = 1;
      burst(worldX, y - 35);
      action.textContent = "Flap wings";
      hint.textContent = "Wings of Icarus · tap / Space repeatedly to fly";
    }
    vy += (mode === "flight" ? 490 : 1400) * dt;
    y += vy * dt;
    grounded = false;
    if (mode === "run" && vy >= 0) {
      for (const [start, width, top] of PLATFORMS) {
        if (worldX + 15 > start && worldX - 15 < start + width && oldY <= top && y >= top) {
          if (!wasGrounded) landing = .18;
          y = top;
          vy = 0;
          grounded = true;
          break;
        }
      }
    }
    if (mode === "flight") {
      flightTime += dt;
      wing = Math.max(0, wing - dt * 2.5);
      if (y < 70) { y = 70; vy = Math.max(0, vy); }
      for (const [gx, center] of GATES) {
        if (Math.abs(gx - worldX) < 35 && (y - 48 < center - 100 || y > center + 100)) finish();
      }
    }
    if (y > H + 65) finish();
    cooldown -= dt;
    const target = enemies.find(e => e.alive && e.kind === "enemy" && e.x > worldX + 35 && e.x < worldX + 650);
    if (target && cooldown <= 0) {
      const dx = target.x - worldX;
      const dy = target.y - 30 - (y - 47);
      const length = Math.hypot(dx, dy);
      arrows.push({ x: worldX + 30, y: y - 47, vx: dx / length * 680, vy: dy / length * 680 });
      cooldown = .55;
    }
    for (const a of arrows) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      for (const enemy of enemies) {
        if (enemy.alive && enemy.kind === "enemy" && Math.abs(a.x - enemy.x) < 23 && Math.abs(a.y - (enemy.y - 30)) < 32) {
          enemy.alive = false;
          a.x = -1000;
          burst(enemy.x, enemy.y - 30);
          break;
        }
      }
    }
    arrows = arrows.filter(a => a.x > distance - 40 && a.x < distance + W);
    for (const e of enemies) {
      if (e.alive && Math.abs(e.x - worldX) < (e.kind === "spikes" ? 37 : 27) && y > e.y - (e.kind === "spikes" ? 24 : 48) && y - 45 < e.y) finish();
    }
    for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    sparks = sparks.filter(p => p.life > 0);
    if (distance >= FINISH && phase === "running") finish(true);
    stageOut.textContent = mode === "flight" ? "III · Wings of Icarus" : distance > 2800 ? "II · Ruins of Athena" : "I · The sacred grove";
    root.dataset.mode = mode;
  };

  const path = (points, fill, stroke) => {
    ctx.beginPath();
    points.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
    if (fill) { ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  };
  const ellipse = (x, yy, rx, ry, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.ellipse(x, yy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  };
  const column = (x, top, height, width = 44) => {
    ctx.fillStyle = "#748879"; ctx.fillRect(x - width / 2, top, width, height);
    ctx.fillStyle = "#bdd0aa"; ctx.fillRect(x - width / 2, top, 7, height);
    ctx.fillStyle = "#4d6c63";
    for (let i = 0; i < 3; i++) ctx.fillRect(x - width / 2 + 13 + i * 10, top + 8, 3, height - 12);
    ctx.fillStyle = "#d8d9b4"; ctx.fillRect(x - width / 2 - 8, top, width + 16, 10);
    ctx.fillStyle = "#9da991"; ctx.fillRect(x - width / 2 - 5, top + height - 10, width + 10, 10);
  };
  const drawHero = () => {
    const running = grounded && phase === "running";
    const stride = time * 3.6;
    const cycle = stride * Math.PI * 2;
    const compression = Math.sin(landing / .18 * Math.PI) * 5;
    const bob = running ? -3 - Math.sin(cycle) * 3 : 0;
    const airborne = !grounded && mode !== "flight";
    const pitch = airborne ? Math.max(-.18, Math.min(.16, vy / 2800)) : running ? Math.cos(cycle) * .045 : 0;
    const platform = PLATFORMS.find(([start, width]) => distance + X >= start && distance + X <= start + width);
    if (platform && mode === "run") {
      const height = Math.max(0, platform[2] - y);
      ctx.globalAlpha = .22 * (1 - Math.min(height / 220, .8));
      ellipse(X - 6, platform[2] - 1, 39 - height * .08, 4, "#10292e");
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(X, y - 30 + bob + compression);
    ctx.rotate(pitch);
    ctx.translate(0, 30);
    if (mode === "flight") {
      const unfold = Math.min(1, flightTime / .45);
      const stroke = wing > 0 ? Math.sin((1 - wing) * Math.PI) : 0;
      for (let side = 0; side < 2; side++) {
        const near = side === 1;
        ctx.save();
        ctx.translate(near ? 1 : 11, near ? -44 : -49);
        ctx.rotate(.3 - stroke * (near ? 1.25 : 1.05) + Math.sin(time * 4) * .06);
        ctx.scale(unfold * (near ? 1 : .78), unfold * (near ? 1 : .82));
        // Long primaries fan from the wrist; overlapping roots form the coverts.
        ctx.lineWidth = 1;
        for (let feather = 8; feather >= 0; feather--) {
          const rootX = -39 + feather * 3.7;
          const rootY = -25 + feather * 2.2;
          const tipX = -108 + feather * 8.2;
          const tipY = -56 + feather * 10 + stroke * feather * 1.3;
          ctx.beginPath();
          ctx.moveTo(rootX + 7, rootY - 4);
          ctx.bezierCurveTo(rootX - 21, rootY - 15, tipX - 3, tipY - 12, tipX, tipY);
          ctx.bezierCurveTo(tipX + 8, tipY + 6, rootX - 3, rootY + 12, rootX + 7, rootY - 4);
          ctx.fillStyle = near ? (feather % 2 ? "#e7e5d7" : "#fff5df") : "#91aaa9";
          ctx.fill();
          ctx.strokeStyle = near ? "#99aca7" : "#6d9295";
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(rootX, rootY);
          ctx.quadraticCurveTo(rootX - 17, rootY + 1, tipX + 4, tipY - 1);
          ctx.strokeStyle = near ? "#c3cbbb" : "#7e9b9e";
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(8, 8);
        ctx.bezierCurveTo(-8, 7, -15, -10, -25, -22);
        ctx.bezierCurveTo(-38, -35, -56, -42, -77, -47);
        ctx.bezierCurveTo(-55, -55, -26, -42, -14, -29);
        ctx.bezierCurveTo(-4, -20, 3, -7, 8, 8);
        ctx.fillStyle = near ? "#faf2dc" : "#b5c7c1";
        ctx.fill();
        ctx.strokeStyle = near ? "#d6dec9" : "#8ea8a6";
        ctx.stroke();
        for (let feather = 0; feather < 6; feather++) {
          const fx = -12 - feather * 8;
          const fy = -13 - feather * 5;
          ctx.beginPath();
          ctx.moveTo(fx + 6, fy - 5);
          ctx.quadraticCurveTo(fx - 7, fy - 5, fx - 13, fy + 5);
          ctx.quadraticCurveTo(fx - 2, fy + 7, fx + 6, fy - 5);
          ctx.fillStyle = near ? "#ecebd9" : "#a2bbb8";
          ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
    }
    // Each pair has a delayed contact; the legs fold during suspension.
    ctx.lineCap = "round";
    for (const i of [1, 3, 0, 2]) {
      const front = i >= 2;
      const hip = front ? 15 : -25;
      let kneeX, kneeY, hoofX, hoofY;
      if (grounded) {
        const frame = running ? (stride * GALLOP.length + (i % 2) * .75) % GALLOP.length : 4;
        const from = GALLOP[Math.floor(frame)][front ? 1 : 0];
        const to = GALLOP[(Math.floor(frame) + 1) % GALLOP.length][front ? 1 : 0];
        const t = frame % 1;
        [kneeX, kneeY, hoofX, hoofY] = from.map((v, j) => v + (to[j] - v) * t);
        kneeY -= compression * .45;
        hoofY -= bob + compression;
      } else {
        const tuck = mode === "flight" ? .85 : Math.min(1, jumpTime / .12) * (1 - Math.max(0, Math.min(1, (vy - 80) / 420)));
        const offset = i % 2 ? 4 : 0;
        kneeX = front ? 14 - tuck * 7 : -13 + tuck * 22;
        kneeY = 16 - tuck * 9 + offset * .4;
        hoofX = front ? 20 - tuck * 28 : -21 + tuck * 37;
        hoofY = 30 - tuck * 22 + offset;
      }
      ctx.lineWidth = i % 2 ? 6 : 8;
      path([[hip, -28], [hip + kneeX, -28 + kneeY]], null, i % 2 ? "#25323b" : "#52616a");
      ctx.lineWidth = i % 2 ? 4 : 5;
      path([[hip + kneeX, -28 + kneeY], [hip + hoofX, -28 + hoofY]], null, i % 2 ? "#202d35" : "#34434b");
      ctx.lineWidth = 5;
      path([[hip + hoofX - 3, -28 + hoofY], [hip + hoofX + 3, -28 + hoofY]], null, i % 2 ? "#9b834e" : "#dbbb72");
    }
    const tail = Math.sin(cycle - .8) * (running ? 7 : 2);
    path([[-29, -34], [-45, -43], [-61, -45 + tail], [-68, -40 + tail], [-50, -35], [-35, -29]], "#253440");
    ellipse(-8, -30, 31, 15, "#34434b");
    ellipse(-14, -36, 22, 5, "#52616a");
    ctx.save();
    ctx.translate(13, -34);
    ctx.rotate(running ? -.07 + Math.sin(cycle - .6) * .055 : airborne ? -.12 : 0);
    ctx.translate(-13, 34);
    path([[9, -31], [7, -56], [19, -62], [30, -45], [25, -28]], "#bf945d");
    path([[7, -55], [18, -61], [25, -48], [13, -42]], "#eee2ad");
    ctx.fillStyle = "#9c4a36"; ctx.fillRect(8, -39, 19, 6);
    ellipse(19, -69, 8, 10, "#e0b57f");
    path([[10, -69], [10, -78], [23, -82], [28, -71], [19, -75]], "#d6b96b");
    path([[12, -79], [10, -87], [24, -88], [28, -79]], "#ad493b");
    ctx.lineWidth = 5;
    path([[19, -53], [32, -49], [44, -54]], null, "#ddb47b");
    path([[12, -52], [25, -59], [30, -53]], null, "#b68b57");
    ctx.lineWidth = 3; ctx.strokeStyle = "#e5bf6c";
    ctx.beginPath(); ctx.ellipse(40, -53, 12, 23, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.lineWidth = 1; path([[40, -76], [32, -53], [40, -30]], null, "#f5e9c7");
    ctx.restore();
    ctx.restore();
  };
  const draw = () => {
    const flight = mode === "flight" || mode === "fall";
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, flight ? "#277c99" : "#163f4c");
    sky.addColorStop(1, flight ? "#bad9ce" : "#69b2a4");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ellipse(780, 74, 48, 48, "#ecdba85c");
    for (let layer = 0; layer < 3; layer++) {
      const shift = distance * (.09 + layer * .11) % 310;
      for (let i = -1; i < 5; i++) {
        const x = i * 310 - shift;
        if (flight) {
          ellipse(x, 140 + layer * 95, 130, 20 + layer * 8, ["#deead431", "#dce9df57", "#e4ede473"][layer]);
        } else {
          ctx.fillStyle = ["#204e574a", "#24585d70", "#244c50a6"][layer];
          path([[x - 37, 400], [x - 19, 0], [x + 28, 0], [x + 47, 400]], ctx.fillStyle);
          path([[x, 120], [x + 96, 43], [x + 57, 111], [x + 19, 170]], ctx.fillStyle);
          ellipse(x - 10, 365, 100, 50, ["#3d77756b", "#417b708a", "#275e56"][layer]);
        }
      }
    }
    // Shafts of light sit behind the collidable silhouettes.
    for (let i = 0; i < 4; i++) path([[i * 290 + 90, 0], [i * 290 + 145, 0], [i * 290 - 30, H], [i * 290 - 180, H]], "#f1e5b50b");
    if (!flight && distance > 2000) {
      for (let i = 0; i < 5; i++) column(i * 250 - distance * .35 % 250, 165 + i % 2 * 55, 210, 48);
    }
    for (const [start, width, top] of PLATFORMS) {
      const x = start - distance;
      if (x > W || x + width < 0) continue;
      ctx.save(); ctx.beginPath(); ctx.rect(x, top, width, H - top); ctx.clip();
      ctx.fillStyle = "#354950"; ctx.fillRect(x, top, width, H - top);
      ctx.strokeStyle = "#20333c"; ctx.lineWidth = 3;
      for (let row = 0; row < 3; row++) {
        for (let j = 0; j < width / 72 + 1; j++) {
          const bx = x + j * 72 - row % 2 * 36;
          ctx.strokeRect(bx, top + 16 + row * 45, 72, 45);
          path([[bx + 4, top + 21 + row * 45], [bx + 63, top + 21 + row * 45]], null, "#62706a");
        }
      }
      ctx.fillStyle = "#8baf83"; ctx.fillRect(x, top, width, 9);
      ctx.fillStyle = "#c4cf9c"; ctx.fillRect(x, top, width, 3);
      ctx.restore();
      for (let j = 40; j < width; j += 180) {
        const sx = x + j;
        path([[sx, top + 20], [sx + 27, top + 24], [sx + 25, top + 48], [sx + 14, top + 59], [sx + 2, top + 47]], "#687b77", "#293f46");
        ellipse(sx + 8, top + 33, 4, 5, "#c0bc8b"); ellipse(sx + 20, top + 33, 4, 5, "#c0bc8b");
      }
    }
    if (mode === "run") {
      for (const e of enemies) {
        const x = e.x - distance;
        if (!e.alive || x < -60 || x > W + 60) continue;
        if (e.kind === "spikes") {
          for (let i = -1; i <= 1; i++) path([[x + i * 19 - 12, e.y], [x + i * 19, e.y - 26], [x + i * 19 + 12, e.y]], "#4a6668", "#c0cab0");
        } else {
          ctx.save(); ctx.translate(x, e.y);
          ctx.lineWidth = 7; ctx.lineCap = "round";
          path([[-11, -28], [-15, -5], [-22, -2]], null, "#293e40");
          path([[10, -28], [14, -5], [21, -2]], null, "#293e40");
          ellipse(0, -38, 20, 19, "#563e41");
          path([[-17, -30], [17, -30], [21, -20], [-21, -20]], "#963f3a");
          ellipse(0, -61, 12, 14, "#a5a890");
          path([[-8, -68], [-20, -78], [-16, -61], [-7, -57]], "#e2d5aa");
          path([[8, -68], [20, -78], [16, -61], [7, -57]], "#e2d5aa");
          ellipse(-5, -62, 3, 3, "#edb861"); ellipse(5, -62, 3, 3, "#edb861");
          ctx.lineWidth = 3; path([[-35, -30], [32, -46]], null, "#beab7b");
          path([[-35, -30], [-52, -29], [-39, -38]], "#c4d0c7");
          ctx.restore();
        }
      }
    }
    if (flight) {
      for (const [gx, center] of GATES) {
        const x = gx - distance;
        if (x < -60 || x > W + 60) continue;
        column(x, -15, center - 100 + 15, 48);
        column(x, center + 100, H - center - 100, 48);
        ellipse(x, center, 6, 6, "#f5e4a1");
      }
    }
    ctx.lineWidth = 2;
    for (const a of arrows) {
      const ax = a.x - distance;
      path([[ax - 22, a.y], [ax + 7, a.y]], null, "#ffdfa0");
      path([[ax + 9, a.y], [ax + 2, a.y - 4], [ax + 2, a.y + 4]], "#fff2c9");
    }
    for (const p of sparks) { ctx.fillStyle = `rgba(255,218,138,${p.life * 2})`; ctx.fillRect(p.x - distance, p.y, 4, 4); }
    drawHero();
    ctx.fillStyle = "#122e38cc"; ctx.fillRect(20, 18, 265, 38);
    ctx.fillStyle = "#f3e5bd"; ctx.font = "15px Cinzel, Georgia, serif";
    ctx.fillText(mode === "flight" ? "III  /  WINGS OF ICARUS" : distance > 2800 ? "II  /  RUINS OF ATHENA" : "I  /  THE SACRED GROVE", 34, 43);
    ctx.fillStyle = "#f0dfa860"; ctx.fillRect(22, H - 14, W - 44, 3);
    ctx.fillStyle = "#f5df9b"; ctx.fillRect(22, H - 14, (W - 44) * distance / FINISH, 3);
    const tutorial = mode === "flight" && flightTime < 4;
    const cliffWarning = mode === "run" && distance > 5150;
    if (phase !== "running" || tutorial || cliffWarning) {
      const title = phase === "ready" ? "THE TRIAL OF THE CENTAUR" : phase === "over" ? "RISE AGAIN, HERO" : phase === "complete" ? "THE SANCTUARY AWAITS" : tutorial ? "YOUR WINGS HAVE AWAKENED" : "BEYOND THE CLIFF";
      const subtitle = phase === "ready" ? "Tap to begin · Space to jump · Auto-fire" : phase === "over" ? "Tap to retry the journey" : phase === "complete" ? "Trial complete · Tap to run again" : tutorial ? "TAP / SPACE TO FLAP" : "Keep running. Trust the wings.";
      const boxY = phase === "running" ? 70 : 115;
      ctx.fillStyle = "#102d38e8"; ctx.fillRect(190, boxY, 580, 100);
      ctx.strokeStyle = "#c9b777"; ctx.lineWidth = 1; ctx.strokeRect(198, boxY + 8, 564, 84);
      ctx.textAlign = "center"; ctx.fillStyle = "#f8e8be"; ctx.font = "23px Cinzel, Georgia, serif";
      ctx.fillText(title, W / 2, boxY + 42);
      ctx.font = "16px Georgia, serif"; ctx.fillStyle = "#c7dcd3"; ctx.fillText(subtitle, W / 2, boxY + 73);
      ctx.textAlign = "left";
    }
  };
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault(); canvas.focus({ preventScroll: true }); input();
  });
  canvas.addEventListener("keydown", event => {
    if (!["Space", "ArrowUp", "Enter"].includes(event.code)) return;
    event.preventDefault(); if (!event.repeat) input();
  });
  action.addEventListener("click", input);
  onStage(canvas, now => {
    const dt = last ? Math.min((now - last) / 1000, .04) : 0;
    last = now;
    // Small physics steps keep fast arrows and platform landings consistent.
    for (let remaining = dt; remaining > 0; remaining -= 1 / 120) step(Math.min(remaining, 1 / 120));
    draw();
  });
};

document.querySelectorAll(".runner").forEach(mount);
