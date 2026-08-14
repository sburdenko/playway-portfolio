// The rail marks whichever game the reader is actually looking at. Sections are
// ordered on screen by CSS `order`, not by document order, so the bands are
// sorted by measured position rather than trusted as written.
const READING_LINE = 0.42;

const mount = (rail) => {
  const links = [...rail.querySelectorAll("[data-rail]")];
  const pairs = links
    .map((link) => ({ link, section: document.getElementById(link.dataset.rail) }))
    .filter((pair) => pair.section);

  if (pairs.length === 0) return;

  let bands = [];

  const measure = () => {
    bands = pairs
      .map(({ link, section }) => {
        const box = section.getBoundingClientRect();
        return { link, top: box.top + window.scrollY, bottom: box.bottom + window.scrollY };
      })
      .sort((a, b) => a.top - b.top);
  };

  const paint = () => {
    const line = window.scrollY + window.innerHeight * READING_LINE;
    const current = bands.find((band) => line >= band.top && line < band.bottom);
    links.forEach((link) => {
      if (current && link === current.link) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    rail.toggleAttribute("data-idle", !current);
  };

  const remeasure = () => {
    measure();
    paint();
  };

  measure();
  paint();

  window.addEventListener("scroll", paint, { passive: true });
  window.addEventListener("resize", remeasure);
  window.addEventListener("load", remeasure);
};

document.querySelectorAll(".rail").forEach(mount);
