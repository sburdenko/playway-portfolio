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
const media = (name) => `${import.meta.env.BASE_URL}media/${name}.webp`;
const heroFeed = [
  { label: "01 / Bronze Hoof", video: true },
  {
    label: "02 / Welcome to Boon Hill",
    image: media("7f1fea861513a859"),
    alt: "Welcome to Boon Hill gameplay",
  },
  {
    label: "03 / Flower Book",
    image: media("c6858267e2b0c8a0"),
    alt: "Flower Book match-3 gameplay",
  },
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
  {
    label: "07 / Card Match Solitaire",
    image: media("a1d3f155bcaa6556"),
    alt: "Card Match Solitaire gameplay",
  },
  {
    label: "08 / Crazy Sapper 3D",
    image: media("4f8d0639d0d45e6d"),
    alt: "Crazy Sapper 3D gameplay",
  },
  {
    label: "09 / Astro Lords",
    image: media("9e52bef3e163f1f0"),
    alt: "Astro Lords gameplay",
  },
  {
    label: "10 / Astro Scavenger",
    image: media("da4dac8bb78f7322"),
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
  heroImage.style.backgroundImage = `url("${item.image}")`;
  heroImage.setAttribute("aria-label", item.alt);
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
