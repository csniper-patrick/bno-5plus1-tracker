<script>
/**
 * InfoView Component
 *
 * Useful Links page presenting curated official UK Government guidance,
 * policy statements, settlement requirements, and qualification portals
 * for Hong Kong British National (Overseas) (BNO) visa holders.
 */
export default {
  name: 'InfoView',

  data() {
    return {
      searchQuery: '',
      selectedCategory: 'All',
      categories: [
        'All',
        'BNO Settlement',
        'Policy & Guidance',
        'Qualifications & Tests',
        'Citizenship',
      ],

      /** Global snackbar notification state */
      snackbar: {
        show: false,
        text: '',
        color: 'success',
      },

      /** Curated list of useful official links */
      links: [
        {
          id: 'bno-settle',
          title: 'BNO Visa: Settle in the UK (ILR Guidance)',
          category: 'BNO Settlement',
          url: 'https://www.gov.uk/british-national-overseas-bno-visa/settle-in-the-uk',
          icon: 'mdi-passport',
          color: 'primary',
          badge: 'Essential Guidance',
          description:
            'Official UK Government guide on how to apply for Indefinite Leave to Remain (ILR) / UK Settlement under the BNO visa route after 5 years of continuous residence.',
          highlights: [
            'Qualifying period: 5 years continuous residence in the UK',
            'Absence limit: Maximum 180 days absent in any continuous 12-month period',
            'Requirements: Life in the UK test & B1 English qualification',
            'Submitting application: Can apply up to 28 days before completing 5 years',
          ],
        },
        {
          id: 'bno-policy-statement',
          title: 'Hong Kong BNO Visa Policy Statement',
          category: 'Policy & Guidance',
          url: 'https://www.gov.uk/government/publications/hong-kong-bno-visa-policy-statement/hong-kong-british-national-overseas-visa-policy-statement-plain-text-version',
          icon: 'mdi-file-document-outline',
          color: 'indigo-darken-1',
          badge: 'Policy Statement',
          description:
            'Comprehensive UK Home Office policy statement outlining background, rights, work/study permissions, public fund restrictions, and settlement pathways for BNO holders.',
          highlights: [
            'Details original policy design for the Hong Kong BNO visa route',
            'Outlines rights to work, study, and use NHS healthcare in the UK',
            'Explains conditions for No Recourse to Public Funds (NRPF)',
            'Covers eligibility for BNO status holders and immediate family members',
          ],
        },
        {
          id: 'continuous-residence-guidance',
          title: 'UKVI Continuous Residence Caseworker Guidance',
          category: 'Policy & Guidance',
          url: 'https://www.gov.uk/government/publications/continuous-residence',
          icon: 'mdi-book-open-outline',
          color: 'teal-darken-1',
          badge: 'Caseworker Rules',
          description:
            'Official Home Office caseworker guidance explaining how continuous residence is calculated, departure/arrival day exclusion rules, and valid absence exceptions.',
          highlights: [
            'Full-day rule: Days of departure & arrival are excluded from absence counts',
            'Rolling 12-month calculation rules across 5-year qualifying period',
            'Permitted absence exceptions (serious illness, travel disruptions, etc.)',
            'Supporting evidence requirements for ILR applications',
          ],
        },
        {
          id: 'life-in-uk-test',
          title: 'Life in the UK Test Official Portal',
          category: 'Qualifications & Tests',
          url: 'https://www.gov.uk/life-in-the-uk-test',
          icon: 'mdi-school-outline',
          color: 'amber-darken-3',
          badge: 'Mandatory Test',
          description:
            'Official UK Government booking portal for the Life in the UK Test. Required for all applicants aged 18–64 applying for ILR or British Citizenship.',
          highlights: [
            'Booking cost: £50 per test attempt',
            'Must book at least 3 days in advance at one of 30+ official test centers',
            'Requires valid accepted photo ID & proof of address for registration',
            'Generates Unique Reference Number (URN) upon passing',
          ],
        },
        {
          id: 'english-language-requirement',
          title: 'Prove Your Knowledge of English (B1 Level)',
          category: 'Qualifications & Tests',
          url: 'https://www.gov.uk/english-language',
          icon: 'mdi-translate',
          color: 'deep-purple-darken-1',
          badge: 'Language Requirement',
          description:
            'Official guidelines on proving English language capability at B1 CEFR level or higher for ILR settlement and citizenship applications.',
          highlights: [
            'Accepted pathways: B1 SELT Test (Trinity/PSI/IELTS SELT), UK Degree, or Ecctis statement',
            'Exemptions apply for applicants over 65 or with specific medical conditions',
            'SELT pass certificates do not expire for ILR if used in a previous successful application',
          ],
        },
        {
          id: 'apply-citizenship-naturalisation',
          title: 'Apply for British Citizenship (Form AN)',
          category: 'Citizenship',
          url: 'https://www.gov.uk/apply-citizenship-indefinite-leave-to-remain',
          icon: 'mdi-crown-outline',
          color: 'red-darken-2',
          badge: 'Naturalisation',
          description:
            'Official guidance on applying for British Citizenship by Naturalisation after holding ILR for at least 12 months (or immediately if married to a UK citizen).',
          highlights: [
            'Absence limit 1: Max 450 days total absent in the 5 years before applying',
            'Absence limit 2: Max 90 days absent in the 12 months immediately preceding application',
            'Physical presence requirement: Must have been in the UK exactly 5 years prior to application date',
            'Requires 2 referees, good character assessment, & citizenship ceremony',
          ],
        },
        {
          id: 'bno-visa-overview',
          title: 'Hong Kong BNO Visa General Overview & Extensions',
          category: 'BNO Settlement',
          url: 'https://www.gov.uk/british-national-overseas-bno-visa',
          icon: 'mdi-earth',
          color: 'cyan-darken-2',
          badge: 'Visa Overview',
          description:
            'Official overview page for the British National (Overseas) visa, detailing application fees, Immigration Health Surcharge (IHS), 2.5-year vs 5-year visa options, and visa extension processes.',
          highlights: [
            'Compare 2.5-year extension vs 5-year initial visa paths',
            'Immigration Health Surcharge (IHS) payment details',
            'Switching visa categories and adding dependent family members',
          ],
        },
      ],
    }
  },

  computed: {
    /**
     * Filtered list of links based on selected category and text query.
     * @returns {Array}
     */
    filteredLinks() {
      return this.links.filter((link) => {
        const matchesCategory =
          this.selectedCategory === 'All' || link.category === this.selectedCategory
        const query = this.searchQuery.trim().toLowerCase()
        if (!query) return matchesCategory

        const matchesTitle = link.title.toLowerCase().includes(query)
        const matchesDesc = link.description.toLowerCase().includes(query)
        const matchesHighlights = link.highlights.some((h) => h.toLowerCase().includes(query))

        return matchesCategory && (matchesTitle || matchesDesc || matchesHighlights)
      })
    },
  },

  methods: {
    /**
     * Resets search query and selected category filter.
     */
    resetFilters() {
      this.searchQuery = ''
      this.selectedCategory = 'All'
    },

    /**
     * Copies link URL to clipboard and triggers feedback snackbar.
     * @param {string} url - Link URL to copy.
     */
    async copyLinkUrl(url) {
      try {
        await navigator.clipboard.writeText(url)
        this.showSnackbar('Link URL copied to clipboard!', 'success')
      } catch (err) {
        const textArea = document.createElement('textarea')
        textArea.value = url
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        this.showSnackbar('Link URL copied to clipboard!', 'success')
      }
    },

    /**
     * Displays a snackbar notification.
     * @param {string} text - Message text.
     * @param {string} [color='success'] - Color theme.
     */
    showSnackbar(text, color = 'success') {
      this.snackbar = {
        show: true,
        text,
        color,
      }
    },
  },
}
</script>

