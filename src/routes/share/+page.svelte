<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";

  function composeShareText(title: string, text: string, url: string): string {
    const parts: string[] = [];

    if (title) parts.push(title);

    if (text) {
      const alreadyHasTitle = title && text.startsWith(title);
      if (!alreadyHasTitle) parts.push(text);
    }

    if (url) {
      const alreadyInText = text.includes(url);
      if (!alreadyInText) parts.push(url);
    }

    return parts.join("\n");
  }

  onMount(() => {
    const title = page.url.searchParams.get("title") ?? "";
    const text = page.url.searchParams.get("text") ?? "";
    const url = page.url.searchParams.get("url") ?? "";

    const composed = composeShareText(title, text, url);

    if (composed) {
      sessionStorage.setItem("pendingShareText", composed);
    }

    goto("/", { replaceState: true });
  });
</script>

<div class="share-loading">
  <p>共有内容を読み込んでいます…</p>
</div>

<style>
  .share-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: var(--muted);
    font-size: var(--font-base);
  }
</style>
