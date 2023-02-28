<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import Modal from "./Modal.vue";
import GenericButton from "../components/buttons/GenericButton.vue"
import * as CONSTANT from "../assets/constants/_application"
import ManualProgress from "../components/loading/ManualProgress.vue";
import { useLibraryStore } from '../store/libraryStore'

const libraryStore = useLibraryStore()
const showStationModal = ref(false);
const pageNum = ref(0);
const back = ref(false);

function configureSteamCMD() {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.CONFIG_APPLICATION_STEAMCMD
  });
  closeModal();
}

const form = reactive({
  AppKey: '',
  LabLocation: '',
  StationId: '',
  room: '',
  NucAddress: '',
  SteamUserName: '',
  SteamPassword: '',
  StationMode: '',
  HeadsetType: '',
});

const stationModes = ['VR', 'Appliance', 'Content'];
const headsetTypes = ['Vive Pro 1', 'Vive Pro 2'];

const handleSubmit = () => {
  // handle form submission here
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.CONFIG_APPLICATION,
    name: libraryStore.getSelectedApplication.name,
    value: JSON.stringify(form)
  });
};

/**
 * Calculate the amount of nuc inputs to track progress.
 */
const keys = reactive(Object.keys(form));
const progress = computed(() => {
  let formLength = keys.length;
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
  showStationModal.value = true;
}

function closeModal() {
  pageNum.value = 0;
  showStationModal.value = false;
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
    <Modal :show="showStationModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-20 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">Station setup wizard</span>
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
              Station ID
            </label>
            <input
                v-model="form.StationId"
                class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                placeholder="1"
                required />

            <label>
              Room
            </label>
            <input
                v-model="form.room"
                class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                placeholder="Classroom"
                required />

            <label>
              NUC IP Address
            </label>
            <input
                v-model="form.NucAddress"
                class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                placeholder="192.168.0.100"
                required />
          </div>

          <div v-if="pageNum === 1" class="mt-4 mx-5 flex flex-col">
            <label class="my-2">
              Steam Account details
            </label>
            <input
                v-model="form.SteamUserName"
                class="mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                placeholder="username"
                required />

            <input
                v-model="form.SteamPassword"
                class="my-2 mx-2 py-1 px-3 bg-white rounded-lg border-gray-300 border"
                placeholder="password"
                required />

            <div class="flex justify-end">
              <button
                  :disabled="form['SteamPassword'] === '' || form['SteamUserName'] === ''"
                  class="h-8 w-56 px-3 mt-2 mr-2 rounded-lg bg-primary text-white"
                  :class="{
                    'bg-gray-300': form['SteamPassword'] === '' || form['SteamUserName'] === '',
                    'hover:bg-blue-400': form['SteamPassword'] !== '' || form['SteamUserName'] !== ''
                  }"
                  v-on:click="configureSteamCMD"
              >Configure SteamCMD</button>
            </div>

            <label class="my-2">
              Station Mode
            </label>

            <div class="flex mx-5">
              <div v-for="type in stationModes" v-bind:key="type">
                <div
                  v-on:click="form['StationMode'] = type.toLocaleLowerCase()"
                  class="w-24 mr-4 rounded-lg justify-center cursor-pointer hover:bg-gray-200"
                  :class="{
                    'bg-gray-300': type.toLocaleLowerCase() !== form['StationMode'],
                    'bg-green-300': type.toLocaleLowerCase() === form['StationMode']
                  }">
                  {{type}}
                </div>
              </div>
            </div>

            <label class="my-2">
              Headset Type
            </label>

            <div class="flex mx-5 mb-4">
              <div v-for="type in headsetTypes" v-bind:key="type">
                <div
                    v-on:click="form['HeadsetType'] = type.split(' ').join('')"
                    class="w-24 mr-4 rounded-lg justify-center cursor-pointer hover:bg-gray-200"
                    :class="{
                    'bg-gray-300': type.split(' ').join('') !== form['HeadsetType'],
                    'bg-green-300': type.split(' ').join('') === form['HeadsetType']
                  }">
                  {{type}}
                </div>
              </div>
            </div>
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
                  v-on:click="showStationModal = false"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
