// The book this was built for is about space, so the page carries the same
// subject: the planets and their major moons, in their real proportions, on
// planes that are all slightly different — turned, tilted and zoomed by hand.
const BASE_DIST = 40;
const IDLE_SPIN = 0.055;
const EARTH_LAP_SECONDS = 14;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 14;

// Real distances put Mercury inside the sun's glyph and Neptune off the tile,
// so the radius is compressed — order and spacing survive, scale does not.
const AU_COMPRESSION = 0.62;
const RADIUS_SCALE = 6.4;

// Bodies, on the other hand, keep their true proportions to each other: one
// world unit is 20 000 km, which is why Jupiter is a disc and Mercury a speck.
// The sun cannot join in — at this scale it would be wider than Mars' orbit.
const KM_PER_UNIT = 20000;

// A moon's distance is given in radii of its own planet and compressed the same
// way the planets' are, so the order within each system is the real one. Their
// periods are real too, slowed as a group — Io's true 1.8 days would be a blur.
const MOON_COMPRESSION = 0.55;
const MOON_SPREAD = 1.55;
const MOON_TIME_SCALE = 26;

// au: mean distance. years: orbital period. km: equatorial radius. mkm:
// distance from the sun in millions of km. day: one rotation.
// tilt: inclination to the ecliptic. node: longitude of the ascending node,
// which is the direction that tilt leans about. moonPlane: how far the moon
// system is tipped off the planet's own orbit — Uranus is the famous one.
// Moons: r = radii of the parent out, days = period, back = retrograde.
const PLANETS = [
  {
    name: "Mercury", au: 0.39, mkm: 57.9, years: 0.24, day: "58.6 days", km: 2440,
    tilt: 7, node: 48.3, colour: "#9fb4c2", moonPlane: 0, moons: [],
    note: "Closest in, fastest lap of the eight, and no moon of its own.",
  },
  {
    name: "Venus", au: 0.72, mkm: 108.2, years: 0.62, day: "243 days", km: 6052,
    tilt: 3.39, node: 76.7, colour: "#ffd76a", moonPlane: 0, moons: [],
    note: "Its day is longer than its year, and it turns the wrong way round.",
  },
  {
    name: "Earth", au: 1, mkm: 149.6, years: 1, day: "24 hours", km: 6371,
    tilt: 0, node: 0, colour: "#70f2d1", moonPlane: 5.1,
    note: "Its orbit is the flat one — every other tilt on screen is measured from it.",
    moons: [{ name: "Moon", km: 1737, r: 60.3, days: 27.3, kkm: 384 }],
  },
  {
    name: "Mars", au: 1.52, mkm: 227.9, years: 1.88, day: "24.6 hours", km: 3390,
    tilt: 1.85, node: 49.6, colour: "#ff7ab8", moonPlane: 1.1, moons: [],
    note: "Half Earth's width. Its two moons are 11 km rocks — too small to draw honestly.",
  },
  {
    name: "Jupiter", au: 5.2, mkm: 778.5, years: 11.86, day: "9.9 hours", km: 69911,
    tilt: 1.3, node: 100.5, colour: "#f0c08a", moonPlane: 3.1,
    note: "Heavier than every other planet put together, and spun round in ten hours.",
    moons: [
      { name: "Io", km: 1822, r: 5.9, days: 1.77, kkm: 422 },
      { name: "Europa", km: 1561, r: 9.4, days: 3.55, kkm: 671 },
      { name: "Ganymede", km: 2634, r: 15, days: 7.15, kkm: 1070 },
      { name: "Callisto", km: 2410, r: 26.3, days: 16.69, kkm: 1883 },
    ],
  },
  {
    name: "Saturn", au: 9.54, mkm: 1434, years: 29.4, day: "10.7 hours", km: 58232,
    tilt: 2.49, node: 113.7, colour: "#eaf7ff", ring: true, moonPlane: 26.7,
    note: "Rings of ice and rock, and barely denser than water.",
    moons: [
      { name: "Rhea", km: 764, r: 8.7, days: 4.52, kkm: 527 },
      { name: "Titan", km: 2575, r: 20.3, days: 15.95, kkm: 1222 },
      { name: "Iapetus", km: 735, r: 59, days: 79.3, kkm: 3561 },
    ],
  },
  {
    name: "Uranus", au: 19.2, mkm: 2871, years: 84, day: "17.2 hours", km: 25362,
    tilt: 0.77, node: 74, colour: "#8fd8ff", moonPlane: 97.8,
    note: "Tipped on its side — and its moons go round the tipped equator, not the orbit.",
    moons: [
      { name: "Titania", km: 789, r: 17.2, days: 8.71, kkm: 436 },
      { name: "Oberon", km: 761, r: 23, days: 13.46, kkm: 584 },
    ],
  },
  {
    name: "Neptune", au: 30.1, mkm: 4495, years: 164.8, day: "16.1 hours", km: 24622,
    tilt: 1.77, node: 131.8, colour: "#7f9dff", moonPlane: 23,
    note: "Found by arithmetic before anyone saw it. Triton runs backwards round it.",
    moons: [{ name: "Triton", km: 1353, r: 14.3, days: 5.88, kkm: 355, back: true }],
  },
];

