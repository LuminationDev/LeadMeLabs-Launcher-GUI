<script setup lang="ts">
import { computed } from "vue";
import * as CONSTANT from "../../assets/constants/_application";
import { useLibraryStore } from "../../store/libraryStore";

const libraryStore = useLibraryStore();
const checked = computed(() => {
  return libraryStore.development;
});

const enableDevelopmentMode = () => {
  //@ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.LAUNCHER_CONFIG,
    name: CONSTANT.LAUNCHER_NAME,
    development: checked.value
  });
}
</script>

<template>
  <div class="w-full h-16 my-4 flex flex-col">
    <p class="text-lg text-black mb-3">Settings Page</p>

    <div class="flex flex-row items-center">
      <input class="h-5 w-5 ml-2 mr-2" type="checkbox" v-model="libraryStore.development" @change="enableDevelopmentMode"/>
      <p>Development Mode</p>
    </div>
  </div>
</template>
