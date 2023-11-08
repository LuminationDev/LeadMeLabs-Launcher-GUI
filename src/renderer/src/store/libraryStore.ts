import { defineStore } from 'pinia'
import { Application } from '../models'
import { reactive, ref } from "vue";
import * as CONSTANT from '../assets/constants/index';

//Preset applications - Use this as an example of the LeadMe ID Library?
// const values = {
//     '3': new Application(
//         '3',
//         'LeadMe VR',
//         'http://localhost:8082/program-leadmevr',
//         '',
//         false,
//         CONSTANTS.MODEL_VALUE.STATUS_NOT_INSTALLED
//     )
// }

//This is for production
const values = {
    '1': new Application(
        '1',
        'Station',
        '/program-station',
        '',
        false,
        CONSTANT.MODEL_VALUE.STATUS_NOT_INSTALLED
    ),
    '2': new Application(
        '2',
        'NUC',
        '/program-nuc',
        '',
        false,
        CONSTANT.MODEL_VALUE.STATUS_NOT_INSTALLED
    )
}

export const useLibraryStore = defineStore({
    id: 'library',
    state: () => ({
        version: '',
        location: '',
        pin: '',
        mode: 'production',
        appDirectory: '',
        selectedApplication: <string | undefined> '',
        applicationParameters: {},
        applicationSetup: reactive([]),
        applications: ref(new Map<string, Application>(Object.entries(values))),
        schedulerTask: { enabled: false, status: 'Unknown' }
    }),
    actions: {
        /**
         * After performing a manifest scan or reset, reload the applications.
         */
        resetApplications() {
            this.applications = new Map<string, Application>(Object.entries(values))
        },

        /**
         * Add a new application to the applications Map. This will have come from an imported source.
         * @param application An application instance that contains the necessary information for a new entry.
         */
        addImportApplication(application: Application) {
            this.applications.set(application.id, application);
        },

        /**
         * Remove an application from the applications Map.
         * @param appName A string representing the name of an application.
         */
        removeImportedApplication(appName: string) {
            const key = this.getKeyFromValue(appName)
            if(key == undefined) { return; }

            this.applications.delete(key);
        },

        /**
         * Change the current application panel to the supplied one.
         */
        changeApplication(panel: string) {
            this.selectedApplication = panel
        },

        /**
         * Update the status of a settings application using its unique ID.
         * @param appID A string representing the unique id of an application.
         * @param key A string of the variable to be updated.
         * @param value A new value for the supplied key.
         */
        updateApplicationByID(appID: string, key: string, value: any) {
            const app = this.applications.get(appID)
            if(app != undefined) {
                app[key] = value
            }
        },

        /**
         * Update the key of an application using its name.
         * @param appName A string representing the name of an application.
         * @param key A string of the variable to be updated.
         * @param value A new value for the supplied key.
         */
        updateApplicationByName(appName: string, key: string, value: any) {
            const appID = this.getKeyFromValue(appName)
            if(appID == undefined) { return; }

            const app = this.applications.get(appID)
            if(app != undefined) {
                app[key] = value
            }
        },

        /**
         * Update the remote config status of a settings application using its name.
         * @param appName A string representing the name of an application.
         * @param remoteConfigStatus A boolean of the new status to be saved.
         */
        updateApplicationRemoteConfigStatusByName(appName: string, remoteConfigStatus: boolean) {
            const key = this.getKeyFromValue(appName)
            if(key == undefined) { return; }

            const app = this.applications.get(key)
            if(app != undefined) {
                app.remoteConfigStatus = remoteConfigStatus
            }
        },

        /**
         * Update a parameter of an application using its name.
         * @param appName A string representing the name of an application.
         * @param key A string of the variable to be updated.
         * @param value A new value for the supplied key.
         */
        updateApplicationParameterByName(appName: string, key: string, value: any) {
            const appID = this.getKeyFromValue(appName)
            if(appID == undefined) { return; }

            const app = this.applications.get(appID)
            if(app != undefined) {
                app.parameters[key] = value
            }
        },

        /**
         * Check if an application is installed.
         * @param appName A string representing the name of an application.
         */
        checkIfApplicationInstalled(appName: string): boolean {
            const key = this.getKeyFromValue(appName)
            if(key == undefined) { return false; }

            const app = this.applications.get(key)
            if(app != undefined) {
                if(app.status === CONSTANT.MODEL_VALUE.STATUS_INSTALLED
                    || app.status === CONSTANT.MODEL_VALUE.STATUS_RUNNING
                    || app.status === CONSTANT.MODEL_VALUE.STATUS_DOWNLOADING)

                    return true;
            }

            return false;
        },

        /**
         * Get the key of the applications Map from a supplied name.
         * @param val A string that is the name to be searched for.
         */
        getKeyFromValue(val: string): string | undefined {
            return [...this.applications.keys()].find(key => this.applications.get(key)?.name === val)
        },

        /**
         * Get an application entry that is has the supplied name.
         * @param name A string that is the name to be searched for.
         */
        getApplicationByName(name: string): Application | undefined {
            const entries = Object.values(this.applications);
            return entries.find(entry => entry.name === name);
        },

        /**
         * Query the system to see if the currently selected application has a scheduler task associated with it.
         */
        listSchedulerTask(): void {
            // @ts-ignore
            api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
                channelType: CONSTANT.MESSAGE.APPLICATION_SCHEDULER,
                type: "list",
                name: this.getSelectedApplicationName
            });
        }
    },
    getters: {
        getHostURL(): string {
            // Redirection
            //production: "https://leadmelabs-redirect-server.herokuapp.com",
            //development: "https://leadmelabs-redirect-server.herokuapp.com/development",
            const modeUrls = {
                production: "https://learninglablauncher.herokuapp.com",
                development: "https://learninglablauncherdevelopment.herokuapp.com",
                offline: "http://localhost:8088",
                local: "http://localhost:8082"
            };

            return modeUrls[this.mode] || modeUrls.production;
        },

        getSelectedApplication(): Application | undefined {
            if(this.selectedApplication === undefined) return undefined;
            return this.applications.get(this.selectedApplication)
        },

        getSelectedApplicationName(): string {
            const app = this.getSelectedApplication
            return app !== undefined ? app.name : 'Unselected'
        },

        getSelectedApplicationStatus(): string {
            const app = this.getSelectedApplication
            return app !== undefined ? app.status : 'Unselected'
        },

        getSetupConfig(): string[] {
            return this.applicationSetup;
        }
    }
});
