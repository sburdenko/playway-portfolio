// The app this stands for taught injection procedures on a 3D head that the
// trainee could walk round. This is that lesson: the standard 31-site chronic
// migraine paradigm, on a head you turn, one injection at a time.
const BASE_DIST = 7.4;
const IDLE_SPIN = 0.09;
const UNITS_PER_SITE = 5;
const BLOOM_SECONDS = 0.9;

const HEAD = { rx: 1, ry: 1.28, rz: 1.12 };
const NECK = { top: -0.95, bottom: -2.05, r: 0.42 };
const SHOULDER = { y: -2.05, span: 2.25, z: -0.1 };

const RADIANS = Math.PI / 180;

// A point on the head, given as latitude up from eye level and longitude round
// from the face — the way the sites are described in the protocol itself.
const onHead = (lat, lon) => ({
  x: HEAD.rx * Math.cos(lat * RADIANS) * Math.sin(lon * RADIANS),
  y: HEAD.ry * Math.sin(lat * RADIANS),
  z: HEAD.rz * Math.cos(lat * RADIANS) * Math.cos(lon * RADIANS),
});

// The PREEMPT paradigm: seven muscle groups, 31 sites, five units in each.
const REGIONS = [
  {
    name: "Procerus", note: "One site, on the midline between the brows.",
    points: [onHead(30, 0)],
  },
  {
    name: "Corrugator", note: "One each side, at the inner end of the brow.",
    points: [onHead(28, -15), onHead(28, 15)],
  },
  {
    name: "Frontalis", note: "Two each side, up the forehead.",
    points: [onHead(52, -18), onHead(52, 18), onHead(44, -42), onHead(44, 42)],
  },
  {
    name: "Temporalis", note: "Four each side, over the temple.",
    points: [
      onHead(36, -82), onHead(36, 82),
      onHead(24, -104), onHead(24, 104),
      onHead(12, -118), onHead(12, 118),
      onHead(30, -128), onHead(30, 128),
    ],
  },
  {
    name: "Occipitalis", note: "Three each side, across the back of the head.",
    points: [
      onHead(8, -150), onHead(8, 150),
      onHead(-2, -166), onHead(-2, 166),
      onHead(14, -178), onHead(14, 178),
    ],
  },
  {
    name: "Cervical paraspinal", note: "Two each side, down the back of the neck.",
    points: [
      { x: -0.17, y: -1.3, z: -0.44 }, { x: 0.17, y: -1.3, z: -0.44 },
      { x: -0.17, y: -1.68, z: -0.44 }, { x: 0.17, y: -1.68, z: -0.44 },
    ],
  },
  {
    name: "Trapezius", note: "Three each side, out along the shoulder.",
    points: [
      { x: -0.62, y: -1.98, z: -0.3 }, { x: 0.62, y: -1.98, z: -0.3 },
      { x: -1.1, y: -2.03, z: -0.32 }, { x: 1.1, y: -2.03, z: -0.32 },
      { x: -1.58, y: -2.06, z: -0.34 }, { x: 1.58, y: -2.06, z: -0.34 },
    ],
  },
];

const SITES = REGIONS.flatMap((region) =>
  region.points.map((point) => ({ region, point, injected: 0 })),
);

const TOTAL_UNITS = SITES.length * UNITS_PER_SITE;

// Contour rings up the head, plus meridians, which is enough of a head to read
// as one while staying in the same drawn language as the rest of the page.
const HEAD_LINES = (() => {
  const lines = [];
  for (let lat = -60; lat <= 75; lat += 15) {
    const ring = [];
    for (let lon = 0; lon <= 360; lon += 12) ring.push(onHead(lat, lon));
    for (let i = 1; i < ring.length; i += 1) lines.push([ring[i - 1], ring[i]]);
  }
  for (let lon = 0; lon < 180; lon += 30) {
    const meridian = [];
    for (let lat = -78; lat <= 90; lat += 9) meridian.push(onHead(lat, lon));
    for (let lat = 90; lat >= -78; lat -= 9) meridian.push(onHead(lat, lon + 180));
    for (let i = 1; i < meridian.length; i += 1) lines.push([meridian[i - 1], meridian[i]]);
  }
  return lines;
})();

