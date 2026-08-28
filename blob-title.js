// Blob Sort Jam — the title plays the game: the letters run together into one
// blob, the blob wobbles, then it bursts and the letters fly back to place.
// Where each letter has to travel is measured rather than guessed, so the
// gather still lands on the centre at any title size.
// The wordmark runs the same effect wherever it stands: stacked over the case
// study, and on one line on the archive panel. The panel is built by
// game-folds.js, so this module is loaded after it.
const TITLES = ".blob__header h2, .game-fold--blob .game-fold__mark";
const ARC_RATIO = 0.34;
const SPINS = ["-14deg", "11deg", "-8deg", "16deg", "-11deg", "7deg", "-17deg"];

const splitWord = (word) => {
  const letters = [...word.textContent].map((character, index) => {
    const letter = document.createElement("span");
    letter.className = "blob__letter";
    letter.textContent = character;
    letter.style.setProperty("--spin", SPINS[index % SPINS.length]);
    return letter;
  });
  word.replaceChildren(...letters);
  return letters;
};

// Offsets are layout positions, so a letter mid-flight still reports where it
// belongs and the measurement can be redone at any moment. They are relative
// to the offsetParent, and the em between letter and title is one of those,
// so the chain has to be walked rather than read once.
const offsetIn = (el, root) => {
  let x = 0;
  let y = 0;
  for (let node = el; node && node !== root; node = node.offsetParent) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { x, y };
};

// The blob forms over the words themselves, not in the middle of the heading
// box: the box is a wide column and the stacked wordmark sits at its left.
const measure = (letters, title) => {
  const boxes = letters.map((letter) => ({
    letter,
    ...offsetIn(letter, title),
    width: letter.offsetWidth,
    height: letter.offsetHeight,
  }));

  const centreX = (Math.min(...boxes.map((b) => b.x)) + Math.max(...boxes.map((b) => b.x + b.width))) / 2;
  const centreY = (Math.min(...boxes.map((b) => b.y)) + Math.max(...boxes.map((b) => b.y + b.height))) / 2;

  title.style.setProperty("--ball-x", `${centreX.toFixed(2)}px`);
  title.style.setProperty("--ball-y", `${centreY.toFixed(2)}px`);

  const arc = ARC_RATIO * parseFloat(getComputedStyle(title).fontSize);

  return boxes.map(({ letter, x, y, width, height }, index) => {
    const dx = centreX - x - width / 2;
    const dy = centreY - y - height / 2;
    const distance = Math.hypot(dx, dy);

    // Every letter is thrown in along a curve, alternating sides. A letter
    // that already sits by the centre has almost no distance to cover and
    // would otherwise look like it never left the word.
    const side = index % 2 ? 1 : -1;
    const [ux, uy] = distance > 1 ? [-dy / distance, dx / distance] : [0, -1];

    letter.style.setProperty("--dx", `${dx.toFixed(2)}px`);
    letter.style.setProperty("--dy", `${dy.toFixed(2)}px`);
    letter.style.setProperty("--ax", `${(ux * arc * side).toFixed(2)}px`);
    letter.style.setProperty("--ay", `${(uy * arc * side).toFixed(2)}px`);

    return { letter, distance };
  });
};

// The outermost letters set off first, so the word collapses as a wave rather
// than every letter starting at once. Set once: the shape of the title does
// not change with its size, and shifting a running cycle would jump it.
const stagger = (measured) => {
  const furthest = Math.max(...measured.map((m) => m.distance)) || 1;
  measured.forEach(({ letter, distance }) => {
    letter.style.animationDelay = `${(0.12 * (1 - distance / furthest)).toFixed(3)}s`;
  });
};

const mount = (title) => {
  const words = [...title.querySelectorAll(".blob-word")];
  if (!words.length) return;

  const letters = words.flatMap(splitWord);

  const ball = document.createElement("i");
  ball.className = "blob__ball";
  ball.setAttribute("aria-hidden", "true");
  title.append(ball);

  title.dataset.blobTitle = "";

  // The case study starts folded, where every letter measures zero: the wave
  // can only be set from the first measurement that has a title to measure.
  let staggered = false;
  const apply = () => {
    const measured = measure(letters, title);
    if (staggered || !title.clientWidth) return;
    stagger(measured);
    staggered = true;
  };

  apply();
  new ResizeObserver(apply).observe(title);
  if (document.fonts) document.fonts.ready.then(apply);
};

// Without motion the letters never gather, so splitting the word would only
// cost the title its selectable, screen-readable text.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll(TITLES).forEach(mount);
}
