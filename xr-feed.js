// The spatial field was a diagram of a viewfinder with nothing in it. It now
// carries the same rotating feed the game archive runs, with the case stills
// behind the tracking HUD rather than a trailer: the XR films are Vimeo
// embeds, and the page deliberately leaves those until someone asks for one.
const field = document.querySelector(".xr-hero__field");
const poster = field?.querySelector(".xr-hero__poster");
const caseLabel = field?.querySelector(".xr-hero__field-case");

const FEED = [
  { label: "01 / RAF100", image: "https://i.vimeocdn.com/video/758088179-7455df0180be2f2e01be4ed63a20c805b706cae9445af4cfadbc3bc78fea3285-d_1280x720" },
  { label: "02 / Footsteps of Kings", image: "https://i.vimeocdn.com/video/1450978450-5702549697cf5bc16d244b9d53ff260ff4d07d521e2e51020a800b91090621f0-d_1280x720" },
  { label: "03 / The Brain in 3D", image: "https://i.vimeocdn.com/video/839007891-828e4ba1f2260f267ad0e8e040cf4c5798b9fe7b0367b3118d9eb34f1abdac3c-d_1280x720" },
  { label: "04 / BP Process Lab", image: "https://harmony-web.lon1.cdn.digitaloceanspaces.com/featured_image/portfolio/BP-1--hero.webp" },
  { label: "05 / Carlton Books", image: "https://i.vimeocdn.com/video/758576100-55f10795ee56ca67f86eb6170900a3c513199ed8b1e1bf7783143be3e5432e89-d_1280" },
  { label: "06 / Rigby & Rigby", image: "https://harmony-web.lon1.cdn.digitaloceanspaces.com/uploads/KBLXiXMaegJFGAfbxA26NSsrghV3j3LoCMHpzpI4.jpg" },
  { label: "07 / Knebworth House", image: "https://i.vimeocdn.com/video/815104557-c48b27a0d037e023fd9c090ff08a5cc60fa68c2116283b0cdd3dba7b8f44289f-d_1280x720" },
  { label: "08 / Allergan", image: "https://harmony-web.lon1.cdn.digitaloceanspaces.com/featured_image/portfolio/allergan-thumbnail--hero.webp" },
];

const HOLD = 4200;
const CALM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// On a phone the field is turned into faint wallpaper that bleeds off the
// right edge, so there is nothing to read there and no reason to spend a
// phone's data on eight stills.
const wide = window.matchMedia("(min-width: 721px)");

const start = () => {
  let index = 0;
  let slipTimer;

  // The next still is fetched during the current one's hold, so a switch never
  // lands on an empty frame.
  const preload = (nextIndex) => {
    const image = new Image();
    image.src = FEED[nextIndex % FEED.length].image;
  };

  const show = (nextIndex) => {
    const item = FEED[nextIndex];
    poster.style.backgroundImage = `url("${item.image}")`;
    caseLabel.textContent = item.label;

    if (!CALM) {
      window.clearTimeout(slipTimer);
      field.removeAttribute("data-switching");
      void field.offsetWidth;
      field.dataset.switching = "";
      slipTimer = window.setTimeout(() => field.removeAttribute("data-switching"), 400);
    }

    preload(nextIndex + 1);
  };

  show(0);
  poster.classList.add("is-active");

  window.setInterval(() => {
    index = (index + 1) % FEED.length;
    show(index);
  }, HOLD);
};

if (field && poster && caseLabel) {
  if (wide.matches) {
    start();
  } else {
    wide.addEventListener("change", (event) => event.matches && start(), { once: true });
  }
}
