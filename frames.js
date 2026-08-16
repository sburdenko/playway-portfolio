// Eight canvases used to draw every frame of their lives, whether or not they
// were on screen — eight loops of geometry running while the reader looked at
// something else. A piece now parks itself when it scrolls out of view or the
// tab goes to the back, and picks up where it left off when it returns.
export const CALM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const onStage = (element, frame) => {
  let handle = 0;
  let running = false;
  let onScreen = true;

  const tick = (now) => {
    if (!running) return;
    frame(now);
    handle = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (running) return;
    running = true;
    // No check on document.hidden here on purpose: a browser that reports the
    // page as hidden while the reader is looking at it — an embedded view, a
    // preview pane — would otherwise be handed a blank canvas. A truly hidden
    // tab costs nothing anyway, because the browser stops handing out frames.
    handle = window.requestAnimationFrame(tick);
  };

  const stop = () => {
    running = false;
    window.cancelAnimationFrame(handle);
  };

  // Running first and parking later, rather than waiting to be told it is
  // visible: if the observer never reports — an old browser, a stripped-down
  // web view — the piece still draws. The worst case is the old behaviour,
  // never a dead canvas.
  start();

  if (typeof IntersectionObserver === "function") {
    new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        if (onScreen) start();
        else stop();
      },
      // A margin, so a piece is already moving by the time it is scrolled to.
      { rootMargin: "150px" },
    ).observe(element);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (onScreen) start();
  });

  return { start, stop };
};
