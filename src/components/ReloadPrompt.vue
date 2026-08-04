<script setup>
/**
 * ReloadPrompt Component
 * Listens to VitePWA service worker events (`offlineReady` and `needRefresh`).
 * Displays an interactive Vuetify snackbar prompting the user to update the app
 * when a new release build is available or confirming offline readiness.
 */
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(swUrl, r) {
    if (r) {
      // Periodically check for service worker updates every 1 hour (60 * 60 * 1000 ms)
      setInterval(
        () => {
          r.update()
        },
        60 * 60 * 1000,
      )
    }
  },
})

/**
 * Triggers service worker cache update and reloads window to apply latest app assets.
 */
async function handleUpdate() {
  await updateServiceWorker(true)
  window.location.reload()
}

/**
 * Dismisses update snackbar notification.
 */
function close() {
  offlineReady.value = false
  needRefresh.value = false
}
</script>

<template>
  <div v-if="offlineReady || needRefresh">
    <v-snackbar
      :model-value="offlineReady || needRefresh"
      :timeout="-1"
      color="primary"
      location="bottom right"
      elevation="6"
      class="pa-2"
    >
      <div class="d-flex align-center ga-3">
        <v-icon
          :icon="needRefresh ? 'mdi-update' : 'mdi-check-circle-outline'"
          size="large"
        ></v-icon>
        <div>
          <div class="font-weight-bold">
            {{ needRefresh ? $t('pwa.new_version') : $t('pwa.offline_ready') }}
          </div>
          <div class="text-caption">
            {{ needRefresh ? $t('pwa.new_version_desc') : $t('pwa.offline_desc') }}
          </div>
        </div>
      </div>

      <template #actions>
        <v-btn
          v-if="needRefresh"
          color="warning"
          variant="flat"
          size="small"
          prepend-icon="mdi-refresh"
          class="font-weight-bold"
          @click="handleUpdate"
        >
          {{ $t('pwa.refresh') }}
        </v-btn>
        <v-btn variant="text" size="small" icon="mdi-close" @click="close"></v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped></style>
