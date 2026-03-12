<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { v4 as uuidv4 } from "uuid";
  import { preprocessImage } from "../lib/script/image";
  import {
    extractHashtagsFromRichText,
    getStoredAccounts,
    hasSession,
    postToAccounts,
    type MultiPostResult,
    type PostImageInput,
    type StoredAccount,
  } from "../lib/script/bsky";
  import { isLoading, message, urlQuery } from "../stores/MassDriver";
  import Icon from "../components/Icon.svelte";
  import AccountFilterBar from "../components/AccountFilterBar.svelte";
  import TemplateMessage from "../components/TemplateMessage.svelte";

  let isLoaded = false;
  let text = "";
  let templateMessages: { key: string; text: string }[] = [];

  let imageInput: HTMLInputElement | null = null;
  let textareaElement: HTMLTextAreaElement | null = null;
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
  let hashtagHistory: string[] = [];
  let cursorStart = 0;
  let cursorEnd = 0;

  function loadTemplateMessages() {
    const storedTexts = localStorage.getItem("texts");
    if (storedTexts) templateMessages = JSON.parse(storedTexts);
  }

  function loadHashtagHistory() {
    hashtagHistory = JSON.parse(localStorage.getItem("hashtagHistory") ?? "[]") as string[];
  }

  function loadAccounts() {
    accounts = getStoredAccounts();
    const persisted = JSON.parse(localStorage.getItem("selectedAccounts") ?? "[]") as string[];
    const valid = persisted.filter((id) => accounts.some((item) => item.id === id));
    selectedAccountIds = valid.length > 0 ? valid : accounts[0] ? [accounts[0].id] : [];
    localStorage.setItem("selectedAccounts", JSON.stringify(selectedAccountIds));
  }

  onMount(async () => {
    loadTemplateMessages();
    loadHashtagHistory();

    const intent = page.url.searchParams.get("intent");
    const pendingShare = sessionStorage.getItem("pendingShareText");

    if (pendingShare) {
      text = pendingShare;
      $urlQuery = pendingShare;
    } else if (intent) {
      text = intent;
      $urlQuery = intent;
    }

    const login = await hasSession();
    if (!login) return;

    if (pendingShare) {
      sessionStorage.removeItem("pendingShareText");
    }

    if ($urlQuery !== "") {
      text = $urlQuery;
      $urlQuery = "";
    }
    if (intent) goto("/");

    loadAccounts();
    isLoaded = true;
  });

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
        attachments.flatMap((item): PostImageInput[] =>
          item.processedFile && item.width !== null && item.height !== null
            ? [
                {
                  file: item.processedFile,
                  width: item.width,
                  height: item.height,
                  alt: item.originalFile.name || "",
                },
              ]
            : []
        )
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

  function syncCursorFromTextarea() {
    if (!textareaElement) return;
    cursorStart = textareaElement.selectionStart ?? text.length;
    cursorEnd = textareaElement.selectionEnd ?? text.length;
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
    const latestFirst = [...new Set([...tags.slice().reverse(), ...current])];
    localStorage.setItem("hashtagHistory", JSON.stringify(latestFirst));
    hashtagHistory = latestFirst;
  }

  onDestroy(() => clearAttachments());

  function mimeShortLabel(type: string | null) {
    if (type === "image/jpeg") return "JPG";
    if (type === "image/png") return "PNG";
    if (type === "image/webp") return "WEBP";
    return "IMG";
  }

  function sanitizeTag(tag: string) {
    return tag.replace(/^#+/u, "").trim().toLowerCase();
  }

  function getActiveHashtagState(source: string, selectionStart: number, selectionEnd: number) {
    const left = source.slice(0, selectionStart);
    const right = source.slice(selectionEnd);
    const match = left.match(/(^|\s)#([^\s#]*)$/u);
    if (!match) {
      return { query: null, start: -1, end: -1 };
    }

    const query = match[2].toLowerCase();
    const start = selectionStart - query.length - 1;
    const rightTokenLength = (right.match(/^[^\s#]*/u)?.[0] ?? "").length;
    return {
      query,
      start,
      end: selectionEnd + rightTokenLength,
    };
  }

  function getSuggestedHashtags(history: string[]) {
    return history.slice(0, 8);
  }

  async function insertHashtag(tag: string) {
    const normalized = sanitizeTag(tag);
    if (!normalized) return;

    const active = getActiveHashtagState(text, cursorStart, cursorEnd);
    let nextText: string;
    let nextCursor: number;

    if (active.query !== null && active.start >= 0) {
      const replacement = `#${normalized} `;
      nextText = `${text.slice(0, active.start)}${replacement}${text.slice(active.end)}`;
      nextCursor = active.start + replacement.length;
    } else {
      const spacer = text.length === 0 || /\s$/u.test(text) ? "" : " ";
      const addition = `${spacer}#${normalized} `;
      nextText = `${text}${addition}`;
      nextCursor = nextText.length;
    }

    text = nextText;
    await tick();
    textareaElement?.focus();
    textareaElement?.setSelectionRange(nextCursor, nextCursor);
    syncCursorFromTextarea();
  }

  $: charCount = trimPostContent(text).length;
  $: hasProcessingAttachments = attachments.some((item) => item.status === "processing");
  $: hasErroredAttachments = attachments.some((item) => item.status === "error");
  $: suggestedHashtags = getSuggestedHashtags(hashtagHistory);
</script>

{#if isLoaded}
  <AccountFilterBar
    {accounts}
    selectedAccountIds={selectedAccountIds}
    toggleAccount={toggleAccount}
    label="Post Targets"
  />

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
      bind:this={textareaElement}
      bind:value={text}
      placeholder="What's up?"
      oninput={syncCursorFromTextarea}
      onclick={syncCursorFromTextarea}
      onkeyup={syncCursorFromTextarea}
      onselect={syncCursorFromTextarea}
    ></textarea>

    {#if hashtagHistory.length > 0}
      <div class="hashtag-panel">
        <div class="hashtag-list">
          {#each suggestedHashtags as tag (tag)}
            <button class="hashtag-chip" onclick={() => insertHashtag(tag)}>
              #{tag}
            </button>
          {/each}
        </div>
      </div>
    {/if}

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
        <button onclick={openImagePicker} class="btn btn-outline btn-sm btn-attach btn-icon-only" aria-label="画像を添付"><Icon name="image" size={16} /></button>
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
    font-size: var(--font-base);
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
  .hashtag-panel {
    margin-top: 8px;
  }
  .hashtag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .hashtag-chip {
    border: 1px solid rgba(56, 189, 248, 0.28);
    border-radius: var(--radius-full);
    background: rgba(56, 189, 248, 0.08);
    color: var(--primary);
    padding: 4px 10px;
    font-size: var(--font-sm);
    line-height: 1.2;
    cursor: pointer;
    font-family: inherit;
  }
  .hashtag-chip:hover {
    background: rgba(56, 189, 248, 0.15);
  }
  .image-thumb-group {
    width: 72px;
  }
  .image-thumb {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-sm);
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
    border-radius: var(--radius-full);
    background: rgba(0, 0, 0, 0.75);
    color: var(--panel);
    border: none;
    cursor: pointer;
    font-size: var(--font-2xs);
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
    font-size: var(--font-xs);
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
    font-size: var(--font-sm);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .char-count.warn { color: var(--warning); }
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
    background: rgba(0, 0, 0, 0.02);
    font-size: var(--font-sm);
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
    textarea { min-height: 80px; font-size: var(--font-base); padding: 10px; }
    .image-thumb-group { width: 60px; }
    .image-thumb { width: 44px; height: 44px; }
    .composer-footer { flex-wrap: wrap; }
    .toolbar { gap: 4px; }
  }
</style>
