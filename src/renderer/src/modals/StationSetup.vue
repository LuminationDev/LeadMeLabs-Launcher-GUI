<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import Modal from "./Modal.vue";
import GenericButton from "../components/buttons/GenericButton.vue";
import * as CONSTANT from "../assets/constants/index";
import ManualProgress from "../components/loading/ManualProgress.vue";
import SetupSingleInput from "../components/inputs/SetupSingleInput.vue";
import SetupDoubleInput from "../components/inputs/SetupDoubleInput.vue";
import SetupChoiceSelection from "../components/inputs/SetupChoiceSelection.vue";
import SetupNavigation from "../components/inputs/SetupNavigation.vue";
import useVuelidate from "@vuelidate/core";
import { required, helpers } from "@vuelidate/validators";
import PinPrompt from "@renderer/modals/PinPrompt.vue";
import { useLibraryStore } from '../store/libraryStore';
import { useSetupStore } from "../store/setupStore";
import { StationForm } from "@renderer/interfaces/forms";

const libraryStore = useLibraryStore();
const setupStore = useSetupStore();
const showStationModal = ref(false);
const pageNum = ref(0);
const saved = ref(false);
const steamCMD = ref(false);

const rules = {
  form: {
    AppKey: {
      required: helpers.withMessage("Encryption key is required", required),
      $autoDirty: true
    },
    LabLocation: {
      required: helpers.withMessage("LabLocation is required", required),
      $autoDirty: true
    },
    StationId: {
      required: helpers.withMessage("StationId is required", required),
      $autoDirty: true
    },
    room: {
      required: helpers.withMessage("Room is required", required),
      $autoDirty: true
    },
    NucAddress: {
      required: helpers.withMessage("NucAddress is required", required),
      $autoDirty: true
    },
    SteamUserName: {
      required: helpers.withMessage("SteamUserName is required", required),
      $autoDirty: true
    },
    SteamPassword: {
      required: helpers.withMessage("SteamPassword is required", required),
      $autoDirty: true
    },
    StationMode: {
      required: helpers.withMessage("StationMode is required", required),
      $autoDirty: true
    },
    HeadsetType: {
      required: helpers.withMessage("HeadsetType is required", required),
      $autoDirty: true
    }
  }
}

//This is overridden if there are saved values from the config on first open
let form = setupStore.stationForm;

//Keep track of any previously saved values for this experience.
const setupParams = computed(() => libraryStore.applicationSetup);
watch(setupParams, (newValue) => {
  if(newValue.length === 0) {
    return;
  }

  newValue.forEach((value: string) => {
    let values = setupStore.splitStringWithLimit(value, "=", 2);

    form[values[0]] = values[1];

    if(values[0].includes("Steam")) {
      steamCMD.value = true;
    }
  });
});

const v$ = useVuelidate(rules, { form });

function configureSteamCMD() {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.CONFIG_APPLICATION_STEAMCMD,
    username: form.SteamUserName,
    password: form.SteamPassword
  });
  closeModal();
}

/**
 * Transform the reactive form into the necessary format to satisfy the JSON string the backend requires.
 */
const transformForm = () => {
  const trimmedForm = {} as StationForm;
  //Remove any whitespaces from the original form
  for (const key in form) {
    if (form.hasOwnProperty(key)) {
      trimmedForm[key] = typeof form[key] === 'string' ? form[key].trim() : form[key];
    }
  }
  const data = { ...trimmedForm };

  if(!steamCMD.value) {
    delete data.SteamUserName;
    delete data.SteamPassword;
  }

  if(data.StationMode !== 'VR') {
    delete data.HeadsetType;
  }

  return data;
};

const handleSubmit = async () => {
  const data = transformForm();

  // handle form submission here
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.CONFIG_APPLICATION_SET,
    name: libraryStore.getSelectedApplication?.name,
    value: JSON.stringify(data)
  });

  saved.value = true;
};

/**
 * Calculate the amount of station inputs to track progress.
 */
// @ts-ignore
const keys = reactive(Object.keys(form));
const progress = computed(() => {
  let formLength = steamCMD.value ? keys.length : keys.length - 2;
  formLength = (form.StationMode === 'VR') ? formLength : formLength - 1;

  const completedFields = keys.filter(key => form[key] !== '' && form[key] !== undefined).length;
  const completionPercentage = (completedFields / formLength) * 100;

  return Math.round(completionPercentage);
});

/**
 * Trigger an event when steamCMD checkbox changes, empty the form values so the progress is re-calculated
 */
watch(steamCMD, (newVal) => {
  if(!newVal) {
    form.SteamUserName = '';
    form.SteamPassword = '';
    form.HeadsetType = '';
  }
});

