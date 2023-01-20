<script setup lang="ts">
import { useLibraryStore } from '../../store/libraryStore'

const libraryStore = useLibraryStore()
</script>

<template>
    <div class="flex flex-col [&>div]:my-2">
        <div v-for="[string, application] in libraryStore.applications" :key="string">
            <div
                class="w-full pl-2 cursor-pointer rounded hover:bg-gray-100"
                :class="{'bg-gray-100': application.name === libraryStore.getSelectedApplication.name}"
                @click="libraryStore.changeApplication(application.id)">

                <p>{{ application.name }}</p>
            </div>
        </div>
    </div>
</template>
