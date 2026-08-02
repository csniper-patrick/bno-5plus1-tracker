<script setup>
/**
 * Root Application Component
 * Renders top-level Vuetify app container, app bar header with theme toggling,
 * right navigation drawer with consolidated data management (Export, Import, Clear All),
 * main RouterView, and PWA ReloadPrompt modal.
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useTheme } from 'vuetify'
import { Document, parse } from 'yaml'
import { useAbsentsStore } from './stores/absents'
import { useDocumentsStore } from './stores/documents'
import ReloadPrompt from './components/ReloadPrompt.vue'

// Vuetify theme & router instances
const theme = useTheme()
const route = useRoute()

// Store instances
const absentsStore = useAbsentsStore()
const documentsStore = useDocumentsStore()

// Navigation drawer and confirmation dialog states
const drawer = ref(false)
const clearAllDialog = ref(false)

// Global snackbar feedback state
const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
})

// File input element reference for YAML import
const fileInputRef = ref(null)

let mediaQuery = null

function handleSystemThemeChange(e) {
  theme.global.name.value = e.matches ? 'dark' : 'light'
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange)
    }
  }
})

onUnmounted(() => {
  if (mediaQuery) {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    } else if (mediaQuery.removeListener) {
      mediaQuery.removeListener(handleSystemThemeChange)
    }
  }
})

/**
 * Toggles current active theme between Union Jack dark and light palettes.
 */
function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

function showSnackbar(text, color = 'success') {
  snackbar.value = {
    show: true,
    text,
    color,
  }
}

/**
 * Consolidated YAML Export for all application data (absences & documents) with inline node comments.
 */
