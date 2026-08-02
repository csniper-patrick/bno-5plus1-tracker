import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { normalizeDate } from '../utils/date.js'
import { generateId } from '../utils/id.js'

/** Storage key for persisting document tracker state in localStorage */
const STORAGE_KEY = 'bno_tracker_documents_v1'

/**
 * Generates default 5-year continuous residence proof checklist.
 *
 * @returns {Object<number, Array<{id: string, title: string, category: string, status: string, notes: string, dateCollected: string}>>}
 */
function getDefaultResidenceChecklist() {
  const defaultItems = [
    {
      id: 'council_tax',
      title: 'Council Tax Demand / Bill',
      category: 'Official Housing',
      status: 'pending',
      notes: '',
      dateCollected: '',
    },
    {
      id: 'p60_employment',
      title: 'P60 / Tax Return (SA302) / Payslips',
      category: 'Tax & Income',
      status: 'pending',
      notes: '',
      dateCollected: '',
    },
    {
      id: 'bank_statements',
      title: 'UK Bank Account Statements',
      category: 'Financial',
      status: 'pending',
      notes: '',
      dateCollected: '',
    },
    {
      id: 'housing_proof',
      title: 'Tenancy Agreement / Mortgage Statement',
      category: 'Housing',
      status: 'pending',
      notes: '',
      dateCollected: '',
    },
    {
      id: 'utility_bill',
      title: 'Utility Bill (Gas, Electricity, Water, Broadband)',
      category: 'Utilities',
      status: 'pending',
      notes: '',
      dateCollected: '',
    },
  ]

  const checklist = {}
  for (let year = 1; year <= 5; year++) {
    checklist[year] = defaultItems.map((item) => ({
      ...item,
      id: `year_${year}_${item.id}`,
    }))
  }
  return checklist
}

/**
 * Sorts address records chronologically by move-in date (oldest first).
 *
 * @param {Array<Object>} arr - List of address objects containing startDate.
 * @returns {Array<Object>} Sorted address array.
 */
function sortAddresses(arr) {
  if (!Array.isArray(arr)) return []
  return arr.sort((a, b) => ((a && a.startDate) || '').localeCompare((b && b.startDate) || ''))
}

/**
 * Pinia store for Document & Qualification Tracking.
 * Manages reactive state and persistence for Life in the UK test, English B1 requirement,
 * 5-Year continuous residence supporting evidence, and UK Address History.
 */
