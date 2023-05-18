<script lang="ts">
  import { onMount } from "svelte";
  import { hasSession, post } from "../lib/script/bsky";
  import { isLoading, urlQuery, message } from "../stores/MassDriver";
  import { page } from "$app/stores";
  import UserField from "../components/UserField.svelte";
  import { goto } from "$app/navigation";

  let isLoaded: boolean = false;
  let text: string = "";

  onMount(async () => {
    // $isLoading = true;
    const intent = $page.url.searchParams.get("intent");
    if (intent) {
      text = intent;
      $urlQuery = intent;
    }
    const login = await hasSession();
    if (login) {
      console.log("test");
      if ($urlQuery !== "") {
        text = $urlQuery;
        $urlQuery = "";
      }
      if (intent) {
        goto("/")
      }
      isLoaded = true;
    }
  });

  function trimPostContent(postContent: string): string {
    // 文頭、文末の改行・空白・全角スペースを排除
    postContent = postContent.replace(
      /^[ \t\n\r\u3000]+|[ \t\n\r\u3000]+$/g,
      ""
    );
    return postContent;
  }

  function submitForm() {
    const postText = trimPostContent(text);
    if (postText.length > 0) {
      $isLoading = true;
      try {
        post(postText);
        text = "";
        $isLoading = false;
        $message = "Post completed!";
      } catch {
        $isLoading = false;
        $message = "Post failed.";
      }
    }
  }

  function copyPostUrl() {
    const postText = trimPostContent(text);
    const uri = encodeURIComponent(postText);
    const url = location.href
    navigator.clipboard.writeText(url + "?intent=" + uri);
    $message = "Copy to Clipboard.";
  }
</script>

{#if isLoaded}
  <!-- <h1>投稿フォーム</h1> -->
  <div class="flex justify-between items-center">
    <h1 class="h2">Mass Driver</h1>
    <div>
      <UserField />
    </div>
  </div>
  <div class="mt-4">
    <textarea class="textarea" bind:value={text} placeholder="What's up?" />
    <div class="flex justify-end items-center">
      <div class="ps-3 pe-3">
        {trimPostContent(text).length + "/" + 300}
      </div>
      <div class="ps-3">
        <button on:click={copyPostUrl} class="btn variant-ringed-surface"
          >Copy Post URL</button
        >
      </div>
      <div class="ps-3">
        <button on:click={submitForm} class="btn variant-filled-primary"
          >Lift Off!</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  .textarea {
    resize: none;
    height: calc(100vh - 100px);
    max-height: 300px;
  }
</style>