const NECK_LINES = (() => {
  const lines = [];
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * Math.PI * 2;
    const b = ((i + 1) / 24) * Math.PI * 2;
    [NECK.top, (NECK.top + NECK.bottom) / 2, NECK.bottom].forEach((y) => {
      lines.push([
        { x: Math.cos(a) * NECK.r, y, z: Math.sin(a) * NECK.r },
        { x: Math.cos(b) * NECK.r, y, z: Math.sin(b) * NECK.r },
      ]);
    });
  }
  [0, 90, 180, 270].forEach((deg) => {
    const a = deg * RADIANS;
    lines.push([
      { x: Math.cos(a) * NECK.r, y: NECK.top, z: Math.sin(a) * NECK.r },
      { x: Math.cos(a) * NECK.r, y: NECK.bottom, z: Math.sin(a) * NECK.r },
    ]);
  });
  return lines;
})();

const SHOULDER_LINES = (() => {
  const line = [];
  for (let i = -12; i <= 12; i += 1) {
    const t = i / 12;
    line.push({
      x: t * SHOULDER.span,
      y: SHOULDER.y - Math.pow(Math.abs(t), 1.7) * 0.42,
      z: SHOULDER.z - Math.pow(t, 2) * 0.12,
    });
  }
  const lines = [];
  for (let i = 1; i < line.length; i += 1) lines.push([line[i - 1], line[i]]);
  return lines;
})();

const project = (p, yaw, pitch, view) => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  const x = p.x * cy - p.z * sy;
  const z0 = p.x * sy + p.z * cy;
  const y = p.y * cp - z0 * sp;
  const z = p.y * sp + z0 * cp + BASE_DIST;

  if (z <= 0.2) return null;
  return { sx: view.w / 2 + (view.focal * x) / z, sy: view.h * 0.42 - (view.focal * y) / z, z };
};

