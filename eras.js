const mount = (root) => {
  const buttons = [...root.querySelectorAll("[data-era]")];
  const scenes = [...root.querySelectorAll("[data-scene]")];
  const yearOut = root.querySelector("[data-year]");
  const noteOut = root.querySelector("[data-note]");

  if (buttons.length === 0 || scenes.length === 0 || !yearOut || !noteOut) return;

  const show = (era) => {
    scenes.forEach((scene) => scene.toggleAttribute("data-hidden", scene.dataset.scene !== era));
    buttons.forEach((button) => {
      const on = button.dataset.era === era;
      button.setAttribute("aria-pressed", String(on));
      if (!on) return;
      yearOut.textContent = button.dataset.eraYear;
      noteOut.textContent = button.dataset.eraNote;
    });
  };

  buttons.forEach((button) => button.addEventListener("click", () => show(button.dataset.era)));

  show(buttons[0].dataset.era);
};

document.querySelectorAll(".eras").forEach(mount);
