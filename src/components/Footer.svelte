<script lang="ts">
  const year = new Date().getFullYear();
</script>

<footer class="footer">
  © 2023–{year} T.Shinohara ·
  <a href="https://github.com/ShinoharaTa/bsky-massdriver" target="_blank" rel="noreferrer" class="footer-link">GitHub</a>
  ·
  <a href="https://github.com/ShinoharaTa/bsky-massdriver/blob/main/LISENCE.md" target="_blank" rel="noreferrer" class="footer-link">License</a>
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
</style>
