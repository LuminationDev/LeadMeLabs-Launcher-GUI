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
    const name = useRoute().name // current path
    let path = props.target.replace('/', '') // check it's this
    if (path === '') {
        path = 'home'
    }
    return name === path
})
</script>
<template>
    <router-link class="hover:no-underline" :to="props.target">
        <div
            class="nav-items-container p-5 hover:text-black items-center"
            :class="active ? 'text-black' : 'text-inactive'"
        >
            <div
                class="nav-icons grayscale drop-shadow-xl p-1 mr-4 rounded-lg"
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
    opacity: 0.6;
}

.nav-items-container:hover {
    .nav-icons {
        filter: grayscale(0);
        opacity: 1 !important;
        box-shadow: 0 5px 6px 0 rgba(0, 0, 0, 0.2);
    }
}
</style>
