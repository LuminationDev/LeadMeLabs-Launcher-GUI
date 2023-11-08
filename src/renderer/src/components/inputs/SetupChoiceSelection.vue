<script setup lang="ts">
// @ts-ignore
defineProps({
  title: {
    type: String,
    required: true
  },
  choices: {
    type: Array<string>,
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
  <label class="my-2">
    {{title}}
  </label>

  <div class="flex mx-5">
    <div v-for="type in choices" v-bind:key="type">

      <div
          @click="$emit('update:modelValue', type.split(' ').join(''))"
          class="w-28 mr-4 rounded-lg justify-center cursor-pointer"
          :class="{
                    'bg-gray-300 hover:bg-gray-200': type.split(' ').join('') !== modelValue,
                    'bg-green-300 hover:bg-green-200': type.split(' ').join('') === modelValue
                  }">
        {{type}}
      </div>
    </div>
  </div>

  <div class="flex flex-col items-end mr-2" v-if="v$ && v$.$error">
    <div class="text-red-800 text-xs" v-for="error in v$.$errors">{{ error.$message }}</div>
  </div>
</template>
