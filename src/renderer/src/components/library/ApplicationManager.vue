<script setup lang="ts">
import {onMounted, ref} from 'vue'
import { useLibraryStore } from '../../store/libraryStore'
import * as CONSTANT from '../../assets/constants/_application'

// Does not like require here...
// const { ipcRenderer } = require('electron')

const libraryStore = useLibraryStore()
const selectedApplication = libraryStore.getSelectedApplication
const applicationStatus = ref(selectedApplication.install_status)

const launchApplication = (): void => {
  if (selectedApplication === undefined) {
      return
  }

  api.ipcRenderer.send(CONSTANT.APPLICATION_LAUNCH, {
    id: selectedApplication.id,
    name: selectedApplication.name,
    properties: { directory: `leadme_apps/${selectedApplication.name}` }
  })
}

const downloadApplication = (): void => {
  if (selectedApplication === undefined) {
      return
  }

  api.ipcRenderer.send(CONSTANT.APPLICATION_DOWNLOAD, {
    name: selectedApplication.name,
    url: selectedApplication.url,
    properties: { directory: `leadme_apps/${selectedApplication.name}` }
  })
}

//onMounted(() => {
  api.ipcRenderer.on('download_progress', (event, progress) => {
    console.log(event)
    console.log(progress) // Progress in fraction, between 0 and 1
    // const progressInPercentages = progress * 100 // With decimal point and a bunch of numbers
    // const cleanProgressInPercentages = Math.floor(progress * 100) // Without decimal point
  })

  api.ipcRenderer.on('status_update', (event, status) => {
    console.log(event)
    console.log(status) // Progress in fraction, between 0 and 1
    // const progressInPercentages = progress * 100 // With decimal point and a bunch of numbers
    // const cleanProgressInPercentages = Math.floor(progress * 100) // Without decimal point
  })
//})

const pauseDownloadingApplication = (): void => {
    if (selectedApplication === undefined) {
        return
    }
    // ipcRenderer.send(CONSTANT.APPLICATION_PAUSE_DOWNLOAD, {
    //     name: selectedApplication.name,
    //     url: selectedApplication.url
    //     //properties: { directory: '../leadme_apps/' + selectedApplication.name }
    // })
}

const resumeDownloadingApplication = (): void => {
    if (selectedApplication === undefined) {
        return
    }
    // ipcRenderer.send(CONSTANT.APPLICATION_RESUME_DOWNLOAD, {
    //     name: selectedApplication.name,
    //     url: selectedApplication.url
    //     //properties: { directory: '../leadme_apps/' + selectedApplication.name }
    // })
}
</script>

<template>
    <div
        v-if="applicationStatus === CONSTANT.STATUS_INSTALLED"
        class="w-32 h-12 cursor-pointer rounded-lg bg-blue-400 items-center justify-center hover:bg-blue-200"
        @click="launchApplication"
    >
        Launch
    </div>

    <div
        v-else-if="applicationStatus === CONSTANT.STATUS_NOT_INSTALLED"
        class="w-32 h-12 cursor-pointer rounded-lg bg-blue-400 items-center justify-center hover:bg-blue-200"
        @click="downloadApplication"
    >
        Install
    </div>

    <div
        v-else-if="applicationStatus === CONSTANT.STATUS_DOWNLOADING"
        class="w-32 h-12 cursor-pointer rounded-lg bg-blue-400 items-center justify-center hover:bg-blue-200"
        @click="pauseDownloadingApplication"
    >
        Pause
    </div>

    <div
        v-else-if="applicationStatus === CONSTANT.STATUS_PAUSED_DOWNLOADING"
        class="w-32 h-12 cursor-pointer rounded-lg bg-blue-400 items-center justify-center hover:bg-blue-200"
        @click="resumeDownloadingApplication"
    >
        Paused
    </div>
</template>
