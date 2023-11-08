<script setup lang="ts">
import { RouterView } from 'vue-router';
import Header from './layout/Header.vue';
import { AppEntry } from "./interfaces/appIntefaces";
import Notification from "./modals/Notification.vue";
import { Application } from "./models";
import * as CONSTANT from "./assets/constants/index";
import { useLibraryStore } from './store/libraryStore';
import { ref } from "vue";
import {CHECK_REMOTE_CONFIG} from "./assets/constants/_application";
import * as Sentry from "@sentry/electron";

Sentry.init({
  dsn: "https://09dcce9f43346e4d8cadf213c0a0f082@o1294571.ingest.sentry.io/4505666781380608",
});

const libraryStore = useLibraryStore();

//First this to do is check if any applications are installed - only register and trigger it on start up.
// @ts-ignore
api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
  channelType: CONSTANT.MESSAGE.QUERY_INSTALLED
});

//Backend listener
// @ts-ignore
api.ipcRenderer.on('backend_message', (event, info) => {
  switch(info.channelType) {
    case "applications_installed":
      installedApplications(info.directory, info.content);
      break;
    case "remote_config":
      remoteConfig(info.name, info.message);
      break;

    case "autostart_active":
      autoStateApplications();
      break;

    case "app_manifest_query":
      manifestParams(info);
      break;

    case CONSTANT.MESSAGE.CONFIG_APPLICATION_RETURN:
      configParams(info);
      break;

    case CONSTANT.MESSAGE.APPLICATION_STOP:
      applicationStopped(info);
      break;

    case "application_imported":
      applicationImported(info);
      break;

    case "manifest_scanned":
      manifestScanned(info);
      break;

    case "scheduler_update":
      schedulerTaskDetails(info);
      break;

    case "launcher_settings":
      updateLauncherSettings(info);
      break;

    default:
      console.log(info);
      break;
  }
});

/**
 * Update the Library store's details, these are shown on the settings page.
 * @param info
 */
const updateLauncherSettings = (info: any) => {
  libraryStore.version = info.version;
  libraryStore.location = info.location;
}

function remoteConfig(applicationName: string, message: string) {
  libraryStore.updateApplicationRemoteConfigStatusByName(applicationName, message.includes('Enabled') ? true : false);
}

/**
 * Cycle through the supplied manifest list and update the individual entries within the library settings.
 * @param directoryPath
 * @param appArray
 */
const installedApplications = (directoryPath: string, appArray: Array<AppEntry>) => {
  console.log(appArray);
  libraryStore.resetApplications();
  libraryStore.appDirectory = directoryPath;

  appArray.forEach(application => {
    //Check if is the launcher config
    if(application.name === CONSTANT.NAME.LAUNCHER_NAME) {
      if(application.mode != null) {
        libraryStore.mode = application.mode;
      }
      if(application.parameters.pin != null) {
        libraryStore.pin = application.parameters.pin;
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
          CONSTANT.MODEL_VALUE.STATUS_INSTALLED
      );

      //Add any additional parameters to the application
      if(application.parameters.vrManifest !== null) {
        importedApp.parameters.vrManifest = application.parameters.vrManifest
      }

      //Add the application to the library list
      libraryStore.addImportApplication(importedApp);
    }
    else {
      libraryStore.updateApplicationByName(application.name, CONSTANT.MODEL_KEY.KEY_STATUS, CONSTANT.MODEL_VALUE.STATUS_INSTALLED);
      libraryStore.updateApplicationByName(application.name, CONSTANT.MODEL_KEY.KEY_AUTOSTART, application.autostart);

      if(application.parameters.vrManifest !== null) {
        libraryStore.updateApplicationParameterByName(application.name, CONSTANT.MODEL_KEY.KEY_VR_MANIFEST, application.parameters.vrManifest);
      }
    }
    if (application.name === "NUC") {
      api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
        channelType: CONSTANT.CHECK_REMOTE_CONFIG,
        applicationType: "NUC"
      });
    }
    if (application.name === "Station") {
      api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
        channelType: CONSTANT.CHECK_REMOTE_CONFIG,
        applicationType: "Station"
      });
    }
  });
}

/**
 * A command sent from the backend stating there are no updates available at this time or any update has been installed,
 * and it is now safe to auto start any applications that are required.
 */
const autoStateApplications = () => {
  libraryStore.applications.forEach((application: Application) => {
    //Open the application if required by autostart flag
    if (application.autostart) {
      // @ts-ignore
      api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
        channelType: CONSTANT.MESSAGE.APPLICATION_LAUNCH,
        host: libraryStore.getHostURL,
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
const manifestParams = (info: any) => {
  console.log(info);
  libraryStore.applicationParameters = info.params;
}

/**
 * Populate the libraryStore with an applications current config
 * @param info
 */
const configParams = (info: any) => {
  libraryStore.applicationSetup = info.data;
}

/**
 * Notify the settings that an application has stopped
 * @param info
 */
const applicationStopped = (info: any) => {
  libraryStore.updateApplicationByName(info.name, CONSTANT.MODEL_KEY.KEY_STATUS, CONSTANT.MODEL_VALUE.STATUS_INSTALLED);
}

/**
 * Confirmation that an application has been imported or removed correctly. This updates the library settings with the
 * appropriate information.
 * @param info
 */
const applicationImported = (info: any) => {
  if(info.action === "import") {
    let application: Application = new Application(
        info.id,
        info.name,
        '',
        info.altPath,
        false,
        CONSTANT.MODEL_VALUE.STATUS_INSTALLED
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
const openNotificationModal = () => {
  notificationRef.value?.openModal();
}

/**
 * The leadme_apps directory has been scanned, inform the user of the outcome of te prcoess and what might need to
 * occur next.
 * @param info
 */
const manifestScanned = (info: any) => {
  title.value = info.title;
  message.value = info.message;

  openNotificationModal();
}

const schedulerTaskDetails = (info: any) => {
  if (info.type !== "list") {
    checkSchedulerTask(info.type === "delete" ? 10 : 3, 1000);
  } else {
    libraryStore.schedulerTask.enabled = info.message.includes("Ready") || info.message.includes("Running") ;
    libraryStore.schedulerTask.status = info.message;
  }
}

/**
 * Check the Task scheduler information to see if any values have changed.
 * @param numberOfExecutions The number of times to check.
 * @param delayBetweenExecutions The amount of delay between each check.
 */
const checkSchedulerTask = async (numberOfExecutions: Number, delayBetweenExecutions: Number) => {
  for (let i = 0; i < numberOfExecutions; i++) {
    libraryStore.listSchedulerTask();
    await delay(delayBetweenExecutions);
  }
}

/**
 * A generic delay function.
 * @param ms A delay to wait in milliseconds.
 */
const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
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
