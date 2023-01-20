<script setup lang="ts">
import { computed } from 'vue'
import * as CONSTANT from "../../assets/constants/_application"
import ApplicationManager from './ApplicationManager.vue'
import StationSetup from "../../modals/StationSetup.vue";
import NucSetup from "../../modals/NucSetup.vue";
import { useLibraryStore } from '../../store/libraryStore'
const libraryStore = useLibraryStore()

const applicationName = computed(() => {
    const app = libraryStore.getSelectedApplication
    return app !== undefined ? app.name : 'Unselected'
})

const applicationStatus = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.status : 'Unselected'
})

const deleteApplication = (): void => {
  if (libraryStore.getSelectedApplication === undefined) {
    return
  }

  const name = libraryStore.getSelectedApplication.name;

  libraryStore.updateApplicationStatusByName(name, CONSTANT.STATUS_NOT_INSTALLED);

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.APPLICATION_DELETE, {
    name
  })
}
</script>

<template>
    <div class="flex flex-col w-full [&>div]:my-2">
        <div class="h-12 bg-green-400 rounded flex items-center justify-center">
            <p class="text-black">Image</p>
        </div>
        <div class="h-24 px-12 bg-green-400 rounded flex items-center justify-between">
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
        <div class="h-12 bg-green-400 rounded flex items-center justify-center">
            <p class="text-black">{{ applicationName }}</p>
        </div>
    </div>
</template>
