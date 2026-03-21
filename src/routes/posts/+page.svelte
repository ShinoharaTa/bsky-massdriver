<script lang="ts">
  import { onMount } from "svelte";
  import AccountFilterBar from "../../components/AccountFilterBar.svelte";
  import PostListItem from "../../components/PostListItem.svelte";
  import Icon from "../../components/Icon.svelte";
  import {
    deleteManagedPost,
    getManagedPostsForAccounts,
    getStoredAccounts,
    hasSession,
    type AccountRequestError,
    type ManagedPost,
    type StoredAccount,
    type TimelineCursorByAccount,
  } from "../../lib/script/bsky";
  import { isLoading, setMessage } from "../../stores/MassDriver";

  let isLoaded = false;
  let isLoadingMore = false;
  let accounts: StoredAccount[] = [];
  let selectedAccountIds: string[] = [];
  let posts: ManagedPost[] = [];
  let cursorByAccount: TimelineCursorByAccount = {};
  let errors: AccountRequestError[] = [];
  let deletingPostIds: string[] = [];

  function mergePosts(current: ManagedPost[], incoming: ManagedPost[]): ManagedPost[] {
    const merged: Record<string, ManagedPost> = {};
    for (const item of current) merged[item.id] = item;
    for (const item of incoming) merged[item.id] = item;
    return Object.values(merged).sort(
      (left, right) => new Date(right.indexedAt).getTime() - new Date(left.indexedAt).getTime()
    );
  }

  function loadAccounts() {
    accounts = getStoredAccounts();
    const persisted = JSON.parse(localStorage.getItem("posts.selectedAccounts") ?? "[]") as string[];
    const valid = persisted.filter((id) => accounts.some((account) => account.id === id));
    selectedAccountIds = valid.length > 0 ? valid : accounts.map((account) => account.id);
    localStorage.setItem("posts.selectedAccounts", JSON.stringify(selectedAccountIds));
  }

  function toggleAccount(accountId: string) {
    if (selectedAccountIds.includes(accountId)) {
      selectedAccountIds = selectedAccountIds.filter((id) => id !== accountId);
    } else {
      selectedAccountIds = [...selectedAccountIds, accountId];
    }
    localStorage.setItem("posts.selectedAccounts", JSON.stringify(selectedAccountIds));
  }

  async function loadInitial() {
    $isLoading = true;
    try {
      const result = await getManagedPostsForAccounts(accounts.map((account) => account.id));
      posts = result.items;
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
      const result = await getManagedPostsForAccounts(
        accounts.map((account) => account.id),
        cursorByAccount
      );
      posts = mergePosts(posts, result.items);
      cursorByAccount = { ...cursorByAccount, ...result.cursorByAccount };
      errors = result.errors;
    } finally {
      isLoadingMore = false;
    }
  }

  async function handleDelete(item: ManagedPost) {
    const ok = window.confirm("この投稿を削除しますか？");
    if (!ok) return;

    deletingPostIds = [...deletingPostIds, item.id];
    try {
      await deleteManagedPost(item.accountId, item.uri);
      posts = posts.filter((post) => post.id !== item.id);
      setMessage("投稿を削除しました。", "success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "削除に失敗しました。", "error");
    } finally {
      deletingPostIds = deletingPostIds.filter((id) => id !== item.id);
    }
  }

  onMount(async () => {
    const ok = await hasSession();
    if (!ok) return;
    loadAccounts();
    await loadInitial();
    isLoaded = true;
  });

  $: filteredPosts = posts.filter(
    (item) => selectedAccountIds.length === 0 || selectedAccountIds.includes(item.accountId)
  );
  $: hasMore = Object.values(cursorByAccount).some((cursor) => typeof cursor === "string" && cursor.length > 0);
</script>

{#if isLoaded}
  <section class="page-intro">
    <h2>投稿管理</h2>
  </section>

  <AccountFilterBar
    {accounts}
    {selectedAccountIds}
    toggleAccount={toggleAccount}
    label="表示アカウント"
  />

  {#if errors.length > 0}
    <section class="card error-panel">
      <div class="section-title"><span>取得エラー</span></div>
      {#each errors as error (`${error.accountId}:${error.error}`)}
        <p>@{error.handle}: {error.error}</p>
      {/each}
    </section>
  {/if}

  {#if filteredPosts.length > 0}
    <section class="list-section">
      {#each filteredPosts as item (item.id)}
        <PostListItem {item} isDeleting={deletingPostIds.includes(item.id)} onDelete={handleDelete} />
      {/each}
    </section>
  {:else}
    <section class="card empty-state">
      <h3>表示できる投稿がありません</h3>
      <p>対象アカウントを切り替えるか、Bluesky 側で投稿を作成したあとに再度確認してください。</p>
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
    font-size: var(--font-xl);
  }


  .list-section {
    display: grid;
    gap: 8px;
    margin-top: 8px;
  }

  .empty-state,
  .error-panel {
    margin-top: 8px;
  }

  .empty-state h3 {
    margin: 0 0 4px;
    font-size: var(--font-lg);
  }

  .empty-state p,
  .error-panel p {
    margin: 0;
    color: var(--muted);
    font-size: var(--font-sm);
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
