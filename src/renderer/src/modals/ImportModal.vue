<script setup lang="ts">
import Modal from "./Modal.vue";
import GenericButton from "../components/buttons/GenericButton.vue"
import * as CONSTANT from "../assets/constants/index";
import { ref } from "vue";
import useVuelidate from "@vuelidate/core";
import { required, helpers } from "@vuelidate/validators";
import { useLibraryStore } from '../store/libraryStore'
import SetupSingleInput from "../components/inputs/SetupSingleInput.vue";

const libraryStore = useLibraryStore()
const showImportModal = ref(false);
const error = ref();
const name = ref("");
const filePath = ref("");
const fileInput = ref<HTMLInputElement | null>(null)

const rules = {
  name: {
    required: helpers.withMessage("File name is required", required),
    $autoDirty: true
  }
}

const v$ = useVuelidate(rules, { name });

const selectApplication = (): void => {
  filePath.value = fileInput.value.files[0]["path"];
}

/**
 * Make sure a file is selected, the path is at least 4 characters (C:/x) and that it is an executable.
 */
const importApplication = (): void => {
  if(filePath.value == "" || filePath.value == null) {
    error.value = "A file must be selected.";
    fileInput.value.value = "";
  } else if (!checkFileExtension(filePath.value)) {
    error.value = "File must be an executable (.exe)";
    fileInput.value.value = "";
  } else {
    //@ts-ignore
    api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
      channelType: CONSTANT.MESSAGE.APPLICATION_IMPORT,
      name: name.value,
      altPath: filePath.value
    });

    //Reset the file input
    fileInput.value.value = "";
    closeModal();
  }
}

/**
 * Check against the approved file extensions to see if we can properly manage the supplied file path.
 */
function checkFileExtension(filePath: String): boolean {
  let accepted: string[] = [".exe", ".lnk"];
  for (let extension of accepted) {
    if (filePath.endsWith(extension)) {
      return true;
    }
  }
  return false;
}

function openModal() {
  showImportModal.value = true;
}

function closeModal() {
  name.value = "";
  filePath.value = "";
  fileInput.value.value = "";
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
        <div class="flex flex-col mt-4 mx-4">
          <SetupSingleInput :title="'Experience Name'" :placeholder="'My Experience'" :v$="v$.name" v-model="name"/>

          <div class="flex justify-between mt-2">
            <label
                for="files"
                class="w-24 h-8 rounded-lg flex items-center justify-center"
                :class="{
                  'text-white bg-primary cursor-pointer hover:bg-blue-400': name.length > 0,
                  'text-white bg-gray-400': name.length === 0,
                }"
            >
              <input :disabled="name.length === 0" class="hidden" id="files" ref="fileInput" type="file" @change="selectApplication">
              Find file
            </label>

            <div class="w-full ml-10 text-xs overflow-y-auto items-center">{{filePath}}</div>
          </div>
          <div class="flex flex-col items-end mr-2" v-if="error">
            <div class="text-red-800 text-xs" >{{ error }}</div>
          </div>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="mt-4 mb-6 mx-4 text-right flex flex-row justify-between">
          <button class="w-24 h-8 bg-slate-800 text-white text-base rounded-lg hover:bg-blue-400 font-medium"
                  v-on:click="importApplication"
          >Save</button>

          <button class="w-24 h-8 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="closeModal"
          >Close</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
