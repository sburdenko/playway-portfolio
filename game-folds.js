import { GAMES } from "./site-data.js";

const makeCover = (game, section) => {
  const button = document.createElement("button");
  button.className = `game-fold interactive${game.compact ? " game-fold--compact" : ""}`;
  button.type = "button";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", `${section.id}-case`);
  button.setAttribute("aria-label", `Open the ${game.name} case study`);
  button.style.setProperty("--fold-bg", game.bg);
  button.style.setProperty("--fold-ink", game.ink);
  button.style.setProperty("--fold-accent", game.accent);
  button.innerHTML = `
    <span class="game-fold__meta"><b>${game.num}</b><i>Game case</i></span>
    <span class="game-fold__mark" data-title="${game.name}">${game.name}</span>
    <img class="game-fold__icon" src="${game.image}" alt="" loading="lazy" />
    <span class="game-fold__action"><i aria-hidden="true"></i>Open project <b>↘</b></span>
    <span class="game-fold__scan" aria-hidden="true"></span>
  `;
  return button;
};

const mount = (game) => {
  const section = document.getElementById(game.id);
  if (!section) return;

  const content = document.createElement("div");
  content.className = "game-fold__content";
  content.id = `${section.id}-case`;
  content.setAttribute("inert", "");

  while (section.firstChild) content.append(section.firstChild);

  const cover = makeCover(game, section);
  section.append(cover, content);
  section.classList.add("game-foldable");

  cover.addEventListener("click", () => {
    const collapsedHeight = section.getBoundingClientRect().height;
    section.style.height = `${collapsedHeight}px`;
    section.setAttribute("data-opening", "");
    content.removeAttribute("inert");

    const expandedHeight = section.scrollHeight;
    requestAnimationFrame(() => {
      section.style.height = `${expandedHeight}px`;
      section.setAttribute("data-revealing", "");
      cover.setAttribute("aria-expanded", "true");
    });

    const finish = (event) => {
      if (event.target !== section || event.propertyName !== "height") return;
      section.removeEventListener("transitionend", finish);

      section.removeAttribute("data-opening");
      section.removeAttribute("data-revealing");
      section.setAttribute("data-expanded", "");
      section.style.height = "auto";

      const heading = content.querySelector("h2");
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      cover.remove();
    };

    section.addEventListener("transitionend", finish);
  }, { once: true });
};

GAMES.forEach(mount);
