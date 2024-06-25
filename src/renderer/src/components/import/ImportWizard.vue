<script setup lang="ts">
import Modal from "../../modals/Modal.vue";
import GenericButton from "../buttons/GenericButton.vue"
import { ref } from "vue";
import { useModalStore } from "@renderer/store/modalStore";
import ImportSelection from "@renderer/components/import/ImportSelection.vue";
import * as CONSTANT from '../../assets/constants/index';
import ImportApplication from "@renderer/components/import/ImportApplication.vue";
import ImportVideo from "@renderer/components/import/ImportVideo.vue";

const modalStore = useModalStore();
const showImportModal = ref(false);
const importType = ref("");

const changeImportType = (value: string) => {
  importType.value = value;
}

const openModal = () => {
  showImportModal.value = true;
  modalStore.openModal = true;
}

const closeModal = () => {
  showImportModal.value = false;
  modalStore.openModal = false;
}
</script>

<template>
  <!--Anchor button used to control the modal-->
  <GenericButton
      class="w-full h-10"
      :type="'primary'"
      :callback="openModal"
      :spinnerColor="'#000000'"
  >Import</GenericButton>

  <!--Modal body using the Modal template, teleports the html to the bottom of the body tag-->
  <Teleport to="body">
    <Modal :show="showImportModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-12 px-4 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">Import wizard</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <ImportSelection v-if="importType === ''"  @import-type="changeImportType"/>
        <ImportApplication @close="closeModal" v-else-if="importType === CONSTANT.IMPORT_TYPE.APPLICATION"/>
        <ImportVideo @close="closeModal" v-else-if="importType === CONSTANT.IMPORT_TYPE.VIDEO"/>
      </template>

      <template v-slot:footer>
        <footer class="mt-2 mb-3 mx-4 text-right flex flex-row justify-between">
          <button class="w-24 h-8 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  :class="{'invisible': importType === ''}"
                  v-on:click="importType = ''"
          >Return</button>

          <button class="w-24 h-8 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="closeModal"
          >Close</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
