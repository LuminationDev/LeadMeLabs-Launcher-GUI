<script setup lang="ts">
import { useLibraryStore } from '../../store/libraryStore'
import ApplicationPanel from './ApplicationPanel.vue'
import Sidebar from '../../layout/Sidebar.vue'
import LibraryMenu from './LibraryMenu.vue'

const libraryStore = useLibraryStore()
</script>

<template>
    <!--List of Applications-->
    <div class="sidebar basis-1/4 bg-white rounded-3xl">
        <Sidebar title="Applications">
            <template #content>
                <LibraryMenu />
            </template>
        </Sidebar>
    </div>
    <!--Selected Application details-->
    <div class="content basis-3/4 bg-white ml-2 rounded-3xl w-full px-6 pt-2">
        <div v-if="libraryStore.selectedApplication === ''" class="w-full"></div>
        <div v-else class="w-full">
            <ApplicationPanel />
        </div>
    </div>
</template>
