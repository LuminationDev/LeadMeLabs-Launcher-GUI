<script setup lang="ts">
import { useLibraryStore } from "@renderer/store/libraryStore";
import { computed, ref } from "vue";

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  searchQuery: {
    type: String
  },
  videoType: {
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
const videoList = computed(() => {
    // Use filter to find all videos in the specified key that match the supplied value
    return  libraryStore.videos[props.videoType].filter(video => {
      const query = props.searchQuery.trim().toLowerCase();
      const nameIncludesQuery = video.name.toLowerCase().includes(query);

      if (query === "") {
        expanded.value = props.startExpanded;
        return true;
      }

      if (nameIncludesQuery) {
        expanded.value = true;
        return true;
      }

      return false;
    });
});

/**
 * Determine if there is a video selected.
 */
const videoName = computed(() => {
  const video = libraryStore.getSelectedVideo
  return video !== undefined ? video.name : 'Unselected'
});
</script>

<template>
  <div v-if="videoList.length > 0" class="flex flex-col [&>div]:my-2">

    <!--Title section-->
    <div class="flex flex-row justify-between cursor-pointer" v-on:click="expanded = !expanded">
      <div class="font-bold" >
        {{title}}
      </div>

      <div>
        {{expanded ? '[-]' : '[+]'}}
      </div>
    </div>

    <!--Experience section-->
    <div v-if="expanded" v-for="video in videoList" :key="video.name">
      <div
          class="w-full pl-2 cursor-pointer rounded hover:bg-gray-100"
          :class="{'bg-gray-100': video.name === videoName}"
          @click="libraryStore.changeVideo(video.path)">

        <div class="flex flex-col">
          <div>
            {{ libraryStore.filterVideoName(video.name) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
