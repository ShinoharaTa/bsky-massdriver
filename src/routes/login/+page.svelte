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
  import { addAccount, type NostrStoredAccount } from "../../lib/script/accounts";
  import { deriveNostrKeys } from "../../lib/script/nostr";
  import { isLoading } from "../../stores/MassDriver";

  let username = "";
  let password = "";
  let errorMessage = "";
  let accounts: StoredAccount[] = [];
  let accountAvatars: Record<string, string | null> = {};

  let nostrNsec = "";
  let nostrError = "";

  type LoginMode = "bluesky" | "nostr";
  let loginMode: LoginMode = "bluesky";

  onMount(async () => {
    await loadAccounts();
  });

  async function loadAccounts() {
    accounts = getStoredAccounts();
    const entries = await Promise.all(
      accounts
        .filter((a) => a.platform === "bluesky")
        .map(async (account) => {
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

  function handleNostrLogin() {
    try {
      nostrError = "";
      if (!nostrNsec.trim()) {
        nostrError = "nsec を入力してください。";
        return;
      }

      const { pubkey, npub } = deriveNostrKeys(nostrNsec.trim());
      const handle = `${npub.slice(0, 10)}...${npub.slice(-6)}`;

      const newAccount: NostrStoredAccount = {
        id: pubkey,
        handle,
        platform: "nostr",
        nsec: nostrNsec.trim(),
        pubkey,
      };

      addAccount(newAccount);
      goto("/");
    } catch (error: any) {
      nostrError = String(error);
    }
  }

  async function deleteAccount(accountId: string) {
    removeStoredAccount(accountId);
    await loadAccounts();
  }

  function platformLabel(account: StoredAccount): string {
    return account.platform === "nostr" ? "Nostr" : "Bluesky";
  }
</script>

<div class="login-wrapper">
  <div class="brand-center">
    <img src="/massdriver-icon.svg" alt="Mass Driver" width="44" height="44" />
    <h1>Mass Driver</h1>
  </div>
  <p class="tagline">
    Bluesky / Nostr にマルチポスト。<br />
    投稿専用のクイックポストツール。
  </p>

  {#if accounts.length > 0}
    <section class="card saved-accounts">
      <div class="saved-title">保存済みアカウント</div>
      {#each accounts as account (account.id)}
        <div class="saved-item">
          <a href="/" class="saved-meta">
            <div class="saved-avatar" class:nostr-avatar={account.platform === "nostr"}>
              {#if account.platform === "bluesky" && accountAvatars[account.id]}
                <img src={accountAvatars[account.id] ?? ""} alt={account.handle} class="saved-avatar-image" />
              {:else}
                <span>{account.platform === "nostr" ? "N" : account.handle.slice(0, 1).toUpperCase()}</span>
              {/if}
            </div>
            <div class="saved-copy">
              <div class="saved-handle">
                <span class="platform-tag" class:nostr={account.platform === "nostr"}>{platformLabel(account)}</span>
                @{account.handle}
              </div>
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

    <div class="mode-tabs">
      <button class="mode-tab" class:active={loginMode === "bluesky"} onclick={() => loginMode = "bluesky"}>Bluesky</button>
      <button class="mode-tab" class:active={loginMode === "nostr"} onclick={() => loginMode = "nostr"}>Nostr</button>
    </div>

    {#if loginMode === "bluesky"}
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
    {:else}
      <form onsubmit={(e) => { e.preventDefault(); handleNostrLogin(); }}>
        <div class="form-group">
          <label for="nsec">秘密鍵（nsec）</label>
          <input
            class="form-input"
            id="nsec"
            type="password"
            bind:value={nostrNsec}
            placeholder="nsec1..."
            required
          />
          <p class="form-hint">
            Nostrクライアントの設定画面でnsecを確認してください。<br />
            鍵はブラウザ内にのみ保存されます。リレーや画像サーバーはアカウント設定から変更できます。
          </p>
        </div>
        {#if nostrError}
          <p class="error-msg">{nostrError}</p>
        {/if}
        <div class="login-actions">
          <div class="login-links">
            <a href="/information">使い方</a>
          </div>
          <button type="submit" class="btn btn-primary">追加</button>
        </div>
      </form>
    {/if}
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

  .mode-tabs {
    display: flex;
    gap: 0;
    margin: 8px 0 4px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .mode-tab {
    flex: 1;
    padding: 7px 12px;
    font-size: var(--font-sm);
    font-weight: 600;
    font-family: inherit;
    border: none;
    background: var(--panel-soft);
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s;
  }
  .mode-tab:not(:last-child) {
    border-right: 1px solid var(--border);
  }
  .mode-tab.active {
    background: var(--panel);
    color: var(--text);
  }
  .mode-tab:hover:not(.active) {
    background: var(--panel);
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
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
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
  .nostr-avatar {
    border-color: rgba(139, 92, 246, 0.4);
    background: rgba(139, 92, 246, 0.12);
    color: rgba(139, 92, 246, 0.9);
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

  .platform-tag {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(56, 189, 248, 0.15);
    color: rgba(56, 189, 248, 0.9);
    line-height: 1.3;
    flex-shrink: 0;
  }
  .platform-tag.nostr {
    background: rgba(139, 92, 246, 0.15);
    color: rgba(139, 92, 246, 0.9);
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