<template>
  <div>
    <!-- Page Header & Overview Card -->
    <v-card elevation="2" class="pa-3 pa-sm-4 rounded-lg bg-surface mb-6">
      <v-card-title class="px-0 pt-0 d-flex align-center flex-wrap ga-2">
        <div class="d-flex align-center">
          <v-icon icon="mdi-link-variant" color="primary" class="mr-2" size="large"></v-icon>
          <span class="text-h5 font-weight-bold">Useful Links & Official Guidance</span>
        </div>
        <v-chip
          size="small"
          color="info"
          variant="flat"
          class="font-weight-bold ml-sm-auto"
          prepend-icon="mdi-check-decagram"
        >
          Official GOV.UK Resources
        </v-chip>
      </v-card-title>

      <p class="text-body-2 text-medium-emphasis ma-0">
        Direct links to official UK Home Office publications, policy statements, qualification test
        portals, and settlement application forms for British National (Overseas) visa holders.
      </p>

      <v-alert
        type="info"
        variant="tonal"
        icon="mdi-information-outline"
        class="mt-3 text-caption"
        density="compact"
      >
        <strong>Official Sources Notice:</strong> All links point directly to official UK Government
        (<code>gov.uk</code>) portals. Always refer to official government guidance for legal policy
        updates, fee changes, and official application submissions.
      </v-alert>
    </v-card>

    <!-- Search & Category Filters -->
    <v-card elevation="1" class="pa-4 rounded-lg bg-surface mb-6">
      <v-row align="center">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            label="Search official links & topics..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
          ></v-text-field>
        </v-col>

        <v-col cols="12" md="6" class="d-flex align-center flex-wrap ga-2 justify-md-end">
          <span class="text-caption text-medium-emphasis font-weight-bold mr-1">Category:</span>
          <v-chip-group
            v-model="selectedCategory"
            selected-class="v-chip--selected"
            mandatory
            filter
          >
            <v-chip
              v-for="cat in categories"
              :key="cat"
              :value="cat"
              size="small"
              variant="outlined"
              color="primary"
              class="font-weight-medium"
            >
              {{ cat }}
            </v-chip>
          </v-chip-group>
        </v-col>
      </v-row>
    </v-card>

    <!-- Cards Grid -->
    <v-row v-if="filteredLinks.length > 0">
      <v-col v-for="item in filteredLinks" :key="item.id" cols="12" md="6" lg="6">
        <v-card
          elevation="2"
          class="h-100 d-flex flex-column rounded-lg bg-surface border-opacity-25"
          hover
        >
          <!-- Card Header -->
          <div class="pa-4 pb-2">
            <div class="d-flex align-start ga-3">
              <v-avatar :color="item.color" size="40" rounded="lg" class="elevation-1 flex-shrink-0">
                <v-icon :icon="item.icon" color="white" size="22"></v-icon>
              </v-avatar>
              <div class="flex-grow-1">
                <div class="text-subtitle-1 font-weight-bold text-wrap leading-tight text-high-emphasis">
                  {{ item.title }}
                </div>
                <div class="mt-1 d-flex align-center ga-2 flex-wrap">
                  <v-chip size="x-small" :color="item.color" variant="flat" class="font-weight-bold">
                    {{ item.category }}
                  </v-chip>
                  <v-chip size="x-small" color="secondary" variant="tonal" class="font-weight-medium">
                    {{ item.badge }}
                  </v-chip>
                </div>
              </div>
            </div>
          </div>

          <v-divider></v-divider>

          <!-- Card Content -->
          <v-card-text class="flex-grow-1 px-4 py-3">
            <p class="text-body-2 mb-3 text-high-emphasis">
              {{ item.description }}
            </p>

            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
              Key Takeaways & Highlights
            </div>

            <v-list density="compact" class="pa-0 bg-transparent">
              <v-list-item
                v-for="(highlight, idx) in item.highlights"
                :key="idx"
                density="compact"
                class="px-0 min-height-0 py-1"
              >
                <template v-slot:prepend>
                  <v-icon
                    icon="mdi-check-circle-outline"
                    color="success"
                    size="small"
                    class="mr-2"
                  ></v-icon>
                </template>
                <v-list-item-title
                  class="text-caption text-wrap leading-normal"
                  style="white-space: normal"
                >
                  {{ highlight }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>

          <v-divider></v-divider>

          <!-- Card Actions -->
          <v-card-actions class="px-4 py-3 bg-surface justify-space-between align-center">
            <v-btn
              size="small"
              variant="text"
              color="medium-emphasis"
              prepend-icon="mdi-content-copy"
              @click="copyLinkUrl(item.url)"
            >
              Copy Link
            </v-btn>

            <v-btn
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              variant="flat"
              size="small"
              append-icon="mdi-open-in-new"
              class="font-weight-bold"
            >
              Visit Official Page
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty Search Results State -->
    <v-card v-else elevation="1" class="pa-8 text-center rounded-lg bg-surface">
      <v-icon icon="mdi-link-off" size="64" color="medium-emphasis" class="mb-3"></v-icon>
      <div class="text-h6 font-weight-bold mb-1">No links matched your search</div>
      <div class="text-body-2 text-medium-emphasis mb-4">
        Try adjusting your search query or selecting "All" categories.
      </div>
      <v-btn
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-refresh"
        @click="resetFilters"
      >
        Reset Filters
      </v-btn>
    </v-card>

    <!-- Global Snackbar Notification -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      location="bottom end"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.leading-tight {
  line-height: 1.35 !important;
}
.leading-normal {
  line-height: 1.4 !important;
}
.min-height-0 {
  min-height: 0 !important;
}
</style>
