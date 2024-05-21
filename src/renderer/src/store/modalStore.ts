import { defineStore } from "pinia";

export const useModalStore = defineStore({
    id: 'modal',
    state: () => ({
        openModal: false,
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
        getOpenModal(state): boolean {
            return state.openModal;
        }
    }
});
