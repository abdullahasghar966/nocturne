// ------------------------------------------------------------------
// Hero entrance: SplitText chars, each clipped by its own mask,
// rising from below with a slight tilt, plus a variable-font weight
// swell. Tagline + small UI fade/slide in after.
// ------------------------------------------------------------------
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

export function initHeroReveal({ reducedMotion }) {
  const title = document.querySelector(".hero__title");
  const tagline = document.querySelector(".hero__tagline");
  const extras = document.querySelectorAll(".hero__eyebrow, .hero__actions, .hero__scroll, .nav");

  // Reduced motion: final state, immediately. No split needed.
  if (reducedMotion) {
    gsap.set(title, { autoAlpha: 1 });
    return;
  }

  // Everything that animates in starts hidden (title is hidden in CSS
  // too, so there is no flash before this runs).
  gsap.set([tagline, ...extras], { autoAlpha: 0 });

  // Wait for the web font: splitting before it loads measures the
  // fallback font and the chars end up mis-sized/mis-positioned.
  document.fonts.ready.then(() => {
    SplitText.create(title, {
      type: "chars",
      mask: "chars",       // wraps every char in an overflow-clip span
      charsClass: "char",
      autoSplit: true,     // re-split on resize / font swap
      // Returning the animation from onSplit lets SplitText kill and
      // rebuild it (at the same progress) whenever it re-splits.
      onSplit(self) {
        gsap.set(title, { autoAlpha: 1 });

        const tl = gsap.timeline({ delay: 0.25 });
        tl.from(self.chars, {
          yPercent: 115,           // TUNE: 100–130, how far below the mask
          rotate: 8,               // TUNE: 0–15deg tilt. 0 = pure clip-up
          transformOrigin: "0% 100%",
          duration: 1.4,           // TUNE: 0.9–1.8s per char
          ease: "expo.out",        // TUNE: expo.out / power4.out / quart.out
          stagger: 0.06,           // TUNE: 0.03–0.1s between chars
        });
        // Variable font: chars "gain weight" as they settle.
        // Tween font-weight, not font-variation-settings: GSAP pairs the
        // numbers in that string by position, so any mismatch in axis
        // list/order with the CSS value scrambles the axes mid-tween.
        tl.from(
          self.chars,
          {
            fontWeight: 100,       // TUNE: 100–200 start weight (CSS sets the end, 300)
            duration: 2.2,
            ease: "power2.out",
            stagger: 0.06,
          },
          0
        );
        tl.to(
          tagline,
          { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out", startAt: { y: 24 } },
          0.9 // TUNE: when the tagline enters relative to the title (s)
        );
        tl.to(
          extras,
          { autoAlpha: 1, duration: 1, ease: "power2.out", stagger: 0.1 },
          1.2
        );
        return tl;
      },
    });
  });
}
