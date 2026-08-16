import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { ANALYTICS_TOKEN, GAMES } from "./site-data.js";

const mediaUrl = (url) => {
  const extension = new URL(url).pathname.endsWith(".mp4") ? "mp4" : "webp";
  const name = createHash("sha256").update(url).digest("hex").slice(0, 16);
  return `./media/${name}.${extension}`;
};

const jumpLinks = () =>
  GAMES.map((game) => `<a href="#${game.id}">${game.num} ${game.name}</a>`).join("");

const railItems = () =>
  GAMES.map((game) => `<a class="rail__item interactive" href="#${game.id}" data-rail="${game.id}" style="--mini-bg:${game.bg};--mini-ink:${game.ink};--mini-accent:${game.accent}">
          <span class="rail__mini" aria-hidden="true"><img src="${game.image}" alt="" loading="lazy" /><b></b><i></i></span>
          <span class="rail__name"><em>${game.num}</em>${game.name}</span>
        </a>`).join("\n        ");

const frieze = (id, end) => {
  const game = GAMES.find((entry) => entry.id === id);
  if (!game) throw new Error(`No game data for section "${id}"`);
  const modifier = end ? ` game-rule--end` : "";
  return `<div class="game-rule game-rule--${game.rule}${modifier}" aria-hidden="true"></div>`;
};

// The jump menu, the rail and the twenty chapter friezes are all the same ten
// games said four times over. They are written once in site-data.js and put
// into the page here, at build time, so the page still ships as plain HTML.
const sections = () => ({
  name: "portfolio-sections",
  transformIndexHtml(html, context) {
    if (context.path.endsWith("/xr.html")) return html;
    return html
      .replace("<!--@jump-->", jumpLinks)
      .replace("<!--@rail-->", railItems)
      .replace(/<!--@rule:([a-z-]+)(:end)?-->/g, (_, id, end) => frieze(id, Boolean(end)));
  },
});

const localMedia = () => ({
  name: "local-portfolio-media",
  transformIndexHtml(html, context) {
    if (context.path.endsWith("/xr.html")) return html;
    return html.replace(
      /https:\/\/[^\"'\s)]+/g,
      (url) => /akamai\.steamstatic\.com|googleusercontent\.com|mzstatic\.com|digitaloceanspaces\.com/.test(url) ? mediaUrl(url) : url,
    );
  },
});

// Both pages carry the beacon, and only if there is a token to carry.
const analytics = () => ({
  name: "portfolio-analytics",
  transformIndexHtml(html) {
    if (!ANALYTICS_TOKEN) return html;
    const beacon = `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${ANALYTICS_TOKEN}"}'></script>`;
    return html.replace("</body>", `    ${beacon}\n  </body>`);
  },
});

export default defineConfig({
  base: "/playway-portfolio/",
  build: {
    rollupOptions: {
      input: {
        games: resolve(import.meta.dirname, "index.html"),
        xr: resolve(import.meta.dirname, "xr.html"),
      },
    },
  },
  plugins: [sections(), localMedia(), analytics()],
});
