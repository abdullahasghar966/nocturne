// ------------------------------------------------------------------
// Global film grain + chromatic aberration (pmndrs postprocessing),
// plus FXAA. Runs over the whole WebGL frame: the background, the
// scroll object and the ripple plate. DOM text sits above the canvas
// and stays crisp. The goal is expensive, not glitchy, so everything
// is dialled low.
// ------------------------------------------------------------------
import * as THREE from "three";
import {
  EffectPass,
  FXAAEffect,
  NoiseEffect,
  ChromaticAberrationEffect,
  BlendFunction,
} from "postprocessing";

const SETTINGS = {
  // Grain strength. With OVERLAY the grain rides on the image's own
  // brightness: average brightness is unchanged (blacks don't go milky),
  // and the grain shows most in the lit areas. TUNE 0.1–0.6
  grainOpacity: 0.25,
  // OVERLAY = contrasty film grain; SOFT_LIGHT = gentler; SCREEN lifts
  // the blacks (reads as dust, not grain).
  grainBlend: BlendFunction.OVERLAY,
  // Red/blue split in UV units (x, y). 0.001 ≈ 1.5px on a 1440px-wide
  // screen. TUNE 0.0003 (barely there) – 0.002 (obvious)
  aberration: 0.0009,
  // Radius of the clean centre before the split starts creeping in.
  // TUNE 0 (split everywhere) – 0.6 (edges only)
  aberrationClearCentre: 0.3,
};

export function initPostFX(stage) {
  const grain = new NoiseEffect({ blendFunction: SETTINGS.grainBlend });
  grain.blendMode.opacity.value = SETTINGS.grainOpacity;

  const aberration = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(SETTINGS.aberration, SETTINGS.aberration),
    // Strength grows with distance from the centre, like a real lens.
    radialModulation: true,
    modulationOffset: SETTINGS.aberrationClearCentre,
  });

  // Antialiasing first, so the lens split and the grain sit on clean
  // edges. It needs its own pass: FXAA and chromatic aberration both
  // sample neighbouring pixels, and postprocessing refuses to merge two
  // such effects into one shader.
  stage.composer.addPass(new EffectPass(stage.camera, new FXAAEffect()));
  // One EffectPass merges these two into a single full-screen shader.
  stage.composer.addPass(new EffectPass(stage.camera, aberration, grain));

  return { grain, aberration };
}
