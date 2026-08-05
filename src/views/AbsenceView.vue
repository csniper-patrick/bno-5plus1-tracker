<script>
import { mapStores } from 'pinia'
import { useAbsentsStore, calculateDays, getMaxSegmentTreeReturnDate } from '../stores/absents'
import { normalizeDate } from '../utils/date'

/**
 * AbsenceView Component
 *
 * Primary dashboard view for managing BNO 5+1 visa absence records.
 * Provides interactive forms for adding/editing trip entries, key dates setup (Visa Start & UK Arrival),
 * real-time limit status indicators (180-day rolling rule & Naturalisation checks),
 * custom date range query tools, and YAML data export/import capabilities.
 */
export default {
  name: 'AbsenceView',

  data() {
    return {
      /** Default empty form structure for resetting inputs */
      defaultForm: {
        stops: [
          { date: '', dest: '' },
          { date: '', dest: '' },
        ],
      },

      /** Active record form model for add/edit operations */
      form: {
        stops: [
          { date: '', dest: '' },
          { date: '', dest: '' },
        ],
      },

      /** ID of record currently being edited; null when adding a new record */
      editingId: null,

      /** Global snackbar notification state */
      snackbar: {
        show: false,
        text: '',
        color: 'success',
      },

      /** Single record deletion confirmation dialog state */
      deleteDialog: {
        show: false,
        id: null,
        dest: '',
      },

      /** Clear all records confirmation dialog toggle */
      clearAllDialog: false,

      /** Key dates (Visa Start Date / UK Arrival Date) dialog toggle */
      visaDateDialog: false,

      /** Temporary input state for Visa Start Date in modal */
      visaDateInput: '',

      /** Temporary input state for Visa Expiry Date in modal */
      visaExpiryDateInput: '',

      /** Temporary input state for UK Arrival Date in modal */
      arrivalDateInput: '',

      /** Temporary input state for ILR Approved Date in modal */
      ilrApprovedDateInput: '',

      /** Model for custom date range query tool */
      queryForm: {
        startDate: '',
        endDate: '',
      },

      /** View mode toggle for records list timeline: 'full' | 'compact' */
      timelineViewMode: 'compact',
    }
  },

  computed: {
    // Generates this.absentsStore mapping to Pinia store
    ...mapStores(useAbsentsStore),

    /**
     * Maximum return date string (YYYY-MM-DD) supported by the Segment Tree (10 years from visa start).
     * @returns {string}
     */
    maxSegmentTreeReturnDate() {
      if (!this.absentsStore.visaStartDate) return ''
      return getMaxSegmentTreeReturnDate(this.absentsStore.visaStartDate) || ''
    },

    /**
     * Departure date (first node date).
     * @returns {string}
     */
    startDate() {
      return this.form.stops && this.form.stops.length > 0 ? this.form.stops[0].date || '' : ''
    },

    /**
     * Return date (last node date).
     * @returns {string}
     */
    endDate() {
      const len = this.form.stops ? this.form.stops.length : 0
      return len > 0 ? this.form.stops[len - 1].date || '' : ''
    },

    /**
     * Validates form departure date against Visa Start Date, UK Arrival Date, and return date.
     * @returns {string} Validation error message or empty string if valid.
     */
    startDateError() {
      if (!this.startDate) return ''

      const vStart = this.absentsStore.visaStartDate
      if (vStart && this.startDate < vStart) {
        return this.$t('absence.start_date_err_vstart', { vStart })
      }

      const uArrival = this.absentsStore.ukArrivalDate
      if (uArrival && this.startDate < uArrival) {
        return this.$t('absence.start_date_err_uarrival', { uArrival })
      }

      if (this.endDate && this.endDate < this.startDate) {
        return this.$t('absence.start_date_err_return')
      }

      return ''
    },

    /**
     * Validates form return date against departure date and 10-year Segment Tree limit.
     * @returns {string} Validation error message or empty string if valid.
     */
    endDateError() {
      if (!this.endDate) return ''

      if (this.startDate && this.endDate < this.startDate) {
        return this.$t('absence.end_date_err_departure')
      }

      const maxReturn = this.maxSegmentTreeReturnDate
      if (maxReturn && this.endDate > maxReturn) {
        return this.$t('absence.end_date_err_max', { maxReturn })
      }

      return ''
    },

    /**
     * Validates chronological ordering of stop dates.
     * @returns {string}
     */
    nodeDateError() {
      if (!this.form.stops) return ''
      for (let i = 0; i < this.form.stops.length - 1; i++) {
        const curr = this.form.stops[i].date
        const next = this.form.stops[i + 1].date
        if (curr && next && next <= curr) {
          return 'Dates must be in chronological order.'
        }
      }
      return ''
    },

    /**
     * Aggregates date range errors from start, end, and intermediate stop date fields.
     * @returns {string}
     */
    dateRangeError() {
      return this.startDateError || this.endDateError || this.nodeDateError
    },

    /**
     * Checks if departure date is non-empty and satisfies Visa Start Date & UK Arrival Date limits.
     * Used to dynamically set minimum date boundary on return date picker.
     * @returns {boolean}
     */
    isStartDateValid() {
      if (!this.startDate) return false
      const vStart = this.absentsStore.visaStartDate
      if (vStart && this.startDate < vStart) return false
      const uArrival = this.absentsStore.ukArrivalDate
      if (uArrival && this.startDate < uArrival) return false
      return true
    },

    /**
     * Minimum date boundary (YYYY-MM-DD) passed to the Return Date picker.
     * Equals startDate when valid, or undefined otherwise.
     * @returns {string|undefined}
     */
    minReturnDate() {
      return this.isStartDateValid ? this.startDate : undefined
    },

    /**
     * Calculates the full days absent preview for current form values.
     * @returns {number}
     */
    calculatedDaysForForm() {
      if (!this.startDate || !this.endDate || this.dateRangeError) return 0
      return calculateDays(this.startDate, this.endDate)
    },

    /**
     * Returns summary string of leg destinations.
     * @returns {string}
     */
    formSummaryDest() {
      if (!this.form.stops || this.form.stops.length === 0) return ''
      return this.form.stops
        .map((s) => (s.dest ? s.dest.trim() : ''))
        .filter(Boolean)
        .join(' ➔ ')
    },

    /**
     * Returns true if all node dates are present and free of validation errors.
     * @returns {boolean}
     */
    isFormValid() {
      if (this.dateRangeError) return false
      if (!this.form.stops || this.form.stops.length < 2) return false
      for (const s of this.form.stops) {
        if (!s.date) return false
      }
      return true
    },

    /**
     * Theme color corresponding to 180-day rolling rule status.
     * @returns {string}
     */
    totalDaysColor() {
      return this.absentsStore.ruleStatusColor
    },

    /**
     * Formatted Target ILR Settlement Date string for display.
     * @returns {string}
     */
    settlementTargetDate() {
      return this.formatDate(this.absentsStore.settlementTargetDate)
    },

    /**
     * Formatted Earliest ILR Application Date string (28 days prior to 5 years).
     * @returns {string}
     */
    earliestIlrApplicationDate() {
      return this.formatDate(this.absentsStore.earliestIlrApplicationDate)
    },

    /**
     * Determines whether export button should be enabled based on stored data presence.
     * @returns {boolean}
     */
    hasExportData() {
      return (
        this.absentsStore.absences.length > 0 ||
        this.absentsStore.isVisaDateSet ||
        this.absentsStore.isArrivalDateSet
      )
    },

    /**
     * Validates custom query start date against Visa Start Date and query end date.
     * @returns {string} Validation error message or empty string if valid.
     */
    queryStartDateError() {
      if (!this.queryForm.startDate) return ''

      const vStart = this.absentsStore.visaStartDate
      if (vStart && this.queryForm.startDate < vStart) {
        return this.$t('absence.start_date_err_vstart', { vStart })
      }

      if (this.queryForm.endDate && this.queryForm.endDate < this.queryForm.startDate) {
        return this.$t('absence.start_date_err_return')
      }

      const maxReturn = this.maxSegmentTreeReturnDate
      if (maxReturn && this.queryForm.startDate > maxReturn) {
        return this.$t('absence.end_date_err_max', { maxReturn })
      }

      return ''
    },

    /**
     * Validates custom query end date against start date, Visa Start Date, and 10-year limit.
     * @returns {string} Validation error message or empty string if valid.
     */
    queryEndDateError() {
      if (!this.queryForm.endDate) return ''

      if (this.queryForm.startDate && this.queryForm.endDate < this.queryForm.startDate) {
        return this.$t('absence.end_date_err_departure')
      }

      const vStart = this.absentsStore.visaStartDate
      if (vStart && this.queryForm.endDate < vStart) {
        return this.$t('absence.start_date_err_vstart', { vStart })
      }

      const maxReturn = this.maxSegmentTreeReturnDate
      if (maxReturn && this.queryForm.endDate > maxReturn) {
        return this.$t('absence.end_date_err_max', { maxReturn })
      }

      return ''
    },

    /**
     * Checks if query start date is valid to calculate minimum return date for query end date picker.
     * @returns {boolean}
     */
    isQueryStartDateValid() {
      if (!this.queryForm.startDate) return false
      const vStart = this.absentsStore.visaStartDate
      if (vStart && this.queryForm.startDate < vStart) return false
      return true
    },

    /**
     * Minimum date boundary (YYYY-MM-DD) passed to the Query End Date picker.
     * @returns {string|undefined}
     */
    minQueryEndDate() {
      return this.isQueryStartDateValid
        ? this.queryForm.startDate
        : this.absentsStore.visaStartDate || undefined
    },

    /**
     * Minimum date boundary for Query Start Date picker (Visa Start Date).
     * @returns {string|undefined}
     */
    minQueryStartDate() {
      return this.absentsStore.visaStartDate || undefined
    },

    /**
     * Total absent days calculated for custom query date range form.
     * @returns {number}
     */
    queriedRangeDays() {
      if (
        !this.queryForm.startDate ||
        !this.queryForm.endDate ||
        this.queryStartDateError ||
        this.queryEndDateError
      ) {
        return 0
      }
      return this.absentsStore.queryAbsentDaysInRange(
        this.queryForm.startDate,
        this.queryForm.endDate,
      )
    },
  },

  mounted() {
    this.resetQueryDateRangeToMax()
  },

  watch: {
    'absentsStore.visaStartDate': {
      handler(newVal) {
        if (newVal) {
          this.resetQueryDateRangeToMax()
        } else {
          this.queryForm.startDate = ''
          this.queryForm.endDate = ''
        }
      },
      immediate: true,
    },
  },

  methods: {
    calculateDays,

    /**
     * Resets custom query date range inputs to the maximum 10-year range (Visa Start Date to 10-Yr Limit).
     */
    resetQueryDateRangeToMax() {
      if (this.absentsStore.visaStartDate) {
        this.queryForm.startDate = this.absentsStore.visaStartDate
        this.queryForm.endDate = this.maxSegmentTreeReturnDate
      }
    },

    /**
     * Opens the Key Visa & Arrival Dates edit dialog and initializes form fields.
     */
    openVisaDateDialog() {
      this.visaDateInput = this.absentsStore.visaStartDate || ''
      this.visaExpiryDateInput = this.absentsStore.visaExpiryDate || ''
      this.arrivalDateInput = this.absentsStore.ukArrivalDate || ''
      this.ilrApprovedDateInput = this.absentsStore.ilrApprovedDate || ''
      this.visaDateDialog = true
    },

    /**
     * Saves updated Visa Start Date, UK Arrival Date, and ILR Approved Date to Pinia store.
     */
    saveVisaAndArrivalDates() {
      if (!this.visaDateInput) return
      this.absentsStore.setVisaAndArrivalDates({
        visaStartDate: this.visaDateInput,
        visaExpiryDate: this.visaExpiryDateInput,
        ukArrivalDate: this.arrivalDateInput,
        ilrApprovedDate: this.ilrApprovedDateInput,
      })
      this.visaDateDialog = false
      this.showSnackbar(this.$t('absence.key_dates_updated'), 'success')
    },

    /**
     * Adds an intermediate stop node to the form before the final return date node.
     */
    addStopNode() {
      const len = this.form.stops.length
      this.form.stops.splice(len - 1, 0, { date: '', dest: '' })
    },

    /**
     * Removes an intermediate stop node at the given index.
     * @param {number} index
     */
    removeStopNode(index) {
      if (this.form.stops.length > 2 && index > 0 && index < this.form.stops.length - 1) {
        this.form.stops.splice(index, 1)
      }
    },

    /**
     * Retrieves stops array for an absence record item, falling back to 2-node structure for legacy records.
     * @param {Object} item - Absence record item.
     * @returns {Array} List of stops [{ date, dest }].
     */
    getRecordStops(item) {
      if (Array.isArray(item.stops) && item.stops.length >= 2) {
        return item.stops
      }
      return [
        { date: item.startDate, dest: item.dest || '' },
        { date: item.endDate, dest: '' },
      ]
    },

    /**
     * Focuses the destination input field in the absence record form.
     */
    focusDestInput() {
      this.$nextTick(() => {
        const inputRef = this.$refs.destInput
        if (!inputRef) return
        if (typeof inputRef.focus === 'function') {
          inputRef.focus()
        } else if (inputRef.$el) {
          const el = inputRef.$el.querySelector('input')
          if (el) el.focus()
        }
      })
    },

    /**
     * Handles submission of the absence record form (add or update operation).
     */
    handleSave() {
      if (!this.isFormValid) return

      const startDate = this.startDate
      const endDate = this.endDate
      const dest = this.formSummaryDest || 'Unspecified destination'
      const stops = this.form.stops.map((s) => ({ date: s.date, dest: s.dest || '' }))

      try {
        if (this.editingId) {
          this.absentsStore.updateAbsence(this.editingId, {
            startDate,
            endDate,
            dest,
            stops,
          })
          this.showSnackbar(this.$t('absence.updated_success'), 'success')
          this.resetForm()
        } else {
          this.absentsStore.addAbsence({
            startDate,
            endDate,
            dest,
            stops,
          })
          this.showSnackbar(this.$t('absence.added_success'), 'success')
          this.resetForm()
        }
      } catch (err) {
        this.showSnackbar(err.message || 'Failed to save absence record.', 'error')
      }
    },

    /**
     * Populates form with an existing absence record's values to initiate edit mode.
     * @param {Object} item - Absence record object.
     */
    startEdit(item) {
      if (item.isAutoArrival || item.id === 'auto_uk_arrival_record') return
      this.editingId = item.id
      if (Array.isArray(item.stops) && item.stops.length >= 2) {
        this.form = {
          stops: item.stops.map((s) => ({ date: s.date || '', dest: s.dest || '' })),
        }
      } else {
        this.form = {
          stops: [
            { date: item.startDate || '', dest: item.dest || '' },
            { date: item.endDate || '', dest: '' },
          ],
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },

    /**
     * Cancels edit mode and resets record form.
     */
    cancelEdit() {
      this.resetForm()
    },

    /**
     * Resets form model to default empty state and clears edit ID.
     */
    resetForm() {
      this.editingId = null
      this.form = {
        stops: [
          { date: '', dest: '' },
          { date: '', dest: '' },
        ],
      }
    },

    /**
     * Displays deletion confirmation modal for a specific record.
     * @param {Object} item - Absence record object.
     */
    confirmDelete(item) {
      if (item.isAutoArrival || item.id === 'auto_uk_arrival_record') return
      this.deleteDialog = {
        show: true,
        id: item.id,
        dest: item.dest || 'Unspecified destination',
      }
    },

    /**
     * Confirms and executes record removal in store.
     */
    executeDelete() {
      if (this.deleteDialog.id) {
        this.absentsStore.removeAbsence(this.deleteDialog.id)
        this.showSnackbar(this.$t('absence.deleted_success'), 'info')
      }
      this.deleteDialog.show = false
      if (this.editingId === this.deleteDialog.id) {
        this.resetForm()
      }
    },

    /**
     * Confirms and executes clear-all action for all absence records and key dates.
     */
    executeClearAll() {
      this.absentsStore.clearAbsences()
      this.clearAllDialog = false
      this.resetForm()
      this.showSnackbar('All absence records and key dates cleared', 'info')
    },

    /**
     * Generates and downloads a YAML file containing all user absence records and key dates.
     */
    exportYamlFile() {
      try {
        const yamlContent = this.absentsStore.exportYAML()
        const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'bno-absences-data.yaml')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        this.showSnackbar('YAML data exported successfully!', 'success')
      } catch (err) {
        this.showSnackbar('Failed to export YAML data: ' + err.message, 'error')
      }
    },

    /**
     * Programmatically triggers hidden YAML file input click event.
     */
    triggerYamlImport() {
      if (this.$refs.yamlFileInput) {
        this.$refs.yamlFileInput.value = ''
        this.$refs.yamlFileInput.click()
      }
    },

    /**
     * Handles file selection event and imports YAML content into Pinia store.
     * @param {Event} event - HTML file input change event.
     */
    handleYamlFileSelect(event) {
      const file = event.target.files && event.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target.result
          const res = this.absentsStore.importYAML(content)
          this.showSnackbar(
            `Imported ${res.count} record(s) and key dates successfully!`,
            'success',
          )
        } catch (err) {
          this.showSnackbar(err.message || 'Failed to import YAML file.', 'error')
        }
      }
      reader.readAsText(file)
    },

    /**
     * Displays a snackbar notification with custom text and color.
     * @param {string} text - Message text.
     * @param {string} [color='success'] - Vuetify color theme.
     */
    showSnackbar(text, color = 'success') {
      this.snackbar = {
        show: true,
        text,
        color,
      }
    },

    /**
     * Formats a date string or Date object into 'YYYY-MM-DD' format with leading zeros.
     * @param {string|Date} dateInput - Date string or Date object.
     * @returns {string} Formatted date string in YYYY-MM-DD format or '-' if null/empty.
     */
    formatDate(dateInput) {
      if (!dateInput) return '-'
      return normalizeDate(dateInput) || String(dateInput)
    },

    /**
     * Gets today's date in local system time as a 'YYYY-MM-DD' string.
     * @returns {string}
     */
    getTodayStr() {
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    /**
     * Checks if an absence record return date is in the future.
     * @param {Object} item - Absence record.
     * @returns {boolean}
     */
    isFutureEvent(item) {
      if (!item || !item.endDate) return false
      return item.endDate > this.getTodayStr()
    },

    /**
     * Checks if today falls within an absence record's departure and return date interval.
     * @param {Object} item - Absence record.
     * @returns {boolean}
     */
    isOngoingEvent(item) {
      if (!item || !item.startDate || !item.endDate) return false
      const today = this.getTodayStr()
      return item.startDate <= today && item.endDate >= today
    },
  },
}
</script>

