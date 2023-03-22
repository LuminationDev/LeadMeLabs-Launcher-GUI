<script setup lang="ts">
import { useLibraryStore } from '../../store/libraryStore'
import { computed } from "vue";
import * as CONSTANT from '../../assets/constants/_application';
import ApplicationImport from "../../modals/ImportModal.vue";

const libraryStore = useLibraryStore()

const applicationName = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.name : 'Unselected'
});

const applicationList = computed(() => {
  return libraryStore.applications;
});
</script>

<template>
  <div class="flex flex-col [&>div]:my-2">

    <ApplicationImport />

    <hr class="border border-gray-400 my-5">

    <div v-for="[string, application] in applicationList" :key="string">
      <div
          class="w-full pl-2 cursor-pointer rounded hover:bg-gray-100"
          :class="{'bg-gray-100': application.name === applicationName}"
          @click="libraryStore.changeApplication(application.id)">

          <p :class="{'text-gray-400': ![CONSTANT.STATUS_INSTALLED, CONSTANT.STATUS_RUNNING].includes(application.status)}">
            {{ application.name }}
          </p>
      </div>
    </div>
  </div>
</template>
