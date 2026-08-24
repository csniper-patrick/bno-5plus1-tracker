<script>
import { formatNin } from '../../utils/format'

export default {
  name: 'NationalInsuranceCard',

  props: {
    ninForm: {
      type: Object,
      required: true,
    },
  },

  emits: ['save', 'show-snackbar'],

  methods: {
    handleNinInput() {
      const formatted = formatNin(this.ninForm.number)
      this.ninForm.number = formatted
      if (formatted.trim().length > 0) {
        if (this.ninForm.status !== 'received') {
          this.ninForm.status = 'received'
        }
      } else if (this.ninForm.status === 'received') {
        this.ninForm.status = 'not_applied'
      }
      this.saveNationalInsurance()
    },

    saveNationalInsurance() {
      const formatted = formatNin(this.ninForm.number)
      this.ninForm.number = formatted
      if (
        formatted.trim().length > 0 &&
        (!this.ninForm.status ||
          this.ninForm.status === 'not_applied' ||
          this.ninForm.status === 'applied')
      ) {
        this.ninForm.status = 'received'
      }
      this.$emit('save')
    },

    getNinStatusText(status) {
      switch (status) {
        case 'received':
          return this.$t('document.status_received')
        case 'applied':
          return this.$t('document.status_applied')
        case 'not_applied':
        default:
          return this.$t('document.status_not_applied')
      }
    },

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
  },
}
</script>

<template>
  <v-col cols="12" md="4" lg="4">
    <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
      <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
        <v-icon icon="mdi-card-account-details-outline" color="primary"></v-icon>
        <span class="text-h5 font-weight-bold">{{ $t('document.national_insurance') }}</span>
        <v-spacer></v-spacer>
        <v-chip
          :color="
            getStatusColor(
              ninForm.status === 'received'
                ? 'passed'
                : ninForm.status === 'applied'
                  ? 'scheduled'
                  : 'not_started',
            )
          "
          size="small"
          variant="flat"
          class="font-weight-bold"
        >
          {{ getNinStatusText(ninForm.status) }}
        </v-chip>
      </v-card-title>
      <v-card-text class="px-0 pb-0">
        <p class="text-caption text-medium-emphasis mb-4">
          {{ $t('document.nin_desc') }}
        </p>

        <div class="mb-4">
          <label class="text-caption font-weight-bold d-block mb-1">{{
            $t('document.nin_status')
          }}</label>
          <v-btn-toggle
            v-model="ninForm.status"
            mandatory
            color="primary"
            density="compact"
            class="w-100"
            @update:model-value="saveNationalInsurance"
          >
            <v-btn value="not_applied" class="flex-grow-1" size="small">{{
              $t('document.status_not_applied')
            }}</v-btn>
            <v-btn value="applied" class="flex-grow-1" size="small">{{
              $t('document.status_applied')
            }}</v-btn>
            <v-btn value="received" class="flex-grow-1" color="success" size="small">{{
              $t('document.status_received')
            }}</v-btn>
          </v-btn-toggle>
        </div>

        <v-row density="compact">
          <v-col cols="12">
            <v-text-field
              v-model="ninForm.number"
              :label="$t('document.nin_number')"
              :placeholder="$t('document.nin_placeholder')"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-3 text-uppercase"
              @input="handleNinInput"
              @change="saveNationalInsurance"
            ></v-text-field>
          </v-col>

          <v-col cols="12">
            <v-textarea
              v-model="ninForm.notes"
              :label="$t('document.notes')"
              placeholder="Add DWP application reference, HMRC account details..."
              variant="outlined"
              density="compact"
              rows="2"
              hide-details="auto"
              @change="saveNationalInsurance"
            ></v-textarea>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-col>
</template>
