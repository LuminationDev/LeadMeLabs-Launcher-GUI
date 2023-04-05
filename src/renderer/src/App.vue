<script setup lang="ts">
import { RouterView } from 'vue-router';
import Header from './layout/Header.vue';
import { AppEntry } from "./interfaces/appIntefaces";
import UpdateNotification from "./modals/UpdateNotification.vue";
import { Application } from "./models";
import * as CONSTANT from "./assets/constants/_application";
import { useLibraryStore } from './store/libraryStore';
const libraryStore = useLibraryStore();

//First this to do is check if any applications are installed - only register and trigger it on start up.
// @ts-ignore
api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
  channelType: CONSTANT.QUERY_INSTALLED
});

//Backend listener
// @ts-ignore
api.ipcRenderer.on('backend_message', (event, info) => {
  switch(info.channelType) {
    case "applications_installed":
      installedApplications(info.directory, info.content);
      break;

    case "app_manifest_query":
      manifestParams(info);
      break;

    case CONSTANT.CONFIG_APPLICATION_RETURN:
      configParams(info);
      break;

    case CONSTANT.APPLICATION_STOP:
      applicationStopped(info);
      break;

    case "application_imported":
      applicationImported(info);
      break;

    default:
      break;
  }
});

/**
 * Cycle through the supplied manifest list and update the individual entries within the library store.
 * @param directoryPath
 * @param appArray
 */
function installedApplications(directoryPath: string, appArray: Array<AppEntry>) {
  console.log(appArray);

  libraryStore.appDirectory = directoryPath;

  appArray.forEach(application => {
    //Detect if the application is an import
    if(application.altPath != '' && application.altPath != null) {
      let importedApp: Application = new Application(
          application.id,
          application.name,
          '',
          application.altPath,
          application.autostart,
          CONSTANT.STATUS_INSTALLED
      );

      //Add the application to the library list
      libraryStore.addImportApplication(importedApp);
    }
    else {
      libraryStore.updateApplicationStatusByName(application.name, CONSTANT.STATUS_INSTALLED);
      libraryStore.updateApplicationAutoStartByName(application.name, application.autostart);
    }

    //Open the application if required by autostart flag
    if (application.autostart) {
      // @ts-ignore
      api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
        channelType: CONSTANT.APPLICATION_LAUNCH,
        id: application.id,
        name: application.name,
        path: application.altPath === null ? "" : application.altPath
      });
    }
  });
}

/**
 * Populate the libraryStore with manifest parameters for the CustomModal
 * @param info
 */
function manifestParams(info: any) {
  console.log(info);
  libraryStore.applicationParameters = info.params;
}

/**
 * Populate the libraryStore with an applications current config
 * @param info
 */
function configParams(info: any) {
  libraryStore.applicationSetup = info.data;
}

/**
 * Notify the store that an application has stopped
 * @param info
 */
function applicationStopped(info: any) {
  libraryStore.updateApplicationStatusByName(info.name, CONSTANT.STATUS_INSTALLED);
}

/**
 * Confirmation that an application has been imported or removed correctly. This updates the library store with the
 * appropriate information.
 * @param info
 */
function applicationImported(info: any) {
  if(info.action === "import") {
    let application: Application = new Application(
        info.id,
        info.name,
        '',
        info.altPath,
        false,
        CONSTANT.STATUS_INSTALLED
    );

    //Add the application to the library list
    libraryStore.addImportApplication(application)
  } else if (info.action === "removed") {
    libraryStore.removeImportedApplication(info.name);
  }
}
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
