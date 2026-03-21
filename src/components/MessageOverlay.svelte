<script lang="ts">
  import { onDestroy } from 'svelte';
  import { message, messageType } from '../stores/MassDriver';
  let show = false;
  let currentType = "info";
  let timeoutId: number;

  const unsubType = messageType.subscribe(($type) => {
    currentType = $type;
  });

  const unsubscribe = message.subscribe(($message) => {
    if ($message) {
      show = true;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        show = false;
      }, 2800);
    }
  });

  function dismiss() {
    show = false;
    clearTimeout(timeoutId);
  }

  onDestroy(() => {
    clearTimeout(timeoutId);
    unsubscribe();
    unsubType();
  });
</script>

{#if show}
  <div
    class="toast"
    class:is-success={currentType === "success"}
    class:is-warning={currentType === "warning"}
    class:is-error={currentType === "error"}
    role="status"
  >
    <p>{$message}</p>
    <button class="toast-dismiss" onclick={dismiss} aria-label="閉じる">×</button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    background: var(--panel);
    border: 1px solid var(--border);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    max-width: min(90vw, 420px);
    animation: toast-in 0.2s ease-out;
    pointer-events: auto;
  }

  @keyframes toast-in {
    from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  p {
    margin: 0;
    font-size: var(--font-sm);
    line-height: 1.45;
    flex: 1;
  }

  .toast-dismiss {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: var(--font-base);
    padding: 0 2px;
    line-height: 1;
    flex-shrink: 0;
  }
  .toast-dismiss:hover {
    color: var(--text);
  }

  .is-success {
    border-color: var(--success);
  }
  .is-success p { color: var(--success); }

  .is-warning {
    border-color: var(--warning);
  }
  .is-warning p { color: var(--warning); }

  .is-error {
    border-color: var(--danger);
  }
  .is-error p { color: var(--danger); }
</style>
