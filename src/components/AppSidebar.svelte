<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { afterNavigate } from "$app/navigation";
  import Icon from "./Icon.svelte";
  import { getProfileForAccount, getStoredAccounts, type StoredAccount } from "../lib/script/bsky";

  const navItems = [
    { href: "/", icon: "post", label: "投稿" },
    { href: "/notifications", icon: "bell", label: "通知" },
    { href: "/posts", icon: "list", label: "管理" },
    { href: "/account", icon: "user", label: "アカウント" },
  ];

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

  <div class="sidebar-footer-links">
    <a href="/information" class="sidebar-footer-link">使い方</a>
    <a href="https://github.com/ShinoharaTa/bsky-massdriver" target="_blank" rel="noreferrer" class="sidebar-footer-link">GitHub</a>
  </div>

  <div class="sidebar-accounts">
    {#each accounts as account (account.id)}
      <div class="sidebar-account-item">
        {#if accountAvatars[account.id]}
          <img
            src={accountAvatars[account.id] ?? ""}
            alt={account.handle}
            class="sidebar-avatar-img"
          />
        {:else}
          <div class="sidebar-avatar-fallback" class:nostr-fb={account.platform === "nostr"}>
            {account.platform === "nostr" ? "N" : account.handle.slice(0, 1).toUpperCase()}
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
    padding: 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
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
    padding: 4px 6px 8px;
  }
  .sidebar-brand img {
    border-radius: var(--radius-sm);
  }
  .sidebar-brand h1 {
    font-size: var(--font-sm);
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sidebar-nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    color: var(--muted);
    font-size: var(--font-sm);
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

  .sidebar-footer-links {
    margin-top: auto;
    display: flex;
    gap: 12px;
    padding: 8px 10px 4px;
  }
  .sidebar-footer-link {
    font-size: var(--font-2xs);
    color: var(--muted);
    text-decoration: none;
  }
  .sidebar-footer-link:hover {
    color: var(--primary);
  }

  .sidebar-accounts {
    margin-top: 0;
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
    font-size: var(--font-2xs);
    color: var(--muted);
  }

  .sidebar-avatar-img {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    object-fit: cover;
    flex-shrink: 0;
  }
  .sidebar-avatar-fallback {
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
    flex-shrink: 0;
  }

  .nostr-fb {
    border-color: rgba(139, 92, 246, 0.4);
    background: rgba(139, 92, 246, 0.12);
    color: rgba(139, 92, 246, 0.9);
  }

  .sidebar-account-add {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-2xs);
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
