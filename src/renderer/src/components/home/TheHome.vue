<script setup lang="ts">
import * as CONSTANT from '../../assets/constants/_application'
import { AppEntry } from "../../interfaces/appIntefaces";
import { useLibraryStore } from '../../store/libraryStore'

const libraryStore = useLibraryStore()

/**
 * When the libraryStore is created send of an api call to check what applications are currently installed.
 */
function checkApplications() {
  // @ts-ignore
  api.ipcRenderer.send('installed_applications', {})

  //First this to do is check if any applications are installed
  // @ts-ignore
  api.ipcRenderer.on('applications_installed', (event, appArray: Array<AppEntry>) => {

    //Cycle through the supplied manifest list and update the individual entries.
    appArray.forEach(application => {
      console.log(application)
      libraryStore.updateApplicationStatusByName(application.name, CONSTANT.STATUS_INSTALLED);

      //Open the application if required by autostart flag
      if(application.autostart) {
        // @ts-ignore
        api.ipcRenderer.send(CONSTANT.APPLICATION_LAUNCH, {
          id: application.id,
          name: application.name
        })
      }
    });
  });
}
checkApplications();
</script>

<template>
    <div class="w-full h-16 my-4 flex flex-col">
      <p class="text-lg text-black mb-3">Home Page</p>
      <p class="text-sm text-black">Not yet implemented</p>
    </div>
</template>
