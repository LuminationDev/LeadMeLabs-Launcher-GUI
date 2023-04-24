<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  },
  placeholderOne: {
    type: String,
    required: true
  },
  placeholderTwo: {
    type: String,
    required: true
  },
  inputOne: {
    type: String,
    required: true
  },
  inputTwo: {
    type: String,
    required: true
  },
  v$One: {
    type: Object,
    required: true,
  },
  v$Two: {
    type: Object,
    required: true,
  },
  optional: {
    type: Boolean,
    required: false,
    default: false
  },
  visible: {
    type: Boolean,
    required: false,
    default: true
  }
});
</script>

<template>
  <div v-if="optional" class="flex flex-row justify-between">
    <label class="my-2">
      {{title}} <span class="text-xs">(Optional)</span>
    </label>

    <div class="items-center">
      <label for="optional" class="text-xs mr-2">Include</label>
      <input
          type="checkbox"
          id="optional"
          :checked="visible"
          @input="$emit('update:visible', $event.target.checked)" >
    </div>
  </div>

  <label v-else class="my-2">
    {{title}}
  </label>

  <input
      v-if="visible"
      :value="inputOne"
      class="mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
      :class="{'border-red-800 focus:border-red-900': v$One.$error}"
      :placeholder="placeholderOne"
      @input="$emit('update:inputOne', $event.target.value)" />

  <div class="flex flex-col items-end mr-2" v-if="v$One && v$One.$error && visible">
    <div class="text-red-800 text-xs" v-for="error in v$One.$errors">{{ error.$message }}</div>
  </div>

  <input
      v-if="visible"
      :value="inputTwo"
      class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
      :class="{'border-red-800 focus:border-red-900': v$Two.$error}"
      :placeholder="placeholderTwo"
      @input="$emit('update:inputTwo', $event.target.value)"/>

  <div class="flex flex-col items-end mr-2" v-if="v$Two && v$Two.$error && visible">
    <div class="text-red-800 text-xs" v-for="error in v$Two.$errors">{{ error.$message }}</div>
  </div>
</template>
