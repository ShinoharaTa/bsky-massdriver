<script lang="ts">
  import { onMount } from "svelte";
  import { hasSession, post } from "../lib/script/bsky";
  import { isLoading, urlQuery, message } from "../stores/MassDriver";
  import { page } from "$app/stores";
  import UserField from "../components/UserField.svelte";
  import { goto } from "$app/navigation";
  import TemplateMessage from "../components/TemplateMessage.svelte";
  import { v4 as uuidv4 } from "uuid";

  let isLoaded: boolean = false;
  let text: string = "";

  let templateMessages: { key: string; text: string }[] = [];

  function loadTemplateMessages() {
    const storedTexts = localStorage.getItem("texts");
    if (storedTexts) {
      templateMessages = JSON.parse(storedTexts);
    }
    console.log(templateMessages);
  }

  onMount(async () => {
    // $isLoading = true;
    loadTemplateMessages();
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
        goto("/");
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
    const url = location.href;
    navigator.clipboard.writeText(url + "?intent=" + uri);
    $message = "Copy to Clipboard.";
  }

  function addTemplate() {
    templateMessages = [
      ...templateMessages,
      {
        key: uuidv4().replace(/-/g, "").substring(0, 16),
        text: text,
      },
    ];
    localStorage.setItem("texts", JSON.stringify(templateMessages));
  }

  function setText(setValue: string) {
    text = setValue;
  }

  function deleteTemplateItem(key: string) {
    templateMessages = templateMessages.filter((item) => item.key !== key);
    localStorage.setItem("texts", JSON.stringify(templateMessages));
  }
</script>

{#if isLoaded}
  <!-- <h1>投稿フォーム</h1> -->
  <div class="flex justify-between items-center">
    <div class="flex justify-start items-center">
      <img src="/massdriver-icon.svg" alt="" width="48px" class="me-3">
      <h1 class="h1">Mass Driver</h1>
    </div>
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
        <button on:click={submitForm} class="btn variant-filled-primary"
          >Lift Off!</button
        >
      </div>
    </div>
    <div class="flex justify-end items-center mt-4">
      <div class="ps-3">
        <button on:click={addTemplate} class="btn variant-ringed-surface btn-sm"
          >Add Template</button
        >
      </div>
      <div class="ps-3">
        <button on:click={copyPostUrl} class="btn variant-ringed-surface btn-sm"
          >Copy Post URL</button
        >
      </div>
    </div>
  </div>
  <div class="mt-4">
    {#each templateMessages as item}
      <TemplateMessage {item} {setText} {deleteTemplateItem} />
    {/each}
    <div class="border-t border-gray-400 p-2">
    </div>
  </div>
{/if}

<style>
  .textarea {
    resize: none;
    height: calc(100vh - 100px);
    max-height: 200px;
  }
</style>
