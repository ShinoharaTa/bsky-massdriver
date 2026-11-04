<script lang="ts">
  import { locale, localeNames, locales, setLocale } from "../lib/i18n";

  const year = new Date().getFullYear();
</script>

<footer class="footer">
  © 2023–{year} T.Shinohara ·
  <a href="https://github.com/ShinoharaTa/bsky-massdriver" target="_blank" rel="noreferrer" class="footer-link">GitHub</a>
  ·
  <a href="https://github.com/ShinoharaTa/bsky-massdriver/blob/main/LISENCE.md" target="_blank" rel="noreferrer" class="footer-link">License</a>
  <div class="footer-locale">
    {#each locales as l, i (l)}
      {#if i > 0}<span class="footer-locale-sep" aria-hidden="true">|</span>{/if}<button
        type="button"
        class="footer-locale-btn"
        class:current={$locale === l}
        aria-pressed={$locale === l}
        lang={l}
        onclick={() => setLocale(l)}
      >{localeNames[l]}</button>
    {/each}
  </div>
</footer>

<style>
  .footer {
    margin-top: auto;
    border-top: 1px solid var(--border);
    padding: 12px 0 20px;
    color: var(--muted);
    text-align: center;
    font-size: var(--font-xs);
  }
  .footer-link {
    color: var(--muted);
    text-decoration: none;
  }
  .footer-link:hover {
    color: var(--primary);
  }
  .footer-locale {
    margin-top: 4px;
  }
  .footer-locale-sep {
    margin: 0 4px;
  }
  .footer-locale-btn {
    padding: 0;
    border: none;
    background: none;
    color: var(--muted);
    font: inherit;
    cursor: pointer;
  }
  .footer-locale-btn:hover {
    color: var(--primary);
  }
  .footer-locale-btn.current {
    font-weight: 700;
  }
</style>
