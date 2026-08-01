<script>
import { mapStores } from 'pinia'
import { useAbsentsStore, calculateDays, getMaxSegmentTreeReturnDate } from '../stores/absents'

/**
 * AbsenceView Component
 *
 * Primary dashboard view for managing BNO 5+1 visa absence records.
 * Provides interactive forms for adding/editing trip entries, key dates setup (Visa Start & UK Arrival),
 * real-time compliance status indicators (180-day rolling rule & Naturalisation checks),
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
     * Theme color corresponding to 180-day rolling rule compliance status.
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
     * Total absent days calculated for custom query date range form.
     * @returns {number}
     */
    queriedRangeDays() {
      if (!this.queryForm.startDate || !this.queryForm.endDate) return 0
      return this.absentsStore.queryAbsentDaysInRange(
        this.queryForm.startDate,
        this.queryForm.endDate,
      )
    },
  },

  methods: {
    calculateDays,

    /**
     * Opens the Key Visa & Arrival Dates edit dialog and initializes form fields.
     */
    openVisaDateDialog() {
      this.visaDateInput = this.absentsStore.visaStartDate || ''
      this.arrivalDateInput = this.absentsStore.ukArrivalDate || ''
      this.visaDateDialog = true
    },

    /**
     * Saves updated Visa Start Date and UK Arrival Date to Pinia store.
     */
    saveVisaAndArrivalDates() {
      if (!this.visaDateInput) return
      this.absentsStore.setVisaAndArrivalDates({
        visaStartDate: this.visaDateInput,
        ukArrivalDate: this.arrivalDateInput,
      })
      this.visaDateDialog = false
      this.showSnackbar('Key Travel & Visa Dates saved successfully!', 'success')
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
      } catch (err) {
        this.showSnackbar(err.message || 'Failed to save absence record.', 'error')
      }
    },

    /**
     * Populates form with an existing absence record's values to initiate edit mode.
     * @param {Object} item - Absence record object.
     */
    startEdit(item) {
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
     * Formats a 'YYYY-MM-DD' date string into localized short date format (e.g., 'Jan 15, 2026').
     * @param {string} dateStr - Date string.
     * @returns {string} Formatted date string or '-' if null/empty.
     */
    formatDate(dateStr) {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
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
     * Checks if an absence record departure date is in the future.
     * @param {Object} item - Absence record.
     * @returns {boolean}
     */
    isFutureEvent(item) {
      if (!item || !item.startDate) return false
      return item.startDate > this.getTodayStr()
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
    <v-row class="ma-n2">
      <!-- LEFT COLUMN (Takes up more space: 7 cols on desktop) -->
      <v-col cols="12" md="7" class="pa-3 d-flex flex-column ga-6">
        <!-- Header / Info Card -->
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface">
          <div class="d-flex align-center flex-wrap ga-4">
            <v-avatar color="primary" size="56" class="elevation-2">
              <v-icon icon="mdi-passport" size="32"></v-icon>
            </v-avatar>
            <div>
              <h1 class="text-h4 font-weight-bold">BNO 5+1 Absence Tracker</h1>
              <p class="text-subtitle-1 text-medium-emphasis mb-0">
                Log your trip departure and return dates to keep track of total days absent outside
                the UK.
              </p>
            </div>
          </div>

          <v-alert
            type="warning"
            variant="tonal"
            icon="mdi-alert-circle-outline"
            class="mt-4 text-caption"
            density="compact"
          >
            <strong>Disclaimer:</strong> This application is provided for informational and personal tracking purposes only. It does not constitute official legal or immigration advice. Always verify your eligibility and dates against official UK Home Office guidelines before submitting an ILR application.
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
        <v-card elevation="2" class="pa-3 rounded-lg">
          <v-card-title class="px-0 pt-0 d-flex align-center">
            <v-icon
              :icon="editingId ? 'mdi-pencil' : 'mdi-plus-circle'"
              color="primary"
              class="mr-2"
            ></v-icon>
            <span class="text-h5 font-weight-bold">
              {{ editingId ? 'Edit Absence Record' : 'Add Absence Record' }}
            </span>
          </v-card-title>

          <v-card-text class="px-0 pb-0">
            <v-form @submit.prevent="handleSave">
              <v-row>
                <!-- Destination / Purpose -->
                <v-col cols="12" sm="12" md="4">
                  <v-text-field
                    v-model="form.dest"
                    label="Destination / Notes"
                    placeholder="e.g. Hong Kong, Japan"
                    prepend-inner-icon="mdi-map-marker-outline"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
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
                    density="comfortable"
                    :error-messages="startDateError"
                    required
                    hide-details="auto"
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
                    density="comfortable"
                    :min="minReturnDate"
                    :error-messages="endDateError"
                    required
                    hide-details="auto"
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
                <strong>UK Absence Rule Notice:</strong> Departure (start) and
                arrival (end) dates are partially spent in the UK and are <strong>excluded</strong>.
                Only complete 24-hour days spent abroad are counted.
              </v-alert>

              <!-- Form Days Calculation Badge & Actions -->
              <div class="d-flex align-center justify-space-between flex-wrap ga-4 mt-4">
                <div class="d-flex align-center">
                  <v-chip
                    v-if="form.startDate && form.endDate && !dateRangeError"
                    color="secondary"
                    variant="tonal"
                    prepend-icon="mdi-calculator"
                    size="large"
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
                    prepend-icon="mdi-close"
                    @click="cancelEdit"
                  >
                    Cancel
                  </v-btn>

                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    :disabled="!isFormValid"
                    :prepend-icon="editingId ? 'mdi-check' : 'mdi-plus'"
                    elevation="2"
                  >
                    {{ editingId ? 'Update Record' : 'Add Record' }}
                  </v-btn>
                </div>
              </div>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- 3. Absence Record List -->
        <v-card elevation="2" class="rounded-lg">
          <v-card-title
            class="pa-2 px-3 d-flex align-center justify-space-between flex-wrap ga-2 border-b"
          >
            <div class="d-flex align-center flex-wrap ga-2">
              <v-icon icon="mdi-format-list-bulleted" color="primary" class="mr-1"></v-icon>
              <span class="text-subtitle-1 font-weight-bold">Absence Records</span>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold ml-1">
                {{ absentsStore.sortedAbsences.length }}
              </v-chip>
            </div>
          </v-card-title>

          <!-- Records Table -->
          <v-table v-if="absentsStore.sortedAbsences.length > 0" density="compact" class="rounded-b-lg">
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
                  'row-planned-event': isFutureEvent(item) && editingId !== item.id,
                  'row-ongoing-event': isOngoingEvent(item) && editingId !== item.id,
                }"
              >
                <td class="font-weight-medium">
                  <div class="d-flex align-center flex-wrap ga-2">
                    <v-icon
                      :icon="
                        item.isAutoArrival
                          ? 'mdi-airplane-landing'
                          : isFutureEvent(item)
                            ? 'mdi-calendar-clock'
                            : isOngoingEvent(item)
                              ? 'mdi-airplane'
                              : 'mdi-earth'
                      "
                      size="small"
                      :color="
                        item.isAutoArrival
                          ? 'secondary'
                          : isFutureEvent(item)
                            ? 'info'
                            : isOngoingEvent(item)
                              ? 'warning'
                              : 'primary'
                      "
                    ></v-icon>
                    <span :class="{ 'text-medium-emphasis': isFutureEvent(item) }">
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
                      v-else-if="isFutureEvent(item)"
                      size="x-small"
                      color="info"
                      variant="outlined"
                      class="font-weight-medium"
                    >
                      Planned
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
                <td class="text-right" :class="{ 'text-medium-emphasis': isFutureEvent(item) }">
                  {{ formatDate(item.startDate) }}
                </td>
                <td class="text-right" :class="{ 'text-medium-emphasis': isFutureEvent(item) }">
                  {{ formatDate(item.endDate) }}
                </td>
                <td class="text-center">
                  <v-chip
                    :color="
                      isFutureEvent(item)
                        ? 'info'
                        : isOngoingEvent(item)
                          ? 'warning'
                          : calculateDays(item.startDate, item.endDate) > 0
                            ? 'primary'
                            : 'grey'
                    "
                    size="x-small"
                    :variant="isFutureEvent(item) ? 'outlined' : 'tonal'"
                    :class="{
                      'font-weight-bold': !isFutureEvent(item),
                      'font-weight-medium opacity-90': isFutureEvent(item),
                    }"
                  >
                    {{ calculateDays(item.startDate, item.endDate) }} day(s)
                  </v-chip>
                </td>
                <td class="text-right">
                  <v-btn
                    icon="mdi-pencil-outline"
                    variant="text"
                    color="primary"
                    size="small"
                    density="compact"
                    title="Edit Record"
                    @click="startEdit(item)"
                  ></v-btn>
                  <v-btn
                    icon="mdi-delete-outline"
                    variant="text"
                    color="error"
                    size="small"
                    density="compact"
                    title="Delete Record"
                    @click="confirmDelete(item)"
                  ></v-btn>
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

          <!-- Bottom Card Actions -->
          <v-divider></v-divider>
          <v-card-actions class="pa-2 px-3 d-flex align-center justify-end flex-wrap ga-2">
            <input
              ref="yamlFileInput"
              type="file"
              accept=".yaml,.yml"
              style="display: none"
              @change="handleYamlFileSelect"
            />

            <v-btn
              color="primary"
              variant="outlined"
              density="comfortable"
              size="small"
              prepend-icon="mdi-file-download-outline"
              :disabled="!hasExportData"
              @click="exportYamlFile"
            >
              Download
            </v-btn>

            <v-btn
              color="primary"
              variant="tonal"
              density="comfortable"
              size="small"
              prepend-icon="mdi-file-upload-outline"
              @click="triggerYamlImport"
            >
              Import
            </v-btn>

            <v-btn
              v-if="absentsStore.absences.length > 0"
              color="error"
              variant="text"
              density="comfortable"
              size="small"
              prepend-icon="mdi-delete-sweep-outline"
              @click="clearAllDialog = true"
            >
              Clear All
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- RIGHT COLUMN (Takes up 5 cols on desktop) -->
      <v-col cols="12" md="5" class="pa-3 d-flex flex-column ga-6">
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
            compliance checking and custom date range queries.
          </p>
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-calendar-plus"
            @click="openVisaDateDialog"
          >
            Set Visa Start Date
          </v-btn>
        </v-card>

        <template v-else>
          <!-- 1. Residence, ILR, Naturalisation Checker -->
          <div class="d-flex flex-column ga-5">
            <h2 class="text-h5 font-weight-bold d-flex align-center">
              <v-icon icon="mdi-shield-search" color="primary" class="mr-2"></v-icon>
              Residency Condition Checkers
            </h2>

            <!-- SECTION 1: ILR / Settlement Card -->
            <v-card elevation="2" class="pa-3 rounded-lg">
              <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
                <div>
                  <div class="d-flex align-center mb-1">
                    <v-chip
                      color="primary"
                      variant="flat"
                      size="medium"
                      class="font-weight-bold px-4 mb-1"
                    >
                      ILR / Settlement
                    </v-chip>
                  </div>
                  <p class="text-caption text-medium-emphasis mb-0 mt-1">
                    5 Yrs: {{ formatDate(absentsStore.visaStartDate) }} –
                    {{ formatDate(absentsStore.settlementTargetDate) }}
                  </p>
                </div>

                <v-chip
                  :color="absentsStore.ruleStatusColor"
                  size="medium"
                  variant="tonal"
                  class="font-weight-bold my-1 px-3"
                >
                  <v-icon
                    :icon="absentsStore.isRuleExceeded ? 'mdi-alert-circle' : 'mdi-check-circle'"
                    start
                  ></v-icon>
                  {{ absentsStore.isRuleExceeded ? 'ILR Exceeded' : 'ILR Compliant' }}
                </v-chip>
              </div>

              <v-row density="compact">
                <!-- 180-Day Rolling Rule -->
                <v-col cols="12" xl="6">
                  <v-card variant="outlined" class="pa-2 rounded-lg bg-surface">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <span class="text-caption font-weight-bold">180-Day Rolling Rule</span>
                      <v-chip
                        :color="absentsStore.ruleStatusColor"
                        size="x-small"
                        variant="flat"
                        class="font-weight-bold my-1"
                      >
                        {{ absentsStore.max12MonthAbsence }} / 180 Days
                      </v-chip>
                    </div>
                    <div class="text-caption text-medium-emphasis mb-1">
                      Max absent days in any 365-day rolling window.
                    </div>
                    <div
                      v-if="absentsStore.max12MonthAbsenceInfo.peakStartDate"
                      class="text-caption text-primary font-weight-medium"
                    >
                      Peak: {{ formatDate(absentsStore.max12MonthAbsenceInfo.peakStartDate) }} –
                      {{ formatDate(absentsStore.max12MonthAbsenceInfo.peakEndDate) }}
                    </div>
                  </v-card>
                </v-col>

                <!-- 5-Year Total Absences -->
                <v-col cols="12" xl="6">
                  <v-card variant="outlined" class="pa-2 rounded-lg bg-surface">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <span class="text-caption font-weight-bold">Total 5-Year Absences</span>
                      <v-chip
                        color="info"
                        size="x-small"
                        variant="tonal"
                        class="font-weight-bold my-1"
                      >
                        {{ absentsStore.ilr5YearTotalAbsence }} Days Total
                      </v-chip>
                    </div>
                    <div class="text-caption text-medium-emphasis">
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
                    <strong>Earliest ILR Application Date:</strong>
                  </span>
                  <strong class="text-subtitle-2 text-primary font-weight-bold">
                    {{ earliestIlrApplicationDate }} (28 days before 5 years)
                  </strong>
                </div>
              </v-alert>
            </v-card>

            <!-- SECTION 2: Naturalisation / Citizenship Card -->
            <v-card elevation="2" class="pa-3 rounded-lg">
              <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
                <div>
                  <div class="d-flex align-center mb-1">
                    <v-chip
                      color="success"
                      variant="flat"
                      size="medium"
                      class="font-weight-bold px-4 mb-1"
                    >
                      British Citizenship
                    </v-chip>
                  </div>
                  <p class="text-caption text-medium-emphasis mb-0 mt-1">
                    5 Yrs: {{ formatDate(absentsStore.naturalizationWindowStartDate) }} –
                    {{ formatDate(absentsStore.naturalizationTargetDate) }}
                  </p>
                </div>

                <v-chip
                  :color="absentsStore.naturalizationStatusColor"
                  size="medium"
                  variant="tonal"
                  class="font-weight-bold my-1 px-3"
                >
                  <v-icon
                    :icon="
                      absentsStore.isNaturalizationEligible
                        ? 'mdi-check-decagram'
                        : 'mdi-alert-decagram'
                    "
                    start
                  ></v-icon>
                  {{
                    absentsStore.isNaturalizationEligible
                      ? 'Citizenship Compliant'
                      : 'Citizenship Exceeded'
                  }}
                </v-chip>
              </div>

              <v-row density="compact">
                <!-- 5-Year Citizenship Limit (Max 450 Days) -->
                <v-col cols="12" xl="6">
                  <v-card variant="outlined" class="pa-2 rounded-lg bg-surface">
                    <div class="d-flex align-center justify-space-between mb-2">
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
                    <div class="text-caption text-medium-emphasis">
                      Total absent days in 5 yrs ending on naturalisation date.
                    </div>
                  </v-card>
                </v-col>

                <!-- Final 12-Month Limit (Max 90 Days) -->
                <v-col cols="12" xl="6">
                  <v-card variant="outlined" class="pa-2 rounded-lg bg-surface">
                    <div class="d-flex align-center justify-space-between mb-2">
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
                    <div class="text-caption text-medium-emphasis">
                      Total absent days in 12 months post-settlement.
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </v-card>
          </div>

          <!-- 2. Custom Date Range Calculator Card -->
          <v-card elevation="2" class="pa-3 rounded-lg">
            <v-card-title
              class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2"
            >
              <div class="d-flex align-center">
                <v-icon icon="mdi-calendar-range" color="primary" class="mr-2"></v-icon>
                <span class="text-h6 font-weight-bold">Custom Date Range Calculator</span>
              </div>
              <v-chip
                color="primary"
                variant="tonal"
                size="x-small"
                prepend-icon="mdi-lightning-bolt"
              >
                Instant Query
              </v-chip>
            </v-card-title>

            <v-card-subtitle class="px-0 text-caption text-medium-emphasis mb-4">
              Query total absent days within any custom interval across 10 years from Visa Start
              Date.
            </v-card-subtitle>

            <v-card-text class="px-0 pb-0">
              <v-row density="comfortable">
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="queryForm.startDate"
                    label="Query Start Date"
                    type="date"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-calendar-start-outline"
                    hide-details="auto"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="queryForm.endDate"
                    label="Query End Date"
                    type="date"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-calendar-end-outline"
                    hide-details="auto"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" class="mt-2">
                  <v-card
                    variant="flat"
                    color="primary"
                    class="pa-2 text-center rounded-lg d-flex align-center justify-space-between"
                  >
                    <span class="text-subtitle-2 font-weight-medium">Queried Range Absences:</span>
                    <span class="text-h5 font-weight-bold">{{ queriedRangeDays }} day(s)</span>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </template>
      </v-col>
    </v-row>

    <!-- Delete Single Confirmation Dialog -->
    <v-dialog v-model="deleteDialog.show" max-width="450">
      <v-card class="rounded-lg pa-3">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-alert-circle-outline" color="error" class="mr-2"></v-icon>
          Confirm Deletion
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete the absence record for
          <strong>"{{ deleteDialog.dest }}"</strong>?
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="deleteDialog.show = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="executeDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Clear All Confirmation Dialog -->
    <v-dialog v-model="clearAllDialog" max-width="450">
      <v-card class="rounded-lg pa-3">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-alert-triangle" color="warning" class="mr-2"></v-icon>
          Clear All Records?
        </v-card-title>
        <v-card-text>
          This action will permanently delete all logged absence records and reset your key visa &
          arrival dates. This cannot be undone.
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="clearAllDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="executeClearAll">Clear All</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Set / Edit Key Travel & Visa Dates Dialog -->
    <v-dialog v-model="visaDateDialog" max-width="540">
      <v-card class="rounded-lg pa-3">
        <v-card-title class="px-0 pt-0 d-flex align-center">
          <v-icon icon="mdi-calendar-edit" color="primary" class="mr-2"></v-icon>
          <span class="text-h6 font-weight-bold">Set Key Travel & Visa Dates</span>
        </v-card-title>
        <v-card-text class="px-0 py-4">
          <p class="text-body-2 text-medium-emphasis mb-4">
            Enter your 5-year BNO Visa Start Date and UK Arrival Date to enable accurate residency
            and settlement tracking.
          </p>
          <v-row density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="visaDateInput"
                label="BNO Visa Start Date"
                type="date"
                variant="outlined"
                prepend-inner-icon="mdi-calendar-start"
                hide-details="auto"
                required
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="arrivalDateInput"
                label="UK Arrival Date"
                type="date"
                variant="outlined"
                prepend-inner-icon="mdi-airplane-landing"
                hide-details="auto"
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

    <!-- Toast Notification Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      location="top right"
      rounded="pill"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn
          icon="mdi-close"
          variant="text"
          density="compact"
          @click="snackbar.show = false"
        ></v-btn>
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
