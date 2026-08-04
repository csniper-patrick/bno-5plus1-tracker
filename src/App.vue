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
import { useAbsentsStore } from './stores/absents'
import { useDocumentsStore } from './stores/documents'
import { exportFullBackup, parseYAML } from './services/backupService'
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

onMounted(async () => {
  await Promise.all([absentsStore.initStore(), documentsStore.initStore()])

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
    const yamlContent = exportFullBackup(absentsStore, documentsStore)

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
      const parsed = parseYAML(content)

      // Import Absences & Key Visa Dates if present
      let absenceCount = 0
      if (parsed.absences || parsed.visa_start_date || parsed.uk_arrival_date) {
        const res = absentsStore.importYAML(content)
        absenceCount = res.count
      }

      // Import Document Tracker data (including address history) if present
      const docsImported = documentsStore.importData(parsed)

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
          <v-chip
            size="x-small"
            color="amber-darken-2"
            variant="flat"
            class="d-none d-sm-inline-flex ml-2 font-weight-bold"
            style="vertical-align: middle"
          >
            Unofficial 3rd-Party App
          </v-chip>
          <v-chip
            size="small"
            color="success"
            variant="flat"
            class="d-none d-md-inline-flex ml-2 font-weight-bold"
            style="vertical-align: middle"
            prepend-icon="mdi-shield-check"
          >
            100% Local Device Storage
          </v-chip>
        </v-app-bar-title>

        <v-spacer></v-spacer>

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
          UK BNO 5+1 Settlement Path (3rd-Party Tool)
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
        <v-list-item to="/" exact color="primary" rounded="lg" class="mb-2" @click="drawer = false">
          <template v-slot:prepend>
            <v-icon icon="mdi-airplane-takeoff" color="primary"></v-icon>
          </template>
          <v-list-item-title class="font-weight-bold"> Absence </v-list-item-title>
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
          <v-list-item-title class="font-weight-bold"> Document </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            Life in UK, B1 English & Residence proof
          </v-list-item-subtitle>
        </v-list-item>

        <v-list-item
          to="/reference"
          exact
          color="primary"
          rounded="lg"
          class="mb-2"
          @click="drawer = false"
        >
          <template v-slot:prepend>
            <v-icon icon="mdi-bookshelf" color="primary"></v-icon>
          </template>
          <v-list-item-title class="font-weight-bold"> Reference </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            Official GOV.UK guidance & policy resources
          </v-list-item-subtitle>
        </v-list-item>

        <v-list-item
          href="https://gitlab.com/CSniper/bno-5plus1-tracker"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          rounded="lg"
          class="mb-2"
        >
          <template v-slot:prepend>
            <v-icon icon="mdi-gitlab" color="primary"></v-icon>
          </template>
          <v-list-item-title class="font-weight-bold"> GitLab Repository </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            Source code & project repository
          </v-list-item-subtitle>
          <template v-slot:append>
            <v-icon icon="mdi-open-in-new" size="x-small" color="medium-emphasis"></v-icon>
          </template>
        </v-list-item>
      </v-list>

      <template v-slot:append>
        <div class="border-top pa-3">
          <v-list-subheader class="font-weight-bold text-uppercase text-caption px-2 pb-1">
            Data Management (All Trackers)
          </v-list-subheader>

          <v-list nav density="compact" class="pa-0">
            <v-list-item rounded="lg" class="mb-1" @click="exportAllData">
              <template v-slot:prepend>
                <v-icon icon="mdi-download-outline" color="primary" size="small"></v-icon>
              </template>
              <v-list-item-title class="font-weight-bold text-caption">
                Export All Data (YAML)
              </v-list-item-title>
            </v-list-item>

            <v-list-item rounded="lg" class="mb-1" @click="triggerImport">
              <template v-slot:prepend>
                <v-icon icon="mdi-upload-outline" color="primary" size="small"></v-icon>
              </template>
              <v-list-item-title class="font-weight-bold text-caption">
                Import Data (YAML)
              </v-list-item-title>
            </v-list-item>

            <v-list-item rounded="lg" class="mb-1" color="error" @click="clearAllDialog = true">
              <template v-slot:prepend>
                <v-icon icon="mdi-delete-sweep-outline" color="error" size="small"></v-icon>
              </template>
              <v-list-item-title class="font-weight-bold text-caption text-error">
                Clear All Data
              </v-list-item-title>
            </v-list-item>
          </v-list>

          <div class="pt-2 text-center">
            <v-alert
              type="info"
              variant="tonal"
              icon="mdi-shield-lock-outline"
              class="mb-3 text-caption text-left"
              density="compact"
            >
              <strong>Privacy Note:</strong> All data input is stored locally on your device in
              browser <code>IndexedDB</code>. No data is sent to external servers.
            </v-alert>
            <div class="text-caption text-medium-emphasis" style="font-size: 11px">
              BNO 5+1 Tracker • Unofficial 3rd-Party App
            </div>
            <div class="text-caption text-medium-emphasis mt-1" style="font-size: 10px">
              Not affiliated with the UK Home Office • Stored Locally on Device
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
          This action will permanently delete all <strong>Absence Records</strong>,
          <strong>Visa & Arrival Dates</strong>, <strong>Life in the UK Test details</strong>,
          <strong>English Qualification details</strong>, and
          <strong>Continuous Residence Checklists</strong> across all trackers. <br /><br />
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
