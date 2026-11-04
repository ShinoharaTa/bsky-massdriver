<script lang="ts">
  import { locale } from "../../lib/i18n";
  import InformationJa from "./InformationJa.svelte";
  import InformationEn from "./InformationEn.svelte";
</script>

{#if $locale === "en"}
  <InformationEn />
{:else}
  <InformationJa />
{/if}
