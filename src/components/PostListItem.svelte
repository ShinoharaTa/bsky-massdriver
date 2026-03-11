<script lang="ts">
  import type { ManagedPost } from "../lib/script/bsky";
  import Icon from "./Icon.svelte";

  let {
    item,
    isDeleting = false,
    onDelete,
  }: {
    item: ManagedPost;
    isDeleting?: boolean;
    onDelete: (item: ManagedPost) => void | Promise<void>;
  } = $props();

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }
</script>

<article class="card post-item">
  <div class="post-head">
    <div class="post-meta">
      <span class="post-account">@{item.accountHandle}</span>
      <time class="post-time" datetime={item.indexedAt}>{formatDate(item.indexedAt)}</time>
      {#if item.replyParentUri}
        <span class="reply-badge">返信</span>
      {/if}
      {#if item.hasMedia}
        <span class="reply-badge">画像あり</span>
      {/if}
    </div>

    <button
      class="btn btn-ghost btn-sm"
      disabled={isDeleting}
      onclick={() => onDelete(item)}
      aria-label="投稿を削除"
    >
      {#if isDeleting}
        削除中...
      {:else}
        <Icon name="trash" size={16} />
      {/if}
    </button>
  </div>

  <p class="post-text">{item.text || "本文なし"}</p>

  <div class="stats">
    <span><Icon name="heart" size={14} /> {item.metrics.likeCount}</span>
    <span><Icon name="repeat" size={14} /> {item.metrics.repostCount}</span>
    <span><Icon name="message" size={14} /> {item.metrics.replyCount}</span>
  </div>
</article>

<style>
  .post-item {
    display: grid;
    gap: 10px;
  }

  .post-head {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
  }

  .post-meta {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }

  .post-account {
    font-size: 12px;
    font-weight: 700;
  }

  .post-time {
    color: var(--muted);
    font-size: 12px;
  }

  .reply-badge {
    border-radius: 999px;
    padding: 2px 8px;
    border: 1px solid var(--border-light);
    color: var(--muted);
    font-size: 11px;
  }

  .post-text {
    margin: 0;
    font-size: 14px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
  }

  .stats span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
</style>
