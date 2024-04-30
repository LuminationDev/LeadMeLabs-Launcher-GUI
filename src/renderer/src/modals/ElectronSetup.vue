<script setup lang="ts">
import Modal from "@renderer/modals/Modal.vue";
import PinPrompt from "@renderer/modals/PinPrompt.vue";
import GenericButton from "@renderer/components/buttons/GenericButton.vue";
import { ref } from "vue";
import { useLibraryStore } from "@renderer/store/libraryStore";
import * as CONSTANT from "@renderer/assets/constants";
import { Application } from "@renderer/models";

const libraryStore = useLibraryStore();
const showModal = ref(false);
const textCopied = ref(false);

const launchSetup = () => {
  const selectedApplication: Application = libraryStore.getSelectedApplication;

  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.ELECTRON_APPLICATION_SETUP,
    name: selectedApplication.name,
    alias: selectedApplication.alias
  });
}

const copyText = () => {
  const text = `${libraryStore.toolDirectory}\\${libraryStore.getSelectedApplicationName}`;
  navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Text copied to clipboard:', text);
        textCopied.value = true;
      })
      .catch(err => {
        console.error('Failed to copy text:', err);
      });
}

const openModal = () => {
  showModal.value = true;
}

const closeModal = () => {
  //Check if the tool has been setup on close (if not already)
  const selectedApplication: Application = libraryStore.getSelectedApplication;

  if (!selectedApplication.setup) {
    api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
      channelType: CONSTANT.MESSAGE.ELECTRON_APPLICATION_CHECK_SETUP,
      name: selectedApplication.name,
      alias: selectedApplication.alias
    });
  }

  textCopied.value = false;
  showModal.value = false;
}

const pinRef = ref<InstanceType<typeof PinPrompt> | null>(null)
const openPinPromptModal = () => {
  if(libraryStore.pin !== '') {
    pinRef.value?.openModal();
  } else {
    openModal()
  }
}
</script>

<template>
  <PinPrompt ref="pinRef" :callback="openModal"/>

  <!--Anchor button used to control the modal-->
  <GenericButton
      id="share_button"
      :type="'primary'"
      :callback="openPinPromptModal"
      :spinnerColor="'#000000'"
  >Setup</GenericButton>

  <!--Modal body using the Modal template, teleports the html to the bottom of the body tag-->
  <Teleport to="body">
    <Modal :show="showModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-20 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">Electron setup wizard</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <div class="flex flex-col px-8 w-128">
          <div class="mt-5">
            Please copy the following path, select 'Configure' and paste it as the installation path in the setup wizard.
          </div>

          <div class="my-5">
            Close this modal after the setup has been completed otherwise the tool won't appear in the library immediately.
          </div>

          <div class="flex flex-col my-5">
            <div class="flex justify-center bg-white rounded-lg border border-gray-400">
              <div class="w-96 h-20 items-center break-all">
                {{libraryStore.toolDirectory}}\{{libraryStore.getSelectedApplicationName}}
              </div>
            </div>

            <div class="flex justify-between">
              <div class="mt-0.5 text-green-500">
                <div v-if="textCopied">
                  Text copied!
                </div>
              </div>

              <button class="h-8 w-20 mt-2 text-center rounded-lg bg-primary text-white hover:bg-blue-400"
                      v-on:click="copyText"
              >Copy</button>
            </div>
          </div>

          <div class="mb-5">
            <p class="text-black font-bold mr-2">NOTE:</p> Failure to do so will result in not being able to open the Tool from the Launcher.
          </div>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="mt-4 mb-6 text-right flex flex-row justify-between">
          <button class="h-8 w-24 ml-7 text-center rounded-lg text-white"
                  :class="{
                    'bg-slate-300': !textCopied,
                    'bg-primary hover:bg-blue-400': textCopied,
                  }"
                  :disabled="!textCopied"
                  v-on:click="launchSetup"
          >Configure</button>

          <button class="w-24 h-8 mr-7 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="closeModal"
          >Close</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
