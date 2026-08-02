<script>
import { mapStores } from 'pinia'
import { useDocumentsStore } from '../stores/documents'
import { useAbsentsStore } from '../stores/absents'

export default {
  name: 'DocumentView',

  data() {
    return {
      // Active expansion panel for years 1-5 (default open Year 1)
      activeYearPanel: [0],

      // Life in UK Form State
      lifeForm: {
        status: 'not_started',
        testDate: '',
        urn: '',
        testCenter: '',
        notes: '',
      },

      // English Test Form State
      englishForm: {
        type: 'b1_selt',
        provider: 'Trinity College London',
        status: 'not_started',
        referenceNo: '',
        testDate: '',
        notes: '',
      },

      // Custom document dialog state
      customDocDialog: {
        show: false,
        year: 1,
        title: '',
        category: 'Housing & Utilities',
      },

      // Notes edit dialog state
      notesDialog: {
        show: false,
        year: 1,
        itemId: null,
        title: '',
        notes: '',
      },

      // Address Form Dialog State
      addressDialog: {
        show: false,
        editingId: null,
        form: {
          addressLine1: '',
          addressLine2: '',
          city: '',
          postcode: '',
          startDate: '',
          endDate: '',
          isCurrent: true,
          housingStatus: 'rented',
          notes: '',
        },
      },

      // Delete Address Confirmation Dialog
      deleteAddressDialog: {
        show: false,
        id: null,
        addressLine1: '',
      },

      // Snackbar state
      snackbar: {
        show: false,
        text: '',
        color: 'success',
      },

      // Category options for custom document creation
      categoryOptions: [
        'Official Housing',
        'Tax & Income',
        'Financial',
        'Housing',
        'Utilities',
        'Education & Employment',
        'Medical & Insurance',
        'Custom Evidence',
      ],

      // Housing status options
      housingStatusOptions: [
        { title: 'Rented (Private / Social)', value: 'rented' },
        { title: 'Owned / Mortgage', value: 'owned' },
        { title: 'Living with Family / Friends', value: 'family' },
        { title: 'Student Accommodation', value: 'student' },
        { title: 'Other', value: 'other' },
      ],
    }
  },

  computed: {
    ...mapStores(useDocumentsStore, useAbsentsStore),

    lifeInUk() {
      return this.documentsStore.lifeInUk
    },

    englishTest() {
      return this.documentsStore.englishTest
    },

    residenceChecklist() {
      return this.documentsStore.residenceChecklist
    },

    addressHistory() {
      return this.documentsStore.addressHistory
    },

    residenceStats() {
      return this.documentsStore.residenceStats
    },

    overallReadinessPercent() {
      return this.documentsStore.overallReadinessPercent
    },
  },

  mounted() {
    this.syncFormsFromStore()
  },

  methods: {
    /**
     * Initializes component form models from active Pinia store state.
     */
    syncFormsFromStore() {
      this.lifeForm = { ...this.documentsStore.lifeInUk }
      this.englishForm = { ...this.documentsStore.englishTest }
    },

    /**
     * Displays a snackbar notification with specified text message and theme color.
     * @param {string} text - Snackbar message.
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
     * Saves updated Life in the UK test details to the Pinia documents store.
     */
    saveLifeInUk() {
      this.documentsStore.updateLifeInUk(this.lifeForm)
      this.showSnackbar('Life in the UK Test details saved!', 'success')
    },

    /**
     * Saves updated English Language qualification details to the Pinia documents store.
     */
    saveEnglishTest() {
      this.documentsStore.updateEnglishTest(this.englishForm)
      this.showSnackbar('English Language requirement details saved!', 'success')
    },

    /**
     * Updates collection status for a specific evidence item in the 5-year checklist.
     * @param {number} year - Residence year (1 to 5).
     * @param {string} itemId - Evidence item ID.
     * @param {string} newStatus - New status ('pending' | 'collected' | 'verified').
     */
    updateItemStatus(year, itemId, newStatus) {
      this.documentsStore.updateDocumentItem(year, itemId, { status: newStatus })
      this.showSnackbar('Document status updated!', 'info')
    },

    /**
     * Opens custom document item creation dialog for a target residence year.
     * @param {number} year - Residence year (1 to 5).
     */
    openCustomDocDialog(year) {
      this.customDocDialog = {
        show: true,
        year,
        title: '',
        category: 'Custom Evidence',
      }
    },

    /**
     * Saves a new custom evidence item to the Pinia documents store.
     */
    saveCustomDocument() {
      if (!this.customDocDialog.title.trim()) return
      this.documentsStore.addCustomDocumentItem(this.customDocDialog.year, {
        title: this.customDocDialog.title,
        category: this.customDocDialog.category,
      })
      this.customDocDialog.show = false
      this.showSnackbar('Custom evidence item added!', 'success')
    },

    /**
     * Removes a custom evidence item from a residence year checklist.
     * @param {number} year - Residence year (1 to 5).
     * @param {string} itemId - Item ID to delete.
     */
    deleteDocItem(year, itemId) {
      this.documentsStore.deleteDocumentItem(year, itemId)
      this.showSnackbar('Item removed.', 'warning')
    },

    /**
     * Opens notes editor dialog modal for a specific evidence item.
     * @param {number} year - Residence year (1 to 5).
     * @param {Object} item - Evidence item object.
     */
    openNotesDialog(year, item) {
      this.notesDialog = {
        show: true,
        year,
        itemId: item.id,
        title: item.title,
        notes: item.notes || '',
      }
    },

    /**
     * Saves edited notes for an evidence item to the Pinia store.
     */
    saveItemNotes() {
      this.documentsStore.updateDocumentItem(
        this.notesDialog.year,
        this.notesDialog.itemId,
        { notes: this.notesDialog.notes }
      )
      this.notesDialog.show = false
      this.showSnackbar('Document notes saved!', 'success')
    },

    /**
     * Opens modal dialog to add a new UK residential address entry.
     */
    openAddAddressDialog() {
      this.addressDialog = {
        show: true,
        editingId: null,
        form: {
          addressLine1: '',
          addressLine2: '',
          city: '',
          postcode: '',
          startDate: '',
          endDate: '',
          isCurrent: this.addressHistory.length === 0,
          housingStatus: 'rented',
          notes: '',
        },
      }
    },

    /**
     * Opens modal dialog to edit an existing UK address entry.
     * @param {Object} item - Address record object.
     */
    openEditAddressDialog(item) {
      this.addressDialog = {
        show: true,
        editingId: item.id,
        form: {
          addressLine1: item.addressLine1 || '',
          addressLine2: item.addressLine2 || '',
          city: item.city || '',
          postcode: item.postcode || '',
          startDate: item.startDate || '',
          endDate: item.endDate || '',
          isCurrent: !!item.isCurrent,
          housingStatus: item.housingStatus || 'rented',
          notes: item.notes || '',
        },
      }
    },

    /**
     * Submits address form to add or update an entry in the Pinia documents store.
     */
    saveAddress() {
      if (!this.addressDialog.form.addressLine1.trim() || !this.addressDialog.form.startDate) {
        this.showSnackbar('Please enter Address Line 1 and Move-In Date.', 'error')
        return
      }

      if (this.addressDialog.editingId) {
        this.documentsStore.updateAddress(
          this.addressDialog.editingId,
          this.addressDialog.form
        )
        this.showSnackbar('UK Address entry updated!', 'success')
      } else {
        this.documentsStore.addAddress(this.addressDialog.form)
        this.showSnackbar('UK Address entry added!', 'success')
      }

      this.addressDialog.show = false
    },

    /**
     * Opens delete confirmation dialog for a UK address record.
     * @param {Object} item - Address record object.
     */
    openDeleteAddressDialog(item) {
      this.deleteAddressDialog = {
        show: true,
        id: item.id,
        addressLine1: item.addressLine1,
      }
    },

    /**
     * Confirms deletion and removes the selected address entry from store.
     */
    executeDeleteAddress() {
      if (!this.deleteAddressDialog.id) return
      this.documentsStore.deleteAddress(this.deleteAddressDialog.id)
      this.deleteAddressDialog.show = false
      this.showSnackbar('Address record deleted.', 'warning')
    },

    /**
     * Returns appropriate Vuetify theme color for a status string.
     * @param {string} status - Qualification or evidence item status.
     * @returns {string} Theme color name.
     */
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

    /**
     * Converts status code into human-readable text label.
     * @param {string} status - Status key string.
     * @returns {string} Human readable text.
     */
    getStatusText(status) {
      switch (status) {
        case 'verified':
          return 'Verified'
        case 'collected':
          return 'Collected'
        case 'pending':
          return 'Pending'
        case 'passed':
          return 'Passed'
        case 'scheduled':
          return 'Scheduled'
        case 'not_started':
          return 'Not Started'
        default:
          return status
      }
    },

    /**
     * Converts housing status key into human-readable tenure description.
     * @param {string} status - Housing status code.
     * @returns {string} Tenure description.
     */
    getHousingStatusText(status) {
      switch (status) {
        case 'rented':
          return 'Rented'
        case 'owned':
          return 'Owned'
        case 'family':
          return 'Living with Family'
        case 'student':
          return 'Student'
        default:
          return status || 'Rented'
      }
    },

    /**
     * Calculates estimated date range string for each of the 5 residence years.
     * @param {number} year - Residence year (1 to 5).
     * @returns {string} Formatted date range string (YYYY-MM-DD to YYYY-MM-DD).
     */
    getYearDateRangeHint(year) {
      const baseDateStr = this.absentsStore.ukArrivalDate || this.absentsStore.visaStartDate
      if (!baseDateStr) return `Year ${year}`

      const start = new Date(baseDateStr)
      if (isNaN(start.getTime())) return `Year ${year}`

      const yearStart = new Date(start)
      yearStart.setFullYear(start.getFullYear() + (year - 1))

      const yearEnd = new Date(start)
      yearEnd.setFullYear(start.getFullYear() + year)
      yearEnd.setDate(yearEnd.getDate() - 1)

      const formatDate = d => d.toISOString().split('T')[0]
      return `${formatDate(yearStart)} to ${formatDate(yearEnd)}`
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
  },
}
</script>

<template>
  <div>
    <!-- Page Header & Overview -->
    <v-card elevation="2" class="pa-3 rounded-lg bg-surface mb-6">
      <v-card-title class="px-0 pt-0 d-flex align-center flex-wrap ga-2">
        <div class="d-flex align-center">
          <v-icon icon="mdi-file-document-check-outline" color="primary" class="mr-2"></v-icon>
          <span class="text-h5 font-weight-bold">Document & Qualification Tracker</span>
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
        Manage your <strong>Life in the UK Test</strong>, <strong>English B1 Qualification</strong>, <strong>5-Year Residence Proof</strong>, and <strong>UK Address History Log</strong> for ILR & Citizenship. (Unofficial 3rd-Party Tool)
      </p>

      <v-alert
        type="info"
        variant="tonal"
        icon="mdi-shield-lock-outline"
        class="mt-3 text-caption"
        density="compact"
      >
        <strong>Local Storage Notice:</strong> All data input (test certificates, reference numbers, address history, checklists) is saved strictly locally on your device in browser <code>localStorage</code>. No data is uploaded or transmitted to external servers.
      </v-alert>

      <v-alert
        type="warning"
        variant="tonal"
        icon="mdi-alert-circle-outline"
        class="mt-2 text-caption"
        density="compact"
      >
        <strong>Unofficial 3rd-Party Application:</strong> Provided for personal tracking only. Not affiliated with or endorsed by the UK Home Office or UK Government. Always verify requirements against official UK Home Office guidance before applying.
      </v-alert>

      <!-- Overall Readiness Metric Banner -->
      <v-divider class="my-4"></v-divider>

      <v-row class="align-center">
        <v-col cols="12" md="4" class="text-center text-md-left">
          <div class="text-overline text-medium-emphasis mb-1">Overall ILR Document Readiness</div>
          <div class="d-flex align-center justify-center justify-md-start ga-3">
            <v-progress-circular
              :model-value="overallReadinessPercent"
              size="64"
              width="7"
              color="primary"
            >
              <span class="font-weight-bold text-caption">{{ overallReadinessPercent }}%</span>
            </v-progress-circular>
            <div>
              <div class="text-h6 font-weight-bold">
                {{ overallReadinessPercent === 100 ? 'Ready for Application 🎉' : 'In Progress' }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ residenceStats.collectedItems }} of {{ residenceStats.totalItems }} proof items collected
              </div>
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="8">
          <v-row density="compact">
            <!-- Life in UK Quick Summary -->
            <v-col cols="12" sm="3">
              <v-card variant="tonal" :color="getStatusColor(lifeInUk.status)" class="pa-3 rounded-lg">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">Life in the UK</span>
                  <v-icon icon="mdi-book-education-outline" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ getStatusText(lifeInUk.status) }}
                </div>
              </v-card>
            </v-col>

            <!-- English B1 Quick Summary -->
            <v-col cols="12" sm="3">
              <v-card variant="tonal" :color="getStatusColor(englishTest.status)" class="pa-3 rounded-lg">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">English B1</span>
                  <v-icon icon="mdi-translate" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ englishTest.type === 'exempt' ? 'Exempt' : getStatusText(englishTest.status) }}
                </div>
              </v-card>
            </v-col>

            <!-- Residence Proof Quick Summary -->
            <v-col cols="12" sm="3">
              <v-card variant="tonal" color="primary" class="pa-3 rounded-lg">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">5-Yr Proof</span>
                  <v-icon icon="mdi-folder-check-outline" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ residenceStats.overallPercent }}% Done
                </div>
              </v-card>
            </v-col>

            <!-- Address History Quick Summary -->
            <v-col cols="12" sm="3">
              <v-card variant="tonal" :color="addressHistory.length > 0 ? 'success' : 'grey'" class="pa-3 rounded-lg">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">UK Addresses</span>
                  <v-icon icon="mdi-home-city-outline" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ addressHistory.length }} Logged
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-card>

    <!-- Qualifications Section -->
    <v-row class="mb-6">
      <!-- Life in the UK Card -->
      <v-col cols="12" md="6">
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
          <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
            <v-icon icon="mdi-book-open-page-variant" color="primary"></v-icon>
            <span class="text-h5 font-weight-bold">Life in the UK Test</span>
            <v-spacer></v-spacer>
            <v-chip :color="getStatusColor(lifeForm.status)" size="small" variant="flat" class="font-weight-bold">
              {{ getStatusText(lifeForm.status) }}
            </v-chip>
          </v-card-title>
          <v-card-text class="px-0 pb-0">
            <p class="text-caption text-medium-emphasis mb-4">
              Mandatory test on British customs, history, and government for ILR & Naturalisation applications.
            </p>

            <div class="mb-4">
              <label class="text-caption font-weight-bold d-block mb-1">Test Status</label>
              <v-btn-toggle
                v-model="lifeForm.status"
                mandatory
                color="primary"
                density="compact"
                class="w-100"
                @update:model-value="saveLifeInUk"
              >
                <v-btn value="not_started" class="flex-grow-1" size="small">Not Started</v-btn>
                <v-btn value="scheduled" class="flex-grow-1" size="small">Scheduled</v-btn>
                <v-btn value="passed" class="flex-grow-1" color="success" size="small">Passed</v-btn>
              </v-btn-toggle>
            </div>

            <v-row density="compact">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="lifeForm.testDate"
                  label="Test Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                  @change="saveLifeInUk"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="lifeForm.urn"
                  label="Unique Reference Number (URN)"
                  placeholder="e.g. LITUK1234567"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                  @change="saveLifeInUk"
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="lifeForm.testCenter"
                  label="Test Center Location"
                  placeholder="e.g. London PSI Test Centre"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                  @change="saveLifeInUk"
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="lifeForm.notes"
                  label="Notes / Certificate Reference"
                  placeholder="Add notes, pass certificate location, or booking details..."
                  variant="outlined"
                  density="compact"
                  rows="2"
                  hide-details="auto"
                  @change="saveLifeInUk"
                ></v-textarea>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- English Language Requirement Card -->
      <v-col cols="12" md="6">
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
          <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
            <v-icon icon="mdi-translate" color="primary"></v-icon>
            <span class="text-h5 font-weight-bold">English Language (B1)</span>
            <v-spacer></v-spacer>
            <v-chip :color="getStatusColor(englishForm.status)" size="small" variant="flat" class="font-weight-bold">
              {{ englishForm.type === 'exempt' ? 'Exempt' : getStatusText(englishForm.status) }}
            </v-chip>
          </v-card-title>
          <v-card-text class="px-0 pb-0">
            <p class="text-caption text-medium-emphasis mb-4">
              Requires B1 SELT test, UK degree taught in English, or official exemption.
            </p>

            <v-row density="compact">
              <v-col cols="12" sm="6">
                <v-select
                  v-model="englishForm.type"
                  :items="[
                    { title: 'B1 SELT Speaking & Listening Test', value: 'b1_selt' },
                    { title: 'UK Degree / Degree Taught in English', value: 'uk_degree' },
                    { title: 'Ecctis / ENIC Statement', value: 'enic_statement' },
                    { title: 'Exemption (Age 65+ / Medical)', value: 'exempt' }
                  ]"
                  label="Qualification Pathway"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                  @update:model-value="saveEnglishTest"
                ></v-select>
              </v-col>

              <v-col cols="12" sm="6">
                <v-select
                  v-model="englishForm.provider"
                  :items="['Trinity College London', 'IELTS SELT Consortium', 'LanguageCert', 'Pearson (PTE Academic UKVI)', 'PSI Services (UKVI)', 'Other']"
                  label="Test Provider / Institution"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                  @update:model-value="saveEnglishTest"
                ></v-select>
              </v-col>
            </v-row>

            <div class="mb-4" v-if="englishForm.type !== 'exempt'">
              <label class="text-caption font-weight-bold d-block mb-1">Status</label>
              <v-btn-toggle
                v-model="englishForm.status"
                mandatory
                color="primary"
                density="compact"
                class="w-100"
                @update:model-value="saveEnglishTest"
              >
                <v-btn value="not_started" class="flex-grow-1" size="small">Not Started</v-btn>
                <v-btn value="scheduled" class="flex-grow-1" size="small">Scheduled</v-btn>
                <v-btn value="passed" class="flex-grow-1" color="success" size="small">Passed / Verified</v-btn>
              </v-btn-toggle>
            </div>

            <v-row density="compact">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="englishForm.testDate"
                  label="Test / Award Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                  @change="saveEnglishTest"
                ></v-text-field>
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="englishForm.referenceNo"
                  label="Certificate / SELT Ref No."
                  placeholder="e.g. TCL/123456/2026"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                  @change="saveEnglishTest"
                ></v-text-field>
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="englishForm.notes"
                  label="Notes / Evidence Location"
                  placeholder="Add reference details, certificate link, or verification note..."
                  variant="outlined"
                  density="compact"
                  rows="2"
                  hide-details="auto"
                  @change="saveEnglishTest"
                ></v-textarea>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- UK Address History Section -->
    <v-card elevation="2" class="pa-3 rounded-lg bg-surface mb-6">
      <v-card-title class="px-0 pt-0 d-flex align-center justify-space-between flex-wrap ga-2">
        <div class="d-flex align-center ga-2">
          <v-icon icon="mdi-home-city-outline" color="primary"></v-icon>
          <span class="text-h5 font-weight-bold">UK Address History</span>
          <v-chip size="x-small" color="info" variant="tonal" class="font-weight-medium">Optional - Reference Only</v-chip>
        </div>

        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          size="small"
          @click="openAddAddressDialog"
        >
          Add Address Entry
        </v-btn>
      </v-card-title>

      <v-card-text class="px-0 pb-0">
        <p class="text-caption text-medium-emphasis mb-4">
          Reference record for Home Office SET(O) ILR & Naturalisation applications covering your 5-year UK residence.
        </p>

        <div v-if="addressHistory.length === 0" class="text-center py-6 text-medium-emphasis">
          <v-icon icon="mdi-map-marker-off-outline" size="large" class="mb-2"></v-icon>
          <div class="text-subtitle-2 font-weight-bold">No UK addresses logged yet.</div>
          <div class="text-caption">Click "Add Address Entry" above to log your residential history.</div>
        </div>

        <v-table v-else density="comfortable" hover class="border rounded-lg">
          <thead>
            <tr>
              <th class="text-left font-weight-bold">Move-In Date</th>
              <th class="text-left font-weight-bold">Move-Out Date</th>
              <th class="text-left font-weight-bold">Address</th>
              <th class="text-left font-weight-bold d-none d-sm-table-cell">Tenure</th>
              <th class="text-left font-weight-bold d-none d-md-table-cell">Notes</th>
              <th class="text-right font-weight-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in addressHistory" :key="item.id">
              <td class="text-left" style="white-space: nowrap;">
                <v-chip
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-calendar-import"
                  class="font-weight-medium"
                >
                  {{ formatDate(item.startDate) }}
                </v-chip>
              </td>

              <td class="text-left" style="white-space: nowrap;">
                <v-chip
                  v-if="item.isCurrent"
                  size="small"
                  variant="flat"
                  color="success"
                  prepend-icon="mdi-home-clock-outline"
                  class="font-weight-bold"
                >
                  Present
                </v-chip>
                <v-chip
                  v-else
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-calendar-export"
                  class="font-weight-medium"
                >
                  {{ formatDate(item.endDate) }}
                </v-chip>
              </td>

              <td>
                <div class="font-weight-medium text-body-2">
                  {{ item.addressLine1 }}{{ item.addressLine2 ? `, ${item.addressLine2}` : '' }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.city ? `${item.city}, ` : '' }}{{ item.postcode }}
                </div>
              </td>

              <td class="d-none d-sm-table-cell" style="width: 150px;">
                <v-chip size="small" variant="tonal" color="secondary">
                  {{ getHousingStatusText(item.housingStatus) }}
                </v-chip>
              </td>

              <td class="d-none d-md-table-cell text-caption text-medium-emphasis" style="max-width: 200px;">
                <div class="text-truncate">
                  {{ item.notes || 'No notes' }}
                </div>
              </td>

              <td class="text-right">
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
                      title="Edit Address"
                      @click="openEditAddressDialog(item)"
                    ></v-list-item>
                    <v-list-item
                      prepend-icon="mdi-delete-outline"
                      title="Delete Address"
                      @click="openDeleteAddressDialog(item)"
                    ></v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- 5-Year Continuous Residence Evidence Checklist -->
    <v-card elevation="2" class="pa-3 rounded-lg bg-surface">
      <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
        <v-icon icon="mdi-shield-home-outline" color="primary"></v-icon>
        <span class="text-h5 font-weight-bold">5-Year Residence Evidence</span>
      </v-card-title>

      <v-card-text class="px-0 pb-0">
        <p class="text-caption text-medium-emphasis mb-4">
          Proof of presence in the UK for every year of the 5-year qualifying period.
        </p>
        <v-expansion-panels v-model="activeYearPanel" multiple class="mt-3 border rounded-lg overflow-hidden">
          <v-expansion-panel
            v-for="year in [1, 2, 3, 4, 5]"
            :key="year"
            elevation="0"
            class="border-b"
          >
            <v-expansion-panel-title class="py-3 px-4">
              <div class="d-flex align-center justify-space-between w-100 pr-2 ga-3">
                <div class="d-flex align-center ga-3">
                  <v-avatar color="primary" variant="tonal" size="36" class="font-weight-bold">
                    Y{{ year }}
                  </v-avatar>
                  <div>
                    <div class="font-weight-bold text-subtitle-1">
                      Year {{ year }} Continuous Residence
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ getYearDateRangeHint(year) }}
                    </div>
                  </div>
                </div>

                <div class="d-flex align-center ga-3">
                  <div class="text-right d-none d-sm-block">
                    <span class="text-caption font-weight-bold">
                      {{ residenceStats.perYear[year]?.collected || 0 }} / {{ residenceStats.perYear[year]?.total || 0 }} Items
                    </span>
                    <v-progress-linear
                      :model-value="residenceStats.perYear[year]?.percent || 0"
                      color="success"
                      height="5"
                      style="width: 100px;"
                      rounded
                    ></v-progress-linear>
                  </div>
                  <v-chip
                    size="small"
                    :color="residenceStats.perYear[year]?.percent === 100 ? 'success' : 'info'"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ residenceStats.perYear[year]?.percent || 0 }}%
                  </v-chip>
                </div>
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text class="pt-2 px-2 px-sm-4">
              <div class="d-flex align-center justify-space-between mb-3 ga-2 flex-wrap">
                <div class="text-caption text-medium-emphasis">
                  Collect items like Council Tax, P60s, utility bills, bank statements, or tenancy agreements covering Year {{ year }}.
                </div>
                <v-btn
                  color="primary"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-plus"
                  @click="openCustomDocDialog(year)"
                >
                  Add Custom Evidence Item
                </v-btn>
              </div>

              <!-- Evidence Table -->
              <v-table density="comfortable" hover class="border rounded-lg">
                <thead>
                  <tr>
                    <th class="text-left font-weight-bold">Status</th>
                    <th class="text-left font-weight-bold">Evidence Item</th>
                    <th class="text-left font-weight-bold d-none d-sm-table-cell">Category</th>
                    <th class="text-left font-weight-bold d-none d-md-table-cell">Notes</th>
                    <th class="text-right font-weight-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in residenceChecklist[year] || []"
                    :key="item.id"
                  >
                    <td style="width: 140px;">
                      <v-menu location="bottom start">
                        <template v-slot:activator="{ props }">
                          <v-chip
                            v-bind="props"
                            :color="getStatusColor(item.status)"
                            size="small"
                            variant="flat"
                            class="font-weight-bold cursor-pointer"
                            append-icon="mdi-chevron-down"
                          >
                            {{ getStatusText(item.status) }}
                          </v-chip>
                        </template>
                        <v-list density="compact">
                          <v-list-item @click="updateItemStatus(year, item.id, 'pending')">
                            <v-list-item-title class="text-caption">Pending</v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="updateItemStatus(year, item.id, 'collected')">
                            <v-list-item-title class="text-caption text-info font-weight-bold">Collected</v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="updateItemStatus(year, item.id, 'verified')">
                            <v-list-item-title class="text-caption text-success font-weight-bold">Verified</v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </td>

                    <td>
                      <div class="font-weight-medium text-body-2">{{ item.title }}</div>
                      <div class="text-caption text-medium-emphasis d-sm-none">
                        {{ item.category }}
                      </div>
                    </td>

                    <td class="d-none d-sm-table-cell">
                      <v-chip size="x-small" variant="tonal" color="secondary">
                        {{ item.category }}
                      </v-chip>
                    </td>

                    <td class="d-none d-md-table-cell text-caption text-medium-emphasis" style="max-width: 220px;">
                      <div class="text-truncate">
                        {{ item.notes || 'No notes added' }}
                      </div>
                    </td>

                    <td class="text-right">
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
                            prepend-icon="mdi-notebook-edit-outline"
                            title="Edit Notes"
                            @click="openNotesDialog(year, item)"
                          ></v-list-item>
                          <v-list-item
                            v-if="item.isCustom"
                            prepend-icon="mdi-delete-outline"
                            title="Delete Item"
                            @click="deleteDocItem(year, item.id)"
                          ></v-list-item>
                        </v-list>
                      </v-menu>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>

    <!-- Address Form Dialog -->
    <v-dialog v-model="addressDialog.show" max-width="550px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
          {{ addressDialog.editingId ? 'Edit UK Address Entry' : 'Add UK Address Entry' }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-row density="compact">
            <v-col cols="12">
              <v-text-field
                v-model="addressDialog.form.addressLine1"
                label="Address Line 1 *"
                placeholder="e.g. 10 Downing Street"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="addressDialog.form.addressLine2"
                label="Address Line 2 (Optional)"
                placeholder="e.g. Flat 4B"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.city"
                label="Town / City"
                placeholder="e.g. London"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.postcode"
                label="Postcode"
                placeholder="e.g. SW1A 2AA"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.startDate"
                label="Move-In Date *"
                type="date"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.endDate"
                label="Move-Out Date"
                type="date"
                variant="outlined"
                density="compact"
                :disabled="addressDialog.form.isCurrent"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="addressDialog.form.isCurrent"
                label="I currently live at this address"
                color="primary"
                density="compact"
                hide-details
                class="mb-2"
              ></v-checkbox>
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="addressDialog.form.housingStatus"
                :items="housingStatusOptions"
                label="Tenure / Housing Type"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="addressDialog.form.notes"
                label="Notes / Lease Ref / Landlord Details"
                placeholder="e.g. Tenancy reference, landlord contact details..."
                variant="outlined"
                density="compact"
                rows="2"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="addressDialog.show = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveAddress">Save Address</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Address Confirmation Dialog -->
    <v-dialog v-model="deleteAddressDialog.show" max-width="400px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 text-error">
          Delete Address Record?
        </v-card-title>
        <v-card-text class="px-0 py-2">
          Are you sure you want to delete <strong>{{ deleteAddressDialog.addressLine1 }}</strong>?
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="deleteAddressDialog.show = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="executeDeleteAddress">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Custom Document Dialog -->
    <v-dialog v-model="customDocDialog.show" max-width="450px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
          Add Custom Evidence Item (Year {{ customDocDialog.year }})
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-text-field
            v-model="customDocDialog.title"
            label="Document Title"
            placeholder="e.g. NHS GP Registration Letter, School Report"
            variant="outlined"
            density="compact"
            class="mb-3"
          ></v-text-field>

          <v-select
            v-model="customDocDialog.category"
            :items="categoryOptions"
            label="Category"
            variant="outlined"
            density="compact"
          ></v-select>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="customDocDialog.show = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveCustomDocument">Add Item</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Document Notes Dialog -->
    <v-dialog v-model="notesDialog.show" max-width="500px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 text-truncate">
          Notes: {{ notesDialog.title }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-textarea
            v-model="notesDialog.notes"
            label="Document Details / File Path / Reference"
            placeholder="e.g. Saved in Google Drive /ILR/Year1/CouncilTax.pdf, covers Jan 2026 to Dec 2026..."
            variant="outlined"
            rows="4"
          ></v-textarea>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="notesDialog.show = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveItemNotes">Save Notes</v-btn>
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
.cursor-pointer {
  cursor: pointer;
}
</style>
