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
            ReportRealtimeData: 'false'
        })
    }),
    actions: {
        splitStringWithLimit(input: string, delimiter: string, limit: number): string[] {
            const parts = input.split(delimiter);

            if (parts.length <= limit) {
                return parts;
            }

            const result: string[] = [];
            for (let i = 0; i < limit - 1; i++) {
                result.push(parts.shift() as string);
            }

            // Combine the remaining parts into the last block
            result.push(parts.join(delimiter));

            return result;
        },
    },
    getters: {}
});