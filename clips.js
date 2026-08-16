// Trailers used to start themselves — twenty megabytes of video before the
// visitor had asked for anything. Now each one waits behind its poster, and
// the button is the only thing that fetches it.
const start = (button) => {
  const frame = button.parentElement;
  const video = frame?.querySelector("video");
  if (!video) return;

  frame.dataset.clip = "playing";
  video.play().catch(() => {
    // A codec, a policy, a dead file: hand the visitor the browser's own
    // controls rather than leaving a poster that does nothing.
    delete frame.dataset.clip;
    video.controls = true;
  });
};

document.querySelectorAll("[data-clip-play]").forEach((button) => {
  button.addEventListener("click", (event) => {
    // Most of these posters sit inside a link to a store page. The button is
    // the one part of the frame that plays instead of navigating.
    event.preventDefault();
    event.stopPropagation();
    start(button);
  });
});
