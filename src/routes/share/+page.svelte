<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { t } from "../../lib/i18n";
  import { savePendingShare } from "../../lib/share/pendingShare";

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

  onMount(async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const composed = composeShareText(
      searchParams.get("title") ?? "",
      searchParams.get("text") ?? "",
      searchParams.get("url") ?? ""
    );

    if (composed) {
      try {
        await savePendingShare({ text: composed, files: [] });
      } catch (err) {
        console.error(err);
      }
    }

    goto(composed ? `/?intent=${encodeURIComponent(composed)}` : "/", { replaceState: true });
  });
</script>

<div class="share-loading">
  <p>{$t("share.loading")}</p>
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
