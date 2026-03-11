<script lang="ts">
  import type { AccountNotification } from "../lib/script/bsky";
  import Icon from "./Icon.svelte";

  let { item }: { item: AccountNotification } = $props();

  const iconMap: Record<AccountNotification["reason"], string> = {
    reply: "reply",
    mention: "at-sign",
    repost: "repeat",
    like: "star",
    quote: "message",
    follow: "user",
    unknown: "bell",
  };

  const actionMap: Record<AccountNotification["reason"], string> = {
    reply: "がリプライ",
    mention: "がメンション",
    repost: "がリポスト",
    like: "がリアクション",
    quote: "が引用",
    follow: "がフォロー",
    unknown: "",
  };

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function shouldShowSubjectPreview(item: AccountNotification) {
    return item.subjectText.length > 0 && item.subjectText !== item.previewText;
  }
</script>

<div class="notif-item" class:unread={!item.isRead}>
  <div class="notif-badge notif-badge-{item.reason}">
    <Icon name={iconMap[item.reason]} size={16} />
  </div>
  <div class="notif-body">
    <div class="notif-actors">
      {#if item.authorAvatar}
        <img src={item.authorAvatar} alt={item.authorHandle} class="notif-avatar" />
      {:else}
        <div class="notif-avatar-fallback">{(item.authorHandle || "?").slice(0, 1).toUpperCase()}</div>
      {/if}
      <span>
        <span class="notif-actor-name">{item.authorDisplayName || item.authorHandle || "Unknown"}</span>
        <span class="notif-action">さん{actionMap[item.reason]}</span>
      </span>
      <span class="notif-meta">@{item.accountHandle} · {formatDate(item.indexedAt)}</span>
    </div>
    {#if item.previewText}
      <div class="notif-preview">{item.previewText}</div>
    {/if}
    {#if shouldShowSubjectPreview(item)}
      <div class="notif-subject">
        <div class="notif-subject-label">元の投稿</div>
        <div class="notif-preview">{item.subjectText}</div>
      </div>
    {:else if !item.previewText && item.subjectText}
      <div class="notif-preview">{item.subjectText}</div>
    {/if}
  </div>
</div>

<style>
  .notif-avatar {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .notif-avatar-fallback {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: #e2e8f0;
    border: 2px solid var(--border-light);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--muted);
    flex-shrink: 0;
  }

  .notif-subject {
    margin-top: 6px;
  }

  .notif-subject-label {
    margin: 0 0 4px;
    font-size: 11px;
    color: var(--muted);
  }
</style>
