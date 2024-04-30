<script setup lang="ts">
  defineProps({
    title: {
      type: String,
      required: true
    },
    items: {
      type: Array<string>,
      required: false
    }
  })
</script>

<template>
  <div class="flex flex-col">
    <h2 class="title font-bold text-lg">
      {{title}}
    </h2>

    <ul class="ml-10 list-disc">
      <li v-if="items.length === 0">N/A</li>
      <li v-for="item in items">{{item}}</li>
    </ul>
  </div>
</template>
