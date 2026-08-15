// RAF100 put a century of aircraft in the sky over a real place. This is the
// same job in three steps: pick the squadron and its shape, draw where it goes,
// then fly it and follow it with the camera.
const TYPES = [
  {
    id: "camel", name: "Sopwith Camel", year: 1917, span: 8.5, knots: 100,
    note: "The Great War fighter the service was founded on.",
  },
  {
    id: "spitfire", name: "Spitfire", year: 1938, span: 11.2, knots: 330,
    note: "Elliptical wing, and the shape everybody draws from memory.",
  },
  {
    id: "lancaster", name: "Lancaster", year: 1942, span: 31.1, knots: 240,
    note: "Four engines and the widest span in the flight.",
  },
  {
    id: "vulcan", name: "Vulcan", year: 1956, span: 33.8, knots: 540,
    note: "A delta the size of a house, and the loudest thing here.",
  },
  {
    id: "typhoon", name: "Typhoon", year: 2003, span: 10.9, knots: 700,
    note: "Delta and canards — the one that flies the flypast today.",
  },
];

// Offsets are in wingspans, measured from the leader.
const FORMATIONS = [
  { id: "vic", name: "Vic", slots: [[0, 0], [-1.5, 1.6], [1.5, 1.6], [-3, 3.2], [3, 3.2], [0, 3.2]] },
  { id: "line", name: "Line astern", slots: [[0, 0], [0, 1.9], [0, 3.8], [0, 5.7], [0, 7.6], [0, 9.5]] },
  { id: "diamond", name: "Diamond", slots: [[0, 0], [-1.7, 1.8], [1.7, 1.8], [0, 3.6], [-3.4, 3.6], [3.4, 3.6]] },
  { id: "echelon", name: "Echelon", slots: [[0, 0], [1.6, 1.5], [3.2, 3], [4.8, 4.5], [6.4, 6], [8, 7.5]] },
  { id: "box", name: "Box", slots: [[-1, 0], [1, 0], [-1, 2], [1, 2], [-3, 1], [3, 1]] },
];

const MAX_AIRCRAFT = 6;
const SCREENS = ["squadron", "route", "flight"];

// Each aircraft is a top-down outline in wingspan units: half-span across,
// nose at -1, tail at +1. Different enough to tell apart at thumbnail size.
const SHAPES = {
  camel: (ctx) => {
    ctx.moveTo(0, -1); ctx.lineTo(0.1, 0.9); ctx.lineTo(-0.1, 0.9); ctx.closePath();
    ctx.moveTo(-0.5, -0.35); ctx.lineTo(0.5, -0.35);
    ctx.moveTo(-0.5, -0.05); ctx.lineTo(0.5, -0.05);
    ctx.moveTo(-0.22, 0.85); ctx.lineTo(0.22, 0.85);
  },
  spitfire: (ctx) => {
    ctx.moveTo(0, -1); ctx.lineTo(0.08, 0.85); ctx.lineTo(-0.08, 0.85); ctx.closePath();
    ctx.moveTo(0, -0.1);
    ctx.bezierCurveTo(-0.3, -0.35, -0.5, -0.2, -0.5, 0.05);
    ctx.bezierCurveTo(-0.5, 0.3, -0.25, 0.28, 0, 0.2);
    ctx.bezierCurveTo(0.25, 0.28, 0.5, 0.3, 0.5, 0.05);
    ctx.bezierCurveTo(0.5, -0.2, 0.3, -0.35, 0, -0.1);
    ctx.moveTo(-0.2, 0.8); ctx.lineTo(0.2, 0.8);
  },
  lancaster: (ctx) => {
    ctx.moveTo(0, -1); ctx.lineTo(0.1, 0.9); ctx.lineTo(-0.1, 0.9); ctx.closePath();
    ctx.moveTo(-0.5, 0.1); ctx.lineTo(-0.48, -0.14); ctx.lineTo(0.48, -0.14); ctx.lineTo(0.5, 0.1); ctx.closePath();
    [-0.34, -0.18, 0.18, 0.34].forEach((x) => { ctx.moveTo(x, -0.2); ctx.lineTo(x, 0.06); });
    ctx.moveTo(-0.26, 0.86); ctx.lineTo(0.26, 0.86);
  },
  vulcan: (ctx) => {
    ctx.moveTo(0, -1); ctx.lineTo(0.5, 0.75); ctx.lineTo(0.2, 0.9); ctx.lineTo(-0.2, 0.9);
    ctx.lineTo(-0.5, 0.75); ctx.closePath();
    ctx.moveTo(0, -0.4); ctx.lineTo(0, 0.9);
  },
  typhoon: (ctx) => {
    ctx.moveTo(0, -1); ctx.lineTo(0.07, -0.3); ctx.lineTo(0.5, 0.6); ctx.lineTo(0.14, 0.7);
    ctx.lineTo(0.1, 0.95); ctx.lineTo(-0.1, 0.95); ctx.lineTo(-0.14, 0.7); ctx.lineTo(-0.5, 0.6);
    ctx.lineTo(-0.07, -0.3); ctx.closePath();
    ctx.moveTo(-0.28, -0.45); ctx.lineTo(-0.08, -0.2);
    ctx.moveTo(0.28, -0.45); ctx.lineTo(0.08, -0.2);
  },
};

