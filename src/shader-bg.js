// ------------------------------------------------------------------
// Full-viewport noise-field background (Three.js ShaderMaterial).
// A domain-warped simplex fbm, tinted near-black → ember, with the
// lerped mouse position nudging the warp and adding a soft glow.
//
// It renders at low resolution into its own texture, which becomes the
// stage scene's background. The stage upscales it for free and runs
// grain + chromatic aberration over it with everything else.
// ------------------------------------------------------------------
import * as THREE from "three";

// ---------------- Tunables (change these by feel) ----------------
const SETTINGS = {
  // Fraction of CSS pixels we actually render. The field is soft, so
  // rendering small and upscaling is nearly free visually and is the
  // single biggest perf win. TUNE: 0.35–1.0
  renderScale: 0.6,
  // Mouse trailing. Fraction of the gap closed per 60fps frame.
  // TUNE: 0.02 (very laggy, dreamy) – 0.12 (tight).
  mouseLerp: 0.045,
  // Global time multiplier. TUNE: 0.02–0.12. Higher = busier.
  speed: 0.055,
};

const vertexShader = /* glsl */ `
  void main() {
    // Plane is already in clip space (-1..1), no camera maths needed.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec2  uMouse;        // lerped, 0..1, origin bottom-left
  uniform vec3  uColorBase;
  uniform vec3  uColorMid;
  uniform vec3  uColorAccent;

  // --- 3D simplex noise ---
  // Author: Ian McEwan, Ashima Arts. Maintainer: Stefan Gustavson.
  // Copyright (C) 2011 Ashima Arts. Distributed under the MIT License.
  // https://github.com/ashima/webgl-noise
  vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
  vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // 3 octaves keeps it calm and cheap. TUNE: 2–5 (cost scales linearly).
  float fbm(vec3 p){
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * snoise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0);

    float t = uTime;

    // TUNE: noise scale 0.8–2.0. Lower = larger, softer shapes.
    float scale = 1.15;

    // Mouse gently drags the whole field. TUNE: 0.05–0.3
    vec2 drift = m * 0.18;

    // Domain warp: sample fbm, use it to offset a second sample.
    vec3 sp = vec3(p * scale + drift, t);
    vec2 q = vec2(
      fbm(sp),
      fbm(sp + vec3(5.2, 1.3, 0.0))
    );
    // TUNE: warp strength 0.6–2.0. Higher = more liquid/marbled.
    // Mouse x increases distortion slightly.
    float warp = 1.1 + uMouse.x * 0.35;
    float n = fbm(vec3(p * scale + q * warp + drift, t * 0.7));
    n = n * 0.5 + 0.5; // -> 0..1

    // Base gradient: near-black -> deep warm brown
    vec3 col = mix(uColorBase, uColorMid, smoothstep(0.25, 0.85, n));

    // Thin ember "veins" where the warped field folds.
    float veins = smoothstep(0.58, 0.78, n) * (1.0 - smoothstep(0.80, 1.0, n));
    // Mouse y shifts how much accent bleeds in. TUNE: 0.15–0.6
    col += uColorAccent * veins * (0.16 + uMouse.y * 0.14);

    // Soft glow that follows the (lerped) cursor. TUNE: radius 0.3–0.8
    float d = length(p - m);
    float glow = exp(-d * d / 0.18);
    col += uColorAccent * glow * 0.06 * (0.6 + n);

    // Vignette pulls the edges back to black.
    float vig = smoothstep(1.25, 0.25, length(p * vec2(0.85, 1.0)));
    col *= mix(0.35, 1.0, vig);

    // Tiny dither to kill banding in dark gradients.
    float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (dither - 0.5) / 255.0;

    // All the maths above is in display (sRGB) space; the post-processing
    // pipeline works in linear and converts back once at the very end.
    col = max(col, 0.0);
    col = mix(col / 12.92, pow((col + 0.055) / 1.055, vec3(2.4)), step(0.04045, col));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function initShaderBackground(stage, { reducedMotion }) {
  const { renderer } = stage;
  const scene = new THREE.Scene();
  const camera = new THREE.Camera(); // unused by our vertex shader

  // Low-res offscreen target. Stored as sRGB so 8 bits are spent where
  // the eye needs them: the GPU encodes our linear output on write and
  // decodes it on read, and the dark gradients don't band.
  const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  // The stage draws this texture full-screen behind everything else.
  stage.scene.background = target.texture;

  // THREE.Color converts hex to linear space, but ShaderMaterial does not
  // convert back. The shader does its maths in display (sRGB) space, so
  // hand it the hex values as-is (it converts to linear at the end).
  const displayColor = (hex) => new THREE.Color(hex).convertLinearToSRGB();

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    // Colours — keep these as the only place the palette lives in GLSL
    uColorBase: { value: displayColor("#070707") },
    uColorMid: { value: displayColor("#2a1712") },
    uColorAccent: { value: displayColor("#f26b3a") },
  };

  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  // Draw the noise field into the offscreen target.
  function draw() {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
  }

  // --- Sizing ---
  function resize() {
    const scale = renderer.getPixelRatio() * SETTINGS.renderScale;
    target.setSize(
      Math.max(1, Math.round(window.innerWidth * scale)),
      Math.max(1, Math.round(window.innerHeight * scale))
    );
    // uResolution must be the *target* size, since the shader divides
    // gl_FragCoord (target pixels) by it.
    uniforms.uResolution.value.set(target.width, target.height);
    if (reducedMotion) {
      draw();
      stage.requestRender();
    }
  }
  window.addEventListener("resize", resize);
  resize();

  // --- Reduced motion: one static frame, no mouse ---
  if (reducedMotion) {
    uniforms.uTime.value = 12.0; // a nice-looking fixed moment
    draw();
    return { uniforms };
  }

  // --- Mouse: store the raw target, lerp the uniform toward it ---
  const mouseTarget = new THREE.Vector2(0.5, 0.5);
  window.addEventListener("pointermove", (e) => {
    mouseTarget.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
  });

  // --- Every stage frame, before the scene is drawn ---
  stage.onFrame((time, deltaSeconds) => {
    // Frame-rate-independent lerp: same feel at 60Hz and 144Hz.
    const k = 1 - Math.pow(1 - SETTINGS.mouseLerp, deltaSeconds * 60);
    uniforms.uMouse.value.lerp(mouseTarget, k);
    uniforms.uTime.value = time * SETTINGS.speed;
    draw();
  });

  return { uniforms };
}
