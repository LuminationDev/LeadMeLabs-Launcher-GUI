<script setup lang="ts">
import { ref, defineEmits } from "vue";

const collapse = ref(false);

defineProps({
  paramInput: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update', 'add-key', 'remove-input']);

function updateValue(newValue) {
  emit('update', newValue)
}

function updateKey(newKey) {
  emit('add-key', newKey)
}

function removeInput() {
  emit('remove-input')
}
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
              v-on:click="removeInput"
          >X</div>
      </div>
    </div>

    <div
        class="flex flex-col"
        :class="{'hidden': collapse}">
      <input
          :value="paramInput.key" @input="updateKey($event.target.value)"
          class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
          placeholder="key"
          required />
      <input
          :value="paramInput.value" @input="updateValue($event.target.value)"
          class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
          placeholder="value"
          required />
    </div>
  </div>
</template>
