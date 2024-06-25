<script setup lang="ts">
import { useLibraryStore } from "@renderer/store/libraryStore";
import { computed } from "vue";
import ScrollText from "@renderer/components/strings/ScrollText.vue";
import DetailDisplay from "@renderer/components/strings/DetailDisplay.vue";

const libraryStore = useLibraryStore();

const currentVideo = computed(() => {
  return libraryStore.getSelectedVideo;
})
</script>

<template>
  <div class="h-48 w-full bg-gray-100 rounded p-4">
    <div v-if="libraryStore.getSelectedVideoName === 'Unselected'">
      <!--TODO maybe put a placeholder here-->
    </div>

    <div class="w-full h-full flex flex-col" v-else>
      <div class="font-bold text-lg mb-2">Details</div>
      <DetailDisplay title="Name">{{currentVideo.name}}</DetailDisplay>
      <DetailDisplay title="Category">{{libraryStore.getVideoCategory(currentVideo.path)}}</DetailDisplay>
      <DetailDisplay title="File type">{{libraryStore.filterFileExtension(currentVideo.path)}}</DetailDisplay>
      <DetailDisplay title="File path"><ScrollText :text="currentVideo.path" /></DetailDisplay>
      <DetailDisplay title="Duration">{{currentVideo.duration}}</DetailDisplay>
    </div>
  </div>
</template>
