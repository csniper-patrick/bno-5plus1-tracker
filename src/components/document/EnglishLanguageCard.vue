<script>
export default {
  name: 'EnglishLanguageCard',

  props: {
    englishForm: {
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
        <v-icon icon="mdi-translate" color="primary"></v-icon>
        <span class="text-h5 font-weight-bold">{{ $t('document.english_req') }}</span>
        <v-spacer></v-spacer>
        <v-chip
          :color="getStatusColor(englishForm.status)"
          size="small"
          variant="flat"
          class="font-weight-bold"
        >
          {{
            englishForm.type === 'exempt'
              ? $t('document.type_exempt')
              : getStatusText(englishForm.status)
          }}
        </v-chip>
      </v-card-title>
      <v-card-text class="px-0 pb-0">
        <p class="text-caption text-medium-emphasis mb-4">
          {{ $t('document.english_desc') }}
        </p>

        <v-row density="compact">
          <v-col cols="12" sm="6">
            <v-select
              v-model="englishForm.type"
              :items="[
                { title: $t('document.type_b1_selt'), value: 'b1_selt' },
                { title: $t('document.type_uk_degree'), value: 'uk_degree' },
                { title: $t('document.type_enic'), value: 'enic_statement' },
                { title: $t('document.type_exempt'), value: 'exempt' },
              ]"
              :label="$t('document.qual_type')"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-3"
              @update:model-value="$emit('save')"
            ></v-select>
          </v-col>

          <v-col cols="12" sm="6">
            <v-select
              v-model="englishForm.provider"
              :items="[
                'Trinity College London',
                'IELTS SELT Consortium',
                'LanguageCert',
                'Pearson (PTE Academic UKVI)',
                'PSI Services (UKVI)',
                'Other',
              ]"
              :label="$t('document.provider')"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-3"
              @update:model-value="$emit('save')"
            ></v-select>
          </v-col>
        </v-row>

        <div class="mb-4" v-if="englishForm.type !== 'exempt'">
          <label class="text-caption font-weight-bold d-block mb-1">{{
            $t('document.test_status')
          }}</label>
          <v-btn-toggle
            v-model="englishForm.status"
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
              v-model="englishForm.testDate"
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
              v-model="englishForm.referenceNo"
              :label="$t('document.ref_no')"
              placeholder="e.g. TCL/123456/2026"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-3"
              @change="$emit('save')"
            ></v-text-field>
          </v-col>

          <v-col cols="12">
            <v-textarea
              v-model="englishForm.notes"
              :label="$t('document.notes')"
              placeholder="Add reference details, certificate link, or verification note..."
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
