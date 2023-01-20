<script setup lang="ts">
defineProps({
  color: {
    type: String,
    required: false,
    default: '#fff'
  }
});
</script>

<template>
  <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
</template>

<style scoped>
.lds-ring {
  display: inline-block;
  position: relative;
  width: 15px;
  height: 15px;
}
.lds-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  top: -20%;
  left: 0;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border: 4px solid v-bind(color);
  border-radius: 50%;
  animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: v-bind(color) transparent transparent transparent;
}
.lds-ring div:nth-child(1) {
  animation-delay: -0.45s;
}
.lds-ring div:nth-child(2) {
  animation-delay: -0.3s;
}
.lds-ring div:nth-child(3) {
  animation-delay: -0.15s;
}
@keyframes lds-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>