<script setup lang="ts">
defineProps({
  pageNum: {
    type: Number,
    required: true
  },
  saved: {
    type: Boolean,
    required: true
  }
});
</script>

<template>
  <div class="flex justify-end">
    <button
        v-if="pageNum > 0 && !saved"
        class="h-8 w-24 px-3 mt-2 mr-2 rounded-lg bg-primary text-white hover:bg-blue-400"
        v-on:click="$emit('change-page', false)"
    >Back</button>

    <button
        v-if="pageNum < 2"
        class="h-8 w-24 px-3 mt-2 mr-2 rounded-lg bg-primary text-white hover:bg-blue-400"
        v-on:click="$emit('change-page', true)"
    >Next</button>

    <button
        v-if="pageNum === 2"
        type="submit"
        class="h-8 w-24 px-3 mt-2 mr-2 rounded-lg bg-primary text-white hover:bg-blue-400"
        v-on:click="saved ? $emit('close-modal') : $emit('handle-submit')"
    >{{saved ? 'Finish' : 'Save'}}</button>
  </div>
</template>
