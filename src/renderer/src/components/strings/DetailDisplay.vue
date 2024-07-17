<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  }
});
</script>

<template>
  <div>
    <span class="font-bold w-32">{{title}}:</span>
    <slot></slot>
  </div>
</template>
