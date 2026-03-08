<script lang="ts">
  import { logout } from "../lib/script/bsky";
  import { Popover, Portal } from "@skeletonlabs/skeleton-svelte";

  let { avatar, handle }: { avatar: string | null; handle: string } = $props();

  function clickLogout() {
    logout();
  }
</script>

<Popover positioning={{ placement: "bottom-end" }}>
  <Popover.Trigger>
    <button class="avatar-btn" title={"@" + handle}>
      {#if avatar}
        <img src={avatar} alt={handle} class="avatar-img" />
      {:else}
        <span class="avatar-fallback">?</span>
      {/if}
    </button>
  </Popover.Trigger>
  <Portal>
    <Popover.Positioner>
      <Popover.Content class="popover-content">
        <div class="popover-handle">@{handle}</div>
        <button onclick={clickLogout} class="btn btn-outline btn-sm popover-logout">Logout</button>
        <Popover.Arrow>
          <Popover.ArrowTip />
        </Popover.Arrow>
      </Popover.Content>
    </Popover.Positioner>
  </Portal>
</Popover>

<style>
  .avatar-btn {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 2px solid var(--primary);
    background: #020617;
    cursor: pointer;
    padding: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 999px;
  }
  .avatar-fallback {
    color: var(--muted);
    font-size: 14px;
  }
  :global(.popover-content) {
    background: var(--panel) !important;
    border: 1px solid var(--border-light) !important;
    border-radius: var(--radius-sm) !important;
    padding: 10px !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  :global(.popover-handle) {
    font-size: 12px;
    color: var(--muted);
    text-align: center;
  }
  :global(.popover-logout) {
    width: 100%;
    justify-content: center;
  }
</style>
