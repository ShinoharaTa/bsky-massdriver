<script lang="ts">
  import { page } from "$app/state";
  import { t, type MessageKey } from "../lib/i18n";

  const items: { href: string; labelKey: MessageKey }[] = [
    { href: "/", labelKey: "nav.post" },
    { href: "/notifications", labelKey: "nav.notifications" },
    { href: "/posts", labelKey: "nav.postsManage" },
  ];
</script>

<nav class="page-nav" aria-label="Primary">
  {#each items as item (item.href)}
    <a href={item.href} class:selected={page.url.pathname === item.href}>
      {$t(item.labelKey)}
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
    border-radius: var(--radius-full);
    padding: 6px 12px;
    font-size: var(--font-2xs);
    white-space: nowrap;
    transition: all 0.15s ease;
  }

  .page-nav a:hover,
  .page-nav a.selected {
    color: var(--panel);
    border-color: var(--primary);
    background: var(--primary);
    font-weight: 700;
  }
</style>
