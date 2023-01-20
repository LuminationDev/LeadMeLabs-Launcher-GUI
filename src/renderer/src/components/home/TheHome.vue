<script setup lang="ts">
import * as CONSTANT from '../../assets/constants/_application'
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
  api.ipcRenderer.on('applications_installed', (event, dictionary) => {
    console.log(event)
    console.log(dictionary)

    for (let key: string in dictionary) {
      let installed = dictionary[key];

      if(installed) {
        libraryStore.updateApplicationStatusByName(key, CONSTANT.STATUS_INSTALLED);
      }
    }
  })
}
checkApplications();
</script>

<template>
    <div class="w-full h-16 my-4 flex flex-col">
      <p class="text-lg text-black mb-3">Home Page</p>
      <p class="text-sm text-black">Not yet implemented</p>
    </div>
</template>