// A route needs to bend, so the waypoints are read as a Catmull-Rom spline and
// sampled into a polyline the formation can actually follow.
const spline = (points) => {
  if (points.length < 2) return points.slice();
  const path = [];
  const at = (i) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < 16; s += 1) {
      const t = s / 16;
      const t2 = t * t;
      const t3 = t2 * t;
      path.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  path.push(points[points.length - 1]);
  return path;
};

const lengthOf = (path) => {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return total;
};

const along = (path, distance) => {
  let left = distance;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const span = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= span) {
      const t = span === 0 ? 0 : left / span;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, heading: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    left -= span;
  }
  const last = path[path.length - 1];
  const prev = path[path.length - 2] ?? last;
  return { ...last, heading: Math.atan2(last.y - prev.y, last.x - prev.x) };
};

const mount = (root) => {
  const canvas = root.querySelector(".squadron__canvas");
  const tabs = [...root.querySelectorAll("[data-screen]")];
  const roster = root.querySelector("[data-roster]");
  const typeList = root.querySelector("[data-types]");
  const shapeList = root.querySelector("[data-shapes]");
  const readoutName = root.querySelector("[data-readout]");
  const readoutNote = root.querySelector("[data-readout-note]");
  const countOut = root.querySelector("[data-count]");
  const legOut = root.querySelector("[data-leg]");
  const hintOut = root.querySelector(".squadron__hint");
  const clearButton = root.querySelector("[data-clear]");
  if (!canvas || tabs.length !== 3 || !roster || !typeList || !shapeList) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const view = { w: 0, h: 0 };
  const fit = () => {
    const box = canvas.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    view.w = box.width;
    view.h = box.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  let screen = "squadron";
  let squadron = [TYPES[1], TYPES[4]];
  let formation = FORMATIONS[0];
  let waypoints = [{ x: -30, y: 26 }, { x: 6, y: -4 }, { x: 34, y: 22 }];
  let path = spline(waypoints);
  let travelled = 0;
  let flying = true;
  let camera = { x: 0, y: 0, zoom: 1 };
  let dragging = false;
  let dragged = 0;
  let lastX = 0;
  let lastY = 0;
  let last = 0;
  let clock = 0;

  // World units are 10 m; the map is about 1 km across.
  const scale = () => Math.min(view.w, view.h) / 70 * camera.zoom;
  const px = (x) => view.w / 2 + (x - camera.x) * scale();
  const py = (y) => view.h / 2 + (y - camera.y) * scale();
  const world = (clientX, clientY) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: camera.x + (clientX - box.left - view.w / 2) / scale(),
      y: camera.y + (clientY - box.top - view.h / 2) / scale(),
    };
  };

  const paintTabs = () => {
    tabs.forEach((tab) => tab.setAttribute("aria-current", String(tab.dataset.screen === screen)));
    root.dataset.screen = screen;
  };

  const paintRoster = () => {
    roster.replaceChildren(...squadron.map((type, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${type.name} ✕`;
      button.addEventListener("click", () => {
        squadron = squadron.filter((_, i) => i !== index);
        paintRoster();
        report();
      });
      item.append(button);
      return item;
    }));
    if (squadron.length === 0) {
      const empty = document.createElement("li");
      empty.className = "squadron__empty";
      empty.textContent = "No aircraft yet";
      roster.append(empty);
    }
  };

  const report = () => {
    countOut.textContent = `${squadron.length} / ${MAX_AIRCRAFT}`;
    legOut.textContent = `${Math.round(lengthOf(path) * 10)} m`;
    typeList.querySelectorAll("button").forEach((button) => {
      button.disabled = squadron.length >= MAX_AIRCRAFT;
    });
  };

  const describe = (title, note) => {
    readoutName.textContent = title;
    readoutNote.textContent = note;
  };

  const showScreen = (next) => {
    screen = next;
    paintTabs();
    if (screen === "squadron") {
      describe(formation.name, `${squadron.length} aircraft, oldest first. Pick a shape, then add or drop aircraft.`);
      hintOut.textContent = "Tap an aircraft to add it";
    } else if (screen === "route") {
      describe("Route", `${waypoints.length} waypoints. Click the map to add one, drag the map to move it.`);
      hintOut.textContent = "Click to add a waypoint";
    } else {
      travelled = 0;
      flying = true;
      camera = { x: 0, y: 0, zoom: 1.6 };
      describe("Flypast", "Scroll to zoom, drag to pan. The camera stays where you leave it.");
      hintOut.textContent = "Scroll to zoom · drag to pan";
    }
    report();
  };

  const drawAircraft = (type, x, y, heading, size, colour, ghost) => {
    ctx.save();
    ctx.translate(px(x), py(y));
    ctx.rotate(heading + Math.PI / 2);
    ctx.scale(size, size);
    ctx.beginPath();
    SHAPES[type.id](ctx);
    ctx.restore();
    ctx.lineWidth = ghost ? 0.8 : 1.1;
    ctx.strokeStyle = colour;
    ctx.stroke();
  };

  const drawGrid = () => {
    ctx.strokeStyle = "rgba(112, 242, 209, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -60; i <= 60; i += 10) {
      ctx.moveTo(px(i), py(-60));
      ctx.lineTo(px(i), py(60));
      ctx.moveTo(px(-60), py(i));
      ctx.lineTo(px(60), py(i));
    }
    ctx.stroke();
  };

  const drawRoute = (highlight) => {
    if (path.length < 2) return;
    ctx.strokeStyle = highlight ? "rgba(112, 242, 209, 0.75)" : "rgba(112, 242, 209, 0.4)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash(highlight ? [] : [6, 5]);
    ctx.beginPath();
    path.forEach((point, i) => (i === 0 ? ctx.moveTo(px(point.x), py(point.y)) : ctx.lineTo(px(point.x), py(point.y))));
    ctx.stroke();
    ctx.setLineDash([]);

    waypoints.forEach((point, i) => {
      ctx.beginPath();
      ctx.arc(px(point.x), py(point.y), 5, 0, Math.PI * 2);
      ctx.strokeStyle = "#70f2d1";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "rgba(112, 242, 209, 0.75)";
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillText(String(i + 1), px(point.x) + 8, py(point.y) - 6);
    });
  };

  // The formation, laid out from the leader in the direction of travel.
  const placeAircraft = (leader, heading) => {
    const across = { x: Math.cos(heading + Math.PI / 2), y: Math.sin(heading + Math.PI / 2) };
    const back = { x: -Math.cos(heading), y: -Math.sin(heading) };
    return squadron.map((type, index) => {
      const slot = formation.slots[index % formation.slots.length];
      const gap = type.span / 10 + 0.8;
      return {
        type,
        x: leader.x + across.x * slot[0] * gap + back.x * slot[1] * gap,
        y: leader.y + across.y * slot[0] * gap + back.y * slot[1] * gap,
      };
    });
  };

  const draw = () => {
    ctx.clearRect(0, 0, view.w, view.h);
    drawGrid();

    if (screen === "squadron") {
      const heading = -Math.PI / 2;
      placeAircraft({ x: 0, y: 6 }, heading).forEach((slot) => {
        drawAircraft(slot.type, slot.x, slot.y, heading, slot.type.span / 6, "#eaf7ff", false);
      });
      // The shape itself, drawn faintly behind, including the empty slots.
      ctx.strokeStyle = "rgba(112, 242, 209, 0.25)";
      ctx.setLineDash([3, 4]);
      formation.slots.forEach((slot, index) => {
        if (index < squadron.length) return;
        ctx.beginPath();
        ctx.arc(px(slot[0] * 2), py(6 - slot[1] * 2), 6, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      return;
    }

    drawRoute(screen === "route");

    if (screen === "route") {
      const start = along(path, 0);
      placeAircraft(start, start.heading).forEach((slot) => {
        drawAircraft(slot.type, slot.x, slot.y, start.heading, slot.type.span / 12, "rgba(234, 247, 255, 0.5)", true);
      });
      return;
    }

    const leader = along(path, travelled);
    placeAircraft(leader, leader.heading).forEach((slot) => {
      // A short trail, so the shape of the turn is readable in flight.
      ctx.strokeStyle = "rgba(112, 242, 209, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px(slot.x - Math.cos(leader.heading) * 2.4), py(slot.y - Math.sin(leader.heading) * 2.4));
      ctx.lineTo(px(slot.x), py(slot.y));
      ctx.stroke();
      drawAircraft(slot.type, slot.x, slot.y, leader.heading, slot.type.span / 9, "#eaf7ff", false);
    });
  };

  const step = (dt) => {
    clock += dt;
    if (screen !== "flight" || !flying) return;
    const total = lengthOf(path);
    // The flight runs at the slowest aircraft's speed, as a real one would.
    const knots = squadron.length ? Math.min(...squadron.map((type) => type.knots)) : 300;
    travelled += dt * (knots / 26);
    if (travelled >= total) {
      travelled = total;
      flying = false;
      describe("Flypast complete", "Every aircraft held the shape from the first waypoint to the last.");
      hintOut.textContent = "Scroll to zoom · drag to pan";
    }
  };

  const loop = (now) => {
    if (view.w === 0) fit();
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    window.requestAnimationFrame(loop);
  };

  typeList.replaceChildren(...TYPES.map((type) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<b>${type.name}</b><i>${type.year}</i>`;
    button.addEventListener("click", () => {
      if (squadron.length >= MAX_AIRCRAFT) return;
      squadron = [...squadron, type];
      paintRoster();
      report();
      describe(type.name, type.note);
    });
    button.addEventListener("pointerenter", () => describe(type.name, type.note));
    item.append(button);
    return item;
  }));

  shapeList.replaceChildren(...FORMATIONS.map((shape) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = shape.name;
    button.setAttribute("aria-pressed", String(shape === formation));
    button.addEventListener("click", () => {
      formation = shape;
      shapeList.querySelectorAll("button").forEach((other, i) => {
        other.setAttribute("aria-pressed", String(FORMATIONS[i] === formation));
      });
      describe(shape.name, `${squadron.length} aircraft in ${shape.name.toLowerCase()}.`);
    });
    item.append(button);
    return item;
  }));

  tabs.forEach((tab) => tab.addEventListener("click", () => showScreen(tab.dataset.screen)));

  clearButton.addEventListener("click", () => {
    if (screen === "route") {
      waypoints = [];
      path = [];
      report();
      describe("Route cleared", "Click the map to lay a new one.");
      return;
    }
    travelled = 0;
    flying = true;
    describe("Flypast", "Scroll to zoom, drag to pan.");
  });

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    dragged = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    dragged += Math.abs(dx) + Math.abs(dy);
    camera = { ...camera, x: camera.x - dx / scale(), y: camera.y - dy / scale() };
    lastX = event.clientX;
    lastY = event.clientY;
  });

  // A drag moves the map; a press that stays put drops a waypoint.
  canvas.addEventListener("pointerup", (event) => {
    if (dragging && dragged < 5 && screen === "route") {
      waypoints = [...waypoints, world(event.clientX, event.clientY)];
      path = spline(waypoints);
      report();
      describe("Route", `${waypoints.length} waypoints. ${Math.round(lengthOf(path) * 10)} m of flying.`);
    }
    dragging = false;
  });

  canvas.addEventListener("pointercancel", () => { dragging = false; });
  canvas.addEventListener("pointerleave", () => { dragging = false; });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const next = Math.max(0.45, Math.min(6, camera.zoom * Math.exp(-event.deltaY * 0.0015)));
    camera = { ...camera, zoom: next };
  }, { passive: false });

  paintRoster();
  showScreen("squadron");
  fit();
  if (typeof ResizeObserver === "function") new ResizeObserver(fit).observe(canvas);
  else window.addEventListener("resize", fit);

  window.requestAnimationFrame(loop);
};

document.querySelectorAll(".squadron").forEach(mount);
