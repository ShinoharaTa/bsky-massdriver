<script lang="ts">
  import { page } from "$app/state";
  import LoadingOverlay from "../components/LoadingOverlay.svelte";
  import MessageOverlay from "../components/MessageOverlay.svelte";
  import FooterComponent from "../components/Footer.svelte";
  import AppSidebar from "../components/AppSidebar.svelte";
  import BottomNav from "../components/BottomNav.svelte";
  import MobileTopBar from "../components/MobileTopBar.svelte";
  import type { Snippet } from "svelte";

  import "../app.css";

  let { children }: { children: Snippet } = $props();

  const standaloneRoutes = ["/login", "/information", "/share"];
  let isStandalone = $derived(standaloneRoutes.includes(page.url.pathname));
</script>

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
