/**
 * Vue Router Configuration
 * Maps route paths to views for single-page navigation.
 */
import { createRouter, createWebHistory } from 'vue-router'
import AbsenceView from '../views/AbsenceView.vue'
import DocumentView from '../views/DocumentView.vue'
import ReferenceView from '../views/ReferenceView.vue'

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
      path: '/reference',
      name: 'reference',
      component: ReferenceView,
    },
    {
      path: '/info',
      redirect: '/reference',
    },
  ],
})

export default router
