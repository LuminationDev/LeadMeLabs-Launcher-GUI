import { defineStore } from 'pinia'
import { Application } from '../models'
import { reactive, ref } from "vue";
import * as CONSTANTS from '../assets/constants/_application';

//Preset applications - Use this as an example of the LeadMe ID Library?
// const values = {
//     '3': new Application(
//         '3',
//         'LeadMe VR',
//         'http://localhost:8082/program-leadmevr',
//         '',
//         false,
//         CONSTANTS.STATUS_NOT_INSTALLED
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
        CONSTANTS.STATUS_NOT_INSTALLED
    ),
    '2': new Application(
        '2',
        'NUC',
        '/program-nuc',
        '',
        false,
        CONSTANTS.STATUS_NOT_INSTALLED
    )
}

export const useLibraryStore = defineStore({
    id: 'library',
    state: () => ({
        mode: "production",
        appDirectory: '',
        selectedApplication: '',
        applicationParameters: {},
        applicationSetup: reactive([]),
        applications: ref(new Map<string, Application>(Object.entries(values)))
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
         * @param status A string of the new status to be saved.
         */
        updateApplicationStatusByID(appID: string, status: string) {
            const app = this.applications.get(appID)
            if(app != undefined) {
                app.status = status
            }
        },

        /**
         * Update the status of a settings application using its name.
         * @param appName A string representing the name of an application.
         * @param status A string of the new status to be saved.
         */
        updateApplicationStatusByName(appName: string, status: string) {
            const key = this.getKeyFromValue(appName)
            if(key == undefined) { return; }

            const app = this.applications.get(key)
            if(app != undefined) {
                app.status = status
            }
        },

        /**
         * Update the status of a settings application using its name.
         * @param appName A string representing the name of an application.
         * @param autoStart A boolean of the new autoStart value to be saved.
         */
        updateApplicationAutoStartByName(appName: string, autoStart: boolean) {
            const key = this.getKeyFromValue(appName)
            if(key == undefined) { return; }

            const app = this.applications.get(key)
            if(app != undefined) {
                app.autoStart = autoStart
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
                if(app.status )
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
        }
    },
    getters: {
        getHostURL(): string {
            const modeUrls = {
                production: "https://learninglablauncher.herokuapp.com",
                development: "https://learninglablauncherdevelopment.herokuapp.com",
                local: "http://localhost:8082"
            };

            return modeUrls[this.mode] || modeUrls.production;
        },

        getSelectedApplication(): Application | undefined {
            return this.applications.get(this.selectedApplication)
        },

        getSetupConfig(): string[] {
            return this.applicationSetup;
        }
    }
});
