/**
 * Vue Router Configuration
 * Maps route paths to views for single-page navigation.
 */
import { createRouter, createWebHistory } from 'vue-router'
import AbsenceView from '../views/AbsenceView.vue'
import DocumentView from '../views/DocumentView.vue'
import InfoView from '../views/InfoView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: AbsenceView,
    },
    {
      path: '/documents',
      name: 'documents',
      component: DocumentView,
    },
    {
      path: '/info',
      name: 'info',
      component: InfoView,
    },
  ],
})

export default router
