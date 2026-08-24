<script>
export default {
  name: 'LifeInUkCard',

  props: {
    lifeForm: {
      type: Object,
      required: true,
    },
  },

  emits: ['save'],

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
  <v-col cols="12" md="6" lg="4">
    <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
      <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
        <v-icon icon="mdi-book-open-page-variant" color="primary"></v-icon>
        <span class="text-h5 font-weight-bold">{{ $t('document.life_in_uk') }}</span>
        <v-spacer></v-spacer>
        <v-chip
          :color="getStatusColor(lifeForm.status)"
          size="small"
          variant="flat"
          class="font-weight-bold"
        >
          {{ getStatusText(lifeForm.status) }}
        </v-chip>
      </v-card-title>
      <v-card-text class="px-0 pb-0">
        <p class="text-caption text-medium-emphasis mb-4">
          {{ $t('document.life_desc') }}
        </p>

        <div class="mb-4">
          <label class="text-caption font-weight-bold d-block mb-1">{{
            $t('document.test_status')
          }}</label>
          <v-btn-toggle
            v-model="lifeForm.status"
            mandatory
            color="primary"
            density="compact"
            class="w-100"
            @update:model-value="$emit('save')"
          >
            <v-btn value="not_started" class="flex-grow-1" size="small">{{
              $t('document.status_not_started')
            }}</v-btn>
            <v-btn value="scheduled" class="flex-grow-1" size="small">{{
              $t('document.status_scheduled')
            }}</v-btn>
            <v-btn value="passed" class="flex-grow-1" color="success" size="small">{{
              $t('document.status_passed')
            }}</v-btn>
          </v-btn-toggle>
        </div>

        <v-row density="compact">
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="lifeForm.testDate"
              :label="$t('document.test_date')"
              type="date"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-3"
              @change="$emit('save')"
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="lifeForm.urn"
              :label="$t('document.urn')"
              placeholder="e.g. LITUK1234567"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-3"
              @change="$emit('save')"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="lifeForm.testCenter"
              :label="$t('document.test_center')"
              placeholder="e.g. London PSI Test Centre"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-3"
              @change="$emit('save')"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="lifeForm.notes"
              :label="$t('document.notes')"
              placeholder="Add notes, pass certificate location, or booking details..."
              variant="outlined"
              density="compact"
              rows="2"
              hide-details="auto"
              @change="$emit('save')"
            ></v-textarea>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-col>
</template>
