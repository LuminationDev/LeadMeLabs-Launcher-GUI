<script setup lang="ts">
import Chevron from "@renderer/assets/vue/Chevron.vue";
import ProgressDot from "@renderer/assets/vue/ProgressDot.vue";

const emit = defineEmits<{
  (e: 'update-page', value: number)
}>();

defineProps({
  pageNum: {
    type: Number,
    required: true
  },
  maxPageNum: {
    type: Number,
    required: true
  },
  canProceed: {
    type: Boolean,
    required: false
  }
});

const changePage = (value: number) => {
  emit('update-page', value);
}
</script>

<template>
  <div class="flex flex-row justify-center items-center">
    <div>
      <Chevron @click="changePage(pageNum-1)"
               :class="{'invisible': pageNum === 0}"
               class="rotate-180 cursor-pointer" colour="black"/>
    </div>

    <div v-for="index in maxPageNum">
      <ProgressDot class="h-4 w-4" :colour="index-1 <= pageNum ? 'blue' : 'gray'" />
    </div>

    <div>
      <Chevron @click="changePage(pageNum+1)"
               :class="{'invisible': pageNum === maxPageNum-1 || !canProceed}"
               class="cursor-pointer" colour="black"/>
    </div>
  </div>
</template>
