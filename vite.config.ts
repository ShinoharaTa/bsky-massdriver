import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      pwaAssets: {
        config: true,
      },
      manifest: {
        id: "/",
        short_name: "Mass Driver",
        name: "BSKY Mass Driver - Post Only Bluesky Client.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0284c7",
        background_color: "#f8fafc",
        share_target: {
          action: "/share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [
              {
                name: "images",
                accept: ["image/jpeg", "image/png", "image/webp"],
              },
            ],
          },
        },
      },
      kit: {
        includeVersionFile: true,
      },
    }),
  ],
  ssr: {
    resolve: {
      conditions: ["svelte"],
    },
  },
});
