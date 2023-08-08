<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import * as CONSTANT from '../../assets/constants/index';
import Spinner from "../loading/Spinner.vue";
import BaseProgress from "../loading/BaseProgress.vue";
import GenericButton from "../buttons/GenericButton.vue";
import ErrorNotification from "../../modals/ErrorNotification.vue";
import { useLibraryStore } from '../../store/libraryStore';

const libraryStore = useLibraryStore();
const download_progress = ref(0);
const showError = ref(false);
const errorMessage = ref("");

const closeErrorModal = () => {
  showError.value = false;
}

const selectedApplication = computed(() => {
  return libraryStore.getSelectedApplication
})

/**
 * Start a process for the application that has been selected, the backend will start a leadme_apps application or
 * follow the altPath if it is supplied/not null.
 */
const launchApplication = (): void => {
  if (selectedApplication.value === undefined) {
    return
  }

  libraryStore.updateApplicationByName(
      selectedApplication.value.name,
      CONSTANT.MODEL_KEY.KEY_STATUS,
      CONSTANT.MODEL_VALUE.STATUS_RUNNING);

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_LAUNCH,
    id: selectedApplication.value.id,
    name: selectedApplication.value.name,
    host: libraryStore.getHostURL,
    path: selectedApplication.value.altPath
  })
}

/**
 * Stop an application that is running. It sends an api call to the backend to call a kill process based on the name or
 * alternate path that is supplied.
 */
const stopApplication = (): void => {
  if (selectedApplication.value === undefined) {
    return
  }

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_STOP,
    id: selectedApplication.value.id,
    name: selectedApplication.value.name,
    altPath: selectedApplication.value.altPath
  });
}

/**
 * Send an api call to the backend asking to download an application. The applications' download URL is supplied along
 * with its name and the folder it should be saved in.
 */
const downloadApplication = (): void => {
  if (selectedApplication.value === undefined) {
    return
  }

  libraryStore.updateApplicationByName(
      selectedApplication.value.name,
      CONSTANT.MODEL_KEY.KEY_STATUS,
      CONSTANT.MODEL_VALUE.STATUS_DOWNLOADING);

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_DOWNLOAD,
    name: selectedApplication.value.name,
    host: libraryStore.getHostURL,
    url: selectedApplication.value.url,
    properties: { directory: `leadme_apps/${selectedApplication.value.name}` }
  })
}

//Todo maybe move to App.vue in the future
onMounted(() => {
  // @ts-ignore
  api.ipcRenderer.on('download_progress', (event, progress) => {
    download_progress.value = progress * 100;
  })

  //TODO DO NOT DOUBLE THIS UP?
  // @ts-ignore
  api.ipcRenderer.on('status_update', (event, status) => {
    if(status.message === 'Clean up complete') {
      libraryStore.updateApplicationByName(
          status.name,
          CONSTANT.MODEL_KEY.KEY_STATUS,
          CONSTANT.MODEL_VALUE.STATUS_INSTALLED);
    }

    if(status.message === 'Server offline' && libraryStore.getApplicationByName(status.name).status != CONSTANT.MODEL_VALUE.STATUS_RUNNING) {
      libraryStore.updateApplicationByName(
          status.name,
          CONSTANT.MODEL_KEY.KEY_STATUS,
          CONSTANT.MODEL_VALUE.STATUS_NOT_INSTALLED);

      //Show warning message?
      errorMessage.value = status.message;
      showError.value = true;
    }
  });
});

const pauseDownloadingApplication = (): void => {
  if (selectedApplication.value === undefined) {
    return
  }
  // ipcRenderer.send(CONSTANT.APPLICATION_PAUSE_DOWNLOAD, {
  //     name: selectedApplication.value.name,
  //     url: selectedApplication.value.url
  //     //properties: { directory: '../leadme_apps/' + selectedApplication.value.name }
  // })
}

const resumeDownloadingApplication = (): void => {
  if (selectedApplication.value === undefined) {
    return
  }
  // ipcRenderer.send(CONSTANT.APPLICATION_RESUME_DOWNLOAD, {
  //     name: selectedApplication.value.name,
  //     url: selectedApplication.value.url
  //     //properties: { directory: '../leadme_apps/' + selectedApplication.value.name }
  // })
}
</script>

<!--Manage the installing and launching of an application.-->
<template>
  <ErrorNotification @close-error-modal="closeErrorModal" :show-error="showError" :message="errorMessage"/>

  <GenericButton
      v-if="libraryStore.getSelectedApplicationStatus === CONSTANT.MODEL_VALUE.STATUS_INSTALLED"
      class="h-10 w-32 text-base"
      :type="'primary'"
      :callback="launchApplication"
      :spinnerColor="'#000000'"
  >Launch</GenericButton>

  <GenericButton
      v-if="libraryStore.getSelectedApplicationStatus === CONSTANT.MODEL_VALUE.STATUS_RUNNING"
      class="h-10 w-32 bg-red-400 text-base hover:bg-red-200"
      :type="'primary'"
      :callback="stopApplication"
      :spinnerColor="'#000000'"
  >Stop</GenericButton>

  <GenericButton
      v-if="libraryStore.getSelectedApplicationStatus === CONSTANT.MODEL_VALUE.STATUS_NOT_INSTALLED"
      class="h-10 w-32 text-base"
      :type="'primary'"
      :callback="downloadApplication"
      :spinnerColor="'#000000'"
  >Install</GenericButton>

  <div v-else-if="libraryStore.getSelectedApplicationStatus === CONSTANT.MODEL_VALUE.STATUS_DOWNLOADING" class="flex flex-col">
    <div
        class="w-32 h-8 mb-2 cursor-pointer rounded-lg bg-blue-400 items-center justify-center hover:bg-blue-200"
        @click="pauseDownloadingApplication"
    >
      <Spinner />
    </div>
    <BaseProgress :percentage="download_progress" :color="'gray'" class="mx-2 h-5"/>
  </div>

  <div
      v-else-if="libraryStore.getSelectedApplicationStatus === CONSTANT.MODEL_VALUE.STATUS_PAUSED_DOWNLOADING"
      class="w-32 h-12 cursor-pointer rounded-lg bg-blue-400 items-center justify-center hover:bg-blue-200"
      @click="resumeDownloadingApplication"
  >
    Paused
  </div>
</template>
