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

// Twenty-two plots: the seven of the 27 club, the people who built the games
// and the machines they run on. Names are kept short so the inscription reads
// on two lines at most, and each line says what the person is remembered for.
const EPITAPHS = [
  { name: "Ada Lovelace", years: "1815 — 1852", line: "The first program, for a machine unbuilt." },
  { name: "Robert Johnson", years: "1911 — 1938", line: "Twenty-nine songs, and a long shadow." },
  { name: "Alan Turing", years: "1912 — 1954", line: "He asked whether machines could think." },
  { name: "Ralph Baer", years: "1922 — 2014", line: "He put the first game on a television." },
  { name: "Grace Hopper", years: "1906 — 1992", line: "She taught the machine plain English." },
  { name: "Brian Jones", years: "1942 — 1969", line: "He found the sound, then let it go." },
  { name: "Gunpei Yokoi", years: "1941 — 1997", line: "Lateral thinking, withered technology." },
  { name: "Satoru Iwata", years: "1959 — 2015", line: "In his heart, he was always a gamer." },
  { name: "Dennis Ritchie", years: "1941 — 2011", line: "Every language since borrowed his braces." },
  { name: "Janis Joplin", years: "1943 — 1970", line: "She spent the whole voice every night." },
  { name: "Hiroshi Yamauchi", years: "1927 — 2013", line: "Playing cards in, home consoles out." },
  { name: "Jerry Lawson", years: "1940 — 2011", line: "He made the cartridge you swapped." },
  { name: "Edsger Dijkstra", years: "1930 — 2002", line: "The shortest path is still his." },
  { name: "Jim Morrison", years: "1943 — 1971", line: "The doors stayed open behind him." },
  { name: "Masaya Nakamura", years: "1925 — 2017", line: "A yellow circle ate the whole arcade." },
  { name: "Danielle Bunten", years: "1949 — 1998", line: "She built the games you had to share." },
  { name: "Clive Sinclair", years: "1940 — 2021", line: "One rubber keyboard, one generation." },
  { name: "Jimi Hendrix", years: "1942 — 1970", line: "The sky learned a new electric colour." },
  { name: "Akira Toriyama", years: "1955 — 2024", line: "The next adventure waits in ink." },
  { name: "Amy Winehouse", years: "1983 — 2011", line: "We all sing the hard parts now." },
  { name: "Kurt Cobain", years: "1967 — 1994", line: "The amp is quiet. The feedback stays." },
  { name: "Gary Gygax", years: "1938 — 2008", line: "He rolled the dice that started it all." },
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

const stoneKind = (id) => ["headstone", "cross-top", "obelisk", "ledger"][id % 4];

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

  const memorial = document.createElement("article");
  memorial.className = "graveyard__memorial";
  memorial.setAttribute("aria-live", "polite");
  memorial.innerHTML = '<div class="graveyard__memorial-stone"><span class="graveyard__memorial-kicker">In loving memory</span><b></b><span class="graveyard__memorial-years"></span><p></p><i>RIP</i></div>';
  field.append(memorial);
  const memorialName = memorial.querySelector("b");
  const memorialYears = memorial.querySelector(".graveyard__memorial-years");
  const memorialLine = memorial.querySelector("p");

  let at = START;
  const read = new Set();
  let walkTimer;

  totalOut.textContent = String(STONES.size);

  const placeWalker = () => {
    walker.style.setProperty("--x", String(at.x));
    walker.style.setProperty("--y", String(at.y));
  };

  const hideMemorial = () => memorial.removeAttribute("data-visible");

  const showStone = (stone) => {
    memorial.dataset.kind = stoneKind(stone.id);
    memorialName.textContent = stone.name;
    memorialYears.textContent = stone.years;
    memorialLine.textContent = stone.line;
    requestAnimationFrame(() => memorial.dataset.visible = "");
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
    showStone(stone);
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

    hideMemorial();
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
      hideMemorial();
      walk(approach.path, () => readStone(stone, tile, { x, y }));
      return;
    }
    hideMemorial();
    walk(pathTo({ x, y }));
  });

  placeWalker();
};

document.querySelectorAll(".graveyard").forEach(mount);
