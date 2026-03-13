<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

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
    const searchParams = new URLSearchParams(window.location.search);
    const composed = composeShareText(
      searchParams.get("title") ?? "",
      searchParams.get("text") ?? "",
      searchParams.get("url") ?? ""
    );

    if (composed) {
      sessionStorage.setItem("pendingShareText", composed);
    }

    goto(composed ? `/?intent=${encodeURIComponent(composed)}` : "/", { replaceState: true });
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
