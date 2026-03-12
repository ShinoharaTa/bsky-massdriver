import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
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
          action: "/share",
          method: "GET",
          params: {
            title: "title",
            text: "text",
            url: "url",
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