function exportAllData() {
  try {
    const userAbsences = absentsStore.absences
      .filter((item) => !item.isAutoArrival && item.id !== 'auto_uk_arrival_record')
      .map((item) => ({
        startDate: item.startDate,
        endDate: item.endDate,
        dest: item.dest || '',
      }))

    const doc = new Document()
    doc.commentBefore =
      ' BNO 5+1 Tracker - Full Data Backup\n' +
      ' Date format for all dates: YYYY-MM-DD\n' +
      ' Keep this file safe as a backup for your ILR & Naturalisation applications.'

    const rootMap = doc.createNode({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      visa_start_date: absentsStore.visaStartDate || '',
      uk_arrival_date: absentsStore.ukArrivalDate || '',
      ilr_approved_date: absentsStore.ilrApprovedDate || '',
      absences: userAbsences,
      documents: {
        lifeInUk: documentsStore.lifeInUk,
        englishTest: documentsStore.englishTest,
        residenceChecklist: documentsStore.residenceChecklist,
        addressHistory: documentsStore.addressHistory,
      },
    })

    // Attach descriptive comments above each variable/node
    if (rootMap && rootMap.items) {
      rootMap.items.forEach((pair) => {
        const k = pair.key && pair.key.value !== undefined ? pair.key.value : pair.key
        if (k === 'version') {
          pair.key.commentBefore = ' Backup Schema Version'
        } else if (k === 'exportedAt') {
          pair.key.commentBefore = ' ISO Timestamp when backup was generated'
        } else if (k === 'visa_start_date') {
          pair.key.commentBefore = ' BNO Visa Start Date (YYYY-MM-DD)'
        } else if (k === 'uk_arrival_date') {
          pair.key.commentBefore = ' First UK Arrival Date under BNO Visa (YYYY-MM-DD)'
        } else if (k === 'ilr_approved_date') {
          pair.key.commentBefore = ' ILR Approved Date (YYYY-MM-DD), if already granted'
        } else if (k === 'absences') {
          pair.key.commentBefore = ' List of UK Absences (Travel History Log)'
        } else if (k === 'documents') {
          pair.key.commentBefore = ' Document & Qualification Tracker State'

          if (pair.value && pair.value.items) {
            pair.value.items.forEach((docPair) => {
              const docKey =
                docPair.key && docPair.key.value !== undefined ? docPair.key.value : docPair.key
              if (docKey === 'lifeInUk') {
                docPair.key.commentBefore =
                  ' Life in the UK Test Status & Reference (status: not_started | scheduled | passed)'
              } else if (docKey === 'englishTest') {
                docPair.key.commentBefore =
                  ' English B1 Language Requirement (type: b1_selt | uk_degree | enic_statement | exempt)'
              } else if (docKey === 'residenceChecklist') {
                docPair.key.commentBefore =
                  ' 5-Year Continuous Residence Evidence Checklist (Years 1 to 5)'
              } else if (docKey === 'addressHistory') {
                docPair.key.commentBefore =
                  ' UK Address History Log (5-Year Residential History for SET(O) / Naturalisation)'
              }
            })
          }
        }
      })
    }

    doc.contents = rootMap
    const yamlContent = doc.toString()

    const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bno-5plus1-tracker-backup_${new Date().toISOString().split('T')[0]}.yaml`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showSnackbar('All tracker data exported with comments to YAML!', 'success')
  } catch (err) {
    showSnackbar('Export failed: ' + err.message, 'error')
  }
}

/**
 * Trigger hidden file input click for YAML import.
 */
function triggerImport() {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

/**
 * Consolidated YAML Import for all application data.
 */
function handleImportFileSelect(event) {
  const file = event.target.files && event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target.result
      if (!content || typeof content !== 'string') {
        throw new Error('File content is empty.')
      }

      const parsed = parse(content)
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Parsed YAML content is invalid.')
      }

      // Import Absences & Key Visa Dates if present
      let absenceCount = 0
      if (parsed.absences || parsed.visa_start_date || parsed.uk_arrival_date) {
        const res = absentsStore.importYAML(content)
        absenceCount = res.count
      }

      // Import Document Tracker data if present
      let docsImported = false
      if (parsed.documents) {
        if (parsed.documents.lifeInUk) documentsStore.updateLifeInUk(parsed.documents.lifeInUk)
        if (parsed.documents.englishTest)
          documentsStore.updateEnglishTest(parsed.documents.englishTest)
        if (parsed.documents.residenceChecklist) {
          Object.keys(parsed.documents.residenceChecklist).forEach((year) => {
            documentsStore.residenceChecklist[year] = parsed.documents.residenceChecklist[year]
          })
        }
        if (parsed.documents.addressHistory && Array.isArray(parsed.documents.addressHistory)) {
          documentsStore.addressHistory = parsed.documents.addressHistory
        }
        docsImported = true
      } else {
        // Fallback for standalone document YAML exports
        if (parsed.lifeInUk) {
          documentsStore.updateLifeInUk(parsed.lifeInUk)
          docsImported = true
        }
        if (parsed.englishTest) {
          documentsStore.updateEnglishTest(parsed.englishTest)
          docsImported = true
        }
        if (parsed.residenceChecklist) {
          Object.keys(parsed.residenceChecklist).forEach((year) => {
            documentsStore.residenceChecklist[year] = parsed.residenceChecklist[year]
          })
          docsImported = true
        }
        if (parsed.addressHistory && Array.isArray(parsed.addressHistory)) {
          documentsStore.addressHistory = parsed.addressHistory
          docsImported = true
        }
      }

      showSnackbar(
        `Import complete! (${absenceCount} absence(s)${docsImported ? ', document tracker data' : ''})`,
        'success',
      )
    } catch (err) {
      showSnackbar('Failed to import YAML: ' + err.message, 'error')
    }
  }
  reader.readAsText(file)
}

/**
 * Consolidated Clear All for all application data.
 */
function confirmClearAll() {
  absentsStore.clearAbsences()
  documentsStore.resetAll()
  clearAllDialog.value = false
  drawer.value = false
  showSnackbar('All application records & document checklists cleared.', 'warning')
}
</script>

<template>
  <v-app>
    <!-- Hidden File Input for Consolidated YAML Import -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".yaml,.yml"
      style="display: none"
      @change="handleImportFileSelect"
    />

    <!-- Top Application Bar -->
    <v-app-bar color="primary" elevation="2" class="px-2 px-sm-4">
      <div class="w-100 mx-auto d-flex align-center" style="max-width: 1600px">
        <v-icon icon="mdi-passport" size="large" class="ml-2 ml-sm-3 mr-2"></v-icon>
        <v-app-bar-title class="font-weight-bold text-truncate flex-shrink-1">
          BNO 5+1 Tracker
        </v-app-bar-title>

        <v-spacer></v-spacer>

        <!-- Current Active View Chip (Desktop) -->
        <v-chip
          size="small"
          color="secondary"
          class="d-none d-sm-inline-flex mr-2 font-weight-bold"
          variant="flat"
          prepend-icon="mdi-crown-outline"
        >
          {{ route.path === '/documents' ? 'Document Tracker' : 'Absence Tracker' }}
        </v-chip>

        <!-- Theme Switcher -->
        <v-btn
          :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="text"
          title="Toggle Theme"
          @click="toggleTheme"
        ></v-btn>

        <!-- Right Drawer Hamburger Menu Button -->
        <v-btn
          icon="mdi-menu"
          variant="text"
          class="ml-1"
          title="Navigation Menu"
          @click="drawer = !drawer"
        ></v-btn>
      </div>
    </v-app-bar>

    <!-- Right Side Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      location="right"
      temporary
      width="340"
      color="surface"
      elevation="4"
    >
      <v-list-item class="py-4 px-4 border-bottom">
        <template v-slot:prepend>
          <v-icon icon="mdi-passport" color="primary" size="large"></v-icon>
        </template>
        <v-list-item-title class="font-weight-bold text-subtitle-1">
          Navigation & Data
        </v-list-item-title>
        <v-list-item-subtitle class="text-caption">
          UK BNO 5+1 Settlement Path
        </v-list-item-subtitle>
        <template v-slot:append>
          <v-btn icon="mdi-close" variant="text" size="small" @click="drawer = false"></v-btn>
        </template>
      </v-list-item>

      <v-divider></v-divider>

      <!-- Section: Navigation Trackers -->
      <v-list-subheader class="font-weight-bold text-uppercase text-caption px-4 pt-3 pb-1">
        Trackers
      </v-list-subheader>

      <v-list nav class="px-2 py-1">
        <v-list-item
          to="/"
          exact
          color="primary"
          rounded="lg"
          class="mb-2"
          @click="drawer = false"
        >
          <template v-slot:prepend>
            <v-icon icon="mdi-airplane-takeoff" color="primary"></v-icon>
          </template>
          <v-list-item-title class="font-weight-bold">
            Absence Tracker
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            180-day rolling & 450-day limits
          </v-list-item-subtitle>
        </v-list-item>

        <v-list-item
          to="/documents"
          exact
          color="primary"
          rounded="lg"
          class="mb-2"
          @click="drawer = false"
        >
          <template v-slot:prepend>
            <v-icon icon="mdi-file-document-check-outline" color="primary"></v-icon>
          </template>
          <v-list-item-title class="font-weight-bold">
            Document Tracker
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            Life in UK, B1 English & Residence proof
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <template v-slot:append>
        <div class="border-top pa-3">
          <v-list-subheader class="font-weight-bold text-uppercase text-caption px-2 pb-1">
            Data Management (All Trackers)
          </v-list-subheader>

          <v-list nav density="compact" class="pa-0">
            <v-list-item
              rounded="lg"
              class="mb-1"
              @click="exportAllData"
            >
              <template v-slot:prepend>
                <v-icon icon="mdi-download-outline" color="primary" size="small"></v-icon>
              </template>
              <v-list-item-title class="font-weight-bold text-caption">
                Export All Data (YAML)
              </v-list-item-title>
            </v-list-item>

            <v-list-item
              rounded="lg"
              class="mb-1"
              @click="triggerImport"
            >
              <template v-slot:prepend>
                <v-icon icon="mdi-upload-outline" color="primary" size="small"></v-icon>
              </template>
              <v-list-item-title class="font-weight-bold text-caption">
                Import Data (YAML)
              </v-list-item-title>
            </v-list-item>

            <v-list-item
              rounded="lg"
              class="mb-1"
              color="error"
              @click="clearAllDialog = true"
            >
              <template v-slot:prepend>
                <v-icon icon="mdi-delete-sweep-outline" color="error" size="small"></v-icon>
              </template>
              <v-list-item-title class="font-weight-bold text-caption text-error">
                Clear All Data
              </v-list-item-title>
            </v-list-item>
          </v-list>

          <div class="pt-2 text-center">
            <div class="text-caption text-medium-emphasis" style="font-size: 11px;">
              BNO 5+1 Tracker • Home Office Compliant
            </div>
          </div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Main Content Area -->
    <v-main>
      <v-container class="mx-auto py-6 px-4 px-md-8" style="max-width: 1600px">
        <RouterView />
      </v-container>
    </v-main>

    <!-- Clear All Confirmation Dialog -->
    <v-dialog v-model="clearAllDialog" max-width="450">
      <v-card color="surface">
        <v-card-title class="text-h6 font-weight-bold pt-4 px-6 text-error">
          <v-icon icon="mdi-alert" color="error" class="mr-2"></v-icon>
          Clear All Tracker Data?
        </v-card-title>
        <v-card-text class="px-6 py-2">
          This action will permanently delete all <strong>Absence Records</strong>, <strong>Visa & Arrival Dates</strong>, <strong>Life in the UK Test details</strong>, <strong>English Qualification details</strong>, and <strong>Continuous Residence Checklists</strong> across all trackers.
          <br /><br />
          This cannot be undone unless you have a YAML backup.
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="clearAllDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmClearAll">Clear Everything</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Global Snackbar Notification -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3500"
      location="bottom end"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>

    <!-- PWA New Version Update Prompt -->
    <ReloadPrompt />
  </v-app>
</template>

<style scoped>
.border-bottom {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.border-top {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