const orbitRadius = (au) => Math.pow(au, AU_COMPRESSION) * RADIUS_SCALE;
const bodySize = (km) => km / KM_PER_UNIT;
const moonOrbit = (planet, moon) =>
  bodySize(planet.km) * Math.pow(moon.r, MOON_COMPRESSION) * MOON_SPREAD;

// A ring, leaned over by `tilt` and swung round to where that lean points.
const ringPoint = (radius, theta, tiltDeg, nodeDeg) => {
  const tilt = (tiltDeg * Math.PI) / 180;
  const node = (nodeDeg * Math.PI) / 180;
  const x = Math.cos(theta) * radius;
  const inPlane = Math.sin(theta) * radius;
  const y = inPlane * Math.sin(tilt);
  const z = inPlane * Math.cos(tilt);
  return {
    x: x * Math.cos(node) + z * Math.sin(node),
    y,
    z: -x * Math.sin(node) + z * Math.cos(node),
  };
};

// No two of these orbits share a plane.
const orbitPoint = (planet, theta) =>
  ringPoint(orbitRadius(planet.au), theta, planet.tilt, planet.node);

// A moon rides on its planet, on the plane that planet's moons actually use.
const moonPoint = (planet, moon, theta, centre) => {
  const local = ringPoint(moonOrbit(planet, moon), theta, planet.moonPlane, planet.node);
  return { x: centre.x + local.x, y: centre.y + local.y, z: centre.z + local.z };
};

const ringOf = (sample) => {
  const points = [];
  for (let i = 0; i < 96; i += 1) points.push(sample((i / 96) * Math.PI * 2));
  return points.map((point, i) => [point, points[(i + 1) % points.length]]);
};

const ORBITS = PLANETS.map((planet) => ringOf((theta) => orbitPoint(planet, theta)));

const project = (p, yaw, pitch, view, dist) => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  const x = p.x * cy - p.z * sy;
  const z0 = p.x * sy + p.z * cy;
  const y = p.y * cp - z0 * sp;
  const z = p.y * sp + z0 * cp + dist;

  if (z <= 0.2) return null;
  return { sx: view.w / 2 + (view.focal * x) / z, sy: view.h / 2 - (view.focal * y) / z, z };
};

const km = (value) => `${Math.round(value).toLocaleString("en-GB")} km`;

