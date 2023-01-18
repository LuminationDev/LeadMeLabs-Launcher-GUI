<script setup lang="ts">
import {computed, ref} from "vue";
import Modal from "./Modal.vue";
import * as CONSTANT from "../assets/constants/_application"
import station_keys from "../config/station_keys.json";
import { useLibraryStore } from '../store/libraryStore'
const libraryStore = useLibraryStore()

interface keyObject {
  title: string,
  choice: Array<string> | null,
  description: string,
  order: number
}
const stationKeyJson: keyObject = station_keys;

const showStationModal = ref(false);
const envKey = ref("VALUE");
const envValue = ref("");
const pageNum = ref(0);
const back = ref(false);

function configureSteamCMD() {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CONFIG_APPLICATION_STEAMCMD)
  closeModal();
}

function setENVChoice(title: string, choice: string) {
  envValue.value = choice;
  updateENV(title);
}

function updateENV(key: string) {
  console.log(`${key}=${envValue.value}`);

  // Set the key for the new value
  envKey.value = key

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CONFIG_APPLICATION, {
    name: libraryStore.getSelectedApplication.name,
    key: envKey.value,
    value: `=${envValue.value}`
  })

  // Load the next page
  envValue.value = ""
  pageNum.value++

  console.log(pageNum.value);
}

/**
 * Calculate the amount of station inputs to track progress.
 */
const listLength = computed(() => {
  console.log(station_keys.length)
  return station_keys.length;
})

function closeModal() {
  pageNum.value = 0;
  showStationModal.value = false;
}
</script>

<template>
  <!--Anchor button used to control the modal-->
  <button
      class="w-32 h-12 cursor-pointer rounded-lg bg-red-400
      items-center justify-center hover:bg-red-200"
    v-on:click="showStationModal = true"
    id="share_button"
  >
    Setup
  </button>

  <!--Modal body using the Modal template, teleports the html to the bottom of the body tag-->
  <Teleport to="body">
    <Modal :show="showStationModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-20 px-8 w-96 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">Station setup wizard</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <transition-group tag="div" class="div-slider h-48 mt-8" :name="back? 'slideBack' : 'slide'">
          <template v-if="pageNum < listLength" v-for="(variable, index) in stationKeyJson" v-bind:key="variable">
            <div v-if="pageNum === variable.order" v-bind:key="index" class="card inline-block mx-5 flex flex-col justify-center items-center bg-white rounded-3xl shadow-md">

              <!--Detect if there is a choice or just manual input-->
              <div v-if="variable.choice.length === 0" class="flex flex-col justify-center items-center">
                Please enter the {{variable.description}}

                <input v-model="envValue"/>
                <button v-on:click="updateENV(variable.title)">Update</button>
              </div>

              <div v-else class="flex flex-col w-full justify-center items-center">
                Please enter the {{variable.description}}

                <div v-for="(item, index) in variable.choice" v-bind:key="index" class="h-10 w-1/2 my-1">
                  <button v-on:click="setENVChoice(variable.title, item)" class="h-10 w-full rounded-lg bg-blue-400 hover:bg-blue-200">{{item}}</button>
                </div>
              </div>

            </div>
          </template>
          <div v-else class="h-48 w-full mx-5 flex flex-col justify-center items-center">
            <template class="card h-32 w-full inline-block  flex flex-col justify-center items-center bg-white rounded-3xl shadow-md">
              Station setup is complete.

              <button v-on:click="configureSteamCMD" class="h-10 w-1/2 mt-4 rounded-lg bg-blue-400 hover:bg-blue-200">Finish</button>
            </template>
          </div>

        </transition-group>
      </template>

      <template v-slot:footer>
        <footer class="mt-4 mb-6 text-right flex flex-row justify-end">
          <button class="w-36 h-5 mr-4 text-blue-500 text-base rounded-lg hover:bg-gray-100 font-medium"
                  v-on:click="showStationModal = false"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>

<style scoped>
.slide-leave-active,
.slide-enter-active {
  transition: 1s;
}
.slide-enter-from {
  transform: translate(100%, 0);
}
.slide-leave-to {
  transform: translate(-100%, 0);
}

.slideBack-leave-active,
.slideBack-enter-active {
  transition: 1s;
}
.slideBack-enter {
  transform: translate(-100%, 0);
}
.slideBack-leave-to {
  transform: translate(100%, 0);
}

.div-slider {
  overflow: hidden;
  position: relative;
}

.div-slider .card {
  position: absolute;
  width: 90%;
}
</style>