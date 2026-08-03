import { defineConfig } from "vite";
import { createHash } from "node:crypto";

const mediaUrl = (url) => {
  const extension = url.endsWith("movie480.mp4") ? "mp4" : "jpg";
  const name = createHash("sha256").update(url).digest("hex").slice(0, 16);
  return `./media/${name}.${extension}`;
};

const localMedia = () => ({
  name: "local-portfolio-media",
  transformIndexHtml(html) {
    return html.replace(
      /https:\/\/[^\"'\s)]+/g,
      (url) => /akamai\.steamstatic\.com|googleusercontent\.com|mzstatic\.com|digitaloceanspaces\.com/.test(url) ? mediaUrl(url) : url,
    );
  },
});

export default defineConfig({
  base: "/playway-portfolio/",
  plugins: [localMedia()],
});
