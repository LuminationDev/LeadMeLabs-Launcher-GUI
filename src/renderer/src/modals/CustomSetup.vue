<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import Modal from "./Modal.vue";
import GenericButton from "../components/buttons/GenericButton.vue";
import * as CONSTANT from "../assets/constants/index";
import LaunchParamInput from "../components/inputs/LaunchParamInput.vue";
import { useLibraryStore } from '../store/libraryStore';
import { formInputs, Parameter, Validate } from "@renderer/interfaces/custom";

const libraryStore = useLibraryStore()
const showCustomModal = ref(false);
const pageNum = ref(0);
const paramID = ref(0);

//Empty form for parameters
const form = reactive<formInputs>({});
//Handle adding extra form inputs
const paramInputs = ref<Parameter[]>([])

//Load in any previously saved values
const params = computed(() => {
  let customParams = "";

  for (const key in libraryStore.applicationParameters) {
    customParams += ` "${libraryStore.applicationParameters[key]}"`;
  }

  return customParams;
});

/**
 * Change the validation error field on a particular dynamic input. Triggered by a Blur event on a
 * LaunchParamInput component.
 * @param object An object containing
 *      id: number of the id of the input;
 *      field: A string of the field type, 'key' or 'value';
 *      invalid: boolean of if it is invalid;
 */
function changeValidation(object: Validate) {
  const input = paramInputs.value.find((input) => input.id === object.id);
  if (input) {
    input[object.field + 'Error'] = object.invalid;
  }
}

/**
 * Loop through all dynamic fields and check if they are valid.
 * @return A boolean representing if all the dynamic fields are valid.
 */
function areAllFieldsValid(): boolean {
  for(const input in paramInputs.value) {
    if(paramInputs.value[input].key === '') {
      paramInputs.value[input].keyError = true;
      return false;
    }

    if(paramInputs.value[input].value === '') {
      paramInputs.value[input].valueError = true;
      return false;
    }
  }

  return true;
}

/**
 * Add a new pair of input fields only if the current are valid.
 */
function addNewInput() {
  if(!areAllFieldsValid()) {
    return;
  }

  addParamInput('', '');
}

function addParamInput(key: string, value: string) {
  generateKey(key, value);
  paramInputs.value.push({ id: paramID.value, key: key, value: value, keyError: false, valueError: false });
}

function generateKey(key: string, value: string) {
  form[`paramInput${++paramID.value}`] = { key: key, value: value };
}

function updateKey(newKey, index, id) {
  form[`paramInput${id}`]['key'] = newKey;
  paramInputs.value[index].key = newKey;
}

function updateParamInput(newValue, index, id) {
  form[`paramInput${id}`]['value'] = newValue;
  paramInputs.value[index].value = newValue
}

function removeInput(id) {
  //Remove from the library settings if needed
  for(const key in libraryStore.applicationParameters) {
    if(key === form[`paramInput${id}`].key) {
      delete libraryStore.applicationParameters[key];
    }
  }

  delete form[`paramInput${id}`];
  paramInputs.value = paramInputs.value.filter((paramInput) => paramInput.id !== id);
}

const handleSubmit = () => {
  if(!areAllFieldsValid()) {
    return;
  }

  const paramInputsDict: Record<string, string> = Object.values(form).reduce((dict, { key, value }) => {
    dict[key] = value
    return dict
  }, {});

  // handle form submission here
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_PARAMETERS,
    name: libraryStore.getSelectedApplication?.name,
    action: "add",
    value: JSON.stringify(paramInputsDict)
  });

  // Update current library params
  for(const key in paramInputsDict) {
    libraryStore.applicationParameters[key] = paramInputsDict[key];
  }

  changePage(true);
};

/**
 * Clear all currently saved parameters
 */
function clearENV() {
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.APPLICATION_PARAMETERS,
    name: libraryStore.getSelectedApplication?.name,
    action: "clear",
  });

  //Reset the input holders
  paramInputs.value = [];
  Object.keys(form).forEach((key) => {
    delete form[key]
  });

  addParamInput('', '');
}

function start() {
  for (const key in libraryStore.applicationParameters) {
    addParamInput(key, libraryStore.applicationParameters[key]);
  }

  if(paramInputs.value.length === 0) {
    addParamInput('', '');
  }

  pageNum.value++
}

