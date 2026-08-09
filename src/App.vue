<script>
/**
 * Root Application Component
 * Renders top-level Vuetify app container, app bar header with theme toggling,
 * right navigation drawer with consolidated data management (Export, Import, Clear All),
 * main RouterView, and PWA ReloadPrompt modal.
 */
import { mapStores } from 'pinia'
import { RouterView } from 'vue-router'
import { useAbsentsStore } from './stores/absents'
import { useDocumentsStore } from './stores/documents'
import { useProfilesStore } from './stores/profiles'
import { importBackup } from './services/backupService'
import { exportZipBackup, importZipBackup } from './services/zipService'
import ReloadPrompt from './components/ReloadPrompt.vue'
import ProfileDrawerSection from './components/ProfileDrawerSection.vue'

export default {
  name: 'App',

  components: {
    RouterView,
    ReloadPrompt,
    ProfileDrawerSection,
  },

  data() {
    return {
      drawer: false,
      clearAllDialog: false,
      profileManagementDialog: false,
      snackbar: {
        show: false,
        text: '',
        color: 'success',
      },
      mediaQuery: null,
    }
  },

  computed: {
    ...mapStores(useAbsentsStore, useDocumentsStore, useProfilesStore),

    smAndUp() {
      return this.$vuetify.display.smAndUp
    },

    mdAndUp() {
      return this.$vuetify.display.mdAndUp
    },

    locale() {
      return this.$i18n.locale
    },
  },

  watch: {
    $route() {
      this.drawer = false
    },
  },

  async mounted() {
    await this.profilesStore.initStore()
    this.absentsStore.initStore()
    this.documentsStore.initStore()

    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      if (this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener('change', this.handleSystemThemeChange)
      } else if (this.mediaQuery.addListener) {
        this.mediaQuery.addListener(this.handleSystemThemeChange)
      }
    }
  },

  unmounted() {
    if (this.mediaQuery) {
      if (this.mediaQuery.removeEventListener) {
        this.mediaQuery.removeEventListener('change', this.handleSystemThemeChange)
      } else if (this.mediaQuery.removeListener) {
        this.mediaQuery.removeListener(this.handleSystemThemeChange)
      }
    }
  },

  methods: {
    handleSystemThemeChange(e) {
      this.$vuetify.theme.global.name = e.matches ? 'dark' : 'light'
    },

    /**
     * Toggles current active theme between Union Jack dark and light palettes.
     */
    toggleTheme() {
      this.$vuetify.theme.global.name = this.$vuetify.theme.global.current.dark
        ? 'light'
        : 'dark'
    },

    /**
     * Toggles current active locale between English and Traditional Chinese (HK).
     */
    toggleLanguage() {
      const nextLocale = this.$i18n.locale === 'en' ? 'zh-HK' : 'en'
      this.$i18n.locale = nextLocale
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('bno_tracker_locale', nextLocale)
      }
    },

    showSnackbar(text, color = 'success') {
      this.snackbar = {
        show: true,
        text,
        color,
      }
    },

    /**
     * Merged Export: Exports full application data and uploaded document files to a ZIP backup archive.
     */
    async exportAllData() {
      try {
        const { blob, fileCount } = await exportZipBackup(
          this.absentsStore,
          this.documentsStore,
          this.profilesStore.activeProfile && this.profilesStore.activeProfile.name,
        )

        const rawProfileName = (this.profilesStore.activeProfile && this.profilesStore.activeProfile.name) || ''
        const safeProfileName = rawProfileName.trim().replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_').replace(/_+/g, '_')
        const profileSuffix = safeProfileName ? `${safeProfileName}_` : ''
        const dateStr = new Date().toISOString().split('T')[0]

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `bno-5plus1-tracker-backup_${profileSuffix}${dateStr}.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        this.showSnackbar(this.$t('app.export_success', { fileCount }), 'success')
      } catch (err) {
        this.showSnackbar(this.$t('app.export_failed') + err.message, 'error')
      }
    },

    /**
     * Trigger hidden file input click for ZIP/YAML import.
     */
    triggerImport() {
      if (this.$refs.fileInputRef) {
        this.$refs.fileInputRef.value = ''
        this.$refs.fileInputRef.click()
      }
    },

    /**
     * Consolidated Import handling both ZIP archives and standalone YAML files.
     */
    async handleImportFileSelect(event) {
      const file = event.target.files && event.target.files[0]
      if (!file) return

      if (file.name.toLowerCase().endsWith('.zip')) {
        try {
          const result = await importZipBackup(file, this.absentsStore, this.documentsStore)
          this.showSnackbar(
            this.$t('app.import_success', {
              absenceCount: result.absenceCount,
              docs: result.docsImported ? this.$t('app.import_docs_suffix') : '',
              files:
                result.filesImported > 0
                  ? this.$t('app.import_files_suffix', { count: result.filesImported })
                  : '',
            }),
            'success',
          )
        } catch (err) {
          this.showSnackbar(this.$t('app.import_failed') + err.message, 'error')
        }
      } else {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const content = e.target.result
            const result = importBackup(content, this.absentsStore, this.documentsStore)

            this.showSnackbar(
              this.$t('app.import_success', {
                absenceCount: result.absenceCount,
                docs: result.docsImported ? this.$t('app.import_docs_suffix') : '',
              }),
              'success',
            )
          } catch (err) {
            this.showSnackbar(this.$t('app.import_failed') + err.message, 'error')
          }
        }
        reader.readAsText(file)
      }
    },

    /**
     * Consolidated Clear All for all application data.
     */
    confirmClearAll() {
      this.absentsStore.clearAbsences()
      this.documentsStore.resetAll()
      this.clearAllDialog = false
      this.drawer = false
      this.showSnackbar(this.$t('app.cleared_all'), 'warning')
    },
  },
}
</script>

<template>
  <v-app>
    <!-- Hidden File Input for Consolidated YAML / ZIP Import -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".zip,.yaml,.yml"
      style="display: none"
      @change="handleImportFileSelect"
    />

    <!-- Top Application Bar -->
    <v-app-bar color="primary" elevation="2" class="px-1 px-sm-4">
      <div class="w-100 mx-auto d-flex align-center" style="max-width: 1600px">
        <v-icon
          icon="mdi-passport"
          :size="smAndUp ? 'large' : 'default'"
          class="ml-1 ml-sm-3 mr-1 mr-sm-2"
        ></v-icon>
        <v-app-bar-title class="font-weight-bold text-h6 text-truncate flex-grow-1 flex-shrink-1">
          {{ $t('app.title') }}
          <v-chip
            v-if="smAndUp"
            size="x-small"
            color="amber-darken-2"
            variant="flat"
            class="ml-2 font-weight-bold"
            style="vertical-align: middle"
          >
            {{ $t('app.badge_unofficial') }}
          </v-chip>
          <v-chip
            v-if="mdAndUp"
            size="small"
            color="success"
            variant="flat"
            class="ml-2 font-weight-bold"
            style="vertical-align: middle"
            prepend-icon="mdi-shield-check"
          >
            {{ $t('app.badge_local_storage') }}
          </v-chip>
        </v-app-bar-title>

        <v-spacer v-if="smAndUp"></v-spacer>

        <!-- Language Switcher -->
        <v-btn
          variant="text"
          density="compact"
          class="px-1 px-sm-2 ml-1"
          style="min-width: auto"
          :title="$t('app.language')"
          @click="toggleLanguage"
        >
          <v-icon icon="mdi-translate" size="small" class="mr-1"></v-icon>
          <span class="text-caption font-weight-bold">{{ locale === 'en' ? '繁' : 'EN' }}</span>
        </v-btn>

        <!-- Theme Switcher -->
        <v-btn
          :icon="$vuetify.theme.global.current.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="text"
          density="compact"
          class="px-1 px-sm-2"
          style="min-width: auto"
          :title="$t('app.toggle_theme')"
          @click="toggleTheme"
        ></v-btn>

        <!-- Right Drawer Hamburger Menu Button -->
        <v-btn
          icon="mdi-menu"
          variant="text"
          density="compact"
          class="ml-0 ml-sm-1"
          style="min-width: auto"
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
      <!-- Top Section: Applicant Profiles (Switching, Editing, Management) -->
      <ProfileDrawerSection @show-snackbar="showSnackbar" />

      <v-divider></v-divider>

      <!-- Section: Navigation Trackers -->
      <v-list-subheader class="font-weight-bold text-uppercase text-caption px-4 pt-3 pb-1">
        {{ $t('app.trackers') }}
      </v-list-subheader>

      <v-list nav class="px-2 py-1">
        <v-list-item to="/" exact color="primary" rounded="lg" class="mb-2">
          <template v-slot:prepend>
            <v-icon icon="mdi-airplane-takeoff" color="primary"></v-icon>
          </template>
          <v-list-item-title class="font-weight-bold">
            {{ $t('app.nav_absence') }}
          </v-list-item-title>
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
        >
          <template v-slot:prepend>
            <v-icon icon="mdi-file-document-check-outline" color="primary"></v-icon>
          </template>
          <v-list-item-title class="font-weight-bold">
            {{ $t('app.nav_document') }}
          </v-list-item-title>
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
        >
          <template v-slot:prepend>
            <v-icon icon="mdi-bookshelf" color="primary"></v-icon>
          </template>
          <v-list-item-title class="font-weight-bold">
            {{ $t('app.nav_reference') }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ $t('app.nav_reference_sub') }}
          </v-list-item-subtitle>
        </v-list-item>

        <v-list-item
          to="/instruction"
          exact
          color="primary"
          rounded="lg"
          class="mb-2"
        >
          <template v-slot:prepend>
            <v-icon icon="mdi-book-open-page-variant" color="primary"></v-icon>
          </template>
          <v-list-item-title class="font-weight-bold">
            {{ $t('app.nav_instruction') }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ $t('app.nav_instruction_sub') }}
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
              <v-list-item-subtitle
                v-if="profilesStore.activeProfile && profilesStore.activeProfile.name"
                class="text-caption text-medium-emphasis text-truncate"
              >
                {{ profilesStore.activeProfile.name }}
              </v-list-item-subtitle>
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
          <v-btn variant="text" @click="clearAllDialog = false">{{
            $t('app.clear_dialog_cancel')
          }}</v-btn>
          <v-btn color="error" variant="flat" @click="confirmClearAll">{{
            $t('app.clear_dialog_confirm')
          }}</v-btn>
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
        <v-btn variant="text" size="small" @click="snackbar.show = false">{{
          $t('app.close')
        }}</v-btn>
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
