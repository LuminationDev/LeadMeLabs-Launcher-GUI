<script setup lang="ts">
defineProps({
  show: Boolean,
  rounded: {
    type: Boolean,
    default: true
  }
});

</script>

<template>
  <Transition
    enter-from-class="opacity-0 scale-110"
    enter-to-class="opacity-100 scale-100"
    enter-active-class="transition duration-300"
    leave-active-class="transition duration-200"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-110"
  >
    <div v-if="show" @mousedown="$emit('close')" class="fixed inset-0 bg-modal-site-background grid place-items-center font-poppins">
      <div @mousedown.stop class="bg-panel flex flex-col" :class="rounded ? 'rounded-lg' : ''">
        <slot name="header"></slot>
        <slot name="content"></slot>
        <slot name="footer"></slot>
      </div>
    </div>
  </Transition>
</template>
