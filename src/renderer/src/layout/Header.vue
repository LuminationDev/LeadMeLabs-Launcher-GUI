<script setup lang="ts">
import NavItems from './NavItems.vue'
import TitleBar from "@renderer/layout/TitleBar/TitleBar.vue";
</script>

<template>
  <header class="navbar">
    <nav class="flex flex-row rounded-2xl items-center w-full p-5 pt-5 text-black nav-with-bg relative">
      <div class="sidebar-title mr-8">
        <h2 class="title font-bold text-lg text-white text-center">LeadMe Launcher</h2>
      </div>

      <NavItems class="m-5" target="/dashboard">Dashboard</NavItems>
      <NavItems class="m-5" target="/home">Home</NavItems>
      <NavItems class="m-5" target="/">Library</NavItems>
      <NavItems class="m-5" target="/settings">Settings</NavItems>

      <TitleBar class="absolute top-2 right-3" />
    </nav>
  </header>
</template>

<style scoped>
.nav-with-bg {
  background-image: url('../assets/images/header_placeholder.png');
  background-size: cover; /* Adjusts the size of the background image */
  background-position: center; /* Centers the background image */
}
</style>
