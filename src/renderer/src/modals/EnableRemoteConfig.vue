<script setup lang="ts">
import GenericButton from '../components/buttons/GenericButton.vue'
import Modal from "./Modal.vue";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, signInWithCustomToken } from "firebase/auth";
import { required, email, alphaNum } from "@vuelidate/validators";
import { reactive, ref as vueRef } from "vue";
import useVuelidate from "@vuelidate/core";
import TextInput from "../components/inputs/TextInput.vue";
import { useLibraryStore } from "../store/libraryStore";
import * as CONSTANT from '../assets/constants/index';

const libraryStore = useLibraryStore();

const rules = {
  email: {
    required,
    email
  },
  password: { required },
  uid: {
    required,
    alphaNum
  }
}

const state = reactive({
  email: '',
  password: '',
  uid: ''
});

const v$ = useVuelidate(rules, state);
const errorText = vueRef("");
const showUploadModal = vueRef(false);

async function submit(): Promise<void> {
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

  signInWithEmailAndPassword(auth, state.email, state.password).then(async (tokenDetails) => {
    errorText.value = "uploading";
    const response = await fetch("https://us-central1-leadme-labs.cloudfunctions.net/getCustomToken", {
      method: "POST",
      body: JSON.stringify({
        uid: state.uid,
        token: await tokenDetails.user.getIdToken()
      })
    })
    await signOut(auth)
    const newAuth = await signInWithCustomToken(auth, await response.text() + "")
    api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
      channelType: CONSTANT.MESSAGE.SET_REMOTE_CONFIG,
      value: {
        uid: state.uid,
        refreshToken: newAuth.user.refreshToken,
        name: libraryStore.getSelectedApplicationName
      }
    });
    errorText.value = "uploaded";

  }).catch((error) => {
    errorText.value = error
  });
}

function openModal() {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.CONFIG_APPLICATION_GET,
    name: libraryStore.getSelectedApplicationName
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
      class="h-6 w-40 -mt-0.5"
      :type="'primary'"
      :callback="openModal"
      :spinnerColor="'#000000'"
  >{{ libraryStore.getSelectedApplication.remoteConfigStatus ? 'Remote Enabled' : 'Enable Remote' }}</GenericButton>

  <Teleport to="body">
    <Modal :show="showUploadModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-12 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">Enable Remote Config</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
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
          <TextInput
              ref="uidRef"
              v-model="v$.uid.$model"
              :v$="v$.uid"
              field-id="uid"
              class="my-2 w-full"
              placeholder="thebarton-station-1"
          >
            <template #label>UID</template>
          </TextInput>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="mt-4 mb-2 mx-2 flex flex-col">
          <div class="text-right flex flex-row justify-between">
            <GenericButton
                type="primary"
                class="w-32"
                :callback="submit"
            >Submit</GenericButton>

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
