<script setup lang="ts">
import { computed, ref } from 'vue'
import * as CONSTANT from "../../assets/constants/index"
import ApplicationBar from "./ApplicationButtons.vue";
import ApplicationImage from "./ApplicationDetails.vue";
import { useLibraryStore } from '../../store/libraryStore'
import UploadLogFile from "../../modals/UploadLogFile.vue";
import EnableRemoteConfig from "../../modals/EnableRemoteConfig.vue";

const libraryStore = useLibraryStore();

//Track if the application has auto enabled in the manifest
const autoChecked = ref();
const applicationName = computed(() => {
  const app = libraryStore.getSelectedApplication

  if(app == undefined) {
    autoChecked.value = false;
    return 'Unselected';
  } else {
    autoChecked.value = app.autostart;
    vrChecked.value = app.parameters.vrManifest ?? false;
    return app.name;
  }
});

const applicationAutoStart = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.autostart : false;
});

const setAutostart = (): void => {
  libraryStore.updateApplicationByName(applicationName.value, CONSTANT.MODEL_KEY.KEY_AUTOSTART, autoChecked.value);

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_SET_PARAMETERS,
    name: applicationName.value,
    parameterKey: CONSTANT.MODEL_KEY.KEY_AUTOSTART,
    parameterValue: applicationAutoStart.value
  });
}

//Track if the application has vr manifest enabled
const vrChecked = ref();
const setVRManifest = (): void => {
  libraryStore.updateApplicationParameterByName(applicationName.value, CONSTANT.MODEL_KEY.KEY_VR_MANIFEST, vrChecked.value);

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.VR_MANIFEST,
    name: applicationName.value,
    id: libraryStore.getSelectedApplication?.id,
    altPath: libraryStore.getSelectedApplication?.altPath,
    add: vrChecked.value,
    value: JSON.stringify({[CONSTANT.MODEL_KEY.KEY_VR_MANIFEST]: vrChecked.value})
  });
}
</script>

<template>
  <div class="flex flex-col w-full [&>div]:my-2 mb-4">
    <div class="h-6 text-xl rounded flex items-baseline justify-between">
      <p class="text-black font-bold">{{ applicationName }}</p>

      <div v-if="[CONSTANT.MODEL_VALUE.STATUS_INSTALLED, CONSTANT.MODEL_VALUE.STATUS_RUNNING].includes(libraryStore.getSelectedApplicationStatus)
      && libraryStore.getSelectedApplication.wrapperType !== CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL" class="text-sm">
        <div v-if="!['Station', 'NUC'].includes(applicationName)">
          <p>VR Manifest</p>
          <input class="h-5 w-5 ml-2 mr-6" type="checkbox" v-model="vrChecked" @change="setVRManifest()"/>
        </div>

        <p>Auto Start</p>
        <input class="h-5 w-5 ml-2 mr-2" type="checkbox" v-model="autoChecked" @change="setAutostart()"/>

        <UploadLogFile v-if="['Station', 'NUC'].includes(applicationName)" :software-name="applicationName" />
        <EnableRemoteConfig v-if="['Station', 'NUC'].includes(applicationName)" />
      </div>
    </div>

    <ApplicationImage />

    <ApplicationBar />
  </div>
</template>
