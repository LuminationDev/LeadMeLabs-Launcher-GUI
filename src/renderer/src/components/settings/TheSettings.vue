<script setup lang="ts">
import * as CONSTANT from "../../assets/constants/index";
import { useLibraryStore } from "../../store/libraryStore";
import ModeSelection from "@renderer/components/settings/ModeSelection.vue";
import LauncherDetails from "@renderer/components/settings/LauncherDetails.vue";
import PinSettings from "@renderer/components/settings/PinSettings.vue";
import { onBeforeMount, ref } from "vue";
import PinPrompt from "@renderer/modals/PinPrompt.vue";

const libraryStore = useLibraryStore();
const authorised = ref(false);

/**
 * Update the Launcher's manifest entry with the new details about the program. The details
 * are supplied in an object containing the key and value to be set. This is specifically for Application
 * parameters not straight application values.
 * @param obj A generic object containing a key and value parameter.
 */
const writeManifestParameter = (obj: any) => {
  //@ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_PARAMETERS,
    name: CONSTANT.NAME.LAUNCHER_NAME,
    value: JSON.stringify({[obj.key]: obj.value})
  });
}

const writeManifest = (obj: any) => {
  //@ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_SET_PARAMETERS,
    name: CONSTANT.NAME.LAUNCHER_NAME,
    parameterKey: obj.key,
    parameterValue: obj.value
  });
}

const pinRef = ref<InstanceType<typeof PinPrompt> | null>(null)
const openPinPromptModal = () => {
  if(libraryStore.pin !== '') {
    pinRef.value?.openModal();
  } else {
    authorised.value = true;
  }
}

onBeforeMount(() => {
  setTimeout(() =>
    openPinPromptModal(), 100
  );
})
</script>

<template>
  <PinPrompt ref="pinRef" :callback="() => authorised = true"/>

  <div class="w-full h-auto flex flex-col">
    <div v-if="!authorised" class="flex items-center justify-center h-64">
      Please enter the correct pin.
    </div>

    <div v-else class="w-full h-auto my-4 flex flex-col">
      <LauncherDetails />
      <PinSettings @config-change="writeManifestParameter"/>
      <ModeSelection @config-change="writeManifest"/>
    </div>
  </div>
</template>
