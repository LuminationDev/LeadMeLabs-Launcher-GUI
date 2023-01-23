<script setup lang="ts">
import {computed, ref} from 'vue'
import * as CONSTANT from "../../assets/constants/_application"
import ApplicationManager from './ApplicationManager.vue'
import StationSetup from "../../modals/StationSetup.vue";
import NucSetup from "../../modals/NucSetup.vue";
import { useLibraryStore } from '../../store/libraryStore'
import ApplicationScheduler from "./ApplicationScheduler.vue";
const libraryStore = useLibraryStore()

const applicationName = computed(() => {
    const app = libraryStore.getSelectedApplication
    return app !== undefined ? app.name : 'Unselected'
})

const applicationStatus = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.status : 'Unselected'
})

const checked = ref();
const setAutostart = (): void => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.APPLICATION_AUTOSTART, {
    name: applicationName.value,
    autostart: checked.value
  });
}

const deleteApplication = (): void => {
  if (libraryStore.getSelectedApplication === undefined) {
    return
  }

  libraryStore.updateApplicationStatusByName(applicationName.value, CONSTANT.STATUS_NOT_INSTALLED);

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.APPLICATION_DELETE, {
    name: applicationName.value
  });
}
</script>

<template>
  <div class="flex flex-col w-full [&>div]:my-2 mb-4">
    <div class="h-6 text-xl rounded flex items-baseline justify-between">
      <p class="text-black font-bold">{{ applicationName }}</p>

      <div v-if="applicationStatus === CONSTANT.STATUS_INSTALLED" class="text-sm">
        <p>Auto Start</p>
        <input class="h-5 w-5 ml-2" type="checkbox" v-model="checked" @change="setAutostart()"/>
      </div>
    </div>

    <div class="h-44 w-full bg-gray-100 rounded">
      <div class="w-full" v-if="(applicationName === 'Station' || applicationName === 'NUC') && applicationStatus === CONSTANT.STATUS_INSTALLED">
        <ApplicationScheduler />
      </div>

      <div v-else class="w-full flex flex-col items-center justify-center">
        <p class="text-black">Image</p>
      </div>
    </div>

    <div class="h-24 px-8 bg-gray-100 rounded flex items-center justify-between">
        <ApplicationManager />

        <StationSetup v-if="applicationName === 'Station' && applicationStatus === CONSTANT.STATUS_INSTALLED" />
        <NucSetup v-if="applicationName === 'NUC' && applicationStatus === CONSTANT.STATUS_INSTALLED" />

      <div
          v-if="applicationStatus === CONSTANT.STATUS_INSTALLED"
          class="w-32 h-12 cursor-pointer rounded-lg bg-red-400 items-center justify-center hover:bg-red-200"
          @click="deleteApplication"
      >
        Delete
      </div>
    </div>
  </div>
</template>
