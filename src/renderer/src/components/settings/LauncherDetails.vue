<script setup lang="ts">
import { useLibraryStore } from "../../store/libraryStore";

const libraryStore = useLibraryStore();
</script>

<template>
  <div class="flex flex-col">
    <div class="font-bold mb-2">Details</div>

    <div class="ml-2">Location: {{libraryStore.location}}</div>
    <div class="ml-2">Version Number: {{libraryStore.version}}</div>

    <hr class="my-4">
  </div>
</template>
