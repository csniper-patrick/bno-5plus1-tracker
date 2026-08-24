<script>
import { mapStores } from 'pinia'
import { useAbsentsStore } from '../../stores/absents'
import { normalizeDate, formatCountdown } from '../../utils/date'

export default {
  name: 'AbsenceOverviewHeader',

  emits: ['open-visa-dialog'],

  computed: {
    ...mapStores(useAbsentsStore),
  },

  methods: {
    formatDate(dateInput) {
      if (!dateInput) return '-'
      return normalizeDate(dateInput) || String(dateInput)
    },

    formatDateWithCountdown(dateInput) {
      const baseDateStr = this.formatDate(dateInput)
      if (!dateInput || baseDateStr === '-') return baseDateStr

      const locale = this.$i18n && this.$i18n.locale === 'zh-HK' ? 'zh-HK' : 'en-GB'
      const countdown = formatCountdown(dateInput, locale)
      return countdown ? `${baseDateStr} (${countdown})` : baseDateStr
    },
  },
}
</script>

<template>
  <!-- Left Column: Absence Tracker Title Card -->
  <v-col cols="12" md="5">
    <v-card
      elevation="2"
      class="pa-3 rounded-lg bg-surface h-100 d-flex flex-column justify-space-between"
    >
      <div>
        <v-card-title class="px-0 pt-0 d-flex align-center flex-wrap ga-2">
          <div class="d-flex align-center">
            <v-icon icon="mdi-passport" color="primary" class="mr-2"></v-icon>
            <span class="text-h5 font-weight-bold">{{ $t('absence.title') }}</span>
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
          {{ $t('absence.subtitle') }}
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
      </div>

      <v-alert
        type="warning"
        variant="tonal"
        icon="mdi-alert-circle-outline"
        class="mt-3 text-caption"
        density="compact"
      >
        {{ $t('app.disclaimer_text') }}
      </v-alert>
    </v-card>
  </v-col>

  <!-- Right Column: BNO Visa Overview & Key Dates -->
  <v-col cols="12" md="7">
    <!-- Prompt Alert if Visa Date is Missing -->
    <v-alert
      v-if="!absentsStore.isVisaDateSet"
      type="warning"
      variant="tonal"
      prominent
      icon="mdi-calendar-alert"
      class="rounded-lg shadow-sm h-100 d-flex flex-column justify-center pa-4"
    >
      <div class="d-flex align-center justify-space-between flex-wrap ga-4 pa-2">
        <div>
          <h3 class="text-h6 font-weight-bold">{{ $t('absence.key_dates_required') }}</h3>
          <p class="text-body-2 mb-0">
            {{ $t('absence.key_dates_desc') }}
          </p>
        </div>
        <v-btn
          color="warning"
          variant="flat"
          size="small"
          prepend-icon="mdi-calendar-plus"
          @click="$emit('open-visa-dialog')"
        >
          {{ $t('absence.set_key_dates') }}
        </v-btn>
      </div>
    </v-alert>

    <!-- Consolidated BNO Visa Overview Card if Set -->
    <v-card
      v-else
      elevation="2"
      class="pa-3 rounded-lg bg-surface h-100 d-flex flex-column justify-space-between"
    >
      <div>
        <v-card-title class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-passport-biometric" color="primary"></v-icon>
            <span class="text-h5 font-weight-bold">{{ $t('absence.visa_overview') }}</span>
          </div>

          <v-chip
            :color="
              absentsStore.isVisaExpired && !absentsStore.ilrApprovedDate
                ? 'warning'
                : absentsStore.isVisaExtensionNeeded
                  ? 'warning'
                  : 'success'
            "
            size="small"
            variant="tonal"
            class="font-weight-bold"
          >
            <v-icon
              :icon="
                (absentsStore.isVisaExpired && !absentsStore.ilrApprovedDate) ||
                absentsStore.isVisaExtensionNeeded
                  ? 'mdi-alert-circle'
                  : 'mdi-check-circle'
              "
              start
            ></v-icon>
            {{
              absentsStore.isVisaExpired && !absentsStore.ilrApprovedDate
                ? $t('absence.visa_expired')
                : absentsStore.isVisaExtensionNeeded
                  ? $t('absence.visa_extension_required')
                  : $t('absence.visa_cover_intact')
            }}
          </v-chip>
        </v-card-title>

        <v-card-text class="px-0 pb-0">
          <!-- Key Dates Grid inside BNO Visa Overview -->
          <v-row density="compact">
            <!-- Visa Start Date -->
            <v-col cols="12" sm="6">
              <v-card variant="tonal" color="primary" class="pa-3 rounded-lg h-100">
                <div class="d-flex align-center ga-2 mb-1">
                  <v-icon icon="mdi-calendar-check" size="small" color="primary"></v-icon>
                  <span class="text-caption text-medium-emphasis">{{
                    $t('absence.visa_start')
                  }}</span>
                </div>
                <div class="text-subtitle-1 font-weight-bold text-primary">
                  {{ formatDate(absentsStore.visaStartDate) }}
                </div>
              </v-card>
            </v-col>

            <!-- Visa Expiry Date -->
            <v-col cols="12" sm="6">
              <v-card
                variant="tonal"
                :color="
                  (absentsStore.isVisaExpired && !absentsStore.ilrApprovedDate) ||
                  absentsStore.isVisaExtensionNeeded
                    ? 'warning'
                    : 'info'
                "
                class="pa-3 rounded-lg h-100"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <div class="d-flex align-center ga-2">
                    <v-icon
                      icon="mdi-calendar-clock"
                      size="small"
                      :color="
                        (absentsStore.isVisaExpired && !absentsStore.ilrApprovedDate) ||
                        absentsStore.isVisaExtensionNeeded
                          ? 'warning'
                          : 'info'
                      "
                    ></v-icon>
                    <span class="text-caption text-medium-emphasis">{{
                      $t('absence.visa_expiry')
                    }}</span>
                  </div>
                  <v-chip
                    size="x-small"
                    :color="absentsStore.isVisaExpiryDateSet ? 'purple' : 'info'"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{
                      absentsStore.isVisaExpiryDateSet
                        ? $t('absence.custom_expiry')
                        : $t('absence.default_5yr')
                    }}
                  </v-chip>
                </div>
                <div class="text-subtitle-1 font-weight-bold">
                  {{ formatDateWithCountdown(absentsStore.effectiveVisaExpiryDate) }}
                </div>
              </v-card>
            </v-col>

            <!-- UK Arrival Date -->
            <v-col cols="12" sm="6">
              <v-card variant="tonal" color="success" class="pa-3 rounded-lg h-100">
                <div class="d-flex align-center ga-2 mb-1">
                  <v-icon icon="mdi-airplane-landing" size="small" color="success"></v-icon>
                  <span class="text-caption text-medium-emphasis">{{
                    $t('absence.uk_arrival')
                  }}</span>
                </div>
                <div class="text-subtitle-1 font-weight-bold text-success">
                  {{
                    absentsStore.ukArrivalDate
                      ? formatDate(absentsStore.ukArrivalDate)
                      : $t('absence.not_set')
                  }}
                </div>
              </v-card>
            </v-col>

            <!-- ILR Approved Date -->
            <v-col cols="12" sm="6">
              <v-card variant="tonal" color="purple" class="pa-3 rounded-lg h-100">
                <div class="d-flex align-center ga-2 mb-1">
                  <v-icon icon="mdi-certificate-outline" size="small" color="purple"></v-icon>
                  <span class="text-caption text-medium-emphasis">{{
                    $t('absence.ilr_approved')
                  }}</span>
                </div>
                <div class="text-subtitle-1 font-weight-bold text-purple">
                  {{
                    absentsStore.ilrApprovedDate
                      ? formatDate(absentsStore.ilrApprovedDate)
                      : $t('absence.not_set')
                  }}
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Warning/Success Status Alert -->
          <v-alert
            v-if="absentsStore.isVisaExpired && !absentsStore.ilrApprovedDate"
            type="warning"
            variant="tonal"
            icon="mdi-alert-outline"
            class="mt-3 text-caption"
            density="compact"
          >
            <div class="font-weight-bold text-subtitle-2 mb-1">
              {{ $t('absence.visa_expired_title') }}
            </div>
            <div>
              <i18n-t keypath="absence.visa_expired_body" scope="global">
                <template #expiry>
                  <strong>{{
                    formatDateWithCountdown(absentsStore.effectiveVisaExpiryDate)
                  }}</strong>
                </template>
              </i18n-t>
            </div>
          </v-alert>
          <v-alert
            v-else-if="absentsStore.isVisaExtensionNeeded"
            type="warning"
            variant="tonal"
            icon="mdi-alert-outline"
            class="mt-3 text-caption"
            density="compact"
          >
            <div class="font-weight-bold text-subtitle-2 mb-1">
              {{ $t('absence.visa_extension_needed_title') }}
            </div>
            <div>
              <i18n-t keypath="absence.visa_extension_needed_body" scope="global">
                <template #expiry>
                  <strong>{{
                    formatDateWithCountdown(absentsStore.effectiveVisaExpiryDate)
                  }}</strong>
                </template>
                <template #target>
                  <strong>{{ formatDate(absentsStore.settlementTargetDate) }}</strong>
                </template>
              </i18n-t>
            </div>
          </v-alert>
          <v-alert
            v-else
            type="success"
            variant="tonal"
            icon="mdi-shield-check"
            class="mt-3 text-caption"
            density="compact"
          >
            <i18n-t keypath="absence.visa_cover_verified_body" scope="global">
              <template #expiry>
                <strong>{{ formatDateWithCountdown(absentsStore.effectiveVisaExpiryDate) }}</strong>
              </template>
              <template #target>
                {{ formatDate(absentsStore.settlementTargetDate) }}
              </template>
            </i18n-t>
          </v-alert>
        </v-card-text>
      </div>

      <!-- Edit Key Dates Button -->
      <div class="d-flex justify-end mt-3">
        <v-btn
          color="primary"
          size="small"
          prepend-icon="mdi-pencil"
          @click="$emit('open-visa-dialog')"
        >
          {{ $t('absence.edit_key_dates') }}
        </v-btn>
      </div>
    </v-card>
  </v-col>
</template>
