import Dashboard from '@renderer/views/Dashboard.vue'
import Home from '@renderer/views/Home.vue'
import Library from '@renderer/views/Library.vue'
import Store from '@renderer/views/Store.vue'
import { createRouter, createWebHashHistory } from 'vue-router'
const router = createRouter({
    history: createWebHashHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: Home
        },
        {
            path: '/dashboard',
            name: 'dashboard',
            component: Dashboard
        },
        {
            path: '/library',
            name: 'library',
            component: Library
        },
        {
            path: '/store',
            name: 'store',
            component: Store
        }
    ]
})

export default router
