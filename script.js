document.body.classList.add("is-loading");

const loader = document.querySelector(".loader");
window.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(() => {
    loader.classList.add("is-done");
    document.body.classList.remove("is-loading");
    window.setTimeout(() => loader.classList.add("is-hidden"), 1000);
    if (window.location.hash) {
      window.setTimeout(() => document.querySelector(window.location.hash).scrollIntoView(), 1100);
    }
  }, 900);
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.13 },
);

document.querySelectorAll(".reveal").forEach((element, index) => {
  if (element.closest(".hero")) {
    element.style.transitionDelay = `${0.1 + index * 0.09}s`;
  }
  revealObserver.observe(element);
});

const progress = document.querySelector(".scroll-progress");
const updateProgress = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${(window.scrollY / scrollable) * 100}%`;
};
window.addEventListener("scroll", updateProgress, { passive: true });

const localTime = document.querySelector(".local-time");
const updateTime = () => {
  localTime.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date());
};
updateTime();
window.setInterval(updateTime, 1000);

const trailer = document.querySelector(".hero-stage video");
const soundToggle = document.querySelector(".sound-toggle");
const heroImage = document.querySelector(".hero-stage__image");
const heroFeedProject = document.querySelector(".hero-stage__project");
const heroFeed = [
  { label: "01 / Bronze Hoof", video: true },
  {
    label: "02 / Welcome to Boon Hill",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/406780/ss_d44a111c1ab61335e82687e283253aac84c70d37.1920x1080.jpg?t=1498124174",
    alt: "Welcome to Boon Hill gameplay",
  },
  {
    label: "03 / Flower Book",
    image: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource114/v4/c5/46/e2/c546e2d0-aa7f-43e0-d7ae-bafb78b3c4e3/af10ce65-f77b-45f5-bf29-10e8473e744a_4.png/784x1392bb.png",
    alt: "Flower Book match-3 gameplay",
  },
  {
    label: "04 / Box Jam",
    image: "https://play-lh.googleusercontent.com/dMz5oSX0QQrWP56BnaKvDb8loSp0PS4lR8Y8rfregNBa10GsPX2qpdymBm_46IqrXyOJanzW8vsU7A9zRrvafAM=w886-h1576",
    alt: "Box Jam gameplay",
  },
  {
    label: "05 / Blob Jam",
    image: "https://play-lh.googleusercontent.com/-uzwUNNcObwudmHar_01TI8bfwRYzaSz3bfa94xsFLMMWR_-5TJvqZNkn7hu2OX6CHOqxPC4UPYcAmEwwblpew=w1052-h592",
    alt: "Blob Jam gameplay",
  },
  {
    label: "06 / Word Bend",
    image: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/d6/fb/3b/d6fb3ba7-6056-15cb-df7b-64df84741eff/2_1290x2796.png/784x1699bb.png",
    alt: "Word Bend gameplay",
  },
  {
    label: "07 / Card Match Solitaire",
    image: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/aa/66/6e/aa666ee7-f590-8ec3-c24e-326396691d71/Solitaire-Store-Images1_1242x2208.png/784x1392bb.png",
    alt: "Card Match Solitaire gameplay",
  },
  {
    label: "08 / Crazy Sapper 3D",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/529420/ss_09e1355fd7914a6105bfe3de470b37e55f065f85.1920x1080.jpg?t=1782119061",
    alt: "Crazy Sapper 3D gameplay",
  },
  {
    label: "09 / Astro Lords",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/372190/ss_c89faa00b8b7bb22d74325a91a936a28abf30b54.1920x1080.jpg?t=1782074241",
    alt: "Astro Lords gameplay",
  },
  {
    label: "10 / Astro Scavenger",
    image: "https://play-lh.googleusercontent.com/PaOtmVZl7MtLWlhSz2wMfa7xSdW77od9oHJ6PtRXZmdUm-rACR1QBQ3QC2amJQE1uPnJEGNIYrdBtoAqCj9QYw=w1052-h592",
    alt: "Astro Scavenger gameplay",
  },
];
let heroFeedIndex = 0;

const showHeroFeed = (index) => {
  const item = heroFeed[index];
  heroFeedProject.textContent = item.label;

  if (item.video) {
    heroImage.classList.remove("is-active");
    trailer.classList.add("is-active");
    trailer.play();
    soundToggle.hidden = false;
    return;
  }

  trailer.pause();
  trailer.classList.remove("is-active");
  heroImage.src = item.image;
  heroImage.alt = item.alt;
  heroImage.classList.add("is-active");
  soundToggle.hidden = true;
};

window.setInterval(() => {
  heroFeedIndex = (heroFeedIndex + 1) % heroFeed.length;
  showHeroFeed(heroFeedIndex);
}, 5200);

soundToggle.addEventListener("click", () => {
  trailer.muted = !trailer.muted;
  soundToggle.textContent = `Sound: ${trailer.muted ? "off" : "on"}`;
  soundToggle.setAttribute("aria-label", `Turn trailer sound ${trailer.muted ? "on" : "off"}`);
});

const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const ringPointer = { ...pointer };
const cursorDot = document.querySelector(".cursor--dot");
const cursorRing = document.querySelector(".cursor--ring");

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  cursorDot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
});

document.querySelectorAll(".interactive").forEach((element) => {
  element.addEventListener("pointerenter", () => cursorRing.classList.add("is-hovering"));
  element.addEventListener("pointerleave", () => cursorRing.classList.remove("is-hovering"));
});

const animateCursor = () => {
  ringPointer.x += (pointer.x - ringPointer.x) * 0.14;
  ringPointer.y += (pointer.y - ringPointer.y) * 0.14;
  cursorRing.style.transform = `translate3d(${ringPointer.x}px, ${ringPointer.y}px, 0) translate(-50%, -50%)`;
  requestAnimationFrame(animateCursor);
};
animateCursor();

document.querySelectorAll("[data-tilt]").forEach((element) => {
  element.addEventListener("pointermove", (event) => {
    const bounds = element.getBoundingClientRect();
    const rotateX = ((event.clientY - bounds.top) / bounds.height - 0.5) * -5;
    const rotateY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 5;
    element.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });
  element.addEventListener("pointerleave", () => {
    element.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
  });
});

document.querySelectorAll(".magnetic").forEach((element) => {
  element.addEventListener("pointermove", (event) => {
    const bounds = element.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    element.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
  });
  element.addEventListener("pointerleave", () => {
    element.style.transform = "translate(0, 0)";
  });
});

document.querySelectorAll(".project-jump__menu a").forEach((link) => {
  link.addEventListener("click", () => {
    link.closest("details").removeAttribute("open");
  });
});

const canvas = document.querySelector("#scene");
const context = canvas.getContext("2d");
let width;
let height;
let pixelRatio;

const resizeCanvas = () => {
  pixelRatio = Math.min(window.devicePixelRatio, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
};

const drawScene = () => {
  context.clearRect(0, 0, width, height);
  const spacing = width < 720 ? 58 : 72;
  const maxDistance = 190;

  for (let x = spacing / 2; x < width; x += spacing) {
    for (let y = spacing / 2; y < height; y += spacing) {
      const distance = Math.hypot(pointer.x - x, pointer.y - y);
      const influence = Math.max(0, 1 - distance / maxDistance);
      const offsetX = ((pointer.x - x) / maxDistance) * influence * -17;
      const offsetY = ((pointer.y - y) / maxDistance) * influence * -17;
      context.beginPath();
      context.arc(x + offsetX, y + offsetY, 1 + influence * 1.8, 0, Math.PI * 2);
      context.fillStyle = `rgba(238, 237, 230, ${0.12 + influence * 0.4})`;
      context.fill();
    }
  }

  context.beginPath();
  context.arc(pointer.x, pointer.y, 85, 0, Math.PI * 2);
  context.strokeStyle = "rgba(223, 255, 54, 0.08)";
  context.stroke();
  requestAnimationFrame(drawScene);
};

resizeCanvas();
drawScene();
window.addEventListener("resize", resizeCanvas);
