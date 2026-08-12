const WORLD = { w: 420, h: 240 };
const HORIZON = 78;
const FOCAL = 250;
const EYE = 1.55;
const NEAR = 1.4;
const FAR = 26;
const PAN_LIMIT = 3.2;
const SCAN_SECONDS = 1.6;

const SCANNING = "scanning";
const TRACKING = "tracking";

const INK = {
  sky: "#07131d",
  haze: "rgba(112, 242, 209, 0.05)",
  grid: "rgba(112, 242, 209, 0.22)",
  gridNear: "rgba(112, 242, 209, 0.5)",
  reticle: "#70f2d1",
  anchor: "#70f2d1",
  anchorCore: "#eaf7ff",
  drift: "rgba(169, 140, 255, 0.55)",
};

// Floor point -> screen. Everything else is built on this one projection.
const project = (x, z, camX, lift = 0) => ({
  sx: WORLD.w / 2 + (FOCAL * (x - camX)) / z,
  sy: HORIZON + (FOCAL * (EYE - lift)) / z,
  scale: FOCAL / z,
});

// Screen point -> floor point, so the reticle lands where the pointer is.
const unproject = (px, py, camX) => {
  const depth = py - HORIZON;
  if (depth <= 6) return null;
  const z = (FOCAL * EYE) / depth;
  if (z < NEAR || z > FAR) return null;
  return { x: camX + ((px - WORLD.w / 2) * z) / FOCAL, z };
};

const DRIFT = Array.from({ length: 26 }, () => ({
  x: (Math.random() - 0.5) * 16,
  z: NEAR + Math.random() * (FAR - NEAR),
  lift: 0.4 + Math.random() * 2.4,
}));

