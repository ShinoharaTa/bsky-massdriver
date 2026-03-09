<script lang="ts">
  import type { AccountNotification } from "../lib/script/bsky";

  let { item }: { item: AccountNotification } = $props();

  const labelMap: Record<AccountNotification["reason"], string> = {
    reply: "リプ",
    mention: "メンション",
    repost: "リポスト",
    like: "リアクション",
    quote: "引用",
    follow: "フォロー",
    unknown: "その他",
  };

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }
</script>

<article class="card notification-item" class:unread={!item.isRead}>
  <div class="notification-top">
    <div class="meta-left">
      <span class="notification-type">{labelMap[item.reason]}</span>
      <span class="notification-account">@{item.accountHandle}</span>
    </div>
    <time class="notification-time" datetime={item.indexedAt}>{formatDate(item.indexedAt)}</time>
  </div>

  <div class="notification-body">
    {#if item.authorAvatar}
      <img src={item.authorAvatar} alt={item.authorHandle} class="author-avatar" />
    {:else}
      <div class="author-avatar fallback">{item.authorHandle.slice(0, 1).toUpperCase() || "?"}</div>
    {/if}

    <div class="content">
      <div class="author-line">
        <strong>{item.authorDisplayName || item.authorHandle || "Unknown user"}</strong>
        {#if item.authorHandle}
          <span>@{item.authorHandle}</span>
        {/if}
      </div>
      <p>{item.previewText || "本文の取得ができない通知です。"}</p>
    </div>
  </div>
</article>

<style>
  .notification-item {
    display: grid;
    gap: 10px;
  }

  .notification-item.unread {
    border-color: color-mix(in srgb, var(--primary) 65%, var(--border) 35%);
  }

  .notification-top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
  }

  .meta-left {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .notification-type {
    font-size: 11px;
    font-weight: 700;
    color: #0b1220;
    background: var(--primary);
    border-radius: 999px;
    padding: 2px 8px;
  }

  .notification-account,
  .notification-time,
  .author-line span {
    color: var(--muted);
    font-size: 12px;
  }

  .notification-body {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 10px;
  }

  .author-avatar {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    object-fit: cover;
    background: var(--panel-soft);
  }

  .author-avatar.fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-weight: 700;
  }

  .content {
    min-width: 0;
  }

  .author-line {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: baseline;
    margin-bottom: 4px;
  }

  .content p {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 13px;
  }
</style>
