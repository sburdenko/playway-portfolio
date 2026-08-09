const startFilm = (film) => {
  const embed = film.dataset.embed;
  if (!embed || film.dataset.state === "playing") return;

  const frame = document.createElement("iframe");
  frame.className = "xr-film__frame";
  frame.src = embed;
  frame.title = film.dataset.title ?? "Project film";
  frame.allow = "autoplay; fullscreen; picture-in-picture";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.allowFullscreen = true;

  film.dataset.state = "playing";
  film.append(frame);
};

document.querySelectorAll(".xr-film").forEach((film) => {
  film.querySelector(".xr-film__play")?.addEventListener("click", () => startFilm(film));
});
