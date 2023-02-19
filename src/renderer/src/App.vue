<script setup lang="ts">
import { RouterView } from 'vue-router'
import Header from './layout/Header.vue'
import { AppEntry } from "./interfaces/appIntefaces";
import * as CONSTANT from "./assets/constants/_application";
import { useLibraryStore } from './store/libraryStore'
import UpdateNotification from "./modals/UpdateNotification.vue";
import { Application } from "./models";
import * as CONSTANTS from "./assets/constants/_application";

const libraryStore = useLibraryStore()

//First this to do is check if any applications are installed - only register and trigger it on start up.
// @ts-ignore
api.ipcRenderer.send('installed_applications');

// @ts-ignore
api.ipcRenderer.on('applications_installed', (event, appArray: Array<AppEntry>) => {
  //Cycle through the supplied manifest list and update the individual entries.
  appArray.forEach(application => {
    //Detect if the application is an import
    if(application.altPath != '' && application.altPath != null) {
      console.log(application);

      let importedApp: Application = new Application(
          application.id,
          application.name,
          '',
          application.altPath,
          CONSTANTS.STATUS_INSTALLED
      );

      //Add the application to the library list
      libraryStore.addImportApplication(importedApp)
    }
    else {
      console.log(application);
      libraryStore.updateApplicationStatusByName(application.name, CONSTANT.STATUS_INSTALLED);

      //Open the application if required by autostart flag
      if (application.autostart) {
        // @ts-ignore
        api.ipcRenderer.send(CONSTANT.APPLICATION_LAUNCH, {
          id: application.id,
          name: application.name
        })
      }
    }
  });
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
  <UpdateNotification />
</template>

<style lang="less">
@import './assets/css/styles.less';
</style>
