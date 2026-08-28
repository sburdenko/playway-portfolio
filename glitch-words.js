// A word is only ever swapped underneath its own glitch: the burst the word
// already runs is the cover, so the change is only seen happening.
const TARGETS = [
  {
    selector: ".hero__title--teeth",
    animation: "teeth-flicker",
    swapPoints: [0.905],
    words: ["teeth.", "claws.", "nerve.", "spine.", "punch."],
  },
  {
    selector: ".about__header em",
    animation: "profile-tear-base",
    swapPoints: [0.9],
    words: ["Feel", "Grip", "Kick", "Beat", "Grit"],
  },
];

const pickOther = (words, current) => {
  const next = Math.floor(Math.random() * (words.length - 1));
  return next >= current ? next + 1 : next;
};

// Every candidate is laid into the same grid cell, so the element is as wide as
// the longest of them and a swap can never move the words after it.
const buildSlots = (el, words) => {
  el.textContent = "";
  return words.map((word) => {
    const slot = document.createElement("span");
    slot.textContent = word;
    el.append(slot);
    return slot;
  });
};

const mount = (el, { animation, swapPoints, words }) => {
  const cover = el.getAnimations().find((a) => a.animationName === animation);
  if (!cover) return;

  const period = Number(cover.effect.getTiming().duration);
  if (!period) return;

  const slots = buildSlots(el, words);
  el.dataset.glitchWord = "";

  let current = words.indexOf(el.dataset.text);
  if (current < 0) current = 0;

  const show = (index) => {
    slots.forEach((slot, i) => slot.toggleAttribute("data-on", i === index));
    el.dataset.text = words[index];
  };
  show(current);

  // How many cover bursts the cycle has already passed. It only ever climbs
  // within a cycle, so one swap is owed per burst and none at the wrap.
  const zoneOf = (progress) => swapPoints.filter((point) => progress >= point).length;
  const progressNow = () => (Number(cover.currentTime) % period) / period;

  let zone = zoneOf(progressNow());

  const step = () => {
    const next = zoneOf(progressNow());
    if (next > zone) {
      current = pickOther(words, current);
      show(current);
    }
    zone = next;
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
