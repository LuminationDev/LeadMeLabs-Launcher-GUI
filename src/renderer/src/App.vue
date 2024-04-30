<script setup lang="ts">
import * as Sentry from "@sentry/electron";
import { RouterView } from 'vue-router';
import Header from './layout/Header.vue';
import Notification from "./modals/Notification.vue";
import * as CONSTANT from "./assets/constants/index";
import { onBeforeMount } from "vue";
import { backendListeners, initialise, statusListeners } from "@renderer/apiListeners";
import { useLibraryStore } from './store/libraryStore';

Sentry.init({
  dsn: "https://09dcce9f43346e4d8cadf213c0a0f082@o1294571.ingest.sentry.io/4505666781380608",
});

const libraryStore = useLibraryStore();

//First this to do is check if any applications are installed - only register and trigger it on start up.
// @ts-ignore
api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
  channelType: CONSTANT.MESSAGE.QUERY_INSTALLED
});

/**
 * Backend listener, any messages from the node backend are directed to this listener and then
 * triaged for the appropriate follow through.
 */
//@ts-ignore
api.ipcRenderer.on('backend_message', (event, info) => {
  backendListeners(info);
});

/**
 * Backend listener, any messages that relate to updating the status of an application.
 */
api.ipcRenderer.on('status_message', (event, info) => {
  statusListeners(info);
});

onBeforeMount(() => {
  initialise();
});
</script>

<template>
  <div class="flex flex-col bg-white rounded-3xl mb-2">
    <Header />
  </div>
  <div class="content flex flex-row w-full">
    <RouterView />
  </div>

  <!--Modal to handle entire application updates-->
  <Notification />
</template>

<style lang="less">
@import './assets/css/styles.less';
</style>
