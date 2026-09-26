// ------------------------------------------------------------------
// The one WebGL stage. A single renderer on the fixed full-viewport
// canvas draws everything (shader background, scroll object, ripple
// plate) into one scene, then post-processing (post-fx.js) runs on the
// whole frame. One renderer is the only way grain + chromatic
// aberration can apply to every WebGL pixel.
//
// The camera is set up so 1 world unit = 1 CSS pixel at z = 0, which
// makes placing meshes over DOM elements plain pixel maths.
// ------------------------------------------------------------------
import * as THREE from "three";
import { gsap } from "gsap";
import { EffectComposer, RenderPass } from "postprocessing";

const SETTINGS = {
  // Cap on devicePixelRatio. Everything renders at full resolution here
  // (the background has its own lower renderScale). TUNE 1–2
  maxDpr: 1.5,
  // Camera field of view. Lower = flatter, more orthographic-looking 3D.
  // TUNE 25–50deg
  fov: 35,
  // MSAA samples. Off: FXAA in post-fx.js smooths edges far more cheaply.
  // Measured on Intel UHD at 1920×912: MSAA 4 = 16.9ms/frame for the
  // whole page (misses 60fps), MSAA 2 = 12.0ms, FXAA = 6.6ms.
  // TUNE 0 (default), or 2/4 on a strong GPU with FXAA removed.
  multisampling: 0,
};

export function initStage(canvas, { reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    powerPreference: "high-performance",
    // The composer renders into its own buffers, so the canvas itself
    // needs no antialiasing, depth or stencil.
    antialias: false,
    depth: false,
    stencil: false,
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(SETTINGS.fov, 1, 1, 10000);

  const composer = new EffectComposer(renderer, {
    // 8-bit buffers. Because the output is sRGB, postprocessing stores
    // them as sRGB, so the darks keep their precision (no banding) at
    // half the memory traffic of half-float. That traffic is most of the
    // cost on integrated GPUs.
    frameBufferType: THREE.UnsignedByteType,
    multisampling: SETTINGS.multisampling,
  });
  composer.addPass(new RenderPass(scene, camera));

  const viewport = { width: 1, height: 1 };
  const frameCallbacks = [];

  function resize() {
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, SETTINGS.maxDpr));
    composer.setSize(viewport.width, viewport.height, false); // false: CSS sizes the canvas
    // Distance at which the visible height equals the viewport height,
    // so 1 unit = 1 CSS px at z = 0.
    camera.aspect = viewport.width / viewport.height;
    camera.position.z = viewport.height / 2 / Math.tan(THREE.MathUtils.degToRad(SETTINGS.fov / 2));
    camera.updateProjectionMatrix();
    requestRender();
  }

  // Every frame: modules update (background pass, DOM syncing), then
  // the composer draws the scene and the effects.
  function render(time = 0, deltaSeconds = 0) {
    for (const fn of frameCallbacks) fn(time, deltaSeconds);
    composer.render(deltaSeconds);
  }

  // Reduced motion: no loop. Render only when something changes.
  let pending = false;
  function requestRender() {
    if (!reducedMotion || pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      render();
    });
  }

  if (reducedMotion) {
    // DOM-synced meshes move with the page, so scrolling must redraw.
    window.addEventListener("scroll", requestRender, { passive: true });
  } else {
    // Registered after Lenis (main.js order), so meshes are positioned
    // from this frame's scroll, not the previous one's.
    gsap.ticker.add((time, deltaMS) => render(time, deltaMS / 1000));
  }

  window.addEventListener("resize", resize);
  resize();

  return {
    renderer,
    scene,
    camera,
    composer,
    viewport,
    requestRender,
    // fn(time, deltaSeconds) runs before each frame is drawn.
    onFrame: (fn) => frameCallbacks.push(fn),
    // Centre of a DOM rect in world units (1 unit = 1 CSS px, y up).
    rectToWorld: (rect) => ({
      x: rect.left + rect.width / 2 - viewport.width / 2,
      y: viewport.height / 2 - (rect.top + rect.height / 2),
    }),
    // Whether a DOM rect overlaps the viewport (plus a margin in px).
    isOnScreen: (rect, margin = 100) =>
      rect.bottom > -margin && rect.top < viewport.height + margin,
  };
}
