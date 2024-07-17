<script setup lang="ts">
import ImportWizard from "@renderer/components/import/ImportWizard.vue";
import ResetManifest from "@renderer/modals/ResetManifest.vue";
import IconApplicationMenu from "@renderer/assets/vue/IconApplicationMenu.vue";
import GenericButton from "@renderer/components/buttons/GenericButton.vue";
import * as CONSTANT from "../../../assets/constants";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useModalStore } from "@renderer/store/modalStore";
import { useLibraryStore } from "@renderer/store/libraryStore";

const libraryStore = useLibraryStore();
const modalStore = useModalStore();
const showDropdown = ref(false);
const hovered = ref(false);

/**
 * Change the currently displayed library
 * @param value A string of the library type to display.
 */
const changeLibrary = (value: string) => {
  libraryStore.changeLibraryType(value);
  showDropdown.value = false;
}

onBeforeUnmount(() => {
  document.removeEventListener('click', () => showDropdown.value = false)
});

onMounted(() => {
  document.addEventListener('click', () => {
    if (!modalStore.openModal) {
      showDropdown.value = false
    }
  });
});
</script>

<template>
  <div class="relative">
    <!-- Button to toggle dropdown visibility -->
    <IconApplicationMenu class="h-5 cursor-pointer"
                         :colour="hovered || showDropdown ? '#808080' : '#000000'"
                         @click.stop="showDropdown = !showDropdown"
                         @mouseover="hovered = true"
                         @mouseleave="hovered = false" />

    <!-- Dropdown content -->
    <div v-if="showDropdown" @click.stop class="absolute flex flex-col p-5 right-0 mt-4 w-48 bg-white border-2 border-gray-300 rounded-md shadow-lg">
      <h3 class="title font-bold text-lg text-center">Library</h3>

      <hr class="border border-gray-400 my-3">

      <GenericButton
          class="w-full h-8 mb-3"
          :type="'light'"
          :callback="() => changeLibrary(CONSTANT.IMPORT_TYPE.APPLICATION)"
          :spinnerColor="'#000000'"
      >Applications</GenericButton>

      <GenericButton
          class="w-full h-8"
          :type="'light'"
          :callback="() => changeLibrary(CONSTANT.IMPORT_TYPE.VIDEO)"
          :spinnerColor="'#000000'"
      >Videos</GenericButton>

      <h3 class="title font-bold text-lg text-center mt-5">Settings</h3>

      <hr class="border border-gray-400 my-3">

      <ImportWizard />

      <hr class="border border-gray-400 my-3">

      <ResetManifest />
    </div>
  </div>
</template>
