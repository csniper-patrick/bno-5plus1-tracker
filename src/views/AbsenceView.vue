<script>
import { mapStores } from 'pinia'
import { useAbsentsStore, calculateDays, getMaxSegmentTreeReturnDate } from '../stores/absents'

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
        startDate: '',
        endDate: '',
        dest: '',
      },

      /** Active record form model for add/edit operations */
      form: {
        startDate: '',
        endDate: '',
        dest: '',
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

      /** Temporary input state for UK Arrival Date in modal */
      arrivalDateInput: '',

      /** Temporary input state for ILR Approved Date in modal */
      ilrApprovedDateInput: '',

      /** Model for custom date range query tool */
      queryForm: {
        startDate: '',
        endDate: '',
      },
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
     * Validates form departure date against Visa Start Date, UK Arrival Date, and return date.
     * @returns {string} Validation error message or empty string if valid.
     */
    startDateError() {
      if (!this.form.startDate) return ''

      const vStart = this.absentsStore.visaStartDate
      if (vStart && this.form.startDate < vStart) {
        return `Departure date cannot be earlier than Visa Start Date (${vStart}).`
      }

      const uArrival = this.absentsStore.ukArrivalDate
      if (uArrival && this.form.startDate < uArrival) {
        return `Departure date cannot be earlier than UK Arrival Date (${uArrival}).`
      }

      if (this.form.endDate && this.form.endDate < this.form.startDate) {
        return 'Departure date cannot be later than return date.'
      }

      return ''
    },

    /**
     * Validates form return date against departure date and 10-year Segment Tree limit.
     * @returns {string} Validation error message or empty string if valid.
     */
    endDateError() {
      if (!this.form.endDate) return ''

      if (this.form.startDate && this.form.endDate < this.form.startDate) {
        return 'Return date cannot be earlier than departure date.'
      }

      const maxReturn = this.maxSegmentTreeReturnDate
      if (maxReturn && this.form.endDate > maxReturn) {
        return `Return date cannot be later than 10 years from Visa Start Date (${maxReturn}).`
      }

      return ''
    },

    /**
     * Aggregates date range errors from start and end date fields.
     * @returns {string}
     */
    dateRangeError() {
      return this.startDateError || this.endDateError
    },

    /**
     * Checks if departure date is non-empty and satisfies Visa Start Date & UK Arrival Date limits.
     * Used to dynamically set minimum date boundary on return date picker.
     * @returns {boolean}
     */
    isStartDateValid() {
      if (!this.form.startDate) return false
      const vStart = this.absentsStore.visaStartDate
      if (vStart && this.form.startDate < vStart) return false
      const uArrival = this.absentsStore.ukArrivalDate
      if (uArrival && this.form.startDate < uArrival) return false
      return true
    },

    /**
     * Minimum date boundary (YYYY-MM-DD) passed to the Return Date picker.
     * Equals form.startDate when valid, or undefined otherwise.
     * @returns {string|undefined}
     */
    minReturnDate() {
      return this.isStartDateValid ? this.form.startDate : undefined
    },

    /**
     * Calculates the full days absent preview for current form values.
     * @returns {number}
     */
    calculatedDaysForForm() {
      if (!this.form.startDate || !this.form.endDate || this.dateRangeError) return 0
      return calculateDays(this.form.startDate, this.form.endDate)
    },

    /**
     * Returns true if both dates are present and free of validation errors.
     * @returns {boolean}
     */
    isFormValid() {
      return Boolean(
        this.form.startDate && this.form.endDate && !this.startDateError && !this.endDateError,
      )
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
        return `Start date cannot be earlier than Visa Start Date (${vStart}).`
      }

      if (this.queryForm.endDate && this.queryForm.endDate < this.queryForm.startDate) {
        return 'Start date cannot be later than end date.'
      }

      const maxReturn = this.maxSegmentTreeReturnDate
      if (maxReturn && this.queryForm.startDate > maxReturn) {
        return `Start date cannot be later than 10 years from Visa Start Date (${maxReturn}).`
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
        return 'End date cannot be earlier than start date.'
      }

      const vStart = this.absentsStore.visaStartDate
      if (vStart && this.queryForm.endDate < vStart) {
        return `End date cannot be earlier than Visa Start Date (${vStart}).`
      }

      const maxReturn = this.maxSegmentTreeReturnDate
      if (maxReturn && this.queryForm.endDate > maxReturn) {
        return `End date cannot be later than 10 years from Visa Start Date (${maxReturn}).`
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
        ukArrivalDate: this.arrivalDateInput,
        ilrApprovedDate: this.ilrApprovedDateInput,
      })
      this.visaDateDialog = false
      this.showSnackbar('Key Travel & Visa Dates saved successfully!', 'success')
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

      try {
        if (this.editingId) {
          this.absentsStore.updateAbsence(this.editingId, {
            startDate: this.form.startDate,
            endDate: this.form.endDate,
            dest: this.form.dest,
          })
          this.showSnackbar('Absence record updated successfully!', 'success')
          this.resetForm()
        } else {
          this.absentsStore.addAbsence({
            startDate: this.form.startDate,
            endDate: this.form.endDate,
            dest: this.form.dest,
          })
          this.showSnackbar('Absence record added successfully!', 'success')
          this.resetForm()
        }
        this.focusDestInput()
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
      this.form = {
        startDate: item.startDate,
        endDate: item.endDate,
        dest: item.dest || '',
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
      this.form = { ...this.defaultForm }
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
        this.showSnackbar('Record deleted', 'info')
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
      if (typeof dateInput === 'string') {
        const cleanStr = dateInput.split('T')[0]
        const parts = cleanStr.split('-')
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          const y = parts[0].padStart(4, '0')
          const m = String(parts[1]).padStart(2, '0')
          const d = String(parts[2]).padStart(2, '0')
          return `${y}-${m}-${d}`
        }
      }
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
      if (isNaN(date.getTime())) return String(dateInput)
      const y = date.getUTCFullYear()
      const m = String(date.getUTCMonth() + 1).padStart(2, '0')
      const d = String(date.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
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
    <!-- Main Side-by-Side 2 Column Layout (Wide Desktop) -->
    <v-row>
      <!-- LEFT COLUMN (Takes up 7 cols on desktop) -->
      <v-col cols="12" md="7" class="d-flex flex-column ga-6">
        <!-- Header / Info Card -->
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface">
          <v-card-title class="px-0 pt-0 d-flex align-center flex-wrap ga-2">
            <div class="d-flex align-center">
              <v-icon icon="mdi-passport" color="primary" class="mr-2"></v-icon>
              <span class="text-h5 font-weight-bold">Absence Tracker</span>
            </div>
            <v-chip
              size="small"
              color="success"
              variant="flat"
              class="font-weight-bold ml-sm-auto"
              prepend-icon="mdi-shield-check"
            >
              Stored Locally on Device
            </v-chip>
          </v-card-title>
          <p class="text-body-2 text-medium-emphasis ma-0">
            Track travel dates and continuous residence for UK ILR and Citizenship. (Unofficial 3rd-Party Tool)
          </p>

          <v-alert
            type="info"
            variant="tonal"
            icon="mdi-shield-lock-outline"
            class="mt-3 text-caption"
            density="compact"
          >
            <strong>Local Storage Notice:</strong> All data input (travel records, visa & arrival dates) is saved strictly locally on your device in browser <code>localStorage</code>. No data is sent to external servers.
          </v-alert>

          <!-- Feature Breakdown / What is Tracked & Calculated -->
          <v-expansion-panels class="mt-3 border rounded-lg overflow-hidden" density="compact">
            <v-expansion-panel elevation="0">
              <v-expansion-panel-title class="text-caption font-weight-bold py-1 px-3">
                <v-icon
                  icon="mdi-information-outline"
                  color="primary"
                  class="mr-2"
                  size="small"
                ></v-icon>
                Rules & Calculation Summary
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-caption pt-1">
                <v-row density="compact">
                  <v-col cols="12" sm="6">
                    <div class="d-flex ga-2">
                      <v-icon
                        icon="mdi-calendar-sync"
                        color="primary"
                        size="x-small"
                        class="mt-1"
                      ></v-icon>
                      <div>
                        <strong class="text-caption font-weight-bold"
                          >180-Day Rolling Rule (ILR)</strong
                        >
                        <p class="text-caption text-medium-emphasis mb-0">
                          Tracks peak absences in any 365-day rolling window (max 180 days for ILR).
                        </p>
                      </div>
                    </div>
                  </v-col>

                  <v-col cols="12" sm="6">
                    <div class="d-flex ga-2">
                      <v-icon
                        icon="mdi-flag-checkered"
                        color="success"
                        size="x-small"
                        class="mt-1"
                      ></v-icon>
                      <div>
                        <strong class="text-caption font-weight-bold"
                          >British Citizenship Limits</strong
                        >
                        <p class="text-caption text-medium-emphasis mb-0">
                          Monitors 5-year total (max 450 days) and final 12-month (max 90 days)
                          limits.
                        </p>
                      </div>
                    </div>
                  </v-col>

                  <v-col cols="12" sm="6">
                    <div class="d-flex ga-2">
                      <v-icon
                        icon="mdi-clock-start"
                        color="info"
                        size="x-small"
                        class="mt-1"
                      ></v-icon>
                      <div>
                        <strong class="text-caption font-weight-bold"
                          >Settlement Target Date</strong
                        >
                        <p class="text-caption text-medium-emphasis mb-0">
                          Calculates 5-year ILR target date and earliest application date (28 days
                          prior).
                        </p>
                      </div>
                    </div>
                  </v-col>

                  <v-col cols="12" sm="6">
                    <div class="d-flex ga-2">
                      <v-icon
                        icon="mdi-calculator-variant"
                        color="secondary"
                        size="x-small"
                        class="mt-1"
                      ></v-icon>
                      <div>
                        <strong class="text-caption font-weight-bold"
                          >Full-Day UK Absence Rule</strong
                        >
                        <p class="text-caption text-medium-emphasis mb-0">
                          Departure and arrival days are excluded. Only full 24-hour days abroad
                          count.
                        </p>
                      </div>
                    </div>
                  </v-col>
                </v-row>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <v-alert
            type="warning"
            variant="tonal"
            icon="mdi-alert-circle-outline"
            class="mt-3 text-caption"
            density="compact"
          >
            <strong>Unofficial 3rd-Party Application:</strong> Provided for personal tracking only. Not affiliated with or endorsed by the UK Home Office or UK Government. Always verify dates against official UK Home Office guidelines before applying.
          </v-alert>
        </v-card>

        <!-- 1. BNO Visa & UK Arrival Dates -->
        <div>
          <!-- Prompt Alert if missing -->
          <v-alert
            v-if="!absentsStore.isVisaDateSet"
            type="warning"
            variant="tonal"
            prominent
            icon="mdi-calendar-alert"
            class="rounded-lg shadow-sm"
          >
            <div class="d-flex align-center justify-space-between flex-wrap ga-4 pa-2">
              <div>
                <h3 class="text-h6 font-weight-bold">BNO Visa & UK Arrival Dates Required</h3>
                <p class="text-body-2 mb-0">
                  Please set your BNO Visa Start Date and UK Arrival Date to calculate your 5-year
                  residency path and settlement milestones accurately.
                </p>
              </div>
              <v-btn
                color="warning"
                variant="flat"
                size="small"
                prepend-icon="mdi-calendar-plus"
                @click="openVisaDateDialog"
              >
                Set Key Dates
              </v-btn>
            </div>
          </v-alert>

          <!-- Info Bar Card if set -->
          <v-card v-else elevation="2" class="pa-3 rounded-lg bg-surface">
            <div class="d-flex align-center justify-space-between flex-wrap ga-4">
              <div class="d-flex align-center flex-wrap ga-6">
                <!-- BNO Visa Start Date -->
                <div class="d-flex align-center ga-3">
                  <v-icon icon="mdi-calendar-check" color="primary" size="large"></v-icon>
                  <div>
                    <div class="text-caption text-medium-emphasis">BNO Visa Start Date</div>
                    <div class="text-subtitle-1 font-weight-bold">
                      {{ formatDate(absentsStore.visaStartDate) }}
                    </div>
                  </div>
                </div>

                <v-divider vertical class="d-none d-sm-flex" style="height: 36px"></v-divider>

                <!-- UK Arrival Date -->
                <div class="d-flex align-center ga-3">
                  <v-icon icon="mdi-airplane-landing" color="success" size="large"></v-icon>
                  <div>
                    <div class="text-caption text-medium-emphasis">UK Arrival Date</div>
                    <div class="text-subtitle-1 font-weight-bold">
                      {{
                        absentsStore.ukArrivalDate
                          ? formatDate(absentsStore.ukArrivalDate)
                          : 'Not Set'
                      }}
                    </div>
                  </div>
                </div>

                <v-divider vertical class="d-none d-md-flex" style="height: 36px"></v-divider>

                <!-- ILR Approved Date -->
                <div class="d-flex align-center ga-3">
                  <v-icon icon="mdi-certificate-outline" color="purple" size="large"></v-icon>
                  <div>
                    <div class="text-caption text-medium-emphasis">ILR Approved Date</div>
                    <div class="text-subtitle-1 font-weight-bold">
                      {{
                        absentsStore.ilrApprovedDate
                          ? formatDate(absentsStore.ilrApprovedDate)
                          : 'Not Set'
                      }}
                    </div>
                  </div>
                </div>
              </div>

              <v-btn
                variant="outlined"
                color="primary"
                size="small"
                prepend-icon="mdi-pencil"
                @click="openVisaDateDialog"
              >
                Edit Key Dates
              </v-btn>
            </div>
          </v-card>
        </div>

        <!-- 2. Absence Record Editor -->
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface">
          <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
            <v-icon
              :icon="editingId ? 'mdi-pencil' : 'mdi-plus-circle'"
              color="primary"
            ></v-icon>
            <span class="text-h5 font-weight-bold">
              {{ editingId ? 'Edit Absence Record' : 'Add Absence Record' }}
            </span>
          </v-card-title>

          <v-card-text class="px-0 pb-0">
            <v-form @submit.prevent="handleSave">
              <v-row density="compact">
                <!-- Destination / Purpose -->
                <v-col cols="12" sm="12" md="4">
                  <v-text-field
                    ref="destInput"
                    v-model="form.dest"
                    label="Destination / Notes"
                    placeholder="e.g. Hong Kong, Japan"
                    prepend-inner-icon="mdi-map-marker-outline"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    class="mb-3"
                  ></v-text-field>
                </v-col>

                <!-- Start Date -->
                <v-col cols="12" sm="6" md="4">
                  <v-text-field
                    v-model="form.startDate"
                    label="Departure Date (Start)"
                    type="date"
                    prepend-inner-icon="mdi-calendar-export"
                    variant="outlined"
                    density="compact"
                    :error-messages="startDateError"
                    required
                    hide-details="auto"
                    class="mb-3"
                  ></v-text-field>
                </v-col>

                <!-- End Date -->
                <v-col cols="12" sm="6" md="4">
                  <v-text-field
                    v-model="form.endDate"
                    label="Return Date (End)"
                    type="date"
                    prepend-inner-icon="mdi-calendar-import"
                    variant="outlined"
                    density="compact"
                    :min="minReturnDate"
                    :error-messages="endDateError"
                    required
                    hide-details="auto"
                    class="mb-3"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-alert
                type="info"
                variant="tonal"
                icon="mdi-information-outline"
                class="mt-3 text-caption"
                density="compact"
              >
                <strong>UK Absence Rule Notice:</strong> Departure (start) and return (end) dates
                are partially spent in the UK and are <strong>excluded</strong>. Only complete
                24-hour days spent abroad are counted.
              </v-alert>

              <!-- Form Days Calculation Badge & Actions -->
              <div class="d-flex align-center justify-space-between flex-wrap ga-4 mt-4">
                <div class="d-flex align-center">
                  <v-chip
                    v-if="form.startDate && form.endDate && !dateRangeError"
                    color="secondary"
                    variant="tonal"
                    prepend-icon="mdi-calculator"
                    size="small"
                    class="font-weight-medium"
                  >
                    Calculated Full Days Absent:
                    <strong class="ml-1 text-primary">{{ calculatedDaysForForm }} day(s)</strong>
                  </v-chip>
                  <span v-else class="text-caption text-medium-emphasis">
                    Select departure and return dates to calculate days absent.
                  </span>
                </div>

                <div class="d-flex ga-2">
                  <v-btn
                    v-if="editingId"
                    variant="outlined"
                    color="secondary"
                    size="small"
                    prepend-icon="mdi-close"
                    @click="cancelEdit"
                  >
                    Cancel
                  </v-btn>

                  <v-btn
                    type="submit"
                    color="primary"
                    size="small"
                    :disabled="!isFormValid"
                    :prepend-icon="editingId ? 'mdi-check' : 'mdi-plus'"
                  >
                    {{ editingId ? 'Update Record' : 'Add Record' }}
                  </v-btn>
                </div>
              </div>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- 3. Absence Record List -->
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface">
          <v-card-title
            class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2"
          >
            <div class="d-flex align-center ga-2">
              <v-icon icon="mdi-format-list-bulleted" color="primary"></v-icon>
              <span class="text-h5 font-weight-bold">Absence Records</span>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                {{ absentsStore.sortedAbsences.length }}
              </v-chip>
            </div>
          </v-card-title>

          <v-card-text class="px-0 pb-0">
            <p class="text-caption text-medium-emphasis mb-4">
              Log of travel absences spent outside the UK during your 5-year qualifying period.
            </p>

            <!-- Records Table -->
            <v-table
              v-if="absentsStore.sortedAbsences.length > 0"
              density="comfortable"
              hover
              class="border rounded-lg"
            >
              <thead>
                <tr>
                  <th class="text-left font-weight-bold">Destination / Purpose</th>
                  <th class="text-right font-weight-bold">Departure Date</th>
                  <th class="text-right font-weight-bold">Return Date</th>
                  <th class="text-center font-weight-bold">Full Days Absent</th>
                  <th class="text-right font-weight-bold">Actions</th>
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
                  <td class="font-weight-medium">
                    <div class="d-flex align-center flex-wrap ga-2">
                      <v-icon
                        :icon="
                          item.isAutoArrival
                            ? 'mdi-airplane-landing'
                            : isOngoingEvent(item)
                              ? 'mdi-airplane'
                              : isFutureEvent(item)
                                ? 'mdi-calendar-clock'
                                : 'mdi-earth'
                        "
                        size="small"
                        :color="
                          item.isAutoArrival
                            ? 'secondary'
                            : isOngoingEvent(item)
                              ? 'warning'
                              : isFutureEvent(item)
                                ? 'info'
                                : 'primary'
                        "
                      ></v-icon>
                      <span
                        :class="{
                          'text-medium-emphasis': isFutureEvent(item) && !isOngoingEvent(item),
                        }"
                      >
                        {{ item.dest || 'Unspecified' }}
                      </span>

                      <!-- Event Status Chip -->
                      <v-chip
                        v-if="item.isAutoArrival"
                        size="x-small"
                        color="secondary"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        Initial Entry
                      </v-chip>
                      <v-chip
                        v-else-if="isOngoingEvent(item)"
                        size="x-small"
                        color="warning"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        Ongoing
                      </v-chip>
                      <v-chip
                        v-else-if="isFutureEvent(item)"
                        size="x-small"
                        color="info"
                        variant="outlined"
                        class="font-weight-medium"
                      >
                        Planned
                      </v-chip>
                      <v-chip
                        v-else
                        size="x-small"
                        color="grey"
                        variant="tonal"
                        class="font-weight-regular text-caption"
                      >
                        Past
                      </v-chip>
                    </div>
                  </td>
                  <td class="text-right">
                    <v-chip
                      size="small"
                      variant="tonal"
                      :color="
                        isOngoingEvent(item)
                          ? 'warning'
                          : isFutureEvent(item)
                            ? 'info'
                            : 'primary'
                      "
                      prepend-icon="mdi-calendar-export"
                      class="font-weight-medium"
                    >
                      {{ formatDate(item.startDate) }}
                    </v-chip>
                  </td>
                  <td class="text-right">
                    <v-chip
                      size="small"
                      variant="tonal"
                      :color="
                        isOngoingEvent(item)
                          ? 'warning'
                          : isFutureEvent(item)
                            ? 'info'
                            : 'primary'
                      "
                      prepend-icon="mdi-calendar-import"
                      class="font-weight-medium"
                    >
                      {{ formatDate(item.endDate) }}
                    </v-chip>
                  </td>
                  <td class="text-center">
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
                      :variant="isFutureEvent(item) && !isOngoingEvent(item) ? 'outlined' : 'tonal'"
                      :class="{
                        'font-weight-bold': !isFutureEvent(item) || isOngoingEvent(item),
                        'font-weight-medium opacity-90': isFutureEvent(item) && !isOngoingEvent(item),
                      }"
                    >
                      {{ calculateDays(item.startDate, item.endDate) }} day(s)
                    </v-chip>
                  </td>
                  <td class="text-right">
                    <template v-if="item.isAutoArrival || item.id === 'auto_uk_arrival_record'">
                      <v-chip
                        size="x-small"
                        color="secondary"
                        variant="tonal"
                        prepend-icon="mdi-lock-outline"
                        title="Initial UK Entry record is managed via Key Dates"
                        class="font-weight-medium"
                      >
                        Managed
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
                            title="Edit Record"
                            @click="startEdit(item)"
                          ></v-list-item>
                          <v-list-item
                            prepend-icon="mdi-delete-outline"
                            title="Delete Record"
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
              <h3 class="text-subtitle-1 font-weight-bold mb-1">No Absence Records</h3>
              <p class="text-caption text-medium-emphasis mb-0">
                You haven't logged any travel absence records yet. Use the form above to add your
                first entry.
              </p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- RIGHT COLUMN (Takes up 5 cols on desktop) -->
      <v-col cols="12" md="5" class="d-flex flex-column ga-6">
        <!-- Locked State Placeholder if Visa Date is Missing -->
        <v-card
          v-if="!absentsStore.isVisaDateSet"
          elevation="2"
          class="pa-4 rounded-lg text-center bg-surface border-dashed"
        >
          <v-avatar color="primary" variant="tonal" size="64" class="mb-4">
            <v-icon icon="mdi-shield-lock-outline" size="36"></v-icon>
          </v-avatar>
          <h3 class="text-h6 font-weight-bold mb-2">Checkers & Query Tool Locked</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Please set your BNO Visa Start Date on the left to unlock residency & naturalisation
            limit checking and custom date range queries.
          </p>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-calendar-plus"
            @click="openVisaDateDialog"
          >
            Set Visa Start Date
          </v-btn>
        </v-card>

        <template v-else>
          <!-- 1. Residence, ILR, Naturalisation Checker -->
          <div class="d-flex flex-column ga-6">
            <!-- SECTION 1: ILR / Settlement Card -->
            <v-card elevation="2" class="pa-3 rounded-lg bg-surface">
              <v-card-title class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2">
                <div class="d-flex align-center ga-2">
                  <v-icon icon="mdi-shield-check-outline" color="primary"></v-icon>
                  <span class="text-h5 font-weight-bold">ILR / Settlement</span>
                </div>

                <v-chip
                  :color="absentsStore.ruleStatusColor"
                  size="small"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  <v-icon
                    :icon="absentsStore.isRuleExceeded ? 'mdi-alert-circle' : 'mdi-check-circle'"
                    start
                  ></v-icon>
                  {{ absentsStore.isRuleExceeded ? 'ILR Limit Exceeded' : 'Within ILR Limit' }}
                </v-chip>
              </v-card-title>

              <v-card-text class="px-0 pb-0">
                <p class="text-caption text-medium-emphasis mb-4">
                  5 Yrs: {{ formatDate(absentsStore.visaStartDate) }} – {{ formatDate(absentsStore.settlementTargetDate) }}
                </p>

                <v-row density="compact">
                  <!-- 180-Day Rolling Rule -->
                  <v-col cols="12" xl="6">
                    <v-card variant="tonal" :color="absentsStore.ruleStatusColor" class="pa-3 rounded-lg">
                      <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption font-weight-bold">180-Day Rolling Rule</span>
                        <v-chip
                          :color="absentsStore.ruleStatusColor"
                          size="x-small"
                          variant="flat"
                          class="font-weight-bold"
                        >
                          {{ absentsStore.max12MonthAbsence }} / 180 Days
                        </v-chip>
                      </div>
                      <div class="text-caption opacity-90 mb-1">
                        Max absent days in any 365-day rolling window.
                      </div>
                      <div
                        v-if="absentsStore.max12MonthAbsenceInfo.peakStartDate"
                        class="text-caption font-weight-bold"
                      >
                        Peak: {{ formatDate(absentsStore.max12MonthAbsenceInfo.peakStartDate) }} –
                        {{ formatDate(absentsStore.max12MonthAbsenceInfo.peakEndDate) }}
                      </div>
                    </v-card>
                  </v-col>

                  <!-- 5-Year Total Absences -->
                  <v-col cols="12" xl="6">
                    <v-card variant="tonal" color="info" class="pa-3 rounded-lg">
                      <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption font-weight-bold">Total 5-Year Absences</span>
                        <v-chip
                          color="info"
                          size="x-small"
                          variant="flat"
                          class="font-weight-bold"
                        >
                          {{ absentsStore.ilr5YearTotalAbsence }} Days Total
                        </v-chip>
                      </div>
                      <div class="text-caption opacity-90">
                        Total cumulative full days absent over the 5-year route.
                      </div>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- Earliest ILR Application Banner -->
                <v-alert
                  type="info"
                  variant="tonal"
                  icon="mdi-clock-start"
                  class="mt-3 text-caption"
                  density="compact"
                >
                  <div class="d-flex align-center justify-space-between flex-wrap ga-2">
                    <span>
                      <strong>Earliest Application Date:</strong>
                    </span>
                    <strong class="text-subtitle-2 text-primary font-weight-bold">
                      {{ earliestIlrApplicationDate }}
                    </strong>
                  </div>
                  <div class="mt-1 opacity-90 text-caption">
                    <strong>Notice:</strong> Applications can be submitted up to 28 days before
                    completing the 5-year qualifying period.
                  </div>
                </v-alert>
              </v-card-text>
            </v-card>

            <!-- SECTION 2: Naturalisation / Citizenship Card -->
            <v-card elevation="2" class="pa-3 rounded-lg bg-surface">
              <v-card-title class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2">
                <div class="d-flex align-center ga-2">
                  <v-icon icon="mdi-flag-checkered" color="success"></v-icon>
                  <span class="text-h5 font-weight-bold">British Citizenship</span>
                </div>

                <v-chip
                  :color="absentsStore.naturalizationStatusColor"
                  size="small"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  <v-icon
                    :icon="
                      absentsStore.isNaturalizationEligible
                        ? 'mdi-check-circle'
                        : 'mdi-alert-circle'
                    "
                    start
                  ></v-icon>
                  {{
                    absentsStore.isNaturalizationEligible
                      ? 'Within Citizenship Limit'
                      : 'Citizenship Limit Exceeded'
                  }}
                </v-chip>
              </v-card-title>

              <v-card-text class="px-0 pb-0">
                <p class="text-caption text-medium-emphasis mb-4">
                  5 Yrs: {{ formatDate(absentsStore.naturalizationWindowStartDate) }} –
                  {{ formatDate(absentsStore.naturalizationTargetDate) }}
                  <span v-if="absentsStore.ilrApprovedDate" class="ml-1 font-weight-bold">
                    (Based on ILR Approved Date: {{ formatDate(absentsStore.ilrApprovedDate) }})
                  </span>
                </p>

                <v-row density="compact">
                  <!-- 5-Year Citizenship Limit (Max 450 Days) -->
                  <v-col cols="12" xl="6">
                    <v-card
                      variant="tonal"
                      :color="
                        absentsStore.naturalization5YearAbsence > 450
                          ? 'error'
                          : absentsStore.naturalization5YearAbsence >= 380
                            ? 'warning'
                            : 'success'
                      "
                      class="pa-3 rounded-lg"
                    >
                      <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption font-weight-bold">5-Year Limit</span>
                        <v-chip
                          :color="
                            absentsStore.naturalization5YearAbsence > 450
                              ? 'error'
                              : absentsStore.naturalization5YearAbsence >= 380
                                ? 'warning'
                                : 'success'
                          "
                          size="x-small"
                          variant="flat"
                          class="font-weight-bold"
                        >
                          {{ absentsStore.naturalization5YearAbsence }} / 450 Days
                        </v-chip>
                      </div>
                      <div class="text-caption opacity-90">
                        Total absent days in 5 yrs ending on naturalisation date.
                      </div>
                    </v-card>
                  </v-col>

                  <!-- Final 12-Month Limit (Max 90 Days) -->
                  <v-col cols="12" xl="6">
                    <v-card
                      variant="tonal"
                      :color="
                        absentsStore.naturalizationFinal12MoAbsence > 90
                          ? 'error'
                          : absentsStore.naturalizationFinal12MoAbsence >= 75
                            ? 'warning'
                            : 'success'
                      "
                      class="pa-3 rounded-lg"
                    >
                      <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption font-weight-bold">Final 12-Month Limit</span>
                        <v-chip
                          :color="
                            absentsStore.naturalizationFinal12MoAbsence > 90
                              ? 'error'
                              : absentsStore.naturalizationFinal12MoAbsence >= 75
                                ? 'warning'
                                : 'success'
                          "
                          size="x-small"
                          variant="flat"
                          class="font-weight-bold"
                        >
                          {{ absentsStore.naturalizationFinal12MoAbsence }} / 90 Days
                        </v-chip>
                      </div>
                      <div class="text-caption opacity-90">
                        Total absent days in 12 months post-settlement.
                      </div>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- Earliest Naturalisation Application Banner -->
                <v-alert
                  type="info"
                  variant="tonal"
                  icon="mdi-clock-start"
                  class="mt-3 text-caption"
                  density="compact"
                >
                  <div class="d-flex align-center justify-space-between flex-wrap ga-2">
                    <span>
                      <strong>Earliest Application Date:</strong>
                    </span>
                    <strong class="text-subtitle-2 text-primary font-weight-bold">
                      {{ formatDate(absentsStore.naturalizationTargetDate) }}
                    </strong>
                  </div>
                  <div class="mt-1 opacity-90 text-caption">
                    <strong>Notice:</strong> Requires physical presence in the UK exactly 5 years
                    before naturalisation.
                    <span v-if="absentsStore.ilrApprovedDate">
                      Calculated from ILR Approved Date ({{
                        formatDate(absentsStore.ilrApprovedDate)
                      }}).
                    </span>
                    <span v-else> Calculated assuming ILR 5 years post-visa start. </span>
                    Dates on absent days automatically shift forward to the next present UK day.
                  </div>
                </v-alert>
              </v-card-text>
            </v-card>
          </div>

          <!-- 2. Custom Date Range Card -->
          <v-card elevation="2" class="pa-3 rounded-lg bg-surface">
            <v-card-title
              class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2"
            >
              <div class="d-flex align-center ga-2">
                <v-icon icon="mdi-calendar-range" color="primary"></v-icon>
                <span class="text-h5 font-weight-bold">Custom Date Range</span>
                <v-chip
                  color="primary"
                  variant="tonal"
                  size="x-small"
                  prepend-icon="mdi-lightning-bolt"
                >
                  Instant Query
                </v-chip>
              </div>
            </v-card-title>

            <v-card-text class="px-0 pb-0">
              <p class="text-caption text-medium-emphasis mb-4">
                Query total absent days within any custom interval across 10 years from Visa Start Date.
              </p>

              <v-row density="compact">
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="queryForm.startDate"
                    label="Query Start Date"
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
                    label="Query End Date"
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

                <v-col cols="12">
                  <v-card
                    variant="tonal"
                    :color="queryStartDateError || queryEndDateError ? 'error' : 'primary'"
                    class="pa-3 text-center rounded-lg d-flex align-center justify-space-between"
                  >
                    <span class="text-subtitle-2 font-weight-medium">Queried Range Absences:</span>
                    <span class="text-h5 font-weight-bold">{{ queriedRangeDays }} day(s)</span>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>

            <v-card-actions class="px-0 pb-0 pt-3 justify-end">
              <v-btn
                variant="outlined"
                color="primary"
                size="small"
                prepend-icon="mdi-restore"
                title="Reset query range to maximum 10-year period"
                @click="resetQueryDateRangeToMax"
              >
                Reset to Max Range
              </v-btn>
            </v-card-actions>
          </v-card>
        </template>
      </v-col>
    </v-row>

    <!-- Delete Single Confirmation Dialog -->
    <v-dialog v-model="deleteDialog.show" max-width="400px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 text-error">
          Delete Absence Record?
        </v-card-title>
        <v-card-text class="px-0 py-2">
          Are you sure you want to delete the absence record for
          <strong>"{{ deleteDialog.dest }}"</strong>?
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="deleteDialog.show = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="executeDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Clear All Confirmation Dialog -->
    <v-dialog v-model="clearAllDialog" max-width="450px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 text-error">
          Clear All Records?
        </v-card-title>
        <v-card-text class="px-0 py-2">
          This action will permanently delete all logged absence records and reset your key visa &
          arrival dates. This cannot be undone.
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="clearAllDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="executeClearAll">Clear All</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Set / Edit Key Travel & Visa Dates Dialog -->
    <v-dialog v-model="visaDateDialog" max-width="640px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
          <v-icon icon="mdi-calendar-edit" color="primary" class="mr-2"></v-icon>
          Set Key Travel & Visa Dates
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <p class="text-caption text-medium-emphasis mb-4">
            Enter your 5-year BNO Visa Start Date, UK Arrival Date, and optional ILR Approved Date
            to enable accurate residency, settlement, and naturalisation tracking.
          </p>
          <v-row density="compact">
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="visaDateInput"
                label="BNO Visa Start Date"
                type="date"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-calendar-start"
                hide-details="auto"
                required
                class="mb-1"
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field
                v-model="arrivalDateInput"
                label="UK Arrival Date"
                type="date"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-airplane-landing"
                hide-details="auto"
                class="mb-1"
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field
                v-model="ilrApprovedDateInput"
                label="ILR Approved Date (Optional)"
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
          <v-btn variant="text" @click="visaDateDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!visaDateInput"
            @click="saveVisaAndArrivalDates"
          >
            Save Dates
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Global Snackbar Notification -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom end">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">Close</v-btn>
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
</style>
