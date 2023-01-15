<script setup lang="ts">
import { useLibraryStore } from '../../store/libraryStore'
import ApplicationManager from './ApplicationManager.vue'
import { computed } from 'vue'
import StationSetup from "../../modals/StationSetup.vue";

const libraryStore = useLibraryStore()
const applicationName = computed(() => {
    const app = libraryStore.getSelectedApplication
    return app !== undefined ? app.name : 'Unselected'
})
</script>

<template>
    <div class="flex flex-col w-full [&>div]:my-2">
        <div class="h-12 bg-green-400 rounded flex items-center justify-center">
            <p class="text-black">Image</p>
        </div>
        <div class="h-24 px-12 bg-green-400 rounded flex items-center justify-between">
            <ApplicationManager />

            <StationSetup v-if="applicationName === 'Station'" />
            <p class="text-black">Tool bar</p>
        </div>
        <div class="h-12 bg-green-400 rounded flex items-center justify-center">
            <p class="text-black">{{ applicationName }}</p>
        </div>
    </div>
</template>
