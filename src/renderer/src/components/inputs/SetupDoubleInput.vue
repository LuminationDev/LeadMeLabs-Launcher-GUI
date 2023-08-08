<script setup lang="ts">
import {ref} from "vue";

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

const showPassword = ref(false)
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

  <div class="flex flex-row">
    <div class="relative w-full">

      <input
          v-if="visible"
          :value="inputTwo"
          class="my-2 mx-2 py-1 px-3 w-full bg-white rounded-lg border-gray-300 border"
          :class="{'border-red-800 focus:border-red-900': v$Two.$error}"
          :type="showPassword ? 'text' : 'password'"
          :placeholder="placeholderTwo"
          @input="$emit('update:inputTwo', $event.target.value)"/>

      <button
          type="button"
          class="absolute right-0 w-6 h-5 mt-3.5 mr-3 rounded-br-lg rounded-tr-lg bg-white"
          @click="showPassword = !showPassword">
            <span class="flex justify-center">
              <img v-if="showPassword" class="w-6 h-5" src="../../assets/icons/eye-icon.svg" alt="Icon"/>
              <img v-else class="w-6 h-5" src="../../assets/icons/eye-slash-icon.svg" alt="Icon"/>
            </span>
      </button>
    </div>
  </div>

  <div class="flex flex-col items-end mr-2" v-if="v$Two && v$Two.$error && visible">
    <div class="text-red-800 text-xs" v-for="error in v$Two.$errors">{{ error.$message }}</div>
  </div>
</template>
