import Dashboard from '@renderer/views/Dashboard.vue'
import Home from '@renderer/views/Home.vue'
import Library from '@renderer/views/Library.vue'
import Settings from '@renderer/views/Settings.vue'
import { createRouter, createWebHashHistory } from 'vue-router'
const router = createRouter({
    history: createWebHashHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'library',
            component: Library
        },
        {
            path: '/dashboard',
            name: 'dashboard',
            component: Dashboard
        },
        {
            path: '/home',
            name: 'home',
            component: Home
        },
        {
            path: '/settings',
            name: 'settings',
            component: Settings
        }
    ]
})

export default router
