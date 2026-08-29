// Word Bend, playable: the words are not laid in straight lines but along
// paths that turn corners, and the reader traces them. Five levels, each one
// larger, wordier and more crooked than the one before.
const LEVELS = [
  { size: 6, bends: 1, words: ["BEND", "WORD", "LINK"] },
  { size: 7, bends: 1, words: ["PUZZLE", "DAILY", "GRID", "TURN"] },
  { size: 8, bends: 2, words: ["CORNER", "STREAK", "SHAPE", "LEVEL", "TWIST"] },
  { size: 9, bends: 2, words: ["JOURNEY", "PATTERN", "SPIRAL", "HIDDEN", "ANGLE"] },
  { size: 10, bends: 3, words: ["LABYRINTH", "CROSSING", "MEANDER", "VERTEX", "RIDDLE", "SNAKE"] },
];

const INKS = ["#ff4d9d", "#ff9a3d", "#e5e63a", "#35c8ff", "#c14bff", "#ff5f5f"];
const ALPHABET = "AABCDEEGHIIKLLMNNOPRRSSTTUVWY";

const STEPS = [
  { dx: 1, dy: 0, from: "left", to: "right" },
  { dx: -1, dy: 0, from: "right", to: "left" },
  { dx: 0, dy: 1, from: "up", to: "down" },
  { dx: 0, dy: -1, from: "down", to: "up" },
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const stepFrom = (index, step, size) => {
  const x = (index % size) + step.dx;
  const y = Math.floor(index / size) + step.dy;
  if (x < 0 || x >= size || y < 0 || y >= size) return null;
  return y * size + x;
};

// A path that mostly runs straight and turns only where it has to reads as a
// bent word; one that turns at every cell reads as noise.
const tracePath = (length, size, taken, bends) => {
  const start = Math.floor(Math.random() * size * size);
  if (taken.has(start)) return null;

  const path = [start];
  const used = new Set([start]);
  let heading = pick(STEPS);
  let turns = 0;

  while (path.length < length) {
    const here = path[path.length - 1];
    const options = [];

    for (const step of STEPS) {
      const turning = step !== heading;
      if (turning && turns >= bends) continue;
      if (step.dx === -heading.dx && step.dy === -heading.dy) continue;
      const next = stepFrom(here, step, size);
      if (next === null || taken.has(next) || used.has(next)) continue;
      options.push({ step, next, turning });
    }

    if (!options.length) return null;

    const straight = options.filter((option) => !option.turning);
    const chosen = straight.length && Math.random() < 0.62 ? pick(straight) : pick(options);
    if (chosen.turning) turns += 1;
    heading = chosen.step;
    path.push(chosen.next);
    used.add(chosen.next);
  }

  return path;
};

const layOut = ({ size, bends, words }) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const taken = new Map();
    const placed = [];

    // Longest first: the crooked long words need the room while it is free.
    const order = [...words].sort((a, b) => b.length - a.length);
    const ok = order.every((text, order_index) => {
      for (let tries = 0; tries < 240; tries += 1) {
        const path = tracePath(text.length, size, taken, bends);
        if (!path) continue;
        path.forEach((cell, i) => taken.set(cell, { letter: text[i], word: order_index }));
        placed.push({ text, path, ink: INKS[order_index % INKS.length], found: false });
        return true;
      }
      return false;
    });

    if (ok) return { size, taken, words: placed };
  }

  return null;
};

const buildBoard = (level) => {
  const laid = layOut(level);
  if (!laid) return null;

  const cells = Array.from({ length: laid.size * laid.size }, (_, i) => ({
    letter: laid.taken.get(i)?.letter || pick(ALPHABET),
  }));

  return { size: laid.size, cells, words: laid.words };
};

const samePath = (a, b) =>
  a.length === b.length && (a.every((v, i) => v === b[i]) || a.every((v, i) => v === b[b.length - 1 - i]));

