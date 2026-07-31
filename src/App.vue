<script setup>
import { RouterView } from 'vue-router'
import { useTheme } from 'vuetify'

const theme = useTheme()

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}
</script>

<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <template #prepend>
        <v-icon icon="mdi-passport" size="large" class="ml-2 mr-2"></v-icon>
      </template>
      <v-app-bar-title class="font-weight-bold">BNO 5+1 Tracker</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-chip size="small" color="secondary" class="mr-3 font-weight-bold" variant="flat" prepend-icon="mdi-crown-outline">
        UK BNO Path
      </v-chip>
      <v-btn to="/" prepend-icon="mdi-home" variant="text">Home</v-btn>
      <v-btn
        :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        variant="text"
        @click="toggleTheme"
      ></v-btn>
    </v-app-bar>

    <v-main>
      <v-container max-width="1600" class="py-6 px-4 px-md-8">
        <RouterView />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped></style>
