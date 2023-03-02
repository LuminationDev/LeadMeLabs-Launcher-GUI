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
  optional: {
    type: Boolean,
    required: false,
    default: false
  },
  //TODO PASSING IN A STRING??
  visible: {
    type: Boolean,
    required: false,
    default: true
  },
});
</script>

<template>
  <div v-if="optional" class="flex flex-row justify-between">
    <label class="my-2">
      {{title}} <span class="text-xs">(Optional)</span>
    </label>

    <div class="items-center">
      <label for="includeNova" class="text-xs mr-2">Include</label>
      <input
          type="checkbox"
          id="includeNova"
          :value="visible"
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
      :placeholder="placeholderOne"
      @input="$emit('update:inputOne', $event.target.value)"
      required />

  <input
      v-if="visible"
      :value="inputTwo"
      class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
      :placeholder="placeholderTwo"
      @input="$emit('update:inputTwo', $event.target.value)"
      required />
</template>
