<script setup lang="ts">
import { ref } from 'vue';

defineProps({
  text: {
    type: String,
    required: true
  }
});

const isHovered = ref(false);
</script>

<template>
  <div class="w-[480px] h-[22px] overflow-hidden"
       @mouseenter="isHovered = true"
       @mouseleave="isHovered = false">

    <span
        :class="{
          'inline-block whitespace-nowrap overflow-visible relative scrolling-text': isHovered,
          'truncate': !isHovered
        }"
    >
      {{ text }}
    </span>
  </div>
</template>

<style scoped>
.scrolling-text {
  animation: scrollText 10s linear infinite; /* Adjust timing and duration as needed */
}

@keyframes scrollText {
  0% {
    transform: translateX(0); /* Start from initial position */
  }
  100% {
    transform: translateX(-100%);
  }
}
</style>
