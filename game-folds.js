import { CALM } from "./frames.js";
import { GAMES } from "./site-data.js";

const XR_PALETTE = [
  ["#102b3c", "#eaf7ff", "#70f2d1"],
  ["#123b38", "#eaf7ff", "#70f2d1"],
  ["#291f48", "#eaf7ff", "#a98cff"],
  ["#2f390f", "#f3ffd0", "#dfff36"],
];

const makeCover = (item, section) => {
  const button = document.createElement("button");
  button.className = `game-fold interactive${item.compact ? " game-fold--compact" : ""}`;
  button.type = "button";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", `${section.id}-case`);
  button.setAttribute("aria-label", `Open the ${item.name} case study`);
  button.style.setProperty("--fold-bg", item.bg);
  button.style.setProperty("--fold-ink", item.ink);
  button.style.setProperty("--fold-accent", item.accent);
  button.innerHTML = `
    <span class="game-fold__meta"><b>${item.num}</b><i>${item.kind}</i></span>
    <span class="game-fold__mark" data-title="${item.name}">${item.name}</span>
    <img class="game-fold__icon" src="${item.image}" alt="" loading="lazy" />
    <span class="game-fold__action"><i aria-hidden="true"></i><span data-fold-action>Open project</span><b data-fold-arrow>↘</b></span>
    <span class="game-fold__scan" aria-hidden="true"></span>
  `;
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
  const action = cover.querySelector("[data-fold-action]");
  const arrow = cover.querySelector("[data-fold-arrow]");
  section.style.setProperty("--fold-bg", item.bg);
  section.style.setProperty("--fold-ink", item.ink);
  section.style.setProperty("--fold-accent", item.accent);
  section.append(cover, content);
  section.classList.add("game-foldable");
  if (item.xr) section.classList.add("xr-foldable");

  const open = () => {
    if (section.hasAttribute("data-opening") || section.hasAttribute("data-expanded")) return;

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
      cover.setAttribute("aria-label", `Collapse the ${item.name} case study and return to the archive`);
      action.textContent = "Back to archive";
      arrow.textContent = "↑";

      const heading = content.querySelector("h2");
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
  };

  const close = () => {
    if (!section.hasAttribute("data-expanded")) return;

    section.style.height = `${section.getBoundingClientRect().height}px`;
    section.removeAttribute("data-expanded");
    section.setAttribute("data-closing", "");
    cover.setAttribute("aria-expanded", "false");
    cover.setAttribute("aria-label", `Open the ${item.name} case study`);
    action.textContent = "Open project";
    arrow.textContent = "↘";

    requestAnimationFrame(() => {
      section.style.height = `${cover.getBoundingClientRect().height}px`;
    });

    onHeightTransition(section, () => {
      section.removeAttribute("data-closing");
      section.style.height = "";
      content.setAttribute("inert", "");
      cover.focus({ preventScroll: true });
      section.scrollIntoView({ behavior: CALM ? "auto" : "smooth", block: "center" });
    });
  };

  cover.addEventListener("click", () => {
    if (section.hasAttribute("data-expanded")) close();
    else open();
  });
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
