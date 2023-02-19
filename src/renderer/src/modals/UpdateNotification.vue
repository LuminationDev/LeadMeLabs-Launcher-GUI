<script setup lang="ts">
//https://medium.com/@johndyer24/creating-and-deploying-an-auto-updating-electron-app-for-mac-and-windows-using-electron-builder-6a3982c0cee6

import Modal from "./Modal.vue";
import { ref } from "vue";

const showNotificationModal = ref(false);
const message = ref("A new update is available. Downloading now...");
const downloaded = ref(false);

//@ts-ignore
api.ipcRenderer.on('update_available', () => {
  message.value = 'A new update is available. Downloading now...';

  //Show the modal
  showNotificationModal.value = true;
});

//@ts-ignore
api.ipcRenderer.on('update_downloaded', () => {
  message.value = 'Update Downloaded. It will be installed on restart. Restart now?';

  //Show the modal and restart button
  downloaded.value = true;
  showNotificationModal.value = true;
});

function restartApp() {
  //@ts-ignore
  api.ipcRenderer.send('restart_app');
}

function closeModal() {
  showNotificationModal.value = false;
}
</script>

<template>
  <Teleport to="body">
    <Modal :show="showNotificationModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-12 px-8 w-96 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">Update Available</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <div class="px-8 w-96 pt-3 pb-7 bg-white flex flex-col items-center">
          <p class="mb-3">{{message}}</p>

          <button
              v-if="downloaded"
              class="h-8 w-20 text-green-400 text-base rounded-lg hover:bg-green-200 font-medium"
              v-on:click="restartApp"
          >
            Restart
          </button>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="my-2 text-right flex flex-row justify-end">
          <button class="w-20 h-10 mr-4 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="showNotificationModal = false"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
