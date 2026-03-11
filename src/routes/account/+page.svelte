<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "../../components/Icon.svelte";
  import {
    getProfileForAccount,
    getStoredAccounts,
    hasSession,
    login,
    removeStoredAccount,
    type StoredAccount,
  } from "../../lib/script/bsky";
  import { isLoading, message } from "../../stores/MassDriver";

  let isLoaded = $state(false);
  let accounts: StoredAccount[] = $state([]);
  let accountAvatars: Record<string, string | null> = $state({});
  let username = $state("");
  let password = $state("");
  let errorMessage = $state("");

  async function loadAccounts() {
    accounts = getStoredAccounts();
    const entries = await Promise.all(
      accounts.map(async (account) => {
        const profile = await getProfileForAccount(account.id);
        return [account.id, profile?.avatar ?? null] as const;
      }),
    );
    accountAvatars = Object.fromEntries(entries);
  }

  onMount(async () => {
    const ok = await hasSession();
    if (!ok) return;
    await loadAccounts();
    isLoaded = true;
  });

  async function handleLogin() {
    if (!username.trim() || !password.trim()) return;
    try {
      $isLoading = true;
      errorMessage = "";
      await login(username, password);
      username = "";
      password = "";
      $message = "ログインしました";
      await loadAccounts();
    } catch (error: any) {
      errorMessage = String(error);
    } finally {
      $isLoading = false;
    }
  }

  async function deleteAccount(accountId: string) {
    const ok = window.confirm("このアカウントを削除しますか？");
    if (!ok) return;
    removeStoredAccount(accountId);
    await loadAccounts();
    $message = "アカウントを削除しました";
  }
</script>

{#if isLoaded}
  <div class="page-intro">
    <h2>アカウント</h2>
  </div>

  {#if accounts.length > 0}
    <div class="section-title">登録済み</div>
    <div class="account-list">
      {#each accounts as account (account.id)}
        <div class="existing-account-item">
          {#if accountAvatars[account.id]}
            <img src={accountAvatars[account.id] ?? ""} alt={account.handle} class="account-avatar-img" />
          {:else}
            <div class="account-avatar-fallback">
              {account.handle.slice(0, 1).toUpperCase()}
            </div>
          {/if}
          <div class="existing-account-info">
            <div class="existing-account-handle">@{account.handle}</div>
            <div class="existing-account-status">保存済み</div>
          </div>
          <div class="account-actions">
            <button class="btn btn-ghost btn-sm btn-icon-only" onclick={() => deleteAccount(account.id)} aria-label="アカウント削除">
              <Icon name="trash" size={16} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="section-title" style="margin-top: 24px">アカウント追加</div>
  <div class="card" style="margin-top: 6px">
    <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
      <div class="form-group">
        <label for="handle">ハンドルまたは DID</label>
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
      </div>
      {#if errorMessage}
        <p class="error-msg">{errorMessage}</p>
      {/if}
      <div class="login-actions">
        <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noreferrer" class="help-link">
          <Icon name="help" size={14} /> アプリパスワードとは？
        </a>
        <button type="submit" class="btn btn-primary">ログイン</button>
      </div>
    </form>
  </div>
{/if}

<style>
  .page-intro {
    margin: 0 0 8px;
  }
  .page-intro h2 {
    margin: 0;
    font-size: var(--font-xl);
  }

  .account-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .existing-account-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    transition: all 0.15s;
  }
  .existing-account-item:hover {
    border-color: var(--border-light);
    background: var(--panel-soft);
  }

  .account-avatar-img {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    object-fit: cover;
    flex-shrink: 0;
  }
  .account-avatar-fallback {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    border: 2px solid var(--border-light);
    background: var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-sm);
    font-weight: 700;
    color: var(--muted);
    flex-shrink: 0;
  }

  .existing-account-info {
    flex: 1;
    min-width: 0;
  }
  .existing-account-handle {
    font-size: var(--font-base);
    font-weight: 500;
    word-break: break-all;
  }
  .existing-account-status {
    font-size: var(--font-sm);
    color: var(--muted);
  }

  .account-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
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

  .help-link {
    color: var(--muted);
    font-size: var(--font-sm);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .help-link:hover {
    color: var(--primary);
  }
</style>
