<script setup lang="ts">
import { computed, onMounted } from 'vue';
import GenericButton from '../buttons/GenericButton.vue';
import * as CONSTANT from '../../assets/constants/index';
import { useLibraryStore } from '../../store/libraryStore';

const libraryStore = useLibraryStore();
const enabled = computed(() => { return libraryStore.schedulerTask.enabled });
const status = computed(() => { return libraryStore.schedulerTask.status });
const warning = computed(() => { return libraryStore.schedulerTask.warning });

/**
 * Create the Scheduler Task associated with the currently selected application. NOTE: A command window will be opened
 * with the outcome of the command.
 */
const createSchedulerTask = (): void => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_SCHEDULER,
    type: "create",
    name: libraryStore.getSelectedApplicationName
  });
}

/**
 * Enable of disable the Scheduler Task associated with the currently selected application.
 */
const changeSchedulerTask = (): void => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_SCHEDULER,
    type: enabled.value ? "disable" : "enable",
    name: libraryStore.getSelectedApplicationName
  });
}

/**
 * Delete the Scheduler Task associated with the currently selected application. NOTE: This will prompt a command window
 * to ask the user to enter a confirmation of deletion.
 */
const deleteSchedulerTask = (): void => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_SCHEDULER,
    type: "delete",
    name: libraryStore.getSelectedApplicationName
  });
}

onMounted(() => {
  libraryStore.listSchedulerTask();
});
</script>

<!--Set up and manage the Task Scheduler items associated with the selected station.-->
<template>
  <div class="w-full flex flex-row px-4">
    <div v-if="status === ''" class="w-full flex-col items-center justify-around">
      <GenericButton
          class=" h-8 w-42 text-base font-poppins text-white
          rounded-md bg-green-400 hover:bg-green-300"
          :callback="createSchedulerTask"
          :spinnerColor="'#000000'"
      >Create Scheduler Task</GenericButton>
    </div>

    <div v-else class="w-full">
      <div class="w-full flex flex-col items-left justify-center">
        <pre :class="{'h-36 -mt-5 mb-1 text-sm': warning.length > 0}"
        >
          {{ status }}
        </pre>

        <div v-if="warning.length > 0" class="w-full text-sm text-red-500">
          <p><span class="font-semibold">Warning:</span> {{ warning }}</p>
        </div>
      </div>

      <div class="w-full flex-col items-end justify-around">
        <GenericButton
            v-if="status !== ''"
            :class="{
              'h-8 w-24 text-base text-white font-poppins rounded-md': true,
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
