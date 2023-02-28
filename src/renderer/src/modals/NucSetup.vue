<script setup lang="ts">
import { computed, ref, reactive } from "vue";
import Modal from "./Modal.vue";
import GenericButton from "../components/buttons/GenericButton.vue"
import * as CONSTANT from "../assets/constants/_application"
import ManualProgress from "../components/loading/ManualProgress.vue";
import { useLibraryStore } from '../store/libraryStore'

const libraryStore = useLibraryStore()
const showNucModal = ref(false);
const pageNum = ref(0);
const back = ref(false);
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
};

/**
 * Calculate the amount of nuc inputs to track progress.
 */
const keys = reactive(Object.keys(form));
const progress = computed(() => {
  let formLength = novaStar.value ? keys.length : keys.length - 2;
  let completed = 0;

  for (const key of keys) {
    if (form[key] !== '' && form[key] !== undefined) {
      completed++;
    }
  }

  return Math.round((completed / formLength) * 100);
});

function changePage(forward: boolean) {
  forward ? pageNum.value++ : pageNum.value--;
}

function openModal() {
  showNucModal.value = true;
}

function closeModal() {
  pageNum.value = 0;
  showNucModal.value = false;
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
            <label>
              Encryption Key
            </label>
            <input
                v-model="form.AppKey"
                class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                placeholder="XXXX_0000"
                required />

            <label>
              Lab Location
            </label>
            <input
                v-model="form.LabLocation"
                class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                placeholder="Thebarton"
                required />

            <label>
              CBus IP Address
            </label>
            <input
                v-model="form.CbusIP"
                class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                placeholder="192.168.0.100"
                required />

            <label>
              CBus Nuc Script Id
            </label>
            <input
                v-model="form.CbusNucScriptId"
                class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                placeholder="4194304001"
                required />
          </div>

          <div v-if="pageNum === 1" class="mt-4 mx-5 flex flex-col">
              <label class="my-2">
                CBus Login details
              </label>
              <input
                  v-model="form.CbusLogin"
                  class="mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                  placeholder="username"
                  required />

              <input
                  v-model="form.CbusPassword"
                  class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                  placeholder="password"
                  required />

              <div class="flex flex-row justify-between">
                <label class="my-2">
                  NovaStar Login details <span class="text-xs">(Optional)</span>
                </label>

                <div class="items-center">
                  <label for="includeNova" class="text-xs mr-2">Include</label>
                  <input id="includeNova" v-model="novaStar" type="checkbox">
                </div>
              </div>
              <input
                  v-if="novaStar"
                  v-model="form.NovaStarLogin"
                  class="mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                  placeholder="username" />

              <input
                  v-if="novaStar"
                  v-model="form.NovaStarPassword"
                  class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                  placeholder="password" />
          </div>

          <div v-if="pageNum === 2" class="my-4 mx-5 flex flex-col">
            <label class="text-lg mb-2">
              Preview
            </label>

            <div v-for="(key, index) in Object.keys(form)" :key="index">
              {{key}} = {{form[key]}}
            </div>
          </div>

          <div class="flex justify-end">
            <button
                v-if="pageNum > 0"
                class="h-8 w-24 px-3 mt-2 mr-2 rounded-lg bg-primary text-white hover:bg-blue-400"
                v-on:click="changePage(false)"
            >Back</button>

            <button
                v-if="pageNum < 2"
                class="h-8 w-24 px-3 mt-2 mr-2 rounded-lg bg-primary text-white hover:bg-blue-400"
                v-on:click="changePage(true)"
            >Next</button>

            <button
                v-if="pageNum === 2"
                type="submit"
                class="h-8 w-24 px-3 mt-2 mr-2 rounded-lg bg-primary text-white hover:bg-blue-400"
                v-on:click="handleSubmit"
            >Save</button>
          </div>
        </form>

        <ManualProgress :progress="progress"/>
      </template>

      <template v-slot:footer>
        <footer class="mt-4 mb-6 text-right flex flex-row justify-end">
          <button class="w-24 h-8 mr-7 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="showNucModal = false"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
