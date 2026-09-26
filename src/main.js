import "./style.css";
import { initSmoothScroll } from "./smooth-scroll.js";
import { initStage } from "./stage.js";
import { initShaderBackground } from "./shader-bg.js";
import { initHeroReveal } from "./hero-reveal.js";
import { initCursor } from "./cursor.js";
import { initMagnetic } from "./magnetic.js";
import { initScrollObject } from "./scroll-object.js";
import { initScramble } from "./scramble.js";
import { initRipple } from "./ripple.js";
import { initPostFX } from "./post-fx.js";

// One check, passed to every module. If the user asks the OS for
// reduced motion we skip the render loop, the entrance stagger, the
// smooth-scroll inertia and the hover motion, and show the final state
// immediately.
// Dev only: add ?reduced-motion to the URL to preview this mode without
// changing the OS setting (CSS-only animations still follow the OS).
const reducedMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  (import.meta.env.DEV && new URLSearchParams(location.search).has("reduced-motion"));

// Order matters: Lenis must tick before the stage renders, so meshes
// placed over DOM elements use this frame's scroll position.
initSmoothScroll({ reducedMotion });
const stage = initStage(document.getElementById("bg"), { reducedMotion });

// WebGL layers, all drawn by the one stage.
initShaderBackground(stage, { reducedMotion });
initScrollObject(stage, { reducedMotion });
initRipple(stage, { reducedMotion });
const fx = initPostFX(stage);

// Dev only: tweak live from the browser console, e.g.
//   nocturne.fx.grain.blendMode.opacity.value = 0.4
//   nocturne.fx.aberration.offset.set(0.002, 0.002)
if (import.meta.env.DEV) window.nocturne = { stage, fx };

// DOM effects.
initHeroReveal({ reducedMotion });
initCursor({ reducedMotion });
initMagnetic({ reducedMotion });
initScramble({ reducedMotion });
