<script setup lang="ts">
import * as CONSTANT from "../../assets/constants/index";
import ApplicationManager from './ApplicationManager.vue';
import StationSetup from "../../modals/StationSetup.vue";
import NucSetup from "../../modals/NucSetup.vue";
import CustomSetup from "../../modals/CustomSetup.vue";
import ConfirmPrompt from "@renderer/modals/ConfirmPrompt.vue";
import ElectronSetup from "@renderer/modals/ElectronSetup.vue";
import { useLibraryStore } from '../../store/libraryStore';

const libraryStore = useLibraryStore();

const deleteApplication = (): void => {
  let app = libraryStore.getSelectedApplication;
  if (app === undefined) {
    return
  }

  libraryStore.updateApplicationByName(app.name, CONSTANT.MODEL_KEY.KEY_STATUS, CONSTANT.MODEL_VALUE.STATUS_NOT_INSTALLED);

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_DELETE,
    wrapperType: app.wrapperType,
    name: app.name,
    altPath: app.altPath
  });

  //Reset the selected application
  libraryStore.selectedApplication = undefined;
}
</script>

<template>
  <div v-if="libraryStore.selectedApplication !== undefined" class="h-24 px-8 bg-gray-100 rounded flex items-center justify-between">
    <ApplicationManager />

    <StationSetup v-if="libraryStore.getSelectedApplicationName === 'Station'
      && [CONSTANT.MODEL_VALUE.STATUS_INSTALLED, CONSTANT.MODEL_VALUE.STATUS_RUNNING].includes(libraryStore.getSelectedApplicationStatus)" />

    <NucSetup v-else-if="libraryStore.getSelectedApplicationName === 'NUC'
      && [CONSTANT.MODEL_VALUE.STATUS_INSTALLED, CONSTANT.MODEL_VALUE.STATUS_RUNNING].includes(libraryStore.getSelectedApplicationStatus)" />

    <ElectronSetup v-else-if="libraryStore.getSelectedApplication.wrapperType !== undefined
      && [CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL].includes(libraryStore.getSelectedApplication.wrapperType)
      && !libraryStore.getSelectedApplication.setup
      && [CONSTANT.MODEL_VALUE.STATUS_INSTALLED, CONSTANT.MODEL_VALUE.STATUS_RUNNING].includes(libraryStore.getSelectedApplicationStatus)" />

    <CustomSetup v-else-if=" libraryStore.getSelectedApplicationName !== 'Station'
      && libraryStore.getSelectedApplicationName !== 'NUC'
      && !libraryStore.getSelectedApplication.setup
      && [CONSTANT.MODEL_VALUE.STATUS_INSTALLED, CONSTANT.MODEL_VALUE.STATUS_RUNNING].includes(libraryStore.getSelectedApplicationStatus)"
    />

    <ConfirmPrompt
      :title="'Delete ' + libraryStore.getSelectedApplicationName"
      :message="'WARNING: This cannot be undone, any setup associated with the ' +
               libraryStore.getSelectedApplicationName + ' will be delete along with the software.'"
      :callback="deleteApplication"/>
  </div>
</template>
