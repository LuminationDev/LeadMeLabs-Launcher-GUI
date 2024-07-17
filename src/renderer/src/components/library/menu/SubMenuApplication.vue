<script setup lang="ts">
import * as CONSTANT from "@renderer/assets/constants";
import { useLibraryStore } from "@renderer/store/libraryStore";
import { computed, ref } from "vue";
import { Application } from "@renderer/models";

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  searchQuery: {
    type: String
  },
  applicationType: {
    type: String,
    required: true
  },
  startExpanded: {
    type: Boolean,
    required: false,
    default: true
  }
});

const libraryStore = useLibraryStore();
const expanded = ref(props.startExpanded);

/**
 * Filter out the applications by type for the sub heading.
 */
const applicationList = computed(() => {
  return Array.from(libraryStore.applications.entries()).filter(([_, application]) => {
    if (!(application instanceof Application)) {
      return false;
    }

    const query = props.searchQuery.trim().toLowerCase();
    const nameIncludesQuery = application.name.toLowerCase().includes(query);
    const isTypeMatch = application.wrapperType === props.applicationType;

    if (query === "") {
      expanded.value = props.startExpanded;
      return isTypeMatch;
    }

    if (nameIncludesQuery) {
      expanded.value = true;
      return isTypeMatch;
    }

    return false;
  });
});

/**
 * Determine if there is an application selected.
 */
const applicationName = computed(() => {
  const app = libraryStore.getSelectedApplication
  return app !== undefined ? app.name : 'Unselected'
});
</script>

<template>
  <div v-if="applicationList.length > 0" class="flex flex-col">

    <!--Title section-->
    <div class="flex flex-row justify-between cursor-pointer my-2" v-on:click="expanded = !expanded">
      <div class="font-bold" >
        {{title}}
      </div>

      <div>
        {{expanded ? '[-]' : '[+]'}}
      </div>
    </div>

    <!--Experience section-->
    <div v-if="expanded" class="flex flex-col [&>div]:my-2">
      <div v-for="[string, application] in applicationList" :key="string">
        <div
            class="w-full pl-2 cursor-pointer rounded hover:bg-gray-100"
            :class="{'bg-gray-100': application.name === applicationName}"
            @click="libraryStore.changeApplication(application.id)">

          <div class="flex flex-col">
            <div :class="{'text-gray-400': ![CONSTANT.MODEL_VALUE.STATUS_INSTALLED, CONSTANT.MODEL_VALUE.STATUS_RUNNING].includes(application.status)}">
              {{ application.name }}
            </div>

            <div class="text-blue-400 text-xs items-center"
                 v-if="[CONSTANT.MODEL_VALUE.STATUS_DOWNLOADING, CONSTANT.MODEL_VALUE.STATUS_RUNNING].includes(application.status)">
              {{application.status === CONSTANT.MODEL_VALUE.STATUS_DOWNLOADING ? '(Installing...)' : '(Running...)'}}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
