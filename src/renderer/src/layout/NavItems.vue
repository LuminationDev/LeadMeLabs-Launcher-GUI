<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import squareIcon from '@renderer/assets/icons/squares.svg'

const props = defineProps({
  target: {
    type: String,
    required: true
  }
})

const active = computed(() => {
  const name = useRoute()?.name // current path
  let path = props.target.replace('/', '') // check it's this
  if (path === '') {
    path = 'library'
  }
  return name === path
})
</script>

<template>
  <router-link class="non-draggable" :class="
    {
      'underline underline-offset-8 decoration-white': active,
      'no-underline hover:no-underline': !active
    }" :to="props.target">
    <div
      class="nav-items-container text-shadow items-center"
      :class="{
        'text-white': active,
        'text-inactive hover:text-gray-100': !active
      }"
    >
      <div
        class="nav-icons grayscale bg-white drop-shadow-xl p-1 mr-4 rounded-lg"
        :class="active ? 'nav-icons-active' : 'nav-icons-inactive'"
      >
        <img
          class="w-6 h-6 stroke-inactive fill-inactive shrink-0 max-w-none"
          :src="squareIcon"
          alt="icon with four squares"
        />
      </div>
      <slot> </slot>
    </div>
  </router-link>
</template>

<style scoped lang="less">
.nav-icons:hover {
  box-shadow: 0 5px 6px 0 rgba(0, 0, 0, 0.2);
}

.nav-icons-active {
  box-shadow: 0 5px 6px 0 rgba(0, 0, 0, 0.2);
}

.nav-icons-inactive {
  color: black;
  opacity: 0.7;
}

.text-inactive {
  color: lightgray;
  opacity: 0.9;
}

.nav-items-container:hover {
  .nav-icons {
    filter: grayscale(0);
    opacity: 1 !important;
    box-shadow: 0 5px 6px 0 rgba(0, 0, 0, 0.2);
  }
}

.text-shadow {
  text-shadow: 1px 1px 2px black;
}
</style>
