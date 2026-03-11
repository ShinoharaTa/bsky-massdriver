<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import AccountFilterBar from "../../components/AccountFilterBar.svelte";
  import Icon from "../../components/Icon.svelte";
  import NotificationGroupItem from "../../components/NotificationGroupItem.svelte";
  import NotificationListItem from "../../components/NotificationListItem.svelte";
  import {
    getActiveAccountId,
    getNotificationsForAccounts,
    getProfileForAccount,
    getStoredAccounts,
    hasSession,
    setActiveAccount,
    type AccountNotification,
    type AccountNotificationReason,
    type AccountRequestError,
    type StoredAccount,
    type TimelineCursorByAccount,
  } from "../../lib/script/bsky";
  import { isLoading } from "../../stores/MassDriver";

  const reasonOptions: { key: AccountNotificationReason; label: string }[] = [
    { key: "reply", label: "リプ" },
    { key: "mention", label: "メンション" },
    { key: "repost", label: "リポスト" },
    { key: "like", label: "リアクション" },
    { key: "quote", label: "引用" },
    { key: "follow", label: "フォロー" },
  ];
  const NOTIFICATIONS_PAGE_SIZE = 100;
  const groupableReasons = new Set<AccountNotificationReason>(["like", "repost", "quote"]);

  type NotificationFeedEntry =
    | {
        type: "single";
        id: string;
        item: AccountNotification;
      }
    | {
        type: "group";
        id: string;
        accountHandle: string;
        reason: AccountNotificationReason;
        indexedAt: string;
        isRead: boolean;
        items: AccountNotification[];
        subjectText: string;
      };

  let isLoaded = false;
  let isLoadingMore = false;
  let accounts: StoredAccount[] = [];
  let accountAvatars: Record<string, string | null> = {};
  let selectedAccountIds: string[] = [];
  let selectedReasons: AccountNotificationReason[] = ["reply", "mention", "repost", "like"];
  let notifications: AccountNotification[] = [];
  let cursorByAccount: TimelineCursorByAccount = {};
  let errors: AccountRequestError[] = [];

  function mergeNotifications(
    current: AccountNotification[],
    incoming: AccountNotification[]
  ): AccountNotification[] {
    const merged: Record<string, AccountNotification> = {};
    for (const item of current) merged[item.id] = item;
    for (const item of incoming) merged[item.id] = item;
    return Object.values(merged).sort(
      (left, right) => new Date(right.indexedAt).getTime() - new Date(left.indexedAt).getTime()
    );
  }

  function loadAccounts() {
    accounts = getStoredAccounts();
    const persisted = JSON.parse(localStorage.getItem("notifications.selectedAccounts") ?? "[]") as string[];
    const valid = persisted.filter((id) => accounts.some((account) => account.id === id));
    selectedAccountIds = valid.length > 0 ? valid : accounts.map((account) => account.id);
    localStorage.setItem("notifications.selectedAccounts", JSON.stringify(selectedAccountIds));
  }

  async function loadAccountAvatars() {
    const entries = await Promise.all(
      accounts.map(async (account) => {
        const profile = await getProfileForAccount(account.id);
        return [account.id, profile?.avatar ?? null] as const;
      })
    );
    accountAvatars = Object.fromEntries(entries);
  }

  async function switchActiveAccount(accountId: string) {
    setActiveAccount(accountId);
    await hasSession();
  }

  function goToAddAccount() {
    goto("/login");
  }

  function toggleAccount(accountId: string) {
    if (selectedAccountIds.includes(accountId)) {
      selectedAccountIds = selectedAccountIds.filter((id) => id !== accountId);
    } else {
      selectedAccountIds = [...selectedAccountIds, accountId];
    }
    localStorage.setItem("notifications.selectedAccounts", JSON.stringify(selectedAccountIds));
  }

  function toggleReason(reason: AccountNotificationReason) {
    if (selectedReasons.includes(reason)) {
      selectedReasons = selectedReasons.filter((item) => item !== reason);
    } else {
      selectedReasons = [...selectedReasons, reason];
    }
  }

  async function loadInitial() {
    $isLoading = true;
    try {
      const result = await getNotificationsForAccounts(
        accounts.map((account) => account.id),
        {},
        NOTIFICATIONS_PAGE_SIZE
      );
      notifications = result.items;
      cursorByAccount = result.cursorByAccount;
      errors = result.errors;
    } finally {
      $isLoading = false;
    }
  }

  async function loadMore() {
    if (isLoadingMore || !hasMore) return;
    isLoadingMore = true;
    try {
      const result = await getNotificationsForAccounts(
        accounts.map((account) => account.id),
        cursorByAccount,
        NOTIFICATIONS_PAGE_SIZE
      );
      notifications = mergeNotifications(notifications, result.items);
      cursorByAccount = { ...cursorByAccount, ...result.cursorByAccount };
      errors = result.errors;
    } finally {
      isLoadingMore = false;
    }
  }

  onMount(async () => {
    const ok = await hasSession();
    if (!ok) return;
    loadAccounts();
    await loadAccountAvatars();
    await loadInitial();
    isLoaded = true;
  });

  $: filteredNotifications = notifications.filter((item) => {
    const matchesAccount =
      selectedAccountIds.length === 0 || selectedAccountIds.includes(item.accountId);
    const matchesReason =
      selectedReasons.length === 0 || selectedReasons.includes(item.reason);
    return matchesAccount && matchesReason;
  });

  function buildNotificationFeed(items: AccountNotification[]): NotificationFeedEntry[] {
    const grouped = new Map<string, AccountNotification[]>();

    for (const item of items) {
      if (!item.postUri || !groupableReasons.has(item.reason)) continue;
      const key = `${item.accountId}:${item.reason}:${item.postUri}`;
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }

    const emitted = new Set<string>();
    const entries: NotificationFeedEntry[] = [];

    for (const item of items) {
      if (!item.postUri || !groupableReasons.has(item.reason)) {
        entries.push({ type: "single", id: item.id, item });
        continue;
      }

      const key = `${item.accountId}:${item.reason}:${item.postUri}`;
      const groupItems = grouped.get(key) ?? [item];

      if (groupItems.length === 1) {
        entries.push({ type: "single", id: item.id, item });
        continue;
      }

      if (emitted.has(key)) continue;
      emitted.add(key);

      entries.push({
        type: "group",
        id: key,
        accountHandle: item.accountHandle,
        reason: item.reason,
        indexedAt: groupItems[0]?.indexedAt ?? item.indexedAt,
        isRead: groupItems.every((groupItem) => groupItem.isRead),
        items: groupItems,
        subjectText: groupItems.find((groupItem) => groupItem.subjectText)?.subjectText ?? "",
      });
    }

    return entries;
  }

  $: hasMore = Object.values(cursorByAccount).some((cursor) => typeof cursor === "string" && cursor.length > 0);
  $: notificationFeed = buildNotificationFeed(filteredNotifications);
