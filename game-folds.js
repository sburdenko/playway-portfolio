import { CALM } from "./frames.js";
import { GAMES } from "./site-data.js";

const XR_PALETTE = [
  ["#102b3c", "#eaf7ff", "#70f2d1"],
  ["#123b38", "#eaf7ff", "#70f2d1"],
  ["#291f48", "#eaf7ff", "#a98cff"],
  ["#2f390f", "#f3ffd0", "#dfff36"],
];

const mountedCases = new Map();

const FOLD_CONTROLS = {
  bronze: ["Return to Olympus", "▲"],
  boon: ["Leave the hill", "↟"],
  flower: ["Close the garden", "✿"],
  boxjam: ["Stack away", "□"],
  blob: ["Bottle the blobs", "●"],
  word: ["Bend it back", "⌁"],
  card: ["Deck away", "♥"],
  sapper: ["Clear the board", "✕"],
  lords: ["Exit orbit", "◌"],
};

// A game whose wordmark is coloured word by word wears the same one on its
// panel as it does over the case study.
const wordmarkOf = (item) => {
  if (item.logoTop) {
    return `<span class="game-fold__title-top">${item.logoTop}</span><span class="game-fold__title-main">${item.logoMain}</span>`;
  }
  if (item.logoParts) {
    return item.logoParts
      .map(([text, part]) => `<span class="${item.skin}-word ${item.skin}-word--${part}">${text}</span>`)
      .join(" ");
  }
  return item.name;
};

const makeCover = (item, section) => {
  const button = document.createElement("button");
  const wordmark = `<span class="game-fold__title">${wordmarkOf(item)}</span>`;
  button.className = `game-fold interactive${item.compact ? " game-fold--compact" : ""}${item.skin ? ` game-fold--${item.skin}` : ""}`;
  button.type = "button";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", `${section.id}-case`);
  button.setAttribute("aria-label", `Open the ${item.name} case study`);
  button.style.setProperty("--fold-bg", item.bg);
  button.style.setProperty("--fold-ink", item.ink);
  button.style.setProperty("--fold-accent", item.accent);
  if (item.detail) button.style.setProperty("--fold-detail", item.detail);
  button.innerHTML = `
    <span class="game-fold__meta"><b>${item.num}</b><i data-signal="${item.signal || "•"}">${item.tag || item.kind}</i></span>
    <span class="game-fold__mark" data-title="${item.name}">${wordmark}${item.subtitle ? `<span class="game-fold__subtitle">${item.subtitle}</span>` : ""}</span>
    <span class="game-fold__badge"><img class="game-fold__icon" src="${item.image}" alt="" loading="lazy" /></span>
    <span class="game-fold__scan" aria-hidden="true"></span>
  `;
  return button;
};

const makeCollapse = (item) => {
  const button = document.createElement("button");
  const [label, glyph] = FOLD_CONTROLS[item.skin] || ["Fold case", "↑"];
  button.className = "case-collapse interactive";
  button.type = "button";
  button.tabIndex = -1;
  button.setAttribute("aria-hidden", "true");
  button.setAttribute("aria-label", `Collapse the ${item.name} case study`);
  button.innerHTML = `<span>${label}</span><i aria-hidden="true">${glyph}</i>`;
  return button;
};

const onHeightTransition = (section, callback) => {
  const finish = (event) => {
    if (event.target !== section || event.propertyName !== "height") return;
    section.removeEventListener("transitionend", finish);
    callback();
  };
  section.addEventListener("transitionend", finish);
};

