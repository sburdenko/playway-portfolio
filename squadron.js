// RAF100 put a century of aircraft in the sky over a real place. This is the
// same job in three steps: pick the squadron and its shape, draw where it goes,
// then fly it and follow it with the camera.
// span and length are the real ones in metres, so each aircraft is drawn in
// its own proportions rather than as a fighter of a different size.
import { onStage } from "./frames.js";

const TYPES = [
  {
    id: "camel", name: "Sopwith Camel", year: 1917, span: 8.5, length: 5.7, knots: 100,
    note: "The Great War fighter the service was founded on. Two wings, one rotary engine.",
  },
  {
    id: "spitfire", name: "Spitfire", year: 1938, span: 11.2, length: 9.1, knots: 330,
    note: "Elliptical wing, and the shape everybody draws from memory.",
  },
  {
    id: "lancaster", name: "Lancaster", year: 1942, span: 31.1, length: 21.2, knots: 240,
    note: "Four engines, twin fins, and the widest span in the flight.",
  },
  {
    id: "vulcan", name: "Vulcan", year: 1956, span: 33.8, length: 30.5, knots: 540,
    note: "A delta the size of a house, and the loudest thing here.",
  },
  {
    id: "typhoon", name: "Typhoon", year: 2003, span: 10.9, length: 15.9, knots: 700,
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
// A metre, in world units, at the size the aircraft are drawn.
const METRE = 0.42;
// How each aircraft holds its place: it flies its own machine and steers for
// its station rather than being pinned to it, so a turn spreads the outside of
// the formation and tightens the inside the way a real one does.
const TURN_RATE = 2.6;        // radians a second
const FORM_GAIN = 2.2;        // how hard an aircraft pulls back onto its station
const TRAIL_POINTS = 70;
const TRAIL_SPACING = 0.5;
const SCREENS = ["squadron", "route", "flight"];

// Each outline is drawn from above in its own frame: x is the span, half either
// side of the centreline; y is the length, nose at -0.5 and tail at +0.5. The
// caller scales x by the span and y by the length, so a Lancaster comes out
// wide and stubby and a Typhoon long and narrow, the way they really are.
const SHAPES = {
  // Biplane: two staggered wings, a rotary cowling, and a small round tail.
  camel: (ctx) => {
    ctx.moveTo(-0.06, -0.42); ctx.lineTo(0.06, -0.42);
    ctx.lineTo(0.05, 0.34); ctx.lineTo(-0.05, 0.34); ctx.closePath();
    ctx.moveTo(-0.5, -0.14); ctx.lineTo(0.5, -0.14);
    ctx.moveTo(-0.5, -0.02); ctx.lineTo(0.5, -0.02);
    ctx.moveTo(-0.5, -0.14); ctx.lineTo(-0.5, -0.02);
    ctx.moveTo(0.5, -0.14); ctx.lineTo(0.5, -0.02);
    ctx.moveTo(-0.09, -0.5); ctx.lineTo(0.09, -0.5);
    ctx.moveTo(-0.19, 0.42); ctx.lineTo(0.19, 0.42);
    ctx.moveTo(0, 0.34); ctx.lineTo(0, 0.5);
  },
  // The wing everybody knows: an ellipse leading and trailing, tapering to tips.
  spitfire: (ctx) => {
    ctx.moveTo(-0.045, -0.5); ctx.lineTo(0.045, -0.5);
    ctx.lineTo(0.035, 0.42); ctx.lineTo(-0.035, 0.42); ctx.closePath();
    ctx.moveTo(0, -0.16);
    ctx.bezierCurveTo(-0.24, -0.2, -0.46, -0.12, -0.5, 0.02);
    ctx.bezierCurveTo(-0.46, 0.14, -0.22, 0.14, 0, 0.06);
    ctx.bezierCurveTo(0.22, 0.14, 0.46, 0.14, 0.5, 0.02);
    ctx.bezierCurveTo(0.46, -0.12, 0.24, -0.2, 0, -0.16);
    ctx.moveTo(-0.17, 0.4); ctx.bezierCurveTo(-0.1, 0.46, 0.1, 0.46, 0.17, 0.4);
    ctx.moveTo(0, 0.42); ctx.lineTo(0, 0.5);
  },
  // Four engines on a long straight wing, and the twin fins that name it.
  lancaster: (ctx) => {
    ctx.moveTo(-0.05, -0.5); ctx.lineTo(0.05, -0.5);
    ctx.lineTo(0.05, 0.4); ctx.lineTo(-0.05, 0.4); ctx.closePath();
    ctx.moveTo(-0.5, 0.02); ctx.lineTo(-0.47, -0.12);
    ctx.lineTo(0.47, -0.12); ctx.lineTo(0.5, 0.02); ctx.closePath();
    [-0.33, -0.19, 0.19, 0.33].forEach((x) => {
      ctx.moveTo(x - 0.03, -0.2); ctx.lineTo(x + 0.03, -0.2);
      ctx.lineTo(x + 0.03, 0.0); ctx.lineTo(x - 0.03, 0.0); ctx.closePath();
    });
    ctx.moveTo(-0.22, 0.34); ctx.lineTo(0.22, 0.34);
    ctx.moveTo(-0.22, 0.34); ctx.lineTo(-0.22, 0.46);
    ctx.moveTo(0.22, 0.34); ctx.lineTo(0.22, 0.46);
  },
  // One triangle, a needle nose and a single fin.
  vulcan: (ctx) => {
    ctx.moveTo(0, -0.5);
    ctx.lineTo(0.5, 0.42); ctx.lineTo(0.22, 0.44);
    ctx.lineTo(0.05, 0.36); ctx.lineTo(-0.05, 0.36);
    ctx.lineTo(-0.22, 0.44); ctx.lineTo(-0.5, 0.42); ctx.closePath();
    ctx.moveTo(0, -0.28); ctx.lineTo(0, 0.5);
  },
  // Delta wing, canards up front, one fin.
  typhoon: (ctx) => {
    ctx.moveTo(0, -0.5);
    ctx.lineTo(0.04, -0.12); ctx.lineTo(0.5, 0.32); ctx.lineTo(0.5, 0.4);
    ctx.lineTo(0.09, 0.4); ctx.lineTo(0.07, 0.5); ctx.lineTo(-0.07, 0.5);
    ctx.lineTo(-0.09, 0.4); ctx.lineTo(-0.5, 0.4); ctx.lineTo(-0.5, 0.32);
    ctx.lineTo(-0.04, -0.12); ctx.closePath();
    ctx.moveTo(-0.05, -0.26); ctx.lineTo(-0.26, -0.12); ctx.lineTo(-0.05, -0.16);
    ctx.moveTo(0.05, -0.26); ctx.lineTo(0.26, -0.12); ctx.lineTo(0.05, -0.16);
    ctx.moveTo(0, 0.12); ctx.lineTo(0, 0.5);
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
  let craft = [];
  let camera = { x: 0, y: 0, zoom: 1 };
  let follow = true;
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
      launch();
      follow = true;
      const start = path.length > 1 ? along(path, 0) : { x: 0, y: 0 };
      camera = { x: start.x, y: start.y, zoom: 2.2 };
      describe("Flypast", "The camera rides with the flight. Scroll to zoom, drag to break away.");
      hintOut.textContent = "Scroll to zoom · drag to pan";
    }
    clearButton.textContent = screen === "route" ? "Clear route" : screen === "flight" ? "Fly again" : "Clear";
    report();
  };

  // Drawn at its real span and length, in metres, at whatever the view scale is.
  const drawAircraft = (type, x, y, heading, colour, ghost) => {
    const unit = scale() * METRE;
    ctx.save();
    ctx.translate(px(x), py(y));
    ctx.rotate(heading + Math.PI / 2);
    ctx.scale(type.span * unit, type.length * unit);
    ctx.beginPath();
    SHAPES[type.id](ctx);
    ctx.restore();
    ctx.lineWidth = ghost ? 0.9 : 1.2;
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

  // The formation, laid out from the leader in the direction of travel. Every
  // slot is spaced off the widest aircraft in the flight, not off whichever one
  // happens to sit in it — otherwise the shape bends around the big ones.
  const spacing = () => {
    const widest = squadron.reduce((most, type) => Math.max(most, type.span), 10);
    return widest * METRE * 1.35;
  };

  const slotAt = (leader, heading, index) => {
    const across = { x: Math.cos(heading + Math.PI / 2), y: Math.sin(heading + Math.PI / 2) };
    const back = { x: -Math.cos(heading), y: -Math.sin(heading) };
    const gap = spacing();
    const slot = formation.slots[index % formation.slots.length];
    return {
      x: leader.x + across.x * slot[0] * gap + back.x * slot[1] * gap,
      y: leader.y + across.y * slot[0] * gap + back.y * slot[1] * gap,
    };
  };

  const placeAircraft = (leader, heading) =>
    squadron.map((type, index) => ({ type, ...slotAt(leader, heading, index) }));

  // The same maths for the empty places, so the dashed slots sit exactly where
  // an aircraft would go rather than on a scale of their own.
  const emptySlots = (leader, heading) =>
    formation.slots
      .map((_, index) => index)
      .filter((index) => index >= squadron.length)
      .map((index) => slotAt(leader, heading, index));

  // A Lancaster flight is twenty times the width of a pair of Spitfires, so the
  // squadron view is framed to whatever is actually in it rather than to a
  // fixed scale that either shrinks the small flights or loses the big ones.
  const frameSquadron = (leader, heading) => {
    const points = [...placeAircraft(leader, heading), ...emptySlots(leader, heading)];
    if (points.length === 0) return;
    const margin = Math.max(...squadron.map((type) => type.span), 12) * METRE * 0.9;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs) - margin;
    const maxX = Math.max(...xs) + margin;
    const minY = Math.min(...ys) - margin;
    const maxY = Math.max(...ys) + margin;
    const base = Math.min(view.w, view.h) / 70;
    const zoom = Math.min(view.w / ((maxX - minX) * base), view.h / ((maxY - minY) * base));
    camera = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom };
  };

  const draw = () => {
    ctx.clearRect(0, 0, view.w, view.h);
    drawGrid();

    if (screen === "squadron") {
      const heading = -Math.PI / 2;
      const leader = { x: 0, y: 0 };
      frameSquadron(leader, heading);
      ctx.strokeStyle = "rgba(112, 242, 209, 0.28)";
      ctx.setLineDash([3, 4]);
      emptySlots(leader, heading).forEach((slot) => {
        ctx.beginPath();
        ctx.arc(px(slot.x), py(slot.y), Math.max(5, spacing() * scale() * 0.3), 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      placeAircraft(leader, heading).forEach((slot) => {
        drawAircraft(slot.type, slot.x, slot.y, heading, "#eaf7ff", false);
      });
      return;
    }

    drawRoute(screen === "route");

    if (screen === "route") {
      if (path.length < 2) return;
      const start = along(path, 0);
      placeAircraft(start, start.heading).forEach((slot) => {
        drawAircraft(slot.type, slot.x, slot.y, start.heading, "rgba(234, 247, 255, 0.5)", true);
      });
      return;
    }

    // Each aircraft leaves the wake it actually flew, so a turn shows as a set
    // of curves that spread on the outside and tighten on the inside.
    ctx.lineWidth = 1.1;
    craft.forEach((machine) => {
      for (let k = 1; k < machine.trail.length; k += 1) {
        const age = 1 - k / machine.trail.length;
        ctx.strokeStyle = `rgba(112, 242, 209, ${0.32 * (1 - age)})`;
        ctx.beginPath();
        ctx.moveTo(px(machine.trail[k - 1].x), py(machine.trail[k - 1].y));
        ctx.lineTo(px(machine.trail[k].x), py(machine.trail[k].y));
        ctx.stroke();
      }
    });

    craft.forEach((machine) => {
      drawAircraft(machine.type, machine.x, machine.y, machine.heading, "#eaf7ff", false);
    });
  };

  // The flight runs at the slowest aircraft's speed, as a real one would.
  const flightSpeed = () =>
    (squadron.length ? Math.min(...squadron.map((type) => type.knots)) : 300) / 26;

  const launch = () => {
    travelled = 0;
    flying = true;
    if (path.length < 2) { craft = []; return; }
    const lead = along(path, 0);
    craft = squadron.map((type, index) => {
      const station = slotAt(lead, lead.heading, index);
      return { type, x: station.x, y: station.y, heading: lead.heading, trail: [] };
    });
  };

  const wrapAngle = (value) => ((value + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

  // One aircraft, one frame. It flies the leader's velocity plus a pull back
  // toward its own station — chasing the station outright makes a wingman
  // overshoot and circle, which is what a formation never does.
  const fly = (machine, station, leadHeading, dt) => {
    const base = flightSpeed();
    const wantX = Math.cos(leadHeading) * base + (station.x - machine.x) * FORM_GAIN;
    const wantY = Math.sin(leadHeading) * base + (station.y - machine.y) * FORM_GAIN;

    const swing = wrapAngle(Math.atan2(wantY, wantX) - machine.heading);
    const heading = machine.heading + Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, swing));

    // Throttle follows the same demand, within what the aircraft has to give.
    const speed = Math.max(base * 0.5, Math.min(base * 1.8, Math.hypot(wantX, wantY)));
    const x = machine.x + Math.cos(heading) * speed * dt;
    const y = machine.y + Math.sin(heading) * speed * dt;

    const last = machine.trail[machine.trail.length - 1];
    const trail = !last || Math.hypot(x - last.x, y - last.y) > TRAIL_SPACING
      ? [...machine.trail, { x, y }].slice(-TRAIL_POINTS)
      : machine.trail;

    return { ...machine, x, y, heading, trail };
  };

  const step = (dt) => {
    clock += dt;
    if (screen !== "flight") return;

    // The camera rides with the flight until the viewer takes hold of it.
    if (follow && craft.length > 0) {
      const lead = craft[0];
      const ease = Math.min(1, dt * 2.6);
      camera = { ...camera, x: camera.x + (lead.x - camera.x) * ease, y: camera.y + (lead.y - camera.y) * ease };
    }

    if (!flying || path.length < 2) return;
    const total = lengthOf(path);
    travelled = Math.min(total, travelled + dt * flightSpeed());
    const lead = along(path, travelled);

    craft = craft.map((machine, index) =>
      fly(machine, slotAt(lead, lead.heading, index), lead.heading, dt));

    if (travelled >= total) {
      // The leader is home; the flight is over once the last one has caught up.
      const settled = craft.every((machine, index) => {
        const station = slotAt(lead, lead.heading, index);
        return Math.hypot(station.x - machine.x, station.y - machine.y) < spacing() * 0.12;
      });
      if (settled) {
        flying = false;
        describe("Flypast complete", "Each aircraft flew its own machine and held its station through every turn.");
        hintOut.textContent = "Scroll to zoom · drag to pan";
      }
    }
  };

  const loop = (now) => {
    if (view.w === 0) fit();
    const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
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
    launch();
    follow = true;
    describe("Flypast", "The camera rides with the flight. Scroll to zoom, drag to break away.");
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
    if (dragged > 5) follow = false;
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

  onStage(canvas, loop);
};

document.querySelectorAll(".squadron").forEach(mount);
