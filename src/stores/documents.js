import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { normalizeDate } from '../utils/date.js'
import { generateId } from '../utils/id.js'
import * as dbService from '../services/dbService.js'
import * as fileStorage from '../services/fileStorageService.js'

/** Storage key for persisting document tracker state in IndexedDB */
const STORAGE_KEY = 'bno_tracker_documents_v1'

/** Predefined folders for file organization */
const DEFAULT_FOLDERS = [
  { id: 'year_1', label: 'Year 1', icon: 'mdi-numeric-1-circle-outline' },
  { id: 'year_2', label: 'Year 2', icon: 'mdi-numeric-2-circle-outline' },
  { id: 'year_3', label: 'Year 3', icon: 'mdi-numeric-3-circle-outline' },
  { id: 'year_4', label: 'Year 4', icon: 'mdi-numeric-4-circle-outline' },
  { id: 'year_5', label: 'Year 5', icon: 'mdi-numeric-5-circle-outline' },
  { id: 'life_in_uk', label: 'Life in UK', icon: 'mdi-book-education-outline' },
  { id: 'english_b1', label: 'English B1', icon: 'mdi-translate' },
  { id: 'addresses', label: 'Addresses', icon: 'mdi-home-city-outline' },
  { id: 'other', label: 'Other', icon: 'mdi-folder-outline' },
]

/**
 * Generates default 5-year continuous residence proof checklist.
 *
 * @returns {Object<number, Array<{id: string, title: string, category: string, status: string, notes: string, dateCollected: string}>>}
 */