const mount = (item) => {
  const section = item.section || document.getElementById(item.id);
  if (!section) return;

  const content = document.createElement("div");
  content.className = "game-fold__content";
  content.id = `${section.id}-case`;
  content.setAttribute("inert", "");

  while (section.firstChild) content.append(section.firstChild);

  const cover = makeCover(item, section);

  // The control sits inside the opening frieze, not before it: the frieze
  // bleeds into the previous section with a negative margin, and anything
  // placed above it is dragged out of the case it belongs to. Holding a line
  // of its own there means a freshly opened case is never covered; it only
  // starts floating over the copy once the reader scrolls past that line.
  const collapse = makeCollapse(item);
  const opening = content.querySelector(":scope > .game-rule:not(.game-rule--end)");
  content.insertBefore(collapse, opening ? opening.nextSibling : content.firstChild);

  section.style.setProperty("--fold-bg", item.bg);
  section.style.setProperty("--fold-ink", item.ink);
  section.style.setProperty("--fold-accent", item.accent);
  section.append(cover, content);
  section.classList.add("game-foldable");
  if (item.xr) section.classList.add("xr-foldable");

  const open = () => {
    if (section.hasAttribute("data-opening") || section.hasAttribute("data-expanded")) return;

    const activeCases = [...mountedCases.entries()].filter(([other]) => other !== section && other.hasAttribute("data-expanded"));
    for (const [, activeCase] of activeCases) activeCase.close({ center: false, focus: false, instant: true });

    if (section.hasAttribute("data-closing")) return;

    window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY);
    section.style.height = `${section.getBoundingClientRect().height}px`;
    section.setAttribute("data-opening", "");
    content.removeAttribute("inert");

    const expandedHeight = section.scrollHeight;
    requestAnimationFrame(() => {
      section.style.height = `${expandedHeight}px`;
      section.setAttribute("data-revealing", "");
      cover.setAttribute("aria-expanded", "true");
    });

    onHeightTransition(section, () => {
      section.removeAttribute("data-opening");
      section.removeAttribute("data-revealing");
      section.setAttribute("data-expanded", "");
      section.style.height = "auto";
      collapse.tabIndex = 0;
      collapse.setAttribute("aria-hidden", "false");

      const heading = content.querySelector("h2");
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
  };

  const close = ({ center = true, focus = true, instant = false } = {}) => {
    if (!section.hasAttribute("data-expanded")) return Promise.resolve();

    if (instant) {
      section.style.height = "";
      section.removeAttribute("data-expanded");
      content.setAttribute("inert", "");
      collapse.tabIndex = -1;
      collapse.setAttribute("aria-hidden", "true");
      cover.setAttribute("aria-expanded", "false");
      return Promise.resolve();
    }

    const collapsedHeight = cover.getBoundingClientRect().height;
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const centeredScroll = Math.max(0, sectionTop - (window.innerHeight - collapsedHeight) / 2);
    return new Promise((resolve) => {
      section.style.height = `${section.getBoundingClientRect().height}px`;
      section.removeAttribute("data-expanded");
      section.setAttribute("data-closing", "");
      collapse.tabIndex = -1;
      collapse.setAttribute("aria-hidden", "true");
      cover.setAttribute("aria-expanded", "false");

      requestAnimationFrame(() => {
        section.style.height = `${collapsedHeight}px`;
      });

      onHeightTransition(section, () => {
        section.removeAttribute("data-closing");
        section.style.height = "";
        content.setAttribute("inert", "");
        if (center && !CALM) window.scrollTo({ top: centeredScroll, behavior: "smooth" });
        if (focus) cover.focus({ preventScroll: true });
        resolve();
      });
    });
  };

  cover.addEventListener("click", open);
  collapse.addEventListener("click", () => close());
  mountedCases.set(section, { close });
};

const games = GAMES.map((game) => ({ ...game, kind: "Game case" }));

const xrCases = [...document.querySelectorAll(".xr-case")].map((section, index) => {
  const [bg, ink, accent] = XR_PALETTE[index % XR_PALETTE.length];
  const header = section.querySelector("header span");
  const heading = section.querySelector("h2");
  const name = heading.innerText.replace(/\s+/g, " ").trim();
  const num = header.textContent.match(/^\d+/)?.[0] || String(index + 1).padStart(2, "0");
  const image = section.querySelector(".xr-case__media img")?.getAttribute("src") || "./social/portfolio-og.png";
  section.id = section.id || `xr-case-${num}`;

  return {
    section,
    num,
    name,
    image,
    bg,
    ink,
    accent,
    kind: "XR case",
    compact: name.length > 14,
    xr: true,
  };
});

[...games, ...xrCases].forEach(mount);
