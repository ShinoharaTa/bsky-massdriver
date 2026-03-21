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

  let lightboxImage: string | null = $state(null);

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function openLightbox(url: string) {
    lightboxImage = url;
  }

  function closeLightbox() {
    lightboxImage = null;
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
    </div>

    <button
      class="btn btn-ghost btn-sm btn-icon-only"
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

  {#if item.images && item.images.length > 0}
    <div class="post-images">
      {#each item.images as img (img.fullsize)}
        <button class="post-image-btn" aria-label="画像を拡大" onclick={() => openLightbox(img.fullsize)}>
          <img src={img.thumb} alt={img.alt} loading="lazy" />
        </button>
      {/each}
    </div>
  {:else if item.hasMedia}
    <div class="post-media-fallback">
      <span class="reply-badge">メディアあり</span>
    </div>
  {/if}

  <div class="stats">
    <span><Icon name="heart" size={14} /> {item.metrics.likeCount}</span>
    <span><Icon name="repeat" size={14} /> {item.metrics.repostCount}</span>
    <span><Icon name="message" size={14} /> {item.metrics.replyCount}</span>
  </div>
</article>

{#if lightboxImage}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="lightbox" onclick={closeLightbox}>
    <button class="lightbox-close" onclick={closeLightbox} aria-label="閉じる"><Icon name="x" size={24} /></button>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <img src={lightboxImage} alt="拡大画像" onclick={(e) => e.stopPropagation()} />
  </div>
{/if}

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
    font-size: var(--font-sm);
    font-weight: 700;
  }

  .post-time {
    color: var(--muted);
    font-size: var(--font-sm);
  }

  .reply-badge {
    border-radius: var(--radius-full);
    padding: 2px 8px;
    border: 1px solid var(--border-light);
    color: var(--muted);
    font-size: var(--font-xs);
  }

  .post-text {
    margin: 0;
    font-size: var(--font-base);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    color: var(--muted);
    font-size: var(--font-sm);
  }

  .stats span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  .post-images {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    margin-top: 4px;
  }
  .post-image-btn {
    display: block;
    width: 100%;
    aspect-ratio: 1 / 1;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--panel-soft);
    overflow: hidden;
    cursor: zoom-in;
  }
  .post-image-btn img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .post-media-fallback {
    margin-top: 4px;
  }

  /* Lightbox */
  .lightbox {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  .lightbox-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .lightbox img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    cursor: default;
  }
</style>
