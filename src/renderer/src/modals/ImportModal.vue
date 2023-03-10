<script setup lang="ts">
import Modal from "./Modal.vue";
import GenericButton from "../components/buttons/GenericButton.vue"
import { useLibraryStore } from '../store/libraryStore'
import * as CONSTANT from "../assets/constants/_application";
import { Application } from "../models";
import { ref } from "vue";

const libraryStore = useLibraryStore()
const showImportModal = ref(false);
const name = ref("");
const fileInput = ref<HTMLInputElement | null>(null)

const importApplication = (): void => {
  let altPath = fileInput.value.files[0]["path"];
  //Make sure a file is selected and that it is an executable
  if(altPath != null && altPath.endsWith(".exe")) {
    //@ts-ignore
    api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
      channelType: CONSTANT.APPLICATION_IMPORT,
      name: name.value,
      altPath
    });
  }

  //Reset the file input
  fileInput.value.value = "";
}

// @ts-ignore
api.ipcRenderer.on('application_imported', (event, info) => {
  if(info.action === "import") {
    let application: Application = new Application(
        info.id,
        info.name,
        '',
        info.altPath,
        CONSTANT.STATUS_INSTALLED
    );

    //Add the application to the library list
    libraryStore.addImportApplication(application)
  } else if (info.action === "removed") {
    libraryStore.removeImportedApplication(info.name);
  }
});

function openModal() {
  showImportModal.value = true;
}

function closeModal() {
  showImportModal.value = false;
}
</script>

<template>
  <!--Anchor button used to control the modal-->
  <GenericButton
      class="w-full h-6 mt-2"
      :type="'primary'"
      :callback="openModal"
      :spinnerColor="'#000000'"
  >Import</GenericButton>

  <!--Modal body using the Modal template, teleports the html to the bottom of the body tag-->
  <Teleport to="body">
    <Modal :show="showImportModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-20 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">Import wizard</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <div class="flex flex-col mt-4 mx-5">
          <label>
            Experience Name
          </label>
          <input
              v-model="name"
              class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
              placeholder="My Experience"
              required />

          <div class="flex justify-center">
            <label
                for="files"
                class="w-24 h-8 mt-2 rounded-lg flex items-center justify-center"
                :class="{
                  'text-white bg-primary cursor-pointer hover:bg-blue-400': name.length > 0,
                  'text-white bg-gray-400': name.length === 0,
                }"
            >
              <input :disabled="name.length === 0" class="hidden" id="files" ref="fileInput" type="file" @change="importApplication">
              Find file
            </label>
          </div>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="mt-4 mb-6 mx-4 text-right flex flex-row justify-end">
          <button class="w-24 h-8 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="closeModal"
          >Close</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
