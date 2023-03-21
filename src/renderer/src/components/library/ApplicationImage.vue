<script setup lang="ts">
import { computed } from "vue";
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


//If there is an alternate path recorded this means there may be a locally saved image
const imagePath = computed(() => {
  const app = libraryStore.getSelectedApplication
  if(app === null || app === undefined) return null;

  const altPath = app.altPath;

  //TODO load an image of the application in
  //Locate the image from the supplied path
  if(altPath !== null && altPath !== "") {
    console.log(altPath);

    //Get the parent folder
    const folder = altPath.substring(0, altPath.lastIndexOf("/"));
  }

  //Locate the image from the leadme_apps path
  if(app.name !== "Station" || app.name !== "NUC") {

  }

  return null;
});
</script>

<template>
  <div class="h-44 w-full bg-gray-100 rounded">
    <div class="w-full" v-if="['Station', 'NUC'].includes(applicationName) && [CONSTANT.STATUS_INSTALLED, CONSTANT.STATUS_RUNNING].includes(applicationStatus)">
      <ApplicationScheduler />
    </div>

    <div v-else class="w-full flex flex-col items-center justify-center">
      <div v-if="applicationStatus === CONSTANT.STATUS_NOT_INSTALLED" class="text-black">NOT INSTALLED</div>
      <div v-else-if="imagePath === null" class="text-black">Image Not Found</div>
      <img v-else src="" :alt="`${applicationName} Header image`"/>
    </div>
  </div>
</template>
