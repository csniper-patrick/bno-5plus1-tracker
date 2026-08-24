<script>
import { mapStores } from 'pinia'
import { useDocumentsStore } from '../../stores/documents'
import { normalizeDate } from '../../utils/date'
import { formatFileSize, createFileURL } from '../../services/fileStorageService'

export default {
  name: 'DocumentVaultSection',

  emits: ['show-snackbar'],

  data() {
    return {
      vaultActiveFolder: 'all',
      vaultSortBy: 'uploadedAt',
      vaultSortOrder: 'desc',
      vaultDragOver: false,

      // Upload dialog state
      uploadDialog: {
        show: false,
        files: [],
        folderId: 'other',
        linkedYear: null,
        linkedItemId: null,
        linkedAddressId: null,
        notes: '',
        uploading: false,
      },

      // Rename dialog state
      renameDialog: {
        show: false,
        fileId: null,
        name: '',
      },

      // Move dialog state
      moveDialog: {
        show: false,
        fileId: null,
        folderId: 'other',
      },

      // Delete file dialog state
      deleteFileDialog: {
        show: false,
        fileId: null,
        fileName: '',
      },

      // File notes dialog state
      fileNotesDialog: {
        show: false,
        fileId: null,
        notes: '',
      },

      // Link file dialog state
      linkDialog: {
        show: false,
        fileId: null,
        targetType: 'checklist',
        year: 1,
        itemId: null,
        addressId: null,
      },

      // Attached files viewer dialog state
      attachedFilesDialog: {
        show: false,
        year: null,
        itemId: null,
        addressId: null,
        itemTitle: '',
      },
    }
  },

  computed: {
    ...mapStores(useDocumentsStore),

    folders() {
      return this.documentsStore.folders
    },

    uploadedFiles() {
      return this.documentsStore.uploadedFiles
    },

    totalFileStorageBytes() {
      return this.documentsStore.totalFileStorageBytes
    },

    addressHistory() {
      return this.documentsStore.addressHistory
    },

    residenceChecklist() {
      return this.documentsStore.residenceChecklist
    },

    allowedFileExtensions() {
      return '.pdf,.jpg,.jpeg,.png,.webp,.txt'
    },

    maxFileSizeFormatted() {
      return '10 MB'
    },

    fileCountByFolder() {
      const counts = {}
      for (const folder of this.folders) {
        counts[folder.id] = 0
      }
      for (const file of this.uploadedFiles) {
        if (counts[file.folderId] !== undefined) {
          counts[file.folderId]++
        }
      }
      return counts
    },

    filteredFiles() {
      if (this.vaultActiveFolder === 'all') {
        return this.uploadedFiles
      }
      return this.uploadedFiles.filter((f) => f.folderId === this.vaultActiveFolder)
    },

    sortedFiles() {
      const files = [...this.filteredFiles]
      const field = this.vaultSortBy
      const isAsc = this.vaultSortOrder === 'asc'

      return files.sort((a, b) => {
        let valA = a[field]
        let valB = b[field]

        if (field === 'name') {
          valA = (valA || '').toLowerCase()
          valB = (valB || '').toLowerCase()
        } else if (field === 'size') {
          valA = valA || 0
          valB = valB || 0
        } else if (field === 'uploadedAt') {
          valA = valA || ''
          valB = valB || ''
        } else if (field === 'folder') {
          valA = this.getFolderLabel(a.folderId)
          valB = this.getFolderLabel(b.folderId)
        }

        if (valA < valB) return isAsc ? -1 : 1
        if (valA > valB) return isAsc ? 1 : -1
        return 0
      })
    },

    folderSelectOptions() {
      return this.folders.map((f) => ({
        title: this.$t(`document.folder_${f.id}`),
        value: f.id,
      }))
    },

    linkTargetTypeOptions() {
      return [
        { title: this.$t('document.link_type_checklist'), value: 'checklist' },
        { title: this.$t('document.link_type_address'), value: 'address' },
      ]
    },

    linkYearOptions() {
      return [1, 2, 3, 4, 5].map((y) => ({
        title: this.$t('document.year', { n: y }),
        value: y,
      }))
    },

    linkItemOptions() {
      const year = this.linkDialog.year
      const items = (this.residenceChecklist && this.residenceChecklist[year]) || []
      return items.map((item) => ({
        title: this.getItemTitle(item),
        value: item.id,
      }))
    },

    linkAddressOptions() {
      return this.addressHistory.map((addr) => ({
        title: `${addr.addressLine1}${addr.postcode ? ', ' + addr.postcode : ''}`,
        value: addr.id,
      }))
    },

    attachedFilesForDialog() {
      if (this.attachedFilesDialog.addressId) {
        return this.documentsStore.getFilesForAddress(this.attachedFilesDialog.addressId)
      }
      if (this.attachedFilesDialog.year && this.attachedFilesDialog.itemId) {
        return this.documentsStore.getFilesForItem(
          this.attachedFilesDialog.year,
          this.attachedFilesDialog.itemId,
        )
      }
      return []
    },
  },

  methods: {
    sortByHeader(field) {
      if (this.vaultSortBy === field) {
        this.vaultSortOrder = this.vaultSortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        this.vaultSortBy = field
        this.vaultSortOrder = 'asc'
      }
    },

    toggleSortOrder() {
      this.vaultSortOrder = this.vaultSortOrder === 'asc' ? 'desc' : 'asc'
    },

    getFolderLabel(folderId) {
      const key = `document.folder_${folderId}`
      const translated = this.$t(key)
      return translated !== key ? translated : folderId
    },

    isPdf(mimeType, fileName = '') {
      if (mimeType === 'application/pdf' || mimeType === 'application/x-pdf') return true
      if (fileName && fileName.toLowerCase().endsWith('.pdf')) return true
      return false
    },

    getFileIcon(mimeType, fileName = '') {
      if (this.isPdf(mimeType, fileName)) return 'mdi-file-pdf-box'
      if (!mimeType) return 'mdi-file-outline'
      if (mimeType.startsWith('image/')) return 'mdi-file-image-outline'
      if (mimeType === 'text/plain') return 'mdi-file-document-outline'
      return 'mdi-file-outline'
    },

    getFileColor(mimeType, fileName = '') {
      if (this.isPdf(mimeType, fileName)) return 'error'
      if (!mimeType) return 'grey'
      if (mimeType.startsWith('image/')) return 'info'
      if (mimeType === 'text/plain') return 'secondary'
      return 'grey'
    },

    formatSize(bytes) {
      return formatFileSize(bytes)
    },

    formatUploadDate(isoString) {
      if (!isoString) return '-'
      return normalizeDate(isoString) || String(isoString)
    },

    openUploadDialog(folderId, linkedYear, linkedItemId, linkedAddressId) {
      this.uploadDialog = {
        show: true,
        files: [],
        folderId: folderId || 'other',
        linkedYear: linkedYear || null,
        linkedItemId: linkedItemId || null,
        linkedAddressId: linkedAddressId || null,
        notes: '',
        uploading: false,
      }
    },

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

    async executeUpload() {
      if (this.uploadDialog.files.length === 0) return
      this.uploadDialog.uploading = true

      let successCount = 0
      for (const file of this.uploadDialog.files) {
        try {
          await this.documentsStore.uploadFile(file, this.uploadDialog.folderId, {
            linkedYear: this.uploadDialog.linkedYear,
            linkedItemId: this.uploadDialog.linkedItemId,
            linkedAddressId: this.uploadDialog.linkedAddressId,
            notes: this.uploadDialog.notes,
          })
          successCount++
        } catch (e) {
          this.$emit(
            'show-snackbar',
            this.$t('document.upload_error', { error: e.message }),
            'error',
          )
        }
      }

      this.uploadDialog.uploading = false
      this.uploadDialog.show = false

      if (successCount > 0) {
        const msg =
          successCount === 1
            ? this.$t('document.upload_success')
            : this.$t('document.upload_success_multi', { count: successCount })
        this.$emit('show-snackbar', msg, 'success')
      }
    },

    async openFileInNewTab(fileMeta) {
      if (!fileMeta || !fileMeta.id) return
      const newTab = window.open('', '_blank')
      try {
        const fullRecord = await this.documentsStore.getFullFileRecord(fileMeta.id)
        if (fullRecord && fullRecord.data) {
          const url = createFileURL(fullRecord)
          if (newTab) {
            newTab.location.href = url
          } else {
            window.open(url, '_blank', 'noopener,noreferrer')
          }
          setTimeout(() => {
            URL.revokeObjectURL(url)
          }, 60000)
        } else if (newTab) {
          newTab.close()
        }
      } catch (e) {
        if (newTab) newTab.close()
        console.error('Failed to open file in new tab:', e)
      }
    },

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

    openRenameDialog(fileMeta) {
      this.renameDialog = {
        show: true,
        fileId: fileMeta.id,
        name: fileMeta.name,
      }
    },

    async executeRename() {
      if (!this.renameDialog.name.trim()) return
      try {
        await this.documentsStore.renameFile(
          this.renameDialog.fileId,
          this.renameDialog.name.trim(),
        )
        this.renameDialog.show = false
        this.$emit('show-snackbar', this.$t('document.file_renamed'), 'success')
      } catch (e) {
        this.$emit('show-snackbar', e.message, 'error')
      }
    },

    openMoveDialog(fileMeta) {
      this.moveDialog = {
        show: true,
        fileId: fileMeta.id,
        folderId: fileMeta.folderId,
      }
    },

    async executeMove() {
      await this.documentsStore.moveFile(this.moveDialog.fileId, this.moveDialog.folderId)
      this.moveDialog.show = false
      this.$emit(
        'show-snackbar',
        this.$t('document.file_moved', { folder: this.getFolderLabel(this.moveDialog.folderId) }),
        'success',
      )
    },

    openFileNotesDialog(fileMeta) {
      this.fileNotesDialog = {
        show: true,
        fileId: fileMeta.id,
        notes: fileMeta.notes || '',
      }
    },

    async saveFileNotes() {
      await this.documentsStore.updateFileNotes(
        this.fileNotesDialog.fileId,
        this.fileNotesDialog.notes,
      )
      this.fileNotesDialog.show = false
      this.$emit('show-snackbar', this.$t('document.file_notes_updated'), 'success')
    },

    openDeleteFileDialog(fileMeta) {
      this.deleteFileDialog = {
        show: true,
        fileId: fileMeta.id,
        fileName: fileMeta.name,
      }
    },

    async executeDeleteFile() {
      await this.documentsStore.deleteUploadedFile(this.deleteFileDialog.fileId)
      this.deleteFileDialog.show = false
      this.$emit('show-snackbar', this.$t('document.file_deleted'), 'warning')
    },

    openLinkDialog(fileMeta) {
      let targetType = 'checklist'
      let addressId = null
      if (fileMeta.linkedAddressId) {
        targetType = 'address'
        addressId = fileMeta.linkedAddressId
      }
      this.linkDialog = {
        show: true,
        fileId: fileMeta.id,
        targetType,
        year: fileMeta.linkedYear || 1,
        itemId: fileMeta.linkedItemId || null,
        addressId: addressId || (this.addressHistory[0] ? this.addressHistory[0].id : null),
      }
    },

    async executeLinkFile() {
      if (this.linkDialog.targetType === 'address') {
        if (!this.linkDialog.addressId) return
        await this.documentsStore.linkFileToAddress(
          this.linkDialog.fileId,
          this.linkDialog.addressId,
        )
        this.linkDialog.show = false
        this.$emit('show-snackbar', this.$t('document.file_linked_address'), 'success')
      } else {
        if (!this.linkDialog.itemId) return
        await this.documentsStore.linkFileToChecklist(
          this.linkDialog.fileId,
          this.linkDialog.year,
          this.linkDialog.itemId,
        )
        this.linkDialog.show = false
        this.$emit('show-snackbar', this.$t('document.file_linked'), 'success')
      }
    },

    async unlinkFile(fileId) {
      await this.documentsStore.unlinkFileFromChecklist(fileId)
      this.$emit('show-snackbar', this.$t('document.file_unlinked'), 'info')
    },

    openAttachFromAttachedDialog() {
      if (this.attachedFilesDialog.addressId) {
        const addressId = this.attachedFilesDialog.addressId
        this.attachedFilesDialog.show = false
        this.openAttachAddressFileDialog({ id: addressId })
      } else {
        const year = this.attachedFilesDialog.year
        const item = { id: this.attachedFilesDialog.itemId }
        this.attachedFilesDialog.show = false
        this.openAttachFileDialog(year, item)
      }
    },

    openAttachedFilesDialog(year, item) {
      this.attachedFilesDialog = {
        show: true,
        year,
        itemId: item.id,
        addressId: null,
        itemTitle: this.getItemTitle(item),
      }
    },

    openAttachedAddressFilesDialog(item) {
      const title = `${item.addressLine1}${item.postcode ? ', ' + item.postcode : ''}`
      this.attachedFilesDialog = {
        show: true,
        year: null,
        itemId: null,
        addressId: item.id,
        itemTitle: title,
      }
    },

    openAttachAddressFileDialog(item) {
      this.openUploadDialog('addresses', null, null, item.id)
    },

    openAttachFileDialog(year, item) {
      const folderId = `year_${year}`
      this.openUploadDialog(folderId, year, item.id)
    },

    getLinkedAddressLabel(addressId) {
      const addr = this.addressHistory.find((a) => a.id === addressId)
      if (!addr) return this.$t('document.linked_to_address')
      return `${addr.addressLine1}${addr.postcode ? ', ' + addr.postcode : ''}`
    },

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
  },
}
</script>