function getDefaultResidenceChecklist() {
  const defaultItems = [
    {
      id: 'council_tax',
      title: 'Council Tax Bill / Demand',
      category: 'Official & Government',
      importance: 'essential',
      status: 'pending',
      notes: '',
      dateCollected: '',
    },
    {
      id: 'p60_employment',
      title: 'P60 / Tax Return (SA302)',
      category: 'Tax & Employment',
      importance: 'essential',
      status: 'pending',
      notes: '',
      dateCollected: '',
    },
    {
      id: 'housing_proof',
      title: 'Tenancy Agreement / Mortgage Statement',
      category: 'Housing',
      importance: 'recommended',
      status: 'pending',
      notes: '',
      dateCollected: '',
    },
    {
      id: 'bank_statements',
      title: 'UK Bank Statements',
      category: 'Financial',
      importance: 'recommended',
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
  const isInitialized = ref(false)

  /** Life in the UK Test State */
  const lifeInUk = ref({
    status: 'not_started', // 'not_started' | 'scheduled' | 'passed'
    testDate: '',
    urn: '',
    testCenter: '',
    notes: '',
  })

  /** English Language Qualification State */
  const englishTest = ref({
    type: 'b1_selt', // 'b1_selt' | 'uk_degree' | 'enic_statement' | 'exempt'
    provider: 'Trinity College London',
    status: 'not_started', // 'not_started' | 'scheduled' | 'passed'
    referenceNo: '',
    testDate: '',
    notes: '',
  })

  /** 5-Year Continuous Residence Evidence Checklist State */
  const residenceChecklist = ref(getDefaultResidenceChecklist())

  /** UK Address History Log State */
  const addressHistory = ref([])

  /** Uploaded file metadata (loaded from IndexedDB, blobs loaded on-demand) */
  const uploadedFiles = ref([])

  /** Available folders for file organization */
  const folders = ref([...DEFAULT_FOLDERS])

  /** Loads state from IndexedDB (migrating from localStorage if needed). */
  async function initStore() {
    await dbService.migrateFromLocalStorage([STORAGE_KEY])
    const savedData = await dbService.getItem(STORAGE_KEY)
    if (savedData && typeof savedData === 'object') {
      if (savedData.lifeInUk) lifeInUk.value = savedData.lifeInUk
      if (savedData.englishTest) englishTest.value = savedData.englishTest
      if (savedData.residenceChecklist) residenceChecklist.value = savedData.residenceChecklist
      if (Array.isArray(savedData.addressHistory)) {
        const sorted = [...savedData.addressHistory]
        sortAddresses(sorted)
        addressHistory.value = sorted
      }
    }

    // Load file metadata from IndexedDB (blobs loaded on-demand)
    try {
      const fileMeta = await fileStorage.getAllFilesMeta()
      uploadedFiles.value = fileMeta
      autoPromoteChecklistStatuses()
    } catch (e) {
      console.error('Failed to load file metadata:', e)
      uploadedFiles.value = []
    }

    isInitialized.value = true
  }

  /** Saves current store state to IndexedDB. */
  async function saveToStorage() {
    if (!isInitialized.value) return
    const payload = {
      lifeInUk: lifeInUk.value,
      englishTest: englishTest.value,
      residenceChecklist: residenceChecklist.value,
      addressHistory: addressHistory.value,
    }
    await dbService.setItem(STORAGE_KEY, payload)
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
    return newAddress
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

  /**
   * Automatically promotes checklist item status from 'pending' to 'collected'
   * if one or more document files are linked to that item (unless already 'verified').
   */
  function autoPromoteChecklistStatuses() {
    if (!uploadedFiles.value || !residenceChecklist.value) return
    const linkedSet = new Set()
    uploadedFiles.value.forEach((f) => {
      if (f.linkedYear && f.linkedItemId) {
        linkedSet.add(`${f.linkedYear}_${f.linkedItemId}`)
      }
    })

    let changed = false
    for (let year = 1; year <= 5; year++) {
      const items = residenceChecklist.value[year]
      if (Array.isArray(items)) {
        items.forEach((item) => {
          if (linkedSet.has(`${year}_${item.id}`) && item.status === 'pending') {
            item.status = 'collected'
            if (!item.dateCollected) {
              item.dateCollected = new Date().toISOString().split('T')[0]
            }
            changed = true
          }
        })
      }
    }
    if (changed) {
      saveToStorage()
    }
  }

  // ── File Management Actions ──────────────────────────────────────────

  /**
   * Uploads a file to IndexedDB and updates reactive state.
   * @param {File} browserFile - Browser File object from input.
   * @param {string} folderId - Target folder ID.
   * @param {Object} [options] - Optional linked item info.
   * @param {number} [options.linkedYear] - Linked residence year (1-5).
   * @param {string} [options.linkedItemId] - Linked checklist item ID.
   * @param {string} [options.notes] - File notes.
   * @returns {Promise<Object>} Created file metadata.
   */
  async function uploadFile(browserFile, folderId, options = {}) {
    if (browserFile.size > fileStorage.MAX_FILE_SIZE) {
      throw new Error(
        `File exceeds maximum size of ${fileStorage.formatFileSize(fileStorage.MAX_FILE_SIZE)}`,
      )
    }

    const isDuplicate = uploadedFiles.value.some(
      (f) => f.name.trim().toLowerCase() === browserFile.name.trim().toLowerCase(),
    )
    if (isDuplicate) {
      throw new Error(
        `A file named "${browserFile.name}" already exists. File names must be unique.`,
      )
    }

    const data = await fileStorage.readFileAsArrayBuffer(browserFile)
    const id = generateId('file')
    const fileRecord = {
      id,
      name: browserFile.name,
      folderId: folderId || 'other',
      mimeType: browserFile.type || 'application/octet-stream',
      size: browserFile.size,
      data,
      uploadedAt: new Date().toISOString(),
      notes: options.notes || '',
      linkedYear: options.linkedYear || null,
      linkedItemId: options.linkedItemId || null,
    }

    await fileStorage.saveFile(fileRecord)

    // Add metadata (without blob) to reactive state
    uploadedFiles.value.push({
      id: fileRecord.id,
      name: fileRecord.name,
      folderId: fileRecord.folderId,
      mimeType: fileRecord.mimeType,
      size: fileRecord.size,
      uploadedAt: fileRecord.uploadedAt,
      notes: fileRecord.notes,
      linkedYear: fileRecord.linkedYear,
      linkedItemId: fileRecord.linkedItemId,
    })

    autoPromoteChecklistStatuses()
    return fileRecord
  }

  /**
   * Deletes a file from IndexedDB and reactive state.
   * @param {string} fileId - File ID to delete.
   */
  async function deleteUploadedFile(fileId) {
    await fileStorage.deleteFile(fileId)
    uploadedFiles.value = uploadedFiles.value.filter((f) => f.id !== fileId)
  }

  /**
   * Moves a file to a different folder.
   * @param {string} fileId - File ID.
   * @param {string} newFolderId - Target folder ID.
   */
  async function moveFile(fileId, newFolderId) {
    await fileStorage.updateFileMeta(fileId, { folderId: newFolderId })
    const file = uploadedFiles.value.find((f) => f.id === fileId)
    if (file) file.folderId = newFolderId
  }

  /**
   * Renames a file.
   * @param {string} fileId - File ID.
   * @param {string} newName - New display name.
   */
  async function renameFile(fileId, newName) {
    const cleanName = newName.trim()
    const isDuplicate = uploadedFiles.value.some(
      (f) => f.id !== fileId && f.name.trim().toLowerCase() === cleanName.toLowerCase(),
    )
    if (isDuplicate) {
      throw new Error(`A file named "${cleanName}" already exists. File names must be unique.`)
    }

    await fileStorage.updateFileMeta(fileId, { name: cleanName })
    const file = uploadedFiles.value.find((f) => f.id === fileId)
    if (file) file.name = cleanName
  }

  /**
   * Updates notes on a file.
   * @param {string} fileId - File ID.
   * @param {string} notes - New notes text.
   */
  async function updateFileNotes(fileId, notes) {
    await fileStorage.updateFileMeta(fileId, { notes })
    const file = uploadedFiles.value.find((f) => f.id === fileId)
    if (file) file.notes = notes
  }

  /**
   * Links a file to a specific residence checklist item.
   * @param {string} fileId - File ID.
   * @param {number} year - Residence year (1-5).
   * @param {string} itemId - Checklist item ID.
   */
  async function linkFileToChecklist(fileId, year, itemId) {
    await fileStorage.updateFileMeta(fileId, { linkedYear: year, linkedItemId: itemId })
    const file = uploadedFiles.value.find((f) => f.id === fileId)
    if (file) {
      file.linkedYear = year
      file.linkedItemId = itemId
    }
    autoPromoteChecklistStatuses()
  }

  /**
   * Unlinks a file from its checklist item.
   * @param {string} fileId - File ID.
   */
  async function unlinkFileFromChecklist(fileId) {
    await fileStorage.updateFileMeta(fileId, { linkedYear: null, linkedItemId: null })
    const file = uploadedFiles.value.find((f) => f.id === fileId)
    if (file) {
      file.linkedYear = null
      file.linkedItemId = null
    }
  }

  /**
   * Retrieves the full file record (with blob) for preview/download.
   * @param {string} fileId - File ID.
   * @returns {Promise<Object|null>} Full file record.
   */
  async function getFullFileRecord(fileId) {
    return fileStorage.getFile(fileId)
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
    uploadedFiles.value = []
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

  /** Total storage used by uploaded files in bytes */
  const totalFileStorageBytes = computed(() => {
    return uploadedFiles.value.reduce((sum, f) => sum + (f.size || 0), 0)
  })

  /** File count per folder */
  const fileCountByFolder = computed(() => {
    const counts = {}
    folders.value.forEach((f) => {
      counts[f.id] = 0
    })
    uploadedFiles.value.forEach((f) => {
      if (counts[f.folderId] !== undefined) counts[f.folderId]++
      else counts[f.folderId] = 1
    })
    return counts
  })

  /** Files linked to a specific checklist item */
  function getFilesForItem(year, itemId) {
    return uploadedFiles.value.filter((f) => f.linkedYear === year && f.linkedItemId === itemId)
  }

  watch(lifeInUk, () => saveToStorage(), { deep: true })
  watch(englishTest, () => saveToStorage(), { deep: true })
  watch(residenceChecklist, () => saveToStorage(), { deep: true })
  watch(addressHistory, () => saveToStorage(), { deep: true })

  return {
    isInitialized,
    initStore,
    lifeInUk,
    englishTest,
    residenceChecklist,
    addressHistory,
    uploadedFiles,
    folders,
    updateLifeInUk,
    updateEnglishTest,
    updateDocumentItem,
    addCustomDocumentItem,
    deleteDocumentItem,
    addAddress,
    updateAddress,
    deleteAddress,
    uploadFile,
    deleteUploadedFile,
    moveFile,
    renameFile,
    updateFileNotes,
    linkFileToChecklist,
    unlinkFileFromChecklist,
    getFullFileRecord,
    getFilesForItem,
    resetAll,
    importData,
    saveToStorage,
    isLifeInUkPassed,
    isEnglishPassed,
    residenceStats,
    overallReadinessPercent,
    totalFileStorageBytes,
    fileCountByFolder,
  }
})
