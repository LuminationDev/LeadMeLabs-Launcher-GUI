<script setup lang="ts">
import { computed, ref } from 'vue'
import * as CONSTANT from "../../assets/constants/_application"
import ApplicationBar from "./ApplicationBar.vue";
import ApplicationImage from "./ApplicationImage.vue";
import { useLibraryStore } from '../../store/libraryStore'
const libraryStore = useLibraryStore();

const applicationName = computed(() => {
    const app = libraryStore.getSelectedApplication
    return app !== undefined ? app.name : 'Unselected'
});

const applicationStatus = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.status : 'Unselected'
});

const checked = ref();
const setAutostart = (): void => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.APPLICATION_AUTOSTART,
    name: applicationName.value,
    autostart: checked.value
  });
}
</script>

<template>
  <div class="flex flex-col w-full [&>div]:my-2 mb-4">
    <div class="h-6 text-xl rounded flex items-baseline justify-between">
      <p class="text-black font-bold">{{ applicationName }}</p>

      <div v-if="[CONSTANT.STATUS_INSTALLED, CONSTANT.STATUS_RUNNING].includes(applicationStatus)" class="text-sm">
        <p>Auto Start</p>
        <input class="h-5 w-5 ml-2" type="checkbox" v-model="checked" @change="setAutostart()"/>
      </div>
    </div>

    <ApplicationImage />

    <ApplicationBar />
  </div>
</template>
