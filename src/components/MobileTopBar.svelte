<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import {
    getActiveAccountId,
    getProfileForAccount,
    getStoredAccounts,
    type StoredAccount,
  } from "../lib/script/bsky";

  let accounts: StoredAccount[] = $state([]);
  let accountAvatars: Record<string, string | null> = $state({});
  let activeAccountId: string | null = $state(null);

  async function loadAccounts() {
    accounts = getStoredAccounts();
    activeAccountId = getActiveAccountId();
    const entries = await Promise.all(
      accounts.map(async (account) => {
        const profile = await getProfileForAccount(account.id);
        return [account.id, profile?.avatar ?? null] as const;
      }),
    );
    accountAvatars = Object.fromEntries(entries);
  }

  afterNavigate(() => {
    loadAccounts();
  });
</script>

<header class="topbar">
  <div class="topbar-brand">
    <img src="/massdriver-icon.svg" width="24" height="24" alt="Mass Driver" />
    <h1>Mass Driver</h1>
  </div>
  <div class="avatar-group">
    {#each accounts as account (account.id)}
      {#if accountAvatars[account.id]}
        <img
          src={accountAvatars[account.id] ?? ""}
          alt={account.handle}
          class="topbar-avatar"
          class:active={account.id === activeAccountId}
        />
      {:else}
        <div class="topbar-avatar-fallback" class:active={account.id === activeAccountId}>
          {account.handle.slice(0, 1).toUpperCase()}
        </div>
      {/if}
    {/each}
  </div>
</header>

<style>
  .topbar {
    display: none;
    padding: 10px 16px;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
  }
  .topbar-brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .topbar-brand img {
    border-radius: 6px;
  }
  .topbar-brand h1 {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0;
  }

  .avatar-group {
    display: flex;
  }
  .topbar-avatar {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    object-fit: cover;
    border: 2px solid var(--border-light);
    margin-left: -4px;
    cursor: pointer;
  }
  .topbar-avatar:first-child {
    margin-left: 0;
  }
  .topbar-avatar.active {
    border-color: var(--primary);
    z-index: 1;
  }

  .topbar-avatar-fallback {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    border: 2px solid var(--border-light);
    background: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--muted);
    margin-left: -4px;
    cursor: pointer;
  }
  .topbar-avatar-fallback:first-child {
    margin-left: 0;
  }
  .topbar-avatar-fallback.active {
    border-color: var(--primary);
    z-index: 1;
  }

  @media (max-width: 767px) {
    .topbar { display: flex; }
  }
</style>
