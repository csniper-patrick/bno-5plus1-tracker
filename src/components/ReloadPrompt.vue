<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(swUrl, r) {
    if (r) {
      setInterval(
        () => {
          r.update()
        },
        60 * 60 * 1000,
      )
    }
  },
})

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
            {{ needRefresh ? 'New Version Available!' : 'App Ready for Offline Use' }}
          </div>
          <div class="text-caption">
            {{
              needRefresh
                ? 'A new version of BNO 5+1 Tracker is available. Click refresh to update.'
                : 'Content cached for offline browsing.'
            }}
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
          @click="updateServiceWorker(true)"
        >
          Refresh & Update
        </v-btn>
        <v-btn variant="text" size="small" icon="mdi-close" @click="close"></v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped></style>
