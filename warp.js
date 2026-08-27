// Switching between the game archive and the XR page is a channel change: the
// picture collapses into bands, the next page loads behind the cover, and the
// cover tears away on arrival. The two halves live on either side of a page
// load, so the outgoing page leaves a flag for the incoming one to pick up.
const overlay = document.querySelector(".warp");
const label = overlay?.querySelector(".warp__label");

const FLAG = "pw-warp-channel";
const DURATION = 640;
const CALM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CHANNELS = [
  { match: /xr\.html$/, name: "CH 02 · Enterprise XR" },
  { match: /(index\.html|\/)$/, name: "CH 01 · Game archive" },
];

const channelName = (pathname) =>
  CHANNELS.find((channel) => channel.match.test(pathname))?.name || "Switching channel";

const play = (state, name) => {
  label.textContent = name;
  overlay.dataset.state = state;
  window.setTimeout(() => overlay.removeAttribute("data-state"), DURATION);
};

if (overlay && !CALM) {
  const arriving = sessionStorage.getItem(FLAG);
  if (arriving) {
    sessionStorage.removeItem(FLAG);
    play("in", arriving);
  }

  // Coming back through history restores the page from the cache exactly as it
  // was left — mid-transition, with the cover still down.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) overlay.removeAttribute("data-state");
  });

  document.addEventListener("click", (event) => {
    // Anything the browser would handle itself — new tab, download, modifier
    // click — is left alone.
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    // Same document: an anchor jump, not a channel change.
    if (url.pathname === location.pathname) return;

    event.preventDefault();
    const name = channelName(url.pathname);
    sessionStorage.setItem(FLAG, name);
    play("out", name);
    window.setTimeout(() => {
      location.href = url.href;
    }, DURATION - 40);
  });
}
