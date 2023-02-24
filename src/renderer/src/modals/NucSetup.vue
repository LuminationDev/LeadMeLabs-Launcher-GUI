<script setup lang="ts">
import {computed, ref} from "vue";
import Modal from "./Modal.vue";
import * as CONSTANT from "../assets/constants/_application"
import nuc_keys from "../config/nuc_keys.json";
import { useLibraryStore } from '../store/libraryStore'
const libraryStore = useLibraryStore()

interface keyObject {
  title: string,
  input: Array<string> | null,
  description: string,
  order: number
}
const nucKeyJson: keyObject = nuc_keys;

const showNucModal = ref(false);
const envKey = ref("VALUE");
const envValue = ref("");
const envUsername = ref("");
const envPassword = ref("");
const pageNum = ref(0);
const back = ref(false);

/**
 * Update the config file with a username and password field. The final variable will look like
 * key=username:password
 * @param title The key of the variable.
 */
function setENVChoice(title: string) {
  envValue.value = `${envUsername.value}:${envPassword.value}`;

  //Reset for next login details
  envUsername.value = "";
  envPassword.value = "";

  updateENV(title);
}

function updateENV(key: string) {
  console.log(`${key}=${envValue.value}`);

  // Set the key for the new value
  envKey.value = key

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.HELPER_CHANNEL, {
    channelType: CONSTANT.CONFIG_APPLICATION,
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
 * Calculate the amount of nuc inputs to track progress.
 */
const listLength = computed(() => {
  console.log(nuc_keys.length)
  return nuc_keys.length;
})

function closeModal() {
  pageNum.value = 0;
  showNucModal.value = false;
}
</script>

<template>
  <!--Anchor button used to control the modal-->
  <button
      class="w-32 h-12 cursor-pointer rounded-lg bg-yellow-400
      items-center justify-center hover:bg-yellow-200"
    v-on:click="showNucModal = true"
    id="share_button"
  >
    Setup
  </button>

  <!--Modal body using the Modal template, teleports the html to the bottom of the body tag-->
  <Teleport to="body">
    <Modal :show="showNucModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-20 px-8 w-96 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">Station setup wizard</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <transition-group tag="div" class="div-slider h-48 mt-8" :name="back? 'slideBack' : 'slide'">
          <template v-if="pageNum < listLength" v-for="(variable, index) in nucKeyJson" v-bind:key="variable">
            <div v-if="pageNum === variable.order" v-bind:key="index" class="card inline-block mx-5 flex flex-col justify-center items-center bg-white rounded-3xl shadow-md">

              <!--Detect if there is a choice or just manual input-->
              <div v-if="variable.input.length === 0" class="flex flex-col justify-center items-center">
                Please enter the {{variable.description}}

                <input v-model="envValue" class="border-2 my-2"/>
                <button v-on:click="updateENV(variable.title)" class="h-8 px-3 mb-2 rounded-lg bg-green-400 hover:bg-green-200">Update</button>
              </div>

              <div v-else class="flex flex-col w-full justify-center items-center">
                Please enter the {{variable.description}}

                <input v-model="envUsername" class="border-2 my-2"/>
                <input v-model="envPassword" class="border-2 my-2"/>

                <button v-on:click="setENVChoice(variable.title)" class="h-8 px-3 mb-2 rounded-lg bg-green-400 hover:bg-green-200">Update</button>
              </div>

            </div>
          </template>
          <div v-else class="h-48 w-full mx-5 flex flex-col justify-center items-center">
            <template class="card h-32 w-full inline-block  flex flex-col justify-center items-center bg-white rounded-3xl shadow-md">
              Station setup is complete.

              <button v-on:click="closeModal" class="h-10 w-1/2 my-2 rounded-lg bg-blue-400 hover:bg-blue-200">Finish</button>
            </template>
          </div>

        </transition-group>
      </template>

      <template v-slot:footer>
        <footer class="mt-4 mb-6 text-right flex flex-row justify-end">
          <button class="w-36 h-5 mr-4 text-blue-500 text-base rounded-lg hover:bg-gray-100 font-medium"
                  v-on:click="showNucModal = false"
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