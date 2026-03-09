<script lang="ts">
  import { page } from "$app/state";

  const items = [
    { href: "/", label: "投稿" },
    { href: "/notifications", label: "通知" },
    { href: "/posts", label: "投稿管理" },
  ];
</script>

<nav class="page-nav" aria-label="Primary">
  {#each items as item (item.href)}
    <a href={item.href} class:selected={page.url.pathname === item.href}>
      {item.label}
    </a>
  {/each}
</nav>

<style>
  .page-nav {
    display: flex;
    gap: 8px;
    margin: 4px 0 10px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .page-nav a {
    color: var(--muted);
    text-decoration: none;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--panel) 85%, white 15%);
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 12px;
    white-space: nowrap;
    transition: all 0.15s ease;
  }

  .page-nav a:hover,
  .page-nav a.selected {
    color: #0b1220;
    border-color: var(--primary);
    background: var(--primary);
    font-weight: 700;
  }
</style>
