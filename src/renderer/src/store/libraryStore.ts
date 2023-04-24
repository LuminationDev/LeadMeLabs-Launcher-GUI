import { defineStore } from 'pinia'
import { Application } from '../models'
import { reactive, ref } from "vue";
import * as CONSTANTS from '../assets/constants/_application';

//Preset applications - Use this as an example of the LeadMe ID Library?
// const values = {
//     '1': new Application(
//         '1',
//         'Station',
//         'http://localhost:8082/program-station',
//         '',
//         false,
//         CONSTANTS.STATUS_NOT_INSTALLED
//     ),
//     '2': new Application(
//         '2',
//         'NUC',
//         'http://localhost:8082/program-nuc',
//         '',
//         false,
//         CONSTANTS.STATUS_NOT_INSTALLED
//     )
//     ,
//     '3': new Application(
//         '3',
//         'ActualGame',
//         'http://localhost:8082/program-actualgame',
//         '',
//         false,
//         CONSTANTS.STATUS_NOT_INSTALLED
//     ),
//     '4': new Application(
//         '4',
//         'PluginTest',
//         'http://localhost:8082/program-plugintest',
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
        'https://learninglablauncherdevelopment.herokuapp.com/program-station',
        '',
        false,
        CONSTANTS.STATUS_NOT_INSTALLED
    ),
    '2': new Application(
        '2',
        'NUC',
        'https://learninglablauncherdevelopment.herokuapp.com/program-nuc',
        '',
        false,
        CONSTANTS.STATUS_NOT_INSTALLED
    )
}

export const useLibraryStore = defineStore({
    id: 'library',
    state: () => ({
        appDirectory: '',
        selectedApplication: '',
        applicationParameters: {},
        applicationSetup: reactive([]),
        applications: ref(new Map<string, Application>(Object.entries(values)))
    }),
    actions: {
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
         * Update the status of a store application using its unique ID.
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
         * Update the status of a store application using its name.
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
         * Update the status of a store application using its name.
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
         * Get the key of the applications Map from a supplied name.
         * @param val A string that is the name to be searched for.
         */
        getKeyFromValue(val: string): string | undefined {
            return [...this.applications.keys()].find(key => this.applications.get(key)?.name === val)
        }
    },
    getters: {
        getSelectedApplication(): Application | undefined {
            return this.applications.get(this.selectedApplication)
        },

        getSetupConfig(): string[] {
            return this.applicationSetup;
        }
    }
});
