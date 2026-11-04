<script lang="ts">
  import type { AccountNotification, AccountNotificationReason } from "../lib/script/bsky";
  import Icon from "./Icon.svelte";
  import { dateLocale, locale, t, type MessageKey } from "../lib/i18n";

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

  const countKeyMap: Record<AccountNotificationReason, MessageKey> = {
    reply: "notification.group.reply",
    mention: "notification.group.mention",
    repost: "notification.group.repost",
    like: "notification.group.like",
    quote: "notification.group.quote",
    follow: "notification.group.follow",
    unknown: "notification.group.unknown",
  };

  // Rebuilt when $locale changes
  const dateFormatter = $derived(
    new Intl.DateTimeFormat(dateLocale($locale), {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  function formatDate(value: string) {
    return dateFormatter.format(new Date(value));
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
        <span class="notif-action">{$t(countKeyMap[reason], { count: items.length })}</span>
        <span class="notif-meta">@{accountHandle} · {formatDate(indexedAt)}</span>
      </div>
      <button
        class="btn btn-ghost btn-sm btn-icon-only notif-expand"
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? $t("notification.collapse") : $t("notification.expand")}
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
