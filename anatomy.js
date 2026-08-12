const ORDER = ["skin", "vessels", "skull", "brain", "eyes"];

const mount = (root) => {
  const figure = root.querySelector(".anatomy__figure");
  const countOut = root.querySelector("[data-layers]");
  const nameOut = root.querySelector("[data-focus]");
  const buttons = [...root.querySelectorAll("[data-layer]")];

  if (!figure || !countOut || !nameOut || buttons.length === 0) return;

  // Every layer starts visible except skin, so the structure reads immediately.
  let shown = new Set(ORDER.filter((layer) => layer !== "skin"));

  const paint = () => {
    ORDER.forEach((layer) => {
      const on = shown.has(layer);
      figure.querySelector(`[data-group="${layer}"]`)?.toggleAttribute("data-hidden", !on);
      const button = buttons.find((b) => b.dataset.layer === layer);
      if (button) button.setAttribute("aria-pressed", String(on));
    });
    countOut.textContent = String(shown.size);
  };

  const describe = (layer) => {
    nameOut.textContent = layer ? layer : "All layers";
  };

  buttons.forEach((button) => {
    const layer = button.dataset.layer;

    button.addEventListener("click", () => {
      shown = new Set(shown);
      if (shown.has(layer)) shown.delete(layer);
      else shown.add(layer);
      paint();
      describe(layer);
    });

    button.addEventListener("pointerenter", () => describe(layer));
    button.addEventListener("pointerleave", () => describe(null));
  });

  paint();
  describe(null);
};

document.querySelectorAll(".anatomy").forEach(mount);