export const useDocumentsStore = defineStore('documents', () => {
  // Load saved state from localStorage or initialize defaults
  const savedDataRaw = localStorage.getItem(STORAGE_KEY)
  let savedData = {}
  try {
    if (savedDataRaw) savedData = JSON.parse(savedDataRaw)
  } catch (e) {
    console.error('Failed to parse saved document store data:', e)
  }

  /** Life in the UK Test State */
  const lifeInUk = ref(
    savedData.lifeInUk || {
      status: 'not_started', // 'not_started' | 'scheduled' | 'passed'
      testDate: '',
      urn: '',
      testCenter: '',
      notes: '',
    },
  )

  /** English Language Qualification State */
  const englishTest = ref(
    savedData.englishTest || {
      type: 'b1_selt', // 'b1_selt' | 'uk_degree' | 'enic_statement' | 'exempt'
      provider: 'Trinity College London',
      status: 'not_started', // 'not_started' | 'scheduled' | 'passed'
      referenceNo: '',
      testDate: '',
      notes: '',
    },
  )

  /** 5-Year Continuous Residence Evidence Checklist State */
  const residenceChecklist = ref(savedData.residenceChecklist || getDefaultResidenceChecklist())

  /** UK Address History Log State */
  const initialAddresses = savedData.addressHistory || []
  sortAddresses(initialAddresses)
  const addressHistory = ref(initialAddresses)

  /** Saves current store state to localStorage. */
  function saveToStorage() {
    const payload = {
      lifeInUk: lifeInUk.value,
      englishTest: englishTest.value,
      residenceChecklist: residenceChecklist.value,
      addressHistory: addressHistory.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  function updateLifeInUk(payload) {
    lifeInUk.value = { ...lifeInUk.value, ...payload }
    saveToStorage()
  }

  function updateEnglishTest(payload) {
    englishTest.value = { ...englishTest.value, ...payload }
    saveToStorage()
  }

  function updateDocumentItem(year, itemId, updates) {
    if (!residenceChecklist.value[year]) return
    const index = residenceChecklist.value[year].findIndex((item) => item.id === itemId)
    if (index !== -1) {
      residenceChecklist.value[year][index] = {
        ...residenceChecklist.value[year][index],
        ...updates,
      }
      saveToStorage()
    }
  }

  function addCustomDocumentItem(year, { title, category }) {
    if (!residenceChecklist.value[year]) {
      residenceChecklist.value[year] = []
    }
    const newItem = {
      id: generateId('custom'),
      title: title.trim(),
      category: category ? category.trim() : 'Custom Evidence',
      status: 'pending',
      notes: '',
      dateCollected: '',
      isCustom: true,
    }
    residenceChecklist.value[year].push(newItem)
    saveToStorage()
  }

  function deleteDocumentItem(year, itemId) {
    if (!residenceChecklist.value[year]) return
    residenceChecklist.value[year] = residenceChecklist.value[year].filter(
      (item) => item.id !== itemId,
    )
    saveToStorage()
  }

  function addAddress(addressObj) {
    const newAddress = {
      id: generateId('addr'),
      addressLine1: addressObj.addressLine1 ? addressObj.addressLine1.trim() : '',
      addressLine2: addressObj.addressLine2 ? addressObj.addressLine2.trim() : '',
      city: addressObj.city ? addressObj.city.trim() : '',
      postcode: addressObj.postcode ? addressObj.postcode.trim().toUpperCase() : '',
      startDate: addressObj.startDate || '',
      endDate: addressObj.isCurrent ? '' : addressObj.endDate || '',
      isCurrent: !!addressObj.isCurrent,
      housingStatus: addressObj.housingStatus || 'rented',
      notes: addressObj.notes ? addressObj.notes.trim() : '',
    }

    if (newAddress.isCurrent) {
      addressHistory.value.forEach((addr) => {
        addr.isCurrent = false
      })
    }

    addressHistory.value.push(newAddress)
    sortAddresses(addressHistory.value)
    saveToStorage()
  }

  function updateAddress(id, addressObj) {
    const index = addressHistory.value.findIndex((a) => a.id === id)
    if (index === -1) return

    if (addressObj.isCurrent) {
      addressHistory.value.forEach((addr) => {
        if (addr.id !== id) addr.isCurrent = false
      })
    }

    addressHistory.value[index] = {
      ...addressHistory.value[index],
      addressLine1: addressObj.addressLine1 ? addressObj.addressLine1.trim() : '',
      addressLine2: addressObj.addressLine2 ? addressObj.addressLine2.trim() : '',
      city: addressObj.city ? addressObj.city.trim() : '',
      postcode: addressObj.postcode ? addressObj.postcode.trim().toUpperCase() : '',
      startDate: addressObj.startDate || '',
      endDate: addressObj.isCurrent ? '' : addressObj.endDate || '',
      isCurrent: !!addressObj.isCurrent,
      housingStatus: addressObj.housingStatus || 'rented',
      notes: addressObj.notes ? addressObj.notes.trim() : '',
    }

    sortAddresses(addressHistory.value)
    saveToStorage()
  }

  function deleteAddress(id) {
    addressHistory.value = addressHistory.value.filter((a) => a.id !== id)
    saveToStorage()
  }

  function importData(data) {
    if (!data || typeof data !== 'object') return false

    const docObj = data.documents && typeof data.documents === 'object' ? data.documents : data
    let importedCount = 0

    if (docObj.lifeInUk && typeof docObj.lifeInUk === 'object') {
      lifeInUk.value = {
        ...lifeInUk.value,
        ...docObj.lifeInUk,
        testDate: normalizeDate(docObj.lifeInUk.testDate || docObj.lifeInUk.test_date || ''),
      }
      importedCount++
    }

    if (docObj.englishTest && typeof docObj.englishTest === 'object') {
      englishTest.value = {
        ...englishTest.value,
        ...docObj.englishTest,
        testDate: normalizeDate(docObj.englishTest.testDate || docObj.englishTest.test_date || ''),
      }
      importedCount++
    }

    if (docObj.residenceChecklist && typeof docObj.residenceChecklist === 'object') {
      Object.keys(docObj.residenceChecklist).forEach((year) => {
        if (Array.isArray(docObj.residenceChecklist[year])) {
          residenceChecklist.value[year] = docObj.residenceChecklist[year].map((item) => ({
            ...item,
            dateCollected: normalizeDate(item.dateCollected || item.date_collected || ''),
          }))
        }
      })
      importedCount++
    }

    const rawAddresses = Array.isArray(docObj.addressHistory)
      ? docObj.addressHistory
      : Array.isArray(docObj.addresses)
        ? docObj.addresses
        : null

    if (rawAddresses) {
      const validAddresses = rawAddresses
        .map((item, idx) => {
          if (!item || typeof item !== 'object') return null
          const startDate = normalizeDate(item.startDate || item.start_date || '')
          const isCurrent = !!item.isCurrent || !!item.is_current
          const endDate = isCurrent ? '' : normalizeDate(item.endDate || item.end_date || '')
          return {
            id: item.id || generateId('addr'),
            addressLine1: item.addressLine1
              ? String(item.addressLine1).trim()
              : item.address_line_1
                ? String(item.address_line_1).trim()
                : '',
            addressLine2: item.addressLine2
              ? String(item.addressLine2).trim()
              : item.address_line_2
                ? String(item.address_line_2).trim()
                : '',
            city: item.city ? String(item.city).trim() : '',
            postcode: item.postcode ? String(item.postcode).trim().toUpperCase() : '',
            startDate,
            endDate,
            isCurrent,
            housingStatus: item.housingStatus || item.housing_status || 'rented',
            notes: item.notes ? String(item.notes).trim() : '',
          }
        })
        .filter(Boolean)

      sortAddresses(validAddresses)
      addressHistory.value = validAddresses
      importedCount++
    }

    saveToStorage()
    return importedCount > 0
  }

  function resetAll() {
    lifeInUk.value = {
      status: 'not_started',
      testDate: '',
      urn: '',
      testCenter: '',
      notes: '',
    }
    englishTest.value = {
      type: 'b1_selt',
      provider: 'Trinity College London',
      status: 'not_started',
      referenceNo: '',
      testDate: '',
      notes: '',
    }
    residenceChecklist.value = getDefaultResidenceChecklist()
    addressHistory.value = []
    saveToStorage()
  }

  const isLifeInUkPassed = computed(() => lifeInUk.value.status === 'passed')
  const isEnglishPassed = computed(
    () => englishTest.value.status === 'passed' || englishTest.value.type === 'exempt',
  )

  const residenceStats = computed(() => {
    let totalItems = 0
    let collectedItems = 0
    let verifiedItems = 0

    const perYear = {}

    for (let year = 1; year <= 5; year++) {
      const items = residenceChecklist.value[year] || []
      const yTotal = items.length
      const yCollected = items.filter(
        (i) => i.status === 'collected' || i.status === 'verified',
      ).length
      const yVerified = items.filter((i) => i.status === 'verified').length

      totalItems += yTotal
      collectedItems += yCollected
      verifiedItems += yVerified

      perYear[year] = {
        total: yTotal,
        collected: yCollected,
        verified: yVerified,
        percent: yTotal > 0 ? Math.round((yCollected / yTotal) * 100) : 0,
      }
    }

    const overallPercent = totalItems > 0 ? Math.round((collectedItems / totalItems) * 100) : 0

    return {
      totalItems,
      collectedItems,
      verifiedItems,
      overallPercent,
      perYear,
    }
  })

  const overallReadinessPercent = computed(() => {
    let score = 0
    let total = 4

    if (isLifeInUkPassed.value) score += 1
    else if (lifeInUk.value.status === 'scheduled') score += 0.5

    if (isEnglishPassed.value) score += 1
    else if (englishTest.value.status === 'scheduled') score += 0.5

    score += residenceStats.value.overallPercent / 100

    if (addressHistory.value.length > 0) score += 1

    return Math.round((score / total) * 100)
  })

  watch(lifeInUk, () => saveToStorage(), { deep: true })
  watch(englishTest, () => saveToStorage(), { deep: true })
  watch(residenceChecklist, () => saveToStorage(), { deep: true })
  watch(addressHistory, () => saveToStorage(), { deep: true })

  return {
    lifeInUk,
    englishTest,
    residenceChecklist,
    addressHistory,
    updateLifeInUk,
    updateEnglishTest,
    updateDocumentItem,
    addCustomDocumentItem,
    deleteDocumentItem,
    addAddress,
    updateAddress,
    deleteAddress,
    resetAll,
    importData,
    saveToStorage,
    isLifeInUkPassed,
    isEnglishPassed,
    residenceStats,
    overallReadinessPercent,
  }
})
