<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    required: true
  },
  modelValue: {
    type: String,
    required: true
  }
});
</script>

<template>
  <label>
    {{title}}
  </label>
  <input
      :value="modelValue"
      class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
      required />
</template>
