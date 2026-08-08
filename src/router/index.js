/**
 * Vue Router Configuration
 * Maps route paths to views for single-page navigation.
 */
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import AbsenceView from '../views/AbsenceView.vue'
import DocumentView from '../views/DocumentView.vue'
import ReferenceView from '../views/ReferenceView.vue'

export const routes = [
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
    path: '/instruction',
    name: 'instruction',
    component: () => import('../views/InstructionView.vue'),
  },
  {
    path: '/guide',
    redirect: '/instruction',
  },
  {
    path: '/info',
    redirect: '/reference',
  },
]

const router = createRouter({
  history: import.meta.env.SSR
    ? createMemoryHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
