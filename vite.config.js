import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const mediaUrl = (url) => {
  const extension = url.endsWith("movie480.mp4") ? "mp4" : "webp";
  const name = createHash("sha256").update(url).digest("hex").slice(0, 16);
  return `./media/${name}.${extension}`;
};

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
  plugins: [localMedia()],
});