const mount = (root) => {
  const canvas = root.querySelector(".ar-stage__canvas");
  const anchorsOut = root.querySelector("[data-anchors]");
  const stateOut = root.querySelector("[data-state]");
  const hintOut = root.querySelector(".ar-stage__hint");

  if (!canvas || !anchorsOut || !stateOut || !hintOut) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = WORLD.w;
  canvas.height = WORLD.h;

  let phase = SCANNING;
  let scanned = 0;
  let camX = 0;
  let aimCam = 0;
  let pointer = { x: WORLD.w / 2, y: HORIZON + 90 };
  let anchors = [];
  let clock = 0;
  let last = 0;

  const setPhase = (next, message) => {
    phase = next;
    root.dataset.phase = next;
    stateOut.textContent = next === TRACKING ? "Plane locked" : "Scanning…";
    hintOut.textContent = message;
  };

  const step = (dt) => {
    clock += dt;
    camX += (aimCam - camX) * Math.min(1, dt * 3.4);

    if (phase === SCANNING) {
      scanned += dt;
      if (scanned >= SCAN_SECONDS) setPhase(TRACKING, "Click the floor to drop an anchor");
    }
  };

  const drawFloor = () => {
    // Lines running away from the camera.
    for (let x = -8; x <= 8; x += 1) {
      const a = project(x, NEAR, camX);
      const b = project(x, FAR, camX);
      ctx.strokeStyle = INK.grid;
      ctx.lineWidth = x === 0 ? 1.2 : 0.6;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }

    // Lines crossing them, tighter as they recede.
    for (let z = NEAR; z <= FAR; z += 1.15) {
      const a = project(-9, z, camX);
      const b = project(9, z, camX);
      const near = 1 - (z - NEAR) / (FAR - NEAR);
      ctx.strokeStyle = near > 0.62 ? INK.gridNear : INK.grid;
      ctx.lineWidth = 0.5 + near * 0.7;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
  };

  const drawScanSweep = () => {
    const t = (scanned / SCAN_SECONDS) % 1;
    const z = FAR - t * (FAR - NEAR);
    const a = project(-9, z, camX);
    const b = project(9, z, camX);
    ctx.strokeStyle = INK.reticle;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const drawAnchor = (anchor, index) => {
    const base = project(anchor.x, anchor.z, camX);
    const bob = Math.sin(clock * 1.8 + index) * 0.06;
    const top = project(anchor.x, anchor.z, camX, 0.72 + bob);
    const r = base.scale * 0.34;

    ctx.strokeStyle = INK.anchor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(base.sx, base.sy, r, r * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(base.sx, base.sy);
    ctx.lineTo(top.sx, top.sy);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const d = base.scale * 0.16;
    ctx.fillStyle = INK.anchorCore;
    ctx.beginPath();
    ctx.moveTo(top.sx, top.sy - d);
    ctx.lineTo(top.sx + d, top.sy);
    ctx.lineTo(top.sx, top.sy + d);
    ctx.lineTo(top.sx - d, top.sy);
    ctx.closePath();
    ctx.fill();
  };

  const drawReticle = () => {
    const hit = unproject(pointer.x, pointer.y, camX);
    if (!hit) return;
    const p = project(hit.x, hit.z, camX);
    const r = p.scale * 0.3;

    ctx.strokeStyle = INK.reticle;
    ctx.lineWidth = 1;
    ctx.globalAlpha = phase === TRACKING ? 1 : 0.35;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, r, r * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.sx - r * 0.5, p.sy);
    ctx.lineTo(p.sx + r * 0.5, p.sy);
    ctx.moveTo(p.sx, p.sy - r * 0.22);
    ctx.lineTo(p.sx, p.sy + r * 0.22);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const draw = () => {
    ctx.fillStyle = INK.sky;
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);

    ctx.fillStyle = INK.haze;
    ctx.fillRect(0, 0, WORLD.w, HORIZON);

    DRIFT.forEach((d, i) => {
      const p = project(d.x, d.z, camX, d.lift);
      if (p.sy < 0 || p.sy > WORLD.h) return;
      ctx.fillStyle = INK.drift;
      ctx.globalAlpha = 0.16 + Math.abs(Math.sin(clock * 0.5 + i)) * 0.2;
      ctx.fillRect(p.sx, p.sy, 1.4, 1.4);
      ctx.globalAlpha = 1;
    });

    drawFloor();
    if (phase === SCANNING) drawScanSweep();

    anchors
      .slice()
      .sort((a, b) => b.z - a.z)
      .forEach(drawAnchor);

    drawReticle();
  };

  const loop = (now) => {
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    window.requestAnimationFrame(loop);
  };

  const trackPointer = (event) => {
    const box = canvas.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    pointer = {
      x: ((point.clientX - box.left) / box.width) * WORLD.w,
      y: ((point.clientY - box.top) / box.height) * WORLD.h,
    };
    // Looking around: the further off centre, the more the camera slides.
    aimCam = ((pointer.x / WORLD.w) * 2 - 1) * PAN_LIMIT;
  };

  const place = () => {
    if (phase !== TRACKING) return;
    const hit = unproject(pointer.x, pointer.y, camX);
    if (!hit) return;
    anchors = [...anchors, hit];
    anchorsOut.textContent = String(anchors.length);
    hintOut.textContent = anchors.length >= 4 ? "Move across to look around" : "Click the floor to drop an anchor";
  };

  canvas.addEventListener("pointermove", trackPointer);
  canvas.addEventListener("pointerdown", (event) => {
    trackPointer(event);
    place();
  });
  canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();
    trackPointer(event);
  });

  canvas.addEventListener("keydown", (event) => {
    const nudge = event.key === "ArrowLeft" ? -0.6 : event.key === "ArrowRight" ? 0.6 : 0;
    if (nudge !== 0) {
      event.preventDefault();
      aimCam = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, aimCam + nudge));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      place();
    }
  });

  setPhase(SCANNING, "Finding a surface…");
  window.requestAnimationFrame(loop);
};

document.querySelectorAll(".ar-stage").forEach(mount);
