<script setup lang="ts">
import TitleItem from "@renderer/layout/TitleBar/TitleItem.vue";

const minimiseApp = () => {
  sendCommand("minimize");
}

const maximiseApp = () => {
  sendCommand("maximize");
}

const closeApp = () => {
  sendCommand("close");
}

const sendCommand = (command: string) => {
  //ts-ignore
  api.ipcRenderer.send(command, true);
}
</script>

<template>
  <div class="flex flex-row justify-between w-24">
    <TitleItem :callback="minimiseApp" button-type="minimise"/>
    <TitleItem :callback="maximiseApp" button-type="maximise"/>
    <TitleItem :callback="closeApp" button-type="close"/>
  </div>
</template>
