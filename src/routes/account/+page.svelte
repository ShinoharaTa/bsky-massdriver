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
  import { addAccount, MAX_ACCOUNTS, type NostrStoredAccount } from "../../lib/script/accounts";
  import {
    deriveNostrKeys,
    getNostrRelays,
    setNostrRelays,
    getNostrMediaServer,
    setNostrMediaServer,
    MEDIA_SERVERS,
    DEFAULT_RELAYS,
  } from "../../lib/script/nostr";
  import { isLoading, setMessage } from "../../stores/MassDriver";

  let isLoaded = $state(false);
  let accounts: StoredAccount[] = $state([]);
  let accountAvatars: Record<string, string | null> = $state({});

  let bskyUsername = $state("");
  let bskyPassword = $state("");
  let bskyError = $state("");

  let nostrNsec = $state("");
  let nostrError = $state("");

  let relayText = $state("");
  let mediaServer = $state("");

  type AddMode = "bluesky" | "nostr";
  let addMode: AddMode = $state("bluesky");

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

  function loadNostrSettings() {
    relayText = getNostrRelays().join("\n");
    mediaServer = getNostrMediaServer();
  }

  onMount(async () => {
    const ok = await hasSession();
    if (!ok) return;
    await loadAccounts();
    loadNostrSettings();
    isLoaded = true;
  });

  async function handleBlueskyLogin() {
    if (!bskyUsername.trim() || !bskyPassword.trim()) return;
    try {
      $isLoading = true;
      bskyError = "";
      await login(bskyUsername, bskyPassword);
      bskyUsername = "";
      bskyPassword = "";
      setMessage("Blueskyアカウントを追加しました", "success");
      await loadAccounts();
    } catch (error: any) {
      bskyError = String(error);
    } finally {
      $isLoading = false;
    }
  }

  function handleNostrAdd() {
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
      nostrNsec = "";
      setMessage("Nostrアカウントを追加しました", "success");
      loadAccounts();
    } catch (error: any) {
      nostrError = String(error);
    }
  }

  function saveNostrSettings() {
    const relays = relayText
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.startsWith("wss://"));
    if (relays.length === 0) {
      setMessage("リレーURLを1つ以上入力してください。（wss://...）", "warning");
      return;
    }
    setNostrRelays(relays);
    setNostrMediaServer(mediaServer.trim());
    setMessage("Nostr設定を保存しました", "success");
  }

  function resetNostrSettings() {
    setNostrRelays(DEFAULT_RELAYS);
    relayText = DEFAULT_RELAYS.join("\n");
    setNostrMediaServer(MEDIA_SERVERS[0]);
    mediaServer = MEDIA_SERVERS[0];
    setMessage("Nostr設定をデフォルトに戻しました", "success");
  }

  async function deleteAccount(accountId: string) {
    const ok = window.confirm("このアカウントを削除しますか？");
    if (!ok) return;
    removeStoredAccount(accountId);
    await loadAccounts();
    setMessage("アカウントを削除しました", "success");
  }

  function platformLabel(account: StoredAccount): string {
    return account.platform === "nostr" ? "Nostr" : "Bluesky";
  }

  let hasNostrAccounts = $derived(accounts.some((a) => a.platform === "nostr"));
</script>

