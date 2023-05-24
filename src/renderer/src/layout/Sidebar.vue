<script setup lang="ts">
import { defineProps } from 'vue'

defineProps({
    title: {
        type: String,
        required: true
    }
})
</script>

<template>
    <header class="w-full navbar">
        <nav class="flex flex-col h-full w-full p-5 pt-5 text-black">
            <div class="sidebar-title mb-2">
                <h2 class="title font-bold text-lg text-center">{{ title }}</h2>
            </div>
            <slot name="content" />
        </nav>
    </header>
</template>
