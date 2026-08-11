const play = (facade) => {
  const embed = facade.dataset.embed;
  if (!embed || facade.dataset.state === "playing") return;

  const frame = document.createElement("iframe");
  frame.className = "video-embed__frame";
  frame.src = embed;
  frame.title = facade.dataset.title ?? "Project film";
  frame.allow = "autoplay; fullscreen; picture-in-picture";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.allowFullscreen = true;

  facade.dataset.state = "playing";
  facade.append(frame);
};

document.querySelectorAll("[data-embed]").forEach((facade) => {
  facade.querySelector("[data-embed-play]")?.addEventListener("click", () => play(facade));
});
