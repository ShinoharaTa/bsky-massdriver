<script lang="ts">
  let {
    item,
    setText,
    deleteTemplateItem,
  }: {
    item: { key: string; text: string };
    setText: (text: string) => void;
    deleteTemplateItem: (key: string) => void;
  } = $props();
</script>

<article class="template-item">
  <button class="template-text" onclick={() => setText(item.text)}>{item.text}</button>
  <div class="template-actions">
    <button class="btn btn-ghost btn-sm" title="Use" onclick={() => setText(item.text)}>↩</button>
    <button class="btn btn-danger btn-sm" onclick={() => deleteTemplateItem(item.key)}>×</button>
  </div>
</article>

<style>
  .template-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    background: rgba(15, 23, 42, 0.4);
    cursor: pointer;
    transition: all 0.15s;
  }
  .template-item:hover {
    border-color: var(--border-light);
    background: var(--panel-soft);
  }
  .template-text {
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    font-size: 13px;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
  }
  .template-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    margin-left: 6px;
  }

  @media (max-width: 480px) {
    .template-item { padding: 6px 8px; }
    .template-text { font-size: 12px; }
  }
</style>