<template>
  <div>
    <!-- 1. Absence Tracker Title Card & BNO Visa Overview Header Row -->
    <v-row density="default">
      <!-- Left Column: Absence Tracker Title Card -->
      <v-col cols="12" md="5">
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100 d-flex flex-column justify-space-between">
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
              @click="openVisaDateDialog"
            >
              {{ $t('absence.set_key_dates') }}
            </v-btn>
          </div>
        </v-alert>

        <!-- Consolidated BNO Visa Overview Card if Set -->
        <v-card v-else elevation="2" class="pa-3 rounded-lg bg-surface h-100 d-flex flex-column justify-space-between">
          <div>
            <v-card-title
              class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2"
            >
              <div class="d-flex align-center ga-2">
                <v-icon icon="mdi-passport-biometric" color="primary"></v-icon>
                <span class="text-h5 font-weight-bold">{{ $t('absence.visa_overview') }}</span>
              </div>

              <v-chip
                :color="absentsStore.isVisaExtensionNeeded ? 'warning' : 'success'"
                size="small"
                variant="tonal"
                class="font-weight-bold"
              >
                <v-icon
                  :icon="
                    absentsStore.isVisaExtensionNeeded ? 'mdi-alert-circle' : 'mdi-check-circle'
                  "
                  start
                ></v-icon>
                {{
                  absentsStore.isVisaExtensionNeeded
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
                      <span class="text-caption text-medium-emphasis">{{ $t('absence.visa_start') }}</span>
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
                    :color="absentsStore.isVisaExtensionNeeded ? 'warning' : 'info'"
                    class="pa-3 rounded-lg h-100"
                  >
                    <div class="d-flex align-center justify-space-between mb-1">
                      <div class="d-flex align-center ga-2">
                        <v-icon
                          icon="mdi-calendar-clock"
                          size="small"
                          :color="absentsStore.isVisaExtensionNeeded ? 'warning' : 'info'"
                        ></v-icon>
                        <span class="text-caption text-medium-emphasis">{{ $t('absence.visa_expiry') }}</span>
                      </div>
                      <v-chip
                        size="x-small"
                        :color="absentsStore.isVisaExpiryDateSet ? 'purple' : 'info'"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        {{ absentsStore.isVisaExpiryDateSet ? $t('absence.custom_expiry') : $t('absence.default_5yr') }}
                      </v-chip>
                    </div>
                    <div class="text-subtitle-1 font-weight-bold">
                      {{ formatDate(absentsStore.effectiveVisaExpiryDate) }}
                    </div>
                  </v-card>
                </v-col>

                <!-- UK Arrival Date -->
                <v-col cols="12" sm="6">
                  <v-card variant="tonal" color="success" class="pa-3 rounded-lg h-100">
                    <div class="d-flex align-center ga-2 mb-1">
                      <v-icon icon="mdi-airplane-landing" size="small" color="success"></v-icon>
                      <span class="text-caption text-medium-emphasis">{{ $t('absence.uk_arrival') }}</span>
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
                      <span class="text-caption text-medium-emphasis">{{ $t('absence.ilr_approved') }}</span>
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
                v-if="absentsStore.isVisaExtensionNeeded"
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
                      <strong>{{ formatDate(absentsStore.effectiveVisaExpiryDate) }}</strong>
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
                    <strong>{{ formatDate(absentsStore.effectiveVisaExpiryDate) }}</strong>
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
              @click="openVisaDateDialog"
            >
              {{ $t('absence.edit_key_dates') }}
            </v-btn>
          </div>
        </v-card>
      </v-col>

      <!-- 2. ILR / Settlement | British Citizenship -->
      <template v-if="absentsStore.isVisaDateSet">
        <!-- ILR / Settlement Card -->
      <v-col cols="12" md="6">
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
          <v-card-title
            class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2"
          >
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
                  absentsStore.ilrQualifyingPeriod.windowStartDate ||
                    absentsStore.visaStartDate,
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
                    <span class="text-caption font-weight-bold">{{ $t('absence.rolling_180_rule') }}</span>
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
                    {{ $t('absence.peak_label', { start: formatDate(absentsStore.max12MonthAbsenceInfo.peakStartDate), end: formatDate(absentsStore.max12MonthAbsenceInfo.peakEndDate) }) }}
                  </div>
                </v-card>
              </v-col>

              <!-- 5-Year Total Absences -->
              <v-col cols="12" sm="6">
                <v-card variant="tonal" color="info" class="pa-3 rounded-lg h-100">
                  <div class="d-flex align-center justify-space-between mb-1">
                    <span class="text-caption font-weight-bold">{{ $t('absence.total_5yr_absences') }}</span>
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
                    <strong>{{ formatDate(absentsStore.ilrQualifyingPeriod.baselineTargetDate) }}</strong>
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
          <v-card-title
            class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2"
          >
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
                    <span class="text-caption font-weight-bold">{{ $t('absence.cit_5yr_limit') }}</span>
                    <v-chip
                      :color="absentsStore.naturalizationStatusColor"
                      size="x-small"
                      variant="flat"
                      class="font-weight-bold"
                    >
                      {{ absentsStore.naturalization5YearAbsence }} / 450 {{ $t('absence.full_days') }}
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
                    <span class="text-caption font-weight-bold">{{ $t('absence.cit_final_12mo_limit') }}</span>
                    <v-chip
                      :color="absentsStore.naturalizationStatusColor"
                      size="x-small"
                      variant="flat"
                      class="font-weight-bold"
                    >
                      {{ absentsStore.naturalizationFinal12MoAbsence }} / 90 {{ $t('absence.full_days') }}
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
                  {{ formatDate(absentsStore.naturalizationTargetDate) }}
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
                  {{ formatDate(absentsStore.naturalizationTargetDate) }}
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

    <!-- 3. Add Absence Record & Absence Records Row -->
    <!-- Right Column on Wide Screen / Top on Narrow Screen: Add Absence Record & Custom Date Range (1/3 width on wide screen) -->
    <v-col cols="12" lg="4" order-lg="2" class="d-flex flex-column ga-6">
        <!-- Add Absence Record Card -->
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface">
          <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
            <v-icon :icon="editingId ? 'mdi-pencil' : 'mdi-plus-circle'" color="primary"></v-icon>
            <span class="text-h5 font-weight-bold">
              {{ editingId ? $t('absence.edit_record') : $t('absence.add_record') }}
            </span>
          </v-card-title>

          <v-card-text class="px-0 pb-0">
            <v-form @submit.prevent="handleSave">
              <!-- Responsive Graph Timeline Flow for Multi-Stop Trip Editor -->
              <div class="editor-timeline-container mb-3 w-100">
                <div class="editor-timeline-flow py-2 px-1 w-100">
                  <template v-for="(stop, index) in form.stops" :key="index">
                    <!-- NODE Item (Date) -->
                    <div class="timeline-node-item d-flex align-stretch">
                      <!-- Vertical timeline left indicator -->
                      <div class="timeline-indicator-left flex-column align-center justify-start pt-1">
                        <div
                          class="node-icon-bubble rounded-circle d-flex align-center justify-center elevation-1"
                          :class="
                            index === 0
                              ? 'bg-primary'
                              : index === form.stops.length - 1
                                ? 'bg-success'
                                : 'bg-info'
                          "
                          style="width: 28px; height: 28px"
                        >
                          <v-icon
                            :icon="
                              index === 0
                                ? 'mdi-airplane-takeoff'
                                : index === form.stops.length - 1
                                  ? 'mdi-airplane-landing'
                                  : 'mdi-map-marker'
                            "
                            color="white"
                            size="x-small"
                          ></v-icon>
                        </div>
                      </div>

                      <!-- Node Right Content (Inputs & Header) -->
                      <div class="timeline-node-content flex-grow-1">
                        <div class="d-flex align-center justify-space-between ga-2 mb-2">
                          <span class="text-caption font-weight-bold text-primary d-flex align-center ga-1">
                            <v-icon
                              class="desktop-node-icon"
                              :icon="
                                index === 0
                                  ? 'mdi-airplane-takeoff'
                                  : index === form.stops.length - 1
                                    ? 'mdi-airplane-landing'
                                    : 'mdi-map-marker'
                              "
                              :color="
                                index === 0
                                  ? 'primary'
                                  : index === form.stops.length - 1
                                    ? 'success'
                                    : 'info'
                              "
                              size="x-small"
                            ></v-icon>
                            <span>
                              {{
                                index === 0
                                  ? $t('absence.dep_uk')
                                  : index === form.stops.length - 1
                                    ? $t('absence.ret_uk')
                                    : $t('absence.stop_number', { n: index })
                              }}
                            </span>
                          </span>

                          <v-btn
                            v-if="index > 0 && index < form.stops.length - 1"
                            icon="mdi-close"
                            variant="text"
                            color="error"
                            size="x-small"
                            :title="$t('absence.remove_stop')"
                            @click="removeStopNode(index)"
                          ></v-btn>
                        </div>

                        <!-- Date Input (Node) -->
                        <v-text-field
                          v-model="stop.date"
                          type="date"
                          :label="
                            index === 0
                              ? $t('absence.departure_date')
                              : index === form.stops.length - 1
                                ? $t('absence.return_date')
                                : 'Date'
                          "
                          variant="outlined"
                          density="compact"
                          hide-details="auto"
                          :error-messages="
                            index === 0
                              ? startDateError
                              : index === form.stops.length - 1
                                ? endDateError
                                : ''
                          "
                          class="w-100"
                          required
                        ></v-text-field>
                      </div>
                    </div>

                    <!-- EDGE Item (Destination to Next Node) -->
                    <div
                      v-if="index < form.stops.length - 1"
                      class="timeline-edge-item d-flex align-stretch"
                    >
                      <!-- Vertical timeline connector left indicator -->
                      <div class="timeline-indicator-left flex-column align-center justify-center my-1">
                        <div class="vertical-line-flex"></div>
                        <v-icon icon="mdi-chevron-down" size="small" color="primary" class="my-1"></v-icon>
                        <div class="vertical-line-flex"></div>
                      </div>

                      <!-- Edge Right Content (Destination Input) -->
                      <div class="timeline-edge-content flex-grow-1 px-0 py-1 d-flex flex-column justify-center">
                        <div class="text-caption font-weight-medium text-medium-emphasis mb-1 d-flex align-center ga-1">
                          <v-icon icon="mdi-map-marker-outline" size="12"></v-icon>
                          <span>{{ $t('absence.leg_dest') }}</span>
                        </div>

                        <v-text-field
                          v-model="stop.dest"
                          placeholder="e.g. Hong Kong, Japan"
                          variant="outlined"
                          density="compact"
                          hide-details="auto"
                          class="w-100"
                        ></v-text-field>

                        <!-- Horizontal Arrow for Desktop -->
                        <div class="edge-line-arrow desktop-edge-arrow d-flex align-center justify-center w-100 mt-2">
                          <div class="line-flex"></div>
                          <v-icon icon="mdi-chevron-right" size="small" color="primary"></v-icon>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Node date error -->
              <div v-if="nodeDateError" class="mb-2">
                <span class="text-caption text-error">
                  {{ nodeDateError }}
                </span>
              </div>

              <!-- Form Days Calculation Badge & Actions -->
              <div class="d-flex align-center justify-space-between flex-wrap ga-4 mt-4">
                <div class="d-flex align-center ga-3">
                  <v-btn
                    variant="tonal"
                    color="info"
                    prepend-icon="mdi-plus"
                    @click="addStopNode"
                  >
                    {{ $t('absence.add_stop') }}
                  </v-btn>
                  <v-chip
                    v-if="startDate && endDate && !dateRangeError"
                    color="secondary"
                    variant="tonal"
                    prepend-icon="mdi-calculator"
                    size="small"
                    class="font-weight-medium"
                  >
                    <i18n-t keypath="absence.calculated_full_days" scope="global">
                      <template #days>
                        <strong class="ml-1 text-primary">{{ calculatedDaysForForm }}</strong>
                      </template>
                    </i18n-t>
                  </v-chip>
                </div>

                <div class="d-flex align-center ga-2">
                  <v-btn
                    v-if="editingId"
                    variant="outlined"
                    color="secondary"
                    prepend-icon="mdi-close"
                    @click="cancelEdit"
                  >
                    {{ $t('absence.cancel') }}
                  </v-btn>

                  <v-btn
                    type="submit"
                    color="primary"
                    :disabled="!isFormValid"
                    :prepend-icon="editingId ? 'mdi-check' : 'mdi-plus'"
                  >
                    {{ editingId ? $t('absence.update_record') : $t('absence.add_record') }}
                  </v-btn>
                </div>
              </div>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Custom Date Range Card -->
        <v-card v-if="absentsStore.isVisaDateSet" elevation="2" class="pa-3 rounded-lg bg-surface">
          <v-card-title
            class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2"
          >
            <div class="d-flex align-center ga-2">
              <v-icon icon="mdi-calendar-range" color="primary"></v-icon>
              <span class="text-h5 font-weight-bold">{{ $t('absence.custom_range_title') }}</span>
              <v-chip
                color="primary"
                variant="tonal"
                size="x-small"
                prepend-icon="mdi-lightning-bolt"
              >
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
                {{ $t('absence.absences') }}: <strong class="ml-1 text-primary">{{ queriedRangeDays }} {{ $t('absence.full_days') }}</strong>
              </v-chip>

              <v-btn
                color="primary"
                size="small"
                prepend-icon="mdi-restore"
                title="Reset query range to maximum 10-year period"
                @click="resetQueryDateRangeToMax"
              >
                {{ $t('absence.reset_max_range') }}
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Left Column on Wide Screen / Bottom on Narrow Screen: Absence Records (2/3 width on wide screen) -->
      <v-col cols="12" lg="8" order-lg="1">
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
          <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
            <v-icon icon="mdi-format-list-bulleted" color="primary"></v-icon>
            <span class="text-h5 font-weight-bold">{{ $t('absence.records_title') }}</span>
            <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
              {{ absentsStore.sortedAbsences.length }}
            </v-chip>
          </v-card-title>

          <v-card-text class="px-0 pb-0">
            <!-- Records Table -->
            <v-table
              v-if="absentsStore.sortedAbsences.length > 0"
              density="comfortable"
              hover
              class="border rounded-lg"
            >
              <thead>
                <tr>
                  <th class="text-left font-weight-bold" style="width: 100px">
                    {{ $t('absence.table_status') }}
                  </th>
                  <th class="text-left font-weight-bold">{{ $t('absence.trip_timeline') }}</th>
                  <th class="text-center font-weight-bold" style="width: 140px">
                    {{ $t('absence.full_days') }}
                  </th>
                  <th class="text-right font-weight-bold" style="width: 110px">
                    {{ $t('absence.table_actions') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in absentsStore.sortedAbsences"
                  :key="item.id"
                  :class="{
                    'bg-action-hover': editingId === item.id,
                    'row-planned-event':
                      isFutureEvent(item) && !isOngoingEvent(item) && editingId !== item.id,
                    'row-ongoing-event': isOngoingEvent(item) && editingId !== item.id,
                  }"
                >
                  <td class="align-middle" style="width: 100px">
                    <!-- Event Status Chip -->
                    <v-chip
                      v-if="item.isAutoArrival"
                      size="x-small"
                      color="secondary"
                      variant="flat"
                      class="font-weight-bold"
                    >
                      {{ $t('absence.initial') }}
                    </v-chip>
                    <v-chip
                      v-else-if="isOngoingEvent(item)"
                      size="x-small"
                      color="warning"
                      variant="flat"
                      class="font-weight-bold"
                    >
                      {{ $t('absence.ongoing') }}
                    </v-chip>
                    <v-chip
                      v-else-if="isFutureEvent(item)"
                      size="x-small"
                      color="info"
                      variant="outlined"
                      class="font-weight-medium"
                    >
                      {{ $t('absence.planned') }}
                    </v-chip>
                    <v-chip
                      v-else
                      size="x-small"
                      color="grey"
                      variant="tonal"
                      class="font-weight-regular text-caption"
                    >
                      {{ $t('absence.past') }}
                    </v-chip>
                  </td>

                  <td class="py-3 align-middle">
                    <!-- FULL Mode Timeline -->
                    <div
                      v-if="timelineViewMode === 'full'"
                      class="d-flex align-center flex-nowrap ga-1 overflow-x-auto py-1 w-100"
                    >
                      <template v-for="(stop, idx) in getRecordStops(item)" :key="idx">
                        <!-- List NODE -->
                        <div class="d-flex align-center ga-1 bg-surface-variant px-2 py-1 rounded border flex-shrink-0">
                          <v-icon
                            :icon="
                              idx === 0
                                ? 'mdi-airplane-takeoff'
                                : idx === getRecordStops(item).length - 1
                                  ? 'mdi-airplane-landing'
                                  : 'mdi-map-marker'
                            "
                            :color="
                              idx === 0
                                ? 'primary'
                                : idx === getRecordStops(item).length - 1
                                  ? 'success'
                                  : 'info'
                            "
                            size="x-small"
                          ></v-icon>
                          <span class="text-caption font-weight-bold text-no-wrap">
                            {{ formatDate(stop.date) }}
                          </span>
                        </div>

                        <!-- List EDGE Connector -->
                        <div
                          v-if="idx < getRecordStops(item).length - 1"
                          class="d-flex align-center justify-center ga-1 px-1 flex-grow-1"
                          style="min-width: 50px"
                        >
                          <div class="edge-line flex-grow-1"></div>
                          <v-chip
                            v-if="stop.dest"
                            size="x-small"
                            color="primary"
                            variant="tonal"
                            class="font-weight-medium text-no-wrap"
                          >
                            <v-icon start icon="mdi-map-marker-outline" size="10"></v-icon>
                            {{ stop.dest }}
                          </v-chip>
                          <div class="edge-line flex-grow-1"></div>
                          <v-icon icon="mdi-chevron-right" size="x-small" color="primary"></v-icon>
                        </div>
                      </template>
                    </div>

                    <!-- COMPACT Mode Timeline -->
                    <div
                      v-else
                      class="d-flex align-center flex-nowrap ga-1 overflow-x-auto py-1 w-100"
                    >
                      <!-- Departure Node -->
                      <div class="d-flex align-center ga-1 bg-surface-variant px-2 py-1 rounded border flex-shrink-0">
                        <v-icon icon="mdi-airplane-takeoff" color="primary" size="x-small"></v-icon>
                        <span class="text-caption font-weight-bold text-no-wrap">
                          {{ formatDate(item.startDate) }}
                        </span>
                      </div>

                      <!-- Summary Edge -->
                      <div class="d-flex align-center justify-center ga-1 px-1 flex-grow-1" style="min-width: 60px">
                        <div class="edge-line flex-grow-1"></div>
                        <v-chip
                          size="x-small"
                          color="primary"
                          variant="tonal"
                          class="font-weight-medium text-no-wrap"
                        >
                          <v-icon start icon="mdi-map-marker-outline" size="10"></v-icon>
                          {{ item.dest || $t('absence.unspecified') }}
                        </v-chip>
                        <div class="edge-line flex-grow-1"></div>
                        <v-icon icon="mdi-chevron-right" size="x-small" color="primary"></v-icon>
                      </div>

                      <!-- Return Node -->
                      <div class="d-flex align-center ga-1 bg-surface-variant px-2 py-1 rounded border flex-shrink-0">
                        <v-icon icon="mdi-airplane-landing" color="success" size="x-small"></v-icon>
                        <span class="text-caption font-weight-bold text-no-wrap">
                          {{ formatDate(item.endDate) }}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td class="text-center align-middle">
                    <v-chip
                      :color="
                        isOngoingEvent(item)
                          ? 'warning'
                          : isFutureEvent(item)
                            ? 'info'
                            : calculateDays(item.startDate, item.endDate) > 0
                              ? 'primary'
                              : 'grey'
                      "
                      size="x-small"
                      :variant="
                        isFutureEvent(item) && !isOngoingEvent(item) ? 'outlined' : 'tonal'
                      "
                      :class="{
                        'font-weight-bold': !isFutureEvent(item) || isOngoingEvent(item),
                        'font-weight-medium opacity-90':
                          isFutureEvent(item) && !isOngoingEvent(item),
                      }"
                    >
                      {{ calculateDays(item.startDate, item.endDate) }} day(s)
                    </v-chip>
                  </td>
                  <td class="text-right align-middle">
                    <template v-if="item.isAutoArrival || item.id === 'auto_uk_arrival_record'">
                      <v-chip
                        size="x-small"
                        color="secondary"
                        variant="tonal"
                        prepend-icon="mdi-lock-outline"
                        title="Initial UK Entry record is managed via Key Dates"
                        class="font-weight-medium"
                      >
                        {{ $t('absence.managed') }}
                      </v-chip>
                    </template>
                    <template v-else>
                      <v-menu location="bottom end">
                        <template #activator="{ props }">
                          <v-btn
                            icon="mdi-dots-vertical"
                            variant="text"
                            size="small"
                            v-bind="props"
                            title="Actions menu"
                          ></v-btn>
                        </template>
                        <v-list density="compact" class="rounded-lg elevation-4">
                          <v-list-item
                            prepend-icon="mdi-pencil-outline"
                            :title="$t('absence.edit_record_title')"
                            @click="startEdit(item)"
                          ></v-list-item>
                          <v-list-item
                            prepend-icon="mdi-delete-outline"
                            :title="$t('absence.delete_record_title')"
                            @click="confirmDelete(item)"
                          ></v-list-item>
                        </v-list>
                      </v-menu>
                    </template>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <!-- Empty State -->
            <div v-else class="pa-6 text-center">
              <v-avatar color="surface-variant" size="56" class="mb-2">
                <v-icon icon="mdi-airplane-off" size="28" color="medium-emphasis"></v-icon>
              </v-avatar>
              <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ $t('absence.no_records_title') }}</h3>
              <p class="text-caption text-medium-emphasis mb-0">
                {{ $t('absence.no_records_desc') }}
              </p>
            </div>

            <!-- Card Bottom Actions: View Mode Toggle -->
            <div v-if="absentsStore.sortedAbsences.length > 0" class="d-flex align-center justify-end mt-3">
              <v-btn-toggle
                v-model="timelineViewMode"
                mandatory
                density="compact"
                size="x-small"
                color="primary"
                variant="outlined"
                class="rounded-lg"
              >
                <v-btn value="full" prepend-icon="mdi-timeline-text-outline">
                  {{ $t('absence.view_full') }}
                </v-btn>
                <v-btn value="compact" prepend-icon="mdi-view-compact-outline">
                  {{ $t('absence.view_compact') }}
                </v-btn>
              </v-btn-toggle>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialogs & Notifications -->

    <!-- Delete Single Confirmation Dialog -->
    <v-dialog v-model="deleteDialog.show" max-width="400px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 text-error">
          {{ $t('absence.delete_record_title') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          {{ $t('absence.delete_confirm_body', { dest: deleteDialog.dest }) }}
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="deleteDialog.show = false">{{ $t('absence.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" @click="executeDelete">{{ $t('absence.delete_confirm') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Clear All Confirmation Dialog -->
    <v-dialog v-model="clearAllDialog" max-width="450px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 text-error">
          {{ $t('app.clear_all_title') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          {{ $t('app.clear_all_body') }}
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="clearAllDialog = false">{{ $t('absence.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" @click="executeClearAll">{{ $t('absence.clear_all') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Set / Edit Key Travel & Visa Dates Dialog -->
    <v-dialog v-model="visaDateDialog" max-width="640px">
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
                v-model="visaDateInput"
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
                v-model="visaExpiryDateInput"
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
                v-model="arrivalDateInput"
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
                v-model="ilrApprovedDateInput"
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
          <v-btn variant="text" @click="visaDateDialog = false">{{ $t('absence.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!visaDateInput"
            @click="saveVisaAndArrivalDates"
          >
            {{ $t('absence.save_dates') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Global Snackbar Notification -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      location="bottom end"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">{{ $t('app.close') }}</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.bg-action-hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
.row-planned-event {
  background-color: rgba(var(--v-theme-info), 0.05);
  opacity: 0.85;
}
.row-ongoing-event {
  background-color: rgba(var(--v-theme-warning), 0.06);
}
.trip-horizontal-timeline {
  overflow-x: auto;
  padding-bottom: 4px;
}
.editor-timeline-flow {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
}
.timeline-node-item,
.timeline-edge-item {
  flex: none;
  width: 100%;
  min-width: 0;
}
.timeline-indicator-left {
  display: flex;
  width: 32px;
  min-width: 32px;
  margin-right: 12px;
}
.desktop-node-icon,
.desktop-edge-arrow {
  display: none;
}
.vertical-line-flex {
  width: 5px;
  min-height: 12px;
  background-color: rgba(var(--v-theme-primary), 0.55);
  border-radius: 3px;
  flex-grow: 1;
}
.line-flex {
  flex-grow: 1;
  height: 5px;
  background-color: rgba(var(--v-theme-primary), 0.55);
  border-radius: 3px;
}
.edge-line {
  width: 14px;
  height: 5px;
  background-color: rgba(var(--v-theme-primary), 0.55);
  border-radius: 3px;
}
</style>
