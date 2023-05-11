<script lang="ts">
  import { onMount } from "svelte";
  import { getProfile, logout } from "../lib/script/bsky";
  import { Avatar } from "@skeletonlabs/skeleton";
  import { popup } from "@skeletonlabs/skeleton";
  import type { PopupSettings } from "@skeletonlabs/skeleton";

  let isLoaded: boolean = false;
  let icon: string | null = null;
  onMount(async () => {
    const profile = await getProfile();
    if (profile) {
      icon = profile.avatar ?? null;
    }
    isLoaded = true;
  });

  function clickLogout() {
    logout();
    return;
  }

  const popupClick: PopupSettings = {
    event: "click",
    target: "popupClick",
    placement: "top",
  };
</script>

{#if isLoaded}
  <button use:popup={popupClick}>
    <Avatar src={icon ?? ``} width="w-12" rounded="rounded-full" />
  </button>
{:else}
  <Avatar src="" width="w-12" rounded="rounded-full" />
{/if}
<div class="card p-4" data-popup="popupClick">
  <div>
    <button on:click={clickLogout}> Logout </button>
  </div>
  <div class="arrow bg-surface-100-800-token" />
</div>
