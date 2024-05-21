import * as CONSTANT from "./assets/constants";
import { AppEntry } from "./interfaces/appIntefaces";
import { Application } from "./models";
import { useLibraryStore } from "./store/libraryStore";
import { useModalStore } from "./store/modalStore";

let libraryStore: any;
let modalStore: any;

export const initialise = () => {
    libraryStore = useLibraryStore();
    modalStore = useModalStore();
}

//region backend
export const backendListeners = (info: any) => {
    switch(info.channelType) {
        case "applications_installed":
            installedApplications(info.appDirectory, info.toolDirectory, info.content);
            break;

        case "update_application_entry":
            libraryStore.updateApplicationByName(info.applicationName, info.parameterKey, info.parameterValue);
            break

        case "remote_config":
            remoteConfig(info.name, info.message);
            break;

        case "autostart_active":
            autoStartApplications();
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
}

//region backendFunctions
/**
* Update the Library store's details, these are shown on the settings page.
* @param info
*/
const updateLauncherSettings = (info: any) => {
    libraryStore.version = info.version;
    libraryStore.location = info.location;
}

const remoteConfig = (applicationName: string, message: string) => {
    libraryStore.updateApplicationRemoteConfigStatusByName(applicationName, message.includes('Enabled'));
}

/**
 * Cycle through the supplied manifest list and update the individual entries within the library settings.
 * @param appDirectoryPath
 * @param toolDirectoryPath
 * @param appArray
 */
const installedApplications = (appDirectoryPath: string, toolDirectoryPath: string, appArray: Array<AppEntry>) => {
    console.log(appArray);
    libraryStore.resetApplications();
    libraryStore.appDirectory = appDirectoryPath;
    libraryStore.toolDirectory = toolDirectoryPath;

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
                application['alias'] ? application.alias : application.name,
                '',
                application.altPath,
                application.autostart,
                CONSTANT.MODEL_VALUE.STATUS_INSTALLED,
                application.setup
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

            if (application.setup) {
                libraryStore.updateApplicationByName(application.name, CONSTANT.MODEL_KEY.KEY_SETUP, application.setup);
            }

            if(application.parameters.vrManifest !== null) {
                libraryStore.updateApplicationParameterByName(application.name, CONSTANT.MODEL_KEY.KEY_VR_MANIFEST, application.parameters.vrManifest);
            }
        }
        if (application.name === "NUC") {
            //@ts-ignore
            api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
                channelType: CONSTANT.MESSAGE.CHECK_REMOTE_CONFIG,
                applicationType: "NUC"
            });
        }
        if (application.name === "Station") {
            //@ts-ignore
            api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
                channelType: CONSTANT.MESSAGE.CHECK_REMOTE_CONFIG,
                applicationType: "Station"
            });
        }
    });
}

/**
 * A command sent from the backend stating there are no updates available at this time or any update has been installed,
 * and it is now safe to auto start any applications that are required.
 */
const autoStartApplications = () => {
    libraryStore.applications.forEach((application: Application) => {
        //Open the application if required by autostart flag
        if (application.autostart) {
            const alias = application.alias !== undefined ? application.alias : application.name;
            libraryStore.getHostURL(application.wrapperType, application.name).then((host: any) => {
                // @ts-ignore
                api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
                    channelType: CONSTANT.MESSAGE.APPLICATION_LAUNCH,
                    id: application.id,
                    host,
                    alias,
                    wrapperType: application.wrapperType,
                    name: application.name,
                    path: application.altPath === null ? "" : application.altPath
                });
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

/**
 * The leadme_apps directory has been scanned, inform the user of the outcome of te prcoess and what might need to
 * occur next.
 * @param info
 */
const manifestScanned = (info: any) => {
    modalStore.notificationModelTitle = info.title;
    modalStore.notificationModelMessage = info.message;
    modalStore.notificationModelOpen = true;
}

const schedulerTaskDetails = (info: any) => {
    if (info.target !== null) {
        if (!info.target.includes(info.current)) {
            libraryStore.schedulerTask.warning = "The software task is not pointing at this Launcher's install directory. Please delete the task and recreate it.";

            //Can comment out the below if the modal is too annoying
            modalStore.notificationModelTitle = "WARNING: Scheduler issue";
            modalStore.notificationModelMessage = `The software task is not pointing at this Launcher's install directory. Please delete the task and
        recreate it.\n\nTask pointing to:\n\n${info.target}`;

            modalStore.notificationModelOpen = true;
        }
    }

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
//endregion
//endregion

//region Status
export const statusListeners = (info: any) => {
    switch(info.channelType) {
        case "download_progress":
            // console.log(info.name);
            // console.log(info.downloadProgress);
            break;

        case "status_update":
            statusUpdate(info);
            break;
    }
}

//region statusFunctions
const statusUpdate = (info: any) => {
    if(info.message === 'Clean up complete') {
        libraryStore.updateApplicationByName(
            info.name,
            CONSTANT.MODEL_KEY.KEY_STATUS,
            CONSTANT.MODEL_VALUE.STATUS_INSTALLED);
    }

    console.log(info);
    if(info.message === 'Server offline' && libraryStore.getSelectedApplication?.status != CONSTANT.MODEL_VALUE.STATUS_RUNNING) {
        const app = libraryStore.getSelectedApplication;
        if (app.status === CONSTANT.MODEL_VALUE.STATUS_DOWNLOADING) {
            //The download has failed
            libraryStore.updateApplicationByName(
                info.name,
                CONSTANT.MODEL_KEY.KEY_STATUS,
                CONSTANT.MODEL_VALUE.STATUS_NOT_INSTALLED);
        }

        modalStore.notificationModelMessage = info.message;
        modalStore.notificationModelOpen = true;
    }
}
//endregion
//endregion
