<script>
/**
 * InstructionView Component
 *
 * Comprehensive user guide and step-by-step operation manual with captured screen demonstrations
 * for the BNO 5+1 Settlement & Absence Tracker web application.
 * Supports auto-switching and manual toggling between desktop and narrow/mobile screenshots.
 */
export default {
  name: 'InstructionView',

  data() {
    return {
      activeTab: 'step1',
      viewMode: 'auto', // 'auto' | 'desktop' | 'mobile'
      faqOpened: [0]
    }
  },

  computed: {
    isAuto() {
      return this.viewMode === 'auto'
    },

    effectiveMode() {
      if (this.viewMode === 'auto') {
        return this.$vuetify.display.smAndDown ? 'mobile' : 'desktop'
      }
      return this.viewMode
    },

    isMobileView() {
      return this.effectiveMode === 'mobile'
    },

    imgPrefix() {
      return this.isMobileView ? '/instructions/narrow_' : '/instructions/'
    },

    modeToggleValue: {
      get() {
        return this.effectiveMode
      },
      set(val) {
        if (val) {
          this.viewMode = val
        }
      }
    },

    viewportStatusText() {
      if (this.isAuto) {
        return this.isMobileView
          ? this.$t('instruction.viewport.auto_mobile')
          : this.$t('instruction.viewport.auto_desktop')
      }
      return this.isMobileView
        ? this.$t('instruction.viewport.mobile')
        : this.$t('instruction.viewport.desktop')
    }
  }
}
</script>

