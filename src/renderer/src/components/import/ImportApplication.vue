<script setup lang="ts">
import SetupChoiceSelection from "@renderer/components/inputs/SetupChoiceSelection.vue";
import SetupSingleInput from "@renderer/components/inputs/SetupSingleInput.vue";
import useVuelidate from "@vuelidate/core";
import * as CONSTANT from "@renderer/assets/constants";
import ImportProgress from "@renderer/components/import/ImportProgress.vue";
import Chevron from "@renderer/assets/vue/Chevron.vue";
import { computed, ref } from "vue";
import { helpers, required } from "@vuelidate/validators";

const emit = defineEmits<{
  (e: 'close')
}>();

const pageNum = ref(0);
const maxPageNum = 5;
const error = ref();
const name = ref("");
const isVr = ref("True");
const filePath = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

const rules = {
  name: {
    required: helpers.withMessage("File name is required", required),
    $autoDirty: true
  },
  isVr: {
    required: helpers.withMessage("Is VR is requires a value", required),
    $autoDirty: true
  },
}

const v$ = useVuelidate(rules, { name, isVr });

const selectApplication = (): void => {
  if(fileInput.value !== null && fileInput.value.files !== null) {
    filePath.value = fileInput.value.files[0]["path"];
  }
}

/**
 * Make sure a file is selected, the path is at least 4 characters (C:/x) and that it is an executable.
 */
const importApplication = (): void => {
  if(filePath.value == "" || filePath.value == null) {
    error.value = "A file must be selected.";
  } else if (!checkFileExtension(filePath.value)) {
    error.value = "File must be an executable (.exe)";
  } else {
    //@ts-ignore
    api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
      channelType: CONSTANT.MESSAGE.APPLICATION_IMPORT,
      name: name.value,
      altPath: filePath.value,
      isVr: isVr.value === 'True'
    });

    //Reset the file input
    if (fileInput.value !== null) {
      fileInput.value.value = "";
    }
    applicationImported();
  }

  if (fileInput.value !== null) {
    fileInput.value.value = "";
  }
}

const clearApplication = () => {
  filePath.value = "";
  if (fileInput.value !== null) {
    fileInput.value.value = "";
  }
}

/**
 * Check against the approved file extensions to see if we can properly manage the supplied file path.
 */
const checkFileExtension = (filePath: String): boolean => {
  let accepted: string[] = [".exe", ".lnk"];
  for (let extension of accepted) {
    if (filePath.endsWith(extension)) {
      return true;
    }
  }
  return false;
}

const applicationImported = () => {
  name.value = "";
  filePath.value = "";
  if (fileInput.value !== null) {
    fileInput.value.value = "";
  }

  emit('close');
}

const changePage = (value: number) => {
  pageNum.value = value;
}

/**
 * Check if the user can proceed to the next import page or if they still have to provide a valid input.
 */
const canProceed = computed(() => {
  if (pageNum.value === 1 && name.value.trim().length === 0) {
    return false;
  }

  if (pageNum.value === 2 && filePath.value.length === 0) {
    return false;
  }

  return true;
});
</script>

