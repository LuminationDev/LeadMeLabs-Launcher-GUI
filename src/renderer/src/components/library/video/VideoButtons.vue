<script setup lang="ts">
import { useLibraryStore } from "@renderer/store/libraryStore";
import * as CONSTANT from "../../../assets/constants";
import ConfirmPrompt from "@renderer/modals/ConfirmPrompt.vue";
import MoveVideo from "@renderer/modals/MoveVideo.vue";

const libraryStore = useLibraryStore();

/**
 * Move the video to a different subdirectory.
 * @param value A string of the directory name (i.e. VR, Regular, Backdrops)
 */
const moveVideo = (value: string) => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.VIDEO_MOVE,
    videoPath: libraryStore.getSelectedVideoPath,
    videoType: value
  });

  libraryStore.changeVideo("");
}

/**
 * Delete the video off the computer.
 */
const deleteVideo = () => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.VIDEO_DELETE,
    path: libraryStore.getSelectedVideoPath
  });

  libraryStore.changeVideo("");
}
</script>

<template>
  <div v-if="libraryStore.selectedVideo !== undefined" class="h-24 px-8 bg-gray-100 rounded flex items-center justify-between">
    <MoveVideo
        :title="'Move ' + libraryStore.filterVideoName(libraryStore.getSelectedVideoName)"
        :videoType="libraryStore.getVideoCategory(libraryStore.getSelectedVideoPath)"
        :callback="moveVideo"
    />

    <ConfirmPrompt
        :title="'Delete ' + libraryStore.getSelectedVideoName"
        :message="'WARNING: This cannot be undone, the video ' +
               libraryStore.getSelectedVideoName + ' will be deleted off the computer entirely.'"
        :callback="deleteVideo"/>
  </div>
</template>
