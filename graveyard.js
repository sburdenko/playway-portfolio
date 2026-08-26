const MAP = [
  "..#.#.#...#.#.#..",
  ".................",
  "..#.#.#...#.#.#..",
  ".................",
  "..#.#.......#.#..",
  ".................",
  "..#.#.#...#.#.#..",
  ".................",
];

const COLS = MAP[0].length;
const ROWS = MAP.length;
const STONE = "#";

const EPITAPHS = [
  { name: "Marion Ashby", years: "1901 — 1974", line: "Kept the lighthouse lit for forty winters. Never once mentioned it." },
  { name: "Tobias Reed", years: "1888 — 1931", line: "Buried facing the sea, at his insistence, against everyone's advice." },
  { name: "Elsie Warrick", years: "1922 — 2009", line: "Taught half the town to swim. Feared deep water her whole life." },
  { name: "Nathaniel Poe", years: "1934 — 1961", line: "He said he would be back by autumn. The stone was carved in spring." },
  { name: "Ada Fenwick", years: "1899 — 1988", line: "Wrote letters to a brother who never answered. Kept writing anyway." },
  { name: "Cormac Hale", years: "1945 — 2003", line: "Owned the hardware shop on Third. Fixed things nobody asked him to." },
  { name: "Juniper Voss", years: "1958 — 1997", line: "Planted the elms along the north path. She is under the tallest one." },
  { name: "Silas Merrin", years: "1876 — 1940", line: "Dug most of the graves on this hill. Someone else had to dig his." },
  { name: "Harriet Lowe", years: "1910 — 1995", line: "Outlived three husbands and one very determined rooster." },
  { name: "Peter Calloway", years: "1963 — 1981", line: "Eighteen years, and still the loudest laugh anyone here remembers." },
  { name: "Ruth Ambrose", years: "1927 — 2014", line: "Left the porch light on for a son who came home too late to see it." },
  { name: "Desmond Kite", years: "1890 — 1952", line: "Believed the hill was haunted. Now the hill believes it too." },
  { name: "Winifred Sage", years: "1941 — 2016", line: "Read every book in the county library. Twice, for the good ones." },
  { name: "Absalom Frey", years: "1855 — 1919", line: "First name on this hill. He has had a long time to get used to it." },
  { name: "Clara Dunmore", years: "1972 — 2011", line: "The bench by the gate is hers. Sit if you like. She wouldn't mind." },
  { name: "Owen Blackwell", years: "1905 — 1968", line: "Promised his wife the last word. This is it." },
  { name: "Margery Vale", years: "1933 — 1999", line: "Fed every stray in town and named them all after saints." },
  { name: "Hollis Crane", years: "1918 — 1944", line: "Went away in uniform. The stone came home instead." },
];

const key = (x, y) => `${x},${y}`;

const buildStones = () => {
  const stones = new Map();
  let n = 0;

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (MAP[y][x] !== STONE) continue;
      stones.set(key(x, y), { ...EPITAPHS[n % EPITAPHS.length], id: n });
      n += 1;
    }
  }

  return stones;
};

const STONES = buildStones();

const START = { x: 0, y: ROWS - 1 };

const MOVES = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
};

const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

const stoneKind = (id) => ["headstone", "cross", "obelisk", "ledger"][id % 4];

