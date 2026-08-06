<script>
import { mapStores } from 'pinia'
import { useDocumentsStore } from '../stores/documents'
import { useAbsentsStore } from '../stores/absents'
import { normalizeDate } from '../utils/date'

export default {
  name: 'DocumentView',

  data() {
    return {
      // Active expansion panel for years 1-5 (default open Year 1)
      activeYearPanel: 0,

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

    categoryOptions() {
      return [
        this.$t('document.cat_official_government'),
        this.$t('document.cat_tax_employment'),
        this.$t('document.cat_financial'),
        this.$t('document.cat_housing'),
        this.$t('document.cat_utilities'),
        this.$t('document.cat_medical_government'),
        this.$t('document.cat_education_employment'),
        this.$t('document.cat_medical_insurance'),
        this.$t('document.cat_custom'),
      ]
    },

    housingStatusOptions() {
      return [
        { title: this.$t('document.rented'), value: 'rented' },
        { title: this.$t('document.owned'), value: 'owned' },
        { title: this.$t('document.family'), value: 'family' },
        { title: this.$t('document.student'), value: 'student' },
        { title: this.$t('document.other'), value: 'other' },
      ]
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
      this.showSnackbar(this.$t('document.life_saved'), 'success')
    },

    /**
     * Saves updated English Language qualification details to the Pinia documents store.
     */
    saveEnglishTest() {
      this.documentsStore.updateEnglishTest(this.englishForm)
      this.showSnackbar(this.$t('document.english_saved'), 'success')
    },

    /**
     * Updates collection status for a specific evidence item in the 5-year checklist.
     * @param {number} year - Residence year (1 to 5).
     * @param {string} itemId - Evidence item ID.
     * @param {string} newStatus - New status ('pending' | 'collected' | 'verified').
     */
    updateItemStatus(year, itemId, newStatus) {
      this.documentsStore.updateDocumentItem(year, itemId, { status: newStatus })
      this.showSnackbar(this.$t('document.status_updated'), 'info')
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
      this.showSnackbar(this.$t('document.custom_added'), 'success')
    },

    /**
     * Removes a custom evidence item from a residence year checklist.
     * @param {number} year - Residence year (1 to 5).
     * @param {string} itemId - Item ID to delete.
     */
    deleteDocItem(year, itemId) {
      this.documentsStore.deleteDocumentItem(year, itemId)
      this.showSnackbar(this.$t('document.item_removed'), 'warning')
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
      this.documentsStore.updateDocumentItem(this.notesDialog.year, this.notesDialog.itemId, {
        notes: this.notesDialog.notes,
      })
      this.notesDialog.show = false
      this.showSnackbar(this.$t('document.notes_saved'), 'success')
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
        this.showSnackbar(this.$t('document.enter_address_start'), 'error')
        return
      }

      if (this.addressDialog.editingId) {
        this.documentsStore.updateAddress(this.addressDialog.editingId, this.addressDialog.form)
        this.showSnackbar(this.$t('document.address_updated'), 'success')
      } else {
        this.documentsStore.addAddress(this.addressDialog.form)
        this.showSnackbar(this.$t('document.address_added'), 'success')
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
      this.showSnackbar(this.$t('document.address_deleted'), 'warning')
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

    /**
     * Converts housing status key into human-readable tenure description.
     * @param {string} status - Housing status code.
     * @returns {string} Tenure description.
     */
    getHousingStatusText(status) {
      switch (status) {
        case 'rented':
          return this.$t('document.rented')
        case 'owned':
          return this.$t('document.owned')
        case 'family':
          return this.$t('document.family')
        case 'student':
          return this.$t('document.student')
        default:
          return status || this.$t('document.rented')
      }
    },

    /**
     * Calculates estimated date range string for each of the 5 residence years.
     * @param {number} year - Residence year (1 to 5).
     * @returns {string} Formatted date range string (YYYY-MM-DD to YYYY-MM-DD).
     */
    getYearDateRangeHint(year) {
      const baseDateStr = this.absentsStore.ukArrivalDate || this.absentsStore.visaStartDate
      if (!baseDateStr) return this.$t('document.year', { n: year })

      const start = new Date(baseDateStr)
      if (isNaN(start.getTime())) return this.$t('document.year', { n: year })

      const yearStart = new Date(start)
      yearStart.setFullYear(start.getFullYear() + (year - 1))

      const yearEnd = new Date(start)
      yearEnd.setFullYear(start.getFullYear() + year)
      yearEnd.setDate(yearEnd.getDate() - 1)

      const formatDate = (d) => d.toISOString().split('T')[0]
      return `${formatDate(yearStart)} to ${formatDate(yearEnd)}`
    },

    /**
     * Translates default item titles dynamically.
     * @param {Object} item - Evidence item object.
     * @returns {string} Translated title or original title.
     */
    getItemTitle(item) {
      if (!item || !item.id) return ''
      if (item.id.includes('council_tax')) return this.$t('document.item_council_tax')
      if (item.id.includes('p60_employment')) return this.$t('document.item_p60')
      if (item.id.includes('employer_letter')) return this.$t('document.item_employer_letter')
      if (item.id.includes('bank_statements')) return this.$t('document.item_bank')
      if (item.id.includes('housing_proof')) return this.$t('document.item_housing')
      if (item.id.includes('utility_bill')) return this.$t('document.item_utility')
      if (item.id.includes('payslips')) return this.$t('document.item_payslips')
      if (item.id.includes('gp_nhs_letter')) return this.$t('document.item_gp_nhs')
      return item.title
    },

    /**
     * Translates default item category names dynamically.
     * @param {Object} item - Evidence item object.
     * @returns {string} Translated category name.
     */
    getItemCategory(item) {
      if (!item || !item.category) return ''
      switch (item.category) {
        case 'Official & Government':
          return this.$t('document.cat_official_government')
        case 'Tax & Employment':
          return this.$t('document.cat_tax_employment')
        case 'Financial':
          return this.$t('document.cat_financial')
        case 'Housing':
          return this.$t('document.cat_housing')
        case 'Utilities':
          return this.$t('document.cat_utilities')
        case 'Medical & Government':
          return this.$t('document.cat_medical_government')
        // Legacy categories from pre-audit data
        case 'Official Housing':
          return this.$t('document.cat_official_government')
        case 'Tax & Income':
          return this.$t('document.cat_tax_employment')
        default:
          return item.category
      }
    },

    /**
     * Returns Vuetify theme color for an importance tier.
     * @param {string} importance - Importance tier ('essential' | 'recommended' | 'supporting').
     * @returns {string} Theme color name.
     */
    getImportanceColor(importance) {
      switch (importance) {
        case 'essential':
          return 'error'
        case 'recommended':
          return 'warning'
        case 'supporting':
          return 'info'
        default:
          return 'grey'
      }
    },

    /**
     * Returns translated label for an importance tier.
     * @param {string} importance - Importance tier.
     * @returns {string} Translated importance label.
     */
    getImportanceText(importance) {
      switch (importance) {
        case 'essential':
          return this.$t('document.importance_essential')
        case 'recommended':
          return this.$t('document.importance_recommended')
        case 'supporting':
          return this.$t('document.importance_supporting')
        default:
          return ''
      }
    },

    /**
     * Returns items for a given year sorted by importance tier (essential first).
     * @param {number} year - Residence year (1 to 5).
     * @returns {Array} Sorted items.
     */
    getSortedItems(year) {
      const items = this.residenceChecklist[year] || []
      const order = { essential: 0, recommended: 1, supporting: 2 }
      return [...items].sort((a, b) => {
        const aOrder = order[a.importance] ?? 3
        const bOrder = order[b.importance] ?? 3
        return aOrder - bOrder
      })
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
          <span class="text-h5 font-weight-bold">{{ $t('document.title') }}</span>
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
        {{ $t('document.subtitle') }}
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

      <!-- Overall Readiness Metric Banner -->
      <v-divider class="my-4"></v-divider>

      <v-row class="align-center">
        <v-col cols="12" md="4" class="text-center text-md-left">
          <div class="text-overline text-medium-emphasis mb-1">{{ $t('document.overall_readiness') }}</div>
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
                {{ overallReadinessPercent === 100 ? $t('document.ready_for_app') : $t('document.in_progress') }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ $t('document.items_collected', { collected: residenceStats.collectedItems, total: residenceStats.totalItems }) }}
              </div>
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="8">
          <v-row density="compact">
            <!-- Life in UK Quick Summary -->
            <v-col cols="12" sm="3">
              <v-card
                variant="tonal"
                :color="getStatusColor(lifeInUk.status)"
                class="pa-3 rounded-lg"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">{{ $t('document.life_in_uk') }}</span>
                  <v-icon icon="mdi-book-education-outline" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ getStatusText(lifeInUk.status) }}
                </div>
              </v-card>
            </v-col>

            <!-- English B1 Quick Summary -->
            <v-col cols="12" sm="3">
              <v-card
                variant="tonal"
                :color="getStatusColor(englishTest.status)"
                class="pa-3 rounded-lg"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">English B1</span>
                  <v-icon icon="mdi-translate" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ englishTest.type === 'exempt' ? $t('document.type_exempt') : getStatusText(englishTest.status) }}
                </div>
              </v-card>
            </v-col>

            <!-- Residence Proof Quick Summary -->
            <v-col cols="12" sm="3">
              <v-card variant="tonal" color="primary" class="pa-3 rounded-lg">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">{{ $t('document.proof_5yr') }}</span>
                  <v-icon icon="mdi-folder-check-outline" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ $t('document.percent_done', { percent: residenceStats.overallPercent }) }}
                </div>
              </v-card>
            </v-col>

            <!-- Address History Quick Summary -->
            <v-col cols="12" sm="3">
              <v-card
                variant="tonal"
                :color="addressHistory.length > 0 ? 'success' : 'grey'"
                class="pa-3 rounded-lg"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">{{ $t('document.uk_addresses') }}</span>
                  <v-icon icon="mdi-home-city-outline" size="small"></v-icon>
                </div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ $t('document.logged_count', { count: addressHistory.length }) }}
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
            <span class="text-h5 font-weight-bold">{{ $t('document.life_in_uk') }}</span>
            <v-spacer></v-spacer>
            <v-chip
              :color="getStatusColor(lifeForm.status)"
              size="small"
              variant="flat"
              class="font-weight-bold"
            >
              {{ getStatusText(lifeForm.status) }}
            </v-chip>
          </v-card-title>
          <v-card-text class="px-0 pb-0">
            <p class="text-caption text-medium-emphasis mb-4">
              {{ $t('document.life_desc') }}
            </p>

            <div class="mb-4">
              <label class="text-caption font-weight-bold d-block mb-1">{{ $t('document.test_status') }}</label>
              <v-btn-toggle
                v-model="lifeForm.status"
                mandatory
                color="primary"
                density="compact"
                class="w-100"
                @update:model-value="saveLifeInUk"
              >
                <v-btn value="not_started" class="flex-grow-1" size="small">{{ $t('document.status_not_started') }}</v-btn>
                <v-btn value="scheduled" class="flex-grow-1" size="small">{{ $t('document.status_scheduled') }}</v-btn>
                <v-btn value="passed" class="flex-grow-1" color="success" size="small"
                  >{{ $t('document.status_passed') }}</v-btn
                >
              </v-btn-toggle>
            </div>

            <v-row density="compact">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="lifeForm.testDate"
                  :label="$t('document.test_date')"
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
                  :label="$t('document.urn')"
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
                  :label="$t('document.test_center')"
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
                  :label="$t('document.notes')"
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
            <span class="text-h5 font-weight-bold">{{ $t('document.english_req') }}</span>
            <v-spacer></v-spacer>
            <v-chip
              :color="getStatusColor(englishForm.status)"
              size="small"
              variant="flat"
              class="font-weight-bold"
            >
              {{ englishForm.type === 'exempt' ? $t('document.type_exempt') : getStatusText(englishForm.status) }}
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
                  @update:model-value="saveEnglishTest"
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
                  @update:model-value="saveEnglishTest"
                ></v-select>
              </v-col>
            </v-row>

            <div class="mb-4" v-if="englishForm.type !== 'exempt'">
              <label class="text-caption font-weight-bold d-block mb-1">{{ $t('document.test_status') }}</label>
              <v-btn-toggle
                v-model="englishForm.status"
                mandatory
                color="primary"
                density="compact"
                class="w-100"
                @update:model-value="saveEnglishTest"
              >
                <v-btn value="not_started" class="flex-grow-1" size="small">{{ $t('document.status_not_started') }}</v-btn>
                <v-btn value="scheduled" class="flex-grow-1" size="small">{{ $t('document.status_scheduled') }}</v-btn>
                <v-btn value="passed" class="flex-grow-1" color="success" size="small"
                  >{{ $t('document.status_passed') }}</v-btn
                >
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
                  @change="saveEnglishTest"
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
                  @change="saveEnglishTest"
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
      <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
        <v-icon icon="mdi-home-city-outline" color="primary"></v-icon>
        <span class="text-h5 font-weight-bold">{{ $t('document.address_history') }}</span>
      </v-card-title>

      <v-card-text class="px-0 pb-0">
        <p class="text-caption text-medium-emphasis mb-4">
          {{ $t('document.address_desc') }}
        </p>

        <div v-if="addressHistory.length === 0" class="text-center py-6 text-medium-emphasis">
          <v-icon icon="mdi-map-marker-off-outline" size="large" class="mb-2"></v-icon>
          <div class="text-subtitle-2 font-weight-bold">{{ $t('document.no_addresses_title') }}</div>
          <div class="text-caption mb-3">
            {{ $t('document.no_addresses_desc') }}
          </div>
        </div>

        <v-table v-else density="comfortable" hover class="border rounded-lg">
          <thead>
            <tr>
              <th class="text-left font-weight-bold">{{ $t('document.move_in_date') }}</th>
              <th class="text-left font-weight-bold">{{ $t('document.move_out_date') }}</th>
              <th class="text-left font-weight-bold">{{ $t('document.address_line_1') }}</th>
              <th class="text-left font-weight-bold d-none d-sm-table-cell">{{ $t('document.housing_status') }}</th>
              <th class="text-left font-weight-bold d-none d-md-table-cell">{{ $t('document.notes') }}</th>
              <th class="text-right font-weight-bold">{{ $t('absence.table_actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in addressHistory" :key="item.id">
              <td class="text-left" style="white-space: nowrap">
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

              <td class="text-left" style="white-space: nowrap">
                <v-chip
                  v-if="item.isCurrent"
                  size="small"
                  variant="flat"
                  color="success"
                  prepend-icon="mdi-home-clock-outline"
                  class="font-weight-bold"
                >
                  {{ $t('document.present') }}
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

              <td class="d-none d-sm-table-cell" style="width: 150px">
                <v-chip size="small" variant="tonal" color="secondary">
                  {{ getHousingStatusText(item.housingStatus) }}
                </v-chip>
              </td>

              <td
                class="d-none d-md-table-cell text-caption text-medium-emphasis"
                style="max-width: 200px"
              >
                <div class="text-truncate">
                  {{ item.notes || $t('document.no_notes') }}
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
                      :title="$t('absence.table_actions')"
                    ></v-btn>
                  </template>
                  <v-list density="compact" class="rounded-lg elevation-4">
                    <v-list-item
                      prepend-icon="mdi-pencil-outline"
                      :title="$t('document.edit_address')"
                      @click="openEditAddressDialog(item)"
                    ></v-list-item>
                    <v-list-item
                      prepend-icon="mdi-delete-outline"
                      :title="$t('document.delete_address_title')"
                      @click="openDeleteAddressDialog(item)"
                    ></v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
          </tbody>
        </v-table>

        <div class="d-flex justify-end mt-3">
          <v-btn color="primary" prepend-icon="mdi-plus" size="small" @click="openAddAddressDialog">
            {{ $t('document.add_address') }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- 5-Year Continuous Residence Evidence Checklist -->
    <v-card elevation="2" class="pa-3 rounded-lg bg-surface">
      <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
        <v-icon icon="mdi-shield-home-outline" color="primary"></v-icon>
        <span class="text-h5 font-weight-bold">{{ $t('document.residence_proof') }}</span>
      </v-card-title>

      <v-card-text class="px-0 pb-0">
        <v-expansion-panels
          v-model="activeYearPanel"
          class="mt-3 border rounded-lg overflow-hidden"
        >
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
                      {{ $t('document.year_label', { n: year }) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ getYearDateRangeHint(year) }}
                    </div>
                  </div>
                </div>

                <div class="d-flex align-center ga-3">
                  <div class="text-right d-none d-sm-block">
                    <span class="text-caption font-weight-bold">
                      {{ $t('document.items_count', { collected: residenceStats.perYear[year]?.collected || 0, total: residenceStats.perYear[year]?.total || 0 }) }}
                    </span>
                    <v-progress-linear
                      :model-value="residenceStats.perYear[year]?.percent || 0"
                      color="success"
                      height="5"
                      style="width: 100px"
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
              <div class="d-flex align-center justify-end mb-3 ga-2 flex-wrap">
                <v-btn
                  color="primary"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-plus"
                  @click="openCustomDocDialog(year)"
                >
                  {{ $t('document.add_custom_item') }}
                </v-btn>
              </div>

              <!-- Evidence Table -->
              <v-table density="comfortable" hover class="border rounded-lg">
                <thead>
                  <tr>
                    <th class="text-left font-weight-bold">{{ $t('document.test_status') }}</th>
                    <th class="text-left font-weight-bold">{{ $t('document.evidence_item') }}</th>
                    <th class="text-left font-weight-bold d-none d-sm-table-cell">{{ $t('document.category') }}</th>
                    <th class="text-left font-weight-bold d-none d-md-table-cell">{{ $t('document.notes') }}</th>
                    <th class="text-right font-weight-bold">{{ $t('absence.table_actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in getSortedItems(year)" :key="item.id">
                    <td style="width: 140px">
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
                            <v-list-item-title class="text-caption">{{ $t('document.status_pending') }}</v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="updateItemStatus(year, item.id, 'collected')">
                            <v-list-item-title class="text-caption text-info font-weight-bold"
                              >{{ $t('document.status_collected') }}</v-list-item-title
                            >
                          </v-list-item>
                          <v-list-item @click="updateItemStatus(year, item.id, 'verified')">
                            <v-list-item-title class="text-caption text-success font-weight-bold"
                              >{{ $t('document.status_verified') }}</v-list-item-title
                            >
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </td>

                    <td>
                      <div class="d-flex align-center ga-2 flex-wrap">
                        <span class="font-weight-medium text-body-2">{{ getItemTitle(item) }}</span>
                        <v-chip
                          v-if="item.importance"
                          :color="getImportanceColor(item.importance)"
                          size="x-small"
                          variant="tonal"
                          class="font-weight-bold"
                        >
                          {{ getImportanceText(item.importance) }}
                        </v-chip>
                      </div>
                      <div class="text-caption text-medium-emphasis d-sm-none">
                        {{ getItemCategory(item) }}
                      </div>
                    </td>

                    <td class="d-none d-sm-table-cell">
                      <v-chip size="x-small" variant="tonal" color="secondary">
                        {{ getItemCategory(item) }}
                      </v-chip>
                    </td>

                    <td
                      class="d-none d-md-table-cell text-caption text-medium-emphasis"
                      style="max-width: 220px"
                    >
                      <div class="text-truncate">
                        {{ item.notes || $t('document.no_notes_added') }}
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
                            :title="$t('absence.table_actions')"
                          ></v-btn>
                        </template>
                        <v-list density="compact" class="rounded-lg elevation-4">
                          <v-list-item
                            prepend-icon="mdi-notebook-edit-outline"
                            :title="$t('document.edit_notes')"
                            @click="openNotesDialog(year, item)"
                          ></v-list-item>
                          <v-list-item
                            v-if="item.isCustom"
                            prepend-icon="mdi-delete-outline"
                            :title="$t('document.delete_item')"
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
          {{ addressDialog.editingId ? $t('document.edit_address') : $t('document.add_address') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-row density="compact">
            <v-col cols="12">
              <v-text-field
                v-model="addressDialog.form.addressLine1"
                :label="$t('document.address_line_1') + ' *'"
                placeholder="e.g. 10 Downing Street"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="addressDialog.form.addressLine2"
                :label="$t('document.address_line_2')"
                placeholder="e.g. Flat 4B"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.city"
                :label="$t('document.city')"
                placeholder="e.g. London"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.postcode"
                :label="$t('document.postcode')"
                placeholder="e.g. SW1A 2AA"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.startDate"
                :label="$t('document.move_in_date') + ' *'"
                type="date"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.endDate"
                :label="$t('document.move_out_date')"
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
                :label="$t('document.is_current')"
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
                :label="$t('document.housing_status')"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="addressDialog.form.notes"
                :label="$t('document.notes')"
                placeholder="e.g. Tenancy reference, landlord contact details..."
                variant="outlined"
                density="compact"
                rows="2"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="addressDialog.show = false">{{ $t('absence.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveAddress">{{ $t('document.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Address Confirmation Dialog -->
    <v-dialog v-model="deleteAddressDialog.show" max-width="400px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 text-error">
          {{ $t('document.delete_address_title') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          {{ $t('document.delete_address_body', { address: deleteAddressDialog.addressLine1 }) }}
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="deleteAddressDialog.show = false">{{ $t('absence.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" @click="executeDeleteAddress">{{ $t('absence.delete_confirm') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Custom Document Dialog -->
    <v-dialog v-model="customDocDialog.show" max-width="450px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
          {{ $t('document.add_custom_item') }} ({{ $t('document.year', { n: customDocDialog.year }) }})
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-text-field
            v-model="customDocDialog.title"
            :label="$t('document.item_title')"
            placeholder="e.g. NHS GP Registration Letter, School Report"
            variant="outlined"
            density="compact"
            class="mb-3"
          ></v-text-field>

          <v-select
            v-model="customDocDialog.category"
            :items="categoryOptions"
            :label="$t('document.category')"
            variant="outlined"
            density="compact"
          ></v-select>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="customDocDialog.show = false">{{ $t('absence.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveCustomDocument">{{ $t('document.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Document Notes Dialog -->
    <v-dialog v-model="notesDialog.show" max-width="500px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 text-truncate">
          {{ $t('document.notes') }}: {{ notesDialog.title }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-textarea
            v-model="notesDialog.notes"
            :label="$t('document.notes')"
            placeholder="e.g. Saved in Google Drive /ILR/Year1/CouncilTax.pdf, covers Jan 2026 to Dec 2026..."
            variant="outlined"
            rows="4"
          ></v-textarea>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="notesDialog.show = false">{{ $t('absence.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveItemNotes">{{ $t('document.save') }}</v-btn>
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
.cursor-pointer {
  cursor: pointer;
}
</style>
