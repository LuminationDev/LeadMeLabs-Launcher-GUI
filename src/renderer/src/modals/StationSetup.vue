<script setup lang="ts">
import { ref } from "vue";
import Modal from "./Modal.vue";
import * as CONSTANT from "../assets/constants/_application"
import station_keys from "../config/station_keys.json";
import { useLibraryStore } from '../store/libraryStore'
const libraryStore = useLibraryStore()
const stationKeyJson = station_keys;

const showStationModal = ref(false);
const envKey = ref("VALUE");
const envValue = ref("");
const pageNum = ref(0);
const back = ref(false);

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
}

function closeModal() {
  showStationModal.value = false
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
        <transition-group tag="div" class="div-slider h-36 mt-8" :name="back? 'slideBack' : 'slide'">
          <template v-for="(variable, index) in stationKeyJson" v-bind:key="variable">
            <div v-if="pageNum === variable.order" v-bind:key="index" class="card inline-block mx-5 flex flex-col justify-center items-center bg-white rounded-3xl shadow-md">
              Please enter the {{variable.description}}

              <input v-model="envValue"/>
              <button v-on:click="updateENV(variable.title)">Update</button>
            </div>
          </template>
        </transition-group>
      </template>

      <template v-slot:footer>
        <footer class="mt-2 mb-8 text-right flex flex-row justify-end">
          <button class="w-36 h-11 mr-4 text-blue-500 text-base rounded-lg hover:bg-gray-100 font-medium"
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

.div-slider{
  overflow: hidden;
  position: relative;
}

.div-slider .card {
  position: absolute;
  height: 100px;
  width: 90%;
}
</style>