<script setup lang="ts">
import Modal from "./Modal.vue";
import { useModalStore } from "@renderer/store/modalStore";

const modalStore = useModalStore();

const closeModal = () => {
  modalStore.errorModelOpen = false;
}
</script>

<template>
  <Teleport to="body">
    <Modal :show="modalStore.errorModelOpen">
      <template v-slot:header>
        <header class="h-12 px-8 w-96 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">LeadMe Launcher Error</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <div class="px-8 w-96 pt-3 pb-7 flex flex-col items-center">
          <p class="mb-3">{{modalStore.errorModelMessage}}</p>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="my-2 text-right flex flex-row justify-end">
          <button class="w-20 h-10 mr-4 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="closeModal"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
