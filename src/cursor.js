// ------------------------------------------------------------------
// Lerped custom cursor. The dot trails the real pointer instead of
// tracking 1:1, and grows + inverts over links/buttons.
// ------------------------------------------------------------------
import { gsap } from "gsap";

const SETTINGS = {
  // Fraction of the gap closed per 60fps frame.
  // TUNE: 0.1 (floaty) – 0.35 (tight). 1 = no lag.
  lerp: 0.18,
  // Scale when hovering interactive elements. TUNE: 2.5–5
  hoverScale: 3.6,
  hoverSelector: "a, button, [data-cursor-hover]",
};

export function initCursor({ reducedMotion }) {
  const el = document.querySelector(".cursor");
  // Touch / pen devices: the CSS keeps the cursor hidden; do nothing.
  if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const lerp = reducedMotion ? 1 : SETTINGS.lerp;
  const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const pos = { ...target };
  let started = false;

  // quickSetter = cheapest way to write transforms every frame.
  const setX = gsap.quickSetter(el, "x", "px");
  const setY = gsap.quickSetter(el, "y", "px");

  window.addEventListener("pointermove", (e) => {
    target.x = e.clientX;
    target.y = e.clientY;
    if (!started) {
      // First move: jump straight there so it doesn't fly in from centre.
      pos.x = target.x;
      pos.y = target.y;
      started = true;
      el.classList.add("is-visible");
    }
  });

  // Hide when the pointer leaves the window, show again on return.
  document.documentElement.addEventListener("pointerleave", () => el.classList.remove("is-visible"));
  document.documentElement.addEventListener("pointerenter", () => started && el.classList.add("is-visible"));

  gsap.ticker.add((time, deltaMS) => {
    const k = 1 - Math.pow(1 - lerp, deltaMS / (1000 / 60)); // fps-independent
    pos.x += (target.x - pos.x) * k;
    pos.y += (target.y - pos.y) * k;
    setX(pos.x);
    setY(pos.y);
  });

  // Hover state via event delegation, so elements added later
  // (Tier 2 buttons etc.) work automatically.
  document.addEventListener("pointerover", (e) => {
    if (e.target.closest(SETTINGS.hoverSelector)) {
      el.classList.add("is-hover");
      gsap.to(el, { scale: SETTINGS.hoverScale, duration: 0.45, ease: "power3.out", overwrite: "auto" });
    }
  });
  document.addEventListener("pointerout", (e) => {
    const from = e.target.closest(SETTINGS.hoverSelector);
    const to = e.relatedTarget && e.relatedTarget.closest?.(SETTINGS.hoverSelector);
    if (from && from !== to) {
      el.classList.remove("is-hover");
      gsap.to(el, { scale: 1, duration: 0.45, ease: "power3.out", overwrite: "auto" });
    }
  });

  document.addEventListener("pointerdown", () => gsap.to(el, { scale: "*=0.8", duration: 0.15 }));
  document.addEventListener("pointerup", () =>
    gsap.to(el, { scale: el.classList.contains("is-hover") ? SETTINGS.hoverScale : 1, duration: 0.3 })
  );
}
