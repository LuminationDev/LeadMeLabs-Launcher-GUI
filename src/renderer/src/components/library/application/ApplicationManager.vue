<script setup lang="ts">
import { computed } from 'vue';
import * as CONSTANT from '../../../assets/constants';
import Spinner from "../../loading/Spinner.vue";
import GenericButton from "../../buttons/GenericButton.vue";
import ErrorNotification from "../../../modals/ErrorNotification.vue";
import { useLibraryStore } from '../../../store/libraryStore';

const libraryStore = useLibraryStore();

const selectedApplication = computed(() => {
  return libraryStore.getSelectedApplication
})

/**
 * Start a process for the application that has been selected, the backend will start a leadme_apps application or
 * follow the altPath if it is supplied/not null.
 */
const launchApplication = async (): Promise<void> => {
  if (selectedApplication.value === undefined) return;

  //Imported applications do not have a host associated with them
  let host;
  if (selectedApplication.value.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_IMPORTED) {
    host = "";
  } else {
    host = await libraryStore.getHostURL(selectedApplication.value.wrapperType, selectedApplication.value.name);
  }

  if (host === undefined) return;

  libraryStore.updateApplicationByName(
      selectedApplication.value.name,
      CONSTANT.MODEL_KEY.KEY_STATUS,
      CONSTANT.MODEL_VALUE.STATUS_RUNNING);

  const alias = selectedApplication.value.alias !== undefined ? selectedApplication.value.alias : selectedApplication.value.name;

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_LAUNCH,
    id: selectedApplication.value.id,
    wrapperType: selectedApplication.value.wrapperType,
    name: selectedApplication.value.name,
    alias,
    host: host,
    path: selectedApplication.value.altPath
  })
}

const updateApplication = async (): Promise<void> => {
  if (selectedApplication.value === undefined) return;

  const host = await libraryStore.getHostURL(selectedApplication.value.wrapperType, selectedApplication.value.name);
  if (host === undefined) return;

  libraryStore.updateApplicationByName(
      selectedApplication.value.name,
      CONSTANT.MODEL_KEY.KEY_STATUS,
      CONSTANT.MODEL_VALUE.STATUS_DOWNLOADING);

  const alias = selectedApplication.value.alias !== undefined ? selectedApplication.value.alias : selectedApplication.value.name;

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_UPDATE,
    id: selectedApplication.value.id,
    wrapperType: selectedApplication.value.wrapperType,
    name: selectedApplication.value.name,
    alias,
    host: host,
    path: selectedApplication.value.altPath,
    updateOnly: true
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
const downloadApplication = async (): Promise<void> => {
  if (selectedApplication.value === undefined) return;

  const host = await libraryStore.getHostURL(selectedApplication.value.wrapperType, selectedApplication.value.name);
  if (host === undefined) return;

  libraryStore.updateApplicationByName(
      selectedApplication.value.name,
      CONSTANT.MODEL_KEY.KEY_STATUS,
      CONSTANT.MODEL_VALUE.STATUS_DOWNLOADING);

  const alias = selectedApplication.value.alias !== undefined ? selectedApplication.value.alias : selectedApplication.value.name;

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_DOWNLOAD,
    name: selectedApplication.value.name,
    alias,
    host: host,
    url: selectedApplication.value.url,
    wrapperType: selectedApplication.value.wrapperType,
    properties: { directory: `leadme_apps/${selectedApplication.value.name}` }
  })
}
</script>

<!--Manage the installing and launching of an application.-->
<template>
  <ErrorNotification />

  <!--Do not show the launch button if the application is of type Tool and has not been setup-->
  <GenericButton
      v-if="libraryStore.getSelectedApplicationStatus === CONSTANT.MODEL_VALUE.STATUS_INSTALLED
      && !(libraryStore.getSelectedApplication.wrapperType !== undefined &&
          [CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL, CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED].includes(libraryStore.getSelectedApplication.wrapperType) &&
          !libraryStore.getSelectedApplication.setup)"
      class="h-10 w-32 text-base"
      :type="'primary'"
      :callback="launchApplication"
      :spinnerColor="'#000000'"
  >Launch</GenericButton>

  <GenericButton
      v-if="libraryStore.getSelectedApplicationStatus === CONSTANT.MODEL_VALUE.STATUS_INSTALLED
        && libraryStore.getSelectedApplication.wrapperType === CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED"
      class="h-10 w-32 text-base"
      :type="'primary'"
      :callback="updateApplication"
      :spinnerColor="'#000000'"
  >Update</GenericButton>

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
    >
      <Spinner />
    </div>
  </div>
</template>
