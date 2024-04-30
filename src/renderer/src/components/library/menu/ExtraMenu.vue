<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from "vue";
import ApplicationImport from "@renderer/modals/ImportModal.vue";
import ResetManifest from "@renderer/modals/ResetManifest.vue";

const showDropdown = ref(false);

onBeforeUnmount(() => {
  document.removeEventListener('click', () => showDropdown.value = false)
})

onMounted(() => {
  document.addEventListener('click', () => showDropdown.value = false)
})
</script>

<template>
  <div class="relative">
    <!-- Button to toggle dropdown visibility -->
    <img @click.stop="showDropdown = !showDropdown" class="h-5 cursor-pointer" src="../../../assets/icons/three-dots-menu.svg" alt="menu"/>

    <!-- Dropdown content -->
    <div v-if="showDropdown" @click.stop class="absolute flex flex-col p-5 right-0 mt-4 w-48 bg-white border-2 border-gray-300 rounded-md shadow-lg">
      <h3 class="title font-bold text-lg text-center">Settings</h3>

      <hr class="border border-gray-400 my-3">

      <ApplicationImport />

      <hr class="border border-gray-400 my-3">

      <ResetManifest />
    </div>
  </div>
</template>
