<script setup lang="ts">
import { useLibraryStore } from '../../store/libraryStore';
import ApplicationPanel from './ApplicationPanel.vue';
import Sidebar from '../../layout/Sidebar.vue';
import LibraryMenu from './menu/LibraryMenu.vue';

const libraryStore = useLibraryStore();
</script>

<template>
    <!--List of Applications-->
    <div class="sidebar w-72 bg-white rounded-3xl">
        <Sidebar title="">
            <template #content>
                <LibraryMenu />
            </template>
        </Sidebar>
    </div>
    <!--Selected Application details-->
    <div class="content w-full bg-white ml-2 rounded-3xl px-6 pt-2">
      <!--Display nothing if nothing is selected-->
      <div v-if="libraryStore.selectedApplication === ''" class="w-full"></div>

      <!--Display the application details and options-->
      <div v-else class="w-full">
          <ApplicationPanel />
      </div>
    </div>
</template>
