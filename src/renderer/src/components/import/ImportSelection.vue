<script setup lang="ts">
import Tooltip from "@renderer/components/buttons/Tooltip.vue";
import hint from '../../assets/icons/hint_dark.svg';
import * as CONSTANT from '../../assets/constants/index';

const emit = defineEmits<{
  (e: 'import-type', value: string)
}>();

const changeType = (type: string) => {
  emit('import-type', type);
}
</script>

<template>
  <div class="flex flex-col mt-4 mx-4 px-4 w-128 h-80">
    Please select the type content to import.

    <div class="flex flex-col">
      <!--Import a custom application-->
      <div class="flex flex-row justify-center items-center my-10">
        <button @click="changeType(CONSTANT.IMPORT_TYPE.APPLICATION)"
                class="w-32 h-10 bg-slate-800 text-white text-base rounded-lg hover:bg-blue-400 font-medium"
        >
          Application
        </button>

        <span class="has-tooltip cursor-pointer">
          <img :src="hint" alt="Hint" class="h-6 w-6 bg-red ml-2" />
          <Tooltip
              tip="A custom executable file. (.exe)"
              tool-tip-margin="ml-1 -mt-12"
              arrow-margin="ml-3 -mt-4"
          >
          </Tooltip>
        </span>
      </div>

      <!--Import a VR, Regular or Backdrop video-->
      <div class="flex flex-row justify-center items-center">
        <button @click="changeType(CONSTANT.IMPORT_TYPE.VIDEO)"
                class="w-32 h-10 bg-slate-800 text-white text-base rounded-lg hover:bg-blue-400 font-medium"
        >
          Video
        </button>

        <span class="has-tooltip cursor-pointer">
          <img :src="hint" alt="Hint" class="h-6 w-6 bg-red ml-2" />
          <Tooltip
              tip="A VR, regular or backdrop file (.mp4, .avi)"
              tool-tip-margin="ml-1 -mt-12"
              arrow-margin="ml-3 -mt-4"
          >
          </Tooltip>
        </span>
      </div>

    </div>
  </div>
</template>
