// The Mortal Kombat gag is a face that pops out of the corner and shouts. This
// is our own, drawn for this site rather than borrowed: he leans in, says one
// thing in the page's voice, and ducks back out.
import { CALM } from "./frames.js";

// How long between visits, in seconds. One place to change it.
const EVERY = [4, 6];
const ON_SCREEN_MS = 1500;

const LINES = [
  "Toasty!",
  "60 fps.",
  "Shipped it.",
  "One more build.",
  "Still running.",
  "Nice scroll.",
  "Hire me.",
  "Profiler's open.",
];

const wait = () => (EVERY[0] + Math.random() * (EVERY[1] - EVERY[0])) * 1000;

const mount = (root) => {
  const say = root.querySelector("[data-toast-say]");
  if (!say) return;

  let line = -1;
  let timer = 0;

  const pick = () => {
    // Never the same line twice running.
    const next = Math.floor(Math.random() * (LINES.length - 1));
    line = next >= line ? next + 1 : next;
    return LINES[line];
  };

  const duck = () => {
    root.removeAttribute("data-showing");
    timer = window.setTimeout(lean, wait());
  };

  const lean = () => {
    // No check on document.hidden, for the same reason the canvases dropped
    // theirs: a view that wrongly reports itself hidden would silence him for
    // good, and a genuinely hidden tab already has its timers throttled.
    say.textContent = pick();
    root.setAttribute("data-showing", "");
    timer = window.setTimeout(duck, ON_SCREEN_MS);
  };

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    window.clearTimeout(timer);
    root.removeAttribute("data-showing");
    timer = window.setTimeout(lean, wait());
  });

  timer = window.setTimeout(lean, wait());
};

// A face springing out of the corner is exactly the motion someone asking for
// reduced motion is asking not to have.
if (!CALM) document.querySelectorAll("[data-toast]").forEach(mount);
