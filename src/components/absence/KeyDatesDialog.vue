<script>
export default {
  name: 'KeyDatesDialog',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    visaDateInput: {
      type: String,
      default: '',
    },
    visaExpiryDateInput: {
      type: String,
      default: '',
    },
    arrivalDateInput: {
      type: String,
      default: '',
    },
    ilrApprovedDateInput: {
      type: String,
      default: '',
    },
  },

  emits: [
    'update:modelValue',
    'update:visaDateInput',
    'update:visaExpiryDateInput',
    'update:arrivalDateInput',
    'update:ilrApprovedDateInput',
    'save',
  ],

  computed: {
    localShow: {
      get() {
        return this.modelValue
      },
      set(val) {
        this.$emit('update:modelValue', val)
      },
    },

    localVisaDate: {
      get() {
        return this.visaDateInput
      },
      set(val) {
        this.$emit('update:visaDateInput', val)
      },
    },

    localVisaExpiryDate: {
      get() {
        return this.visaExpiryDateInput
      },
      set(val) {
        this.$emit('update:visaExpiryDateInput', val)
      },
    },

    localArrivalDate: {
      get() {
        return this.arrivalDateInput
      },
      set(val) {
        this.$emit('update:arrivalDateInput', val)
      },
    },

    localIlrApprovedDate: {
      get() {
        return this.ilrApprovedDateInput
      },
      set(val) {
        this.$emit('update:ilrApprovedDateInput', val)
      },
    },
  },
}
</script>

<template>
  <v-dialog v-model="localShow" max-width="640px">
    <v-card elevation="2" class="rounded-lg pa-3" color="surface">
      <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
        <v-icon icon="mdi-calendar-edit" color="primary" class="mr-2"></v-icon>
        {{ $t('absence.set_key_dates') }}
      </v-card-title>
      <v-card-text class="px-0 py-2">
        <p class="text-caption text-medium-emphasis mb-4">
          {{ $t('absence.key_dates_desc') }}
        </p>
        <v-row density="compact">
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="localVisaDate"
              :label="$t('absence.visa_start')"
              type="date"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-calendar-start"
              hide-details="auto"
              required
              class="mb-1"
            ></v-text-field>
          </v-col>

          <v-col cols="12" sm="6">
            <v-text-field
              v-model="localVisaExpiryDate"
              :label="$t('absence.visa_expiry')"
              type="date"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-calendar-end"
              hide-details="auto"
              class="mb-1"
            ></v-text-field>
          </v-col>

          <v-col cols="12" sm="6">
            <v-text-field
              v-model="localArrivalDate"
              :label="$t('absence.uk_arrival')"
              type="date"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-airplane-landing"
              hide-details="auto"
              class="mb-1"
            ></v-text-field>
          </v-col>

          <v-col cols="12" sm="6">
            <v-text-field
              v-model="localIlrApprovedDate"
              :label="$t('absence.ilr_approved')"
              type="date"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-certificate-outline"
              hide-details="auto"
              class="mb-1"
            ></v-text-field>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="px-0 pb-0 justify-end ga-2">
        <v-btn variant="text" @click="localShow = false">{{ $t('absence.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!localVisaDate" @click="$emit('save')">
          {{ $t('absence.save_dates') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
