<script>
import { mapStores } from 'pinia'
import { useDocumentsStore } from '../stores/documents'
import { useAbsentsStore } from '../stores/absents'

import { useHead } from '@unhead/vue'
import { getSeoMeta } from '../utils/seo'

import DocumentHeaderCard from '../components/document/DocumentHeaderCard.vue'
import NationalInsuranceCard from '../components/document/NationalInsuranceCard.vue'
import LifeInUkCard from '../components/document/LifeInUkCard.vue'
import EnglishLanguageCard from '../components/document/EnglishLanguageCard.vue'
import AddressHistorySection from '../components/document/AddressHistorySection.vue'
import ResidenceChecklistSection from '../components/document/ResidenceChecklistSection.vue'
import DocumentVaultSection from '../components/document/DocumentVaultSection.vue'

/**
 * DocumentView Component
 *
 * Primary dashboard view for managing BNO 5+1 settlement document readiness.
 * Orchestrates modular subcomponents for readiness overview, National Insurance,
 * Life in the UK, English B1, Address History, 5-Year Residence Evidence Checklist,
 * and the Encrypted Document Vault.
 */
export default {
  name: 'DocumentView',

  setup() {
    useHead(getSeoMeta('documents'))
  },

  components: {
    DocumentHeaderCard,
    NationalInsuranceCard,
    LifeInUkCard,
    EnglishLanguageCard,
    AddressHistorySection,
    ResidenceChecklistSection,
    DocumentVaultSection,
  },

  data() {
    return {
      // Local reactive form mirrors synced from Pinia documents store
      lifeForm: {
        status: 'not_started',
        testDate: '',
        urn: '',
        testCenter: '',
        notes: '',
      },

      englishForm: {
        type: 'b1_selt',
        provider: 'Trinity College London',
        status: 'not_started',
        testDate: '',
        referenceNo: '',
        notes: '',
      },

      ninForm: {
        number: '',
        status: 'not_applied',
        notes: '',
      },

      // Global snackbar feedback state
      snackbar: {
        show: false,
        text: '',
        color: 'success',
      },
    }
  },

  computed: {
    ...mapStores(useDocumentsStore, useAbsentsStore),
  },

  watch: {
    'documentsStore.lifeInUk': {
      deep: true,
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.lifeForm = { ...newVal }
        }
      },
    },

    'documentsStore.englishTest': {
      deep: true,
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.englishForm = { ...newVal }
        }
      },
    },

    'documentsStore.nationalInsurance': {
      deep: true,
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.ninForm = { ...newVal }
        }
      },
    },
  },

  methods: {
    /**
     * Saves updated Life in the UK form state to Pinia store.
     */
    saveLifeInUk() {
      this.documentsStore.updateLifeInUk(this.lifeForm)
      this.showSnackbar(this.$t('document.life_saved'), 'success')
    },

    /**
     * Saves updated English language qualification form state to Pinia store.
     */
    saveEnglishTest() {
      this.documentsStore.updateEnglishTest(this.englishForm)
      this.showSnackbar(this.$t('document.english_saved'), 'success')
    },

    /**
     * Saves updated National Insurance details to Pinia store.
     */
    saveNationalInsurance() {
      this.documentsStore.updateNationalInsurance(this.ninForm)
      this.showSnackbar(this.$t('document.nin_saved'), 'success')
    },

    /**
     * Shows snackbar toast message.
     * @param {string} text - Message text.
     * @param {string} [color='success'] - Vuetify color.
     */
    showSnackbar(text, color = 'success') {
      this.snackbar = {
        show: true,
        text,
        color,
      }
    },

    /**
     * Triggers DocumentVaultSection upload dialog pre-linked to an address record.
     * @param {Object} item - Address record object.
     */
    handleAttachAddressFile(item) {
      if (this.$refs.vaultSection) {
        this.$refs.vaultSection.openAttachAddressFileDialog(item)
      }
    },

    /**
     * Triggers DocumentVaultSection attached viewer dialog for an address record.
     * @param {Object} item - Address record object.
     */
    handleViewAttachedAddressFiles(item) {
      if (this.$refs.vaultSection) {
        this.$refs.vaultSection.openAttachedAddressFilesDialog(item)
      }
    },

    /**
     * Triggers DocumentVaultSection upload dialog pre-linked to a checklist item.
     * @param {Object} payload - { year, item }
     */
    handleAttachChecklistFile(payload) {
      if (this.$refs.vaultSection) {
        this.$refs.vaultSection.openAttachFileDialog(payload.year, payload.item)
      }
    },

    /**
     * Triggers DocumentVaultSection attached viewer dialog for a checklist item.
     * @param {Object} payload - { year, item }
     */
    handleViewAttachedChecklistFiles(payload) {
      if (this.$refs.vaultSection) {
        this.$refs.vaultSection.openAttachedFilesDialog(payload.year, payload.item)
      }
    },
  },
}
</script>

<template>
  <div class="d-flex flex-column ga-6">
    <!-- Top Row: Document Tracker Title Card & Overall Readiness Metric Banner & Top Requirement Cards -->
    <v-row density="default">
      <DocumentHeaderCard />
      <NationalInsuranceCard
        :nin-form="ninForm"
        @save="saveNationalInsurance"
        @show-snackbar="showSnackbar"
      />
      <LifeInUkCard :life-form="lifeForm" @save="saveLifeInUk" />
      <EnglishLanguageCard :english-form="englishForm" @save="saveEnglishTest" />
    </v-row>

    <!-- Second Row: UK Address History & 5-Year Continuous Residence Evidence Checklist -->
    <v-row density="default">
      <AddressHistorySection
        @attach-file="handleAttachAddressFile"
        @view-attached="handleViewAttachedAddressFiles"
        @show-snackbar="showSnackbar"
      />
      <ResidenceChecklistSection
        @attach-file="handleAttachChecklistFile"
        @view-attached="handleViewAttachedChecklistFiles"
        @show-snackbar="showSnackbar"
      />
    </v-row>

    <!-- Third Row: Document Vault Section -->
    <DocumentVaultSection ref="vaultSection" @show-snackbar="showSnackbar" />

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
