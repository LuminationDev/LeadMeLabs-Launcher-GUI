<script setup lang="ts">
import { computed, ref, reactive, watch } from "vue";
import Modal from "./Modal.vue";
import GenericButton from "../components/buttons/GenericButton.vue";
import * as CONSTANT from "../assets/constants/index";
import ManualProgress from "../components/loading/ManualProgress.vue";
import SetupSingleInput from "../components/inputs/SetupSingleInput.vue";
import SetupDoubleInput from "../components/inputs/SetupDoubleInput.vue";
import SetupNavigation from "../components/inputs/SetupNavigation.vue";
import useVuelidate from "@vuelidate/core";
import { required, helpers } from "@vuelidate/validators";
import PinPrompt from "@renderer/modals/PinPrompt.vue";
import { useLibraryStore } from '../store/libraryStore';
import { useSetupStore } from "../store/setupStore";
import { NUCForm } from "@renderer/interfaces/forms";

const libraryStore = useLibraryStore();
const setupStore = useSetupStore();
const showNucModal = ref(false);
const pageNum = ref(0);
const saved = ref(false);
const novaStar = ref(false);

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
    CbusIP: {
      required: helpers.withMessage("CbusIP is required", required),
      $autoDirty: true
    },
    CbusNucScriptId: {
      required: helpers.withMessage("CbusNucScriptId is required", required),
      $autoDirty: true
    },
    CbusLogin: {
      required: helpers.withMessage("CbusLogin is required", required),
      $autoDirty: true
    },
    CbusPassword: {
      required: helpers.withMessage("CbusPassword is required", required),
      $autoDirty: true
    },
    NovaStarLogin: {
      required: helpers.withMessage("NovaStarLogin is required", required),
      $autoDirty: true
    },
    NovaStarPassword: {
      required: helpers.withMessage("NovaStarPassword is required", required),
      $autoDirty: true
    },
  }
}

//This is overridden if there are saved values from the config on first open
let form = setupStore.nucForm;

//Keep track of any previously saved values for this experience.
const setupParams = computed(() => libraryStore.applicationSetup);
watch(setupParams, (newValue) => {
  if(newValue.length === 0) {
    return;
  }

  newValue.forEach((value: string) => {
    let values = setupStore.splitStringWithLimit(value, "=", 2);
    let details;

    switch(values[0]) {
      case "CbusLogin":
        details = values[1].split(":");
        form.CbusLogin = details[0];
        form.CbusPassword = details[1];
        break

      case "NovaStarLogin":
        details = values[1].split(":");
        form.NovaStarLogin = details[0];
        form.NovaStarPassword = details[1];
        novaStar.value = true;
        break

      default:
        form[values[0]] = values[1];
    }
  });
});

const v$ = useVuelidate(rules, { form });

/**
 * Transform the reactive form into the necessary format to satisfy the JSON string the backend requires.
 */
const transformForm = () => {
  const trimmedForm = {} as NUCForm;
  //Remove any whitespaces from the original form
  for (const key in form) {
    if (form.hasOwnProperty(key)) {
      trimmedForm[key] = typeof form[key] === 'string' ? form[key].trim() : form[key];
    }
  }

  const data = { ...trimmedForm };
  data.CbusLogin = `${trimmedForm.CbusLogin}:${trimmedForm.CbusPassword}`;
  delete data.CbusPassword;

  if(novaStar.value) {
    data.NovaStarLogin = `${trimmedForm.NovaStarLogin}:${trimmedForm.NovaStarPassword}`;
    delete data.NovaStarPassword;
  } else {
    delete data.NovaStarLogin;
    delete data.NovaStarPassword;
  }

  return data;
};

const handleSubmit = async () => {
  const data = transformForm();

  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.CONFIG_APPLICATION_SET,
    name: libraryStore.getSelectedApplication?.name,
    value: JSON.stringify(data),
  });

  saved.value = true;
};

/**
 * Calculate the amount of nuc inputs to track progress.
 */
const keys = reactive(Object.keys(form));
// Computed property that returns the length of the form
const progress = computed(() => {
  const formLength = novaStar.value ? keys.length : keys.length - 2;
  const completed = keys.filter(key => form[key] !== '' && form[key] !== undefined).length;
  return Math.round((completed / formLength) * 100);
});

/**
 * Trigger an event when novaStar changes, empty the form values so the progress is re-calculated
 */
watch(novaStar, (newVal) => {
  if(!newVal) {
    form.NovaStarLogin = '';
    form.NovaStarPassword = '';
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

// Computed property that returns the list of fields to validate for page two
const pageTwoFields = computed(() => [
  'CbusLogin',
  'CbusPassword',
  ...(novaStar.value ? ['NovaStarLogin', 'NovaStarPassword'] : []),
]);

const validatePageOne = () => createValidator(['AppKey', 'LabLocation', 'CbusIP', 'CbusNucScriptId'])();
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

  showNucModal.value = true;
}

function closeModal() {
  pageNum.value = 0;
  showNucModal.value = false;
  saved.value = false;
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
            <SetupSingleInput :title="'Encryption Key'" :placeholder="'XXXX_0000'" :v$="v$.form.AppKey" v-model="form.AppKey"/>
            <SetupSingleInput :title="'Lab Location'" :placeholder="'Thebarton'" :v$="v$.form.LabLocation" v-model="form.LabLocation"/>
            <SetupSingleInput :title="'CBus IP Address'" :placeholder="'192.168.0.100'" :v$="v$.form.CbusIP" v-model="form.CbusIP"/>
            <SetupSingleInput :title="'CBus Nuc Script Id'" :placeholder="'4194305000'" :v$="v$.form.CbusNucScriptId" v-model="form.CbusNucScriptId"/>
          </div>

          <div v-if="pageNum === 1" class="mt-4 mx-5 flex flex-col">
            <SetupDoubleInput
                :title="'CBus Account details'"
                :placeholderOne="'username'"
                :placeholderTwo="'password'"
                v-model:input-one="form.CbusLogin"
                v-model:input-two="form.CbusPassword"
                :v$One="v$.form.CbusLogin"
                :v$Two="v$.form.CbusPassword"
            />

            <SetupDoubleInput
                :title="'NovaStar Login details'"
                :placeholderOne="'username'"
                :placeholderTwo="'password'"
                v-model:input-one="form.NovaStarLogin"
                v-model:input-two="form.NovaStarPassword"
                :v$One="v$.form.NovaStarLogin"
                :v$Two="v$.form.NovaStarPassword"
                :optional="true"
                v-model:visible="novaStar"
            />
          </div>

          <div v-if="pageNum === 2" class="my-4 mx-5 flex flex-col">
            <label class="text-lg mb-2">
              Preview
            </label>

            <div v-for="(key, index) in Object.keys(form)" :key="index">
              <div v-if="!['NovaStar', 'TIME_CREATED'].some(k => key.includes(k))">
                {{key}} = {{form[key]}}
              </div>
              <div v-else-if="novaStar && key.includes('NovaStar')">
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
          <button v-if="!saved" class="w-24 h-8 mr-7 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="closeModal"
          >Cancel</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
