import { defineStore } from 'pinia'
import { Application } from '../models'
import * as CONSTANTS from '../assets/constants/_application';

//Preset applications
const values = {
    '1': new Application(
        '1',
        'Station',
        'http://localhost:8082/program-station',
        CONSTANTS.STATUS_NOT_INSTALLED
    ),
    '2': new Application(
        '2',
        'NUC',
        'http://localhost:8082/program-nuc',
        CONSTANTS.STATUS_NOT_INSTALLED
    ),
    '3': new Application(
        '3',
        'InputTest',
        'http://localhost:8082/program-inputtest',
        CONSTANTS.STATUS_NOT_INSTALLED
    )
}

export const useLibraryStore = defineStore({
    id: 'library',
    state: () => ({
        selectedApplication: '',
        applications: new Map<string, Application>(Object.entries(values))
    }),
    actions: {
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
        }
    }
})
