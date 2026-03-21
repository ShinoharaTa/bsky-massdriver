<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Icon from "../../components/Icon.svelte";
  import {
    getProfileForAccount,
    getStoredAccounts,
    login,
    removeStoredAccount,
    type StoredAccount,
  } from "../../lib/script/bsky";
  import { isLoading } from "../../stores/MassDriver";

  let username = "";
  let password = "";
  let errorMessage = "";
  let accounts: StoredAccount[] = [];
  let accountAvatars: Record<string, string | null> = {};

  onMount(async () => {
    await loadAccounts();
  });

  async function loadAccounts() {
    accounts = getStoredAccounts();
    const entries = await Promise.all(
      accounts.map(async (account) => {
        const profile = await getProfileForAccount(account.id);
        return [account.id, profile?.avatar ?? null] as const;
      })
    );
    accountAvatars = Object.fromEntries(entries);
  }

  async function handleLogin(): Promise<void> {
    try {
      $isLoading = true;
      errorMessage = "";
      await login(username, password);
      $isLoading = false;
      goto("/");
    } catch (error: any) {
      $isLoading = false;
      errorMessage = String(error);
    }
  }

  async function deleteAccount(accountId: string) {
    removeStoredAccount(accountId);
    await loadAccounts();
  }
</script>

<div class="login-wrapper">
  <div class="brand-center">
    <img src="/massdriver-icon.svg" alt="Mass Driver" width="44" height="44" />
    <h1>Mass Driver</h1>
  </div>
  <p class="tagline">
    Bluesky に、もっとスムーズに投稿する。<br />
    投稿専用のクイックポストツール。
  </p>

  {#if accounts.length > 0}
    <section class="card saved-accounts">
      <div class="saved-title">保存済みアカウント</div>
      {#each accounts as account (account.id)}
        <div class="saved-item">
          <a href="/" class="saved-meta">
            <div class="saved-avatar">
              {#if accountAvatars[account.id]}
                <img src={accountAvatars[account.id] ?? ""} alt={account.handle} class="saved-avatar-image" />
              {:else}
                <span>{account.handle.slice(0, 1).toUpperCase()}</span>
              {/if}
            </div>
            <div class="saved-copy">
              <div class="saved-handle">@{account.handle}</div>
              <div class="saved-status">ログイン済み</div>
            </div>
          </a>
          <div class="saved-actions">
            <button class="btn btn-ghost btn-sm btn-icon-only" onclick={() => deleteAccount(account.id)} aria-label="削除">
              <Icon name="trash" size={14} />
            </button>
          </div>
        </div>
      {/each}
      <a href="/" class="btn btn-primary btn-block">投稿画面へ</a>
    </section>
  {/if}

  <section class="card login-card">
    <div class="login-card-title">アカウント追加</div>
    <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
      <div class="form-group">
        <label for="handle">ハンドル</label>
        <input
          class="form-input"
          id="handle"
          type="text"
          bind:value={username}
          placeholder="you.bsky.social"
          required
        />
      </div>
      <div class="form-group">
        <label for="password">アプリパスワード</label>
        <input
          class="form-input"
          id="password"
          type="password"
          bind:value={password}
          placeholder="xxxx-xxxx-xxxx-xxxx"
          required
        />
        <p class="form-hint">
          通常のパスワードではありません。
          <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noreferrer">Bluesky の設定画面</a>
          で発行してください。
        </p>
      </div>
      {#if errorMessage}
        <p class="error-msg">{errorMessage}</p>
      {/if}
      <div class="login-actions">
        <div class="login-links">
          <a href="https://bsky.app" target="_blank" rel="noreferrer">アカウント作成</a>
          <a href="/information">使い方</a>
        </div>
        <button type="submit" class="btn btn-primary">ログイン</button>
      </div>
    </form>
  </section>
</div>

<style>
  .login-wrapper {
    max-width: 400px;
    margin: 60px auto 0;
  }
  .brand-center {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .brand-center h1 {
    font-size: var(--font-2xl);
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0;
  }
  .tagline {
    margin-top: 16px;
    font-size: var(--font-base);
    color: var(--muted);
    line-height: 1.7;
    text-align: center;
  }
  .login-card {
    margin-top: 16px;
  }
  .login-card-title {
    font-size: var(--font-xs);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .saved-accounts {
    margin-top: 18px;
  }
  .saved-title {
    font-size: var(--font-xs);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .saved-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-top: 1px solid var(--border);
  }
  .saved-item:first-of-type {
    border-top: none;
    padding-top: 0;
  }
  .saved-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    text-decoration: none;
    color: inherit;
  }
  .saved-meta:hover .saved-handle {
    color: var(--primary);
  }
  .saved-handle {
    font-size: var(--font-base);
    color: var(--text);
    min-width: 0;
    word-break: break-all;
    font-weight: 600;
    transition: color 0.15s;
  }
  .saved-avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    border: 2px solid var(--border-light);
    background: var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-size: var(--font-sm);
    font-weight: 700;
    overflow: hidden;
    flex-shrink: 0;
  }
  .saved-avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .saved-copy {
    min-width: 0;
  }
  .saved-status {
    font-size: var(--font-sm);
    color: var(--success);
  }
  .saved-actions {
    display: inline-flex;
    gap: 6px;
    flex-shrink: 0;
  }
  :global(.btn-block) {
    display: block;
    width: 100%;
    text-align: center;
    margin-top: 12px;
  }
  .form-group {
    margin-top: 14px;
  }
  .form-group:first-child {
    margin-top: 0;
  }
  .form-group label {
    display: block;
    font-size: var(--font-xs);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .form-hint {
    margin-top: 6px;
    font-size: var(--font-xs);
    color: var(--muted);
    line-height: 1.5;
  }
  .form-hint a {
    color: var(--primary);
    text-decoration: none;
  }
  .form-hint a:hover {
    text-decoration: underline;
  }
  .error-msg {
    margin-top: 10px;
    font-size: var(--font-sm);
    color: var(--danger);
  }
  .login-actions {
    margin-top: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .login-links {
    display: flex;
    gap: 12px;
  }
  .login-links a {
    color: var(--muted);
    font-size: var(--font-sm);
    text-decoration: none;
  }
  .login-links a:hover {
    color: var(--primary);
  }
</style>
