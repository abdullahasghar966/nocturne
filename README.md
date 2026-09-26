# NOCTURNE

*an experience in motion.* A single-page, hyper-animated dark web experience: a portfolio and
demo piece built with vanilla JS, GSAP, Lenis and Three.js.

**Live demo → https://abdullahasghar966.github.io/nocturne/**

## What's in it

| Effect | File |
|---|---|
| Smooth scroll: Lenis driven by GSAP's ticker, so scroll, ScrollTrigger and every tween share one frame loop | `src/smooth-scroll.js` |
| Living background: domain-warped simplex-noise shader that trails the mouse, rendered at 60% resolution | `src/shader-bg.js` |
| Headline reveal: SplitText characters rising out of per-letter masks, with a variable-font weight swell | `src/hero-reveal.js` |
| Custom cursor: lerped circle that grows and inverts over anything interactive | `src/cursor.js` |
| Magnetic buttons: pulled toward the cursor within 80px, elastic spring-back (`gsap.quickTo`) | `src/magnetic.js` |
| Pinned 3D section: an icosahedron whose rotation is scrubbed 1:1 by scroll (ScrollTrigger) | `src/scroll-object.js` |
| Scramble on hover: the tagline dissolves and decodes back into itself (ScrambleText) | `src/scramble.js` |
| Ripple plate: rings of UV displacement spread from the cursor over a generated artwork | `src/ripple.js` |
| Film grain + chromatic aberration + FXAA over the whole WebGL frame (pmndrs postprocessing) | `src/post-fx.js` |
| One WebGL stage: a single renderer and composer; meshes follow their DOM elements every frame | `src/stage.js` |

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

Requires Node 20.19+ or 22.12+ (Vite 8).

## Tweak it

- Every module starts with a `SETTINGS` object. Each value that's worth tuning by feel is
  marked `TUNE` with a sensible range: durations, easing, lerp amounts, noise scale, grain
  strength and so on.
- In dev, the stage and effects are exposed on `window.nocturne` for live tuning from the
  console, e.g. `nocturne.fx.grain.blendMode.opacity.value = 0.4`.
- Open `/?reduced-motion` in dev to preview the reduced-motion version without changing
  your OS setting.

## Performance

Built to hold 60fps on an integrated GPU. On Intel UHD Graphics, the whole page (background,
3D object, ripple plate, FXAA, grain and aberration) measured **5.7 ms per frame at a
1920×912 render size**, against a 16.7 ms budget. What gets it there:

- The noise background renders at 60% resolution into an offscreen target; it's soft, so the
  upscale is invisible.
- FXAA instead of MSAA: 4× MSAA alone pushed the same frame to 16.9 ms.
- 8-bit sRGB post-processing buffers instead of half-float: half the memory traffic, no
  banding in the darks.
- The pinned object and the plate only render while they're on screen.

## Accessibility

- `prefers-reduced-motion`: no render loop, entrance animation, smooth-scroll inertia, pinning,
  hover motion or animated grain. Content appears in its final state immediately.
- Touch devices keep the native cursor and skip the magnetic effect.
- The scrambling tagline has a stable screen-reader copy, and the WebGL-only plate is labelled
  as an image.

## Structure

```
index.html
src/
  main.js            wiring; module order matters (Lenis before the stage)
  stage.js           renderer, camera (1 unit = 1 CSS px), composer, frame loop
  shader-bg.js       noise background
  scroll-object.js   pinned, scroll-scrubbed icosahedron
  ripple.js          ripple plate + procedural artwork
  post-fx.js         FXAA, chromatic aberration, grain
  smooth-scroll.js   Lenis + ScrollTrigger sync
  hero-reveal.js     SplitText headline entrance
  cursor.js          custom cursor
  magnetic.js        magnetic buttons
  scramble.js        scramble-on-hover
  style.css          design tokens and layout
```

## Credits

- [GSAP](https://gsap.com) (with ScrollTrigger, SplitText, ScrambleText), [Lenis](https://github.com/darkroomengineering/lenis),
  [three.js](https://threejs.org), [postprocessing](https://github.com/pmndrs/postprocessing)
- 3D simplex noise by Ian McEwan, Ashima Arts ([webgl-noise](https://github.com/ashima/webgl-noise), MIT)
- Type: [Fraunces](https://fonts.google.com/specimen/Fraunces) and
  [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) via Google Fonts

## License

[MIT](LICENSE) © 2026 Abdullah Asghar. This covers the code in this repository. Dependencies,
the simplex noise function and the fonts keep their own licenses.
