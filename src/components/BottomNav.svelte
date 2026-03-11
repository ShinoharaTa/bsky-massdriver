<script lang="ts">
  import { page } from "$app/state";
  import Icon from "./Icon.svelte";

  const navItems = [
    { href: "/", icon: "post", label: "投稿" },
    { href: "/notifications", icon: "bell", label: "通知" },
    { href: "/posts", icon: "list", label: "管理" },
    { href: "/account", icon: "user", label: "アカウント" },
  ];

  function isActive(href: string) {
    if (href === "/") return page.url.pathname === "/";
    return page.url.pathname.startsWith(href);
  }
</script>

<nav class="bottom-nav" aria-label="Primary">
  <div class="bottom-nav-items">
    {#each navItems as item (item.href)}
      <a href={item.href} class="bottom-nav-item" class:active={isActive(item.href)}>
        <span class="nav-icon"><Icon name={item.icon} size={20} /></span>
        <span>{item.label}</span>
      </a>
    {/each}
  </div>
</nav>

<style>
  .bottom-nav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--panel);
    border-top: 1px solid var(--border);
    z-index: 100;
    padding: 4px 0 max(4px, env(safe-area-inset-bottom));
  }
  .bottom-nav-items {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  .bottom-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 0;
    color: var(--muted);
    font-size: var(--font-2xs);
    text-decoration: none;
    transition: color 0.15s;
  }
  .bottom-nav-item.active {
    color: var(--primary);
  }
  .bottom-nav-item:hover {
    color: var(--text);
  }
  .nav-icon {
    line-height: 1;
  }

  @media (max-width: 767px) {
    .bottom-nav { display: block; }
  }
</style>