const mount = (root) => {
  const grid = root.querySelector(".bendfield__grid");
  const lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  lines.setAttribute("class", "bendfield__lines");
  lines.setAttribute("aria-hidden", "true");
  lines.setAttribute("preserveAspectRatio", "none");
  const list = root.querySelector(".bendfield__words");
  const status = root.querySelector(".bendfield__status");
  const levelOut = root.querySelector("[data-level-out]");
  const foundOut = root.querySelector("[data-found]");
  const totalOut = root.querySelector("[data-total]");
  const shuffle = root.querySelector(".bendfield__reset");
  if (!grid || !list) return;

  let level = 0;
  let board = null;
  let trace = [];
  let dragging = false;
  let drew = false;
  let advance = 0;

  const cellAt = (index) => grid.querySelectorAll(".bendfield__cell")[index];

  // The selection is one stroked line through the middle of the letters, with
  // round caps and round joins — a bar of even width that turns corners, the
  // way the game draws it. Colouring the tiles themselves gave beads on a
  // string: the corners pinched and every gap showed.
  const centreOf = (index) => {
    const grid_box = grid.getBoundingClientRect();
    const box = cellAt(index).getBoundingClientRect();
    return {
      x: box.left - grid_box.left + box.width / 2,
      y: box.top - grid_box.top + box.height / 2,
    };
  };

  const strokeWidth = () => {
    const box = cellAt(0).getBoundingClientRect();
    return box.width * 0.86;
  };

  const line = (path, ink, opacity) => {
    const points = path.map(centreOf).map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    shape.setAttribute("points", points);
    shape.setAttribute("fill", "none");
    shape.setAttribute("stroke", ink);
    shape.setAttribute("stroke-width", String(strokeWidth()));
    shape.setAttribute("stroke-linecap", "round");
    shape.setAttribute("stroke-linejoin", "round");
    if (opacity) shape.setAttribute("stroke-opacity", String(opacity));
    return shape;
  };

  const draw = () => {
    if (!board || !grid.querySelector(".bendfield__cell")) return;
    const box = grid.getBoundingClientRect();
    lines.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    lines.replaceChildren(
      ...board.words.filter((word) => word.found).map((word) => line(word.path, word.ink)),
      ...(trace.length ? [line(trace, "#efe9ff", 0.42)] : []),
    );
  };

  const paintTrace = () => {
    grid.querySelectorAll(".bendfield__cell").forEach((cell, i) => cell.toggleAttribute("data-live", trace.includes(i)));
    draw();
  };

  const paintWord = (word) => {
    word.path.forEach((index) => cellAt(index).setAttribute("data-found", ""));
    draw();
  };

  const paintList = () => {
    list.replaceChildren(...board.words.map((word) => {
      const item = document.createElement("li");
      item.textContent = word.text;
      item.style.setProperty("--ink", word.ink);
      if (word.found) item.setAttribute("data-found", "");
      return item;
    }));
    foundOut.textContent = String(board.words.filter((word) => word.found).length);
    totalOut.textContent = String(board.words.length);
  };

  const build = () => {
    window.clearTimeout(advance);
    board = buildBoard(LEVELS[level]);
    if (!board) {
      status.textContent = "That layout would not fit. Shuffle for another.";
      return;
    }

    trace = [];
    dragging = false;
    drew = false;
    root.style.setProperty("--size", String(board.size));
    levelOut.textContent = String(level + 1);
    grid.replaceChildren(lines, ...board.cells.map((cell, index) => {
      const button = document.createElement("button");
      button.className = "bendfield__cell";
      button.type = "button";
      button.dataset.index = String(index);
      button.textContent = cell.letter;
      return button;
    }));
    paintList();
    draw();
    status.textContent = level === 0
      ? "Drag across neighbours to trace a word — it turns corners."
      : `Level ${level + 1}. ${board.words.length} words, and they bend more.`;
  };

  const finish = () => {
    const text = trace.map((index) => board.cells[index].letter).join("");
    const word = board.words.find((entry) => !entry.found && entry.text === text && samePath(trace, entry.path));

    if (word) {
      word.found = true;
      paintWord(word);
      paintList();
      const left = board.words.filter((entry) => !entry.found).length;
      status.textContent = left
        ? `${word.text}. ${left} to go.`
        : level + 1 < LEVELS.length
          ? `${word.text}. Level ${level + 1} bent — next one is longer.`
          : "All five levels bent. That is the whole loop.";
      if (!left && level + 1 < LEVELS.length) {
        advance = window.setTimeout(() => { level += 1; build(); }, 1400);
      }
    } else if (trace.length > 1) {
      status.textContent = "Not a word on the list. Trace it corner to corner.";
    }

    trace = [];
    paintTrace();
  };

  // A trace ends when it spells one of the words; anything shorter is still
  // being drawn, so a tap that lands mid-word leaves the path standing.
  const settle = () => {
    const text = trace.map((index) => board.cells[index].letter).join("");
    if (board.words.some((word) => !word.found && word.text === text && samePath(trace, word.path))) finish();
  };

  const extend = (index) => {
    const last = trace[trace.length - 1];
    if (index === last) return;
    if (trace.length > 1 && index === trace[trace.length - 2]) {
      trace = trace.slice(0, -1);
      paintTrace();
      return;
    }
    if (trace.includes(index)) return;
    const adjacent = STEPS.some((step) => stepFrom(last, step, board.size) === index);
    if (!adjacent) return;
    trace = [...trace, index];
    paintTrace();
  };

  const indexOf = (event) => {
    const cell = event.target.closest(".bendfield__cell");
    return cell ? Number(cell.dataset.index) : null;
  };

  grid.addEventListener("pointerdown", (event) => {
    const index = indexOf(event);
    if (index === null || !board) return;
    event.preventDefault();
    // A tap leaves the path open so the next tap carries it on: the same trace
    // works with a finger, a mouse held down, or the keyboard.
    if (trace.length && STEPS.some((step) => stepFrom(trace[trace.length - 1], step, board.size) === index)) {
      extend(index);
    } else {
      trace = [index];
      paintTrace();
    }
    dragging = true;
    drew = false;
    grid.setPointerCapture(event.pointerId);
  });

  grid.addEventListener("pointermove", (event) => {
    if (!dragging || !board) return;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const cell = under && under.closest(".bendfield__cell");
    if (!cell) return;
    const before = trace.length;
    extend(Number(cell.dataset.index));
    if (trace.length !== before) drew = true;
  });

  grid.addEventListener("pointerup", (event) => {
    if (!dragging) return;
    dragging = false;
    if (grid.hasPointerCapture(event.pointerId)) grid.releasePointerCapture(event.pointerId);
    if (drew) finish();
    else settle();
  });

  grid.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const index = indexOf(event);
    if (index === null) return;
    event.preventDefault();
    if (trace.length && STEPS.some((step) => stepFrom(trace[trace.length - 1], step, board.size) === index)) {
      extend(index);
      settle();
    } else {
      trace = [index];
      paintTrace();
    }
  });

  shuffle.addEventListener("click", build);
  new ResizeObserver(draw).observe(grid);
  build();
};

document.querySelectorAll(".bendfield").forEach(mount);
