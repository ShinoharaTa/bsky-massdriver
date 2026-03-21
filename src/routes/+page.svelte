<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { page } from "$app/state";
  import { goto, afterNavigate } from "$app/navigation";
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
  import { isLoading, urlQuery, setMessage } from "../stores/MassDriver";
  import Icon from "../components/Icon.svelte";
  import AccountFilterBar from "../components/AccountFilterBar.svelte";
  import TemplateMessage from "../components/TemplateMessage.svelte";
  import PostResultPanel from "../components/PostResultPanel.svelte";

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
    alt: string;
  };
  let attachments: AttachmentItem[] = [];

  let accounts: StoredAccount[] = [];
  let selectedAccountIds: string[] = [];
  let lastPostResults: MultiPostResult[] = [];
  let isSubmitting = false;
  let hashtagHistory: string[] = [];
  let cursorStart = 0;
  let cursorEnd = 0;
  const DRAFT_KEY = "draftText";
  let draftTimer: ReturnType<typeof setTimeout>;

  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, text);
    }, 500);
  }

  function clearDraft() {
    clearTimeout(draftTimer);
    localStorage.removeItem(DRAFT_KEY);
  }

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

  function composeShareText(title: string, sharedText: string, sharedUrl: string): string {
    const parts: string[] = [];

    if (title) parts.push(title);

    if (sharedText) {
      const alreadyHasTitle = title && sharedText.startsWith(title);
      if (!alreadyHasTitle) parts.push(sharedText);
    }

    if (sharedUrl) {
      const alreadyInText = sharedText.includes(sharedUrl);
      if (!alreadyInText) parts.push(sharedUrl);
    }

    return parts.join("\n").trim();
  }

  function extractShareContent(url: URL): string {
    const title = url.searchParams.get("title") ?? "";
    const sharedText = url.searchParams.get("text") ?? "";
    const sharedUrl = url.searchParams.get("url") ?? "";
    const intent = url.searchParams.get("intent");
    const composed = composeShareText(title, sharedText, sharedUrl);
    return composed || intent || "";
  }

  afterNavigate(({ to, type }) => {
    if (!to?.url || !isLoaded) return;
    if (type === "enter") return;

    const shareContent = extractShareContent(to.url);
    if (shareContent) {
      text = shareContent;
      goto("/", { replaceState: true });
    }
  });

  onMount(async () => {
    loadTemplateMessages();
    loadHashtagHistory();

    const shareContent = extractShareContent(page.url);

    if (shareContent) {
      sessionStorage.setItem("pendingShareText", shareContent);
    }

    const pendingShare = sessionStorage.getItem("pendingShareText");

    if (pendingShare) {
      text = pendingShare;
      $urlQuery = pendingShare;
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
    if (shareContent) goto("/", { replaceState: true });

    if (!text) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) text = draft;
    }

    loadAccounts();
    isLoaded = true;
  });

  function trimPostContent(postContent: string): string {
    return postContent.replace(/^[ \t\n\r\u3000]+|[ \t\n\r\u3000]+$/g, "");
  }

  function dismissResults() {
    lastPostResults = [];
  }

  async function submitForm() {
    if (isSubmitting) return;
    const postText = trimPostContent(text);
    if (!postText.length) return;
    if (!selectedAccountIds.length) {
      setMessage("投稿先アカウントを1つ以上選択してください。", "warning");
      return;
    }
    if (hasProcessingAttachments) {
      setMessage("画像の処理中です。完了までお待ちください。", "warning");
      return;
    }
    if (hasErroredAttachments) {
      setMessage("エラーのある画像を修正または削除してください。", "warning");
      return;
    }

    isSubmitting = true;
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
                  alt: item.alt || "",
                },
              ]
            : []
        )
      );
      lastPostResults = results;
      saveHashtagHistory(hashtags);

      const successCount = results.filter((item) => item.success).length;
      if (successCount === results.length) {
        setMessage(`投稿完了 (${successCount}/${results.length})`, "success");
        text = "";
        clearDraft();
        clearAttachments();
      } else if (successCount > 0) {
        const failedHandles = results
          .filter((item) => !item.success)
          .map((item) => `@${item.handle}`)
          .join(", ");
        setMessage(`一部失敗: ${failedHandles} (${successCount}/${results.length} 成功)`, "warning");
      } else {
        const reason = results[0]?.error ?? "不明なエラー";
        setMessage(`投稿失敗: ${reason}`, "error");
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : "不明なエラー";
      setMessage(`投稿失敗: ${reason}`, "error");
    } finally {
      isSubmitting = false;
      $isLoading = false;
    }
  }

  function copyPostUrl() {
    const postText = trimPostContent(text);
    const uri = encodeURIComponent(postText);
    navigator.clipboard.writeText(location.href + "?intent=" + uri);
    setMessage("クリップボードにコピーしました。", "success");
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
      setMessage("画像の処理が完了するまでお待ちください。", "warning");
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
      setMessage("画像は最大4枚まで添付できます。", "warning");
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
      alt: "",
    }));

    attachments = [...attachments, ...placeholders];
    target.value = "";

    await Promise.all(
      placeholders.map(async (placeholder) => {
        const result = await preprocessImage(placeholder.originalFile);
        attachments = await updateAttachmentAfterProcessing(attachments, placeholder.id, result);
        if (!result.ok) {
          setMessage(result.error, "error");
        }
      })
    );
  }

  function updateAttachmentAlt(id: string, value: string) {
    attachments = attachments.map((item) =>
      item.id === id ? { ...item, alt: value } : item
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

  onDestroy(() => {
    clearAttachments();
    clearTimeout(draftTimer);
  });

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
    label="投稿先"
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
      placeholder="いまどうしてる？"
      oninput={() => { syncCursorFromTextarea(); saveDraft(); }}
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
                  title="画像を削除"
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
                <input
                  type="text"
                  class="alt-input"
                  placeholder="ALT"
                  value={attachment.alt}
                  oninput={(e) => updateAttachmentAlt(attachment.id, (e.target as HTMLInputElement).value)}
                />
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="composer-footer">
      <div class="composer-footer-left">
        <span class="char-count" class:warn={charCount > 250} class:over={charCount > 300}>
          {charCount} / 300
        </span>
        <div class="secondary-actions">
          <button onclick={addTemplate} class="btn btn-ghost btn-sm btn-icon-only" title="テンプレートに保存" aria-label="テンプレートに保存"><Icon name="plus" size={14} /></button>
          <button onclick={copyPostUrl} class="btn btn-ghost btn-sm btn-icon-only" title="共有URLをコピー" aria-label="共有URLをコピー"><Icon name="external-link" size={14} /></button>
        </div>
      </div>
      <div class="primary-actions">
        <button onclick={openImagePicker} class="btn btn-outline btn-sm btn-icon-only" aria-label="画像を添付"><Icon name="image" size={16} /></button>
        <button onclick={submitForm} class="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "送信中..." : "Lift Off!"}
        </button>
      </div>
    </div>
  </section>

  {#if lastPostResults.length > 0}
    <PostResultPanel results={lastPostResults} onDismiss={dismissResults} />
  {/if}

  <!-- Templates -->
  {#if templateMessages.length > 0}
    <div class="section-title">
      <span>テンプレート</span>
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
  .alt-input {
    margin-top: 3px;
    width: 100%;
    padding: 2px 4px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--panel-soft);
    color: var(--text);
    font-size: var(--font-2xs);
    font-family: inherit;
  }
  .alt-input:focus {
    outline: none;
    border-color: var(--primary);
  }
  .alt-input::placeholder {
    color: var(--muted);
    font-weight: 600;
  }

  .composer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    gap: 6px;
  }
  .composer-footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .char-count {
    font-size: var(--font-sm);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .char-count.warn { color: var(--warning); }
  .char-count.over { color: var(--danger); font-weight: 600; }
  .secondary-actions {
    display: flex;
    gap: 2px;
    align-items: center;
  }
  .primary-actions {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-shrink: 0;
  }

  .template-list {
    display: grid;
    gap: 4px;
  }
  @media (max-width: 480px) {
    textarea { min-height: 80px; font-size: var(--font-base); padding: 10px; }
    .image-thumb-group { width: 60px; }
    .image-thumb { width: 44px; height: 44px; }
    .primary-actions { gap: 4px; }
  }
</style>
