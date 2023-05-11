<script lang="ts">
  import LoadingOverlay from "../components/LoadingOverlay.svelte";
  import MessageOverlay from "../components/MessageOverlay.svelte";

  // Your selected Skeleton theme:
  import "@skeletonlabs/skeleton/themes/theme-rocket.css";

  // This contains the bulk of Skeletons required styles:
  // NOTE: this will be renamed skeleton.css in the v2.x release.
  import "@skeletonlabs/skeleton/styles/skeleton.css";

  // Finally, your application's global stylesheet (sometimes labeled 'app.css')
  import "../app.postcss";

  import "../app.postcss";
</script>

<LoadingOverlay />
<MessageOverlay />
<div class="container mx-auto p-4">
  <slot />
</div>
