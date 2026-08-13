// The last word of the hero is swapped by the glitch itself: the CSS burst at
// 90-92% of the cycle is the cover, so the change is only ever seen happening.
const WORDS = ["teeth.", "claws.", "nerve.", "spine.", "punch."];
const SWAP_POINT = 0.905;

const pickOther = (current) => {
  const next = Math.floor(Math.random() * (WORDS.length - 1));
  return next >= current ? next + 1 : next;
};

const mount = (el) => {
  // With motion reduced the glitch collapses to a hundredth of a second, and a
  // word swapped under it would just be text changing on its own.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const flicker = el.getAnimations().find((a) => a.animationName === "teeth-flicker");
  if (!flicker) return;

  const period = Number(flicker.effect.getTiming().duration);
  if (!period) return;

  let current = WORDS.indexOf(el.dataset.text);
  if (current < 0) current = 0;
  let armed = true;

  const swap = () => {
    current = pickOther(current);
    el.textContent = WORDS[current];
    el.dataset.text = WORDS[current];
  };

  const step = () => {
    const progress = (Number(flicker.currentTime) % period) / period;
    if (progress >= SWAP_POINT) {
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

document.querySelectorAll(".hero__title--teeth").forEach(mount);
