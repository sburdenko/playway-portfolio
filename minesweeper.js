const COLS = 9;
const ROWS = 9;
const MINES = 10;
const CELLS = COLS * ROWS;

const HIDDEN = "hidden";
const REVEALED = "revealed";
const FLAGGED = "flagged";

const READY = "ready";
const PLAYING = "playing";
const WON = "won";
const LOST = "lost";

const neighbours = (index) => {
  const x = index % COLS;
  const y = Math.floor(index / COLS);
  const found = [];

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      found.push(ny * COLS + nx);
    }
  }

  return found;
};

const NEIGHBOURS = Array.from({ length: CELLS }, (_, i) => neighbours(i));

const emptyBoard = () =>
  Array.from({ length: CELLS }, () => ({ mine: false, adjacent: 0, state: HIDDEN }));

const pickMines = (safeIndex) => {
  const forbidden = new Set([safeIndex, ...NEIGHBOURS[safeIndex]]);
  const candidates = [];
  for (let i = 0; i < CELLS; i += 1) {
    if (!forbidden.has(i)) candidates.push(i);
  }

  const chosen = new Set();
  while (chosen.size < Math.min(MINES, candidates.length)) {
    chosen.add(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  return chosen;
};

const plantBoard = (safeIndex) => {
  const mines = pickMines(safeIndex);
  return Array.from({ length: CELLS }, (_, i) => ({
    mine: mines.has(i),
    adjacent: NEIGHBOURS[i].filter((n) => mines.has(n)).length,
    state: HIDDEN,
  }));
};

const withState = (board, index, state) =>
  board.map((cell, i) => (i === index ? { ...cell, state } : cell));

const revealFrom = (board, index) => {
  const next = board.slice();
  const queue = [index];
  const seen = new Set();

  while (queue.length > 0) {
    const at = queue.pop();
    if (seen.has(at)) continue;
    seen.add(at);

    const cell = next[at];
    if (cell.state === REVEALED || cell.state === FLAGGED) continue;

    next[at] = { ...cell, state: REVEALED };
    if (cell.adjacent === 0 && !cell.mine) queue.push(...NEIGHBOURS[at]);
  }

  return next;
};

const revealAllMines = (board) =>
  board.map((cell) => (cell.mine ? { ...cell, state: REVEALED } : cell));

const isCleared = (board) =>
  board.every((cell) => (cell.mine ? cell.state !== REVEALED : cell.state === REVEALED));

const flagCount = (board) => board.filter((cell) => cell.state === FLAGGED).length;

const pad = (value, size) => String(value).padStart(size, "0");

const mount = (root) => {
  const grid = root.querySelector(".minefield__grid");
  const minesOut = root.querySelector("[data-mines]");
  const timerOut = root.querySelector("[data-timer]");
  const statusOut = root.querySelector(".minefield__status");
  const resetButton = root.querySelector(".minefield__reset");

  if (!grid || !minesOut || !timerOut || !statusOut || !resetButton) return;

  const buttons = Array.from({ length: CELLS }, (_, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "minefield__cell";
    button.dataset.index = String(i);
    button.setAttribute("aria-label", `Cell ${(i % COLS) + 1}, ${Math.floor(i / COLS) + 1}`);
    grid.append(button);
    return button;
  });

  let board = emptyBoard();
  let phase = READY;
  let startedAt = 0;
  let elapsed = 0;
  let ticker = 0;

  const paint = () => {
    board.forEach((cell, i) => {
      const button = buttons[i];
      const revealed = cell.state === REVEALED;
      const showsMine = revealed && cell.mine;
      const number = revealed && !cell.mine && cell.adjacent > 0 ? String(cell.adjacent) : "";

      button.textContent = showsMine ? "✸" : cell.state === FLAGGED ? "⚑" : number;
      button.dataset.state = cell.state;
      button.dataset.adjacent = number;
      button.toggleAttribute("data-mine", showsMine);
      button.disabled = phase === WON || phase === LOST;
    });

    minesOut.textContent = pad(Math.max(0, MINES - flagCount(board)), 2);
    timerOut.textContent = pad(Math.min(999, elapsed), 3);
  };

  const stopClock = () => {
    if (ticker === 0) return;
    window.clearInterval(ticker);
    ticker = 0;
  };

  const startClock = () => {
    startedAt = Date.now();
    stopClock();
    ticker = window.setInterval(() => {
      elapsed = Math.floor((Date.now() - startedAt) / 1000);
      timerOut.textContent = pad(Math.min(999, elapsed), 3);
    }, 1000);
  };

  const setPhase = (next, message) => {
    phase = next;
    root.dataset.phase = next;
    statusOut.textContent = message;
    if (next === WON || next === LOST) stopClock();
  };

  const reset = () => {
    board = emptyBoard();
    elapsed = 0;
    stopClock();
    setPhase(READY, "Left click clears. Right click flags.");
    paint();
  };

  const open = (index) => {
    if (phase === WON || phase === LOST) return;
    if (board[index].state === FLAGGED) return;

    if (phase === READY) {
      board = plantBoard(index);
      setPhase(PLAYING, "Field armed. Watch the numbers.");
      startClock();
    }

    if (board[index].mine) {
      board = revealAllMines(withState(board, index, REVEALED));
      setPhase(LOST, "Detonated. Hit reset to re-arm the field.");
      paint();
      return;
    }

    board = revealFrom(board, index);
    if (isCleared(board)) setPhase(WON, `Field cleared in ${elapsed}s. Max would be proud.`);
    paint();
  };

  const flag = (index) => {
    if (phase === WON || phase === LOST) return;
    const cell = board[index];
    if (cell.state === REVEALED) return;
    board = withState(board, index, cell.state === FLAGGED ? HIDDEN : FLAGGED);
    paint();
  };

  grid.addEventListener("click", (event) => {
    const button = event.target.closest(".minefield__cell");
    if (button) open(Number(button.dataset.index));
  });

  grid.addEventListener("contextmenu", (event) => {
    const button = event.target.closest(".minefield__cell");
    if (!button) return;
    event.preventDefault();
    flag(Number(button.dataset.index));
  });

  grid.addEventListener("keydown", (event) => {
    if (event.key !== "f" && event.key !== "F") return;
    const button = event.target.closest(".minefield__cell");
    if (!button) return;
    event.preventDefault();
    flag(Number(button.dataset.index));
  });

  resetButton.addEventListener("click", reset);
  reset();
};

document.querySelectorAll(".minefield").forEach(mount);
