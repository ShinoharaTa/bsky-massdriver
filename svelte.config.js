import adapter from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [vitePreprocess()],
  kit: {
    adapter: adapter(),
    // The Service Worker is built from src/sw.ts by @vite-pwa/sveltekit (injectManifest) and registered via virtual:pwa-register
    files: {
      serviceWorker: "src/sw.ts",
    },
    serviceWorker: {
      register: false,
    },
  },
};

export default config;
