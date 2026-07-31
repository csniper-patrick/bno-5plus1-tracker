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
      return Boolean(
        this.form.startDate &&
        this.form.endDate &&
        !this.dateRangeError
      )
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
        this.queryForm.endDate
      )
    },
  },

  methods: {
    calculateDays,

    openVisaDateDialog() {
      this.visaDateInput = this.absentsStore.visaStartDate || ''
      this.visaDateDialog = true
    },

    saveVisaStartDate() {
      if (!this.visaDateInput) return
      this.absentsStore.setVisaStartDate(this.visaDateInput)
      this.visaDateDialog = false
      this.showSnackbar('Visa Start Date saved successfully!', 'success')
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
  },
}
</script>

<template>
  <div>
    <!-- Header / Info Card -->
    <v-card elevation="3" class="pa-6 rounded-lg mb-6 bg-surface">
      <div class="d-flex align-center flex-wrap ga-4">
        <v-avatar color="primary" size="56" class="elevation-2">
          <v-icon icon="mdi-passport" size="32"></v-icon>
        </v-avatar>
        <div>
          <h1 class="text-h4 font-weight-bold">BNO 5+1 Absence Tracker</h1>
          <p class="text-subtitle-1 text-medium-emphasis mb-0">
            Log your trip departure and return dates to keep track of total days absent outside the UK.
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
        <strong>UK Absence Rule Notice:</strong> Under BNO 5+1 guidelines, departure (start) and arrival (end) dates are partially spent in the UK and are <strong>excluded</strong>. Only complete 24-hour days spent abroad are counted.
      </v-alert>
    </v-card>

    <!-- Visa Start Date Prompt Alert (If Missing) -->
    <v-alert
      v-if="!absentsStore.isVisaDateSet"
      type="warning"
      variant="tonal"
      prominent
      icon="mdi-calendar-alert"
      class="mb-6 rounded-lg"
    >
      <div class="d-flex align-center justify-space-between flex-wrap ga-4">
        <div>
          <h3 class="text-h6 font-weight-bold">BNO Visa Start Date Required</h3>
          <p class="text-body-2 mb-0">
            Please set your BNO Visa Start Date to calculate your 5-year residency path and settlement milestones accurately.
          </p>
        </div>
        <v-btn
          color="warning"
          variant="flat"
          prepend-icon="mdi-calendar-plus"
          @click="openVisaDateDialog"
        >
          Set Visa Start Date
        </v-btn>
      </div>
    </v-alert>

    <!-- Visa Start Date Info Bar (If Set) -->
    <v-card v-else elevation="3" class="pa-4 rounded-lg mb-6 bg-surface">
      <div class="d-flex align-center justify-space-between flex-wrap ga-3">
        <div class="d-flex align-center ga-3">
          <v-icon icon="mdi-calendar-check" color="primary" size="large"></v-icon>
          <div>
            <div class="text-caption text-medium-emphasis">BNO Visa Start Date</div>
            <div class="text-subtitle-1 font-weight-bold">
              {{ formatDate(absentsStore.visaStartDate) }}
              <span class="text-body-2 text-medium-emphasis font-weight-regular ml-2">
                (5-Year Target: <strong>{{ settlementTargetDate }}</strong>)
              </span>
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
          Edit Visa Date
        </v-btn>
      </div>
    </v-card>

    <!-- Condition Checker Container (Shown when Visa Date is Set) -->
    <div v-if="absentsStore.isVisaDateSet" class="mb-8">
      <!-- Section Header -->
      <h2 class="text-h5 font-weight-bold mb-4 d-flex align-center">
        <v-icon icon="mdi-shield-search" color="primary" class="mr-2"></v-icon>
        Residency Condition Checkers
      </h2>

      <!-- SECTION 1: ILR / Settlement Card -->
      <v-card elevation="3" class="pa-6 rounded-lg mb-6">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
          <div>
            <div class="d-flex align-center">
              <v-chip color="primary" variant="flat" size="small" class="font-weight-bold mr-3">Section 1</v-chip>
              <h3 class="text-h6 font-weight-bold">ILR / Indefinite Leave to Remain (Settlement)</h3>
            </div>
            <p class="text-caption text-medium-emphasis mb-0 mt-1">
              Period of Interest: <strong>5 Years from Visa Start Date</strong> ({{ formatDate(absentsStore.visaStartDate) }} – {{ formatDate(absentsStore.settlementTargetDate) }})
            </p>
          </div>

          <v-chip :color="absentsStore.ruleStatusColor" size="large" variant="tonal" class="font-weight-bold">
            <v-icon
              :icon="absentsStore.isRuleExceeded ? 'mdi-alert-circle' : 'mdi-check-circle'"
              start
            ></v-icon>
            {{ absentsStore.isRuleExceeded ? 'ILR Rule Exceeded' : 'ILR Requirement Compliant' }}
          </v-chip>
        </div>

        <v-row>
          <!-- 180-Day Rolling Rule -->
          <v-col cols="12" sm="6">
            <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-subtitle-2 font-weight-bold">180-Day Rolling Rule</span>
                <v-chip :color="absentsStore.ruleStatusColor" size="small" variant="flat" class="font-weight-bold">
                  {{ absentsStore.max12MonthAbsence }} / 180 Days
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis mb-1">
                Max absent days in any 365-day rolling window during 5-year visa duration.
              </div>
              <div v-if="absentsStore.max12MonthAbsenceInfo.peakStartDate" class="text-caption text-primary font-weight-medium">
                Peak 12-Mo Window: {{ formatDate(absentsStore.max12MonthAbsenceInfo.peakStartDate) }} – {{ formatDate(absentsStore.max12MonthAbsenceInfo.peakEndDate) }}
              </div>
            </v-card>
          </v-col>

          <!-- 5-Year Total Absences -->
          <v-col cols="12" sm="6">
            <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-subtitle-2 font-weight-bold">Total 5-Year Absences</span>
                <v-chip color="info" size="small" variant="tonal" class="font-weight-bold">
                  {{ absentsStore.ilr5YearTotalAbsence }} Days Total
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis">
                Total cumulative full days absent outside the UK over the entire 5-year visa route.
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-card>

      <!-- SECTION 2: Naturalisation / Citizenship Card -->
      <v-card elevation="3" class="pa-6 rounded-lg">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
          <div>
            <div class="d-flex align-center">
              <v-chip color="success" variant="flat" size="small" class="font-weight-bold mr-3">Section 2</v-chip>
              <h3 class="text-h6 font-weight-bold">British Citizenship (Naturalisation & Registration)</h3>
            </div>
            <p class="text-caption text-medium-emphasis mb-0 mt-1">
              Period of Interest: <strong>5-Year Period ending 1 Year after Settlement</strong> ({{ formatDate(absentsStore.naturalizationWindowStartDate) }} – {{ formatDate(absentsStore.naturalizationTargetDate) }})
            </p>
          </div>

          <v-chip :color="absentsStore.naturalizationStatusColor" size="large" variant="tonal" class="font-weight-bold">
            <v-icon
              :icon="absentsStore.isNaturalizationEligible ? 'mdi-check-decagram' : 'mdi-alert-decagram'"
              start
            ></v-icon>
            {{ absentsStore.isNaturalizationEligible ? 'Citizenship Requirement Compliant' : 'Citizenship Rule Exceeded' }}
          </v-chip>
        </div>

        <v-row>
          <!-- 5-Year Citizenship Limit (Max 450 Days) -->
          <v-col cols="12" sm="6">
            <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-subtitle-2 font-weight-bold">5-Year Absence Limit</span>
                <v-chip
                  :color="absentsStore.naturalization5YearAbsence > 450 ? 'error' : (absentsStore.naturalization5YearAbsence >= 380 ? 'warning' : 'success')"
                  size="small"
                  variant="flat"
                  class="font-weight-bold"
                >
                  {{ absentsStore.naturalization5YearAbsence }} / 450 Days
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis">
                Total absent days in the 5 years ending on naturalisation application date (Max 450 days).
              </div>
            </v-card>
          </v-col>

          <!-- Final 12-Month Limit (Max 90 Days) -->
          <v-col cols="12" sm="6">
            <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-subtitle-2 font-weight-bold">Final 12-Month Limit</span>
                <v-chip
                  :color="absentsStore.naturalizationFinal12MoAbsence > 90 ? 'error' : (absentsStore.naturalizationFinal12MoAbsence >= 75 ? 'warning' : 'success')"
                  size="small"
                  variant="flat"
                  class="font-weight-bold"
                >
                  {{ absentsStore.naturalizationFinal12MoAbsence }} / 90 Days
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis">
                Total absent days in the 12 months between settlement and naturalisation (Max 90 days).
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-card>
    </div>

    <!-- Input Form Card -->
    <v-card elevation="3" class="pa-6 rounded-lg mb-8">
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
            <v-col cols="12" md="4">
              <v-text-field
                v-model="form.dest"
                label="Destination / Notes"
                placeholder="e.g. Hong Kong, Japan Trip"
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
                label="Departure Date (Start Date)"
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
                label="Return Date (End Date)"
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

    <!-- Segment Tree Fast Range Query Tool Card -->
    <v-card v-if="absentsStore.isVisaDateSet" elevation="3" class="pa-6 rounded-lg mb-8">
      <v-card-title class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2">
        <div class="d-flex align-center">
          <v-icon icon="mdi-file-tree" color="primary" class="mr-2"></v-icon>
          <span class="text-h5 font-weight-bold">10-Year Segment Tree Range Query</span>
        </div>
        <v-chip color="primary" variant="tonal" size="small" prepend-icon="mdi-lightning-bolt">
          O(log N) Fast Query
        </v-chip>
      </v-card-title>

      <v-card-subtitle class="px-0 text-body-2 text-medium-emphasis mb-4">
        Query total absent days within any custom date interval across 10 years from your Visa Start Date.
      </v-card-subtitle>

      <v-card-text class="px-0 pb-0">
        <v-row>
          <v-col cols="12" sm="6" md="5">
            <v-text-field
              v-model="queryForm.startDate"
              label="Query Range Start Date"
              type="date"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-calendar-start-outline"
              hide-details="auto"
            ></v-text-field>
          </v-col>

          <v-col cols="12" sm="6" md="5">
            <v-text-field
              v-model="queryForm.endDate"
              label="Query Range End Date"
              type="date"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-calendar-end-outline"
              hide-details="auto"
            ></v-text-field>
          </v-col>

          <v-col cols="12" md="2" class="d-flex align-center">
            <v-card variant="flat" color="primary" class="pa-3 text-center w-100 rounded-lg">
              <div class="text-caption text-uppercase font-weight-medium">Absent Days</div>
              <div class="text-h4 font-weight-bold">{{ queriedRangeDays }}</div>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Absence Records List / Table Card -->
    <v-card elevation="3" class="rounded-lg">
      <v-card-title class="pa-4 d-flex align-center justify-space-between flex-wrap ga-2 border-b">
        <div class="d-flex align-center">
          <v-icon icon="mdi-format-list-bulleted" color="primary" class="mr-2"></v-icon>
          <span class="text-h6 font-weight-bold">Absence Records</span>
          <v-chip size="small" color="primary" variant="tonal" class="ml-3 font-weight-bold">
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
            :class="{ 'bg-action-hover': editingId === item.id }"
          >
            <td class="font-weight-medium">
              <div class="d-flex align-center">
                <v-icon icon="mdi-earth" size="small" color="primary" class="mr-2"></v-icon>
                <span>{{ item.dest || 'Unspecified' }}</span>
              </div>
            </td>
            <td>{{ formatDate(item.startDate) }}</td>
            <td>{{ formatDate(item.endDate) }}</td>
            <td class="text-center">
              <v-chip
                :color="calculateDays(item.startDate, item.endDate) > 0 ? 'primary' : 'grey'"
                size="small"
                variant="tonal"
                class="font-weight-bold"
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
          You haven't logged any travel absence records yet. Use the form above to add your first entry.
        </p>
      </div>
    </v-card>

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

    <!-- Set / Edit Visa Start Date Dialog -->
    <v-dialog v-model="visaDateDialog" max-width="500">
      <v-card class="rounded-lg pa-6">
        <v-card-title class="px-0 pt-0 d-flex align-center">
          <v-icon icon="mdi-calendar-edit" color="primary" class="mr-2"></v-icon>
          <span class="text-h6 font-weight-bold">Set BNO Visa Start Date</span>
        </v-card-title>
        <v-card-text class="px-0 py-4">
          <p class="text-body-2 text-medium-emphasis mb-4">
            Enter the start date of your 5-year BNO Visa to enable accurate residency and settlement tracking.
          </p>
          <v-text-field
            v-model="visaDateInput"
            label="Visa Start Date"
            type="date"
            variant="outlined"
            prepend-inner-icon="mdi-calendar-start"
            hide-details="auto"
            required
          ></v-text-field>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="visaDateDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!visaDateInput"
            @click="saveVisaStartDate"
          >
            Save Date
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
        <v-btn icon="mdi-close" variant="text" density="compact" @click="snackbar.show = false"></v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.bg-action-hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
