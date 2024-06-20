<script setup lang="ts">
import { useLibraryStore } from "@renderer/store/libraryStore";

const libraryStore = useLibraryStore();

defineProps({
  nothingSelected: {
    type: Boolean,
    required: true
  }
})
</script>

<template>
  <div class="content w-full bg-white ml-2 rounded-3xl px-6 pt-2">
    <!--Display nothing if nothing is selected-->
    <div v-if="nothingSelected" class="w-full"></div>

    <!--Display the application details and options-->
    <div v-else class="w-full">
      <slot></slot>
    </div>
  </div>
</template>