<template>
  <div class="instruction-view">
    <!-- Header Banner -->
    <v-card color="primary" class="mb-4 rounded-lg elevation-3" variant="elevated">
      <v-card-text class="pa-6 text-white">
        <div class="d-flex align-center flex-wrap ga-3 mb-2">
          <v-icon icon="mdi-book-open-page-variant" size="x-large"></v-icon>
          <div>
            <h1 class="text-h4 font-weight-bold mb-1">{{ $t('instruction.title') }}</h1>
            <p class="text-subtitle-1 text-medium-emphasis mb-0" style="color: rgba(255,255,255,0.85) !important;">
              {{ $t('instruction.subtitle') }}
            </p>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Viewport Screenshot Control Bar -->
    <v-card class="mb-6 rounded-lg elevation-1 bg-surface pa-3 border d-flex align-center flex-wrap ga-3 justify-space-between">
      <div class="d-flex align-center ga-2 text-subtitle-2 font-weight-bold">
        <v-icon icon="mdi-tune-variant" color="primary"></v-icon>
        <span>{{ $t('instruction.viewport.label') }}</span>
        <v-chip size="x-small" :color="isMobileView ? 'secondary' : 'primary'" class="ml-1 font-weight-bold">
          {{ viewportStatusText }}
        </v-chip>
      </div>

      <v-btn-toggle v-model="modeToggleValue" mandatory density="compact" color="primary" variant="outlined" class="rounded-lg">
        <v-btn value="desktop" size="small" prepend-icon="mdi-monitor">
          {{ $t('instruction.viewport.desktop') }}
        </v-btn>
        <v-btn value="mobile" size="small" prepend-icon="mdi-cellphone">
          {{ $t('instruction.viewport.mobile') }}
        </v-btn>
      </v-btn-toggle>
    </v-card>

    <!-- App Overview & Main Interface Card (Merged) -->
    <v-card class="mb-6 rounded-lg elevation-2 pa-4 bg-surface">
      <v-card-title class="text-h6 font-weight-bold d-flex align-center justify-space-between flex-wrap ga-2 mb-3 pa-0">
        <div class="d-flex align-center ga-2">
          <v-icon icon="mdi-compass-outline" color="primary"></v-icon>
          <span>{{ $t('instruction.overview.title') }}</span>
        </div>
        <v-chip size="x-small" variant="tonal" :color="isMobileView ? 'secondary' : 'primary'">
          {{ viewportStatusText }}
        </v-chip>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-row align="start">
          <v-col cols="12" md="6">
            <p class="text-body-1 mb-3">{{ $t('instruction.overview.p1') }}</p>
            <p class="text-body-1 mb-4">{{ $t('instruction.overview.p2') }}</p>
            
            <v-row density="compact">
              <v-col cols="12" sm="6">
                <v-card variant="outlined" color="primary" class="pa-3 rounded-lg h-100">
                  <div class="d-flex align-center ga-2 font-weight-bold mb-1">
                    <v-icon icon="mdi-calculator-variant" color="primary"></v-icon>
                    {{ $t('instruction.overview.feature1_title') }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('instruction.overview.feature1_desc') }}
                  </div>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6">
                <v-card variant="outlined" color="primary" class="pa-3 rounded-lg h-100">
                  <div class="d-flex align-center ga-2 font-weight-bold mb-1">
                    <v-icon icon="mdi-flag-checkered" color="primary"></v-icon>
                    {{ $t('instruction.overview.feature2_title') }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('instruction.overview.feature2_desc') }}
                  </div>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6">
                <v-card variant="outlined" color="primary" class="pa-3 rounded-lg h-100">
                  <div class="d-flex align-center ga-2 font-weight-bold mb-1">
                    <v-icon icon="mdi-calendar-clock" color="primary"></v-icon>
                    {{ $t('instruction.overview.feature3_title') }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('instruction.overview.feature3_desc') }}
                  </div>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6">
                <v-card variant="outlined" color="primary" class="pa-3 rounded-lg h-100">
                  <div class="d-flex align-center ga-2 font-weight-bold mb-1">
                    <v-icon icon="mdi-shield-check" color="primary"></v-icon>
                    {{ $t('instruction.overview.feature4_title') }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('instruction.overview.feature4_desc') }}
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-col>

          <v-col cols="12" md="6">
            <v-card variant="outlined" class="pa-2 rounded-lg elevation-1">
              <v-img
                :key="imgPrefix + 'step1_overview.png'"
                :src="imgPrefix + 'step1_overview.png'"
                alt="BNO 5+1 Tracker Dashboard"
                contain
                class="rounded"
                :style="{ maxHeight: isMobileView ? '480px' : 'auto' }"
              >
                <template v-slot:placeholder>
                  <div class="d-flex align-center justify-center fill-height bg-grey-lighten-4">
                    <v-progress-circular indeterminate color="primary"></v-progress-circular>
                  </div>
                </template>
              </v-img>
              <div class="text-caption text-center text-medium-emphasis mt-2">
                {{ $t('instruction.overview.screenshot_title') }} ({{ viewportStatusText }})
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Interactive Operation Guide Tabs -->
    <v-card class="mb-6 rounded-lg elevation-2 bg-surface pa-2">
      <v-tabs v-model="activeTab" color="primary" align-tabs="start" show-arrows>
        <v-tab value="step1" class="font-weight-bold">
          <v-icon icon="mdi-calendar-range" class="mr-2"></v-icon>
          1. {{ $t('instruction.tabs.step1') }}
        </v-tab>
        <v-tab value="step2" class="font-weight-bold">
          <v-icon icon="mdi-airplane-takeoff" class="mr-2"></v-icon>
          2. {{ $t('instruction.tabs.step2') }}
        </v-tab>
        <v-tab value="step3" class="font-weight-bold">
          <v-icon icon="mdi-file-document-check-outline" class="mr-2"></v-icon>
          3. {{ $t('instruction.tabs.step3') }}
        </v-tab>
        <v-tab value="step4" class="font-weight-bold">
          <v-icon icon="mdi-shield-lock-outline" class="mr-2"></v-icon>
          4. {{ $t('instruction.tabs.step4') }}
        </v-tab>
      </v-tabs>

      <v-divider></v-divider>

      <v-window v-model="activeTab" class="pa-4">
        <!-- Step 1 Window -->
        <v-window-item value="step1">
          <v-row align="start">
            <v-col cols="12" md="6">
              <h3 class="text-h6 font-weight-bold color-primary mb-3">
                <v-avatar color="primary" size="28" class="text-subtitle-2 mr-2 text-white">1</v-avatar>
                {{ $t('instruction.step1.header') }}
              </h3>
              <p class="text-body-1 mb-4">{{ $t('instruction.step1.desc') }}</p>
              
              <v-list density="compact" class="bg-transparent mb-4">
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step1.point1') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step1.point2') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step1.point3') }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>

              <v-alert type="info" variant="tonal" icon="mdi-information-outline" class="mb-4 text-caption">
                {{ $t('instruction.step1.note') }}
              </v-alert>

              <v-btn color="primary" to="/" variant="flat" prepend-icon="mdi-calendar-edit">
                {{ $t('instruction.step1.action_btn') }}
              </v-btn>
            </v-col>

            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-2 rounded-lg elevation-1">
                <v-img
                  :key="imgPrefix + 'step2_key_dates.png'"
                  :src="imgPrefix + 'step2_key_dates.png'"
                  alt="Set Key Visa Dates Modal"
                  contain
                  class="rounded"
                  :style="{ maxHeight: isMobileView ? '480px' : 'auto' }"
                ></v-img>
                <div class="text-caption text-center text-medium-emphasis mt-2">
                  {{ $t('instruction.step1.caption') }} ({{ viewportStatusText }})
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- Step 2 Window -->
        <v-window-item value="step2">
          <v-row align="start">
            <v-col cols="12" md="6">
              <h3 class="text-h6 font-weight-bold color-primary mb-3">
                <v-avatar color="primary" size="28" class="text-subtitle-2 mr-2 text-white">2</v-avatar>
                {{ $t('instruction.step2.header') }}
              </h3>
              <p class="text-body-1 mb-4">{{ $t('instruction.step2.desc') }}</p>

              <v-list density="compact" class="bg-transparent mb-4">
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step2.point1') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step2.point2') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step2.point3') }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>

              <v-alert type="warning" variant="tonal" icon="mdi-alert-circle-outline" class="mb-4 text-caption">
                {{ $t('instruction.step2.warning') }}
              </v-alert>

              <v-btn color="primary" to="/" variant="flat" prepend-icon="mdi-plus-circle">
                {{ $t('instruction.step2.action_btn') }}
              </v-btn>
            </v-col>

            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-2 rounded-lg elevation-1 mb-3">
                <v-img
                  :key="imgPrefix + 'step3_add_absence.png'"
                  :src="imgPrefix + 'step3_add_absence.png'"
                  alt="Add Absence Form"
                  contain
                  class="rounded"
                  :style="{ maxHeight: isMobileView ? '450px' : 'auto' }"
                ></v-img>
                <div class="text-caption text-center text-medium-emphasis mt-1">
                  {{ $t('instruction.step2.caption1') }} ({{ viewportStatusText }})
                </div>
              </v-card>

              <v-card variant="outlined" class="pa-2 rounded-lg elevation-1">
                <v-img
                  :key="imgPrefix + 'step3_absence_list.png'"
                  :src="imgPrefix + 'step3_absence_list.png'"
                  alt="Absence Records Table"
                  contain
                  class="rounded"
                  :style="{ maxHeight: isMobileView ? '450px' : 'auto' }"
                ></v-img>
                <div class="text-caption text-center text-medium-emphasis mt-1">
                  {{ $t('instruction.step2.caption2') }} ({{ viewportStatusText }})
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- Step 3 Window -->
        <v-window-item value="step3">
          <v-row align="start">
            <v-col cols="12" md="6">
              <h3 class="text-h6 font-weight-bold color-primary mb-3">
                <v-avatar color="primary" size="28" class="text-subtitle-2 mr-2 text-white">3</v-avatar>
                {{ $t('instruction.step3.header') }}
              </h3>
              <p class="text-body-1 mb-4">{{ $t('instruction.step3.desc') }}</p>

              <v-list density="compact" class="bg-transparent mb-4">
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step3.point1') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step3.point2') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step3.point3') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step3.point4') }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>

              <v-alert type="success" variant="tonal" icon="mdi-lock-outline" class="mb-4 text-caption">
                {{ $t('instruction.step3.privacy_note') }}
              </v-alert>

              <v-btn color="primary" to="/documents" variant="flat" prepend-icon="mdi-file-document-edit-outline">
                {{ $t('instruction.step3.action_btn') }}
              </v-btn>
            </v-col>

            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-2 rounded-lg elevation-1">
                <v-img
                  :key="imgPrefix + 'step4_documents.png'"
                  :src="imgPrefix + 'step4_documents.png'"
                  alt="Document Checklist View"
                  contain
                  class="rounded"
                  :style="{ maxHeight: isMobileView ? '480px' : 'auto' }"
                ></v-img>
                <div class="text-caption text-center text-medium-emphasis mt-2">
                  {{ $t('instruction.step3.caption') }} ({{ viewportStatusText }})
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- Step 4 Window -->
        <v-window-item value="step4">
          <v-row align="start">
            <v-col cols="12" md="6">
              <h3 class="text-h6 font-weight-bold color-primary mb-3">
                <v-avatar color="primary" size="28" class="text-subtitle-2 mr-2 text-white">4</v-avatar>
                {{ $t('instruction.step4.header') }}
              </h3>
              <p class="text-body-1 mb-4">{{ $t('instruction.step4.desc') }}</p>

              <v-list density="compact" class="bg-transparent mb-4">
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step4.point1') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step4.point2') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-check-circle-outline" color="success" class="mr-3"></v-icon>
                  </template>
                  <v-list-item-title class="font-weight-medium text-wrap">
                    {{ $t('instruction.step4.point3') }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>

              <v-btn color="primary" to="/reference" variant="flat" prepend-icon="mdi-bookshelf" class="mr-3 mb-2">
                {{ $t('instruction.step4.action_btn1') }}
              </v-btn>
            </v-col>

            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-2 rounded-lg elevation-1">
                <v-img
                  :key="imgPrefix + 'step5_reference.png'"
                  :src="imgPrefix + 'step5_reference.png'"
                  alt="Reference Guidance Page"
                  contain
                  class="rounded"
                  :style="{ maxHeight: isMobileView ? '480px' : 'auto' }"
                ></v-img>
                <div class="text-caption text-center text-medium-emphasis mt-2">
                  {{ $t('instruction.step4.caption') }} ({{ viewportStatusText }})
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>
      </v-window>
    </v-card>

    <!-- FAQ Accordion (App Operations) -->
    <v-card class="rounded-lg elevation-2 bg-surface pa-4">
      <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 mb-2">
        <v-icon icon="mdi-help-circle-outline" color="primary"></v-icon>
        {{ $t('instruction.faq.title') }}
      </v-card-title>
      
      <v-expansion-panels v-model="faqOpened" multiple variant="accordion" class="rounded-lg">
        <v-row align="start" density="compact">
          <v-col cols="12" md="6">
            <v-expansion-panel class="border mb-2 rounded-lg">
              <v-expansion-panel-title class="font-weight-bold">
                <v-icon icon="mdi-calculator-variant" color="primary" class="mr-2"></v-icon>
                {{ $t('instruction.faq.q1') }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-2">
                {{ $t('instruction.faq.a1') }}
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-col>

          <v-col cols="12" md="6">
            <v-expansion-panel class="border mb-2 rounded-lg">
              <v-expansion-panel-title class="font-weight-bold">
                <v-icon icon="mdi-sync" color="primary" class="mr-2"></v-icon>
                {{ $t('instruction.faq.q2') }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-2">
                {{ $t('instruction.faq.a2') }}
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-col>

          <v-col cols="12" md="6">
            <v-expansion-panel class="border mb-2 rounded-lg">
              <v-expansion-panel-title class="font-weight-bold">
                <v-icon icon="mdi-database-lock" color="primary" class="mr-2"></v-icon>
                {{ $t('instruction.faq.q3') }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-2">
                {{ $t('instruction.faq.a3') }}
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-col>

          <v-col cols="12" md="6">
            <v-expansion-panel class="border mb-2 rounded-lg">
              <v-expansion-panel-title class="font-weight-bold">
                <v-icon icon="mdi-zip-box-outline" color="primary" class="mr-2"></v-icon>
                {{ $t('instruction.faq.q4') }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-2">
                {{ $t('instruction.faq.a4') }}
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-col>

          <v-col cols="12" md="6">
            <v-expansion-panel class="border mb-2 rounded-lg">
              <v-expansion-panel-title class="font-weight-bold">
                <v-icon icon="mdi-link-variant" color="primary" class="mr-2"></v-icon>
                {{ $t('instruction.faq.q5') }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-2">
                {{ $t('instruction.faq.a5') }}
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-col>

          <v-col cols="12" md="6">
            <v-expansion-panel class="border mb-2 rounded-lg">
              <v-expansion-panel-title class="font-weight-bold">
                <v-icon icon="mdi-card-account-details-outline" color="primary" class="mr-2"></v-icon>
                {{ $t('instruction.faq.q6') }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-2">
                {{ $t('instruction.faq.a6') }}
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-col>

          <v-col cols="12" md="6">
            <v-expansion-panel class="border mb-2 rounded-lg">
              <v-expansion-panel-title class="font-weight-bold">
                <v-icon icon="mdi-file-eye-outline" color="primary" class="mr-2"></v-icon>
                {{ $t('instruction.faq.q7') }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-2">
                {{ $t('instruction.faq.a7') }}
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-col>
        </v-row>
      </v-expansion-panels>
    </v-card>
  </div>
</template>

<style scoped>
/* Clean scoped styling matching application view container layout */
</style>
