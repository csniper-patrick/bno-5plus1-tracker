<script setup>
/**
 * Root Application Component
 * Renders top-level Vuetify app container, app bar header with theme toggling,
 * main RouterView, and the PWA ReloadPrompt modal.
 */
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { useTheme } from 'vuetify'
import ReloadPrompt from './components/ReloadPrompt.vue'

// Vuetify theme instance for dark/light mode switching
const theme = useTheme()

let mediaQuery = null

function handleSystemThemeChange(e) {
  theme.global.name.value = e.matches ? 'dark' : 'light'
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange)
    }
  }
})

onUnmounted(() => {
  if (mediaQuery) {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    } else if (mediaQuery.removeListener) {
      mediaQuery.removeListener(handleSystemThemeChange)
    }
  }
})

/**
 * Toggles current active theme between Union Jack dark and light palettes.
 */
function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}
</script>

<template>
  <v-app>
    <v-app-bar color="primary" elevation="2" class="px-2 px-sm-4">
      <div class="w-100 mx-auto d-flex align-center" style="max-width: 1600px">
        <v-icon icon="mdi-passport" size="large" class="ml-2 ml-sm-3 mr-2"></v-icon>
        <v-app-bar-title class="font-weight-bold text-truncate flex-shrink-1">
          BNO 5+1 Tracker
        </v-app-bar-title>

        <v-spacer class="d-none d-sm-flex"></v-spacer>

        <v-chip
          size="small"
          color="secondary"
          class="d-none d-sm-inline-flex mr-2 font-weight-bold"
          variant="flat"
          prepend-icon="mdi-crown-outline"
        >
          UK BNO Path
        </v-chip>

        <v-btn
          :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="text"
          @click="toggleTheme"
        ></v-btn>
      </div>
    </v-app-bar>

    <v-main>
      <v-container class="mx-auto py-6 px-4 px-md-8" style="max-width: 1600px">
        <RouterView />
      </v-container>
    </v-main>

    <!-- PWA New Version Update Prompt -->
    <ReloadPrompt />
  </v-app>
</template>

<style scoped></style>
