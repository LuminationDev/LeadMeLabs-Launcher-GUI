<script setup lang="ts">
import * as CONSTANT from '../../../assets/constants';
import SubMenuApplication from "@renderer/components/library/menu/SubMenuApplication.vue";
import ExtraMenu from "@renderer/components/library/menu/ExtraMenu.vue";
import { computed, ref } from "vue";
import { useLibraryStore } from "@renderer/store/libraryStore";
import SubMenuVideo from "@renderer/components/library/menu/SubMenuVideo.vue";
import GenericButton from "@renderer/components/buttons/GenericButton.vue";

const libraryStore = useLibraryStore();
const searchQuery = ref("");
const title = computed(() => {
  switch (libraryStore.menuType) {
    case CONSTANT.IMPORT_TYPE.APPLICATION:
      return 'Applications';

    case CONSTANT.IMPORT_TYPE.VIDEO:
      return 'Videos';
  }
});

const refreshVideoList = () => {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.QUERY_INSTALLED_VIDEOS
  });
}
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="flex flex-row justify-between items-center px-4">
      <h2 class="title font-bold text-lg text-center">{{title}}</h2>

      <ExtraMenu />
    </div>

    <div class="flex flex-col flex-grow">
      <div class="flex flex-col px-4">
        <!-- Search Input -->
        <input type="text" v-model="searchQuery" placeholder="Search..." class="w-full mt-5 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-800">
      </div>

      <!--Application Section-->
      <div v-if="libraryStore.menuType === CONSTANT.IMPORT_TYPE.APPLICATION" class="flex-col overflow-auto max-h-[490px] p-4">
        <hr class="border border-gray-400 mb-5">

        <SubMenuApplication title="LeadMe" :search-query="searchQuery" :application-type="CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME"/>
        <SubMenuApplication title="Apps" :search-query="searchQuery" :application-type="CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED"/>
        <SubMenuApplication title="Imported" :search-query="searchQuery" :application-type="CONSTANT.APPLICATION_TYPE.APPLICATION_IMPORTED"/>
        <SubMenuApplication title="Tools" :search-query="searchQuery" :application-type="CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL" :start-expanded="false"/>
      </div>

      <!--Video Section-->
      <div v-if="libraryStore.menuType === CONSTANT.IMPORT_TYPE.VIDEO" class="flex-col overflow-auto max-h-[490px] p-4">
        <hr class="border border-gray-400 mb-5">

        <GenericButton
            class="w-full h-8 mb-3"
            :type="'light'"
            :callback="refreshVideoList"
            :spinnerColor="'#000000'"
        >Refresh List</GenericButton>

        <SubMenuVideo title="Regular" :search-query="searchQuery" video-type="Regular"/>
        <SubMenuVideo title="VR" :search-query="searchQuery" video-type="VR"/>
        <SubMenuVideo title="Backdrops" :search-query="searchQuery" video-type="Backdrops" :start-expanded="false"/>
      </div>
    </div>
  </div>
</template>
