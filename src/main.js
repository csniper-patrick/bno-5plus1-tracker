/**
 * Application Entry Point
 * Initializes Vue 3 instance with Pinia state management, Vue Router, and Vuetify UI plugin.
 */
import './assets/main.css'

import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'

import App from './App.vue'
import { routes } from './router'
import vuetify from './plugins/vuetify'
import i18n from './plugins/i18n'

export const createApp = ViteSSG(App, { routes, base: import.meta.env.BASE_URL }, ({ app }) => {
  // Register global plugins
  app.use(createPinia())
  app.use(i18n)
  app.use(vuetify)
})
