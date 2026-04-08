<script lang="ts">
  import type { MultiPostResult } from "../lib/script/bsky";
  import Icon from "./Icon.svelte";

  let {
    results,
    onDismiss,
  }: {
    results: MultiPostResult[];
    onDismiss: () => void;
  } = $props();

  const successCount = $derived(results.filter((r) => r.success).length);
  const allSuccess = $derived(successCount === results.length);
</script>

<div class="post-result-panel">
  <div class="section-title">
    <span>投稿結果</span>
    <span class="badge" class:badge-ok={allSuccess} class:badge-warn={!allSuccess}>
      {successCount}/{results.length}
    </span>
  </div>
  <div class="result-list">
    {#each results as result (result.accountId)}
      <div class="result-row">
        <span class="result-handle">
          <span class="result-platform" class:nostr={result.platform === "nostr"}>{result.platform === "nostr" ? "Nostr" : "Bsky"}</span>
          @{result.handle}
        </span>
        {#if result.success}
          <span class="result-tag ok">
            <Icon name="check" size={12} /> 成功
          </span>
        {:else}
          <div class="result-fail-group">
            <span class="result-tag fail">
              <Icon name="alert" size={12} /> 失敗
            </span>
            {#if result.error}
              <span class="result-error-detail">{result.error}</span>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
  <div class="result-actions">
    <button class="btn btn-outline btn-sm" onclick={onDismiss}>閉じる</button>
  </div>
</div>

<style>
  .post-result-panel {
    margin-top: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    background: var(--panel-soft);
  }

  .result-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
  }

  .result-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 0;
    border-top: 1px solid var(--border);
    font-size: var(--font-sm);
  }

  .result-row:first-child {
    border-top: none;
    padding-top: 0;
  }

  .result-handle {
    color: var(--text);
    word-break: break-all;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .result-platform {
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

  .result-platform.nostr {
    background: rgba(139, 92, 246, 0.15);
    color: rgba(139, 92, 246, 0.9);
  }

  .result-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .result-tag.ok {
    color: var(--success);
  }

  .result-tag.fail {
    color: var(--danger);
  }

  .result-fail-group {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .result-error-detail {
    font-size: var(--font-xs);
    color: var(--muted);
    text-align: right;
    word-break: break-word;
  }

  .result-actions {
    margin-top: 8px;
    display: flex;
    justify-content: flex-end;
  }

  .badge-ok {
    color: var(--success);
  }

  .badge-warn {
    color: var(--warning);
  }
</style>
