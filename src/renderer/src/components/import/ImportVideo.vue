<script setup lang="ts">
import SetupChoiceSelection from "@renderer/components/inputs/SetupChoiceSelection.vue";
import useVuelidate from "@vuelidate/core";
import ImportProgress from "@renderer/components/import/ImportProgress.vue";
import Chevron from "@renderer/assets/vue/Chevron.vue";
import * as CONSTANT from "@renderer/assets/constants";
import { computed, ref } from "vue";
import { helpers, required } from "@vuelidate/validators";

const emit = defineEmits<{
  (e: 'close');
}>();

const pageNum = ref(0);
const maxPageNum = 4;
const error = ref();
const videoType = ref("Regular");
const filePath = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

const rules = {
  videoType: {
    required: helpers.withMessage("Video type is requires a value", required),
    $autoDirty: true
  },
}

const v$ = useVuelidate(rules, { videoType });

const changePage = (value: number) => {
  pageNum.value = value;
}

/**
 * Check if the user can proceed to the next import page or if they still have to provide a valid input.
 */
const canProceed = computed(() => {
  if (pageNum.value === 1 && (filePath.value.length === 0 || !checkFileExtension(filePath.value))) {
    return false;
  }

  return true;
});

const selectVideo = (): void => {
  if(fileInput.value !== null && fileInput.value.files !== null) {
    filePath.value = fileInput.value.files[0]["path"];
  }

  if (!checkFileExtension(filePath.value)) {
    error.value = "File must be an MPEG-4 (.mp4)";
  }
}

const clearVideo = () => {
  filePath.value = "";
  if (fileInput.value !== null) {
    fileInput.value.value = "";
  }
  error.value = "";
}

const importVideo = () => {
  if(filePath.value == "" || filePath.value == null) {
    error.value = "A file must be selected.";
  } else if (!checkFileExtension(filePath.value)) {
    error.value = "File must be an MPEG-4 (.mp4)";
  } else {
    //@ts-ignore
    api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
      channelType: CONSTANT.MESSAGE.VIDEO_IMPORT,
      videoPath: filePath.value,
      videoType: videoType.value
    });

    //Reset the file input
    if (fileInput.value !== null) {
      fileInput.value.value = "";
    }
    videoImported();
  }

  if (fileInput.value !== null) {
    fileInput.value.value = "";
  }
}

/**
 * Check against the approved file extensions to see if we can properly manage the supplied file path.
 */
const checkFileExtension = (filePath: String): boolean => {
  let accepted: string[] = [".mp4"];
  for (let extension of accepted) {
    if (filePath.endsWith(extension)) {
      return true;
    }
  }
  return false;
}

const videoImported = () => {
  filePath.value = "";
  if (fileInput.value !== null) {
    fileInput.value.value = "";
  }

  emit('close');
}
</script>

<template>
  <div class="flex flex-col mt-4 mx-4 w-128 h-80">
    <div class="flex flex-col flex-grow">

      <!--Page 0-->
      <div v-if="pageNum === 0" class="flex flex-col px-4">
        <p>
          Importing a video enables LeadMe Labs to launch it from the tablet. Once the video is successfully imported
          using this wizard, restarting the Station software will display the new video in the tablet's experience library.
        </p>

        <p class="my-5">
          <span class="font-bold">Please note:</span> Either the LeadMe Video Player or VR Video Player must be installed in
          order for LeadMe labs to be able to launch and control the video.
        </p>

        <p>
          After completing each section, click the arrow
          <span class="inline-block"><Chevron class="w-5 pt-1" colour="black"/></span>
          to move forward, or select the back arrow to return and modify any details.
        </p>
      </div>

      <!--Page 1 - find the file-->
      <div v-if="pageNum === 1" class="flex flex-col flex-grow content-center px-4">
        <div class="flex flex-col flex-grow">
          <p class="mb-5">
            Click '<span class="font-bold">Find file</span>' to open a file explorer and navigate to the video file
            you want to import. If you choose the wrong file, click '<span class="font-bold">Clear</span>' to remove the
            selection and start over.
          </p>

          <p class="mb-5">
            <span class="font-bold">Note:</span> Importing a video will move the file from its current location on the
            station to the location required by LeadMe labs. This is under the general Videos folder of the user.
          </p>

          <div class="font-bold">File path</div>
          <div class="w-full ml-2.5 overflow-y-auto items-center">{{filePath}}</div>
        </div>

        <div class="flex flex-row mb-1 justify-between items-baseline mb-3">
          <div class="flex flex-col items-end">
            <div class="text-red-800 text-xs" >{{ error }}</div>
          </div>

          <div class="flex flex-row justify-end mr-2">
            <button class="w-24 h-8 mr-5 bg-secondary text-white text-base rounded-lg hover:bg-blue-400 font-medium"
                    v-on:click="clearVideo"
            >
              Clear
            </button>

            <label
                for="files"
                class="w-24 h-8 rounded-lg flex items-center justify-center text-white bg-primary cursor-pointer hover:bg-blue-400"
            >
              <input class="hidden" id="files" ref="fileInput" type="file" @change="selectVideo">
              Find file
            </label>
          </div>
        </div>
      </div>

      <!--Page 2 - additional details-->
      <div v-if="pageNum === 2" class="flex flex-col px-4">
        <p>
          The options selected below define how the LeadMe system will interact with the imported video.
        </p>

        <div class="flex flex-col my-5">
          <div class="mb-2 font-bold">
            Additional details
          </div>

          <div class="flex flex-col h-8">
            <div class="mb-4">
              What type of video is it?
            </div>

            <div class="flex justify-center">
              <SetupChoiceSelection
                  title=""
                  :choices="['Regular', 'VR', 'Backdrops']"
                  v-model="videoType"
                  :v$="v$.videoType"/>
            </div>
          </div>
        </div>
      </div>

      <!--Page 3 - summary-->
      <div v-if="pageNum === 3" class="flex flex-col h-full px-4">
        <div class="flex flex-col flex-grow">
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
              File path
            </div>
            <div class="w-full ml-2.5 overflow-y-auto items-center">{{filePath}}</div>
          </div>

          <div class="flex flex-col mb-3">
            <div class="font-bold">
              Details
            </div>
            <p class="ml-2.5">
              Video type: <span>{{videoType}}</span>
            </p>
          </div>
        </div>

        <div class="flex flex-row justify-end items-center my-5">
          <button class="w-44 h-8 bg-slate-800 text-white text-base rounded-lg hover:bg-blue-400 font-medium"
                  v-on:click="importVideo"
          >
            Import Video
          </button>
        </div>
      </div>
    </div>

    <!--Progress-->
    <ImportProgress :can-proceed="canProceed" :max-page-num="maxPageNum" :page-num="pageNum" @update-page="changePage"/>
  </div>
</template>