const mount = (root) => {
  const field = root.querySelector(".graveyard__field");
  const readOut = root.querySelector("[data-read]");
  const totalOut = root.querySelector("[data-total]");

  if (!field || !readOut || !totalOut) return;

  field.style.setProperty("--cols", String(COLS));
  field.style.setProperty("--rows", String(ROWS));

  const tiles = new Map();

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = document.createElement("div");
      tile.className = "graveyard__tile";
      const stone = STONES.get(key(x, y));
      if (stone) {
        tile.dataset.stone = "";
        tile.dataset.stoneKind = stoneKind(stone.id);
        tile.title = stone.name;
        const marker = document.createElement("span");
        marker.className = "graveyard__marker";
        marker.setAttribute("aria-hidden", "true");
        tile.append(marker);
      }
      tile.dataset.x = String(x);
      tile.dataset.y = String(y);
      field.append(tile);
      tiles.set(key(x, y), tile);
    }
  }

  const walker = document.createElement("div");
  walker.className = "graveyard__walker";
  walker.setAttribute("aria-hidden", "true");
  field.append(walker);

  let at = START;
  const read = new Set();
  let activeBubble;
  let walkTimer;

  totalOut.textContent = String(STONES.size);

  const placeWalker = () => {
    walker.style.setProperty("--x", String(at.x));
    walker.style.setProperty("--y", String(at.y));
  };

  const clearBubble = () => {
    if (!activeBubble) return;
    const tile = activeBubble.closest(".graveyard__tile");
    tile?.removeAttribute("data-speaking");
    delete tile?.dataset.speechEdge;
    delete tile?.dataset.speechSide;
    activeBubble.remove();
    activeBubble = undefined;
  };

  const showStone = (stone, tile) => {
    clearBubble();
    const bubble = document.createElement("div");
    bubble.className = "graveyard__speech";
    bubble.setAttribute("role", "status");

    const name = document.createElement("b");
    name.textContent = stone.name;
    const years = document.createElement("span");
    years.textContent = stone.years;
    const line = document.createElement("p");
    line.textContent = stone.line;
    bubble.append(name, years, line);

    if (Number(tile.dataset.x) < 3) tile.dataset.speechEdge = "left";
    if (Number(tile.dataset.x) > COLS - 4) tile.dataset.speechEdge = "right";
    if (Number(tile.dataset.y) < 2) tile.dataset.speechSide = "below";
    tile.dataset.speaking = "";
    tile.append(bubble);
    requestAnimationFrame(() => bubble.dataset.visible = "");
    activeBubble = bubble;
    root.dataset.reading = "true";
  };

  const markRead = (stone, tile) => {
    read.add(stone.id);
    tile.dataset.read = "";
    readOut.textContent = String(read.size);
    if (read.size === STONES.size) {
      root.dataset.complete = "true";
    }
  };

  const face = (dx) => {
    if (dx) walker.dataset.facing = dx < 0 ? "left" : "right";
  };

  const pathTo = (target) => {
    const startKey = key(at.x, at.y);
    const targetKey = key(target.x, target.y);
    const queue = [at];
    const previous = new Map([[startKey, null]]);

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      if (key(current.x, current.y) === targetKey) break;
      for (const move of DIRECTIONS) {
        const next = { x: current.x + move.dx, y: current.y + move.dy };
        const nextKey = key(next.x, next.y);
        if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS || STONES.has(nextKey) || previous.has(nextKey)) continue;
        previous.set(nextKey, current);
        queue.push(next);
      }
    }

    if (!previous.has(targetKey)) return [];
    const path = [];
    for (let current = target; key(current.x, current.y) !== startKey; current = previous.get(key(current.x, current.y))) path.unshift(current);
    return path;
  };

  const nearestApproach = (stoneAt) => {
    const options = DIRECTIONS
      .map(({ dx, dy }) => ({ x: stoneAt.x + dx, y: stoneAt.y + dy }))
      .filter(({ x, y }) => x >= 0 && x < COLS && y >= 0 && y < ROWS && !STONES.has(key(x, y)))
      .map((spot) => ({ spot, path: pathTo(spot) }))
      .filter(({ spot, path }) => path.length || (at.x === spot.x && at.y === spot.y));
    options.sort((a, b) => a.path.length - b.path.length);
    return options[0];
  };

  const walk = (path, onArrival) => {
    window.clearTimeout(walkTimer);
    const next = path.shift();
    if (!next) {
      walker.removeAttribute("data-walking");
      onArrival?.();
      return;
    }
    face(next.x - at.x);
    walker.dataset.walking = "";
    at = next;
    placeWalker();
    walkTimer = window.setTimeout(() => walk(path, onArrival), 145);
  };

  const readStone = (stone, tile, from) => {
    face(from.x - at.x);
    showStone(stone, tile);
    markRead(stone, tile);
  };

  const step = (dx, dy) => {
    const nx = at.x + dx;
    const ny = at.y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;

    const stone = STONES.get(key(nx, ny));
    if (stone) {
      readStone(stone, tiles.get(key(nx, ny)), { x: nx, y: ny });
      return;
    }

    clearBubble();
    face(dx);
    at = { x: nx, y: ny };
    walker.dataset.walking = "";
    placeWalker();
    window.clearTimeout(walkTimer);
    walkTimer = window.setTimeout(() => walker.removeAttribute("data-walking"), 145);
  };

  field.addEventListener("keydown", (event) => {
    const move = MOVES[event.key];
    if (!move) return;
    event.preventDefault();
    step(move.dx, move.dy);
  });

  field.addEventListener("click", (event) => {
    const tile = event.target.closest(".graveyard__tile");
    if (!tile) return;
    const x = Number(tile.dataset.x);
    const y = Number(tile.dataset.y);
    const stone = STONES.get(key(x, y));
    if (stone) {
      const approach = nearestApproach({ x, y });
      if (!approach) return;
      clearBubble();
      walk(approach.path, () => readStone(stone, tile, { x, y }));
      return;
    }
    clearBubble();
    walk(pathTo({ x, y }));
  });

  placeWalker();
};

document.querySelectorAll(".graveyard").forEach(mount);
