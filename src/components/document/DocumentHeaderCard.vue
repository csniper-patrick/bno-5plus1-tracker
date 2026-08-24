<script>
import { mapStores } from 'pinia'
import { useDocumentsStore } from '../../stores/documents'

export default {
  name: 'DocumentHeaderCard',

  computed: {
    ...mapStores(useDocumentsStore),

    lifeInUk() {
      return this.documentsStore.lifeInUk
    },

    englishTest() {
      return this.documentsStore.englishTest
    },

    residenceStats() {
      return this.documentsStore.residenceStats
    },

    addressHistory() {
      return this.documentsStore.addressHistory
    },

    overallReadinessPercent() {
      return this.documentsStore.overallReadinessPercent
    },
  },

  methods: {
    getStatusColor(status) {
      switch (status) {
        case 'verified':
        case 'passed':
          return 'success'
        case 'collected':
        case 'scheduled':
          return 'info'
        case 'pending':
        case 'not_started':
        default:
          return 'grey'
      }
    },

    getStatusText(status) {
      switch (status) {
        case 'verified':
          return this.$t('document.status_verified')
        case 'collected':
          return this.$t('document.status_collected')
        case 'pending':
          return this.$t('document.status_pending')
        case 'passed':
          return this.$t('document.status_passed')
        case 'scheduled':
          return this.$t('document.status_scheduled')
        case 'not_started':
          return this.$t('document.status_not_started')
        default:
          return status
      }
    },
  },
}
</script>

<template>
  <v-col cols="12" md="8" lg="12">
    <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
      <v-card-title class="px-0 pt-0 d-flex align-center flex-wrap ga-2">
        <div class="d-flex align-center">
          <v-icon icon="mdi-file-document-check-outline" color="primary" class="mr-2"></v-icon>
          <span class="text-h5 font-weight-bold">{{ $t('document.title') }}</span>
        </div>
        <v-chip
          size="small"
          color="success"
          variant="flat"
          class="font-weight-bold ml-sm-auto"
          prepend-icon="mdi-shield-check"
        >
          {{ $t('app.badge_local_storage') }}
        </v-chip>
      </v-card-title>
      <p class="text-body-2 text-medium-emphasis ma-0">
        {{ $t('document.subtitle') }}
      </p>

      <v-alert
        type="info"
        variant="tonal"
        icon="mdi-shield-lock-outline"
        class="mt-3 text-caption"
        density="compact"
      >
        <i18n-t keypath="app.privacy_note_text" scope="global">
          <template #code>
            <code>IndexedDB</code>
          </template>
        </i18n-t>
      </v-alert>

      <!-- Overall Readiness Metric Banner -->
      <v-divider class="my-4"></v-divider>

      <v-row class="align-center">
        <v-col cols="12" md="4" class="text-center text-md-left">
          <div class="text-overline text-medium-emphasis mb-1">
            {{ $t('document.overall_readiness') }}
          </div>
          <div class="d-flex align-center justify-center justify-md-start ga-3">
            <v-progress-circular
              :model-value="overallReadinessPercent"
              size="64"
              width="7"
              color="primary"
            >
              <span class="font-weight-bold text-caption">{{ overallReadinessPercent }}%</span>
            </v-progress-circular>
            <div>
              <div class="text-h6 font-weight-bold">
                {{
                  overallReadinessPercent === 100
                    ? $t('document.ready_for_app')
                    : $t('document.in_progress')
                }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{
                  $t('document.items_collected', {
                    collected: residenceStats.collectedItems,
                    total: residenceStats.totalItems,
                  })
                }}
              </div>
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="8">
          <v-row density="compact">
            <!-- Life in UK Quick Summary -->
            <v-col cols="6" lg="3">
              <v-card
                variant="tonal"
                :color="getStatusColor(lifeInUk.status)"
                class="pa-3 rounded-lg"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">{{ $t('document.life_in_uk') }}</span>
                  <v-icon icon="mdi-book-education-outline" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ getStatusText(lifeInUk.status) }}
                </div>
              </v-card>
            </v-col>

            <!-- English B1 Quick Summary -->
            <v-col cols="6" lg="3">
              <v-card
                variant="tonal"
                :color="getStatusColor(englishTest.status)"
                class="pa-3 rounded-lg"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">English B1</span>
                  <v-icon icon="mdi-translate" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{
                    englishTest.type === 'exempt'
                      ? $t('document.type_exempt')
                      : getStatusText(englishTest.status)
                  }}
                </div>
              </v-card>
            </v-col>

            <!-- Residence Proof Quick Summary -->
            <v-col cols="6" lg="3">
              <v-card variant="tonal" color="primary" class="pa-3 rounded-lg">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">{{ $t('document.proof_5yr') }}</span>
                  <v-icon icon="mdi-folder-check-outline" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ $t('document.percent_done', { percent: residenceStats.overallPercent }) }}
                </div>
              </v-card>
            </v-col>

            <!-- Address History Quick Summary -->
            <v-col cols="6" lg="3">
              <v-card
                variant="tonal"
                :color="addressHistory.length > 0 ? 'success' : 'grey'"
                class="pa-3 rounded-lg"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">{{
                    $t('document.uk_addresses')
                  }}</span>
                  <v-icon icon="mdi-home-city-outline" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ $t('document.logged_count', { count: addressHistory.length }) }}
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-card>
  </v-col>
</template>
