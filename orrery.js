// The book this was built for is about space, so the page carries the same
// subject: the eight planets in their real order, turning at their real
// relative rates, on a plane you can tilt.
const DIST = 40;
const IDLE_SPIN = 0.055;
const EARTH_LAP_SECONDS = 14;

// Real distances put Mercury inside the sun's glyph and Neptune off the tile,
// so the radius is compressed — order and spacing survive, scale does not.
const AU_COMPRESSION = 0.62;
const RADIUS_SCALE = 6.4;

const PLANETS = [
  { name: "Mercury", au: 0.39, years: 0.24, size: 1.5, colour: "#9fb4c2", note: "Closest in, and the fastest lap of the eight." },
  { name: "Venus", au: 0.72, years: 0.62, size: 2.5, colour: "#ffd76a", note: "Turns backwards, and the hottest surface of them all." },
  { name: "Earth", au: 1, years: 1, size: 2.6, colour: "#70f2d1", note: "One lap of this ring is the year the book is printed in." },
  { name: "Mars", au: 1.52, years: 1.88, size: 2, colour: "#ff7ab8", note: "Half Earth's width, with the tallest volcano in the system." },
  { name: "Jupiter", au: 5.2, years: 11.86, size: 5.4, colour: "#f0c08a", note: "Heavier than every other planet put together." },
  { name: "Saturn", au: 9.54, years: 29.4, size: 4.6, colour: "#eaf7ff", note: "Rings of ice and rock, and barely denser than water.", ring: true },
  { name: "Uranus", au: 19.2, years: 84, size: 3.4, colour: "#8fd8ff", note: "Tipped on its side, so it rolls round its orbit." },
  { name: "Neptune", au: 30.1, years: 164.8, size: 3.3, colour: "#7f9dff", note: "Found by arithmetic before anyone saw it." },
];

const orbitRadius = (au) => Math.pow(au, AU_COMPRESSION) * RADIUS_SCALE;

const ORBITS = PLANETS.map((planet) => {
  const radius = orbitRadius(planet.au);
  const ring = [];
  for (let i = 0; i < 72; i += 1) {
    const angle = (i / 72) * Math.PI * 2;
    ring.push({ x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius });
  }
  return ring.map((point, i) => [point, ring[(i + 1) % ring.length]]);
});

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
  return { sx: view.w / 2 + (view.focal * x) / z, sy: view.h / 2 - (view.focal * y) / z, z };
};

