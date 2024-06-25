<script setup lang="ts">
import { computed } from "vue";
import { useLibraryStore } from "@renderer/store/libraryStore";
import VideoDetails from "@renderer/components/library/video/VideoDetails.vue";
import VideoButtons from "@renderer/components/library/video/VideoButtons.vue";

const libraryStore = useLibraryStore();

const videoName = computed(() => {
  const video = libraryStore.getSelectedVideo

  if(video == undefined) {
    return 'Unselected';
  } else {
    return video.name;
  }
});
</script>

<template>
  <div class="flex flex-col w-full [&>div]:my-2 mb-4">
    <div class="h-6 text-xl rounded flex items-baseline justify-between">
      <p class="text-black font-bold">{{ libraryStore.filterVideoName(videoName) }}</p>
    </div>

    <VideoDetails />

    <VideoButtons />
  </div>
</template>