/**
 * Trigger an event when the StationMode is changed to something other than VR, remove the HeadsetType from the
 * form so the progress is re-calculated.
 */
watch(() => form.StationMode, (newVal) => {
  if (newVal !== "VR") {
    form.HeadsetType = '';
  }
});

/**
 * Validate certain fields that are passed in.
 * @param fieldNames An array of fields to validate for a particular page.
 */
function createValidator(fieldNames: string[]): () => boolean {
  return () => {
    for (const fieldName of fieldNames) {
      // @ts-ignore
      v$.value.form[fieldName].$touch();
      // @ts-ignore
      if (v$.value.form[fieldName].$error) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Computed property that returns the list of fields to validate for page two. SteamUserName and SteamPassword are
 * added if the 'include' checkbox has been ticked. HeadsetType is added if the StationMode is set to 'VR'.
 */
const pageTwoFields = computed(() => [
  'StationMode',
  ...(steamCMD.value ? ['SteamUserName', 'SteamPassword'] : []),
  ...(form.StationMode === 'VR' ? ['HeadsetType'] : [])
]);

const validatePageOne = () => createValidator(['AppKey', 'LabLocation', 'StationId', 'room', 'NucAddress'])();
const validatePageTwo = () => createValidator(pageTwoFields.value)();

/**
 * Change the page if the current items pass validation.
 */
async function changePage(forward: boolean) {
  //Allowed to go backwards whenever
  if (!forward) {
    pageNum.value--;
    return;
  }

  const validators = [validatePageOne, validatePageTwo];
  if (validators[pageNum.value] && !validators[pageNum.value]()) {
    return;
  }

  pageNum.value++;
}

function openModal() {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.CONFIG_APPLICATION_GET,
    name: libraryStore.getSelectedApplication?.name
  });

  showStationModal.value = true;
}

function closeModal() {
  pageNum.value = 0;
  showStationModal.value = false;
  saved.value = false;
  form.HeadsetType = '';
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
            <SetupSingleInput :title="'Encryption Key'" :placeholder="'XXXX_0000'" :v$="v$.form.AppKey" v-model="form.AppKey"/>
            <SetupSingleInput :title="'Lab Location'" :placeholder="'Thebarton'" :v$="v$.form.LabLocation" v-model="form.LabLocation"/>
            <SetupSingleInput :title="'Station ID'" :placeholder="'1'" :v$="v$.form.StationId" v-model="form.StationId"/>
            <SetupSingleInput :title="'Room'" :placeholder="'Classroom'" :v$="v$.form.room" v-model="form.room"/>
            <SetupSingleInput :title="'NUC IP Address'" :placeholder="'192.168.0.100'" :v$="v$.form.NucAddress" v-model="form.NucAddress"/>
          </div>

          <div v-if="pageNum === 1" class="mt-4 mx-5 mb-3 flex flex-col">
            <SetupDoubleInput
                :title="'Steam Account details'"
                :placeholderOne="'username'"
                :placeholderTwo="'password'"
                v-model:input-one="form.SteamUserName"
                v-model:input-two="form.SteamPassword"
                :v$One="v$.form.SteamUserName"
                :v$Two="v$.form.SteamPassword"
                :optional="true"
                v-model:visible="steamCMD"
            />

            <div v-if="steamCMD" class="flex justify-end">
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

            <SetupChoiceSelection
                v-if="steamCMD && form.StationMode === 'VR'"
                :title="'Headset Type'"
                :choices="['Vive Pro 1', 'Vive Pro 2', 'Vive Business Streaming']"
                v-model="form.HeadsetType"
                :v$="v$.form.HeadsetType" />

            <SetupChoiceSelection
              :title="'Station Mode'"
              :choices="['Appliance', 'Content', ...(steamCMD ? ['VR'] : [])]"
              v-model="form.StationMode"
              :v$="v$.form.StationMode" />
          </div>

          <div v-if="pageNum === 2" class="my-4 mx-5 flex flex-col">
            <label class="text-lg mb-2">
              Preview
            </label>

            <div v-for="(key, index) in Object.keys(form)" :key="index">
              <div v-if="!['Steam', 'Headset', 'TIME_CREATED'].some(k => key.includes(k))">
                {{key}} = {{form[key]}}
              </div>
              <div v-else-if="steamCMD && (key.includes('Steam'))">
                {{key}} = {{form[key]}}
              </div>
              <div v-else-if="form.StationMode === 'VR' && key.includes('Headset')">
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
          <button class="w-24 h-8 mr-7 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="closeModal"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
