<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
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

<template>
  <div class="w-full flex flex-row px-4">
    <div v-if="status === ''" class="w-full flex-col items-center justify-around">
      <div
          class="w-24 h-8 cursor-pointer rounded-lg bg-green-400 items-center justify-center hover:bg-green-200"
          @click="createSchedulerTask"
      >
        Create
      </div>
    </div>

    <div v-else class="w-full">
      <pre class="w-full flex flex-col pt-4 items-left justify-center">
        {{ status }}
      </pre>

      <div class="w-full flex-col items-end justify-around">
        <div
            v-if="status !== ''"
            class="w-24 h-8 cursor-pointer rounded-lg bg-green-400 items-center justify-center hover:bg-green-200"
            @click="changeSchedulerTask"
        >
          {{enabled ? "Disable" : "Enable"}}
        </div>

        <div
            v-if="status !== ''"
            class="w-24 h-8 cursor-pointer rounded-lg bg-orange-400 items-center justify-center hover:bg-orange-200"
            @click="deleteSchedulerTask"
        >
          Delete
        </div>
      </div>
    </div>
  </div>
</template>
