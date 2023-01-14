import { defineStore } from 'pinia'
import { Application } from '../models'
import * as CONSTANTS from '../assets/constants/_application';

//Preset applications
const values = {
    '1': new Application(
        '1',
        'Station',
        'https://learninglablauncherdevelopment.herokuapp.com/program-station',
        CONSTANTS.STATUS_NOT_INSTALLED
    ),
    '2': new Application(
        '2',
        'NUC',
        'https://learninglablauncherdevelopment.herokuapp.com/program-nuc',
        CONSTANTS.STATUS_NOT_INSTALLED
    )
}

//First this to do is check if any applications are installed


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
        }
    },
    getters: {
        getSelectedApplication(): Application | undefined {
            return this.applications.get(this.selectedApplication)
        }
    }
})
