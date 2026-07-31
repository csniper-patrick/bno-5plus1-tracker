import { createRouter, createWebHistory } from 'vue-router'
import AbsenceView from '../views/AbsenceView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: AbsenceView,
    },
  ],
})

export default router