const mount = (root) => {
  const canvas = root.querySelector(".botox__canvas");
  const nameOut = root.querySelector("[data-site]");
  const noteOut = root.querySelector("[data-site-note]");
  const sitesOut = root.querySelector("[data-sites]");
  const unitsOut = root.querySelector("[data-units]");
  const hintOut = root.querySelector(".botox__hint");
  const resetButton = root.querySelector("[data-reset]");
  if (!canvas || !nameOut || !noteOut || !sitesOut || !unitsOut || !hintOut || !resetButton) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const view = { w: 0, h: 0, focal: 0 };

  const fit = () => {
    const box = canvas.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    view.w = box.width;
    view.h = box.height;
    view.focal = Math.min((view.w * 0.5 * BASE_DIST) / 2.6, (view.h * 0.5 * BASE_DIST) / 3.4);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  let yaw = -0.35;
  let pitch = 0.12;
  let clock = 0;
  let last = 0;
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let hovered = null;
  let pointer = null;
  const screen = SITES.map(() => null);

  const done = () => SITES.filter((site) => site.injected > 0).length;

  const report = () => {
    const n = done();
    sitesOut.textContent = `${n} / ${SITES.length}`;
    unitsOut.textContent = `${n * UNITS_PER_SITE} U`;
    root.toggleAttribute("data-complete", n === SITES.length);
  };

  const describe = (site) => {
    if (!site) {
      const n = done();
      nameOut.textContent = n === SITES.length ? "Protocol complete" : "31 sites, 155 units";
      noteOut.textContent = n === SITES.length
        ? `Every site placed — ${TOTAL_UNITS} units across seven muscle groups, the paradigm the app taught.`
        : "The standard chronic migraine paradigm. Turn the head to reach the back of it, and click a marker to place an injection.";
      return;
    }
    const placed = site.region.points.filter((_, i) =>
      SITES.find((s) => s.region === site.region && s.point === site.region.points[i]).injected > 0).length;
    nameOut.textContent = site.region.name;
    noteOut.textContent = `${site.region.note} ${placed} of ${site.region.points.length} placed · ${UNITS_PER_SITE} units per site.`;
  };

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

  const centreDepth = () => {
    const centre = project({ x: 0, y: 0, z: 0 }, yaw, pitch, view);
    return centre ? centre.z : BASE_DIST;
  };

  const drawSites = () => {
    const middle = centreDepth();
    SITES.forEach((site, index) => {
      const point = project(site.point, yaw, pitch, view);
      screen[index] = point;
      if (!point) return;

      // Sites on the far side stay drawn but recede, so it is obvious that the
      // head has to be turned to reach them.
      const front = point.z <= middle;
      const alpha = front ? 1 : 0.22;
      const radius = Math.max(2.4, (view.focal * 0.035) / point.z);

      if (site.injected > 0) {
        const age = Math.min(1, (clock - site.injected) / BLOOM_SECONDS);
        const spread = radius * (1.6 + age * 3.4);
        const glow = ctx.createRadialGradient(point.sx, point.sy, 0, point.sx, point.sy, spread);
        glow.addColorStop(0, `rgba(255, 122, 184, ${0.5 * alpha})`);
        glow.addColorStop(1, "rgba(255, 122, 184, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(point.sx, point.sy, spread, 0, Math.PI * 2);
        ctx.fill();

        // The wave that runs out from the needle as the dose spreads.
        if (age < 1) {
          ctx.strokeStyle = `rgba(255, 122, 184, ${(1 - age) * alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(point.sx, point.sy, spread * 1.15, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      const hot = hovered === site;
      ctx.beginPath();
      ctx.arc(point.sx, point.sy, radius, 0, Math.PI * 2);
      if (site.injected > 0) {
        ctx.fillStyle = `rgba(255, 122, 184, ${alpha})`;
        ctx.fill();
      } else {
        ctx.strokeStyle = hot ? `rgba(112, 242, 209, ${alpha})` : `rgba(234, 247, 255, ${0.55 * alpha})`;
        ctx.lineWidth = hot ? 1.8 : 1.1;
        ctx.stroke();
      }

      if (hot) {
        ctx.strokeStyle = `rgba(112, 242, 209, ${0.8 * alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(point.sx, point.sy, radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  };

  const pick = () => {
    if (!pointer) return null;
    const middle = centreDepth();
    let best = null;
    let bestScore = 18;
    screen.forEach((point, index) => {
      if (!point) return;
      const distance = Math.hypot(point.sx - pointer.x, point.sy - pointer.y);
      // A marker facing the viewer wins one that is round the back of the head.
      const score = distance + (point.z <= middle ? 0 : 14);
      if (score < bestScore) {
        bestScore = score;
        best = SITES[index];
      }
    });
    return best;
  };

  const draw = () => {
    ctx.clearRect(0, 0, view.w, view.h);
    stroke(SHOULDER_LINES, "rgba(234, 247, 255, 0.4)", 1.2);
    stroke(NECK_LINES, "rgba(234, 247, 255, 0.16)", 1);
    stroke(HEAD_LINES, "rgba(234, 247, 255, 0.16)", 1);
    drawSites();
  };

  const loop = (now) => {
    if (view.w === 0) fit();
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    if (!dragging && !hovered) yaw += IDLE_SPIN * dt;
    draw();
    const found = pick();
    if (found !== hovered) {
      hovered = found;
      describe(found);
      canvas.style.cursor = found ? "crosshair" : "grab";
    }
    window.requestAnimationFrame(loop);
  };

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    moved = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    const box = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    yaw += dx * 0.008;
    pitch = Math.max(-0.5, Math.min(0.7, pitch + dy * 0.005));
    lastX = event.clientX;
    lastY = event.clientY;
  });

  // A drag turns the head; a press that stays put is a needle going in.
  const release = () => {
    if (dragging && moved < 5 && hovered && hovered.injected === 0) {
      hovered.injected = clock;
      report();
      describe(hovered);
      hintOut.textContent = done() === SITES.length
        ? "Every site placed"
        : "Turn the head · click a marker to inject";
    }
    dragging = false;
  };

  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", () => { dragging = false; });
  canvas.addEventListener("pointerleave", () => {
    dragging = false;
    pointer = null;
  });

  canvas.addEventListener("keydown", (event) => {
    const turn = event.key === "ArrowLeft" ? -0.18 : event.key === "ArrowRight" ? 0.18 : 0;
    if (turn === 0) return;
    event.preventDefault();
    yaw += turn;
  });

  resetButton.addEventListener("click", () => {
    SITES.forEach((site) => { site.injected = 0; });
    report();
    describe(null);
    hintOut.textContent = "Turn the head · click a marker to inject";
  });

  report();
  describe(null);
  fit();
  if (typeof ResizeObserver === "function") new ResizeObserver(fit).observe(canvas);
  else window.addEventListener("resize", fit);

  window.requestAnimationFrame(loop);
};

document.querySelectorAll(".botox").forEach(mount);
