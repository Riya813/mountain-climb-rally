import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages project sites
// (https://<user>.github.io/<repo>/) and on any custom domain path.
export default defineConfig({
  base: './',
});
