<script>
import { mapStores } from 'pinia'
import { useDocumentsStore } from '../../stores/documents'
import { useAbsentsStore } from '../../stores/absents'
import { parseDateUTC, formatDateUTC } from '../../utils/date'

export default {
  name: 'ResidenceChecklistSection',

  emits: ['attach-file', 'view-attached', 'show-snackbar'],

  data() {
    return {
      activeYearPanel: null,

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
    }
  },

  computed: {
    ...mapStores(useDocumentsStore, useAbsentsStore),

    residenceChecklist() {
      return this.documentsStore.residenceChecklist
    },

    residenceStats() {
      return this.documentsStore.residenceStats
    },

    categoryOptions() {
      return [
        { title: this.$t('document.cat_official_government'), value: 'Official & Government' },
        { title: this.$t('document.cat_tax_employment'), value: 'Tax & Employment' },
        { title: this.$t('document.cat_financial'), value: 'Financial' },
        { title: this.$t('document.cat_housing'), value: 'Housing' },
        { title: this.$t('document.cat_utilities'), value: 'Utilities' },
        { title: this.$t('document.cat_medical_government'), value: 'Medical & Government' },
        { title: this.$t('document.cat_nhs'), value: 'NHS' },
      ]
    },
  },

  methods: {
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

    getYearDateRangeHint(year) {
      const baseDateStr = this.absentsStore.ukArrivalDate || this.absentsStore.visaStartDate
      if (!baseDateStr) return this.$t('document.year', { n: year })

      const start = parseDateUTC(baseDateStr)
      if (!start) return this.$t('document.year', { n: year })

      const yearStart = new Date(start)
      yearStart.setUTCFullYear(start.getUTCFullYear() + (year - 1))

      const yearEnd = new Date(start)
      yearEnd.setUTCFullYear(start.getUTCFullYear() + year)
      yearEnd.setUTCDate(yearEnd.getUTCDate() - 1)

      return `${formatDateUTC(yearStart)} to ${formatDateUTC(yearEnd)}`
    },

    getSortedItems(year) {
      const items = (this.residenceChecklist && this.residenceChecklist[year]) || []
      const standardOrder = ['council_tax', 'p60_employment', 'housing_proof', 'bank_statements']

      return [...items].sort((a, b) => {
        const indexA = standardOrder.findIndex((suffix) => (a.id || '').includes(suffix))
        const indexB = standardOrder.findIndex((suffix) => (b.id || '').includes(suffix))

        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        return (a.title || '').localeCompare(b.title || '')
      })
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
        case 'NHS':
        case 'cat_nhs':
          return this.$t('document.cat_nhs')
        case 'Official Housing':
          return this.$t('document.cat_official_government')
        case 'Tax & Income':
          return this.$t('document.cat_tax_employment')
        default:
          return item.category
      }
    },

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

    getImportanceText(importance) {
      switch (importance) {
        case 'essential':
          return this.$t('document.importance_essential')
        case 'recommended':
          return this.$t('document.importance_recommended')
        case 'supporting':
          return this.$t('document.importance_supporting')
        default:
          return importance
      }
    },

    getAttachedFileCount(year, itemId) {
      if (!year || !itemId || !Array.isArray(this.documentsStore.uploadedFiles)) return 0
      return this.documentsStore.uploadedFiles.filter(
        (f) => Number(f.linkedYear) === Number(year) && f.linkedItemId === itemId,
      ).length
    },

    updateItemStatus(year, itemId, newStatus) {
      this.documentsStore.updateDocumentItem(year, itemId, { status: newStatus })
      this.$emit('show-snackbar', this.$t('document.status_updated'), 'info')
    },

    openCustomDocDialog(year) {
      this.customDocDialog = {
        show: true,
        year,
        title: '',
        category: 'Housing & Utilities',
      }
    },

    saveCustomDocument() {
      if (!this.customDocDialog.title.trim()) return
      this.documentsStore.addCustomDocumentItem(this.customDocDialog.year, {
        title: this.customDocDialog.title,
        category: this.customDocDialog.category,
      })
      this.customDocDialog.show = false
      this.$emit('show-snackbar', this.$t('document.custom_added'), 'success')
    },

    deleteDocItem(year, itemId) {
      this.documentsStore.deleteDocumentItem(year, itemId)
      this.$emit('show-snackbar', this.$t('document.item_removed'), 'warning')
    },

    openNotesDialog(year, item) {
      this.notesDialog = {
        show: true,
        year,
        itemId: item.id,
        title: item.title,
        notes: item.notes || '',
      }
    },

    saveItemNotes() {
      this.documentsStore.updateDocumentItem(this.notesDialog.year, this.notesDialog.itemId, {
        notes: this.notesDialog.notes,
      })
      this.notesDialog.show = false
      this.$emit('show-snackbar', this.$t('document.notes_saved'), 'success')
    },

    openAttachFileDialog(year, item) {
      this.$emit('attach-file', { year, item })
    },

    openAttachedFilesDialog(year, item) {
      this.$emit('view-attached', { year, item })
    },
  },
}
</script>

<template>
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

            <v-expansion-panel-text class="compact-panel-text">
              <div class="d-flex align-center justify-end mb-2 ga-2 flex-wrap">
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
              <v-table density="compact" hover class="border rounded-lg">
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
                            <v-list-item-title class="text-caption text-info font-weight-bold">{{
                              $t('document.status_collected')
                            }}</v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="updateItemStatus(year, item.id, 'verified')">
                            <v-list-item-title class="text-caption text-success font-weight-bold">{{
                              $t('document.status_verified')
                            }}</v-list-item-title>
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
  </v-col>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.compact-panel-text :deep(.v-expansion-panel-text__wrapper) {
  padding: 4px 6px 8px 6px !important;
}
</style>
