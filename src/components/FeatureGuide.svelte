<script lang="ts">
  import { page } from "$app/state";
  import Icon from "./Icon.svelte";
  import { t, type MessageKey } from "../lib/i18n";

  let {
    onInsert,
    onCopyShareUrl,
    onDismiss,
  }: {
    onInsert: (text: string) => void;
    onCopyShareUrl: () => void;
    onDismiss: () => void;
  } = $props();

  // Rows with a "Try" button insert the example into the textarea
  const tryRows: { icon: string; label: MessageKey; desc: MessageKey; example: string }[] = [
    { icon: "at-sign", label: "guide.mention.label", desc: "guide.mention.desc", example: "@bsky.app" },
    { icon: "link", label: "guide.link.label", desc: "guide.link.desc", example: "https://bsky.app" },
    { icon: "hash", label: "guide.hashtag.label", desc: "guide.hashtag.desc", example: "#massdriver" },
  ];

  const shareExample = $derived(`${page.url.origin}/?intent=Hello`);
</script>

<div class="section-title guide-header">
  <span>{$t("guide.title")}</span>
  <button class="btn btn-ghost btn-sm btn-icon-only guide-close" onclick={onDismiss} title={$t("common.close")} aria-label={$t("common.close")}><Icon name="x" size={14} /></button>
</div>
<section class="card feature-guide">
  {#each tryRows as row (row.example)}
    <div class="guide-row">
      <Icon name={row.icon} size={16} class="guide-icon" />
      <div class="guide-body">
        <span class="guide-label">{$t(row.label)}</span>
        <code class="guide-code">{row.example}</code>
        <span class="guide-desc">{$t(row.desc)}</span>
      </div>
      <button class="btn btn-outline btn-sm guide-action" onclick={() => onInsert(`${row.example} `)}>{$t("guide.try")}</button>
    </div>
  {/each}

  <div class="guide-row">
    <Icon name="image" size={16} class="guide-icon" />
    <div class="guide-body">
      <span class="guide-label">{$t("guide.image.label")}</span>
      <span class="guide-desc">{$t("guide.image.desc")}</span>
    </div>
  </div>

  <div class="guide-row">
    <Icon name="external-link" size={16} class="guide-icon" />
    <div class="guide-body">
      <span class="guide-label">{$t("guide.share.label")}</span>
      <span class="guide-desc">{$t("guide.share.desc")}</span>
      <code class="guide-code guide-url">{shareExample}</code>
    </div>
    <button class="btn btn-outline btn-sm guide-action" onclick={onCopyShareUrl}>{$t("guide.copy")}</button>
  </div>

  <div class="guide-more">
    <a href="/information">{$t("guide.more")}</a>
  </div>
</section>

<style>
  .guide-header {
    justify-content: space-between;
  }
  .feature-guide {
    display: flex;
    flex-direction: column;
  }
  .guide-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-top: 1px solid var(--border);
    font-size: var(--font-sm);
  }
  .guide-row:first-child {
    border-top: none;
    padding-top: 0;
  }
  .guide-row :global(.guide-icon) {
    color: var(--muted);
  }
  .guide-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 8px;
  }
  .guide-label {
    color: var(--text);
    font-weight: 600;
  }
  .guide-code {
    font-size: var(--font-xs);
    color: var(--primary);
    word-break: break-all;
  }
  .guide-url {
    flex-basis: 100%;
  }
  .guide-desc {
    color: var(--muted);
    font-size: var(--font-xs);
    word-break: break-word;
  }
  .guide-action {
    flex-shrink: 0;
  }
  .guide-more {
    padding-top: 8px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
  }
  .guide-more a {
    display: inline-flex;
    align-items: center;
    min-height: var(--control-size-sm);
    font-size: var(--font-sm);
    color: var(--primary);
    text-decoration: none;
  }
  .guide-more a:hover {
    text-decoration: underline;
  }
</style>
