// The BP app put a process on a table you could walk around. This is the same
// move in a browser: one well, drawn in section, turned by dragging.
const DIST = 34;
const IDLE_SPIN = 0.1;
// How far the scene reaches from the well head, so the framing can be solved
// for whatever shape the tile ends up being.
const SCENE_HALF_W = 15.5;
const SCENE_HALF_H = 17;

const SURFACE_EXTENT = 13;
const STRATA_DEPTHS = [-4.5, -9, -13.5];
const DECK = { x: [-4.4, 4.4], y: [6.2, 7.1], z: [-3.4, 3.4] };
const DERRICK_HEIGHT = 8;
const DERRICK_BASE = 2.7;
const DERRICK_TOP = 0.85;
const RESERVOIR = { y: -17, rx: 7.5, rz: 3.4, cx: 7 };

const PALETTE = {
  surface: "rgba(112, 242, 209, 0.18)",
  strata: "rgba(234, 247, 255, 0.14)",
  structure: "rgba(234, 247, 255, 0.85)",
  well: "#eaf7ff",
  pay: "rgba(255, 122, 184, 0.75)",
  flow: "#70f2d1",
};

const grid = () => {
  const lines = [];
  for (let i = -SURFACE_EXTENT; i <= SURFACE_EXTENT; i += 3.25) {
    lines.push([{ x: i, y: 0, z: -SURFACE_EXTENT }, { x: i, y: 0, z: SURFACE_EXTENT }]);
    lines.push([{ x: -SURFACE_EXTENT, y: 0, z: i }, { x: SURFACE_EXTENT, y: 0, z: i }]);
  }
  return lines;
};

// Each layer is drawn as the rectangle it cuts, so depth reads as a stack.
const strata = () => {
  const lines = [];
  STRATA_DEPTHS.forEach((y) => {
    const e = SURFACE_EXTENT - 2;
    const corners = [
      { x: -e, y, z: -e }, { x: e, y, z: -e }, { x: e, y, z: e }, { x: -e, y, z: e },
    ];
    corners.forEach((corner, i) => lines.push([corner, corners[(i + 1) % corners.length]]));
  });
  return lines;
};

// Down, then a long turn out to the side: the horizontal reach is the whole
// point of the process, so the path has to show the bend rather than a shaft.
const wellPath = () => {
  const points = [{ x: 0, y: DECK.y[1], z: 0 }, { x: 0, y: -11, z: 0 }];
  const turn = 9;
  for (let i = 1; i <= turn; i += 1) {
    const t = i / turn;
    const angle = (Math.PI / 2) * t;
    points.push({
      x: RESERVOIR.cx * (1 - Math.cos(angle)) * 0.9,
      y: -11 - 6 * Math.sin(angle),
      z: 0,
    });
  }
  points.push({ x: RESERVOIR.cx + 4.5, y: RESERVOIR.y, z: 0 });
  return points;
};

const WELL = wellPath();

const wellLength = (() => {
  let total = 0;
  for (let i = 1; i < WELL.length; i += 1) {
    const a = WELL[i - 1];
    const b = WELL[i];
    total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
  return total;
})();

// Where a fraction of the way along the well lands in space.
const alongWell = (fraction) => {
  let travelled = fraction * wellLength;
  for (let i = 1; i < WELL.length; i += 1) {
    const a = WELL[i - 1];
    const b = WELL[i];
    const span = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (travelled <= span) {
      const t = span === 0 ? 0 : travelled / span;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    }
    travelled -= span;
  }
  return WELL[WELL.length - 1];
};

const segments = (points) => points.slice(1).map((point, i) => [points[i], point]);

const deckEdges = () => {
  const { x, y, z } = DECK;
  const corners = [
    [x[0], y[0], z[0]], [x[1], y[0], z[0]], [x[1], y[0], z[1]], [x[0], y[0], z[1]],
    [x[0], y[1], z[0]], [x[1], y[1], z[0]], [x[1], y[1], z[1]], [x[0], y[1], z[1]],
  ].map(([px, py, pz]) => ({ x: px, y: py, z: pz }));
  const pairs = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  return pairs.map(([a, b]) => [corners[a], corners[b]]);
};

// Legs run from the deck down past the surface, so the rig reads as planted.
const legEdges = () => {
  const feet = [
    [DECK.x[0] + 0.6, DECK.z[0] + 0.6], [DECK.x[1] - 0.6, DECK.z[0] + 0.6],
    [DECK.x[1] - 0.6, DECK.z[1] - 0.6], [DECK.x[0] + 0.6, DECK.z[1] - 0.6],
  ];
  return feet.map(([x, z]) => [{ x, y: DECK.y[0], z }, { x, y: -1.2, z }]);
};

const derrickEdges = () => {
  const base = DERRICK_BASE;
  const top = DERRICK_TOP;
  const y0 = DECK.y[1];
  const y1 = y0 + DERRICK_HEIGHT;
  const corner = (s, tx, tz) => ({ x: s * tx, y: 0, z: s * tz });
  const posts = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  const lines = [];

  posts.forEach(([sx, sz]) => {
    lines.push([
      { ...corner(base, sx, sz), y: y0 },
      { ...corner(top, sx, sz), y: y1 },
    ]);
  });

  // Rungs, tightening as the tower narrows.
  for (let i = 0; i <= 4; i += 1) {
    const t = i / 4;
    const spread = base + (top - base) * t;
    const y = y0 + DERRICK_HEIGHT * t;
    const ring = posts.map(([sx, sz]) => ({ x: spread * sx, y, z: spread * sz }));
    ring.forEach((point, index) => lines.push([point, ring[(index + 1) % ring.length]]));
  }
  return lines;
};

const reservoirEdges = () => {
  const lines = [];
  const ring = [];
  for (let i = 0; i < 34; i += 1) {
    const angle = (i / 34) * Math.PI * 2;
    ring.push({
      x: RESERVOIR.cx + Math.cos(angle) * RESERVOIR.rx,
      y: RESERVOIR.y + Math.sin(angle) * 0.9,
      z: Math.sin(angle) * RESERVOIR.rz,
    });
  }
  ring.forEach((point, i) => lines.push([point, ring[(i + 1) % ring.length]]));
  return lines;
};

const GRID = grid();
const STRATA = strata();
const DECK_EDGES = deckEdges();
const LEG_EDGES = legEdges();
const DERRICK_EDGES = derrickEdges();
const RESERVOIR_EDGES = reservoirEdges();
const WELL_EDGES = segments(WELL);

const project = (p, yaw, pitch, view) => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  const x = p.x * cy - p.z * sy;
  const z0 = p.x * sy + p.z * cy;
  const y = p.y * cp - z0 * sp;
  const z = p.y * sp + z0 * cp + DIST;

  if (z <= 0.2) return null;
  return { sx: view.w / 2 + (view.focal * x) / z, sy: view.h * 0.46 - (view.focal * y) / z, z };
};

