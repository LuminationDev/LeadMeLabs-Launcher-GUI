import { defineStore } from "pinia";

export const useModalStore = defineStore({
    id: 'modal',
    state: () => ({
        notificationModelOpen: false,
        notificationModelTitle: "",
        notificationModelMessage: "",
        errorModelOpen: false,
        errorModelTitle: "",
        errorModelMessage: "",
    }),
    actions: {
    },
    getters: {
    }
});
