<script lang="ts">
  import { onMount } from "svelte";
  import { hasSession, post } from "../lib/script/bsky";
  import { isLoading, urlQuery, message } from "../stores/MassDriver";
  import { page } from "$app/stores";

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
      console.log("test")
      if ($urlQuery !== "") {
        text = $urlQuery;
        $urlQuery = "";
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
    let postText = trimPostContent(text);
    if (postText.length > 0) {
      $isLoading = true;
      try {
        post(postText);
        text = "";
        $isLoading = false;
        $message = "Post completed!"
      } catch {
        $isLoading = false;
        $message = "Post failed."
      }
    }
  }
</script>

{#if isLoaded}
  <div class="container">
    <!-- <h1>投稿フォーム</h1> -->
    <textarea
      class="textarea"
      bind:value={text}
      placeholder="ここに投稿内容を入力してください"
    />
    <div class="flex justify-end">
      <button on:click={submitForm} class="btn variant-filled-primary">投稿する</button>
    </div>
  </div>
{/if}

<style>
  .textarea {
    resize: none;
    height: calc(100vh - 100px);
    max-height: 400px;
  }
</style>
