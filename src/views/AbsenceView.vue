<script>
import { mapStores } from 'pinia'
import { useAbsentsStore } from '../stores/absents'
import { useProfilesStore } from '../stores/profiles'
import {
  normalizeDate,
  calculateDays,
  getMaxSegmentTreeReturnDate,
  parseDateUTC,
  formatDateUTC,
} from '../utils/date'

import { useHead } from '@unhead/vue'
import { getSeoMeta } from '../utils/seo'

import AbsenceOverviewHeader from '../components/absence/AbsenceOverviewHeader.vue'
import AbsenceRuleStatusCards from '../components/absence/AbsenceRuleStatusCards.vue'
import AbsenceFormCard from '../components/absence/AbsenceFormCard.vue'
import DateRangeQueryCard from '../components/absence/DateRangeQueryCard.vue'
import AbsenceRecordsTable from '../components/absence/AbsenceRecordsTable.vue'
import AbsenceShareDialog from '../components/absence/AbsenceShareDialog.vue'
import KeyDatesDialog from '../components/absence/KeyDatesDialog.vue'

/**
 * AbsenceView Component
 *
 * Primary dashboard view for managing BNO 5+1 visa absence records.
 * Orchestrates modular subcomponents for BNO visa overview, 180-day rule status,
 * multi-stop trip editor, date range query tool, and absence records table.
 */
