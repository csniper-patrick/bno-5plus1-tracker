import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { normalizeDate } from '../utils/date.js'
import { generateId } from '../utils/id.js'
import { formatNin } from '../utils/format.js'
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
  { id: 'nhs', label: 'NHS', icon: 'mdi-hospital-building' },
  { id: 'other', label: 'Other', icon: 'mdi-folder-outline' },
]

/** Standard default evidence item definitions (4 items per year) */
const STANDARD_DEFAULT_ITEMS = [
  {
    idSuffix: 'council_tax',
    title: 'Council Tax Bill / Demand',
    category: 'Official & Government',
    importance: 'essential',
  },
  {
    idSuffix: 'p60_employment',
    title: 'P60 / Tax Return (SA302)',
    category: 'Tax & Employment',
    importance: 'essential',
  },
  {
    idSuffix: 'housing_proof',
    title: 'Tenancy Agreement / Mortgage Statement',
    category: 'Housing',
    importance: 'recommended',
  },
  {
    idSuffix: 'bank_statements',
    title: 'UK Bank Statements',
    category: 'Financial',
    importance: 'recommended',
  },
]

/**
 * Generates default 5-year continuous residence proof checklist.
 *
 * @returns {Object<number, Array<{id: string, title: string, category: string, importance: string, status: string, notes: string, dateCollected: string}>>}
 */
function getDefaultResidenceChecklist() {
  const checklist = {}
  for (let year = 1; year <= 5; year++) {
    checklist[year] = STANDARD_DEFAULT_ITEMS.map((item) => ({
      id: `year_${year}_${item.idSuffix}`,
      title: item.title,
      category: item.category,
      importance: item.importance,
      status: 'pending',
      notes: '',
      dateCollected: '',
    }))
  }
  return checklist
}

/**
 * Sanitizes and normalizes residence checklist data from storage or backup imports.
 * Ensures the standard 4 default items exist for each year, preserves custom or modified user items,
 * and prunes untouched obsolete default items.
 *
 * @param {Object} loadedChecklist - Raw residence checklist object keyed by year (1 to 5).
 * @param {Array} [uploadedFilesList=[]] - Metadata list of uploaded files to check attached items.
 * @returns {Object} Sanitized residence checklist object.
 */
