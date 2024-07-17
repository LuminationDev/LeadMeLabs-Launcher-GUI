<script setup lang="ts">
import Modal from "./Modal.vue";
import GenericButton from "@renderer/components/buttons/GenericButton.vue";
import SetupChoiceSelection from "@renderer/components/inputs/SetupChoiceSelection.vue";
import useVuelidate from "@vuelidate/core";
import { ref } from "vue";
import { useLibraryStore } from "@renderer/store/libraryStore";
import { helpers, required } from "@vuelidate/validators";

const libraryStore = useLibraryStore();

defineExpose({
  openModal
});

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  videoType: {
    type: String,
    required: true
  },
  callback: {
    type: Function,
    required: true
  }
});

const videoType = ref(props.videoType);
const rules = {
  videoType: {
    required: helpers.withMessage("Video type is requires a value", required),
    $autoDirty: true
  },
}

const v$ = useVuelidate(rules, { videoType });

const showModal = ref(false);

function openModal() {
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function confirm() {
  // @ts-ignore
  v$.value.$validate()
  // @ts-ignore
  if (v$.value.$invalid) {
    return;
  }

  //Perform the callback
  props.callback(videoType.value);
  closeModal();
}
</script>

<template>
  <GenericButton
      class="h-10 w-32 text-base"
      :type="'primary'"
      :callback="() => showModal = true"
      :spinnerColor="'#000000'"
  >Move</GenericButton>

  <Teleport to="body">
    <Modal :show="showModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-12 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-bold text-black">{{ title }}</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <div class="px-8 w-128 pt-5 flex flex-col items-center mb-3">
          <p class="pb-5">
            The current video is located in the <span class="font-bold">{{props.videoType}}</span> subdirectory, please select one of the following options
            for the video to be moved into.
          </p>

          <div class="mb-5">
            <SetupChoiceSelection
                title=""
                :choices="['Regular', 'VR', 'Backdrops']"
                v-model="videoType"
                :v$="v$.videoType"/>
          </div>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="mb-2 text-right flex flex-row justify-end">
          <button class="w-20 h-10 mr-4 bg-red-800 text-white text-base rounded-lg hover:bg-red-500 font-medium"
                  v-on:click="confirm"
          >Confirm</button>

          <button class="w-20 h-10 mr-4 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="showModal = false"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
