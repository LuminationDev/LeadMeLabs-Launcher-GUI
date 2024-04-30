<script setup lang="ts">
import Modal from "./Modal.vue";
import { useModalStore } from "@renderer/store/modalStore";

const modalStore = useModalStore();

function openModal() {
  modalStore.notificationModelOpen = true;
}

function closeModal() {
  modalStore.notificationModelOpen = false;
}
</script>

<template>
  <Teleport to="body">
    <Modal :show="modalStore.notificationModelOpen" @close="closeModal">
      <template v-slot:header>
        <header class="h-12 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">{{modalStore.notificationModelTitle}}</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <div class="px-6 w-128 flex flex-grow-0 pt-3 pb-7 whitespace-pre-line break-all">
          {{modalStore.notificationModelMessage}}
        </div>
      </template>

      <template v-slot:footer>
        <footer class="my-2 text-right flex flex-row justify-end">
          <button class="w-20 h-10 mr-4 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="modalStore.notificationModelOpen = false"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
