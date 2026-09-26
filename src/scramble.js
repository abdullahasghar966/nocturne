// ------------------------------------------------------------------
// Scramble-on-hover. Hovering a [data-scramble] element dissolves its
// text into random characters, which then resolve left to right back
// into the real text (GSAP ScrambleTextPlugin).
// ------------------------------------------------------------------
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(ScrambleTextPlugin);

const SETTINGS = {
  // Total time from first hover to fully readable. TUNE 0.6–1.4s
  duration: 1.1,
  // Replacement glyphs: "upperCase", "lowerCase", "upperAndLowerCase",
  // or any string of your own, e.g. "01" or "/\\|—". Match the case of
  // the real text so the width jitters less.
  chars: "lowerCase",
  // Time fully scrambled before letters start resolving. TUNE 0–0.4s
  revealDelay: 0.2,
  // How often the random glyphs re-roll. TUNE 0.3 (lazy) – 1.5 (frantic)
  speed: 0.5,
};

export function initScramble({ reducedMotion }) {
  if (reducedMotion) return;

  document.querySelectorAll("[data-scramble]").forEach((el) => {
    // Store the real text now. ScrambleText's "{original}" re-reads the
    // DOM, which is random garbage if you re-hover mid-scramble.
    const text = el.textContent.trim();
    let tween = null;

    el.addEventListener("pointerenter", () => {
      if (tween && tween.isActive()) return; // let a running scramble finish
      // Freeze the box at its readable width (it is inline-block, left-
      // aligned in CSS): scrambled glyphs have different widths and would
      // otherwise make the centred line wobble.
      el.style.width = `${el.getBoundingClientRect().width}px`;
      tween = gsap.to(el, {
        duration: SETTINGS.duration,
        ease: "none",
        scrambleText: {
          text,
          chars: SETTINGS.chars,
          revealDelay: SETTINGS.revealDelay,
          speed: SETTINGS.speed,
          oldClass: "is-scrambled", // styles the not-yet-resolved glyphs
        },
        onComplete: () => (el.style.width = ""),
      });
    });
  });
}
