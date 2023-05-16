<script setup lang="ts">
import {computed, ref, watch} from "vue";
import GenericButton from "../../components/buttons/GenericButton.vue";
import * as CONSTANT from "../../assets/constants/_application"
import ApplicationScheduler from "./ApplicationScheduler.vue";

//TODO make the computed variables below generic and reusable
import { useLibraryStore } from "../../store/libraryStore";
const libraryStore = useLibraryStore();

const applicationName = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.name : 'Unselected'
});

const applicationStatus = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.status : 'Unselected'
});

const rewriteManifest = () => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.SCAN_MANIFEST
  });
}

const selectedImagePath = ref("");
const imageInput = ref<HTMLInputElement | null>(null);
const setImage = () => {
  selectedImagePath.value = imageInput.value.files[0]["path"];

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.APPLICATION_IMAGE_SET,
    name: applicationName.value,
    imagePath: selectedImagePath.value
  });
}

const imageSource = ref();

//If there is an alternate path recorded this means there may be a locally saved image
const imagePath = computed(async () => {
  const app = libraryStore.getSelectedApplication
  if (app === null || app === undefined) return null;
  if(app.name === "Station" || app.name === "NUC") return;

  const altPath = app.altPath;
  let inputUrl;
  let finalUrl;

  //Locate the image from the supplied path
  if (altPath !== null && altPath !== "") {
    //Get the parent folder
    const folder = altPath.substring(0, altPath.lastIndexOf("\\"));
    //Use the custom media loader protocol defined in the main.ts
    inputUrl = `media-loader://${folder}\\header.jpg`;

    try {
      finalUrl = await new Promise((resolve, reject) => {
        const image = new Image();
        image.src = inputUrl;
        image.onload = () => {
          resolve(inputUrl);
        }
        image.onerror = () => {
          reject(null);
        }
      });
    }
    catch (e) {
      finalUrl = null;
    }
  }

  //Check the local app directory as a backup.
  if (finalUrl === null){
    inputUrl = `media-loader://${libraryStore.appDirectory}\\${app.name}\\header.jpg`;

    try {
      finalUrl = await new Promise((resolve, reject) => {
        const image = new Image();
        image.src = inputUrl;
        image.onload = () => {
          resolve(inputUrl);
        }
        image.onerror = () => {
          reject(null);
        }
      });
    }
    catch (e) {
      finalUrl = null;
    }
  }

  imageSource.value = finalUrl;
});

watch(imagePath, (newVal) => {
  imageSource.value = newVal;
});
</script>

<template>
  <div class="h-44 w-full bg-gray-100 rounded">
    <div class="w-full" v-if="['Station', 'NUC'].includes(applicationName) && [CONSTANT.STATUS_INSTALLED, CONSTANT.STATUS_RUNNING].includes(applicationStatus)">
      <ApplicationScheduler />
    </div>

    <div v-else class="w-full flex flex-col items-center justify-center">
      <!--Perform an auto scan to see if anything is in the leadme_apps folder, rewriting the manifest if required-->
      <div v-if="libraryStore.checkIfApplicationInstalled('NUC') && libraryStore.checkIfApplicationInstalled('Station')" class="w-full flex justify-center items-center">
        <GenericButton
            id="share_button"
            class="h-10 w-48 -mt-0.5"
            :type="'primary'"
            :callback="rewriteManifest"
            :spinnerColor="'#000000'"
        >Scan manifest</GenericButton>
      </div>

      <div v-else-if="applicationStatus === CONSTANT.STATUS_NOT_INSTALLED" class="text-black">NOT INSTALLED</div>

      <div v-else-if="imageSource === null" class="text-black flex flex-col items-center">
        Image Not Found

        <label
            for="files"
            class="w-full h-8 mt-3 rounded-lg flex items-center justify-center text-white bg-primary cursor-pointer hover:bg-blue-400"
        >
          <input class="hidden" id="files" ref="imageInput" type="file" @change="setImage">
          Find Image
        </label>
      </div>

      <div v-else class="w-full h-full relative">
        <label
            for="files"
            class="w-6 h-6 absolute bottom-0 right-0 rounded-tl-lg bg-white cursor-pointer border-black border-2 hover:bg-blue-400"
        >
          <input class="hidden" id="files" ref="imageInput" type="file" @change="setImage">
        </label>
        <img class="w-full h-full" :src="imageSource" :alt="`${applicationName} Header image`"/>
      </div>
    </div>
  </div>
</template>
