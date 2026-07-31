<template>
  <v-card elevation="2" class="pa-6 rounded-lg">
    <v-card-title class="d-flex align-center text-h5 font-weight-bold">
      <v-icon icon="mdi-information-outline" color="primary" class="mr-2"></v-icon>
      About BNO 5+1 Tracker
    </v-card-title>

    <v-card-text class="pt-4">
      <v-alert
        type="info"
        variant="tonal"
        icon="mdi-shield-check"
        class="mb-4"
        title="Vuetify 3 Ready"
      >
        This application uses Vuetify 3 with Material Design icons and components.
      </v-alert>

      <p class="text-body-1 mb-4">
        The BNO 5+1 Tracker assists BN(O) visa holders in keeping track of physical presence, key
        dates, and stay requirements necessary for Indefinite Leave to Remain (ILR) and British
        Citizenship applications.
      </p>

      <v-btn color="primary" prepend-icon="mdi-home" to="/"> Back to Home </v-btn>
    </v-card-text>
  </v-card>
</template>

<style scoped></style>
