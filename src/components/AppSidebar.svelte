<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { afterNavigate } from "$app/navigation";
  import Icon from "./Icon.svelte";
  import {
    getActiveAccountId,
    getProfileForAccount,
    getStoredAccounts,
    type StoredAccount,
  } from "../lib/script/bsky";

  const navItems = [
    { href: "/", icon: "post", label: "投稿" },
    { href: "/notifications", icon: "bell", label: "通知" },
    { href: "/posts", icon: "list", label: "管理" },
    { href: "/account", icon: "user", label: "アカウント" },
  ];

  let accounts: StoredAccount[] = $state([]);
  let activeAccountId: string | null = $state(null);
  let accountAvatars: Record<string, string | null> = $state({});

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

  function isActive(href: string) {
    if (href === "/") return page.url.pathname === "/";
    return page.url.pathname.startsWith(href);
  }
</script>

<aside class="sidebar">
  <div class="sidebar-brand">
    <img src="/massdriver-icon.svg" width="24" height="24" alt="Mass Driver" />
    <h1>Mass Driver</h1>
  </div>

  <nav class="sidebar-nav">
    {#each navItems as item (item.href)}
      <a href={item.href} class="sidebar-nav-item" class:active={isActive(item.href)}>
        <span class="sidebar-nav-icon"><Icon name={item.icon} size={20} /></span>
        {item.label}
      </a>
    {/each}
  </nav>

  <div class="sidebar-accounts">
    {#each accounts as account (account.id)}
      <div class="sidebar-account-item" class:active-account={account.id === activeAccountId}>
        {#if accountAvatars[account.id]}
          <img
            src={accountAvatars[account.id] ?? ""}
            alt={account.handle}
            class="sidebar-avatar-img"
          />
        {:else}
          <div class="sidebar-avatar-fallback">
            {account.handle.slice(0, 1).toUpperCase()}
          </div>
        {/if}
        <span>@{account.handle}</span>
      </div>
    {/each}
    <button class="sidebar-account-add" onclick={() => goto("/account")}>
      <Icon name="plus" size={16} />
      <span>追加</span>
    </button>
  </div>
</aside>

<style>
  .sidebar {
    width: 200px;
    background: var(--panel);
    border-right: 1px solid var(--border);
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sidebar-brand img {
    border-radius: 6px;
  }
  .sidebar-brand h1 {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 8px;
  }
  .sidebar-nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    border-radius: var(--radius-sm);
    color: var(--muted);
    font-size: 13px;
    cursor: pointer;
    text-decoration: none;
    width: 100%;
    transition: all 0.15s;
  }
  .sidebar-nav-item:hover {
    background: var(--panel-hover);
    color: var(--text);
  }
  .sidebar-nav-item.active {
    background: rgba(2, 132, 199, 0.08);
    color: var(--primary);
    font-weight: 600;
  }
  .sidebar-nav-icon {
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  .sidebar-accounts {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-top: 1px solid var(--border);
    padding-top: 12px;
  }
  .sidebar-account-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--muted);
  }
  .sidebar-account-item.active-account {
    color: var(--text);
  }

  .sidebar-avatar-img {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .sidebar-avatar-fallback {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: 2px solid var(--border-light);
    background: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--muted);
    flex-shrink: 0;
  }

  .sidebar-account-add {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 12px;
    color: var(--muted);
    border: 1px dashed var(--border-light);
    background: none;
    font-family: inherit;
    width: 100%;
  }
  .sidebar-account-add:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  @media (max-width: 767px) {
    .sidebar { display: none; }
  }
</style>
