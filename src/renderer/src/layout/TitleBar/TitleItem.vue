<script setup lang="ts">
import { computed, ref } from "vue";
import TitleMenuMinimise from "@renderer/assets/vue/TitleMenuMinimise.vue";
import TitleMenuMaximise from "@renderer/assets/vue/TitleMenuMaximise.vue";
import TitleMenuClose from "@renderer/assets/vue/TitleMenuClose.vue";

defineProps({
  callback: {
    type: Function,
    required: true
  },
  buttonType: {
    type: String,
    required: true
  }
});

const hovered = ref(false);

const color = computed(() => {
  return hovered.value ? '#FFFFFF' : '#d3d3d3';
})
</script>

<template>
  <div class="non-draggable cursor-pointer"
       @mouseover="hovered = true" @mouseleave="hovered = false"
       @click="callback">

    <TitleMenuMinimise v-if="buttonType === 'minimise'" :colour="color"/>
    <TitleMenuMaximise v-else-if="buttonType === 'maximise'"  :colour="color"/>
    <TitleMenuClose v-else-if="buttonType === 'close'"  :colour="color"/>
  </div>
</template>
