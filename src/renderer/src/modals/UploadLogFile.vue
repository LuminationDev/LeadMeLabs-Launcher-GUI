<script setup lang="ts">
import GenericButton from '../components/buttons/GenericButton.vue'
import Modal from "./Modal.vue";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getStorage, ref, uploadString } from "firebase/storage";
import { required, email } from "@vuelidate/validators";
import { computed, reactive, ref as vueRef, watch } from "vue";
import useVuelidate from "@vuelidate/core";
import TextInput from "../components/inputs/TextInput.vue";
import { useLibraryStore } from "../store/libraryStore";
import * as CONSTANT from "../assets/constants/index";

const libraryStore = useLibraryStore();
const props = defineProps({
  softwareName: {
    type: String,
    required: true
  }
});

const rules = {
  email: {
    required,
    email
  },
  password: { required }
}

const state = reactive({
  email: '',
  password: ''
});

const v$ = useVuelidate(rules, state);
const errorText = vueRef("");
const showUploadModal = vueRef(false);
const fileInput = vueRef<HTMLInputElement | null>(null);

let fileContentsArray: { [key: string]: string }[] = [];
const selectFiles = (): void => {
  if (fileInput.value !== null) {
    fileContentsArray = [];

    const selectedFiles = fileInput.value.files;

    if (selectedFiles) {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (event) => {
          const fileString = event.target?.result as string;
          const fileObject = { [file.name]: fileString };
          fileContentsArray.push(fileObject);

          // Check if all files have been read
          if (fileContentsArray.length === selectedFiles.length) {
            // All files have been read, you can now use fileContentsArray
            console.log("File contents array:", fileContentsArray);
          }
        };
        reader.onerror = (event) => {
          console.error('File reading error:', event.target.error);
        };
      }
    }
    console.log(fileInput.value.files);
  }
}

async function uploadFiles(): Promise<void> {
  if(fileInput.value == null) {
    errorText.value = "Please select files to upload.";
    return;
  }
  const files = fileInput.value.files;
  if (files === null || files.length === 0) {
    errorText.value = "Please select files to upload.";
    return;
  }

  errorText.value = ""
  // @ts-ignore
  await v$.value.$validate()
  // @ts-ignore
  if (v$.value.$invalid) {
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyDeXIbE7PvD5b3VMwkQNhWcvzmkEqD1zEQ",
    authDomain: "leadme-labs.firebaseapp.com",
    projectId: "leadme-labs",
    storageBucket: "leadme-labs.appspot.com",
    messagingSenderId: "676443233497",
    appId: "1:676443233497:web:6c5fd1e7f5ec334c3972c8",
    measurementId: "G-VP5XSL3TJR"
  };

  // Initialize Firebase
  initializeApp(firebaseConfig);
  const auth = getAuth();

  signInWithEmailAndPassword(auth, state.email, state.password).then(() => {
    if (fileContentsArray.length == 0) {
      errorText.value = "No files found"
      return;
    }

    const storage = getStorage();

    errorText.value = "uploading";

    fileContentsArray.map((fileObject) => {
      for (const fileName in fileObject) {
        if (fileObject.hasOwnProperty(fileName)) {
          const fileContent = fileObject[fileName];

          const deviceName = StationId.value == undefined || StationId.value.length == 0 ? "NUC" : "Station " + StationId.value;
          const storageRef = ref(storage, `launcher/${LabLocation.value}/${room.value}/${deviceName}/${fileName}`);

          uploadString(storageRef, fileContent, "raw")
              .then(() => {
                console.log(`File ${fileName} uploaded successfully`);
                errorText.value = "uploaded";
              })
              .catch((error) => {
                console.log(`Error uploading file ${fileName}: ${error}`);
                errorText.value = "File not uploaded";
              });
        }
      }
    });
  }).catch((error) => {
    console.log(error);
    errorText.value = error
  });
}

const room = vueRef("");
const StationId = vueRef("");
const LabLocation = vueRef("");

const setupParams = computed(() => libraryStore.applicationSetup);
watch(setupParams, (newValue) => {
  if(newValue.length === 0) {
    return;
  }

  newValue.forEach((value: string) => {
    let values = value.split("=");

    switch (values[0]) {
      case "room":
        room.value = values[1];
        break;
      case "StationId":
        StationId.value = values[1];
        break;
      case "LabLocation":
        LabLocation.value = values[1];
        break;
    }
  });
});

function openModal() {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.CONFIG_APPLICATION_GET,
    name: props.softwareName
  });

  showUploadModal.value = true;
}
function closeModal() {
  showUploadModal.value = false;
}
</script>

<template>
  <!--Anchor button used to control the modal-->
  <GenericButton
      id="share_button"
      class="h-6 w-20 -mt-0.5 mr-2"
      :type="'primary'"
      :callback="openModal"
      :spinnerColor="'#000000'"
  >Upload Logs</GenericButton>

  <Teleport to="body">
    <Modal :show="showUploadModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-12 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">{{props.softwareName}} -- Upload Log Files</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <div class="w-full flex justify-center pt-2 bg-white">
          <label
              for="files"
              class="w-32 h-10 rounded-lg flex items-center justify-center
              text-white bg-primary cursor-pointer hover:bg-blue-400"
          >
            <input class="hidden" id="files" ref="fileInput" type="file" @change="selectFiles">
            Find files
          </label>
        </div>

        <div class="px-8 w-full pt-3 pb-7 bg-white flex flex-col items-center">
          <TextInput
              ref="emailInputRef"
              v-model="v$.email.$model"
              :v$="v$.email"
              field-id="email"
              class="my-2 w-full"
              placeholder="example@example.com"
          >
            <template #label>Email</template>
          </TextInput>
          <TextInput
              ref="passwordInputRef"
              v-model="v$.password.$model"
              :v$="v$.password"
              field-id="password"
              placeholder="&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;"
              :password="true"
              class="my-2 w-full"
          >
            <template #label>Password</template>
          </TextInput>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="mt-4 mb-2 mx-2 flex flex-col">
          <div class="text-right flex flex-row justify-between">
            <GenericButton
                type="primary"
                class="w-32"
                :callback="uploadFiles"
            >Upload Files</GenericButton>

            <button class="w-24 h-10 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                    v-on:click="closeModal"
            >Close</button>
          </div>

          <div class="flex flex-row justify-center text-sm text-red-400 mt-2" v-if="errorText">{{ errorText }}</div>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