function changePage(forward: boolean) {
  forward ? pageNum.value++ : pageNum.value--;
}

function openModal() {
  showCustomModal.value = true;

  // See if there is any saved parameters
  // @ts-ignore
  api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
    channelType: CONSTANT.MESSAGE.QUERY_MANIFEST_APP,
    applicationName: libraryStore.getSelectedApplication?.name
  });
}

function closeModal() {
  pageNum.value = 0;
  showCustomModal.value = false;

  //Reset the input holders
  paramInputs.value = [];
  Object.keys(form).forEach((key) => {
    delete form[key]
  });
}
</script>

<template>
  <!--Anchor button used to control the modal-->
  <GenericButton
      :type="'primary'"
      :callback="openModal"
      :spinnerColor="'#000000'"
  >Configure</GenericButton>

  <!--Modal body using the Modal template, teleports the html to the bottom of the body tag-->
  <Teleport to="body">
    <Modal :show="showCustomModal" @close="closeModal">
      <template v-slot:header>
        <header class="h-20 px-8 w-128 bg-white flex justify-between items-center rounded-t-lg">
          <div class="bg-white flex flex-col">
            <span class="text-lg font-medium text-black">Launch wizard</span>
          </div>
        </header>
      </template>

      <template v-slot:content>
        <div v-if="pageNum === 0" class="flex flex-col items-center">
          <div class="w-128 px-10 pt-4 mb-4 text-center">
            The following wizard sets launch parameters in the manifest file. Parameters be will
            called in the order they are saved. 'key' input is for human readability only! 'value' input is what will
            be added to a command line argument when the application is launched. A preview of the launch command
            can be seen on the last page.
            Clear All removes save parameters and Finish closes the modal.
          </div>

          <GenericButton
              class="h-8 w-24 my-4"
              :type="'primary'"
              :callback="start"
              :spinnerColor="'#000000'"
          >Start</GenericButton>
        </div>

        <!--A basic form separated into different pages-->
        <form @submit.prevent v-if="pageNum === 1" class="mt-2 mx-5">
          <div class="max-h-96 overflow-y-auto flex flex-col">
            <div v-for="(paramInput, index) in paramInputs" :key="paramInput.id">
              <LaunchParamInput
                  :id="paramInput.id"
                  :paramInput="paramInput"
                  :key-error="paramInput.keyError"
                  :value-error="paramInput.valueError"
                  @change-validation="changeValidation"
                  @update-value="updateParamInput($event, index, paramInput.id)"
                  @update-key="updateKey($event, index, paramInput.id)"
                  @remove-input="removeInput(paramInput.id)"/>
            </div>
          </div>
          <div class="flex justify-end">
            <button
                class="h-8 w-24 px-3 mt-2 mb-4 mr-2 rounded-lg bg-primary text-white hover:bg-blue-400"
                v-on:click="addNewInput"
            >Add</button>
            <button
                type="submit"
                class="h-8 w-24 px-3 mt-2 mb-4 mr-2 rounded-lg bg-primary text-white hover:bg-blue-400"
                v-on:click="handleSubmit"
            >Save</button>
          </div>
        </form>

        <div v-if="pageNum === 2" class="flex flex-col mx-5">
          <div class="py-1 px-2 mx-6 mt-10 text-sm bg-white rounded-3xl shadow-md">
            {{libraryStore.getSelectedApplication?.name}}.exe{{ params }}
          </div>

          <div class="flex justify-end">
            <button
                class="h-8 w-24 px-3 mt-5 mb-4 mr-2 rounded-lg bg-primary text-white hover:bg-blue-400"
                v-on:click="changePage(false)"
            >Back</button>
          </div>
        </div>
      </template>

      <template v-slot:footer>
        <footer class="mt-4 mb-6 mx-4 text-right flex flex-row justify-between">
          <button
              class="w-24 h-8 text-red-500 text-base rounded-lg hover:bg-gray-200 font-medium"
              :class="{'invisible': pageNum === 0 }"
                  v-on:click="clearENV"
          >Clear All</button>

          <button class="w-24 h-8 text-blue-500 text-base rounded-lg hover:bg-gray-200 font-medium"
                  v-on:click="closeModal"
          >{{pageNum === 2 ? "Close" : "Cancel"}}</button>
        </footer>
      </template>
    </Modal>
  </Teleport>
</template>
