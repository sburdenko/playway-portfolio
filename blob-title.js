// Blob Sort Jam — the title plays the game: the letters run together into one
// blob, the blob wobbles, then it bursts and the letters fly back to place.
// Where each letter has to travel is measured rather than guessed, so the
// gather still lands on the centre at any title size.
const CYCLE_SELECTOR = ".blob__header h2";
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

  boxes.forEach(({ letter, x, y, width, height }) => {
    letter.style.setProperty("--dx", `${(centreX - x - width / 2).toFixed(2)}px`);
    letter.style.setProperty("--dy", `${(centreY - y - height / 2).toFixed(2)}px`);
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
  measure(letters, title);

  new ResizeObserver(() => measure(letters, title)).observe(title);
  if (document.fonts) document.fonts.ready.then(() => measure(letters, title));
};

// Without motion the letters never gather, so splitting the word would only
// cost the title its selectable, screen-readable text.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll(CYCLE_SELECTOR).forEach(mount);
}
