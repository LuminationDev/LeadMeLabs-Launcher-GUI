<script setup lang="ts">
defineProps({
  progress: {
    type: Number,
    required: false
  }
});
</script>

<template>
  <!--Percent complete bar-->
  <div class="flex h-20 sticky items-center flex-col flex-shrink-0 justify-center">
    <div class="flex justify-start w-11/12">
      <span class="text-xs">{{progress}}%</span>
    </div>
    <div class="w-11/12 relative">
      <div
          class="bg-slate-800 rounded-full h-2 absolute z-10"
          :style="{ width: progress + '%' }"
      ></div>
      <div class="w-full bg-zinc-300 rounded-full h-2 absolute"></div>
    </div>
  </div>
</template>
