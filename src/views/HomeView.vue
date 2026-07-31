<script>
import { mapStores } from 'pinia'
import { useAbsentsStore, calculateDays } from '../stores/absents'

export default {
  name: 'HomeView',

  data() {
    return {
      defaultForm: {
        startDate: '',
        endDate: '',
        dest: '',
      },
      form: {
        startDate: '',
        endDate: '',
        dest: '',
      },
      editingId: null,
      snackbar: {
        show: false,
        text: '',
        color: 'success',
      },
      deleteDialog: {
        show: false,
        id: null,
        dest: '',
      },
      clearAllDialog: false,
      visaDateDialog: false,
      visaDateInput: '',
      arrivalDateInput: '',
      queryForm: {
        startDate: '',
        endDate: '',
      },
    }
  },

  computed: {
    // Generates this.absentsStore mapping to Pinia store
    ...mapStores(useAbsentsStore),

    dateRangeError() {
      if (!this.form.startDate || !this.form.endDate) return ''
      const start = new Date(this.form.startDate)
      const end = new Date(this.form.endDate)
      if (end < start) {
        return 'Return date cannot be earlier than departure date.'
      }
      return ''
    },

    calculatedDaysForForm() {
      if (!this.form.startDate || !this.form.endDate || this.dateRangeError) return 0
      return calculateDays(this.form.startDate, this.form.endDate)
    },

    isFormValid() {
      return Boolean(this.form.startDate && this.form.endDate && !this.dateRangeError)
    },

    totalDaysColor() {
      return this.absentsStore.ruleStatusColor
    },

    settlementTargetDate() {
      return this.formatDate(this.absentsStore.settlementTargetDate)
    },

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

    openVisaDateDialog() {
      this.visaDateInput = this.absentsStore.visaStartDate || ''
      this.arrivalDateInput = this.absentsStore.ukArrivalDate || ''
      this.visaDateDialog = true
    },

    saveVisaAndArrivalDates() {
      if (!this.visaDateInput) return
      this.absentsStore.setVisaAndArrivalDates({
        visaStartDate: this.visaDateInput,
        ukArrivalDate: this.arrivalDateInput,
      })
      this.visaDateDialog = false
      this.showSnackbar('Key Travel & Visa Dates saved successfully!', 'success')
    },

    handleSave() {
      if (!this.isFormValid) return

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
    },

    startEdit(item) {
      this.editingId = item.id
      this.form = {
        startDate: item.startDate,
        endDate: item.endDate,
        dest: item.dest || '',
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },

    cancelEdit() {
      this.resetForm()
    },

    resetForm() {
      this.editingId = null
      this.form = { ...this.defaultForm }
    },

    confirmDelete(item) {
      this.deleteDialog = {
        show: true,
        id: item.id,
        dest: item.dest || 'Unspecified destination',
      }
    },

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

    executeClearAll() {
      this.absentsStore.clearAbsences()
      this.clearAllDialog = false
      this.resetForm()
      this.showSnackbar('All absence records cleared', 'info')
    },

    showSnackbar(text, color = 'success') {
      this.snackbar = {
        show: true,
        text,
        color,
      }
    },

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

    getTodayStr() {
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    isFutureEvent(item) {
      if (!item || !item.startDate) return false
      return item.startDate > this.getTodayStr()
    },

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
        <v-card elevation="2" class="pa-6 rounded-lg bg-surface">
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
            type="info"
            variant="tonal"
            icon="mdi-information-outline"
            class="mt-4 text-caption"
            density="compact"
          >
            <strong>UK Absence Rule Notice:</strong> Under BNO 5+1 guidelines, departure (start) and
            arrival (end) dates are partially spent in the UK and are <strong>excluded</strong>.
            Only complete 24-hour days spent abroad are counted.
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
          <v-card v-else elevation="2" class="pa-5 rounded-lg bg-surface">
            <div class="d-flex align-center justify-space-between flex-wrap ga-4">
              <div class="d-flex align-center flex-wrap ga-6">
                <!-- BNO Visa Start Date -->
                <div class="d-flex align-center ga-3">
                  <v-icon icon="mdi-calendar-check" color="primary" size="large"></v-icon>
                  <div>
                    <div class="text-caption text-medium-emphasis">BNO Visa Start Date</div>
                    <div class="text-subtitle-1 font-weight-bold">
                      {{ formatDate(absentsStore.visaStartDate) }}
                      <span class="text-body-2 text-medium-emphasis font-weight-regular ml-2">
                        (5-Yr Target: <strong>{{ settlementTargetDate }}</strong
                        >)
                      </span>
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
        <v-card elevation="2" class="pa-6 rounded-lg">
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
                    :error-messages="dateRangeError"
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
                    :error-messages="dateRangeError"
                    required
                    hide-details="auto"
                  ></v-text-field>
                </v-col>
              </v-row>

              <!-- Form Days Calculation Badge & Actions -->
              <div class="d-flex align-center justify-space-between flex-wrap ga-4 mt-6">
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
            class="pa-4 d-flex align-center justify-space-between flex-wrap ga-2 border-b"
          >
            <div class="d-flex align-center flex-wrap ga-2">
              <v-icon icon="mdi-format-list-bulleted" color="primary" class="mr-1"></v-icon>
              <span class="text-h6 font-weight-bold">Absence Records</span>
              <v-chip size="small" color="primary" variant="tonal" class="font-weight-bold ml-1">
                {{ absentsStore.sortedAbsences.length }}
              </v-chip>
            </div>

            <v-btn
              v-if="absentsStore.absences.length > 0"
              color="error"
              variant="text"
              density="comfortable"
              prepend-icon="mdi-delete-sweep-outline"
              @click="clearAllDialog = true"
            >
              Clear All Records
            </v-btn>
          </v-card-title>

          <!-- Records Table -->
          <v-table v-if="absentsStore.sortedAbsences.length > 0" class="rounded-b-lg">
            <thead>
              <tr>
                <th class="text-left font-weight-bold">Destination / Purpose</th>
                <th class="text-left font-weight-bold">Departure Date</th>
                <th class="text-left font-weight-bold">Return Date</th>
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
                <td :class="{ 'text-medium-emphasis': isFutureEvent(item) }">
                  {{ formatDate(item.startDate) }}
                </td>
                <td :class="{ 'text-medium-emphasis': isFutureEvent(item) }">
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
                    size="small"
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
                    title="Edit Record"
                    @click="startEdit(item)"
                  ></v-btn>
                  <v-btn
                    icon="mdi-delete-outline"
                    variant="text"
                    color="error"
                    size="small"
                    title="Delete Record"
                    @click="confirmDelete(item)"
                  ></v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>

          <!-- Empty State -->
          <div v-else class="pa-12 text-center">
            <v-avatar color="surface-variant" size="80" class="mb-4">
              <v-icon icon="mdi-airplane-off" size="40" color="medium-emphasis"></v-icon>
            </v-avatar>
            <h3 class="text-h6 font-weight-bold mb-1">No Absence Records</h3>
            <p class="text-body-2 text-medium-emphasis mb-0">
              You haven't logged any travel absence records yet. Use the form above to add your
              first entry.
            </p>
          </div>
        </v-card>
      </v-col>

      <!-- RIGHT COLUMN (Takes up 5 cols on desktop) -->
      <v-col cols="12" md="5" class="pa-3 d-flex flex-column ga-6">
        <!-- Locked State Placeholder if Visa Date is Missing -->
        <v-card
          v-if="!absentsStore.isVisaDateSet"
          elevation="2"
          class="pa-8 rounded-lg text-center bg-surface border-dashed"
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
            <v-card elevation="2" class="pa-5 rounded-lg">
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
                  <v-card variant="outlined" class="pa-3 rounded-lg bg-surface">
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
                  <v-card variant="outlined" class="pa-3 rounded-lg bg-surface">
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
            </v-card>

            <!-- SECTION 2: Naturalisation / Citizenship Card -->
            <v-card elevation="2" class="pa-5 rounded-lg">
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
                  <v-card variant="outlined" class="pa-3 rounded-lg bg-surface">
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
                  <v-card variant="outlined" class="pa-3 rounded-lg bg-surface">
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
          <v-card elevation="2" class="pa-5 rounded-lg">
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
                    class="pa-3 text-center rounded-lg d-flex align-center justify-space-between"
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
      <v-card class="rounded-lg pa-4">
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
      <v-card class="rounded-lg pa-4">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-alert-triangle" color="warning" class="mr-2"></v-icon>
          Clear All Records?
        </v-card-title>
        <v-card-text>
          This action will permanently delete all logged absence records. This cannot be undone.
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="clearAllDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="executeClearAll">Clear All</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Set / Edit Key Travel & Visa Dates Dialog -->
    <v-dialog v-model="visaDateDialog" max-width="540">
      <v-card class="rounded-lg pa-6">
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
