<script lang="ts">
  import LoadingOverlay from "../components/LoadingOverlay.svelte";
  import MessageOverlay from "../components/MessageOverlay.svelte";
  import FooterComponent from "../components/Footer.svelte";
  import {
    computePosition,
    autoUpdate,
    offset,
    shift,
    flip,
    arrow,
  } from "@floating-ui/dom";

  import { storePopup } from "@skeletonlabs/skeleton";
  storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });

  // Your selected Skeleton theme:
  import "@skeletonlabs/skeleton/themes/theme-rocket.css";

  // This contains the bulk of Skeletons required styles:
  // NOTE: this will be renamed skeleton.css in the v2.x release.
  import "@skeletonlabs/skeleton/styles/skeleton.css";

  // Finally, your application's global stylesheet (sometimes labeled 'app.css')
  import "../app.postcss";
</script>

<LoadingOverlay />
<MessageOverlay />
<div class="flex flex-col h-screen justify-between">
  <div class="container mb-auto mx-auto p-4">
    <slot />
  </div>
  <FooterComponent />
</div>