const mount = (root) => {
  const canvas = root.querySelector(".rig__canvas");
  const yawOut = root.querySelector("[data-yaw]");
  const hintOut = root.querySelector(".rig__hint");
  if (!canvas || !yawOut || !hintOut) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const view = { w: 0, h: 0, focal: 0 };

  // The tile is a different shape on every screen, so the backing store follows
  // the box and the lens is solved for whichever edge runs out first.
  const fit = () => {
    const box = canvas.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    view.w = box.width;
    view.h = box.height;
    view.focal = Math.min(
      (view.h * 0.5 * DIST) / SCENE_HALF_H,
      (view.w * 0.5 * DIST) / SCENE_HALF_W,
    );
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  let yaw = -0.55;
  let pitch = 0.3;
  let dragging = false;
  let grabbed = false;
  let lastX = 0;
  let lastY = 0;
  let last = 0;
  let clock = 0;

  const stroke = (lines, colour, width) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    lines.forEach(([a, b]) => {
      const pa = project(a, yaw, pitch, view);
      const pb = project(b, yaw, pitch, view);
      if (!pa || !pb) return;
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
    });
    ctx.stroke();
  };

  // Oil moving up the pipe is the only thing that has to read as motion.
  const drawFlow = () => {
    const count = 9;
    for (let i = 0; i < count; i += 1) {
      const fraction = 1 - ((clock * 0.09 + i / count) % 1);
      const point = project(alongWell(fraction), yaw, pitch, view);
      if (!point) continue;
      const radius = Math.max(1.2, (view.focal * 0.09) / point.z);
      ctx.beginPath();
      ctx.fillStyle = PALETTE.flow;
      ctx.globalAlpha = 0.35 + 0.65 * Math.sin(Math.PI * fraction);
      ctx.arc(point.sx, point.sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const draw = () => {
    ctx.clearRect(0, 0, view.w, view.h);
    stroke(STRATA, PALETTE.strata, 1);
    stroke(GRID, PALETTE.surface, 1);
    stroke(RESERVOIR_EDGES, PALETTE.pay, 1.3);
    stroke(WELL_EDGES, PALETTE.well, 1.6);
    stroke(LEG_EDGES, PALETTE.structure, 1.1);
    stroke(DECK_EDGES, PALETTE.structure, 1.15);
    stroke(DERRICK_EDGES, PALETTE.structure, 1);
    drawFlow();
  };

  const loop = (now) => {
    if (view.w === 0) fit();
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    if (!dragging) yaw += IDLE_SPIN * dt;
    draw();
    yawOut.textContent = `${Math.round(((((yaw * 180) / Math.PI) % 360) + 360) % 360)}°`;
    window.requestAnimationFrame(loop);
  };

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    grabbed = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    hintOut.textContent = "Drag to orbit · release to let it turn";
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    yaw += (event.clientX - lastX) * 0.008;
    pitch = Math.max(-0.15, Math.min(0.85, pitch + (event.clientY - lastY) * 0.005));
    lastX = event.clientX;
    lastY = event.clientY;
  });

  const release = () => {
    dragging = false;
    if (grabbed) hintOut.textContent = "Drag to orbit";
  };

  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", release);

  canvas.addEventListener("keydown", (event) => {
    const step = event.key === "ArrowLeft" ? -0.16 : event.key === "ArrowRight" ? 0.16 : 0;
    if (step === 0) return;
    event.preventDefault();
    yaw += step;
  });

  fit();
  if (typeof ResizeObserver === "function") new ResizeObserver(fit).observe(canvas);
  else window.addEventListener("resize", fit);

  window.requestAnimationFrame(loop);
};

document.querySelectorAll(".rig").forEach(mount);
