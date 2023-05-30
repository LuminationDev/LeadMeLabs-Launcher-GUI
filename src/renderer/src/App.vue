<script setup lang="ts">
import { RouterView } from 'vue-router';
import Header from './layout/Header.vue';
import { AppEntry } from "./interfaces/appIntefaces";
import Notification from "./modals/Notification.vue";
import { Application } from "./models";
import * as CONSTANT from "./assets/constants/_application";
import { useLibraryStore } from './store/libraryStore';
import { ref } from "vue";
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

    case "autostart_active":
      autoStateApplications();
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

    case "manifest_scanned":
      manifestScanned(info);
      break;

    default:
      console.log(info);
      break;
  }
});

/**
 * Cycle through the supplied manifest list and update the individual entries within the library settings.
 * @param directoryPath
 * @param appArray
 */
function installedApplications(directoryPath: string, appArray: Array<AppEntry>) {
  console.log(appArray);
  libraryStore.resetApplications();
  libraryStore.appDirectory = directoryPath;

  appArray.forEach(application => {
    //Check if is the launcher config
    if(application.name === CONSTANT.LAUNCHER_NAME) {
      if(application.mode != null) {
        libraryStore.mode = application.mode;
      }
    }
    //Detect if the application is an import
    else if(application.altPath != '' && application.altPath != null) {
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
  });
}

/**
 * A command sent from the backend stating there are no updates available at this time or any update has been installed,
 * and it is now safe to auto start any applications that are required.
 */
function autoStateApplications() {
  libraryStore.applications.forEach((application: Application) => {
    //Open the application if required by autostart flag
    if (application.autoStart) {
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
 * Notify the settings that an application has stopped
 * @param info
 */
function applicationStopped(info: any) {
  libraryStore.updateApplicationStatusByName(info.name, CONSTANT.STATUS_INSTALLED);
}

/**
 * Confirmation that an application has been imported or removed correctly. This updates the library settings with the
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

const title = ref("");
const message = ref("");

const notificationRef = ref<InstanceType<typeof Notification> | null>(null)
function openNotificationModal() {
  notificationRef.value?.openModal();
}

/**
 * The leadme_apps directory has been scanned, inform the user of the outcome of te prcoess and what might need to
 * occur next.
 * @param info
 */
function manifestScanned(info: any) {
  console.log(info);

  title.value = info.title;
  message.value = info.message;

  openNotificationModal();
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
  <Notification ref="notificationRef" :title="title" :message="message"/>
</template>

<style lang="less">
@import './assets/css/styles.less';
</style>
