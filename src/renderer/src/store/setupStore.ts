import { defineStore } from "pinia";
import { reactive } from "vue";

export const useSetupStore = defineStore({
    id: 'setup',
    state: () => ({
        stationForm: reactive({
            AppKey: '',
            LabLocation: '',
            StationId: '',
            room: '',
            NucAddress: '',
            SteamUserName: '',
            SteamPassword: '',
            StationMode: '',
            HeadsetType: '',
        }),
        nucForm: reactive({
            AppKey: '',
            LabLocation: '',
            CbusIP: '',
            CbusNucScriptId: '',
            CbusLogin: '',
            CbusPassword: '',
            NovaStarLogin: '',
            NovaStarPassword: '',
        })
    }),
    actions: {},
    getters: {}
});