<script>
import { mapStores } from 'pinia'
import { useDocumentsStore } from '../stores/documents'
import { useAbsentsStore } from '../stores/absents'
import { normalizeDate } from '../utils/date'
import {
  formatFileSize,
  createFileURL,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
} from '../services/fileStorageService'

export default {
  name: 'DocumentView',

  data() {
    return {
      // Active expansion panel for years 1-5 (default collapsed)
      activeYearPanel: null,

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

      // Document Vault state
      vaultActiveFolder: 'all',
      vaultDragOver: false,
      vaultSortBy: 'name',
      vaultSortOrder: 'asc',

      // Upload Dialog state
      uploadDialog: {
        show: false,
        files: [],
        folderId: 'other',
        linkedYear: null,
        linkedItemId: null,
        notes: '',
        uploading: false,
      },

      // File Preview Dialog state
      filePreviewDialog: {
        show: false,
        file: null,
        objectUrl: null,
        loading: false,
      },

      // File Rename Dialog state
      renameDialog: {
        show: false,
        fileId: null,
        name: '',
      },

      // File Move Dialog state
      moveDialog: {
        show: false,
        fileId: null,
        folderId: '',
      },

      // File Delete Dialog state
      deleteFileDialog: {
        show: false,
        fileId: null,
        fileName: '',
      },

      // File Notes Dialog state
      fileNotesDialog: {
        show: false,
        fileId: null,
        notes: '',
      },

      // File Link Dialog state
      linkDialog: {
        show: false,
        fileId: null,
        year: 1,
        itemId: null,
      },

      // Attached files viewer dialog (for checklist item)
      attachedFilesDialog: {
        show: false,
        year: null,
        itemId: null,
        itemTitle: '',
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

    uploadedFiles() {
      return this.documentsStore.uploadedFiles
    },

    folders() {
      return this.documentsStore.folders
    },

    totalFileStorageBytes() {
      return this.documentsStore.totalFileStorageBytes
    },

    fileCountByFolder() {
      return this.documentsStore.fileCountByFolder
    },

    /** Sort field options for dropdown */
    sortOptions() {
      return [
        { title: this.$t('document.sort_name'), value: 'name' },
        { title: this.$t('document.sort_folder'), value: 'folder' },
        { title: this.$t('document.sort_size'), value: 'size' },
        { title: this.$t('document.sort_uploaded_at'), value: 'uploadedAt' },
      ]
    },

    /** Files filtered by currently active vault folder */
    filteredFiles() {
      if (this.vaultActiveFolder === 'all') {
        return this.uploadedFiles
      }
      return this.uploadedFiles.filter((f) => f.folderId === this.vaultActiveFolder)
    },

    /** Files sorted according to vaultSortBy and vaultSortOrder */
    sortedFiles() {
      const list = [...this.filteredFiles]
      const field = this.vaultSortBy || 'name'
      const isAsc = this.vaultSortOrder === 'asc'

      return list.sort((a, b) => {
        let valA, valB
        if (field === 'name') {
          valA = (a.name || '').toLowerCase()
          valB = (b.name || '').toLowerCase()
          return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
        } else if (field === 'folder') {
          valA = (this.getFolderLabel(a.folderId) || '').toLowerCase()
          valB = (this.getFolderLabel(b.folderId) || '').toLowerCase()
          return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
        } else if (field === 'size') {
          valA = a.size || 0
          valB = b.size || 0
          return isAsc ? valA - valB : valB - valA
        } else if (field === 'uploadedAt') {
          valA = new Date(a.uploadedAt || 0).getTime()
          valB = new Date(b.uploadedAt || 0).getTime()
          return isAsc ? valA - valB : valB - valA
        }
        return 0
      })
    },

    /** Folder options for select dropdowns */
    folderSelectOptions() {
      return this.folders.map((f) => ({
        title: this.$t(`document.folder_${f.id}`) || f.label,
        value: f.id,
      }))
    },

    /** Allowed file extensions for input accept attribute */
    allowedFileExtensions() {
      return ALLOWED_EXTENSIONS
    },

    /** Max file size formatted */
    maxFileSizeFormatted() {
      return formatFileSize(MAX_FILE_SIZE)
    },

    /** Items for the link dialog year+item selectors */
    linkYearOptions() {
      return [1, 2, 3, 4, 5].map((y) => ({
        title: this.$t('document.year', { n: y }),
        value: y,
      }))
    },

    linkItemOptions() {
      const year = this.linkDialog.year
      if (!year || !this.residenceChecklist[year]) return []
      return this.residenceChecklist[year].map((item) => ({
        title: this.getItemTitle(item),
        value: item.id,
      }))
    },

    /** Attached files for the currently viewed checklist item */
    attachedFilesForDialog() {
      if (!this.attachedFilesDialog.year || !this.attachedFilesDialog.itemId) return []
      return this.documentsStore.getFilesForItem(
        this.attachedFilesDialog.year,
        this.attachedFilesDialog.itemId,
      )
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

    // ── File Vault Methods ──────────────────────────────────────────────

    /**
     * Sorts table by header click. Toggles order if clicking current sort field.
     * @param {string} field - Sort field name.
     */
    sortByHeader(field) {
      if (this.vaultSortBy === field) {
        this.vaultSortOrder = this.vaultSortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        this.vaultSortBy = field
        this.vaultSortOrder = 'asc'
      }
    },

    /**
     * Toggles sort direction between ascending and descending.
     */
    toggleSortOrder() {
      this.vaultSortOrder = this.vaultSortOrder === 'asc' ? 'desc' : 'asc'
    },

    /**
     * Returns a display-friendly folder name.
     * @param {string} folderId - Folder ID.
     * @returns {string} Translated folder label.
     */
    getFolderLabel(folderId) {
      const key = `document.folder_${folderId}`
      const translated = this.$t(key)
      return translated !== key ? translated : folderId
    },

    /**
     * Returns an icon name for a file based on its MIME type.
     * @param {string} mimeType - File MIME type.
     * @returns {string} MDI icon name.
     */
    getFileIcon(mimeType) {
      if (!mimeType) return 'mdi-file-outline'
      if (mimeType === 'application/pdf') return 'mdi-file-pdf-box'
      if (mimeType.startsWith('image/')) return 'mdi-file-image-outline'
      if (mimeType === 'text/plain') return 'mdi-file-document-outline'
      return 'mdi-file-outline'
    },

    /**
     * Returns a theme color for a file based on its MIME type.
     * @param {string} mimeType - File MIME type.
     * @returns {string} Theme color.
     */
    getFileColor(mimeType) {
      if (!mimeType) return 'grey'
      if (mimeType === 'application/pdf') return 'error'
      if (mimeType.startsWith('image/')) return 'info'
      if (mimeType === 'text/plain') return 'secondary'
      return 'grey'
    },

    /**
     * Formats bytes into human-readable size string.
     * @param {number} bytes - File size in bytes.
     * @returns {string} Formatted size.
     */
    formatSize(bytes) {
      return formatFileSize(bytes)
    },

    /**
     * Formats ISO date string into a short readable format.
     * @param {string} isoString - ISO timestamp.
     * @returns {string} Formatted date.
     */
    formatUploadDate(isoString) {
      if (!isoString) return '-'
      return normalizeDate(isoString) || String(isoString)
    },

    /**
     * Opens the upload dialog.
     * @param {string} [folderId] - Pre-selected folder.
     * @param {number} [linkedYear] - Pre-linked year.
     * @param {string} [linkedItemId] - Pre-linked item ID.
     */
    openUploadDialog(folderId, linkedYear, linkedItemId) {
      this.uploadDialog = {
        show: true,
        files: [],
        folderId: folderId || 'other',
        linkedYear: linkedYear || null,
        linkedItemId: linkedItemId || null,
        notes: '',
        uploading: false,
      }
    },

    /**
     * Handles file input change or drop event.
     * @param {Event|FileList} eventOrFiles - Change event or FileList.
     */
    handleFileSelect(eventOrFiles) {
      let files
      if (eventOrFiles instanceof Event) {
        files = eventOrFiles.target.files
      } else if (eventOrFiles instanceof FileList) {
        files = eventOrFiles
      } else if (Array.isArray(eventOrFiles)) {
        files = eventOrFiles
      } else {
        return
      }
      this.uploadDialog.files = Array.from(files)
    },

    /**
     * Handles drag-and-drop on the vault area.
     * @param {DragEvent} event - Drop event.
     */
    handleVaultDrop(event) {
      event.preventDefault()
      this.vaultDragOver = false
      const files = event.dataTransfer?.files
      if (files && files.length > 0) {
        this.uploadDialog.files = Array.from(files)
        this.uploadDialog.folderId =
          this.vaultActiveFolder !== 'all' ? this.vaultActiveFolder : 'other'
        this.uploadDialog.show = true
      }
    },

    /**
     * Executes the file upload for all selected files.
     */
    async executeUpload() {
      if (this.uploadDialog.files.length === 0) return
      this.uploadDialog.uploading = true

      let successCount = 0
      for (const file of this.uploadDialog.files) {
        try {
          await this.documentsStore.uploadFile(file, this.uploadDialog.folderId, {
            linkedYear: this.uploadDialog.linkedYear,
            linkedItemId: this.uploadDialog.linkedItemId,
            notes: this.uploadDialog.notes,
          })
          successCount++
        } catch (e) {
          this.showSnackbar(this.$t('document.upload_error', { error: e.message }), 'error')
        }
      }

      this.uploadDialog.uploading = false
      this.uploadDialog.show = false

      if (successCount > 0) {
        const msg =
          successCount === 1
            ? this.$t('document.upload_success')
            : this.$t('document.upload_success_multi', { count: successCount })
        this.showSnackbar(msg, 'success')
      }
    },

    /**
     * Opens the file preview dialog.
     * @param {Object} fileMeta - File metadata object.
     */
    async openFilePreview(fileMeta) {
      this.filePreviewDialog = {
        show: true,
        file: fileMeta,
        objectUrl: null,
        loading: true,
      }

      try {
        const fullRecord = await this.documentsStore.getFullFileRecord(fileMeta.id)
        if (fullRecord && fullRecord.data) {
          this.filePreviewDialog.objectUrl = createFileURL(fullRecord)
        }
      } catch (e) {
        console.error('Failed to load file for preview:', e)
      } finally {
        this.filePreviewDialog.loading = false
      }
    },

    /**
     * Closes the file preview dialog and revokes object URL.
     */
    closeFilePreview() {
      if (this.filePreviewDialog.objectUrl) {
        URL.revokeObjectURL(this.filePreviewDialog.objectUrl)
      }
      this.filePreviewDialog = {
        show: false,
        file: null,
        objectUrl: null,
        loading: false,
      }
    },

    /**
     * Triggers a browser download for a file.
     * @param {Object} fileMeta - File metadata.
     */
    async downloadFile(fileMeta) {
      try {
        const fullRecord = await this.documentsStore.getFullFileRecord(fileMeta.id)
        if (!fullRecord || !fullRecord.data) return

        const url = createFileURL(fullRecord)
        const a = document.createElement('a')
        a.href = url
        a.download = fullRecord.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (e) {
        console.error('Download failed:', e)
      }
    },

    /**
     * Opens rename dialog for a file.
     * @param {Object} fileMeta - File metadata.
     */
    openRenameDialog(fileMeta) {
      this.renameDialog = {
        show: true,
        fileId: fileMeta.id,
        name: fileMeta.name,
      }
    },

    /**
     * Executes file rename.
     */
    async executeRename() {
      if (!this.renameDialog.name.trim()) return
      try {
        await this.documentsStore.renameFile(
          this.renameDialog.fileId,
          this.renameDialog.name.trim(),
        )
        this.renameDialog.show = false
        this.showSnackbar(this.$t('document.file_renamed'), 'success')
      } catch (e) {
        this.showSnackbar(e.message, 'error')
      }
    },

    /**
     * Opens move dialog for a file.
     * @param {Object} fileMeta - File metadata.
     */
    openMoveDialog(fileMeta) {
      this.moveDialog = {
        show: true,
        fileId: fileMeta.id,
        folderId: fileMeta.folderId,
      }
    },

    /**
     * Executes file move.
     */
    async executeMove() {
      await this.documentsStore.moveFile(this.moveDialog.fileId, this.moveDialog.folderId)
      this.moveDialog.show = false
      this.showSnackbar(
        this.$t('document.file_moved', { folder: this.getFolderLabel(this.moveDialog.folderId) }),
        'success',
      )
    },

    /**
     * Opens file notes editor dialog.
     * @param {Object} fileMeta - File metadata.
     */
    openFileNotesDialog(fileMeta) {
      this.fileNotesDialog = {
        show: true,
        fileId: fileMeta.id,
        notes: fileMeta.notes || '',
      }
    },

    /**
     * Saves file notes.
     */
    async saveFileNotes() {
      await this.documentsStore.updateFileNotes(
        this.fileNotesDialog.fileId,
        this.fileNotesDialog.notes,
      )
      this.fileNotesDialog.show = false
      this.showSnackbar(this.$t('document.file_notes_updated'), 'success')
    },

    /**
     * Opens delete confirmation dialog for a file.
     * @param {Object} fileMeta - File metadata.
     */
    openDeleteFileDialog(fileMeta) {
      this.deleteFileDialog = {
        show: true,
        fileId: fileMeta.id,
        fileName: fileMeta.name,
      }
    },

    /**
     * Executes file deletion.
     */
    async executeDeleteFile() {
      await this.documentsStore.deleteUploadedFile(this.deleteFileDialog.fileId)
      this.deleteFileDialog.show = false
      this.showSnackbar(this.$t('document.file_deleted'), 'warning')
    },

    /**
     * Opens the link-to-checklist dialog.
     * @param {Object} fileMeta - File metadata.
     */
    openLinkDialog(fileMeta) {
      this.linkDialog = {
        show: true,
        fileId: fileMeta.id,
        year: fileMeta.linkedYear || 1,
        itemId: fileMeta.linkedItemId || null,
      }
    },

    /**
     * Executes linking a file to a checklist item.
     */
    async executeLinkFile() {
      if (!this.linkDialog.itemId) return
      await this.documentsStore.linkFileToChecklist(
        this.linkDialog.fileId,
        this.linkDialog.year,
        this.linkDialog.itemId,
      )
      this.linkDialog.show = false
      this.showSnackbar(this.$t('document.file_linked'), 'success')
    },

    /**
     * Unlinks a file from its checklist item.
     * @param {string} fileId - File ID.
     */
    async unlinkFile(fileId) {
      await this.documentsStore.unlinkFileFromChecklist(fileId)
      this.showSnackbar(this.$t('document.file_unlinked'), 'info')
    },

    /**
     * Closes the attached files dialog and opens the attach file picker dialog.
     */
    openAttachFromAttachedDialog() {
      const year = this.attachedFilesDialog.year
      const item = { id: this.attachedFilesDialog.itemId }
      this.attachedFilesDialog.show = false
      this.openAttachFileDialog(year, item)
    },

    /**
     * Gets the count of files attached to a checklist item.
     * @param {number} year - Year.
     * @param {string} itemId - Item ID.
     * @returns {number} File count.
     */
    getAttachedFileCount(year, itemId) {
      return this.documentsStore.getFilesForItem(year, itemId).length
    },

    /**
     * Opens the attached files viewer for a checklist item.
     * @param {number} year - Year.
     * @param {Object} item - Checklist item.
     */
    openAttachedFilesDialog(year, item) {
      this.attachedFilesDialog = {
        show: true,
        year,
        itemId: item.id,
        itemTitle: this.getItemTitle(item),
      }
    },

    /**
     * Opens upload dialog pre-linked to a checklist item.
     * @param {number} year - Year.
     * @param {Object} item - Checklist item.
     */
    openAttachFileDialog(year, item) {
      const folderId = `year_${year}`
      this.openUploadDialog(folderId, year, item.id)
    },

    /**
     * Whether a MIME type supports inline preview.
     * @param {string} mimeType - MIME type.
     * @returns {boolean}
     */
    isPreviewable(mimeType) {
      if (!mimeType) return false
      return mimeType.startsWith('image/') || mimeType === 'application/pdf'
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
          <div class="text-overline text-medium-emphasis mb-1">
            {{ $t('document.overall_readiness') }}
          </div>
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
                {{
                  overallReadinessPercent === 100
                    ? $t('document.ready_for_app')
                    : $t('document.in_progress')
                }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{
                  $t('document.items_collected', {
                    collected: residenceStats.collectedItems,
                    total: residenceStats.totalItems,
                  })
                }}
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
                  {{
                    englishTest.type === 'exempt'
                      ? $t('document.type_exempt')
                      : getStatusText(englishTest.status)
                  }}
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
                  <span class="text-caption font-weight-bold">{{
                    $t('document.uk_addresses')
                  }}</span>
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
              <label class="text-caption font-weight-bold d-block mb-1">{{
                $t('document.test_status')
              }}</label>
              <v-btn-toggle
                v-model="lifeForm.status"
                mandatory
                color="primary"
                density="compact"
                class="w-100"
                @update:model-value="saveLifeInUk"
              >
                <v-btn value="not_started" class="flex-grow-1" size="small">{{
                  $t('document.status_not_started')
                }}</v-btn>
                <v-btn value="scheduled" class="flex-grow-1" size="small">{{
                  $t('document.status_scheduled')
                }}</v-btn>
                <v-btn value="passed" class="flex-grow-1" color="success" size="small">{{
                  $t('document.status_passed')
                }}</v-btn>
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
              {{
                englishForm.type === 'exempt'
                  ? $t('document.type_exempt')
                  : getStatusText(englishForm.status)
              }}
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
              <label class="text-caption font-weight-bold d-block mb-1">{{
                $t('document.test_status')
              }}</label>
              <v-btn-toggle
                v-model="englishForm.status"
                mandatory
                color="primary"
                density="compact"
                class="w-100"
                @update:model-value="saveEnglishTest"
              >
                <v-btn value="not_started" class="flex-grow-1" size="small">{{
                  $t('document.status_not_started')
                }}</v-btn>
                <v-btn value="scheduled" class="flex-grow-1" size="small">{{
                  $t('document.status_scheduled')
                }}</v-btn>
                <v-btn value="passed" class="flex-grow-1" color="success" size="small">{{
                  $t('document.status_passed')
                }}</v-btn>
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

    <!-- Address History & Residence Checklist Section (Side by Side) -->
    <v-row class="mb-6">
      <!-- UK Address History Section -->
      <v-col cols="12" lg="6">
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
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
              <div class="text-subtitle-2 font-weight-bold">
                {{ $t('document.no_addresses_title') }}
              </div>
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
              <v-btn
                color="primary"
                prepend-icon="mdi-plus"
                size="small"
                @click="openAddAddressDialog"
              >
                {{ $t('document.add_address') }}
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 5-Year Continuous Residence Evidence Checklist -->
      <v-col cols="12" lg="6">
        <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
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
                          {{
                            $t('document.items_count', {
                              collected: residenceStats.perYear[year]?.collected || 0,
                              total: residenceStats.perYear[year]?.total || 0,
                            })
                          }}
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
                        <th class="text-left font-weight-bold">{{ $t('document.status') }}</th>
                        <th class="text-left font-weight-bold">
                          {{ $t('document.evidence_item') }}
                        </th>
                        <th class="text-left font-weight-bold d-none d-sm-table-cell">
                          {{ $t('document.category') }}
                        </th>
                        <th class="text-right font-weight-bold">
                          {{ $t('absence.table_actions') }}
                        </th>
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
                                <v-list-item-title class="text-caption">{{
                                  $t('document.status_pending')
                                }}</v-list-item-title>
                              </v-list-item>
                              <v-list-item @click="updateItemStatus(year, item.id, 'collected')">
                                <v-list-item-title
                                  class="text-caption text-info font-weight-bold"
                                  >{{ $t('document.status_collected') }}</v-list-item-title
                                >
                              </v-list-item>
                              <v-list-item @click="updateItemStatus(year, item.id, 'verified')">
                                <v-list-item-title
                                  class="text-caption text-success font-weight-bold"
                                  >{{ $t('document.status_verified') }}</v-list-item-title
                                >
                              </v-list-item>
                            </v-list>
                          </v-menu>
                        </td>

                        <td>
                          <div class="d-flex align-center ga-2 flex-wrap">
                            <span class="font-weight-medium text-body-2">{{
                              getItemTitle(item)
                            }}</span>
                            <v-chip
                              v-if="item.importance"
                              :color="getImportanceColor(item.importance)"
                              size="x-small"
                              variant="tonal"
                              class="font-weight-bold"
                            >
                              {{ getImportanceText(item.importance) }}
                            </v-chip>
                            <v-chip
                              v-if="getAttachedFileCount(year, item.id) > 0"
                              size="x-small"
                              variant="tonal"
                              color="primary"
                              prepend-icon="mdi-paperclip"
                              class="font-weight-bold cursor-pointer"
                              @click="openAttachedFilesDialog(year, item)"
                            >
                              {{ getAttachedFileCount(year, item.id) }}
                            </v-chip>
                          </div>
                          <div class="text-caption text-medium-emphasis d-sm-none">
                            {{ getItemCategory(item) }}
                          </div>
                        </td>

                        <td class="d-none d-sm-table-cell">
                          <v-chip size="x-small" variant="tonal" color="info">
                            {{ getItemCategory(item) }}
                          </v-chip>
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
                                prepend-icon="mdi-paperclip"
                                :title="$t('document.attach_file')"
                                @click="openAttachFileDialog(year, item)"
                              ></v-list-item>
                              <v-list-item
                                v-if="getAttachedFileCount(year, item.id) > 0"
                                prepend-icon="mdi-file-eye-outline"
                                :title="$t('document.view_attached')"
                                @click="openAttachedFilesDialog(year, item)"
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
      </v-col>
    </v-row>

    <!-- Document Vault Section (At the very last) -->
    <v-card
      elevation="2"
      class="pa-3 rounded-lg bg-surface"
      @dragover.prevent="vaultDragOver = true"
      @dragleave.prevent="vaultDragOver = false"
      @drop="handleVaultDrop"
    >
      <v-card-title class="px-0 pt-0 d-flex align-center flex-wrap ga-2">
        <div class="d-flex align-center">
          <v-icon icon="mdi-safe-square-outline" color="primary" class="mr-2"></v-icon>
          <span class="text-h5 font-weight-bold">{{ $t('document.vault_title') }}</span>
        </div>
      </v-card-title>

      <p class="text-body-2 text-medium-emphasis ma-0 mb-3">
        {{ $t('document.vault_desc') }}
      </p>

      <!-- Folder Tabs & Sort Controls Toolbar -->
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
        <v-chip-group v-model="vaultActiveFolder" mandatory selected-class="text-primary">
          <v-chip value="all" variant="tonal" size="small" filter>
            {{ $t('document.folder_all') }}
            <template v-if="uploadedFiles.length > 0">
              <span class="ml-1 text-caption">({{ uploadedFiles.length }})</span>
            </template>
          </v-chip>
          <v-chip
            v-for="folder in folders"
            :key="folder.id"
            :value="folder.id"
            :prepend-icon="folder.icon"
            variant="tonal"
            size="small"
            filter
          >
            {{ $t(`document.folder_${folder.id}`) }}
            <template v-if="fileCountByFolder[folder.id] > 0">
              <span class="ml-1 text-caption">({{ fileCountByFolder[folder.id] }})</span>
            </template>
          </v-chip>
        </v-chip-group>

        <!-- Sort Column Dropdown & Order Toggle -->
        <div class="d-flex align-center ga-2 flex-wrap ml-auto" v-if="uploadedFiles.length > 0">
          <v-select
            v-model="vaultSortBy"
            :items="sortOptions"
            :label="$t('document.sort_by')"
            density="compact"
            variant="outlined"
            hide-details
            style="min-width: 140px; max-width: 170px"
          ></v-select>
          <v-btn
            variant="tonal"
            density="compact"
            color="primary"
            class="px-2"
            style="height: 40px"
            :title="vaultSortOrder === 'asc' ? $t('document.sort_asc') : $t('document.sort_desc')"
            @click="toggleSortOrder"
          >
            <v-icon
              :icon="vaultSortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
            ></v-icon>
            <span class="ml-1 text-caption font-weight-medium d-none d-sm-inline">
              {{ vaultSortOrder === 'asc' ? $t('document.sort_asc') : $t('document.sort_desc') }}
            </span>
          </v-btn>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="filteredFiles.length === 0"
        class="vault-empty-state text-center py-8 border rounded-lg"
        :class="{ 'vault-drag-over': vaultDragOver }"
      >
        <v-icon
          icon="mdi-cloud-upload-outline"
          size="48"
          color="primary"
          class="mb-3"
          style="opacity: 0.5"
        ></v-icon>
        <div class="text-subtitle-1 font-weight-bold text-medium-emphasis">
          {{ $t('document.vault_empty_title') }}
        </div>
        <div class="text-caption text-medium-emphasis mb-3">
          {{ $t('document.vault_empty_desc') }}
        </div>
        <v-btn
          color="primary"
          variant="outlined"
          size="small"
          prepend-icon="mdi-upload"
          @click="openUploadDialog()"
        >
          {{ $t('document.upload_files') }}
        </v-btn>
      </div>

      <!-- File List Table with Frozen Header and Height Limit -->
      <v-table
        v-else
        density="comfortable"
        hover
        fixed-header
        height="420px"
        class="vault-table border rounded-lg"
        :class="{ 'vault-drag-over': vaultDragOver }"
      >
        <thead>
          <tr>
            <th class="text-left font-weight-bold" style="width: 50px"></th>
            <th
              class="text-left font-weight-bold cursor-pointer user-select-none"
              @click="sortByHeader('name')"
            >
              <div class="d-flex align-center ga-1">
                <span>{{ $t('document.rename_label') }}</span>
                <v-icon
                  v-if="vaultSortBy === 'name'"
                  :icon="vaultSortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
                  size="x-small"
                  color="primary"
                ></v-icon>
              </div>
            </th>
            <th
              class="text-left font-weight-bold d-none d-sm-table-cell cursor-pointer user-select-none"
              style="width: 140px"
              @click="sortByHeader('folder')"
            >
              <div class="d-flex align-center ga-1">
                <span>{{ $t('document.upload_folder') }}</span>
                <v-icon
                  v-if="vaultSortBy === 'folder'"
                  :icon="vaultSortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
                  size="x-small"
                  color="primary"
                ></v-icon>
              </div>
            </th>
            <th
              class="text-left font-weight-bold d-none d-md-table-cell cursor-pointer user-select-none"
              style="width: 120px"
              @click="sortByHeader('size')"
            >
              <div class="d-flex align-center ga-1">
                <span>{{ $t('document.storage_used') }}</span>
                <v-icon
                  v-if="vaultSortBy === 'size'"
                  :icon="vaultSortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
                  size="x-small"
                  color="primary"
                ></v-icon>
              </div>
            </th>
            <th
              class="text-left font-weight-bold d-none d-md-table-cell cursor-pointer user-select-none"
              style="width: 140px"
              @click="sortByHeader('uploadedAt')"
            >
              <div class="d-flex align-center ga-1">
                <span>{{ $t('document.upload_date') }}</span>
                <v-icon
                  v-if="vaultSortBy === 'uploadedAt'"
                  :icon="vaultSortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
                  size="x-small"
                  color="primary"
                ></v-icon>
              </div>
            </th>
            <th class="text-right font-weight-bold" style="width: 50px">
              {{ $t('absence.table_actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in sortedFiles" :key="file.id">
            <td>
              <v-icon
                :icon="getFileIcon(file.mimeType)"
                :color="getFileColor(file.mimeType)"
                size="small"
              ></v-icon>
            </td>
            <td>
              <div class="d-flex align-center ga-2 flex-wrap">
                <span
                  class="font-weight-medium text-body-2 cursor-pointer vault-file-name"
                  @click="isPreviewable(file.mimeType) ? openFilePreview(file) : downloadFile(file)"
                >
                  {{ file.name }}
                </span>
                <v-chip
                  v-if="file.linkedItemId"
                  size="x-small"
                  variant="tonal"
                  color="success"
                  prepend-icon="mdi-link-variant"
                >
                  {{ $t('document.file_link') }}
                </v-chip>
              </div>
              <div
                v-if="file.notes"
                class="text-caption text-medium-emphasis text-truncate"
                style="max-width: 300px"
              >
                {{ file.notes }}
              </div>
            </td>
            <td class="d-none d-sm-table-cell">
              <v-chip
                size="x-small"
                variant="tonal"
                color="primary"
                :prepend-icon="
                  folders.find((f) => f.id === file.folderId)?.icon || 'mdi-folder-outline'
                "
              >
                {{ getFolderLabel(file.folderId) }}
              </v-chip>
            </td>
            <td class="d-none d-md-table-cell text-caption text-medium-emphasis">
              {{ formatSize(file.size) }}
            </td>
            <td class="d-none d-md-table-cell text-caption text-medium-emphasis">
              {{ formatUploadDate(file.uploadedAt) }}
            </td>
            <td class="text-right">
              <v-menu location="bottom end">
                <template #activator="{ props }">
                  <v-btn
                    icon="mdi-dots-vertical"
                    variant="text"
                    size="small"
                    v-bind="props"
                  ></v-btn>
                </template>
                <v-list density="compact" class="rounded-lg elevation-4">
                  <v-list-item
                    v-if="isPreviewable(file.mimeType)"
                    prepend-icon="mdi-eye-outline"
                    :title="$t('document.file_preview')"
                    @click="openFilePreview(file)"
                  ></v-list-item>
                  <v-list-item
                    prepend-icon="mdi-download"
                    :title="$t('document.file_download')"
                    @click="downloadFile(file)"
                  ></v-list-item>
                  <v-divider></v-divider>
                  <v-list-item
                    prepend-icon="mdi-pencil-outline"
                    :title="$t('document.file_rename')"
                    @click="openRenameDialog(file)"
                  ></v-list-item>
                  <v-list-item
                    prepend-icon="mdi-folder-move-outline"
                    :title="$t('document.file_move')"
                    @click="openMoveDialog(file)"
                  ></v-list-item>
                  <v-list-item
                    prepend-icon="mdi-note-edit-outline"
                    :title="$t('document.file_add_notes')"
                    @click="openFileNotesDialog(file)"
                  ></v-list-item>
                  <v-list-item
                    prepend-icon="mdi-link-variant"
                    :title="$t('document.file_link')"
                    @click="openLinkDialog(file)"
                  ></v-list-item>
                  <v-list-item
                    v-if="file.linkedItemId"
                    prepend-icon="mdi-link-variant-off"
                    :title="$t('document.file_unlink')"
                    @click="unlinkFile(file.id)"
                  ></v-list-item>
                  <v-divider></v-divider>
                  <v-list-item
                    prepend-icon="mdi-delete-outline"
                    :title="$t('document.file_delete')"
                    @click="openDeleteFileDialog(file)"
                    base-color="error"
                  ></v-list-item>
                </v-list>
              </v-menu>
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Document Vault Actions Footer -->
      <div class="d-flex align-center justify-space-between mt-3 flex-wrap ga-2">
        <v-chip
          v-if="uploadedFiles.length > 0"
          size="small"
          variant="tonal"
          color="primary"
          class="font-weight-bold"
        >
          {{ uploadedFiles.length }} {{ uploadedFiles.length === 1 ? 'file' : 'files' }} ·
          {{ formatSize(totalFileStorageBytes) }}
        </v-chip>
        <v-spacer v-else></v-spacer>
        <v-btn color="primary" prepend-icon="mdi-upload" size="small" @click="openUploadDialog()">
          {{ $t('document.upload_files') }}
        </v-btn>
      </div>
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
          <v-btn variant="text" @click="addressDialog.show = false">{{
            $t('absence.cancel')
          }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveAddress">{{
            $t('document.save')
          }}</v-btn>
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
          <v-btn variant="text" @click="deleteAddressDialog.show = false">{{
            $t('absence.cancel')
          }}</v-btn>
          <v-btn color="error" variant="flat" @click="executeDeleteAddress">{{
            $t('absence.delete_confirm')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Custom Document Dialog -->
    <v-dialog v-model="customDocDialog.show" max-width="450px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
          {{ $t('document.add_custom_item') }} ({{
            $t('document.year', { n: customDocDialog.year })
          }})
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
          <v-btn variant="text" @click="customDocDialog.show = false">{{
            $t('absence.cancel')
          }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveCustomDocument">{{
            $t('document.save')
          }}</v-btn>
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
          <v-btn color="primary" variant="flat" @click="saveItemNotes">{{
            $t('document.save')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Upload Dialog -->
    <v-dialog v-model="uploadDialog.show" max-width="550px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 d-flex align-center ga-2">
          <v-icon icon="mdi-upload" color="primary"></v-icon>
          {{ $t('document.upload_dialog_title') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <!-- Drop Zone -->
          <div
            class="upload-drop-zone border-dashed rounded-lg pa-6 text-center mb-4"
            :class="{ 'upload-drop-active': uploadDialog.files.length > 0 }"
            @click="$refs.fileInput?.click()"
            @dragover.prevent
            @drop.prevent="
              (e) => {
                handleFileSelect(e.dataTransfer.files)
              }
            "
          >
            <input
              ref="fileInput"
              type="file"
              :accept="allowedFileExtensions"
              multiple
              style="display: none"
              @change="handleFileSelect($event)"
            />
            <v-icon
              icon="mdi-cloud-upload-outline"
              size="40"
              color="primary"
              class="mb-2"
              style="opacity: 0.6"
            ></v-icon>
            <div class="text-body-2 font-weight-medium">{{ $t('document.upload_drop_hint') }}</div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ $t('document.upload_type_hint') }} ·
              {{ $t('document.upload_size_limit', { size: maxFileSizeFormatted }) }}
            </div>
          </div>

          <!-- Selected Files Preview -->
          <div v-if="uploadDialog.files.length > 0" class="mb-4">
            <v-chip
              v-for="(file, idx) in uploadDialog.files"
              :key="idx"
              size="small"
              variant="tonal"
              color="primary"
              closable
              class="ma-1"
              :prepend-icon="getFileIcon(file.type)"
              @click:close="uploadDialog.files.splice(idx, 1)"
            >
              {{ file.name }} ({{ formatSize(file.size) }})
            </v-chip>
          </div>

          <!-- Folder Select -->
          <v-select
            v-model="uploadDialog.folderId"
            :items="folderSelectOptions"
            :label="$t('document.upload_folder')"
            variant="outlined"
            density="compact"
            class="mb-3"
          ></v-select>

          <!-- Notes -->
          <v-textarea
            v-model="uploadDialog.notes"
            :label="$t('document.upload_notes')"
            variant="outlined"
            density="compact"
            rows="2"
            hide-details
          ></v-textarea>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="uploadDialog.show = false">{{
            $t('absence.cancel')
          }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="uploadDialog.uploading"
            :disabled="uploadDialog.files.length === 0"
            prepend-icon="mdi-upload"
            @click="executeUpload"
          >
            {{ $t('document.upload_files') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- File Preview Dialog -->
    <v-dialog
      v-model="filePreviewDialog.show"
      max-width="800px"
      @update:model-value="
        (v) => {
          if (!v) closeFilePreview()
        }
      "
    >
      <v-card elevation="2" class="rounded-lg" color="surface">
        <v-card-title class="d-flex align-center ga-2 pa-3">
          <v-icon
            v-if="filePreviewDialog.file"
            :icon="getFileIcon(filePreviewDialog.file.mimeType)"
            :color="getFileColor(filePreviewDialog.file.mimeType)"
          ></v-icon>
          <span class="font-weight-bold text-h6 text-truncate">
            {{ filePreviewDialog.file?.name || $t('document.preview_title') }}
          </span>
          <v-spacer></v-spacer>
          <v-btn
            v-if="filePreviewDialog.file"
            icon="mdi-download"
            variant="text"
            size="small"
            :title="$t('document.file_download')"
            @click="downloadFile(filePreviewDialog.file)"
          ></v-btn>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeFilePreview"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-0" style="min-height: 300px; max-height: 70vh; overflow: auto">
          <div
            v-if="filePreviewDialog.loading"
            class="d-flex justify-center align-center"
            style="min-height: 300px"
          >
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
          </div>
          <template v-else-if="filePreviewDialog.objectUrl && filePreviewDialog.file">
            <!-- Image Preview -->
            <img
              v-if="filePreviewDialog.file.mimeType?.startsWith('image/')"
              :src="filePreviewDialog.objectUrl"
              :alt="filePreviewDialog.file.name"
              class="d-block mx-auto"
              style="max-width: 100%; max-height: 65vh; object-fit: contain"
            />
            <!-- PDF Preview -->
            <iframe
              v-else-if="filePreviewDialog.file.mimeType === 'application/pdf'"
              :src="filePreviewDialog.objectUrl"
              style="width: 100%; height: 65vh; border: none"
            ></iframe>
            <!-- Unsupported -->
            <div v-else class="text-center py-8">
              <v-icon icon="mdi-file-question-outline" size="48" color="grey" class="mb-3"></v-icon>
              <div class="text-body-2 text-medium-emphasis">
                {{ $t('document.preview_unsupported') }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ $t('document.preview_download_instead') }}
              </div>
            </div>
          </template>
        </v-card-text>
        <v-card-text
          v-if="filePreviewDialog.file"
          class="pa-3 text-caption text-medium-emphasis d-flex ga-4 flex-wrap"
        >
          <span>{{ formatSize(filePreviewDialog.file.size) }}</span>
          <span>{{ filePreviewDialog.file.mimeType }}</span>
          <span>{{ formatUploadDate(filePreviewDialog.file.uploadedAt) }}</span>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Rename Dialog -->
    <v-dialog v-model="renameDialog.show" max-width="400px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
          {{ $t('document.rename_dialog_title') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-text-field
            v-model="renameDialog.name"
            :label="$t('document.rename_label')"
            variant="outlined"
            density="compact"
            autofocus
            @keyup.enter="executeRename"
          ></v-text-field>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="renameDialog.show = false">{{
            $t('absence.cancel')
          }}</v-btn>
          <v-btn color="primary" variant="flat" @click="executeRename">{{
            $t('document.save')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Move to Folder Dialog -->
    <v-dialog v-model="moveDialog.show" max-width="400px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
          {{ $t('document.move_dialog_title') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-select
            v-model="moveDialog.folderId"
            :items="folderSelectOptions"
            :label="$t('document.move_label')"
            variant="outlined"
            density="compact"
          ></v-select>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="moveDialog.show = false">{{ $t('absence.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="executeMove">{{
            $t('document.save')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete File Confirmation Dialog -->
    <v-dialog v-model="deleteFileDialog.show" max-width="400px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 text-error">
          {{ $t('document.delete_file_title') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          {{ $t('document.delete_file_body', { name: deleteFileDialog.fileName }) }}
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="deleteFileDialog.show = false">{{
            $t('absence.cancel')
          }}</v-btn>
          <v-btn color="error" variant="flat" @click="executeDeleteFile">{{
            $t('absence.delete_confirm')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- File Notes Dialog -->
    <v-dialog v-model="fileNotesDialog.show" max-width="500px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
          {{ $t('document.file_notes_dialog_title') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-textarea
            v-model="fileNotesDialog.notes"
            :label="$t('document.notes')"
            variant="outlined"
            rows="4"
          ></v-textarea>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="fileNotesDialog.show = false">{{
            $t('absence.cancel')
          }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveFileNotes">{{
            $t('document.save')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Link to Checklist Item Dialog -->
    <v-dialog v-model="linkDialog.show" max-width="450px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
          {{ $t('document.link_dialog_title') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-select
            v-model="linkDialog.year"
            :items="linkYearOptions"
            :label="$t('document.link_year_label')"
            variant="outlined"
            density="compact"
            class="mb-3"
          ></v-select>
          <v-select
            v-model="linkDialog.itemId"
            :items="linkItemOptions"
            :label="$t('document.link_item_label')"
            variant="outlined"
            density="compact"
          ></v-select>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="linkDialog.show = false">{{ $t('absence.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!linkDialog.itemId"
            @click="executeLinkFile"
            >{{ $t('document.save') }}</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Attached Files Viewer Dialog -->
    <v-dialog v-model="attachedFilesDialog.show" max-width="550px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 d-flex align-center ga-2">
          <v-icon icon="mdi-paperclip" color="primary"></v-icon>
          {{ attachedFilesDialog.itemTitle }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <div
            v-if="attachedFilesForDialog.length === 0"
            class="text-center py-4 text-medium-emphasis"
          >
            <v-icon icon="mdi-paperclip-off" size="large" class="mb-2"></v-icon>
            <div class="text-subtitle-2">{{ $t('document.vault_empty_title') }}</div>
          </div>
          <v-list v-else density="compact" class="border rounded-lg">
            <v-list-item
              v-for="file in attachedFilesForDialog"
              :key="file.id"
              :prepend-icon="getFileIcon(file.mimeType)"
              :subtitle="formatSize(file.size) + ' · ' + formatUploadDate(file.uploadedAt)"
            >
              <v-list-item-title class="font-weight-medium">{{ file.name }}</v-list-item-title>
              <template #append>
                <v-btn
                  v-if="isPreviewable(file.mimeType)"
                  icon="mdi-eye-outline"
                  variant="text"
                  size="x-small"
                  @click="openFilePreview(file)"
                ></v-btn>
                <v-btn
                  icon="mdi-download"
                  variant="text"
                  size="x-small"
                  @click="downloadFile(file)"
                ></v-btn>
                <v-btn
                  icon="mdi-link-variant-off"
                  variant="text"
                  size="x-small"
                  color="error"
                  :title="$t('document.file_unlink')"
                  @click="unlinkFile(file.id)"
                ></v-btn>
              </template>
            </v-list-item>
          </v-list>

          <div class="d-flex justify-end mt-3">
            <v-btn
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="mdi-paperclip"
              @click="openAttachFromAttachedDialog"
            >
              {{ $t('document.attach_file') }}
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="attachedFilesDialog.show = false">{{
            $t('app.close')
          }}</v-btn>
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
        <v-btn variant="text" size="small" @click="snackbar.show = false">{{
          $t('app.close')
        }}</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.user-select-none {
  user-select: none;
}

.vault-table :deep(.v-table__wrapper) {
  max-height: 420px;
  overflow-y: auto;
}

.vault-table :deep(th) {
  position: sticky !important;
  top: 0 !important;
  background-color: rgb(var(--v-theme-surface)) !important;
  z-index: 2 !important;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
}

.vault-empty-state {
  border-style: dashed !important;
  border-color: rgba(var(--v-theme-primary), 0.3) !important;
  transition: all 0.2s ease;
}

.vault-drag-over {
  border-color: rgb(var(--v-theme-primary)) !important;
  background-color: rgba(var(--v-theme-primary), 0.04) !important;
}

.upload-drop-zone {
  cursor: pointer;
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  transition: all 0.2s ease;
}

.upload-drop-zone:hover,
.upload-drop-active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.vault-file-name {
  text-decoration: none;
  transition: color 0.15s ease;
}

.vault-file-name:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}
</style>
