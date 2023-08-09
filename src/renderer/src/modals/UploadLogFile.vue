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

const selectFiles = (): void => {
  console.log(fileInput.value.files);
}

async function uploadFiles(): Promise<void> {
  const files = fileInput.value.files;
  if (files.length === 0) {
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
    apiKey: "AIzaSyA5O7Ri4P6nfUX7duZIl19diSuT-wxICRc",
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
    const storage = getStorage();

    errorText.value = "uploading";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = ref(storage, `launcher/${siteName.value}/${room.value}/${softwareID.value == undefined ? "NUC" : "Station " + softwareID.value}/${file.name}`);

      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = (event) => {
        const fileString = event.target?.result as string;

        uploadString(storageRef, fileString, "raw")
            .then(() => {
              console.log(`File ${file.name} uploaded successfully`);
            })
            .catch((error) => {
              console.error(`Error uploading file ${file.name}: ${error}`);
            });
      };
    }
    errorText.value = "uploaded";

  }).catch((error) => {
    errorText.value = error
  });
}

const room = vueRef("");
const softwareID = vueRef("");
const siteName = vueRef("");

const setupParams = computed(() => libraryStore.applicationSetup);
watch(setupParams, (newValue) => {
  if(newValue.length === 0) {
    return;
  }

  newValue.forEach(value => {
    let values = value.split("=");

    switch (values[0]) {
      case "room":
        room.value = values[1];
        break;
      case "StationId":
        softwareID.value = values[1];
        break;
      case "LabLocation":
        siteName.value = values[1];
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
      class="h-6 w-20 -mt-0.5"
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
