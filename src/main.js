/**
 * Application Entry Point
 * Initializes Vue 3 instance with Pinia state management, Vue Router, and Vuetify UI plugin.
 */
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'

const app = createApp(App)

// Register global plugins
app.use(createPinia())
app.use(router)
app.use(vuetify)

// Mount application to DOM
app.mount('#app')
