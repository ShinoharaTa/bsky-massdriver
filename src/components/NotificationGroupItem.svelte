<script lang="ts">
  import type { AccountNotification, AccountNotificationReason } from "../lib/script/bsky";
  import Icon from "./Icon.svelte";

  let {
    items,
    reason,
    accountHandle,
    indexedAt,
    isRead,
    subjectText = "",
  }: {
    items: AccountNotification[];
    reason: AccountNotificationReason;
    accountHandle: string;
    indexedAt: string;
    isRead: boolean;
    subjectText?: string;
  } = $props();

  let isExpanded = $state(false);

  const iconMap: Record<AccountNotificationReason, string> = {
    reply: "reply",
    mention: "at-sign",
    repost: "repeat",
    like: "star",
    quote: "message",
    follow: "user",
    unknown: "bell",
  };

  const labelMap: Record<AccountNotificationReason, string> = {
    reply: "リプライ",
    mention: "メンション",
    repost: "リポスト",
    like: "リアクション",
    quote: "引用",
    follow: "フォロー",
    unknown: "通知",
  };

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function detailPreview(item: AccountNotification) {
    if (!item.previewText) return "";
    if (item.previewText === item.subjectText) return "";
    return item.previewText;
  }
</script>

<div class="notif-item notif-group-item" class:unread={!isRead}>
  <div class="notif-badge notif-badge-{reason}">
    <Icon name={iconMap[reason]} size={16} />
  </div>
  <div class="notif-body">
    <div class="notif-group-header">
      <div class="notif-actors">
        <div class="notif-avatars" aria-hidden="true">
          {#each items.slice(0, 5) as item (item.id)}
            {#if item.authorAvatar}
              <img src={item.authorAvatar} alt="" class="notif-avatar-stack" />
            {:else}
              <div class="notif-avatar-fallback notif-avatar-stack">
                {(item.authorHandle || "?").slice(0, 1).toUpperCase()}
              </div>
            {/if}
          {/each}
        </div>
        <span class="notif-action">{items.length}件の{labelMap[reason]}</span>
        <span class="notif-meta">@{accountHandle} · {formatDate(indexedAt)}</span>
      </div>
      <button
        class="btn btn-ghost btn-sm btn-icon-only notif-expand"
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "一覧を閉じる" : "一覧を展開する"}
        onclick={() => (isExpanded = !isExpanded)}
      >
        <Icon name="chevron-down" size={16} class={isExpanded ? "expanded" : ""} />
      </button>
    </div>

    {#if subjectText}
      <div class="notif-preview">{subjectText}</div>
    {/if}

    {#if isExpanded}
      <div class="notif-group-list">
        {#each items as item (item.id)}
          <div class="notif-group-row">
            {#if item.authorAvatar}
              <img src={item.authorAvatar} alt={item.authorHandle} class="notif-avatar" />
            {:else}
              <div class="notif-avatar-fallback">
                {(item.authorHandle || "?").slice(0, 1).toUpperCase()}
              </div>
            {/if}
            <div class="notif-group-copy">
              <div class="notif-group-line">
                <span class="notif-actor-name">{item.authorDisplayName || item.authorHandle || "Unknown"}</span>
                <span class="notif-meta">{formatDate(item.indexedAt)}</span>
              </div>
              {#if detailPreview(item)}
                <div class="notif-group-detail">{detailPreview(item)}</div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .notif-group-item {
    align-items: flex-start;
  }

  .notif-group-header {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .notif-group-header .notif-actors {
    flex: 1;
    min-width: 0;
  }

  .notif-avatars {
    display: flex;
    align-items: center;
    margin-right: 2px;
    flex-shrink: 0;
  }

  .notif-avatar-stack {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    object-fit: cover;
    border: 2px solid var(--panel);
    margin-left: -6px;
    background: var(--border);
  }

  .notif-avatar-stack:first-child {
    margin-left: 0;
  }

  .notif-avatar {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    object-fit: cover;
    flex-shrink: 0;
  }

  .notif-avatar-fallback {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--border);
    border: 2px solid var(--border-light);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-2xs);
    font-weight: 700;
    color: var(--muted);
    flex-shrink: 0;
  }

  .notif-expand {
    color: var(--muted);
    flex-shrink: 0;
  }

  .notif-expand:hover {
    color: var(--text);
    background: var(--panel-soft);
  }

  .expanded {
    transform: rotate(180deg);
    transition: transform 0.15s ease;
  }

  .notif-group-list {
    margin-top: 8px;
    border-top: 1px solid var(--border);
    padding-top: 8px;
    display: grid;
    gap: 8px;
  }

  .notif-group-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .notif-group-copy {
    min-width: 0;
    flex: 1;
  }

  .notif-group-line {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
  }

  .notif-group-line .notif-meta {
    margin-left: auto;
  }

  .notif-group-detail {
    margin-top: 2px;
    font-size: var(--font-sm);
    color: var(--muted);
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.45;
  }

  @media (max-width: 767px) {
    .notif-group-header {
      align-items: center;
    }

    .notif-group-line {
      flex-wrap: wrap;
    }

    .notif-group-line .notif-meta {
      margin-left: 0;
      width: 100%;
    }
  }
</style>