const mount = (root) => {
  const canvas = root.querySelector(".orrery__canvas");
  const nameOut = root.querySelector("[data-planet]");
  const noteOut = root.querySelector("[data-planet-note]");
  const auOut = root.querySelector("[data-au]");
  const periodOut = root.querySelector("[data-period]");
  const hintOut = root.querySelector(".orrery__hint");
  if (!canvas || !nameOut || !noteOut || !auOut || !periodOut || !hintOut) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const view = { w: 0, h: 0, focal: 0 };
  const reach = orbitRadius(PLANETS[PLANETS.length - 1].au) + 2;

  const fit = () => {
    const box = canvas.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    view.w = box.width;
    view.h = box.height;
    // Tilted, the far edge of the outer ring is the tightest fit vertically.
    view.focal = Math.min((view.w * 0.5 * DIST) / reach, (view.h * 0.5 * DIST) / (reach * 0.62));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  let yaw = 0.2;
  let pitch = 0.72;
  let clock = 0;
  let last = 0;
  let dragging = false;
  let grabbed = false;
  let lastX = 0;
  let lastY = 0;
  let held = null;
  let pointer = null;
  const screen = PLANETS.map(() => null);

  const describe = (planet) => {
    if (!planet) {
      nameOut.textContent = "Solar system";
      noteOut.textContent = "Eight planets in their real order, each turning at its own rate. Hover one to hold it.";
      auOut.textContent = "—";
      periodOut.textContent = "—";
      return;
    }
    nameOut.textContent = planet.name;
    noteOut.textContent = planet.note;
    auOut.textContent = planet.au.toFixed(2);
    periodOut.textContent = planet.years < 1 ? `${Math.round(planet.years * 365)} days` : `${planet.years} yr`;
  };

  const angleOf = (planet, index) => (clock / EARTH_LAP_SECONDS / planet.years) * Math.PI * 2 + index * 1.7;

  const strokeRing = (ring, colour, width) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ring.forEach(([a, b]) => {
      const pa = project(a, yaw, pitch, view);
      const pb = project(b, yaw, pitch, view);
      if (!pa || !pb) return;
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
    });
    ctx.stroke();
  };

  const drawSun = () => {
    const point = project({ x: 0, y: 0, z: 0 }, yaw, pitch, view);
    if (!point) return;
    const radius = (view.focal * 1.6) / point.z;
    const glow = ctx.createRadialGradient(point.sx, point.sy, 0, point.sx, point.sy, radius * 5);
    glow.addColorStop(0, "rgba(255, 215, 106, 0.55)");
    glow.addColorStop(1, "rgba(255, 215, 106, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.sx, point.sy, radius * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe9a8";
    ctx.beginPath();
    ctx.arc(point.sx, point.sy, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawPlanet = (planet, index) => {
    const radius = orbitRadius(planet.au);
    const angle = angleOf(planet, index);
    const position = { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius };
    const point = project(position, yaw, pitch, view);
    screen[index] = point;
    if (!point) return;

    const size = Math.max(2.2, (view.focal * planet.size * 0.035) / point.z);
    const focused = held === planet;

    if (planet.ring) {
      ctx.strokeStyle = focused ? "#eaf7ff" : "rgba(234, 247, 255, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(point.sx, point.sy, size * 2, size * 2 * Math.max(0.16, Math.cos(pitch)), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (focused) {
      ctx.beginPath();
      ctx.strokeStyle = planet.colour;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.arc(point.sx, point.sy, size + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = planet.colour;
    ctx.beginPath();
    ctx.arc(point.sx, point.sy, size, 0, Math.PI * 2);
    ctx.fill();
  };

  const pick = () => {
    if (!pointer) return null;
    let best = null;
    let bestDistance = 22;
    screen.forEach((point, index) => {
      if (!point) return;
      const distance = Math.hypot(point.sx - pointer.x, point.sy - pointer.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = PLANETS[index];
      }
    });
    return best;
  };

  const draw = () => {
    ctx.clearRect(0, 0, view.w, view.h);
    ORBITS.forEach((ring, index) => {
      const lit = held === PLANETS[index];
      strokeRing(ring, lit ? "rgba(112, 242, 209, 0.55)" : "rgba(234, 247, 255, 0.16)", lit ? 1.2 : 1);
    });
    drawSun();
    PLANETS.forEach(drawPlanet);
  };

  const loop = (now) => {
    if (view.w === 0) fit();
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    // A held planet keeps its place so it can be read.
    if (!held) clock += dt;
    if (!dragging) yaw += IDLE_SPIN * dt;
    draw();
    const found = pick();
    if (found !== held) {
      held = found;
      describe(found);
      canvas.style.cursor = found ? "pointer" : "grab";
    }
    window.requestAnimationFrame(loop);
  };

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    grabbed = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    hintOut.textContent = "Drag to tilt · release to let it turn";
  });

  canvas.addEventListener("pointermove", (event) => {
    const box = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (!dragging) return;
    yaw += (event.clientX - lastX) * 0.007;
    pitch = Math.max(0.12, Math.min(1.45, pitch + (event.clientY - lastY) * 0.005));
    lastX = event.clientX;
    lastY = event.clientY;
  });

  const release = () => {
    dragging = false;
    if (grabbed) hintOut.textContent = "Drag to tilt";
  };

  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", () => {
    release();
    pointer = null;
  });

  canvas.addEventListener("keydown", (event) => {
    const step = event.key === "ArrowLeft" ? -0.16 : event.key === "ArrowRight" ? 0.16 : 0;
    if (step === 0) return;
    event.preventDefault();
    yaw += step;
  });

  describe(null);
  fit();
  if (typeof ResizeObserver === "function") new ResizeObserver(fit).observe(canvas);
  else window.addEventListener("resize", fit);

  window.requestAnimationFrame(loop);
};

document.querySelectorAll(".orrery").forEach(mount);
