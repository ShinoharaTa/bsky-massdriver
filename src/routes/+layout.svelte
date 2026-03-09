<script lang="ts">
  import LoadingOverlay from "../components/LoadingOverlay.svelte";
  import MessageOverlay from "../components/MessageOverlay.svelte";
  import FooterComponent from "../components/Footer.svelte";
  import type { Snippet } from "svelte";

  import "../app.css";

  let { children }: { children: Snippet } = $props();
</script>

<LoadingOverlay />
<MessageOverlay />
<div class="shell">
  <main class="container-app">
    {@render children()}
  </main>
  <FooterComponent />
</div>