</script>

{#if isLoaded}
  <section class="page-intro">
    <h2>通知</h2>
  </section>

  <AccountFilterBar
    {accounts}
    {selectedAccountIds}
    toggleAccount={toggleAccount}
    label="対象アカウント"
  />

    <div class="section-title">
      <span>Notification Types</span>
      <span class="badge">{notificationFeed.length}</span>
  </div>
  <div class="reason-filter-bar">
    {#each reasonOptions as option (option.key)}
      <button
        class="reason-chip"
        class:selected={selectedReasons.includes(option.key)}
        onclick={() => toggleReason(option.key)}
      >
        {option.label}
      </button>
    {/each}
  </div>

  {#if errors.length > 0}
    <section class="card error-panel">
      <div class="section-title"><span>取得エラー</span></div>
      {#each errors as error (`${error.accountId}:${error.error}`)}
        <p>@{error.handle}: {error.error}</p>
      {/each}
    </section>
  {/if}

  {#if notificationFeed.length > 0}
    <div class="notif-list">
      {#each notificationFeed as entry (entry.id)}
        {#if entry.type === "group"}
          <NotificationGroupItem
            items={entry.items}
            reason={entry.reason}
            accountHandle={entry.accountHandle}
            indexedAt={entry.indexedAt}
            isRead={entry.isRead}
            subjectText={entry.subjectText}
          />
        {:else}
          <NotificationListItem item={entry.item} />
        {/if}
      {/each}
    </div>
  {:else}
    <section class="card empty-state">
      <h3>表示できる通知がありません</h3>
      <p>アカウント絞り込みか通知種別を変更するか、あとでもう一度読み込んでください。</p>
    </section>
  {/if}

  {#if hasMore}
    <div class="load-more">
      <button class="btn btn-outline" onclick={loadMore} disabled={isLoadingMore}>
        {isLoadingMore ? "読み込み中..." : "もっと見る"} <Icon name="chevron-down" size={16} />
      </button>
    </div>
  {/if}
{/if}

<style>
  .page-intro {
    margin: 8px 0 2px;
  }

  .page-intro h2 {
    margin: 0;
    font-size: 22px;
  }

  .reason-filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .reason-chip {
    border: 1px solid var(--border);
    background: var(--panel-soft);
    color: var(--muted);
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
  }

  .reason-chip.selected {
    background: color-mix(in srgb, var(--primary) 18%, var(--panel) 82%);
    border-color: var(--primary);
    color: var(--text);
  }

  .empty-state,
  .error-panel {
    margin-top: 8px;
  }

  .empty-state h3 {
    margin: 0 0 4px;
    font-size: 16px;
  }

  .empty-state p,
  .error-panel p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  .error-panel {
    display: grid;
    gap: 6px;
  }

  .load-more {
    display: flex;
    justify-content: center;
    margin: 12px 0 4px;
  }
</style>
