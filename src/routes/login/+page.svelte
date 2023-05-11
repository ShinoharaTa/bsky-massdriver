<script lang="ts">
  import { goto } from "$app/navigation";
  import { login } from "../../lib/script/bsky";
  import { isLoading } from '../../stores/MassDriver';

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

<div class="container">
  <h1>Mass Driver</h1>
  <p>
    "Unleash your words into the vast expanse of the Bluesky universe with this
    powerful tool."<br /><br />
    このツールを使って、あなたの言葉を広大なBlueskyの宇宙へと解き放ちましょう。
  </p>
  <input
    type="text"
    bind:value={username}
    placeholder="handle.bsky.social"
    required
  />
  <input
    type="password"
    bind:value={password}
    placeholder="password"
    required
  />
  <p>{message}</p>
  <button on:click={handleLogin}>Login</button>
</div>
