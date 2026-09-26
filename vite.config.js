import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs, so the build works under any sub-path
  // (GitHub Pages serves it at /nocturne/).
  base: "./",
  server: { port: 5173, open: true },
  // three.js + postprocessing are ~750 kB; silence the chunk-size warning.
  build: { chunkSizeWarningLimit: 1200 },
});