{#if isLoaded}
  <div class="page-intro">
    <h2>アカウント</h2>
  </div>

  {#if accounts.length > 0}
    <div class="section-title">
      <span>登録済み</span>
      <span class="badge">{accounts.length}/{MAX_ACCOUNTS}</span>
    </div>
    <div class="account-list">
      {#each accounts as account (account.id)}
        <div class="existing-account-item">
          {#if accountAvatars[account.id]}
            <img src={accountAvatars[account.id] ?? ""} alt={account.handle} class="account-avatar-img" />
          {:else}
            <div class="account-avatar-fallback" class:nostr={account.platform === "nostr"}>
              {account.platform === "nostr" ? "N" : account.handle.slice(0, 1).toUpperCase()}
            </div>
          {/if}
          <div class="existing-account-info">
            <div class="existing-account-handle">
              <span class="platform-badge" class:nostr={account.platform === "nostr"}>{platformLabel(account)}</span>
              @{account.handle}
            </div>
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

  <div class="mode-tabs">
    <button
      class="mode-tab"
      class:active={addMode === "bluesky"}
      onclick={() => addMode = "bluesky"}
    >Bluesky</button>
    <button
      class="mode-tab"
      class:active={addMode === "nostr"}
      onclick={() => addMode = "nostr"}
    >Nostr</button>
  </div>

  {#if addMode === "bluesky"}
    <div class="card" style="margin-top: 6px">
      <form onsubmit={(e) => { e.preventDefault(); handleBlueskyLogin(); }}>
        <div class="form-group">
          <label for="handle">ハンドルまたは DID</label>
          <input
            class="form-input"
            id="handle"
            type="text"
            bind:value={bskyUsername}
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
            bind:value={bskyPassword}
            placeholder="xxxx-xxxx-xxxx-xxxx"
            required
          />
        </div>
        {#if bskyError}
          <p class="error-msg">{bskyError}</p>
        {/if}
        <div class="login-actions">
          <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noreferrer" class="help-link">
            <Icon name="help" size={14} /> アプリパスワードとは？
          </a>
          <button type="submit" class="btn btn-primary">ログイン</button>
        </div>
      </form>
    </div>
  {:else}
    <div class="card" style="margin-top: 6px">
      <form onsubmit={(e) => { e.preventDefault(); handleNostrAdd(); }}>
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
            Nostrクライアントの設定画面でnsecを確認してください。この鍵はブラウザ内にのみ保存されます。
          </p>
        </div>
        {#if nostrError}
          <p class="error-msg">{nostrError}</p>
        {/if}
        <div class="login-actions">
          <span></span>
          <button type="submit" class="btn btn-primary">追加</button>
        </div>
      </form>
    </div>
  {/if}

  {#if hasNostrAccounts}
    <div class="section-title" style="margin-top: 24px">Nostr設定</div>
    <div class="card" style="margin-top: 6px">
      <div class="form-group">
        <label for="relays">投稿先リレー（1行1つ）</label>
        <textarea
          class="form-input relay-textarea"
          id="relays"
          bind:value={relayText}
          placeholder="wss://relay.damus.io/"
          rows="5"
        ></textarea>
      </div>
      <div class="form-group">
        <label for="media-server">画像投稿先サーバー（NIP-96）</label>
        <select class="form-input" id="media-server" bind:value={mediaServer}>
          {#each MEDIA_SERVERS as server}
            <option value={server}>{new URL(server).hostname}</option>
          {/each}
        </select>
      </div>
      <p class="form-hint">
        すべてのNostrアカウントで共通の設定です。この端末のブラウザに保存されます。
      </p>
      <div class="settings-actions">
        <button class="btn btn-outline btn-sm" onclick={resetNostrSettings}>デフォルトに戻す</button>
        <button class="btn btn-primary btn-sm" onclick={saveNostrSettings}>保存</button>
      </div>
    </div>
  {/if}

  <div class="section-title" style="margin-top: 24px">ヘルプ / その他</div>
  <div class="help-links">
    <a href="/information" class="help-link-item">
      <Icon name="info" size={16} />
      <span>使い方ガイド</span>
    </a>
    <a href="https://github.com/ShinoharaTa/bsky-massdriver" target="_blank" rel="noreferrer" class="help-link-item">
      <Icon name="external-link" size={16} />
      <span>GitHub</span>
    </a>
    <a href="https://github.com/ShinoharaTa/bsky-massdriver/issues" target="_blank" rel="noreferrer" class="help-link-item">
      <Icon name="help" size={16} />
      <span>不具合報告・要望</span>
    </a>
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
  .account-avatar-fallback.nostr {
    border-color: rgba(139, 92, 246, 0.4);
    background: rgba(139, 92, 246, 0.12);
    color: rgba(139, 92, 246, 0.9);
  }

  .existing-account-info {
    flex: 1;
    min-width: 0;
  }
  .existing-account-handle {
    font-size: var(--font-base);
    font-weight: 500;
    word-break: break-all;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .existing-account-status {
    font-size: var(--font-sm);
    color: var(--muted);
  }

  .platform-badge {
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
  .platform-badge.nostr {
    background: rgba(139, 92, 246, 0.15);
    color: rgba(139, 92, 246, 0.9);
  }

  .account-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .mode-tabs {
    display: flex;
    gap: 0;
    margin-top: 6px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .mode-tab {
    flex: 1;
    padding: 8px 12px;
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
    line-height: 1.4;
  }

  .relay-textarea {
    resize: vertical;
    min-height: 80px;
    font-size: var(--font-sm);
    font-family: inherit;
    line-height: 1.5;
  }

  .settings-actions {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
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

  .help-links {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .help-link-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--muted);
    font-size: var(--font-sm);
    text-decoration: none;
    transition: all 0.15s;
  }
  .help-link-item:hover {
    border-color: var(--border-light);
    background: var(--panel-soft);
    color: var(--text);
  }
</style>