export function sanitizeResidenceChecklist(loadedChecklist, uploadedFilesList = []) {
  if (!loadedChecklist || typeof loadedChecklist !== 'object') {
    return getDefaultResidenceChecklist()
  }

  const linkedItemKeys = new Set()
  if (Array.isArray(uploadedFilesList)) {
    uploadedFilesList.forEach((f) => {
      if (f.linkedYear && f.linkedItemId) {
        linkedItemKeys.add(`${f.linkedYear}_${f.linkedItemId}`)
      }
    })
  }

  const result = {}

  for (let year = 1; year <= 5; year++) {
    const rawItems = Array.isArray(loadedChecklist[year]) ? loadedChecklist[year] : []
    const yearItems = []
    const matchedStandardSuffixes = new Set()

    rawItems.forEach((item) => {
      if (!item || typeof item !== 'object') return

      const stdMatch = STANDARD_DEFAULT_ITEMS.find(
        (std) =>
          item.id === `year_${year}_${std.idSuffix}` ||
          item.id === std.idSuffix ||
          (typeof item.id === 'string' && item.id.endsWith(`_${std.idSuffix}`)),
      )

      if (stdMatch) {
        matchedStandardSuffixes.add(stdMatch.idSuffix)
        yearItems.push({
          ...item,
          id: `year_${year}_${stdMatch.idSuffix}`,
          title: stdMatch.title,
          category: stdMatch.category,
          importance: stdMatch.importance,
          status: item.status || 'pending',
          notes: item.notes || '',
          dateCollected: normalizeDate(item.dateCollected || item.date_collected || ''),
        })
      } else {
        const hasFiles = linkedItemKeys.has(`${year}_${item.id}`)
        const isModified =
          !!item.isCustom ||
          (item.status && item.status !== 'pending') ||
          (item.notes && String(item.notes).trim() !== '') ||
          (item.dateCollected && String(item.dateCollected).trim() !== '') ||
          hasFiles

        if (isModified) {
          yearItems.push({
            ...item,
            id: item.id || generateId('custom'),
            title: item.title || 'Custom Evidence',
            category: item.category || 'Custom Evidence',
            status: item.status || 'pending',
            notes: item.notes || '',
            dateCollected: normalizeDate(item.dateCollected || item.date_collected || ''),
            isCustom: true,
          })
        }
      }
    })

    // Ensure all 4 standard default items exist for this year
    STANDARD_DEFAULT_ITEMS.forEach((std) => {
      if (!matchedStandardSuffixes.has(std.idSuffix)) {
        yearItems.push({
          id: `year_${year}_${std.idSuffix}`,
          title: std.title,
          category: std.category,
          importance: std.importance,
          status: 'pending',
          notes: '',
          dateCollected: '',
        })
      }
    })

    result[year] = yearItems
  }

  return result
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

  /** National Insurance (NIN/NINO) Record State */
  const nationalInsurance = ref({
    number: '',
    status: 'not_applied', // 'not_applied' | 'applied' | 'received'
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
      if (savedData.nationalInsurance) {
        const nin = { ...savedData.nationalInsurance }
        nin.number = formatNin(nin.number)
        if (
          nin.number.trim().length > 0 &&
          (!nin.status || nin.status === 'not_applied' || nin.status === 'applied')
        ) {
          nin.status = 'received'
        }
        nationalInsurance.value = nin
      }
      if (savedData.residenceChecklist) {
        residenceChecklist.value = sanitizeResidenceChecklist(
          savedData.residenceChecklist,
          uploadedFiles.value,
        )
      }
      if (Array.isArray(savedData.addressHistory)) {
        const sorted = [...savedData.addressHistory]
        sortAddresses(sorted)
        addressHistory.value = sorted
      }
    } else {
      lifeInUk.value = { status: 'not_started', testDate: '', urn: '', testCenter: '', notes: '' }
      englishTest.value = {
        type: 'b1_selt',
        provider: 'Trinity College London',
        status: 'not_started',
        referenceNo: '',
        testDate: '',
        notes: '',
      }
      nationalInsurance.value = { number: '', status: 'not_applied', notes: '' }
      residenceChecklist.value = getDefaultResidenceChecklist()
      addressHistory.value = []
    }

    // Load file metadata from IndexedDB (blobs loaded on-demand)
    try {
      const fileMeta = await fileStorage.getAllFilesMeta()
      uploadedFiles.value = fileMeta
      residenceChecklist.value = sanitizeResidenceChecklist(
        residenceChecklist.value,
        uploadedFiles.value,
      )
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
      nationalInsurance: nationalInsurance.value,
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

  function updateNationalInsurance(payload) {
    const updated = { ...nationalInsurance.value, ...payload }
    if (payload && payload.number !== undefined) {
      const formatted = formatNin(payload.number)
      updated.number = formatted
      if (
        formatted.trim().length > 0 &&
        (!payload.status || payload.status === 'not_applied' || payload.status === 'applied')
      ) {
        updated.status = 'received'
      } else if (
        formatted.trim().length === 0 &&
        payload.status === undefined &&
        updated.status === 'received'
      ) {
        updated.status = 'not_applied'
      }
    } else if (
      updated.number &&
      updated.number.trim().length > 0 &&
      (!payload || !payload.status)
    ) {
      updated.status = 'received'
    }
    nationalInsurance.value = updated
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

  async function deleteAddress(id) {
    addressHistory.value = addressHistory.value.filter((a) => a.id !== id)
    // Unlink any documents linked to this address
    const linkedFiles = uploadedFiles.value.filter((f) => f.linkedAddressId === id)
    for (const f of linkedFiles) {
      await unlinkFileFromChecklist(f.id)
    }
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
    let mimeType = browserFile.type || 'application/octet-stream'
    if (
      (!browserFile.type || browserFile.type === 'application/octet-stream') &&
      browserFile.name.toLowerCase().endsWith('.pdf')
    ) {
      mimeType = 'application/pdf'
    }

    const fileRecord = {
      id,
      name: browserFile.name,
      folderId: folderId || 'other',
      mimeType,
      size: browserFile.size,
      data,
      uploadedAt: new Date().toISOString(),
      notes: options.notes || '',
      linkedYear: options.linkedYear || null,
      linkedItemId: options.linkedItemId || null,
      linkedAddressId: options.linkedAddressId || null,
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
      linkedAddressId: fileRecord.linkedAddressId,
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
    await fileStorage.updateFileMeta(fileId, {
      linkedYear: year,
      linkedItemId: itemId,
      linkedAddressId: null,
    })
    const file = uploadedFiles.value.find((f) => f.id === fileId)
    if (file) {
      file.linkedYear = year
      file.linkedItemId = itemId
      file.linkedAddressId = null
    }
    autoPromoteChecklistStatuses()
  }

  /**
   * Links a file to a specific UK address entry.
   * @param {string} fileId - File ID.
   * @param {string} addressId - Address record ID.
   */
  async function linkFileToAddress(fileId, addressId) {
    await fileStorage.updateFileMeta(fileId, {
      linkedYear: null,
      linkedItemId: null,
      linkedAddressId: addressId,
    })
    const file = uploadedFiles.value.find((f) => f.id === fileId)
    if (file) {
      file.linkedYear = null
      file.linkedItemId = null
      file.linkedAddressId = addressId
    }
  }

  /**
   * Unlinks a file from its checklist item or address.
   * @param {string} fileId - File ID.
   */
  async function unlinkFileFromChecklist(fileId) {
    await fileStorage.updateFileMeta(fileId, {
      linkedYear: null,
      linkedItemId: null,
      linkedAddressId: null,
    })
    const file = uploadedFiles.value.find((f) => f.id === fileId)
    if (file) {
      file.linkedYear = null
      file.linkedItemId = null
      file.linkedAddressId = null
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

    if (docObj.nationalInsurance && typeof docObj.nationalInsurance === 'object') {
      const formattedNum = formatNin(docObj.nationalInsurance.number)
      let ninStatus = docObj.nationalInsurance.status || nationalInsurance.value.status
      if (
        formattedNum.trim().length > 0 &&
        (!ninStatus || ninStatus === 'not_applied' || ninStatus === 'applied')
      ) {
        ninStatus = 'received'
      }
      nationalInsurance.value = {
        ...nationalInsurance.value,
        ...docObj.nationalInsurance,
        number: formattedNum,
        status: ninStatus,
      }
      importedCount++
    }

    if (docObj.residenceChecklist && typeof docObj.residenceChecklist === 'object') {
      residenceChecklist.value = sanitizeResidenceChecklist(
        docObj.residenceChecklist,
        uploadedFiles.value,
      )
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
    nationalInsurance.value = {
      number: '',
      status: 'not_applied',
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

  /** Files linked to a specific address entry */
  function getFilesForAddress(addressId) {
    return uploadedFiles.value.filter((f) => f.linkedAddressId === addressId)
  }

  watch(lifeInUk, () => saveToStorage(), { deep: true })
  watch(englishTest, () => saveToStorage(), { deep: true })
  watch(nationalInsurance, () => saveToStorage(), { deep: true })
  watch(residenceChecklist, () => saveToStorage(), { deep: true })
  watch(addressHistory, () => saveToStorage(), { deep: true })

  return {
    isInitialized,
    initStore,
    lifeInUk,
    englishTest,
    nationalInsurance,
    residenceChecklist,
    addressHistory,
    uploadedFiles,
    folders,
    updateLifeInUk,
    updateEnglishTest,
    updateNationalInsurance,
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
    linkFileToAddress,
    unlinkFileFromChecklist,
    getFullFileRecord,
    getFilesForItem,
    getFilesForAddress,
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
