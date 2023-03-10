<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import GenericButton from "../buttons/GenericButton.vue"
import * as CONSTANT from "../../assets/constants/_application"
import { useLibraryStore } from '../../store/libraryStore'
const libraryStore = useLibraryStore()

const applicationName = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.name : 'Unselected'
})

const enabled = ref();
const status = ref("Unknown");

/**
 * Create the Scheduler Task associated with the currently selected application. NOTE: A command window will be opened
 * with the outcome of the command.
 */
const createSchedulerTask = (): void => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.APPLICATION_SCHEDULER,
    type: "create",
    name: applicationName.value
  });
}

/**
 * Enable of disable the Scheduler Task associated with the currently selected application.
 */
const changeSchedulerTask = (): void => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.APPLICATION_SCHEDULER,
    type: enabled.value ? "disable" : "enable",
    name: applicationName.value
  });
}

/**
 * Delete the Scheduler Task associated with the currently selected application. NOTE: This will prompt a command window
 * to ask the user to enter a confirmation of deletion.
 */
const deleteSchedulerTask = (): void => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.APPLICATION_SCHEDULER,
    type: "delete",
    name: applicationName.value
  });
}

/**
 * Query the system to see if the currently selected application has a scheduler task assoicated with it.
 */
const listSchedulerTask = (): void => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.APPLICATION_SCHEDULER,
    type: "list",
    name: applicationName.value
  });
}

onMounted(() => {
  listSchedulerTask();

  // @ts-ignore
  api.ipcRenderer.on('scheduler_update', (event, data) => {
    if(data.type !== "list") {
      setTimeout(() => {
        listSchedulerTask();
      }, 1000)
    } else {
      enabled.value = data.message.includes("Ready") || data.message.includes("Running") ;
      status.value = data.message;
    }
  });
});
</script>

<!--Set up and manage the Task Scheduler items associated with the selected station.-->
<template>
  <div class="w-full flex flex-row px-4">
    <div v-if="status === ''" class="w-full flex-col items-center justify-around">
      <GenericButton
          class=" h-8 w-42 text-base font-poppins
          rounded-md bg-green-400 hover:bg-green-300"
          :callback="createSchedulerTask"
          :spinnerColor="'#000000'"
      >Create Scheduler Task</GenericButton>
    </div>

    <div v-else class="w-full">
      <pre class="w-full flex flex-col pt-4 items-left justify-center">
        {{ status }}
      </pre>

      <div class="w-full flex-col items-end justify-around">
        <GenericButton
            v-if="status !== ''"
            :class="{
              'h-8 w-24 text-base font-poppins rounded-md': true,
              'bg-green-400 hover:bg-green-300': !enabled,
              'bg-orange-400 hover:bg-orange-300': enabled,
            }"
            :callback="changeSchedulerTask"
            :spinnerColor="'#000000'"
        >{{enabled ? "Disable" : "Enable"}}</GenericButton>

        <GenericButton
            v-if="status !== ''"
            class="h-8 w-24 bg-white text-base
            text-red-400 font-poppins font-semibold
            rounded-md border-2 border-red-400 hover:bg-red-50"
            :callback="deleteSchedulerTask"
            :spinnerColor="'#000000'"
        >Delete</GenericButton>
      </div>
    </div>
  </div>
</template>
