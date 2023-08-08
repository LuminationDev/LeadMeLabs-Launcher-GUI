<script setup lang="ts">
import GenericButton from "../components/buttons/GenericButton.vue";
import Modal from "./Modal.vue";
import { ref } from "vue";
import * as CONSTANT from "../assets/constants/index";
import {useLibraryStore} from "../store/libraryStore";

const libraryStore = useLibraryStore();

defineExpose({
  openModal
});

const showModal = ref(false);

function openModal() {
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function reset() {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.SCAN_MANIFEST
  });

  libraryStore.pin = '';
  libraryStore.mode = 'production';
  closeModal();
}
</script>

<template>
  <!--Anchor button used to control the modal-->
  <GenericButton
      class="w-full h-6 mt-2 bg-red-800 text-xs"
      :type="'primary'"
      :callback="openModal"
      :spinnerColor="'#000000'"
  >Reset Manifest</GenericButton>

  <Teleport to="body">
    <Modal :show="showModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-12 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">Manifest Reset</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <div class="px-8 w-128 pt-3 flex flex-col items-center mb-3">
          <p class="text-center pb-5">
            <b>WARNING:</b>

            Resetting the manifest will remove any imported experiences! This will overwrite the manifest and only include
            the LeadMe software (Station or NUC). Experiences will then need to be re-imported and Launcher settings will
            need to be re-entered.
          </p>

          <button class="w-20 h-10 mr-4 bg-red-800 text-white text-base rounded-lg hover:bg-red-500 font-medium"
                  v-on:click="reset"
          >Reset</button>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="mb-2 text-right flex flex-row justify-end">
          <button class="w-20 h-10 mr-4 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="showModal = false"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
