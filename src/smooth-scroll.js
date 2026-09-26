// ------------------------------------------------------------------
// Lenis smooth scroll, driven by GSAP's ticker so that Lenis,
// ScrollTrigger (Tier 2) and every other GSAP animation share one rAF.
// ------------------------------------------------------------------
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function initSmoothScroll({ reducedMotion }) {
  // With reduced motion we keep native scrolling — no inertia at all.
  if (reducedMotion) return null;

  const lenis = new Lenis({
    // TUNE: 0.06–0.12. Lower = heavier/floatier, higher = snappier.
    lerp: 0.08,
    // TUNE: 0.7–1.2. Scales how far one wheel tick travels.
    wheelMultiplier: 0.9,
    smoothWheel: true,
    autoRaf: false, // we drive it from gsap.ticker below
  });

  // Keep ScrollTrigger in sync with Lenis' virtual scroll position.
  lenis.on("scroll", ScrollTrigger.update);

  // gsap.ticker gives time in seconds; Lenis wants ms.
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  // Without this GSAP "catches up" after a tab switch and Lenis jumps.
  gsap.ticker.lagSmoothing(0);

  // Make in-page anchor links (#manifesto, #top) use Lenis too.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.6 });
    });
  });

  return lenis;
}
