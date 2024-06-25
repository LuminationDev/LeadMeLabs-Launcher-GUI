<script setup lang="ts">
import { useLibraryStore } from '../../store/libraryStore';
import ApplicationPanel from './application/ApplicationPanel.vue';
import Sidebar from '../../layout/Sidebar.vue';
import LibraryMenu from './menu/LibraryMenu.vue';
import LibraryInsert from "@renderer/components/library/LibraryInsert.vue";
import * as CONSTANT from "../../assets/constants";
import VideoPanel from "@renderer/components/library/video/VideoPanel.vue";

const libraryStore = useLibraryStore();
</script>

<template>
  <!--List of Items-->
  <div class="sidebar w-72 bg-white rounded-3xl">
    <Sidebar title="">
      <template #content>
        <LibraryMenu />
      </template>
    </Sidebar>
  </div>

  <!--Application Library-->
  <LibraryInsert v-if="libraryStore.menuType === CONSTANT.IMPORT_TYPE.APPLICATION"
                 :nothing-selected="libraryStore.selectedApplication === '' || libraryStore.selectedApplication === undefined">
    <ApplicationPanel />
  </LibraryInsert>

  <!--Video Library-->
  <LibraryInsert v-else-if="libraryStore.menuType === CONSTANT.IMPORT_TYPE.VIDEO"
                 :nothing-selected="libraryStore.selectedVideo === '' || libraryStore.selectedVideo === undefined">
    <VideoPanel />
  </LibraryInsert>
</template>
