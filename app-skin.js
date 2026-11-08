// Each playable tile is dressed as the app it came from, and what the canvas
// draws has to match the panel beside it. The skin is stated once in
// xr-apps.css as --draw-* tokens; this reads them back off the tile so a
// repaint never means editing two files.

const CACHE = new WeakMap();

/**
 * Reads the tile's --draw-* tokens. `wanted` maps a token name, without the
 * prefix, to the colour used if the skin does not state one.
 */
export const paletteOf = (root, wanted) => {
  const cached = CACHE.get(root);
  if (cached) return cached;

  const style = getComputedStyle(root);
  const palette = {};
  for (const name of Object.keys(wanted)) {
    palette[name] = style.getPropertyValue(`--draw-${name}`).trim() || wanted[name];
  }
  CACHE.set(root, palette);
  return palette;
};

/** #rgb, #rrggbb or any rgb()/rgba() colour, at the alpha asked for. */
export const fade = (colour, alpha) => {
  if (colour.startsWith("#")) {
    const hex = colour.slice(1);
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    const value = Number.parseInt(full.slice(0, 6), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }

  const parts = colour.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return colour;
  const own = parts.length > 3 ? Number(parts[3]) : 1;
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${own * alpha})`;
};
