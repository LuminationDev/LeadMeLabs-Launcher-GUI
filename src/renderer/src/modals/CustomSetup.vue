<script setup lang="ts">
import { ref } from "vue";
import Modal from "./Modal.vue";
import * as CONSTANT from "../assets/constants/_application"
import { useLibraryStore } from '../store/libraryStore'

const libraryStore = useLibraryStore()
const showCustomModal = ref(false);
const envKey = ref("");
const envValue = ref("");
const pageNum = ref(0);
const back = ref(false);

function updateENV() {
  console.log(`${envKey.value}: ${envValue.value}`);

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.APPLICATION_PARAMETERS, {
    name: libraryStore.getSelectedApplication.name,
    action: "add",
    key: envKey.value,
    value: envValue.value
  });

  // Load the next page
  envKey.value = ""
  envValue.value = ""
  pageNum.value++

  console.log(pageNum.value);
}

/**
 * Clear all currently saved parameters
 */
function clearENV() {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.APPLICATION_PARAMETERS, {
    name: libraryStore.getSelectedApplication.name,
    action: "clear",
  });
}

function closeModal() {
  pageNum.value = 0;
  showCustomModal.value = false;
}
</script>

<template>
  <!--Anchor button used to control the modal-->
  <button
      class="w-32 h-12 cursor-pointer rounded-lg bg-yellow-400
      items-center justify-center hover:bg-yellow-200"
    v-on:click="showCustomModal = true"
    id="share_button"
  >
    Configure
  </button>

  <!--Modal body using the Modal template, teleports the html to the bottom of the body tag-->
  <Teleport to="body">
    <Modal :show="showCustomModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-20 px-8 w-96 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">Launch wizard</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <transition-group tag="div" class="div-slider h-48 mt-8" :name="back? 'slideBack' : 'slide'">

            <div v-bind:key="pageNum" class="card inline-block mx-5 flex flex-col justify-center items-center bg-white rounded-3xl shadow-md">
              <!--Basic input that allows a key and value-->
              <div class="flex flex-col justify-center items-center">
                Please enter the a launch parameter.

                <input v-model="envKey" class="border-2 my-2" placeholder="Key"/>
                <input v-model="envValue" class="border-2 my-2" placeholder="Value"/>
                <button v-on:click="updateENV()" class="h-8 px-3 mb-2 rounded-lg bg-green-400 hover:bg-green-200">Add</button>
              </div>
            </div>

        </transition-group>
      </template>

      <template v-slot:footer>
        <footer class="mt-4 mb-6 mx-4 text-right flex flex-row justify-between">
          <button class="w-24 h-6 text-red-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="clearENV"
          >Clear All</button>

          <button class="w-24 h-6 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="showCustomModal = false"
          >Finish</button>
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