<template>
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

    <!-- Folder Tabs Toolbar -->
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
      <v-chip-group v-model="vaultActiveFolder" mandatory column selected-class="text-primary">
        <v-chip value="all" variant="tonal" size="small" filter class="my-1">
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
          class="my-1"
        >
          <span class="text-truncate" style="max-width: 160px">{{
            $t(`document.folder_${folder.id}`)
          }}</span>
          <template v-if="fileCountByFolder[folder.id] > 0">
            <span class="ml-1 text-caption">({{ fileCountByFolder[folder.id] }})</span>
          </template>
        </v-chip>
      </v-chip-group>
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
          <th class="text-left font-weight-bold" style="width: 40px; min-width: 40px"></th>
          <th
            class="text-left font-weight-bold cursor-pointer user-select-none text-no-wrap"
            style="min-width: 200px"
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
            class="text-left font-weight-bold cursor-pointer user-select-none text-no-wrap"
            style="min-width: 150px"
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
            class="text-left font-weight-bold cursor-pointer user-select-none text-no-wrap"
            style="min-width: 130px"
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
            class="text-left font-weight-bold cursor-pointer user-select-none text-no-wrap"
            style="min-width: 160px"
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
          <th class="text-right font-weight-bold text-no-wrap" style="width: 50px; min-width: 50px">
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
                @click="openFileInNewTab(file)"
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
              <v-chip
                v-else-if="file.linkedAddressId"
                size="x-small"
                variant="tonal"
                color="info"
                prepend-icon="mdi-home-city-outline"
                :title="getLinkedAddressLabel(file.linkedAddressId)"
              >
                {{ $t('document.linked_to_address') }}
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
          <td class="text-no-wrap">
            <v-chip
              size="x-small"
              variant="tonal"
              color="primary"
              :title="getFolderLabel(file.folderId)"
              :prepend-icon="
                folders.find((f) => f.id === file.folderId)?.icon || 'mdi-folder-outline'
              "
            >
              <span>{{ getFolderLabel(file.folderId) }}</span>
            </v-chip>
          </td>
          <td class="text-caption text-medium-emphasis text-no-wrap">
            {{ formatSize(file.size) }}
          </td>
          <td class="text-caption text-medium-emphasis text-no-wrap">
            {{ formatUploadDate(file.uploadedAt) }}
          </td>
          <td class="text-right text-no-wrap">
            <v-menu location="bottom end">
              <template #activator="{ props }">
                <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props"></v-btn>
              </template>
              <v-list density="compact" class="rounded-lg elevation-4">
                <v-list-item
                  prepend-icon="mdi-open-in-new"
                  :title="$t('document.open_new_tab')"
                  @click="openFileInNewTab(file)"
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
                  v-if="file.linkedItemId || file.linkedAddressId"
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

    <!-- Link Document Dialog -->
    <v-dialog v-model="linkDialog.show" max-width="450px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
          {{ $t('document.link_dialog_title') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-select
            v-model="linkDialog.targetType"
            :items="linkTargetTypeOptions"
            :label="$t('document.link_type_label')"
            variant="outlined"
            density="compact"
            class="mb-3"
          ></v-select>

          <template v-if="linkDialog.targetType === 'checklist'">
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
          </template>

          <template v-else-if="linkDialog.targetType === 'address'">
            <v-select
              v-model="linkDialog.addressId"
              :items="linkAddressOptions"
              :label="$t('document.link_address_label')"
              variant="outlined"
              density="compact"
              :no-data-text="$t('document.no_addresses_title')"
            ></v-select>
          </template>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="linkDialog.show = false">{{ $t('absence.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="
              linkDialog.targetType === 'checklist' ? !linkDialog.itemId : !linkDialog.addressId
            "
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
              <v-list-item-title
                class="font-weight-medium cursor-pointer vault-file-name"
                @click="openFileInNewTab(file)"
              >
                {{ file.name }}
              </v-list-item-title>
              <template #append>
                <v-btn
                  icon="mdi-open-in-new"
                  variant="text"
                  size="x-small"
                  :title="$t('document.open_new_tab')"
                  @click="openFileInNewTab(file)"
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
  </v-card>
</template>

<style scoped>
.upload-drop-zone {
  border: 2px dashed rgba(var(--v-theme-primary), 0.4);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  background: rgba(var(--v-theme-primary), 0.02);
}
.upload-drop-zone:hover {
  border-color: rgba(var(--v-theme-primary), 0.8);
  background: rgba(var(--v-theme-primary), 0.05);
}
.upload-drop-active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}
.vault-drag-over {
  outline: 2px dashed rgb(var(--v-theme-primary));
  outline-offset: -4px;
}
.vault-file-name:hover {
  text-decoration: underline;
  color: rgb(var(--v-theme-primary));
}
.cursor-pointer {
  cursor: pointer;
}
.user-select-none {
  user-select: none;
}
</style>
