<script lang="ts">
  export let item: { key: string; text: string };
  export let deleteTemplateItem: (text: string) => void;
  export let setText: (text: string) => void;
</script>

<div class="border-t border-gray-400 p-2">
  <div class="flex justify-between items-center">
    <button on:click={() => setText(item.text)} class="truncate me-3">{item.text}</button>
    <button
      on:click={() => deleteTemplateItem(item.key)}
      class="btn variant-ringed-error text-error-600 btn-sm rounded-full"
      >ー</button
    >
  </div>
</div>

<style>
</style>
