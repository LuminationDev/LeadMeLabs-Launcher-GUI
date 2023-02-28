<script setup lang="ts">
defineProps({
  tip: {
    type: String,
    required: true
  },

  toolTipMargin: {
    type: String,
    default: '-ml-1.5'
  },

  arrowMargin: {
    type: String,
    default: 'ml-0.5'
  }
})
</script>

<template>
  <span :class="toolTipMargin" class="tooltip rounded shadow-lg px-3 py-1 bg-gray-700 rounded-xl text-white -mt-8">{{ tip }}</span>
  <div :class="arrowMargin" class="tooltip h-0 w-0 rotate-180 border-x-8 border-x-transparent border-b-[7px] border-b-gray-700 -mt-1.5"></div>
</template>

<style scoped>
.tooltip {
  @apply invisible absolute;
}

.has-tooltip:hover .tooltip {
  visibility: hidden;
  animation: disappear 4s ease-out 1s;
}

@keyframes disappear {
  0% {
    visibility: visible;
  }

  50% {
    opacity: 1;
  }

  95% {
    z-index: 50;
  }

  100% {
    opacity: 0;
    z-index: -100;
  }
}
</style>