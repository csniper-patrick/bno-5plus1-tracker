<script setup>
import TheWelcome from '../components/TheWelcome.vue'
</script>

<template>
  <main>
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card elevation="3" class="pa-6 rounded-lg bg-surface">
          <div class="d-flex align-center mb-4">
            <v-avatar color="primary" size="56" class="mr-4">
              <v-icon icon="mdi-calculator-variant" size="32"></v-icon>
            </v-avatar>
            <div>
              <h1 class="text-h4 font-weight-bold">BNO 5+1 Tracker</h1>
              <p class="text-subtitle-1 text-medium-emphasis">
                Track your residency, tax status, and requirements for the UK BNO 5+1 visa path.
              </p>
            </div>
          </div>
          <v-divider class="my-4"></v-divider>
          <div class="d-flex ga-2 flex-wrap">
            <v-chip color="success" prepend-icon="mdi-check-circle" variant="tonal"
              >Vuetify 3 Active</v-chip
            >
            <v-chip color="info" prepend-icon="mdi-vuetify" variant="tonal">Material Design</v-chip>
            <v-chip color="purple" prepend-icon="mdi-vector-square" variant="tonal"
              >Vue 3 + Vite</v-chip
            >
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-card elevation="2" class="pa-4 rounded-lg">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-compass-outline" class="mr-2" color="primary"></v-icon>
        Getting Started
      </v-card-title>
      <v-card-text>
        <TheWelcome />
      </v-card-text>
    </v-card>
  </main>
</template>
