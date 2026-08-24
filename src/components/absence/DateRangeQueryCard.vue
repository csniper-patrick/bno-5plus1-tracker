<script>
import { mapStores } from 'pinia'
import { useAbsentsStore } from '../../stores/absents'

export default {
  name: 'DateRangeQueryCard',

  props: {
    queryForm: {
      type: Object,
      required: true,
    },
    queriedRangeDays: {
      type: Number,
      default: 0,
    },
    minQueryStartDate: {
      type: String,
      default: '',
    },
    minQueryEndDate: {
      type: String,
      default: '',
    },
    maxSegmentTreeReturnDate: {
      type: String,
      default: '',
    },
    queryStartDateError: {
      type: String,
      default: '',
    },
    queryEndDateError: {
      type: String,
      default: '',
    },
  },

  emits: ['reset-max-range'],

  computed: {
    ...mapStores(useAbsentsStore),
  },
}
</script>

<template>
  <v-card v-if="absentsStore.isVisaDateSet" elevation="2" class="pa-3 rounded-lg bg-surface">
    <v-card-title class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2">
      <div class="d-flex align-center ga-2">
        <v-icon icon="mdi-calendar-range" color="primary"></v-icon>
        <span class="text-h5 font-weight-bold">{{ $t('absence.custom_range_title') }}</span>
        <v-chip color="primary" variant="tonal" size="x-small" prepend-icon="mdi-lightning-bolt">
          {{ $t('absence.instant_query') }}
        </v-chip>
      </div>
    </v-card-title>

    <v-card-text class="px-0 pb-0">
      <p class="text-caption text-medium-emphasis mb-4">
        {{ $t('absence.custom_range_desc') }}
      </p>

      <v-row density="compact">
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="queryForm.startDate"
            :label="$t('absence.query_start')"
            type="date"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-calendar-start-outline"
            :min="minQueryStartDate"
            :max="maxSegmentTreeReturnDate"
            :error-messages="queryStartDateError"
            hide-details="auto"
            class="mb-3"
          ></v-text-field>
        </v-col>

        <v-col cols="12" sm="6">
          <v-text-field
            v-model="queryForm.endDate"
            :label="$t('absence.query_end')"
            type="date"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-calendar-end-outline"
            :min="minQueryEndDate"
            :max="maxSegmentTreeReturnDate"
            :error-messages="queryEndDateError"
            hide-details="auto"
            class="mb-3"
          ></v-text-field>
        </v-col>
      </v-row>

      <div class="d-flex align-center justify-space-between flex-wrap ga-4 mt-3">
        <v-chip
          :color="queryStartDateError || queryEndDateError ? 'error' : 'primary'"
          variant="tonal"
          prepend-icon="mdi-calculator"
          size="small"
          class="font-weight-medium"
        >
          {{ $t('absence.absences') }}:
          <strong class="ml-1 text-primary"
            >{{ queriedRangeDays }} {{ $t('absence.full_days') }}</strong
          >
        </v-chip>

        <v-btn
          color="primary"
          size="small"
          prepend-icon="mdi-restore"
          title="Reset query range to maximum 10-year period"
          @click="$emit('reset-max-range')"
        >
          {{ $t('absence.reset_max_range') }}
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>
