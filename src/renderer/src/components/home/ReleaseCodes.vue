<script setup lang="ts">
import { code } from "@renderer/assets/strings/releases";

defineProps({
  codes: {
    type: Object as () =>  code,
    required: false
  }
});
</script>

<template>
  <div class="flex flex-col my-5">
    <h2 class="title font-bold text-lg">
      Version Codes
    </h2>

    <div v-for="(value, key) in codes" :key="key">
      <div class="flex flex-col w-full mx-6">
        <div class="flex flex-row justify-between my-1">
          <div>
            {{ key }}
          </div>
          <div>
            {{ value }}
          </div>
        </div>

        <hr class="border bg-gray-500"/>
      </div>
    </div>
  </div>
</template>
