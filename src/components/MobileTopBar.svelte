<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { getProfileForAccount, getStoredAccounts, type StoredAccount } from "../lib/script/bsky";

  let accounts: StoredAccount[] = $state([]);
  let accountAvatars: Record<string, string | null> = $state({});

  async function loadAccounts() {
    accounts = getStoredAccounts();
    const entries = await Promise.all(
      accounts.map(async (account) => {
        try {
          const profile = await getProfileForAccount(account.id);
          return [account.id, profile?.avatar ?? null] as const;
        } catch {
          return [account.id, null] as const;
        }
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
    <img src="/massdriver-icon.svg" width="20" height="20" alt="Mass Driver" />
    <h1>Mass Driver</h1>
  </div>
  <a href="/account" class="avatar-group" aria-label="アカウント設定">
    {#each accounts as account (account.id)}
      {#if accountAvatars[account.id]}
        <img
          src={accountAvatars[account.id] ?? ""}
          alt={account.handle}
          class="topbar-avatar"
        />
      {:else}
        <div class="topbar-avatar-fallback" class:nostr-fb={account.platform === "nostr"}>
          {account.platform === "nostr" ? "N" : account.handle.slice(0, 1).toUpperCase()}
        </div>
      {/if}
    {/each}
  </a>
</header>

<style>
  .topbar {
    display: none;
    padding: 8px 16px;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
  }
  .topbar-brand {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .topbar-brand img {
    border-radius: var(--radius-sm);
  }
  .topbar-brand h1 {
    font-size: var(--font-sm);
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0;
  }

  .avatar-group {
    display: flex;
    text-decoration: none;
  }
  .topbar-avatar {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    object-fit: cover;
    border: 2px solid var(--border-light);
    margin-left: -6px;
    cursor: pointer;
  }
  .topbar-avatar:first-child {
    margin-left: 0;
  }

  .topbar-avatar-fallback {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    border: 2px solid var(--border-light);
    background: var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--muted);
    margin-left: -6px;
    cursor: pointer;
  }
  .topbar-avatar-fallback:first-child {
    margin-left: 0;
  }

  .nostr-fb {
    border-color: rgba(139, 92, 246, 0.4);
    background: rgba(139, 92, 246, 0.12);
    color: rgba(139, 92, 246, 0.9);
  }

  @media (max-width: 767px) {
    .topbar { display: flex; }
  }
</style>
