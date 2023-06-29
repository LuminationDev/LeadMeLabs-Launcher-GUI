<script setup lang="ts">
import { computed, ref } from 'vue'
import * as CONSTANT from "../../assets/constants/_application"
import ApplicationBar from "./ApplicationBar.vue";
import ApplicationImage from "./ApplicationImage.vue";
import { useLibraryStore } from '../../store/libraryStore'
import UploadLogFile from "../../modals/UploadLogFile.vue";
import EnableRemoteConfig from "../../modals/EnableRemoteConfig.vue";
const libraryStore = useLibraryStore();

//Track if the application has auto enabled in the manifest
const checked = ref();
const applicationName = computed(() => {
    const app = libraryStore.getSelectedApplication

    if(app == undefined) {
      checked.value = false;
      return 'Unselected';
    } else {
      checked.value = app.autoStart;
      return app.name;
    }
});

const applicationStatus = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.status : 'Unselected'
});

const applicationAutoStart = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.autoStart : false;
});

const setAutostart = (): void => {
  libraryStore.updateApplicationAutoStartByName(applicationName.value, checked.value);

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.APPLICATION_AUTOSTART,
    name: applicationName.value,
    autostart: applicationAutoStart.value
  });
}
</script>

<template>
  <div class="flex flex-col w-full [&>div]:my-2 mb-4">
    <div class="h-6 text-xl rounded flex items-baseline justify-between">
      <p class="text-black font-bold">{{ applicationName }}</p>

      <div v-if="[CONSTANT.STATUS_INSTALLED, CONSTANT.STATUS_RUNNING].includes(applicationStatus)" class="text-sm">
        <p>Auto Start</p>
        <input class="h-5 w-5 ml-2 mr-2" type="checkbox" v-model="checked" @change="setAutostart()"/>

        <UploadLogFile v-if="['Station', 'NUC'].includes(applicationName)" :software-name="applicationName" />
        <EnableRemoteConfig v-if="['Station', 'NUC'].includes(applicationName)" />
      </div>
    </div>

    <ApplicationImage />

    <ApplicationBar />
  </div>
</template>
