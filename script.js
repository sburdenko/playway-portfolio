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

const brandName = document.querySelector(".brand__name");
const glitchBrandName = () => {
  const name = brandName.dataset.name;
  const letters = [...name];
  const positions = letters
    .map((letter, index) => (letter === " " ? -1 : index))
    .filter((index) => index !== -1);
  const position = positions[Math.floor(Math.random() * positions.length)];
  const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*";

  letters[position] = glyphs[Math.floor(Math.random() * glyphs.length)];
  brandName.textContent = letters.join("");
  brandName.classList.add("is-glitching");

  window.setTimeout(() => {
    brandName.textContent = name;
    brandName.classList.remove("is-glitching");
  }, 100);

  window.setTimeout(glitchBrandName, 1800 + Math.random() * 2600);
};
window.setTimeout(glitchBrandName, 1700);

const trailer = document.querySelector(".hero-stage video");
const soundToggle = document.querySelector(".sound-toggle");
const heroImage = document.querySelector(".hero-stage__image");
const heroFeedProject = document.querySelector(".hero-stage__project");
const asset = (file) => `${import.meta.env.BASE_URL}media/${file}`;
const media = (name) => asset(`${name}.webp`);

const CLIP_SECONDS = 4;

// Every title with a trailer takes its turn in the feed; the three without one
// still get a slot, they just hold on a screenshot.
const heroFeed = [
  { label: "01 / Bronze Hoof", clip: "4aadf7d9a76ee442.mp4" },
  { label: "02 / Welcome to Boon Hill", clip: "8852c6915009c678.mp4" },
  { label: "03 / Flower Book", clip: "flower-book-trailer.mp4" },
  {
    label: "04 / Box Jam",
    image: media("b2cac326299ec296"),
    alt: "Box Jam gameplay",
  },
  {
    label: "05 / Blob Jam",
    image: media("27f410d7ad50c885"),
    alt: "Blob Jam gameplay",
  },
  {
    label: "06 / Word Bend",
    image: media("09b766a3ab3899cf"),
    alt: "Word Bend gameplay",
  },
  { label: "07 / Card Match Solitaire", clip: "card-match-trailer.mp4" },
  { label: "08 / Crazy Sapper 3D", clip: "138d13ef4915dafc.mp4" },
  { label: "09 / Astro Lords", clip: "d72e113026d3cd75.mp4" },
  { label: "10 / Astro Scavenger", clip: "334c1bb10a06e058.mp4" },
];

let heroFeedIndex = 0;
let loadedClip = "";

const seekSomewhere = () => {
  const span = trailer.duration - CLIP_SECONDS;
  if (!Number.isFinite(span) || span <= 0) return;
  trailer.currentTime = Math.random() * span;
};

trailer.addEventListener("loadedmetadata", seekSomewhere);

const showHeroFeed = (index) => {
  const item = heroFeed[index];
  heroFeedProject.textContent = item.label;

  if (!item.clip) {
    trailer.pause();
    trailer.classList.remove("is-active");
    heroImage.style.backgroundImage = `url("${item.image}")`;
    heroImage.setAttribute("aria-label", item.alt);
    heroImage.classList.add("is-active");
    soundToggle.hidden = true;
    return;
  }

  heroImage.classList.remove("is-active");
  trailer.classList.add("is-active");
  soundToggle.hidden = false;

  if (item.clip === loadedClip) {
    seekSomewhere();
  } else {
    loadedClip = item.clip;
    trailer.src = asset(item.clip);
    trailer.load();
  }

  trailer.play().catch(() => {});
};

window.setInterval(() => {
  heroFeedIndex = (heroFeedIndex + 1) % heroFeed.length;
  showHeroFeed(heroFeedIndex);
}, CLIP_SECONDS * 1000);

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

const canvas = document.querySelector("#scene");
const context = canvas.getContext("2d");
let width;
let height;
let pixelRatio;
let sceneFrame;

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
  sceneFrame = requestAnimationFrame(drawScene);
};

resizeCanvas();
drawScene();
window.addEventListener("resize", resizeCanvas);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(sceneFrame);
  } else {
    drawScene();
  }
});

document.querySelectorAll(".run-strip__track").forEach((track) => {
  [...track.children].forEach((card) => {
    const copy = card.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    track.append(copy);
  });
});
