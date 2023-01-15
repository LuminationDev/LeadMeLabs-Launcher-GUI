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
    <div class="w-44 h-12 bg-green-400 rounded flex items-center justify-center">
        <p class="text-black">Home Page</p>
    </div>
</template>
