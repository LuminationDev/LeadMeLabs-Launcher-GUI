<script setup lang="ts">
import { computed, onBeforeMount, ref } from "vue";
import * as CONSTANT from "../../assets/constants/_application";
import { useLibraryStore } from "../../store/libraryStore";

const libraryStore = useLibraryStore();
const modeCheck = computed(() => {
  return libraryStore.mode;
});

const devCheck = ref(false);
const offlineCheck = ref(false);
const localCheck = ref(false);

const enableDevelopmentMode = () => {
  localCheck.value = devCheck.value ? false : localCheck.value;
  offlineCheck.value = devCheck.value ? false : offlineCheck.value;

  libraryStore.mode = devCheck.value ? "development" : "production";

  writeManifest();
}

const enableOfflineMode = () => {
  localCheck.value = offlineCheck.value ? false : localCheck.value;
  devCheck.value = offlineCheck.value ? false : devCheck.value;

  libraryStore.mode = offlineCheck.value ? "offline" : "production";

  writeManifest();
}

const enableLocalMode = () => {
  devCheck.value = localCheck.value ? false : devCheck.value;
  offlineCheck.value = localCheck.value ? false : offlineCheck.value;

  libraryStore.mode = localCheck.value ? "local" : "production";

  writeManifest();
}

const writeManifest = () => {
  //@ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.LAUNCHER_CONFIG,
    name: CONSTANT.LAUNCHER_NAME,
    mode: modeCheck.value
  });
}

onBeforeMount(() => {
  if (libraryStore.mode === "development") {
    devCheck.value = true;
  } else if (libraryStore.mode === "local") {
    localCheck.value = true;
  } else if (libraryStore.mode === "offline") {
    offlineCheck.value = true;
  }
});
</script>

<template>
  <div class="w-full h-auto my-4 flex flex-col">
    <p class="text-lg text-black mb-3">Settings Page</p>

    <div class="flex flex-row items-center mb-4">
      <input class="h-5 w-5 ml-2 mr-2" type="checkbox" v-model="devCheck" @change="enableDevelopmentMode"/>
      <p>Development Mode</p>
    </div>

    <div class="flex flex-row items-center mb-4">
      <input class="h-5 w-5 ml-2 mr-2" type="checkbox" v-model="offlineCheck" @change="enableOfflineMode"/>
      <p>Offline Mode</p>
    </div>

    <div class="flex flex-row items-center">
      <input class="h-5 w-5 ml-2 mr-2" type="checkbox" v-model="localCheck" @change="enableLocalMode"/>
      <p>Local Mode</p>
    </div>
  </div>
</template>
