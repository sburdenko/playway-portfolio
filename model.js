const WORLD = { w: 460, h: 320 };
const FOCAL = 620;
const DIST = 15.5;
const IDLE_SPIN = 0.13;

// The massing, as boxes in metres: ground floor, cantilevered upper storey,
// terrace slab, lift core, and the piers the cantilever sits on.
const BOXES = [
  { x: [-4.2, 4.2], y: [0, 3.1], z: [-3, 3] },
  { x: [-5.4, 3], y: [3.1, 6], z: [-3.6, 2.2] },
  { x: [-6.4, 5.6], y: [-0.25, 0], z: [-4.6, 5.4] },
  { x: [3, 4.2], y: [0, 6.6], z: [-1.2, 0.6] },
  { x: [-5.2, -4.6], y: [0, 3.1], z: [1.4, 2] },
  { x: [-5.2, -4.6], y: [0, 3.1], z: [-3.4, -2.8] },
];

const CORNERS = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
];

const EDGE_PAIRS = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

const buildEdges = () => {
  const edges = [];
  BOXES.forEach((box) => {
    const verts = CORNERS.map(([cx, cy, cz]) => ({
      x: box.x[cx],
      y: box.y[cy],
      z: box.z[cz],
    }));
    EDGE_PAIRS.forEach(([a, b]) => edges.push([verts[a], verts[b]]));
  });
  return edges;
};

const EDGES = buildEdges();

// Ground grid, drawn flat at y = 0 so the massing has something to stand on.
const GRID = (() => {
  const lines = [];
  for (let i = -8; i <= 8; i += 2) {
    lines.push([{ x: i, y: 0, z: -8 }, { x: i, y: 0, z: 8 }]);
    lines.push([{ x: -8, y: 0, z: i }, { x: 8, y: 0, z: i }]);
  }
  return lines;
})();

const project = (p, yaw, pitch) => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  const x = p.x * cy - p.z * sy;
  const z0 = p.x * sy + p.z * cy;
  const y = p.y * cp - z0 * sp;
  const z = p.y * sp + z0 * cp + DIST;

  if (z <= 0.2) return null;
  return {
    sx: WORLD.w / 2 + (FOCAL * x) / z,
    sy: WORLD.h * 0.62 - (FOCAL * y) / z,
    z,
  };
};

const mount = (root) => {
  const canvas = root.querySelector(".model__canvas");
  const yawOut = root.querySelector("[data-yaw]");
  const hintOut = root.querySelector(".model__hint");

  if (!canvas || !yawOut || !hintOut) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = WORLD.w;
  canvas.height = WORLD.h;

  let yaw = -0.7;
  let pitch = 0.22;
  let dragging = false;
  let grabbed = false;
  let lastX = 0;
  let lastY = 0;
  let last = 0;

  const stroke = (segments, colour, width) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    segments.forEach(([a, b]) => {
      const pa = project(a, yaw, pitch);
      const pb = project(b, yaw, pitch);
      if (!pa || !pb) return;
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
    });
    ctx.stroke();
  };

  const draw = () => {
    ctx.fillStyle = "#07131d";
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    stroke(GRID, "rgba(112, 242, 209, 0.16)", 1);
    stroke(EDGES, "rgba(234, 247, 255, 0.9)", 1.15);
  };

  const loop = (now) => {
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!dragging) yaw += IDLE_SPIN * dt;
    draw();
    yawOut.textContent = `${Math.round((((yaw * 180) / Math.PI) % 360 + 360) % 360)}°`;
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
    pitch = Math.max(-0.35, Math.min(0.75, pitch + (event.clientY - lastY) * 0.005));
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

  window.requestAnimationFrame(loop);
};

document.querySelectorAll(".model").forEach(mount);