export default {
  name: 'AbsenceView',

  setup() {
    useHead(getSeoMeta('home'))
  },

  components: {
    AbsenceOverviewHeader,
    AbsenceRuleStatusCards,
    AbsenceFormCard,
    DateRangeQueryCard,
    AbsenceRecordsTable,
    AbsenceShareDialog,
    KeyDatesDialog,
  },

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

      /** Shared companion profiles dialog state */
      shareDialog: {
        show: false,
        record: null,
        selectedProfileIds: [],
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

      /** Table sort field: 'startDate' | 'days' | 'dest' | 'status' */
      tableSortBy: 'startDate',

      /** Table sort direction: 'asc' | 'desc' */
      tableSortOrder: 'asc',
    }
  },

  computed: {
    // Generates this.absentsStore and this.profilesStore mapping to Pinia store
    ...mapStores(useAbsentsStore, useProfilesStore),

    /**
     * List of other profiles (excluding the active profile).
     * @returns {Array}
     */
    otherProfiles() {
      if (!this.profilesStore || !Array.isArray(this.profilesStore.profilesList)) {
        return []
      }
      return this.profilesStore.profilesList.filter(
        (p) => p.id !== this.profilesStore.activeProfileId,
      )
    },

    /**
     * Whether multiple profiles exist.
     * @returns {boolean}
     */
    hasMultipleProfiles() {
      return this.otherProfiles.length > 0
    },

    /**
     * List of other profiles that are eligible to share the currently dialog-opened absence record.
     * @returns {Array}
     */
    eligibleShareProfiles() {
      if (!this.shareDialog?.record || !Array.isArray(this.otherProfiles)) {
        return []
      }
      return this.otherProfiles.filter((p) =>
        this.isProfileShareable(p.id, this.shareDialog.record),
      )
    },

    /**
     * Returns stored absences list sorted according to tableSortBy and tableSortOrder.
     * @returns {Array}
     */
    displayAbsences() {
      const list = [...this.absentsStore.sortedAbsences]
      const field = this.tableSortBy || 'startDate'
      const isAsc = this.tableSortOrder === 'asc'

      return list.sort((a, b) => {
        let valA, valB

        if (field === 'startDate') {
          valA = a.startDate || ''
          valB = b.startDate || ''
          const cmp = valA.localeCompare(valB)
          if (cmp !== 0) return isAsc ? cmp : -cmp
          return (a.endDate || '').localeCompare(b.endDate || '')
        } else if (field === 'days') {
          valA = calculateDays(a.startDate, a.endDate)
          valB = calculateDays(b.startDate, b.endDate)
          const cmp = isAsc ? valA - valB : valB - valA
          if (cmp !== 0) return cmp
          return (a.startDate || '').localeCompare(b.startDate || '')
        } else if (field === 'dest') {
          valA = (a.dest || '').toLowerCase()
          valB = (b.dest || '').toLowerCase()
          const cmp = valA.localeCompare(valB)
          if (cmp !== 0) return isAsc ? cmp : -cmp
          return (a.startDate || '').localeCompare(b.startDate || '')
        } else if (field === 'status') {
          const getStatusWeight = (item) => {
            if (item.isAutoArrival) return 0
            if (this.isOngoingEvent(item)) return 1
            if (this.isFutureEvent(item)) return 2
            return 3
          }
          valA = getStatusWeight(a)
          valB = getStatusWeight(b)
          const cmp = isAsc ? valA - valB : valB - valA
          if (cmp !== 0) return cmp
          return (a.startDate || '').localeCompare(b.startDate || '')
        }
        return 0
      })
    },

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
     * Minimum date boundary for custom range query start date.
     * @returns {string}
     */
    minQueryStartDate() {
      return this.absentsStore.visaStartDate || ''
    },

    /**
     * Minimum date boundary for custom range query end date.
     * @returns {string}
     */
    minQueryEndDate() {
      return this.queryForm.startDate || this.minQueryStartDate
    },

    /**
     * Validates start date in custom date range query tool.
     * @returns {string}
     */
    queryStartDateError() {
      if (!this.queryForm.startDate) return ''
      if (
        this.absentsStore.visaStartDate &&
        this.queryForm.startDate < this.absentsStore.visaStartDate
      ) {
        return this.$t('absence.start_date_err_vstart', {
          vStart: this.absentsStore.visaStartDate,
        })
      }
      if (this.queryForm.endDate && this.queryForm.startDate > this.queryForm.endDate) {
        return this.$t('absence.start_date_err_return')
      }
      return ''
    },

    /**
     * Validates end date in custom date range query tool.
     * @returns {string}
     */
    queryEndDateError() {
      if (!this.queryForm.endDate) return ''
      if (this.queryForm.startDate && this.queryForm.endDate < this.queryForm.startDate) {
        return this.$t('absence.end_date_err_departure')
      }
      if (this.maxSegmentTreeReturnDate && this.queryForm.endDate > this.maxSegmentTreeReturnDate) {
        return this.$t('absence.end_date_err_max', {
          maxReturn: this.maxSegmentTreeReturnDate,
        })
      }
      return ''
    },

    /**
     * Full days absent in the custom query date range.
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

  watch: {
    'absentsStore.visaStartDate': {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          if (!this.queryForm.startDate) {
            this.queryForm.startDate = newVal
          }
          if (!this.queryForm.endDate) {
            this.queryForm.endDate = this.maxSegmentTreeReturnDate
          }
        }
      },
    },
  },

  methods: {
    getTodayStr() {
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    isFutureEvent(item) {
      if (!item || !item.endDate) return false
      return item.endDate > this.getTodayStr()
    },

    isOngoingEvent(item) {
      if (!item || !item.startDate || !item.endDate) return false
      const today = this.getTodayStr()
      return item.startDate <= today && item.endDate >= today
    },

    /**
     * Opens Key Dates modal initialized with current store values.
     */
    openVisaDateDialog() {
      this.visaDateInput = this.absentsStore.visaStartDate || ''
      this.visaExpiryDateInput = this.absentsStore.visaExpiryDate || ''
      this.arrivalDateInput = this.absentsStore.ukArrivalDate || ''
      this.ilrApprovedDateInput = this.absentsStore.ilrApprovedDate || ''
      this.visaDateDialog = true
    },

    /**
     * Persists updated key dates into absents store.
     */
    saveVisaAndArrivalDates() {
      this.absentsStore.setVisaAndArrivalDates({
        visaStartDate: this.visaDateInput,
        visaExpiryDate: this.visaExpiryDateInput,
        ukArrivalDate: this.arrivalDateInput,
        ilrApprovedDate: this.ilrApprovedDateInput,
      })
      this.visaDateDialog = false
      this.showSnackbar(this.$t('absence.save_dates_success'), 'success')
    },

    /**
     * Resets the active record form back to empty state.
     */
    resetForm() {
      this.form = JSON.parse(JSON.stringify(this.defaultForm))
      this.editingId = null
    },

    /**
     * Inserts an intermediate stop node into the multi-stop timeline flow.
     */
    addStopNode() {
      if (!this.form.stops) {
        this.form.stops = [
          { date: '', dest: '' },
          { date: '', dest: '' },
        ]
        return
      }
      const insertIdx = this.form.stops.length - 1
      this.form.stops.splice(insertIdx, 0, { date: '', dest: '' })
    },

    /**
     * Removes an intermediate stop node from the multi-stop timeline flow.
     * @param {number} index - Index of stop to remove.
     */
    removeStopNode(index) {
      if (index > 0 && index < this.form.stops.length - 1) {
        this.form.stops.splice(index, 1)
      }
    },

    /**
     * Handles add/update form submission.
     */
    handleSave() {
      if (!this.isFormValid) return

      const stopsCopy = this.form.stops.map((s) => ({
        date: normalizeDate(s.date),
        dest: (s.dest || '').trim(),
      }))

      const sDate = stopsCopy[0].date
      const eDate = stopsCopy[stopsCopy.length - 1].date
      const summaryDest = this.formSummaryDest

      if (this.editingId) {
        this.absentsStore.updateAbsence({
          id: this.editingId,
          startDate: sDate,
          endDate: eDate,
          dest: summaryDest,
          stops: stopsCopy,
        })
        this.showSnackbar(this.$t('absence.record_updated_success'), 'success')
      } else {
        this.absentsStore.addAbsence({
          startDate: sDate,
          endDate: eDate,
          dest: summaryDest,
          stops: stopsCopy,
        })
        this.showSnackbar(this.$t('absence.record_added_success'), 'success')
      }

      this.resetForm()
    },

    /**
     * Populates form inputs with target absence record for editing.
     * @param {Object} item - Absence record.
     */
    startEdit(item) {
      this.editingId = item.id
      let stopsCopy
      if (Array.isArray(item.stops) && item.stops.length >= 2) {
        stopsCopy = item.stops.map((s) => ({ ...s }))
      } else {
        stopsCopy = [
          { date: item.startDate, dest: item.dest || '' },
          { date: item.endDate, dest: '' },
        ]
      }
      this.form = { stops: stopsCopy }

      this.$nextTick(() => {
        const editorEl = this.$refs.editorCard?.$el || this.$el.querySelector('.v-card')
        if (editorEl && typeof editorEl.scrollIntoView === 'function') {
          editorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      })
    },

    /**
     * Cancels active record edit mode and restores default form.
     */
    cancelEdit() {
      this.resetForm()
    },

    /**
     * Opens delete confirmation modal for a specific record.
     * @param {Object} item - Absence record.
     */
    confirmDelete(item) {
      this.deleteDialog = {
        show: true,
        id: item.id,
        dest: item.dest || `${item.startDate} – ${item.endDate}`,
      }
    },

    /**
     * Executes deletion of the confirmed record.
     */
    executeDelete() {
      if (this.deleteDialog.id) {
        if (this.editingId === this.deleteDialog.id) {
          this.resetForm()
        }
        this.absentsStore.deleteAbsence(this.deleteDialog.id)
        this.showSnackbar(this.$t('absence.record_deleted_success'), 'info')
      }
      this.deleteDialog.show = false
    },

    /**
     * Opens the shared with dialog for the given item.
     * @param {Object} item - Absence record object.
     */
    openShareDialog(item) {
      const currentShared = this.getSharedProfiles(item).map((p) => p.id)
      this.shareDialog = {
        show: true,
        record: item,
        selectedProfileIds: currentShared.filter((id) => this.isProfileShareable(id, item)),
      }
    },

    getSharedProfiles(item) {
      if (!item || !item.id || item.isAutoArrival || item.id === 'auto_uk_arrival_record') {
        return []
      }
      if (typeof this.profilesStore?.getProfilesSharingAbsence === 'function') {
        return this.profilesStore.getProfilesSharingAbsence(item.id)
      }
      return []
    },

    isProfileShareable(profileId, record = this.shareDialog?.record) {
      if (!profileId || !record || !record.startDate) return false
      const profilePayload = this.profilesStore?.profilesData?.[profileId]
      const visaStartDate = profilePayload?.visaStartDate || ''
      if (!visaStartDate) return false
      if (record.startDate < visaStartDate) return false
      const ukArrivalDate = profilePayload?.ukArrivalDate || ''
      if (ukArrivalDate && record.startDate < ukArrivalDate) return false
      return true
    },

    toggleSelectAllProfiles() {
      const eligibleIds = this.eligibleShareProfiles.map((p) => p.id)
      if (eligibleIds.length === 0) return

      const allEligibleSelected = eligibleIds.every((id) =>
        this.shareDialog.selectedProfileIds.includes(id),
      )
      if (allEligibleSelected) {
        this.shareDialog.selectedProfileIds = this.shareDialog.selectedProfileIds.filter(
          (id) => !eligibleIds.includes(id),
        )
      } else {
        this.shareDialog.selectedProfileIds = Array.from(
          new Set([...this.shareDialog.selectedProfileIds, ...eligibleIds]),
        )
      }
    },

    toggleProfileSelection(profileId) {
      if (!this.isProfileShareable(profileId, this.shareDialog?.record)) return
      const idx = this.shareDialog.selectedProfileIds.indexOf(profileId)
      if (idx !== -1) {
        this.shareDialog.selectedProfileIds.splice(idx, 1)
      } else {
        this.shareDialog.selectedProfileIds.push(profileId)
      }
    },

    async saveSharedProfiles() {
      if (!this.shareDialog.record) return

      const targetIds = this.shareDialog.selectedProfileIds.filter((id) =>
        this.isProfileShareable(id, this.shareDialog.record),
      )
      const recordToSync = this.shareDialog.record

      const result = await this.profilesStore.syncSharedAbsenceProfiles(recordToSync, targetIds)

      this.shareDialog.show = false

      if (result && result.success) {
        if (targetIds.length === 0) {
          this.showSnackbar(this.$t('absence.copy_record_cleared'), 'info')
        } else if (targetIds.length === 1) {
          const targetMeta = this.otherProfiles.find((p) => p.id === targetIds[0])
          const targetName = targetMeta ? targetMeta.name : ''
          this.showSnackbar(this.$t('absence.copy_record_success', { name: targetName }), 'success')
        } else {
          this.showSnackbar(
            this.$t('absence.copy_record_multi_success', { count: targetIds.length }),
            'success',
          )
        }
      } else {
        this.showSnackbar('Failed to update shared companion profiles.', 'error')
      }
    },

    sortByColumn(field) {
      if (this.tableSortBy === field) {
        this.tableSortOrder = this.tableSortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        this.tableSortBy = field
        this.tableSortOrder = 'asc'
      }
    },

    resetQueryDateRangeToMax() {
      this.queryForm.startDate = this.absentsStore.visaStartDate || ''
      this.queryForm.endDate = this.maxSegmentTreeReturnDate || ''
    },

    showSnackbar(text, color = 'success') {
      this.snackbar = {
        show: true,
        text,
        color,
      }
    },
  },
}
</script>

