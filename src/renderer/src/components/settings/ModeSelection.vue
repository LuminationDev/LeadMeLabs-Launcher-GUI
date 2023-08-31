<script setup lang="ts">
import { useLibraryStore } from "../../store/libraryStore";
import { onBeforeMount, ref } from "vue";

const emit = defineEmits();
const libraryStore = useLibraryStore();
const selectedMode = ref();
const handleModeChange = () => {
  libraryStore.mode = selectedMode.value;
  emit('config-change', {key: 'mode', value: selectedMode.value});
}

onBeforeMount(() => {
  selectedMode.value = libraryStore.mode;
});
</script>

<template>
  <div class="flex flex-col">
    <div class="font-bold mb-2">Software Mode</div>

    <div class="flex flex-row items-center mb-4">
      <input
          class="h-5 w-5 ml-2 mr-2"
          type="radio"
          name="mode"
          value="production"
          v-model="selectedMode"
          @change="handleModeChange"
      />
      <p>Production Mode</p>
    </div>

    <div class="flex flex-row items-center mb-4">
      <input
          class="h-5 w-5 ml-2 mr-2"
          type="radio"
          name="mode"
          value="development"
          v-model="selectedMode"
          @change="handleModeChange"
      />
      <p>Development Mode</p>
    </div>

    <div class="flex flex-row items-center mb-4">
      <input
          class="h-5 w-5 ml-2 mr-2"
          type="radio"
          name="mode"
          value="offline"
          v-model="selectedMode"
          @change="handleModeChange"
      />
      <p>Offline Mode</p>
    </div>

    <div class="flex flex-row items-center">
      <input
          class="h-5 w-5 ml-2 mr-2"
          type="radio"
          name="mode"
          value="local"
          v-model="selectedMode"
          @change="handleModeChange"
      />
      <p>Local Mode</p>
    </div>
  </div>
</template>
