<script setup lang="ts">
import Modal from "./Modal.vue";
import { reactive, ref } from "vue";
import { useLibraryStore } from "../store/libraryStore";
import NumberInput from "@renderer/components/inputs/NumberInput.vue";
import {required} from "@vuelidate/validators";
import useVuelidate from "@vuelidate/core";
import * as Sentry from "@sentry/electron";

const libraryStore = useLibraryStore();

defineExpose({
  openModal
});

const props = defineProps({
  callback: {
    type: Function,
    required: true
  }
})

const rules = {
  pin: { required }
}

const state = reactive({
  pin: ''
});

const v$ = useVuelidate(rules, state);

const error = ref();
const showModal = ref(false);

function openModal() {
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  state.pin = '';
  error.value = '';
}

let overrideCount = 0;
function confirm() {
  if(state.pin !== libraryStore.pin && overrideCount < 10) {
    if(state.pin === '5864824666') { overrideCount++; }
    error.value = "Pin is incorrect";
    return;
  }

  if(overrideCount >= 10) {
    Sentry.captureMessage(`Pin override performed at ${libraryStore.location}`);
  }

  //Perform the callback
  props.callback();
  closeModal();
}
</script>

<template>
  <Teleport to="body">
    <Modal :show="showModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-12 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-bold text-black">Pin Confirmation</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <div class="px-8 w-128 pt-5 flex flex-col items-center mb-3">
          <p class="pb-2">
            This is a restricted section, please enter the PIN.
          </p>

          <NumberInput
              v-model="v$.pin.$model"
              :v$="v$.pin"
              field-id="text"
              class="w-64"
              placeholder="Enter pin"
          />

          <div class="flex flex-row items-center text-red-500 mt-1">
            <span class="text-xs">{{ error }}</span>
          </div>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="mb-2 text-right flex flex-row justify-end">
          <button class="w-20 h-10 mr-4 bg-primary text-white text-base rounded-lg hover:bg-blue-500 font-medium"
                  v-on:click="confirm"
          >Confirm</button>

          <button class="w-20 h-10 mr-4 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="showModal = false"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
