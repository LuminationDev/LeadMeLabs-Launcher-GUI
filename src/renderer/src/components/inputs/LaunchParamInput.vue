<script setup lang="ts">
import { ref } from "vue";

const collapse = ref(false);

defineProps({
  id: {
    type: Number,
    required: true,
  },
  paramInput: {
    type: Object,
    required: true,
  },
  keyError: {
    type: Boolean,
    required: true,
  },
  valueError: {
    type: Boolean,
    required: true,
  },
});
</script>

<template>
  <div class="flex flex-col w-full mx-5">
    <div class="flex flex-row justify-between">
      <label class="my-2">
        {{paramInput['key']}}:{{paramInput['value']}}
      </label>

      <div class="items-center">
        <div>
          <label for="collapseInputs" class="text-xs mr-2">Collapse</label>
          <input id="collapseInputs" v-model="collapse" type="checkbox">
        </div>
          <div
              class="ml-4 mr-2 text-lg text-red-600 font-semibold cursor-pointer"
              v-on:click="$emit('remove-input')"
          >X</div>
      </div>
    </div>

    <div class="flex flex-col">

      <input
          :value="paramInput.key" @input="$emit('update-key', $event.target.value)"
          class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
          :class="{
            'border-red-800 focus:border-red-900': keyError,
            'hidden': collapse
          }"
          placeholder="key"
          @blur="$emit('change-validation', id, 'key', paramInput.key === '')" />

      <div class="flex flex-col items-end mr-2" v-if="keyError">
        <div class="text-red-800 text-xs">A key is required.</div>
      </div>

      <input
          :value="paramInput.value" @input="$emit('update-value', $event.target.value)"
          class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
          :class="{
            'border-red-800 focus:border-red-900': valueError,
            'hidden': collapse
          }"
          placeholder="value"
          @blur="$emit('change-validation', id, 'value', paramInput.value === '')" />

      <div class="flex flex-col items-end mr-2" v-if="valueError">
        <div class="text-red-800 text-xs">A value is required.</div>
      </div>
    </div>
  </div>
</template>
