<script setup lang="ts">
import { ref } from "vue";
import { code } from "../../assets/strings/releases";
import ReleaseDetails from "@renderer/components/home/ReleaseDetails.vue";
import ReleaseCodes from "@renderer/components/home/ReleaseCodes.vue";

const props = defineProps({
  latest: {
    type: Boolean,
    required: false,
    default: false
  },
  version: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  features: {
    type: Array<string>,
    required: false
  },
  performance: {
    type: Array<string>,
    required: false
  },
  fixes: {
    type: Array<string>,
    required: false
  },
  codes: {
    type: Object as () => code,
    required: false
  }
});

const expanded = ref(props.latest);
</script>

<template>
  <div class="flex flex-col">
    <div class="p-3 cursor-pointer rounded bg-gray-100 hover:bg-gray-200" @click="expanded = !expanded">
      <div class="flex flex-row w-full justify-between title font-bold text-lg text-center">
        <div>
          Version - {{version}}
        </div>
        <div>
          {{date}}
        </div>
      </div>
    </div>

    <div v-if="expanded" class="flex flex-col bg-gray-50 p-3">
      <!--Features-->
      <ReleaseDetails class="mb-5" title="Features" :items="features"/>

      <!--Performance-->
      <ReleaseDetails class="my-5" title="Performance" :items="performance"/>

      <!--Fixes-->
      <ReleaseDetails class="my-5" title="Fixes" :items="fixes"/>

      <!--Version codes-->
      <ReleaseCodes :codes="codes"/>
    </div>

  </div>
</template>
