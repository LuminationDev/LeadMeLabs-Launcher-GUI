<script setup lang="ts">
import { useLibraryStore } from '../../store/libraryStore'
import { computed } from "vue";

const libraryStore = useLibraryStore()

const applicationName = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.name : 'Unselected'
})
</script>

<template>
    <div class="flex flex-col [&>div]:my-2">
        <div v-for="[string, application] in libraryStore.applications" :key="string">
            <div
                class="w-full pl-2 cursor-pointer rounded hover:bg-gray-100"
                :class="{'bg-gray-100': application.name === applicationName}"
                @click="libraryStore.changeApplication(application.id)">

                <p>{{ application.name }}</p>
            </div>
        </div>
    </div>
</template>
