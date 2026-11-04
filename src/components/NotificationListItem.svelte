<script lang="ts">
  import type { AccountNotification } from "../lib/script/bsky";
  import Icon from "./Icon.svelte";
  import { dateLocale, locale, t, type MessageKey } from "../lib/i18n";

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

  const actionKeyMap: Record<AccountNotification["reason"], MessageKey> = {
    reply: "notification.action.reply",
    mention: "notification.action.mention",
    repost: "notification.action.repost",
    like: "notification.action.like",
    quote: "notification.action.quote",
    follow: "notification.action.follow",
    unknown: "notification.action.unknown",
  };

  // Word order differs by language, so render the name element at the {name} position
  const actionParts = $derived($t(actionKeyMap[item.reason]).split("{name}"));

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
        {#if actionParts[0]}<span class="notif-action">{actionParts[0]}</span>{/if}<span class="notif-actor-name">{item.authorDisplayName || item.authorHandle || "Unknown"}</span>{#if actionParts[1]}<span class="notif-action">{actionParts[1]}</span>{/if}
      </span>
      <span class="notif-meta">@{item.accountHandle} · {formatDate(item.indexedAt)}</span>
    </div>
    {#if item.previewText}
      <div class="notif-preview">{item.previewText}</div>
    {/if}
    {#if shouldShowSubjectPreview(item)}
      <div class="notif-subject">
        <div class="notif-subject-label">{$t("notification.originalPost")}</div>
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
