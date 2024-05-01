<script setup lang="ts">
import Releases from "@renderer/components/home/Releases.vue";
</script>

<template>
    <div class="w-full my-4 flex flex-col overflow-auto">
      <p class="text-lg text-black mb-3">Home Page</p>

      <hr class="mt-4 mb-2">

      <div class="flex flex-col flex-grow-1 max-h-[500px]">
        <Releases />
      </div>
    </div>
</template>
