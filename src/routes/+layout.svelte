<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { pwaAssetsHead } from "virtual:pwa-assets/head";
  import { pwaInfo } from "virtual:pwa-info";
  import LoadingOverlay from "../components/LoadingOverlay.svelte";
  import MessageOverlay from "../components/MessageOverlay.svelte";
  import FooterComponent from "../components/Footer.svelte";
  import AppSidebar from "../components/AppSidebar.svelte";
  import BottomNav from "../components/BottomNav.svelte";
  import MobileTopBar from "../components/MobileTopBar.svelte";
  import type { Snippet } from "svelte";

  import "../app.css";

  let { children }: { children: Snippet } = $props();
  const webManifestLink = pwaInfo ? pwaInfo.webManifest.linkTag : "";

  const standaloneRoutes = ["/login", "/information", "/share"];
  let isStandalone = $derived(standaloneRoutes.includes(page.url.pathname));

  onMount(async () => {
    if (!pwaInfo) return;

    const { registerSW } = await import("virtual:pwa-register");
    registerSW({
      immediate: true,
      onRegisterError(error) {
        console.error("SW registration error", error);
      },
    });
  });
</script>

<svelte:head>
  {#if pwaAssetsHead.themeColor}
    <meta name="theme-color" content={pwaAssetsHead.themeColor.content} />
  {/if}
  {#each pwaAssetsHead.links as link}
    <link {...link} />
  {/each}
  {@html webManifestLink}
</svelte:head>

<LoadingOverlay />
<MessageOverlay />

{#if isStandalone}
  <div class="shell">
    <main class="container-app">
      {@render children()}
    </main>
    <FooterComponent />
  </div>
{:else}
  <div class="app">
    <AppSidebar />
    <div class="app-main">
      <MobileTopBar />
      <main class="app-page">
        {@render children()}
      </main>
      <FooterComponent />
    </div>
  </div>
  <BottomNav />
{/if}
