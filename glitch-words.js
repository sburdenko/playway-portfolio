// A word is only ever swapped underneath its own glitch: the burst the word
// already runs is the cover, so the change is only seen happening.
const TARGETS = [
  {
    selector: ".hero__title--teeth",
    animation: "teeth-flicker",
    swapPoint: 0.905,
    words: ["teeth.", "claws.", "nerve.", "spine.", "punch."],
  },
  {
    selector: ".about__header em",
    animation: "profile-tear-base",
    swapPoint: 0.9,
    words: ["Feel", "Flow", "Grip", "Snap", "Kick"],
  },
];

const pickOther = (words, current) => {
  const next = Math.floor(Math.random() * (words.length - 1));
  return next >= current ? next + 1 : next;
};

const mount = (el, { animation, swapPoint, words }) => {
  const cover = el.getAnimations().find((a) => a.animationName === animation);
  if (!cover) return;

  const period = Number(cover.effect.getTiming().duration);
  if (!period) return;

  let current = words.indexOf(el.dataset.text);
  if (current < 0) current = 0;
  let armed = true;

  const swap = () => {
    current = pickOther(words, current);
    el.textContent = words[current];
    el.dataset.text = words[current];
  };

  const step = () => {
    const progress = (Number(cover.currentTime) % period) / period;
    if (progress >= swapPoint) {
      if (armed) {
        swap();
        armed = false;
      }
    } else {
      armed = true;
    }
    window.requestAnimationFrame(step);
  };

  window.requestAnimationFrame(step);
};

// With motion reduced every glitch collapses to a hundredth of a second, and a
// word swapped under it would just be text changing on its own.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  TARGETS.forEach((target) => {
    document.querySelectorAll(target.selector).forEach((el) => mount(el, target));
  });
}
