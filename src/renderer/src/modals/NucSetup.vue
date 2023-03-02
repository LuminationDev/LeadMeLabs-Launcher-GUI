<script setup lang="ts">
import { computed, ref, reactive } from "vue";
import Modal from "./Modal.vue";
import GenericButton from "../components/buttons/GenericButton.vue"
import * as CONSTANT from "../assets/constants/_application"
import ManualProgress from "../components/loading/ManualProgress.vue";
import SetupSingleInput from "../components/forms/SetupSingleInput.vue";
import SetupDoubleInput from "../components/forms/SetupDoubleInput.vue";
import SetupNavigation from "../components/forms/SetupNavigation.vue";
import { useLibraryStore } from '../store/libraryStore';

const libraryStore = useLibraryStore()
const showNucModal = ref(false);
const pageNum = ref(0);
const back = ref(false);
const saved = ref(false);
const novaStar = ref(false);

const form = reactive({
  AppKey: '',
  LabLocation: '',
  CbusIP: '',
  CbusNucScriptId: '',
  CbusLogin: '',
  CbusPassword: '',
  NovaStarLogin: '',
  NovaStarPassword: '',
});

const handleSubmit = () => {
  // handle form submission here
  //Transform the form into the useful information
  const data = form;

  data['CbusLogin'] = `${form.CbusLogin}:${form.CbusPassword}`;
  delete data['CbusPassword'];

  //Add or remove the NovaStar details depending on if they exist
  if(novaStar.value && form.NovaStarLogin && form.NovaStarPassword) {
    data['NovaStarLogin'] = `${form.NovaStarLogin}:${form.NovaStarPassword}`;
    delete data['NovaStarPassword'];
  } else {
    delete data['NovaStarLogin'];
    delete data['NovaStarPassword'];
  }

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.CONFIG_APPLICATION,
    name: libraryStore.getSelectedApplication.name,
    value: JSON.stringify(data)
  });

  saved.value = true;
};

/**
 * Calculate the amount of nuc inputs to track progress.
 */
const keys = reactive(Object.keys(form));
const progress = computed(() => {
  let formLength = novaStar.value ? keys.length : keys.length - 2;

  if(saved.value) {
    formLength -= 1;
  }

  let completed = 0;

  for (const key of keys) {
    if (form[key] !== '' && form[key] !== undefined) {
      completed++;
    }
  }

  return Math.round((completed / formLength) * 100);
});

/**
 * Change the page if the current items pass validation.
 */
function changePage(forward: boolean) {
  forward ? pageNum.value++ : pageNum.value--;
}

function openModal() {
  showNucModal.value = true;
}

function closeModal() {
  pageNum.value = 0;
  showNucModal.value = false;
  saved.value = false;
}
</script>

<template>
  <!--Anchor button used to control the modal-->
  <GenericButton
      id="share_button"
      :type="'primary'"
      :callback="openModal"
      :spinnerColor="'#000000'"
  >Setup</GenericButton>

  <!--Modal body using the Modal template, teleports the html to the bottom of the body tag-->
  <Teleport to="body">
    <Modal :show="showNucModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-20 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">NUC setup wizard</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <!--A basic form separated into different pages-->
        <form @submit.prevent class="mt-4 mx-5">
          <div v-if="pageNum === 0" class="mt-4 mx-5 flex flex-col">
            <SetupSingleInput :title="'Encryption Key'" :placeholder="'XXXX_0000'" v-model="form.AppKey"/>
            <SetupSingleInput :title="'Lab Location'" :placeholder="'Thebarton'" v-model="form.LabLocation"/>
            <SetupSingleInput :title="'CBus IP Address'" :placeholder="'192.168.0.100'" v-model="form.CbusIP"/>
            <SetupSingleInput :title="'CBus Nuc Script Id'" :placeholder="'4194305000'" v-model="form.CbusNucScriptId"/>
          </div>

          <div v-if="pageNum === 1" class="mt-4 mx-5 flex flex-col">
            <SetupDoubleInput
                :title="'CBus Account details'"
                :placeholderOne="'username'"
                :placeholderTwo="'password'"
                v-model:input-one="form.CbusLogin"
                v-model:input-two="form.CbusPassword"
            />

            <SetupDoubleInput
                :title="'NovaStar Login details'"
                :placeholderOne="'username'"
                :placeholderTwo="'password'"
                v-model:input-one="form.NovaStarLogin"
                v-model:input-two="form.NovaStarPassword"
                :optional="true"
                v-model:visible="novaStar"
            />
          </div>

          <div v-if="pageNum === 2" class="my-4 mx-5 flex flex-col">
            <label class="text-lg mb-2">
              Preview
            </label>

            <div v-for="(key, index) in Object.keys(form)" :key="index">
              <div v-if="!key.includes('NovaStar')">
                {{key}} = {{form[key]}}
              </div>
              <div v-else-if="novaStar && key.includes('NovaStar')">
                {{key}} = {{form[key]}}
              </div>
            </div>
          </div>

          <SetupNavigation
              v-model:pageNum="pageNum"
              v-model:saved="saved"
              @change-page="changePage"
              @close-modal="closeModal"
              @handle-submit="handleSubmit"/>
        </form>

        <ManualProgress v-if="!saved" :progress="progress"/>
      </template>

      <template v-slot:footer>
        <footer class="mt-4 mb-6 text-right flex flex-row justify-end">
          <button v-if="!saved" class="w-24 h-8 mr-7 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="closeModal"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
