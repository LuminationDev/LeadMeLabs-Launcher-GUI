<script setup lang="ts">
import { RouterView } from 'vue-router'
import Header from './layout/Header.vue'
</script>

<template>
    <div class="flex flex-col bg-white rounded-3xl mb-2">
        <Header />
    </div>
    <div class="content flex flex-row w-full">
        <RouterView />
    </div>
</template>

<style lang="less">
@import './assets/css/styles.less';
</style>
