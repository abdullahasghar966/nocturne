// ------------------------------------------------------------------
// Magnetic buttons. When the pointer comes within `radius` px of a
// [data-magnetic] element, the element leans toward it; as the pointer
// leaves, it springs back to centre. gsap.quickTo keeps one tween per
// axis and just re-targets it on every move, so there is no per-event
// tween churn.
// ------------------------------------------------------------------
import { gsap } from "gsap";

const SETTINGS = {
  // How far beyond the element's edges the pull reaches. TUNE 40–120px
  radius: 80,
  // Fraction of the pointer's offset from centre the element follows.
  // TUNE 0.2 (subtle) – 0.5 (strong)
  strength: 0.35,
  // One ease for both following and springing back. Re-targeted every
  // frame it reads as a smooth follow; when the pointer stops or leaves,
  // the tween plays out and the elastic overshoot is the "spring".
  // TUNE duration 0.6–1.4s; elastic period 0.25 (wobbly) – 0.5 (calm)
  duration: 1,
  ease: "elastic.out(1, 0.3)",
};

export function initMagnetic({ reducedMotion }) {
  // Pointer-triggered motion: off for reduced motion and for touch.
  if (reducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const items = [...document.querySelectorAll("[data-magnetic]")].map((el) => ({
    el,
    xTo: gsap.quickTo(el, "x", { duration: SETTINGS.duration, ease: SETTINGS.ease }),
    yTo: gsap.quickTo(el, "y", { duration: SETTINGS.duration, ease: SETTINGS.ease }),
    active: false,
  }));
  if (!items.length) return;

  const pointer = { x: -1e5, y: -1e5 };

  function update() {
    for (const item of items) {
      const r = item.el.getBoundingClientRect();
      // The rect includes our own translate. Measure from the resting
      // position instead, or the element chases itself and stalls short.
      const cx = r.left + r.width / 2 - gsap.getProperty(item.el, "x");
      const cy = r.top + r.height / 2 - gsap.getProperty(item.el, "y");
      const dx = pointer.x - cx;
      const dy = pointer.y - cy;
      // Distance from the element's edge (0 while over the element).
      const dist = Math.hypot(
        Math.max(Math.abs(dx) - r.width / 2, 0),
        Math.max(Math.abs(dy) - r.height / 2, 0)
      );

      if (dist < SETTINGS.radius) {
        // Full pull over the element, fading to zero at the field's edge,
        // so crossing the boundary never makes the button jump.
        const falloff = 1 - dist / SETTINGS.radius;
        item.xTo(dx * SETTINGS.strength * falloff);
        item.yTo(dy * SETTINGS.strength * falloff);
        item.active = true;
      } else if (item.active) {
        item.xTo(0);
        item.yTo(0);
        item.active = false;
      }
    }
  }

  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    update();
  });
  // The page can scroll under a still pointer (wheel, Lenis easing).
  window.addEventListener("scroll", update, { passive: true });
  // Pointer left the window: release everything.
  document.documentElement.addEventListener("pointerleave", () => {
    pointer.x = pointer.y = -1e5;
    update();
  });
}
