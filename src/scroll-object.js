// ------------------------------------------------------------------
// Pinned section with a 3D object scrubbed by scroll. The section pins
// for `pinLength` of scrolling, and a GSAP timeline scrubbed across
// that distance turns the object.
//
// The object lives in the shared stage scene (so grain + chromatic
// aberration reach it) and is placed over the section's DOM box every
// frame. That's plain pixel maths, because 1 world unit = 1 CSS px.
// ------------------------------------------------------------------
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SETTINGS = {
  // Scroll distance the section stays pinned, relative to viewport
  // height. TUNE "+=100%" (brisk) – "+=400%" (slow, weighty)
  pinLength: "+=200%",
  // Full Y rotations across the pin. TUNE 0.5–2
  turns: 1,
  // Extra X rotation (radians) across the pin, for a tumble. TUNE 0–1.5
  tilt: 0.9,
  // true = glued to the scrollbar (Lenis already smooths the scroll).
  // A number adds catch-up lag in seconds. TUNE true or 0.3–1.5
  scrub: true,
  // Object radius as a fraction of the section's height. TUNE 0.2–0.4
  size: 0.32,
  // Trigger boundaries, for building. Off for the handoff.
  markers: false,
};

export function initScrollObject(stage, { reducedMotion }) {
  const section = document.querySelector(".orbit");
  const readout = section.querySelector(".orbit__deg");

  // Accent comes from the CSS token, so the palette lives in one place.
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const geometry = new THREE.IcosahedronGeometry(1, 0); // TUNE detail 0 (crisp) – 1 (busier)

  // Near-black faces hide the far edges. 85% opacity leaves them as a
  // faint ghost rather than removing them. polygonOffset pushes each face
  // slightly behind its own edges so the front lines don't z-fight.
  const faces = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0x0a0a0a,
      transparent: true,
      opacity: 0.85, // TUNE 0.6 (see-through) – 1 (solid, far edges hidden)
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
  );
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: accent })
  );
  const object = new THREE.Group();
  object.add(faces, edges);
  object.rotation.set(0.35, 0, 0.12); // resting pose at progress 0
  stage.scene.add(object);

  // Every frame: sit on the section's centre, sized from its height.
  // Reading the rect each frame also follows the pin, with no resize
  // bookkeeping.
  stage.onFrame(() => {
    const rect = section.getBoundingClientRect();
    object.visible = stage.isOnScreen(rect);
    if (!object.visible) return;
    const { x, y } = stage.rectToWorld(rect);
    object.position.set(x, y, 0);
    object.scale.setScalar(rect.height * SETTINGS.size);
  });

  // Reduced motion: no pin, no scrub. A still object at a nice angle.
  if (reducedMotion) {
    object.rotation.set(0.6, 0.8, 0.12);
    return;
  }

  // The scrubbed timeline. ease "none" keeps rotation linear with scroll,
  // so the object moves exactly as much as the page does.
  gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: SETTINGS.pinLength,
      pin: true,
      scrub: SETTINGS.scrub,
      markers: SETTINGS.markers,
    },
    // GSAP binds `this` to the timeline in callbacks.
    onUpdate() {
      const deg = Math.round(this.progress() * 360 * SETTINGS.turns);
      readout.textContent = String(deg).padStart(3, "0");
    },
  }).to(object.rotation, {
    y: Math.PI * 2 * SETTINGS.turns,
    x: `+=${SETTINGS.tilt}`,
    duration: 1,
  });
}
