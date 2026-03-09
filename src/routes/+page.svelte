<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { v4 as uuidv4 } from "uuid";
  import { preprocessImage } from "../lib/script/image";
  import {
    extractHashtagsFromRichText,
    getActiveAccountId,
    getProfile,
    getProfileForAccount,
    getStoredAccounts,
    hasSession,
    postToAccounts,
    setActiveAccount,
    type MultiPostResult,
    type StoredAccount,
  } from "../lib/script/bsky";
  import { isLoading, message, urlQuery } from "../stores/MassDriver";
  import UserField from "../components/UserField.svelte";
  import TemplateMessage from "../components/TemplateMessage.svelte";

  let isLoaded = false;
  let text = "";
  let templateMessages: { key: string; text: string }[] = [];
  let userHandle = "";
  let userAvatar: string | null = null;
  let accountAvatars: Record<string, string | null> = {};

  let imageInput: HTMLInputElement | null = null;
  type AttachmentStatus = "processing" | "ready" | "error";
  type AttachmentItem = {
    id: string;
    originalFile: File;
    processedFile: File | null;
    previewUrl: string;
    status: AttachmentStatus;
    errorMessage: string;
    originalSize: number;
    processedSize: number | null;
    width: number | null;
    height: number | null;
    outputType: string | null;
    convertedFrom: string | null;
  };
  let attachments: AttachmentItem[] = [];

  let accounts: StoredAccount[] = [];
  let selectedAccountIds: string[] = [];
  let lastPostResults: MultiPostResult[] = [];

  function loadTemplateMessages() {
    const storedTexts = localStorage.getItem("texts");
    if (storedTexts) templateMessages = JSON.parse(storedTexts);
  }

  function loadAccounts() {
    accounts = getStoredAccounts();
    const persisted = JSON.parse(localStorage.getItem("selectedAccounts") ?? "[]") as string[];
    const valid = persisted.filter((id) => accounts.some((item) => item.id === id));
    if (valid.length) selectedAccountIds = valid;
    else {
      const activeId = getActiveAccountId();
      selectedAccountIds = activeId ? [activeId] : accounts[0] ? [accounts[0].id] : [];
    }
    localStorage.setItem("selectedAccounts", JSON.stringify(selectedAccountIds));
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

  onMount(async () => {
    loadTemplateMessages();
    const intent = page.url.searchParams.get("intent");
    if (intent) {
      text = intent;
      $urlQuery = intent;
    }

    const login = await hasSession();
    if (!login) return;

    if ($urlQuery !== "") {
      text = $urlQuery;
      $urlQuery = "";
    }
    if (intent) goto("/");

    loadAccounts();
    await loadAccountAvatars();

    const profile = await getProfile();
    if (profile) {
      userHandle = profile.handle ?? "";
      userAvatar = profile.avatar ?? null;
    } else if (accounts[0]) {
      userHandle = accounts[0].handle;
    }
    isLoaded = true;
  });

  async function switchActiveAccount(accountId: string) {
    setActiveAccount(accountId);
    const ok = await hasSession();
    if (!ok) return;
    const profile = await getProfile();
    userHandle = profile?.handle ?? accounts.find((item) => item.id === accountId)?.handle ?? "";
    userAvatar = profile?.avatar ?? null;
    loadAccounts();
  }

  function goToAddAccount() {
    goto("/login");
  }

  function trimPostContent(postContent: string): string {
    return postContent.replace(/^[ \t\n\r\u3000]+|[ \t\n\r\u3000]+$/g, "");
  }

  async function submitForm() {
    const postText = trimPostContent(text);
    if (!postText.length) return;
    if (!selectedAccountIds.length) {
      $message = "Select at least one account.";
      return;
    }
    if (hasProcessingAttachments) {
      $message = "Image processing is still running.";
      return;
    }
    if (hasErroredAttachments) {
      $message = "Fix image errors before posting.";
      return;
    }

    $isLoading = true;
    try {
      const hashtags = await extractHashtagsFromRichText(postText);
      const results = await postToAccounts(
        postText,
        selectedAccountIds,
        attachments.flatMap((item) => (item.processedFile ? [item.processedFile] : []))
      );
      lastPostResults = results;
      saveHashtagHistory(hashtags);

      const successCount = results.filter((item) => item.success).length;
      if (successCount === results.length) {
        $message = `Post completed! (${successCount}/${results.length})`;
        text = "";
        clearAttachments();
      } else if (successCount > 0) {
        $message = `Post partial success. (${successCount}/${results.length})`;
      } else {
        $message = "Post failed.";
      }
    } catch {
      $message = "Post failed.";
    } finally {
      $isLoading = false;
    }
  }

  function copyPostUrl() {
    const postText = trimPostContent(text);
    const uri = encodeURIComponent(postText);
    navigator.clipboard.writeText(location.href + "?intent=" + uri);
    $message = "Copy to Clipboard.";
  }

  function addTemplate() {
    templateMessages = [
      ...templateMessages,
      { key: uuidv4().replace(/-/g, "").substring(0, 16), text },
    ];
    localStorage.setItem("texts", JSON.stringify(templateMessages));
  }

  function setText(setValue: string) {
    text = setValue;
  }

  function deleteTemplateItem(key: string) {
    templateMessages = templateMessages.filter((item) => item.key !== key);
    localStorage.setItem("texts", JSON.stringify(templateMessages));
  }

  function toggleAccount(accountId: string) {
    if (selectedAccountIds.includes(accountId)) {
      selectedAccountIds = selectedAccountIds.filter((id) => id !== accountId);
    } else {
      selectedAccountIds = [...selectedAccountIds, accountId];
    }
    localStorage.setItem("selectedAccounts", JSON.stringify(selectedAccountIds));
  }

  function openImagePicker() {
    if (hasProcessingAttachments) {
      $message = "Wait until current image processing finishes.";
      return;
    }
    imageInput?.click();
  }

  async function onSelectImages(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    if (!files.length) return;

    const incoming = files.slice(0, Math.max(0, 4 - attachments.length));
    if (incoming.length < files.length) {
      $message = "You can attach up to 4 images.";
    }
    const placeholders: AttachmentItem[] = incoming.map((file) => ({
      id: crypto.randomUUID(),
      originalFile: file,
      processedFile: null,
      previewUrl: URL.createObjectURL(file),
      status: "processing",
      errorMessage: "",
      originalSize: file.size,
      processedSize: null,
      width: null,
      height: null,
      outputType: null,
      convertedFrom: null,
    }));

    attachments = [...attachments, ...placeholders];
    target.value = "";

    await Promise.all(
      placeholders.map(async (placeholder) => {
        const result = await preprocessImage(placeholder.originalFile);
        attachments = await updateAttachmentAfterProcessing(attachments, placeholder.id, result);
        if (!result.ok) {
          $message = result.error;
        }
      })
    );
  }

  function removeAttachment(id: string) {
    const target = attachments.find((item) => item.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    attachments = attachments.filter((item) => item.id !== id);
  }

  function clearAttachments() {
    for (const attachment of attachments) URL.revokeObjectURL(attachment.previewUrl);
    attachments = [];
  }

  async function updateAttachmentAfterProcessing(
    current: AttachmentItem[],
    attachmentId: string,
    result: Awaited<ReturnType<typeof preprocessImage>>
  ) {
    return current.map((item) => {
      if (item.id !== attachmentId) return item;

      if (!result.ok) {
        return {
          ...item,
          status: "error" as const,
          errorMessage: result.error,
          processedSize: result.bytes,
          width: result.width,
          height: result.height,
          outputType: null,
          convertedFrom: null,
        };
      }

      URL.revokeObjectURL(item.previewUrl);
      return {
        ...item,
        processedFile: result.file,
        previewUrl: URL.createObjectURL(result.file),
        status: "ready" as const,
        errorMessage: "",
        processedSize: result.bytes,
        width: result.width,
        height: result.height,
        outputType: result.outputType,
        convertedFrom: result.convertedFrom,
      };
    });
  }

  function saveHashtagHistory(tags: string[]) {
    if (!tags.length) return;
    const current = JSON.parse(localStorage.getItem("hashtagHistory") ?? "[]") as string[];
    const merged = [...new Set([...current, ...tags])];
    localStorage.setItem("hashtagHistory", JSON.stringify(merged));
  }

  onDestroy(() => clearAttachments());

  function mimeShortLabel(type: string | null) {
    if (type === "image/jpeg") return "JPG";
    if (type === "image/png") return "PNG";
    if (type === "image/webp") return "WEBP";
    return "IMG";
  }

  $: charCount = trimPostContent(text).length;
  $: hasProcessingAttachments = attachments.some((item) => item.status === "processing");
  $: hasErroredAttachments = attachments.some((item) => item.status === "error");
</script>

{#if isLoaded}
  <!-- Header -->
  <header class="header">
    <div class="brand">
      <img src="/massdriver-icon.svg" width="30" height="30" alt="Mass Driver" />
      <h1>Mass Driver</h1>
    </div>
    <div class="header-right">
      <div class="avatar-group">
        {#each accounts as account (account.id)}
          {#if account.id === getActiveAccountId()}
            <UserField avatar={accountAvatars[account.id] ?? userAvatar} handle={account.handle} />
          {:else}
            <button
              class="account-avatar"
              title={"@" + account.handle}
              onclick={() => switchActiveAccount(account.id)}
            >
              {#if accountAvatars[account.id]}
                <img
                  src={accountAvatars[account.id] ?? ""}
                  alt={account.handle}
                  class="account-avatar-image"
                />
              {:else}
                <span class="account-avatar-fallback">{account.handle.slice(0, 1).toUpperCase()}</span>
              {/if}
            </button>
          {/if}
        {/each}
      </div>
      <button class="add-account-btn" title="Add account" onclick={goToAddAccount}>+</button>
    </div>
  </header>

  <!-- Account Bar -->
  <div class="account-bar">
    {#each accounts as account (account.id)}
      <button
        class="account-chip"
        class:selected={selectedAccountIds.includes(account.id)}
        onclick={() => toggleAccount(account.id)}
      >
        <span class="check">{selectedAccountIds.includes(account.id) ? "✓" : ""}</span>
        <span class="chip-handle">@{account.handle}</span>
      </button>
    {/each}
  </div>

  <!-- Composer Card -->
  <section class="card composer">
    <input
      bind:this={imageInput}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      class="hidden-image-input"
      onchange={onSelectImages}
    />
    <textarea
      bind:value={text}
      placeholder="What's up?"
    ></textarea>

    {#if attachments.length > 0}
      <div class="image-thumbs">
        {#each attachments as attachment (attachment.id)}
          <div class="image-thumb-group">
            <div class="image-thumb" class:error={attachment.status === "error"}>
              <img src={attachment.previewUrl} alt={attachment.originalFile.name} />
              {#if attachment.status !== "processing"}
                <button
                  class="image-thumb-remove"
                  title="Remove image"
                  onclick={() => removeAttachment(attachment.id)}
                >
                  ×
                </button>
              {/if}
            </div>
            <div class="image-meta">
              {#if attachment.status === "processing"}
                <span class="image-badge">処理中...</span>
              {:else if attachment.status === "error"}
                <span class="image-error">{attachment.errorMessage}</span>
              {:else}
                <span class="image-badge">
                  {attachment.width}x{attachment.height} / {Math.round((attachment.processedSize ?? 0) / 1024)}KB
                </span>
                {#if attachment.convertedFrom}
                  <span class="image-badge image-converted">
                    {mimeShortLabel(attachment.convertedFrom)}→{mimeShortLabel(attachment.outputType)}
                  </span>
                {/if}
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="composer-footer">
      <span class="char-count" class:warn={charCount > 250} class:over={charCount > 300}>
        {charCount} / 300
      </span>
      <div class="toolbar">
        <button onclick={addTemplate} class="btn btn-outline btn-sm" title="Save as template">+ Template</button>
        <button onclick={copyPostUrl} class="btn btn-outline btn-sm" title="Copy share URL">Copy URL</button>
        <button onclick={openImagePicker} class="btn btn-outline btn-sm btn-attach" title="Add images">
          🖼 Image
        </button>
        <button onclick={submitForm} class="btn btn-primary">Lift Off!</button>
      </div>
    </div>
  </section>

  {#if lastPostResults.length > 0}
    <div class="section-title">
      <span>Post Results</span>
      <span class="badge">{lastPostResults.filter((item) => item.success).length}/{lastPostResults.length}</span>
    </div>
    <section class="results-list">
      {#each lastPostResults as result (result.accountId)}
        <div class="result-item">
          <span class="result-handle">@{result.handle}</span>
          <span class="result-status" class:ok={result.success} class:fail={!result.success}>
            {result.success ? "Success" : "Failed"}
          </span>
        </div>
      {/each}
    </section>
  {/if}

  <!-- Templates -->
  {#if templateMessages.length > 0}
    <div class="section-title">
      <span>Templates</span>
      <span class="badge">{templateMessages.length}</span>
    </div>
    <section class="template-list">
      {#each templateMessages as item (item.key)}
        <TemplateMessage {item} {setText} {deleteTemplateItem} />
      {/each}
    </section>
  {/if}
{/if}

<style>
  .header {
    padding: 14px 0 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .brand h1 {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .avatar-group {
    display: flex;
    align-items: center;
  }
  .account-avatar {
    width: 32px;
    height: 32px;
    margin-left: -4px;
    border-radius: 999px;
    border: 2px solid var(--border-light);
    background: #020617;
    padding: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .account-avatar:first-child {
    margin-left: 0;
  }
  .account-avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .account-avatar-fallback {
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }
  .add-account-btn {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    border: 1px dashed var(--border-light);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .add-account-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .account-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 0;
  }
  .account-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px 3px 5px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--panel-soft);
    cursor: pointer;
    font-size: 12px;
    color: var(--muted);
    user-select: none;
    font-family: inherit;
  }
  .account-chip.selected {
    border-color: var(--primary);
    color: var(--text);
    background: rgba(56, 189, 248, 0.08);
  }
  .account-chip .check {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid var(--border-light);
    background: transparent;
    color: #0b1220;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    line-height: 1;
  }
  .account-chip .chip-handle {
    font-weight: 500;
  }
  .account-chip.selected .check {
    border-color: var(--primary);
    background: var(--primary);
  }

  .composer {
    margin-top: 4px;
  }
  .hidden-image-input {
    display: none;
  }
  textarea {
    width: 100%;
    min-height: 110px;
    resize: vertical;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--panel-soft);
    color: var(--text);
    padding: 10px;
    font-size: 15px;
    line-height: 1.45;
    font-family: inherit;
  }
  textarea:focus {
    outline: none;
    border-color: var(--primary);
  }
  textarea::placeholder {
    color: var(--muted);
  }
  .image-thumbs {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
  }
  .image-thumb-group {
    width: 72px;
  }
  .image-thumb {
    width: 56px;
    height: 56px;
    border-radius: 6px;
    background: var(--panel-soft);
    border: 1px solid var(--border);
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }
  .image-thumb.error {
    border-color: var(--danger);
  }
  .image-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .image-thumb-remove {
    position: absolute;
    top: 1px;
    right: 1px;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    border: none;
    cursor: pointer;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .image-meta {
    margin-top: 4px;
  }
  .image-badge,
  .image-error {
    display: block;
    font-size: 10px;
    line-height: 1.35;
    color: var(--muted);
    word-break: break-word;
  }
  .image-error {
    color: var(--danger-soft);
  }
  .image-converted {
    color: var(--primary);
  }

  .composer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    gap: 6px;
  }
  .char-count {
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .char-count.warn { color: #fb923c; }
  .char-count.over { color: var(--danger); font-weight: 600; }
  .toolbar {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .template-list {
    display: grid;
    gap: 4px;
  }
  .results-list {
    margin-top: 6px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    border-top: 1px solid var(--border);
    background: rgba(15, 23, 42, 0.35);
    font-size: 12px;
  }
  .result-item:first-child {
    border-top: none;
  }
  .result-handle {
    color: var(--text);
  }
  .result-status.ok {
    color: var(--success);
    font-weight: 600;
  }
  .result-status.fail {
    color: var(--danger);
    font-weight: 600;
  }

  @media (max-width: 480px) {
    .brand h1 { font-size: 18px; }
    textarea { min-height: 80px; font-size: 14px; padding: 8px; }
    .image-thumb-group { width: 60px; }
    .image-thumb { width: 44px; height: 44px; }
    .composer-footer { flex-wrap: wrap; }
    .toolbar { gap: 4px; }
    .account-chip { font-size: 11px; padding: 2px 8px 2px 4px; }
    .account-chip .check { width: 12px; height: 12px; font-size: 8px; }
  }
</style>
