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
  },
  v$: {
    type: Object,
    required: true,
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
      :class="{'border-red-800 focus:border-red-900': v$.$error}"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="v$.$touch()"/>

  <div class="flex flex-col items-end mr-2" v-if="v$ && v$.$error">
    <div class="text-red-800 text-xs" v-for="error in v$.$errors">{{ error.$message }}</div>
  </div>
</template>
