<script lang="ts">
  import { goto } from "$app/navigation";
  import { login } from "../../lib/script/bsky";
  import { isLoading } from "../../stores/MassDriver";

  let username = "";
  let password = "";
  let message: string = "";

  async function handleLogin(): Promise<void> {
    try {
      $isLoading = true;
      await login(username, password);
      $isLoading = false;
      goto("/");
    } catch (error: any) {
      $isLoading = false;
      message = error;
    }
  }
</script>

<div class="max-width mx-auto">
  <div class="flex justify-start items-center">
    <img src="/massdriver-icon.svg" alt="" width="36px" class="me-3" />
    <h1 class="h1">Mass Driver</h1>
  </div>
  <p class="mt-7">
    "Unleash your words into the vast expanse of the Bluesky universe with this
    powerful tool."
  </p>
  <p class="mt-3">
    このツールを使って、あなたの言葉を広大なBlueskyの宇宙へと解き放ちましょう。
  </p>
  <p class="mt-5 flex justify-center">
    <a class="btn variant-ringed-surface me-3">Sign Up (Go to Bluesky)</a>
    <a href="/information" class="btn variant-ringed-surface"> How To Use ? </a>
  </p>
  <form on:submit|preventDefault={handleLogin}>
    <div class="mt-10">
      <input
        class="input"
        type="text"
        bind:value={username}
        placeholder="handle.bsky.social"
        required
      />
    </div>
    <div class="mt-3">
      <input
        class="input"
        type="password"
        bind:value={password}
        placeholder="password"
        required
      />
    </div>
    <p class="mt-3 text-error-600">{message}</p>
    <div class="flex justify-end">
      <button class="btn variant-filled-primary">Login</button>
    </div>
  </form>
</div>

<style>
  .max-width {
    max-width: 400px;
  }
</style>
