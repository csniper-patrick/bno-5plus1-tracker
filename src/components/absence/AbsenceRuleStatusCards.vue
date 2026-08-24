<script>
import { mapStores } from 'pinia'
import { useAbsentsStore } from '../../stores/absents'
import { normalizeDate, formatCountdown } from '../../utils/date'

export default {
  name: 'AbsenceRuleStatusCards',

  computed: {
    ...mapStores(useAbsentsStore),

    earliestIlrApplicationDate() {
      return this.formatDateWithCountdown(this.absentsStore.earliestIlrApplicationDate)
    },
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
  <template v-if="absentsStore.isVisaDateSet">
    <!-- ILR / Settlement Card -->
    <v-col cols="12" md="6">
      <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
        <v-card-title class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-shield-check-outline" color="primary"></v-icon>
            <span class="text-h5 font-weight-bold">{{ $t('absence.ilr_title') }}</span>
          </div>

          <v-chip
            :color="absentsStore.ruleStatusColor"
            size="small"
            variant="tonal"
            class="font-weight-bold"
          >
            <v-icon
              :icon="
                absentsStore.ilrQualifyingPeriod.is10YearExceeded
                  ? 'mdi-alert-circle'
                  : absentsStore.isIlrWindowShifted
                    ? 'mdi-clock-alert-outline'
                    : 'mdi-check-circle'
              "
              start
            ></v-icon>
            {{
              absentsStore.ilrQualifyingPeriod.is10YearExceeded
                ? $t('absence.ilr_limit_exceeded')
                : absentsStore.isIlrWindowShifted
                  ? $t('absence.ilr_window_delayed')
                  : $t('absence.within_ilr_limit')
            }}
          </v-chip>
        </v-card-title>

        <v-card-text class="px-0 pb-0">
          <p class="text-caption text-medium-emphasis mb-4">
            5 Yrs:
            {{
              formatDate(
                absentsStore.ilrQualifyingPeriod.windowStartDate || absentsStore.visaStartDate,
              )
            }}
            –
            {{ formatDate(absentsStore.settlementTargetDate) }}
          </p>

          <v-row density="compact">
            <!-- 180-Day Rolling Rule -->
            <v-col cols="12" sm="6">
              <v-card
                variant="tonal"
                :color="absentsStore.ruleStatusColor"
                class="pa-3 rounded-lg h-100"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">{{
                    $t('absence.rolling_180_rule')
                  }}</span>
                  <v-chip
                    :color="absentsStore.ruleStatusColor"
                    size="x-small"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ absentsStore.max12MonthAbsence }} / 180 {{ $t('absence.full_days') }}
                  </v-chip>
                </div>
                <div class="text-caption opacity-90 mb-1">
                  {{ $t('absence.rolling_180_desc') }}
                </div>
                <div
                  v-if="absentsStore.max12MonthAbsenceInfo.peakStartDate"
                  class="text-caption font-weight-bold"
                >
                  {{
                    $t('absence.peak_label', {
                      start: formatDate(absentsStore.max12MonthAbsenceInfo.peakStartDate),
                      end: formatDate(absentsStore.max12MonthAbsenceInfo.peakEndDate),
                    })
                  }}
                </div>
              </v-card>
            </v-col>

            <!-- 5-Year Total Absences -->
            <v-col cols="12" sm="6">
              <v-card variant="tonal" color="info" class="pa-3 rounded-lg h-100">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">{{
                    $t('absence.total_5yr_absences')
                  }}</span>
                  <v-chip color="info" size="x-small" variant="flat" class="font-weight-bold">
                    {{ absentsStore.ilr5YearTotalAbsence }} {{ $t('absence.full_days') }}
                  </v-chip>
                </div>
                <div class="text-caption opacity-90">
                  {{ $t('absence.total_5yr_desc') }}
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Earliest ILR Application Banner -->
          <v-alert
            v-if="absentsStore.isIlrWindowShifted"
            type="warning"
            variant="tonal"
            icon="mdi-clock-alert-outline"
            class="mt-3 text-caption"
            density="compact"
          >
            <div class="d-flex align-center justify-space-between flex-wrap ga-2">
              <span>
                <strong>{{ $t('absence.earliest_delayed_app_date') }}</strong>
              </span>
              <strong class="text-subtitle-2 font-weight-bold">
                {{ earliestIlrApplicationDate }}
              </strong>
            </div>
            <div class="mt-1 opacity-90 text-caption">
              <i18n-t keypath="absence.qualifying_period_delayed_notice" scope="global">
                <template #baseline>
                  <strong>{{
                    formatDate(absentsStore.ilrQualifyingPeriod.baselineTargetDate)
                  }}</strong>
                </template>
                <template #windowStart>
                  {{ formatDate(absentsStore.ilrQualifyingPeriod.windowStartDate) }}
                </template>
                <template #settlementTarget>
                  {{ formatDate(absentsStore.settlementTargetDate) }}
                </template>
              </i18n-t>
            </div>
          </v-alert>

          <v-alert
            v-else
            type="info"
            variant="tonal"
            icon="mdi-clock-start"
            class="mt-3 text-caption"
            density="compact"
          >
            <div class="d-flex align-center justify-space-between flex-wrap ga-2">
              <span>
                <strong>{{ $t('absence.earliest_application_date') }}</strong>
              </span>
              <strong class="text-subtitle-2 text-primary font-weight-bold">
                {{ earliestIlrApplicationDate }}
              </strong>
            </div>
            <div class="mt-1 opacity-90 text-caption">
              {{ $t('absence.ilr_app_notice') }}
            </div>
          </v-alert>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- British Citizenship Card -->
    <v-col cols="12" md="6">
      <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
        <v-card-title class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2">
          <div class="d-flex align-center ga-2">
            <v-icon
              icon="mdi-flag-checkered"
              :color="absentsStore.naturalizationStatusColor"
            ></v-icon>
            <span class="text-h5 font-weight-bold">{{ $t('absence.citizenship_title') }}</span>
          </div>

          <v-chip
            :color="absentsStore.naturalizationStatusColor"
            size="small"
            variant="tonal"
            class="font-weight-bold"
          >
            <v-icon
              :icon="
                absentsStore.isNaturalization10YearExceeded
                  ? 'mdi-alert-circle'
                  : absentsStore.isNaturalizationWindowShifted
                    ? 'mdi-clock-alert-outline'
                    : 'mdi-check-circle'
              "
              start
            ></v-icon>
            {{
              absentsStore.isNaturalization10YearExceeded
                ? $t('absence.out_of_tracker_range')
                : absentsStore.isNaturalizationWindowShifted
                  ? $t('absence.within_cit_limit_delayed')
                  : $t('absence.within_cit_limit')
            }}
          </v-chip>
        </v-card-title>

        <v-card-text class="px-0 pb-0">
          <p class="text-caption text-medium-emphasis mb-4">
            5 Yrs: {{ formatDate(absentsStore.naturalizationWindowStartDate) }} –
            {{ formatDate(absentsStore.naturalizationTargetDate) }}
            <span v-if="absentsStore.ilrApprovedDate" class="ml-1 font-weight-bold">
              {{ $t('absence.based_on_ilr', { date: formatDate(absentsStore.ilrApprovedDate) }) }}
            </span>
            <span v-else class="ml-1 font-weight-bold">
              {{ $t('absence.based_on_visa', { date: formatDate(absentsStore.visaStartDate) }) }}
            </span>
          </p>

          <v-row density="compact">
            <!-- 5-Year Citizenship Limit (Max 450 Days) -->
            <v-col cols="12" sm="6">
              <v-card
                variant="tonal"
                :color="absentsStore.naturalizationStatusColor"
                class="pa-3 rounded-lg h-100"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">{{
                    $t('absence.cit_5yr_limit')
                  }}</span>
                  <v-chip
                    :color="absentsStore.naturalizationStatusColor"
                    size="x-small"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ absentsStore.naturalization5YearAbsence }} / 450
                    {{ $t('absence.full_days') }}
                  </v-chip>
                </div>
                <div class="text-caption opacity-90 mb-1">
                  {{ $t('absence.cit_5yr_desc') }}
                </div>
              </v-card>
            </v-col>

            <!-- Final 12-Month Limit (Max 90 Days) -->
            <v-col cols="12" sm="6">
              <v-card
                variant="tonal"
                :color="absentsStore.naturalizationStatusColor"
                class="pa-3 rounded-lg h-100"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">{{
                    $t('absence.cit_final_12mo_limit')
                  }}</span>
                  <v-chip
                    :color="absentsStore.naturalizationStatusColor"
                    size="x-small"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ absentsStore.naturalizationFinal12MoAbsence }} / 90
                    {{ $t('absence.full_days') }}
                  </v-chip>
                </div>
                <div class="text-caption opacity-90">
                  {{ $t('absence.cit_final_12mo_desc') }}
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Earliest Naturalisation Application Banners -->
          <v-alert
            v-if="absentsStore.isNaturalization10YearExceeded"
            type="error"
            variant="tonal"
            icon="mdi-alert-circle"
            class="mt-3 text-caption"
            density="compact"
          >
            <div class="d-flex align-center justify-space-between flex-wrap ga-2">
              <span>
                <strong>{{ $t('absence.out_of_tracker_range') }}</strong>
              </span>
            </div>
          </v-alert>

          <v-alert
            v-else-if="absentsStore.isNaturalizationWindowShifted"
            type="warning"
            variant="tonal"
            icon="mdi-clock-alert-outline"
            class="mt-3 text-caption"
            density="compact"
          >
            <div class="d-flex align-center justify-space-between flex-wrap ga-2">
              <span>
                <strong>{{ $t('absence.earliest_delayed_app_date') }}</strong>
              </span>
              <strong class="text-subtitle-2 font-weight-bold">
                {{ formatDateWithCountdown(absentsStore.naturalizationTargetDate) }}
              </strong>
            </div>
          </v-alert>

          <v-alert
            v-else
            type="info"
            variant="tonal"
            icon="mdi-clock-start"
            class="mt-3 text-caption"
            density="compact"
          >
            <div class="d-flex align-center justify-space-between flex-wrap ga-2">
              <span>
                <strong>{{ $t('absence.earliest_application_date') }}</strong>
              </span>
              <strong class="text-subtitle-2 text-primary font-weight-bold">
                {{ formatDateWithCountdown(absentsStore.naturalizationTargetDate) }}
              </strong>
            </div>
            <div class="mt-1 opacity-90 text-caption">
              {{ $t('absence.cit_app_notice') }}
            </div>
          </v-alert>
        </v-card-text>
      </v-card>
    </v-col>
  </template>
</template>
