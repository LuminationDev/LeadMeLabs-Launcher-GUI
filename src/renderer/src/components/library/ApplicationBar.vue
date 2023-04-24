<script setup lang="ts">
import { computed } from "vue";
import * as CONSTANT from "../../assets/constants/_application"
import ApplicationManager from './ApplicationManager.vue'
import StationSetup from "../../modals/StationSetup.vue";
import NucSetup from "../../modals/NucSetup.vue";
import CustomSetup from "../../modals/CustomSetup.vue";
import { useLibraryStore } from '../../store/libraryStore'
import GenericButton from "../buttons/GenericButton.vue";
const libraryStore = useLibraryStore();

const applicationName = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.name : 'Unselected'
});

const applicationStatus = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.status : 'Unselected'
});

const deleteApplication = (): void => {
  let app = libraryStore.getSelectedApplication;
  if (app === undefined) {
    return
  }

  libraryStore.updateApplicationStatusByName(app.name, CONSTANT.STATUS_NOT_INSTALLED);

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.APPLICATION_DELETE,
    name: app.name,
    altPath: app.altPath
  });

  //Reset the selected application
  libraryStore.selectedApplication = undefined;
}
</script>

<template>
  <div class="h-24 px-8 bg-gray-100 rounded flex items-center justify-between">
    <ApplicationManager />

    <StationSetup v-if="applicationName === 'Station' && [CONSTANT.STATUS_INSTALLED, CONSTANT.STATUS_RUNNING].includes(applicationStatus)" />
    <NucSetup v-else-if="applicationName === 'NUC' && [CONSTANT.STATUS_INSTALLED, CONSTANT.STATUS_RUNNING].includes(applicationStatus)" />
    <CustomSetup v-else-if="
          applicationName !== 'Station'
          && applicationName !== 'NUC'
          && [CONSTANT.STATUS_INSTALLED, CONSTANT.STATUS_RUNNING].includes(applicationStatus)"
    />

    <GenericButton
        v-if="[CONSTANT.STATUS_INSTALLED, CONSTANT.STATUS_RUNNING].includes(applicationStatus)"
        class="h-10 w-32 bg-white text-base
        text-red-400 font-poppins font-semibold
        rounded-md border-2 border-red-400 hover:bg-red-50"
        :callback="deleteApplication"
        :spinnerColor="'#000000'"
    >Delete</GenericButton>
  </div>
</template>
