// ------------------------------------------------------------------
// Ripple plate. A WebGL plane sits exactly under a [data-ripple] DOM
// element. On hover, rings of UV displacement travel outward from the
// cursor, then die down when the pointer leaves.
// The image is drawn procedurally on a 2D canvas (no asset files).
// ------------------------------------------------------------------
import * as THREE from "three";
import { gsap } from "gsap";

const SETTINGS = {
  // Ring density: waves per unit of distance. TUNE 20–60
  frequency: 38,
  // How fast rings travel outward. TUNE 2–10
  speed: 6,
  // How quickly rings fade with distance from the cursor. TUNE 2–10
  // (higher = the ripple stays local to the cursor)
  decay: 5,
  // Displacement strength in UV units. TUNE 0.005 (subtle) – 0.04 (liquid)
  amplitude: 0.026,
  // Ramp in / out when the pointer enters / leaves. TUNE 0.3–1.5s
  hoverIn: 0.6,
  hoverOut: 1.2,
  // Trailing of the ripple centre behind the pointer. TUNE 0.08–0.3
  mouseLerp: 0.15,
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uHover;      // 0..1, eased on enter/leave
  uniform vec2  uMouse;      // pointer in the plane's UV space (lerped)
  uniform float uAspect;     // plane width / height
  uniform float uFrequency;
  uniform float uSpeed;
  uniform float uDecay;
  uniform float uAmplitude;
  varying vec2 vUv;

  void main() {
    vec2 d = vUv - uMouse;
    d.x *= uAspect;                      // circular rings on a non-square plane
    float dist = length(d);
    // A sine travelling outward (phase moves with time), fading with distance.
    float wave = sin(dist * uFrequency - uTime * uSpeed) * exp(-dist * uDecay);
    vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
    dir.x /= uAspect;                    // back to UV space
    vec2 uv = vUv + dir * wave * uAmplitude * uHover;

    gl_FragColor = texture2D(uTexture, uv);
    #include <colorspace_fragment>
  }
`;

// Abstract "plate" artwork on a 2D canvas: dark gradient, ember glow,
// concentric rings (they make the distortion easy to read) and type.
function drawPlate(ctx, w, h) {
  const accent = "#f26b3a";
  const fg = "#ece8e1";

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#1c100c");
  bg.addColorStop(1, "#070707");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.62;
  const cy = h * 0.38;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.7);
  glow.addColorStop(0, "rgba(242, 107, 58, 0.55)");
  glow.addColorStop(0.45, "rgba(242, 107, 58, 0.12)");
  glow.addColorStop(1, "rgba(242, 107, 58, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(236, 232, 225, 0.14)";
  ctx.lineWidth = 2;
  for (let r = 40; r < w * 1.2; r += 36) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = fg;
  ctx.font = `italic 300 ${Math.round(w * 0.5)}px Fraunces, serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("N°", w * 0.07, h * 0.92);

  ctx.fillStyle = "#8a857d";
  ctx.font = `400 ${Math.round(w * 0.026)}px "JetBrains Mono", monospace`;
  ctx.fillText("PLATE 03 — RESIDUE", w * 0.07, h * 0.08);
  ctx.textAlign = "right";
  ctx.fillText("01:14 AM", w * 0.93, h * 0.08);
  ctx.textAlign = "left";
}

export function initRipple(stage, { reducedMotion }) {
  const el = document.querySelector("[data-ripple]");
  if (!el) return;

  // 4:5 artwork, matching the element's CSS aspect-ratio.
  const art = document.createElement("canvas");
  art.width = 1024;
  art.height = 1280;
  const ctx = art.getContext("2d");
  const texture = new THREE.CanvasTexture(art);
  texture.colorSpace = THREE.SRGBColorSpace; // canvas pixels are sRGB
  texture.anisotropy = 4;

  const redraw = () => {
    drawPlate(ctx, art.width, art.height);
    texture.needsUpdate = true;
    stage.requestRender();
  };
  redraw(); // fallback fonts right away…
  // …then again once the real fonts exist (canvas text can't reflow itself).
  Promise.all([
    document.fonts.load('italic 300 100px "Fraunces"'),
    document.fonts.load('400 20px "JetBrains Mono"'),
  ]).then(redraw);

  const uniforms = {
    uTexture: { value: texture },
    uTime: { value: 0 },
    uHover: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uAspect: { value: 0.8 },
    uFrequency: { value: SETTINGS.frequency },
    uSpeed: { value: SETTINGS.speed },
    uDecay: { value: SETTINGS.decay },
    uAmplitude: { value: SETTINGS.amplitude },
  };
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms })
  );
  stage.scene.add(plane);

  const mouseTarget = new THREE.Vector2(0.5, 0.5);

  // Every frame: sit exactly under the DOM element, advance the ripple.
  stage.onFrame((time, deltaSeconds) => {
    const rect = el.getBoundingClientRect();
    plane.visible = stage.isOnScreen(rect);
    if (!plane.visible) return;
    const { x, y } = stage.rectToWorld(rect);
    plane.position.set(x, y, 0);
    plane.scale.set(rect.width, rect.height, 1);
    uniforms.uAspect.value = rect.width / rect.height;
    uniforms.uTime.value = time;
    const k = 1 - Math.pow(1 - SETTINGS.mouseLerp, deltaSeconds * 60); // fps-independent
    uniforms.uMouse.value.lerp(mouseTarget, k);
  });

  // Reduced motion: the plate stays still; no ripple.
  if (reducedMotion) return;

  el.addEventListener("pointerenter", (e) => {
    const rect = el.getBoundingClientRect();
    // Start the rings where the pointer came in, not from the middle.
    mouseTarget.set((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height);
    uniforms.uMouse.value.copy(mouseTarget);
    gsap.to(uniforms.uHover, { value: 1, duration: SETTINGS.hoverIn, ease: "power2.out", overwrite: true });
  });
  el.addEventListener("pointermove", (e) => {
    const rect = el.getBoundingClientRect();
    mouseTarget.set((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height);
  });
  el.addEventListener("pointerleave", () => {
    gsap.to(uniforms.uHover, { value: 0, duration: SETTINGS.hoverOut, ease: "power2.out", overwrite: true });
  });
}
