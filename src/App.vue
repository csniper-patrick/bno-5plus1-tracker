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
import { useI18n } from 'vue-i18n'
import { useAbsentsStore } from './stores/absents'
import { useDocumentsStore } from './stores/documents'
import { exportFullBackup, parseYAML } from './services/backupService'
import ReloadPrompt from './components/ReloadPrompt.vue'

// Vuetify theme, router, i18n, and store instances
const theme = useTheme()
const route = useRoute()
const { locale, t } = useI18n()
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

/**
 * Toggles current active locale between English and Traditional Chinese (HK).
 */
function toggleLanguage() {
  const nextLocale = locale.value === 'en' ? 'zh-HK' : 'en'
  locale.value = nextLocale
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('bno_tracker_locale', nextLocale)
  }
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

    showSnackbar(t('app.export_success'), 'success')
  } catch (err) {
    showSnackbar(t('app.export_failed') + err.message, 'error')
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
        t('app.import_success', {
          absenceCount,
          docs: docsImported ? t('app.import_docs_suffix') : '',
        }),
        'success',
      )
    } catch (err) {
      showSnackbar(t('app.import_failed') + err.message, 'error')
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
  showSnackbar(t('app.cleared_all'), 'warning')
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
          {{ $t('app.title') }}
          <v-chip
            size="x-small"
            color="amber-darken-2"
            variant="flat"
            class="d-none d-sm-inline-flex ml-2 font-weight-bold"
            style="vertical-align: middle"
          >
            {{ $t('app.badge_unofficial') }}
          </v-chip>
          <v-chip
            size="small"
            color="success"
            variant="flat"
            class="d-none d-md-inline-flex ml-2 font-weight-bold"
            style="vertical-align: middle"
            prepend-icon="mdi-shield-check"
          >
            {{ $t('app.badge_local_storage') }}
          </v-chip>
        </v-app-bar-title>

        <v-spacer></v-spacer>

        <!-- Language Switcher -->
        <v-btn
          variant="text"
          class="px-2"
          :title="$t('app.language')"
          @click="toggleLanguage"
        >
          <v-icon icon="mdi-translate" class="mr-1"></v-icon>
          <span class="text-caption font-weight-bold">{{ locale === 'en' ? '繁' : 'EN' }}</span>
        </v-btn>

        <!-- Theme Switcher -->
        <v-btn
          :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="text"
          :title="$t('app.toggle_theme')"
          @click="toggleTheme"
        ></v-btn>

        <!-- Right Drawer Hamburger Menu Button -->
        <v-btn
          icon="mdi-menu"
          variant="text"
          class="ml-1"
          :title="$t('app.nav_menu')"
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
          {{ $t('app.drawer_title') }}
        </v-list-item-title>
        <v-list-item-subtitle class="text-caption">
          {{ $t('app.drawer_subtitle') }}
        </v-list-item-subtitle>
        <template v-slot:append>
          <v-btn icon="mdi-close" variant="text" size="small" @click="drawer = false"></v-btn>
        </template>
      </v-list-item>

      <v-divider></v-divider>

      <!-- Section: Navigation Trackers -->
      <v-list-subheader class="font-weight-bold text-uppercase text-caption px-4 pt-3 pb-1">
        {{ $t('app.trackers') }}
      </v-list-subheader>

      <v-list nav class="px-2 py-1">
        <v-list-item to="/" exact color="primary" rounded="lg" class="mb-2" @click="drawer = false">
          <template v-slot:prepend>
            <v-icon icon="mdi-airplane-takeoff" color="primary"></v-icon>
          </template>
          <v-list-item-title class="font-weight-bold"> {{ $t('app.nav_absence') }} </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ $t('app.nav_absence_sub') }}
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
          <v-list-item-title class="font-weight-bold"> {{ $t('app.nav_document') }} </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ $t('app.nav_document_sub') }}
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
          <v-list-item-title class="font-weight-bold"> {{ $t('app.nav_reference') }} </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ $t('app.nav_reference_sub') }}
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <template v-slot:append>
        <div class="border-top pa-3">
          <v-list-subheader class="font-weight-bold text-uppercase text-caption px-2 pb-1">
            {{ $t('app.data_management') }}
          </v-list-subheader>

          <v-list nav density="compact" class="pa-0">
            <v-list-item rounded="lg" class="mb-1" @click="exportAllData">
              <template v-slot:prepend>
                <v-icon icon="mdi-download-outline" color="primary" size="small"></v-icon>
              </template>
              <v-list-item-title class="font-weight-bold text-caption">
                {{ $t('app.export_data') }}
              </v-list-item-title>
            </v-list-item>

            <v-list-item rounded="lg" class="mb-1" @click="triggerImport">
              <template v-slot:prepend>
                <v-icon icon="mdi-upload-outline" color="primary" size="small"></v-icon>
              </template>
              <v-list-item-title class="font-weight-bold text-caption">
                {{ $t('app.import_data') }}
              </v-list-item-title>
            </v-list-item>

            <v-list-item rounded="lg" class="mb-1" color="error" @click="clearAllDialog = true">
              <template v-slot:prepend>
                <v-icon icon="mdi-delete-sweep-outline" color="error" size="small"></v-icon>
              </template>
              <v-list-item-title class="font-weight-bold text-caption text-error">
                {{ $t('app.clear_data') }}
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
              <i18n-t keypath="app.privacy_note_text" scope="global">
                <template #code>
                  <code>IndexedDB</code>
                </template>
              </i18n-t>
            </v-alert>
            <div class="text-caption text-medium-emphasis" style="font-size: 11px">
              {{ $t('app.footer_unofficial') }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1" style="font-size: 10px">
              {{ $t('app.footer_disclaimer') }}
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
          {{ $t('app.clear_dialog_title') }}
        </v-card-title>
        <v-card-text class="px-6 py-2">
          {{ $t('app.clear_dialog_body') }}
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="clearAllDialog = false">{{ $t('app.clear_dialog_cancel') }}</v-btn>
          <v-btn color="error" variant="flat" @click="confirmClearAll">{{ $t('app.clear_dialog_confirm') }}</v-btn>
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
        <v-btn variant="text" size="small" @click="snackbar.show = false">{{ $t('app.close') }}</v-btn>
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
