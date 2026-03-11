<script lang="ts">
  import UserField from "./UserField.svelte";
  import type { StoredAccount } from "../lib/script/bsky";

  let {
    accounts,
    accountAvatars,
    activeAccountId,
    onSwitchActiveAccount,
    onAddAccount,
  }: {
    accounts: StoredAccount[];
    accountAvatars: Record<string, string | null>;
    activeAccountId: string | null;
    onSwitchActiveAccount: (accountId: string) => void | Promise<void>;
    onAddAccount: () => void;
  } = $props();

  const getFallback = (handle: string) => handle.slice(0, 1).toUpperCase();
</script>

<header class="header">
  <div class="brand">
    <img src="/massdriver-icon.svg" width="30" height="30" alt="Mass Driver" />
    <h1>Mass Driver</h1>
  </div>
  <div class="header-right">
    <div class="avatar-group">
      {#each accounts as account (account.id)}
        {#if account.id === activeAccountId}
          <UserField avatar={accountAvatars[account.id] ?? null} handle={account.handle} />
        {:else}
          <button
            class="account-avatar"
            title={"@" + account.handle}
            onclick={() => onSwitchActiveAccount(account.id)}
          >
            {#if accountAvatars[account.id]}
              <img src={accountAvatars[account.id] ?? ""} alt={account.handle} class="account-avatar-image" />
            {:else}
              <span class="account-avatar-fallback">{getFallback(account.handle)}</span>
            {/if}
          </button>
        {/if}
      {/each}
    </div>
    <button class="add-account-btn" title="Add account" onclick={onAddAccount}>+</button>
  </div>
</header>

<style>
  .header {
    padding: 14px 0 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .brand h1 {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .avatar-group {
    display: flex;
    align-items: center;
  }

  .account-avatar {
    width: 32px;
    height: 32px;
    margin-left: -4px;
    border-radius: 999px;
    border: 2px solid var(--border-light);
    background: #e2e8f0;
    padding: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .account-avatar:first-child {
    margin-left: 0;
  }

  .account-avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .account-avatar-fallback {
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }

  .add-account-btn {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    border: 1px dashed var(--border-light);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-account-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
</style>