<template>
  <div class="flex flex-col mt-4 mx-4 w-128 h-80">
    <div class="flex flex-col flex-grow">

      <!--Page 0-->
      <div v-if="pageNum === 0" class="flex flex-col px-4">
        <p>
          Importing an application enables LeadMe Labs to launch it from the tablet or the LeadMe launcher.
          Once the application is successfully imported using this wizard, selecting 'refresh' in the tablet's
          experience library will display the new application.
        </p>

        <p class="my-5">
          After completing each section, click the arrow
          <span class="inline-block"><Chevron class="w-5 pt-1" colour="black"/></span>
          to move forward, or select the back arrow to return and modify any details.
        </p>
      </div>

      <!--Page 1-->
      <div v-if="pageNum === 1" class="flex flex-col content-center px-4">
        <p>
          The name you enter here will be the name that appears in the experience library. It's essential to choose a
          clear and descriptive name for easy identification.
        </p>

        <p class="my-5">
          <span class="font-bold">Please note:</span> If you are importing an application on multiple stations, the
          experience name <span class="font-bold">MUST</span> be exactly the same across all stations; otherwise, they
          will appear as separate entries in the experience library.
        </p>

        <SetupSingleInput title="" :placeholder="'My Experience'" :v$="v$.name" v-model="name"/>
      </div>

      <!--Page 2-->
      <div v-if="pageNum === 2" class="flex flex-col flex-grow content-center px-4">
        <div class="flex flex-col flex-grow">
          <p class="mb-10">
            Click '<span class="font-bold">Find file</span>' to open a file explorer and navigate to the executable file
            you want to import. If you choose the wrong file, click '<span class="font-bold">Clear</span>' to remove the
            selection and start over.
          </p>

          <div class="font-bold">File path</div>
          <div class="w-full ml-2.5 overflow-y-auto items-center">{{filePath}}</div>
        </div>

        <div class="flex flex-col mb-10">
          <div class="flex flex-row justify-end mr-2">
            <button class="w-24 h-8 mr-5 bg-secondary text-white text-base rounded-lg hover:bg-blue-400 font-medium"
                    v-on:click="clearApplication"
            >
              Clear
            </button>

            <label
                for="files"
                class="w-24 h-8 rounded-lg flex items-center justify-center"
                :class="{
                        'text-white bg-primary cursor-pointer hover:bg-blue-400': name.length > 0,
                        'text-white bg-gray-400': name.length === 0,
                      }"
            >
              <input :disabled="name.length === 0" class="hidden" id="files" ref="fileInput" type="file" @change="selectApplication">
              Find file
            </label>
          </div>
        </div>

        <div class="flex flex-col items-end mr-2" v-if="error">
          <div class="text-red-800 text-xs" >{{ error }}</div>
        </div>
      </div>

      <!--Page 3-->
      <div v-if="pageNum === 3" class="flex flex-col px-4">
        <p>
          The options selected below define how the LeadMe system will interact with the imported application.
        </p>

        <div class="flex flex-col my-5">
          <div class="mb-2 font-bold">
            Additional details
          </div>

          <div class="flex flex-row h-8 items-center justify-center">
            <SetupChoiceSelection
                :title="'Is the application VR?'"
                :choices="['True', 'False']"
                v-model="isVr"
                :v$="v$.isVr" />
          </div>
        </div>
      </div>

      <!--Page 4-->
      <div v-if="pageNum === 4" class="flex flex-col px-4">
        <div class="flex flex-col mb-2">
          <div class="font-bold">
            Summary
          </div>

          <p>
            Please make sure the below details are correct before selecting '<span class="font-bold">Import Application</span>'.
          </p>
        </div>

        <div class="flex flex-col mb-3">
          <div class="font-bold">
            Name
          </div>
          <div class="w-full ml-2.5 overflow-y-auto items-center">
            {{name}}
          </div>
        </div>

        <div class="flex flex-col mb-3">
          <div class="font-bold">
            File path
          </div>
          <div class="w-full ml-2.5 overflow-y-auto items-center">{{filePath}}</div>
        </div>

        <div class="flex flex-col mb-3">
          <div class="font-bold">
            Details
          </div>
          <p class="ml-2.5">
            Is application VR: <span>{{isVr}}</span>
          </p>
        </div>

        <div class="flex flex-row justify-end items-center my-5">
          <button class="w-44 h-8 bg-slate-800 text-white text-base rounded-lg hover:bg-blue-400 font-medium"
                  v-on:click="importApplication"
          >
            Import Application
          </button>
        </div>
      </div>
    </div>

    <!--Progress-->
    <ImportProgress :can-proceed="canProceed" :max-page-num="maxPageNum" :page-num="pageNum" @update-page="changePage"/>
  </div>
</template>
