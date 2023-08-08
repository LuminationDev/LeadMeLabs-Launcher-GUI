<script setup lang="ts">
import Modal from "./Modal.vue";
import GenericButton from "@renderer/components/buttons/GenericButton.vue";
import * as CONSTANT from "@renderer/assets/constants";
import { ref } from "vue";
import { useLibraryStore } from "@renderer/store/libraryStore";

const libraryStore = useLibraryStore();

defineExpose({
  openModal
});

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  callback: {
    type: Function,
    required: true
  }
})

const showModal = ref(false);

function openModal() {
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function confirm() {
  //Perform the callback
  props.callback();
  closeModal();
}
</script>

<template>
  <GenericButton
      v-if="[CONSTANT.MODEL_VALUE.STATUS_INSTALLED, CONSTANT.MODEL_VALUE.STATUS_RUNNING].includes(libraryStore.getSelectedApplicationStatus)"
      class="h-10 w-32 bg-white text-base
        text-red-400 font-poppins font-semibold
        rounded-md border-2 border-red-400 hover:bg-red-50"
      :callback="() => showModal = true"
      :spinnerColor="'#000000'"
  >Delete</GenericButton>

  <Teleport to="body">
    <Modal :show="showModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-12 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-bold text-black">{{ title }}</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <div class="px-8 w-128 pt-5 flex flex-col items-center mb-3">
          <p class="pb-5">
            {{ message }}
          </p>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="mb-2 text-right flex flex-row justify-end">
          <button class="w-20 h-10 mr-4 bg-red-800 text-white text-base rounded-lg hover:bg-red-500 font-medium"
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
