<script lang="ts">
  import type { StoredAccount } from "../lib/script/bsky";
  import Icon from "./Icon.svelte";

  let {
    accounts,
    selectedAccountIds,
    toggleAccount,
    label = "Accounts",
  }: {
    accounts: StoredAccount[];
    selectedAccountIds: string[];
    toggleAccount: (accountId: string) => void;
    label?: string;
  } = $props();
</script>

<div class="section-title">
  <span>{label}</span>
  <span class="badge">{selectedAccountIds.length}/{accounts.length}</span>
</div>

<div class="account-filter-bar">
  {#each accounts as account (account.id)}
    <button
      class="account-chip"
      class:selected={selectedAccountIds.includes(account.id)}
      onclick={() => toggleAccount(account.id)}
    >
      <span class="check">{#if selectedAccountIds.includes(account.id)}<Icon name="check" size={10} />{/if}</span>
      <span class="chip-handle">@{account.handle}</span>
    </button>
  {/each}
</div>

<style>
  .account-filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px 0 6px;
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
    background: color-mix(in srgb, var(--primary) 20%, var(--panel) 80%);
  }

  .check {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    background: rgba(148, 163, 184, 0.16);
    color: transparent;
  }

  .account-chip.selected .check {
    background: var(--primary);
    color: #fff;
    font-weight: 700;
  }

  .chip-handle {
    font-size: 12px;
  }
</style>