const mount = (root) => {
  const canvas = root.querySelector(".orrery__canvas");
  const nameOut = root.querySelector("[data-planet]");
  const noteOut = root.querySelector("[data-planet-note]");
  const zoomOut = root.querySelector("[data-zoom]");
  const hintOut = root.querySelector(".orrery__hint");
  const facts = [...root.querySelectorAll("[data-fact]")].map((slot) => ({
    value: slot.querySelector("b"),
    label: slot.querySelector("i"),
  }));
  if (!canvas || !nameOut || !noteOut || !zoomOut || !hintOut || facts.length < 4) return;

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
    view.focal = Math.min(
      (view.w * 0.5 * BASE_DIST) / reach,
      (view.h * 0.5 * BASE_DIST) / (reach * 0.62),
    );
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  let yaw = 0.2;
  let pitch = 0.72;
  let zoom = 1;
  let clock = 0;
  let last = 0;
  let dragging = false;
  let grabbed = false;
  let lastX = 0;
  let lastY = 0;
  let held = null;
  let pointer = null;
  const targets = [];

  const dist = () => BASE_DIST / zoom;

  const setFacts = (rows) => {
    facts.forEach((slot, i) => {
      slot.value.textContent = rows[i] ? rows[i][0] : "—";
      slot.label.textContent = rows[i] ? rows[i][1] : "";
    });
  };

  const describe = (target) => {
    if (!target) {
      nameOut.textContent = "Solar system";
      noteOut.textContent = "Bodies sized against each other, each system on its own tilted plane. Hover one to hold it and read it.";
      setFacts([["8", "planets"], ["11", "moons drawn"], ["4.6", "billion years old"], ["1", "star"]]);
      return;
    }

    if (target.moon) {
      const moon = target.moon;
      nameOut.textContent = moon.name;
      noteOut.textContent = `Moon of ${target.planet.name}${moon.back ? ", and the only large moon that goes round its planet backwards" : ""}.`;
      setFacts([
        [km(moon.km * 2), "across"],
        [`${moon.kkm.toLocaleString("en-GB")}k km`, `from ${target.planet.name}`],
        [`${moon.days} days`, moon.back ? "one orbit, retrograde" : "one orbit"],
        [`${moon.r.toFixed(1)}×`, `${target.planet.name} radii out`],
      ]);
      return;
    }

    const planet = target.planet;
    nameOut.textContent = planet.name;
    noteOut.textContent = planet.note;
    setFacts([
      [km(planet.km * 2), "across"],
      [`${planet.mkm.toLocaleString("en-GB")}M km`, `${planet.au} AU from the sun`],
      [planet.years < 1 ? `${Math.round(planet.years * 365)} days` : `${planet.years} yr`, "one orbit"],
      [planet.day, "one turn on its axis"],
    ]);
  };

  const planetAngle = (planet, index) =>
    (clock / EARTH_LAP_SECONDS / planet.years) * Math.PI * 2 + index * 1.7;

  const moonAngle = (moon, index) => {
    const laps = (clock * 365) / (EARTH_LAP_SECONDS * moon.days * MOON_TIME_SCALE);
    return (moon.back ? -laps : laps) * Math.PI * 2 + index * 2.1;
  };

  const strokeRing = (ring, colour, width) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ring.forEach(([a, b]) => {
      const pa = project(a, yaw, pitch, view, dist());
      const pb = project(b, yaw, pitch, view, dist());
      if (!pa || !pb) return;
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
    });
    ctx.stroke();
  };

  const drawSun = () => {
    const point = project({ x: 0, y: 0, z: 0 }, yaw, pitch, view, dist());
    if (!point) return;
    // Out of scale, and it has to be: at the planets' scale the sun would be
    // 35 units across and would swallow everything inside Jupiter.
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

  // True proportions leave the small bodies under a pixel across, so the floor
  // is the smallest dot that still reads as a body rather than as noise. Zoom
  // in and everything comes off the floor and back into proportion.
  const drawBody = (position, radiusKm, colour, focused) => {
    const point = project(position, yaw, pitch, view, dist());
    if (!point) return null;
    const size = Math.max(1.5, (view.focal * bodySize(radiusKm)) / point.z);

    if (focused) {
      ctx.beginPath();
      ctx.strokeStyle = colour;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1;
      ctx.arc(point.sx, point.sy, size + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(point.sx, point.sy, size, 0, Math.PI * 2);
    ctx.fill();
    return { point, size };
  };

  const drawPlanet = (planet, index) => {
    const centre = orbitPoint(planet, planetAngle(planet, index));
    const focused = Boolean(held && !held.moon && held.planet === planet);

    planet.moons.forEach((moon, moonIndex) => {
      strokeRing(
        ringOf((theta) => moonPoint(planet, moon, theta, centre)),
        "rgba(234, 247, 255, 0.22)",
        1,
      );
      const position = moonPoint(planet, moon, moonAngle(moon, moonIndex), centre);
      const drawn = drawBody(position, moon.km, "#c9dcea", Boolean(held && held.moon === moon));
      if (drawn) targets.push({ ...drawn, planet, moon });
    });

    const body = drawBody(centre, planet.km, planet.colour, focused);
    if (!body) return;
    targets.push({ ...body, planet, moon: null });

    if (planet.ring) {
      ctx.strokeStyle = focused ? "#eaf7ff" : "rgba(234, 247, 255, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(
        body.point.sx, body.point.sy,
        body.size * 2, body.size * 2 * Math.max(0.16, Math.abs(Math.cos(pitch))),
        0, 0, Math.PI * 2,
      );
      ctx.stroke();
    }
  };

  const pick = () => {
    if (!pointer) return null;
    let best = null;
    let bestDistance = 20;
    targets.forEach((target) => {
      // A moon sitting on its planet should win the pointer, not lose to it.
      const distance = Math.hypot(target.point.sx - pointer.x, target.point.sy - pointer.y)
        - (target.moon ? 4 : 0);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = target;
      }
    });
    return best;
  };

  const draw = () => {
    ctx.clearRect(0, 0, view.w, view.h);
    targets.length = 0;
    ORBITS.forEach((ring, index) => {
      const lit = Boolean(held && held.planet === PLANETS[index]);
      strokeRing(ring, lit ? "rgba(112, 242, 209, 0.55)" : "rgba(234, 247, 255, 0.16)", lit ? 1.2 : 1);
    });
    drawSun();
    PLANETS.forEach(drawPlanet);
  };

  const loop = (now) => {
    if (view.w === 0) fit();
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    // A held body keeps its place so it can be read.
    if (!held) clock += dt;
    if (!dragging) yaw += IDLE_SPIN * dt;
    draw();

    const found = pick();
    const same = found === held
      || Boolean(found && held && found.planet === held.planet && found.moon === held.moon);
    if (!same) {
      held = found;
      describe(found);
      canvas.style.cursor = found ? "pointer" : "grab";
    }
    zoomOut.textContent = `${zoom.toFixed(1)}×`;
    window.requestAnimationFrame(loop);
  };

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    grabbed = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    hintOut.textContent = "Drag to turn · scroll to zoom";
  });

  canvas.addEventListener("pointermove", (event) => {
    const box = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (!dragging) return;
    yaw += (event.clientX - lastX) * 0.007;
    // No stops on the lean: the system can be turned right over if that is the
    // view wanted, including looking at it from underneath.
    pitch += (event.clientY - lastY) * 0.005;
    lastX = event.clientX;
    lastY = event.clientY;
  });

  const release = () => {
    dragging = false;
    if (grabbed) hintOut.textContent = "Drag to turn · scroll to zoom";
  };

  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", () => {
    release();
    pointer = null;
  });

  const scale = (factor) => {
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
  };

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    scale(Math.exp(-event.deltaY * 0.0016));
  }, { passive: false });

  canvas.addEventListener("keydown", (event) => {
    const turn = event.key === "ArrowLeft" ? -0.16 : event.key === "ArrowRight" ? 0.16 : 0;
    const lean = event.key === "ArrowUp" ? -0.12 : event.key === "ArrowDown" ? 0.12 : 0;
    const step = event.key === "+" || event.key === "=" ? 1.18 : event.key === "-" ? 1 / 1.18 : 1;
    if (turn === 0 && lean === 0 && step === 1) return;
    event.preventDefault();
    yaw += turn;
    pitch += lean;
    scale(step);
  });

  describe(null);
  fit();
  if (typeof ResizeObserver === "function") new ResizeObserver(fit).observe(canvas);
  else window.addEventListener("resize", fit);

  window.requestAnimationFrame(loop);
};

document.querySelectorAll(".orrery").forEach(mount);