<template>
  <div>
    <!-- 1. Absence Tracker Title Card & BNO Visa Overview Header Row -->
    <v-row density="default">
      <AbsenceOverviewHeader @open-visa-dialog="openVisaDateDialog" />

      <!-- 2. ILR / Settlement | British Citizenship -->
      <AbsenceRuleStatusCards />

      <!-- 3. Add Absence Record & Custom Date Range Row (1/3 width on wide screen) -->
      <v-col cols="12" lg="4" order-lg="2" class="d-flex flex-column ga-6">
        <AbsenceFormCard
          ref="editorCard"
          :form="form"
          :editing-id="editingId"
          :start-date-error="startDateError"
          :end-date-error="endDateError"
          :node-date-error="nodeDateError"
          :date-range-error="dateRangeError"
          :calculated-days-for-form="calculatedDaysForForm"
          :is-form-valid="isFormValid"
          :start-date="startDate"
          :end-date="endDate"
          @save="handleSave"
          @cancel-edit="cancelEdit"
          @add-stop="addStopNode"
          @remove-stop="removeStopNode"
        />

        <DateRangeQueryCard
          :query-form="queryForm"
          :queried-range-days="queriedRangeDays"
          :min-query-start-date="minQueryStartDate"
          :min-query-end-date="minQueryEndDate"
          :max-segment-tree-return-date="maxSegmentTreeReturnDate"
          :query-start-date-error="queryStartDateError"
          :query-end-date-error="queryEndDateError"
          @reset-max-range="resetQueryDateRangeToMax"
        />
      </v-col>

      <!-- 4. Absence Records (2/3 width on wide screen) -->
      <v-col cols="12" lg="8" order-lg="1">
        <AbsenceRecordsTable
          :display-absences="displayAbsences"
          :editing-id="editingId"
          :timeline-view-mode="timelineViewMode"
          :table-sort-by="tableSortBy"
          :table-sort-order="tableSortOrder"
          :has-multiple-profiles="hasMultipleProfiles"
          @sort="sortByColumn"
          @update:timeline-view-mode="timelineViewMode = $event"
          @edit="startEdit"
          @share="openShareDialog"
          @delete="confirmDelete"
        />
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
          <v-btn variant="text" @click="deleteDialog.show = false">{{
            $t('absence.cancel')
          }}</v-btn>
          <v-btn color="error" variant="flat" @click="executeDelete">{{
            $t('absence.delete_confirm')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Share Record with Other Profiles Dialog -->
    <AbsenceShareDialog
      v-model="shareDialog.show"
      :record="shareDialog.record"
      :other-profiles="otherProfiles"
      :selected-profile-ids="shareDialog.selectedProfileIds"
      @toggle-select-all="toggleSelectAllProfiles"
      @toggle-profile-selection="toggleProfileSelection"
      @save="saveSharedProfiles"
    />

    <!-- Set / Edit Key Travel & Visa Dates Dialog -->
    <KeyDatesDialog
      v-model="visaDateDialog"
      v-model:visa-date-input="visaDateInput"
      v-model:visa-expiry-date-input="visaExpiryDateInput"
      v-model:arrival-date-input="arrivalDateInput"
      v-model:ilr-approved-date-input="ilrApprovedDateInput"
      @save="saveVisaAndArrivalDates"
    />

    <!-- Global Snackbar Notification -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      location="bottom end"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">{{
          $t('app.close')
        }}</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>
