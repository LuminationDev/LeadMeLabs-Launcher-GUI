<script setup lang="ts">
import * as CONSTANT from '../../../assets/constants';
import SubMenu from "@renderer/components/library/menu/SubMenu.vue";
import ExtraMenu from "@renderer/components/library/menu/ExtraMenu.vue";
import { ref } from "vue";

const searchQuery = ref("");
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="flex flex-row justify-between items-center">
      <h2 class="title font-bold text-lg text-center">Applications</h2>

      <ExtraMenu />
    </div>

    <div class="flex flex-col flex-grow">
      <!-- Search Input -->
      <input type="text" v-model="searchQuery" placeholder="Search..." class="w-full mt-5 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-800">

      <hr class="border border-gray-400 my-5">

      <div class="flex-col overflow-auto max-h-[400px]">
        <SubMenu title="LeadMe" :search-query="searchQuery" :application-type="CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME"/>
        <SubMenu title="In-built" :search-query="searchQuery" :application-type="CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED"/>
        <SubMenu title="Imported" :search-query="searchQuery" :application-type="CONSTANT.APPLICATION_TYPE.APPLICATION_IMPORTED"/>
        <SubMenu title="Tools" :search-query="searchQuery" :application-type="CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL" :start-expanded="false"/>
      </div>

    </div>
  </div>
</template>
