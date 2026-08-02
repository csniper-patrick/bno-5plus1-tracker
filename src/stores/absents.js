import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { parse, Document } from 'yaml'
import { useDocumentsStore } from './documents.js'

/**
 * LocalStorage key used to persist user absence records across browser sessions.
 */
const STORAGE_KEY = 'bno_absences'

/**
 * LocalStorage key used to persist user BNO Visa Start Date across browser sessions.
 */
const STORAGE_VISA_KEY = 'bno_visa_start_date'

/**
 * LocalStorage key used to persist user UK Arrival Date across browser sessions.
 */
const STORAGE_ARRIVAL_KEY = 'bno_uk_arrival_date'

/**
 * LocalStorage key used to persist user ILR Approved Date across browser sessions.
 */
const STORAGE_ILR_APPROVED_KEY = 'bno_ilr_approved_date'

/**
 * Segment Tree data structure for efficient O(log N) range sum queries over a 10-year period (day-by-day).
 * Supports O(log N) point updates for incremental tree modifications when records are added/updated/removed.
 */
export class AbsenceSegmentTree {
  /**
   * Constructs an AbsenceSegmentTree with a fixed maximum leaf capacity.
   * Allocates an Int32Array of size 4 * size + 1 to store segment sum tree nodes (1-indexed, 0th index unused).
   *
   * @param {number} size - Number of leaves (days in the 10-year tracking window).
   */
  constructor(size) {
    this.n = size
    this.tree = new Int32Array(4 * size + 1)
  }

  /**
   * Initializes and constructs the Segment Tree from a daily binary array (0 = present, 1 = absent).
   * Runs in O(N) time where N is the length of the input array.
   *
   * @param {Uint8Array|number[]} arr - Daily array where index i represents day offset from visa start date.
   */
  build(arr) {
    this.n = arr.length
    if (this.n === 0) return
    if (this.tree.length < 4 * this.n + 1) {
      this.tree = new Int32Array(4 * this.n + 1)
    }
    this._build(arr, 1, 0, this.n - 1)
  }

  /**
   * Recursive helper function to construct tree nodes.
   *
   * @private
   * @param {Uint8Array|number[]} arr - Source daily absence array.
   * @param {number} node - Index of current tree node in the 1D tree array.
   * @param {number} start - Segment start leaf index.
   * @param {number} end - Segment end leaf index.
   */
  _build(arr, node, start, end) {
    if (start === end) {
      this.tree[node] = arr[start]
      return
    }
    const mid = Math.floor((start + end) / 2)
    const leftNode = 2 * node
    const rightNode = 2 * node + 1
    this._build(arr, leftNode, start, mid)
    this._build(arr, rightNode, mid + 1, end)
    this.tree[node] = this.tree[leftNode] + this.tree[rightNode]
  }

  /**
   * Updates a single point (leaf index) in O(log N) time.
   *
   * @param {number} idx - Leaf index to update (0 to n - 1).
   * @param {number} val - New value (0 or 1).
   */
  updatePoint(idx, val) {
    if (idx < 0 || idx >= this.n) return
    this._updatePoint(1, 0, this.n - 1, idx, val)
  }

  /**
   * Recursive helper function for point updates.
   *
   * @private
   * @param {number} node - Index of current tree node.
   * @param {number} start - Segment start leaf index.
   * @param {number} end - Segment end leaf index.
   * @param {number} idx - Target leaf index.
   * @param {number} val - New leaf value.
   */
  _updatePoint(node, start, end, idx, val) {
    if (start === end) {
      this.tree[node] = val
      return
    }
    const mid = Math.floor((start + end) / 2)
    const leftNode = 2 * node
    const rightNode = 2 * node + 1
    if (idx <= mid) {
      this._updatePoint(leftNode, start, mid, idx, val)
    } else {
      this._updatePoint(rightNode, mid + 1, end, idx, val)
    }
    this.tree[node] = this.tree[leftNode] + this.tree[rightNode]
  }

  /**
   * Queries range sum in [qstart, qend] in O(log N) time.
   *
   * @param {number} qstart - Start leaf index.
   * @param {number} qend - End leaf index.
   * @returns {number} Range sum of absent days.
   */
  query(qstart, qend) {
    if (this.n === 0 || qstart > qend) return 0
    const clampedStart = Math.max(0, qstart)
    const clampedEnd = Math.min(this.n - 1, qend)
    if (clampedStart > clampedEnd) return 0
    return this._query(1, 0, this.n - 1, clampedStart, clampedEnd)
  }

  /**
   * Recursive helper function for range sum queries.
   *
   * @private
   * @param {number} node - Index of current tree node.
   * @param {number} start - Node segment start index.
   * @param {number} end - Node segment end index.
   * @param {number} l - Query range start index.
   * @param {number} r - Query range end index.
   * @returns {number} Sum of absent days in intersection [start, end] ∩ [l, r].
   */
  _query(node, start, end, l, r) {
    if (r < start || end < l) return 0
    if (l <= start && end <= r) return this.tree[node]
    const mid = Math.floor((start + end) / 2)
    const leftNode = 2 * node
    const rightNode = 2 * node + 1
    const leftSum = this._query(leftNode, start, mid, l, r)
    const rightSum = this._query(rightNode, mid + 1, end, l, r)
    return leftSum + rightSum
  }
}

/**
 * Helper to safely parse a 'YYYY-MM-DD' string or Date object to a UTC midnight Date object.
 * Standardizes date calculations to UTC to prevent local timezone offsets (e.g. BST/GMT daylight savings shifts)
 * from altering day index calculations or calendar day count precision.
 *
 * @param {string|Date} dateInput - Input date string ('YYYY-MM-DD' or ISO string) or JS Date object.
 * @returns {Date|null} UTC midnight Date object or null if invalid.
 */
function parseDateUTC(dateInput) {
  if (!dateInput) return null
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null
    return new Date(
      Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()),
    )
  }
  if (typeof dateInput === 'string') {
    const cleanStr = dateInput.split('T')[0]
    const parts = cleanStr.split('-').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return null
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  }
  return null
}

/**
 * Calculates the maximum return date (10 years from visa start date) that the Segment Tree can handle.
 *
 * @param {string} visaStartDateStr - The visa start date string in 'YYYY-MM-DD' format.
 * @returns {string|null} Maximum return date in 'YYYY-MM-DD' format, or null if invalid.
 */
export function getMaxSegmentTreeReturnDate(visaStartDateStr) {
  if (!visaStartDateStr) return null
  const vStart = parseDateUTC(visaStartDateStr)
  if (!vStart) return null
  const maxDate = new Date(vStart)
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 10)
  const y = maxDate.getUTCFullYear()
  const m = String(maxDate.getUTCMonth() + 1).padStart(2, '0')
  const d = String(maxDate.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Calculates the number of full days absent for a given period.
 * Departure (start) and return (end) days are partially spent in the UK and are excluded.
 * Only full 24-hour days spent entirely abroad are counted as days absent.
 *
 * @param {string} startDateStr - The start date string in 'YYYY-MM-DD' format (departure date).
 * @param {string} endDateStr - The end date string in 'YYYY-MM-DD' format (return date).
 * @returns {number} Total number of full days absent (returns 0 for invalid ranges or ranges with no full days absent).
 */
export function calculateDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)

  // Validate date objects and check if start date comes after end date
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0

  // Calculate difference in calendar days between start and end dates
  const diffTime = Math.abs(end - start)
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  // Exclude start date (departure) and end date (arrival); count only complete intermediate days
  return Math.max(0, diffDays - 1)
}

/**
 * Pinia store for managing absence records and calculating total days absent.
 * Maintains an incremental Segment Tree covering 10 years from visaStartDate for fast O(log N) range queries.
 */
export const useAbsentsStore = defineStore('absents', () => {
  // ---------------------------------------------------------------------------
  // State Initialization
  // ---------------------------------------------------------------------------

  // Helper function to sort absences array chronologically by start date
  function sortAbsencesArray(arr) {
    return arr.sort((a, b) => {
      const startDiff = (a.startDate || '').localeCompare(b.startDate || '')
      if (startDiff !== 0) return startDiff
      return (a.endDate || '').localeCompare(b.endDate || '')
    })
  }

  // Restore saved absence records from browser storage
  const storedData = localStorage.getItem(STORAGE_KEY)
  const initialAbsences = storedData ? JSON.parse(storedData) : []
  sortAbsencesArray(initialAbsences)

  /**
   * Primary reactive list of absence records, maintained in chronological order.
   */
  const absences = ref(initialAbsences)

  // Restore saved Visa Start Date
  const storedVisaDate = localStorage.getItem(STORAGE_VISA_KEY) || ''

  /**
   * The start date of the user's BNO visa (YYYY-MM-DD format).
   */
  const visaStartDate = ref(storedVisaDate)

  // Restore saved UK Arrival Date
  const storedArrivalDate = localStorage.getItem(STORAGE_ARRIVAL_KEY) || ''

  /**
   * The UK arrival date of the user (YYYY-MM-DD format).
   */
  const ukArrivalDate = ref(storedArrivalDate)

  // Restore saved ILR Approved Date
  const storedIlrApprovedDate = localStorage.getItem(STORAGE_ILR_APPROVED_KEY) || ''

  /**
   * The ILR approved date of the user (YYYY-MM-DD format).
   */
  const ilrApprovedDate = ref(storedIlrApprovedDate)

  // Persistent Segment Tree & Coverage Tracking State
  const segmentTree = ref(null)
  const segmentTreeVersion = ref(0)
  let coverageCount = null
  let segmentTreeSize = 0

  // ---------------------------------------------------------------------------
  // Auto UK Arrival Absence Record Sync
  // ---------------------------------------------------------------------------

  const AUTO_ARRIVAL_ID = 'auto_uk_arrival_record'

  /**
   * Returns a 'YYYY-MM-DD' date string corresponding to 1 day before the given date string.
   */
  function getOneDayBefore(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return ''
    const parts = dateStr.split('-').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return ''
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
    date.setUTCDate(date.getUTCDate() - 1)
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  /**
   * Synchronizes the automatic initial UK arrival absence record.
   * If ukArrivalDate > visaStartDate, initializes/updates an arrival record
   * starting 1 day before visaStartDate to ukArrivalDate.
   */
  function syncArrivalRecord() {
    if (!visaStartDate.value || !ukArrivalDate.value) {
      const existingIdx = absences.value.findIndex(
        (item) => item.id === AUTO_ARRIVAL_ID || item.isAutoArrival,
      )
      if (existingIdx !== -1) {
        removeRecordFromSegmentTree(absences.value[existingIdx])
        absences.value.splice(existingIdx, 1)
      }
      return
    }

    const vStart = visaStartDate.value
    const uArrival = ukArrivalDate.value

    if (uArrival !== vStart && uArrival > vStart) {
      const oneDayBeforeVisa = getOneDayBefore(vStart)
      const index = absences.value.findIndex(
        (item) => item.id === AUTO_ARRIVAL_ID || item.isAutoArrival,
      )

      if (index !== -1) {
        const oldRecord = { ...absences.value[index] }
        absences.value[index] = {
          ...oldRecord,
          id: AUTO_ARRIVAL_ID,
          startDate: oneDayBeforeVisa,
          endDate: uArrival,
          dest: 'UK Arrival',
          isAutoArrival: true,
        }
        sortAbsencesArray(absences.value)
        removeRecordFromSegmentTree(oldRecord)
        addRecordToSegmentTree(absences.value[index])
      } else {
        const arrivalRecord = {
          id: AUTO_ARRIVAL_ID,
          startDate: oneDayBeforeVisa,
          endDate: uArrival,
          dest: 'UK Arrival',
          isAutoArrival: true,
          createdAt: new Date().toISOString(),
        }
        absences.value.push(arrivalRecord)
        sortAbsencesArray(absences.value)
        addRecordToSegmentTree(arrivalRecord)
      }
    } else {
      const index = absences.value.findIndex(
        (item) => item.id === AUTO_ARRIVAL_ID || item.isAutoArrival,
      )
      if (index !== -1) {
        removeRecordFromSegmentTree(absences.value[index])
        absences.value.splice(index, 1)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Segment Tree Management (Incremental Point Updates)
  // ---------------------------------------------------------------------------

  /**
   * Computes the day index range [startIdx, endIdx] relative to visaStartDate for a record.
   * Departure and return days are excluded.
   */
  function getRecordIndexRange(record, vStart, n) {
    if (!record || !record.startDate || !record.endDate) return null
    const s = parseDateUTC(record.startDate)
    const e = parseDateUTC(record.endDate)
    if (!s || !e || e <= s) return null

    // Intermediate absent days (excluding departure & return days)
    const firstAbsentDayMs = s.getTime() + 86400000
    const lastAbsentDayMs = e.getTime() - 86400000

    if (lastAbsentDayMs < firstAbsentDayMs) return null

    const startIdx = Math.round((firstAbsentDayMs - vStart.getTime()) / 86400000)
    const endIdx = Math.round((lastAbsentDayMs - vStart.getTime()) / 86400000)

    if (startIdx >= n || endIdx < 0) return null

    const clampedStart = Math.max(0, startIdx)
    const clampedEnd = Math.min(n - 1, endIdx)
    if (clampedStart > clampedEnd) return null

    return { startIdx: clampedStart, endIdx: clampedEnd }
  }

  /**
   * Rebuilds the segment tree from scratch for the 10-year period.
   * Called when visaStartDate changes or during initial setup.
   */
  function rebuildSegmentTree() {
    if (!visaStartDate.value) {
      segmentTree.value = null
      coverageCount = null
      segmentTreeSize = 0
      segmentTreeVersion.value++
      return
    }

    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) {
      segmentTree.value = null
      coverageCount = null
      segmentTreeSize = 0
      segmentTreeVersion.value++
      return
    }

    // 10-year window from visa start date
    const vEnd = new Date(vStart)
    vEnd.setUTCFullYear(vEnd.getUTCFullYear() + 10)

    const n = Math.round((vEnd - vStart) / (1000 * 60 * 60 * 24))
    if (n <= 0) {
      segmentTree.value = null
      coverageCount = null
      segmentTreeSize = 0
      segmentTreeVersion.value++
      return
    }

    segmentTreeSize = n
    coverageCount = new Int32Array(n)
    const dayAbsentArray = new Uint8Array(n)

    for (const item of absences.value) {
      const range = getRecordIndexRange(item, vStart, n)
      if (!range) continue

      for (let i = range.startIdx; i <= range.endIdx; i++) {
        coverageCount[i]++
        dayAbsentArray[i] = 1
      }
    }

    const tree = new AbsenceSegmentTree(n)
    tree.build(dayAbsentArray)
    segmentTree.value = tree
    segmentTreeVersion.value++
  }

  /**
   * Incrementally updates the segment tree in O(D log N) time when a record is added.
   */
  function addRecordToSegmentTree(record) {
    if (!visaStartDate.value || !segmentTree.value || !coverageCount) {
      rebuildSegmentTree()
      return
    }

    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return

    const range = getRecordIndexRange(record, vStart, segmentTreeSize)
    if (!range) return

    for (let i = range.startIdx; i <= range.endIdx; i++) {
      coverageCount[i]++
      // If day was previously not absent (count went from 0 to 1), update segment tree leaf
      if (coverageCount[i] === 1) {
        segmentTree.value.updatePoint(i, 1)
      }
    }
    segmentTreeVersion.value++
  }

  /**
   * Incrementally updates the segment tree in O(D log N) time when a record is removed.
   */
  function removeRecordFromSegmentTree(record) {
    if (!visaStartDate.value || !segmentTree.value || !coverageCount) return

    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return

    const range = getRecordIndexRange(record, vStart, segmentTreeSize)
    if (!range) return

    for (let i = range.startIdx; i <= range.endIdx; i++) {
      coverageCount[i] = Math.max(0, coverageCount[i] - 1)
      // If day is no longer covered by any trip (count went from 1 to 0), update segment tree leaf
      if (coverageCount[i] === 0) {
        segmentTree.value.updatePoint(i, 0)
      }
    }
    segmentTreeVersion.value++
  }

  // Initialize Segment Tree and Auto Arrival Record on store setup
  syncArrivalRecord()
  rebuildSegmentTree()

  // ---------------------------------------------------------------------------
  // Persistence Watchers
  // ---------------------------------------------------------------------------

  // Sync absences to localStorage
  watch(
    absences,
    (newVal) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
    },
    { deep: true },
  )

  // Sync visa start date to localStorage and rebuild tree if changed
  watch(visaStartDate, (newVal) => {
    if (newVal) {
      localStorage.setItem(STORAGE_VISA_KEY, newVal)
    } else {
      localStorage.removeItem(STORAGE_VISA_KEY)
    }
    syncArrivalRecord()
    rebuildSegmentTree()
  })

  // Sync UK arrival date to localStorage and rebuild tree if changed
  watch(ukArrivalDate, (newVal) => {
    if (newVal) {
      localStorage.setItem(STORAGE_ARRIVAL_KEY, newVal)
    } else {
      localStorage.removeItem(STORAGE_ARRIVAL_KEY)
    }
    syncArrivalRecord()
    rebuildSegmentTree()
  })

  // Sync ILR approved date to localStorage
  watch(ilrApprovedDate, (newVal) => {
    if (newVal) {
      localStorage.setItem(STORAGE_ILR_APPROVED_KEY, newVal)
    } else {
      localStorage.removeItem(STORAGE_ILR_APPROVED_KEY)
    }
  })

  // ---------------------------------------------------------------------------
  // Getters / Computed Properties
  // ---------------------------------------------------------------------------

  /**
   * Boolean indicating whether the Visa Start Date has been set.
   */
  const isVisaDateSet = computed(() => Boolean(visaStartDate.value))

  /**
   * Boolean indicating whether the UK Arrival Date has been set.
   */
  const isArrivalDateSet = computed(() => Boolean(ukArrivalDate.value))

  /**
   * Boolean indicating whether the ILR Approved Date has been set.
   */
  const isIlrApprovedDateSet = computed(() => Boolean(ilrApprovedDate.value))

  /**
   * Computed array of absences sorted chronologically by start date (ascending).
   */
  const sortedAbsences = computed(() => {
    return sortAbsencesArray([...absences.value])
  })

  /**
   * Total number of days absent across all recorded absence entries.
   */
  const totalDaysAbsent = computed(() => {
    return absences.value.reduce((sum, item) => {
      return sum + calculateDays(item.startDate, item.endDate)
    }, 0)
  })

  /**
   * Computes the peak rolling 12-month (365-day) absence across the visa period using queryAbsentDaysInRange.
   * Scans rolling 365-day windows using the proper query function and returns { maxDays, peakStartDate, peakEndDate }.
   */
  const max12MonthAbsenceInfo = computed(() => {
    if (!visaStartDate.value) {
      return { maxDays: 0, peakStartDate: null, peakEndDate: null }
    }

    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return { maxDays: 0, peakStartDate: null, peakEndDate: null }

    let maxDays = 0
    let peakStart = vStart
    let peakEnd = new Date(vStart.getTime() + 364 * 86400000)

    // Determine the end of the search window: 5 years (1826 days) or last absence end date
    let lastAbsenceMs = vStart.getTime() + 1826 * 86400000
    for (const item of absences.value) {
      if (item.endDate) {
        const e = parseDateUTC(item.endDate)
        if (e && e.getTime() > lastAbsenceMs) {
          lastAbsenceMs = e.getTime()
        }
      }
    }

    const totalDaysToScan = Math.max(
      1826,
      Math.round((lastAbsenceMs - vStart.getTime()) / 86400000),
    )
    const limit = Math.max(0, totalDaysToScan - 364)

    for (let i = 0; i <= limit; i++) {
      const windowStart = new Date(vStart.getTime() + i * 86400000)
      const windowEnd = new Date(vStart.getTime() + (i + 364) * 86400000)
      const days = queryAbsentDaysInRange(windowStart, windowEnd)

      if (days > maxDays) {
        maxDays = days
        peakStart = windowStart
        peakEnd = windowEnd
      }
    }

    const formatDateStr = (d) => {
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    return {
      maxDays,
      peakStartDate: formatDateStr(peakStart),
      peakEndDate: formatDateStr(peakEnd),
    }
  })

  /**
   * Maximum absent days in any rolling 12-month window.
   */
  const max12MonthAbsence = computed(() => max12MonthAbsenceInfo.value.maxDays)

  /**
   * Calculates the 5-year target settlement date (YYYY-MM-DD) from visaStartDate.
   */
  const settlementTargetDate = computed(() => {
    if (!visaStartDate.value) return ''
    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return ''
    const target = new Date(vStart)
    target.setUTCFullYear(target.getUTCFullYear() + 5)
    const y = target.getUTCFullYear()
    const m = String(target.getUTCMonth() + 1).padStart(2, '0')
    const day = String(target.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })

  /**
   * Calculates the earliest date (YYYY-MM-DD) when an ILR application can be submitted.
   * Under UK Home Office rules, an ILR application can be submitted up to 28 days before completing 5 years.
   */
  const earliestIlrApplicationDate = computed(() => {
    if (!visaStartDate.value) return ''
    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return ''
    const target = new Date(vStart)
    target.setUTCFullYear(target.getUTCFullYear() + 5)
    target.setUTCDate(target.getUTCDate() - 28)
    const y = target.getUTCFullYear()
    const m = String(target.getUTCMonth() + 1).padStart(2, '0')
    const day = String(target.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })

  /**
   * Returns UI status color ('error', 'warning', 'success') based on peak rolling 12-month absence.
   */
  const ruleStatusColor = computed(() => {
    const days = max12MonthAbsence.value
    if (days > 180) return 'error'
    if (days >= 150) return 'warning'
    return 'success'
  })

  /**
   * Boolean indicating whether the 180-day rolling limit has been exceeded.
   */
  const isRuleExceeded = computed(() => max12MonthAbsence.value > 180)

  // ---------------------------------------------------------------------------
  // Section 1: ILR / Settlement (5-Year BNO Route) Getters
  // ---------------------------------------------------------------------------

  /**
   * Total absent days across the 5-year BNO visa period [visaStartDate, visaStartDate + 5 years].
   */
  const ilr5YearTotalAbsence = computed(() => {
    if (!visaStartDate.value || !settlementTargetDate.value) return 0
    return queryAbsentDaysInRange(visaStartDate.value, settlementTargetDate.value)
  })

  // ---------------------------------------------------------------------------
  // Section 2: Naturalisation / British Citizenship Getters
  // ---------------------------------------------------------------------------

  /**
   * Helper to check if a UTC Date object falls on a full absent day outside the UK.
   * Departure and return dates are partially spent in the UK and are NOT absent days.
   * Utilizes the Segment Tree (O(log N)) when available for fast lookup.
   *
   * @param {Date} dateObj
   * @returns {boolean}
   */
  function isAbsentDay(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return false

    // Fast Path: Utilize Segment Tree leaf query if available
    if (segmentTree.value && visaStartDate.value && segmentTreeSize > 0) {
      const vStart = parseDateUTC(visaStartDate.value)
      if (vStart) {
        const idx = Math.round((dateObj.getTime() - vStart.getTime()) / 86400000)
        if (idx >= 0 && idx < segmentTreeSize) {
          return segmentTree.value.query(idx, idx) === 1
        }
      }
    }

    const t = dateObj.getTime()
    for (const item of absences.value) {
      if (!item.startDate || !item.endDate) continue
      const s = parseDateUTC(item.startDate)
      const e = parseDateUTC(item.endDate)
      if (!s || !e || e <= s) continue
      const firstAbsentMs = s.getTime() + 86400000
      const lastAbsentMs = e.getTime() - 86400000
      if (t >= firstAbsentMs && t <= lastAbsentMs) {
        return true
      }
    }
    return false
  }

  /**
   * Start date of the 5-year qualifying window for naturalisation.
   * Default start date is 1 year after visaStartDate.
   * If ilrApprovedDate is defined, start date is 4 years before ilrApprovedDate (target = ilrApprovedDate + 1 year).
   * Extra condition (UK Home Office requirement): The start date of the 5-year naturalisation window
   * CANNOT be an absent day outside the UK. If the baseline start date falls on an absent day,
   * the window start date is automatically advanced to the earliest subsequent day when the
   * applicant is physically present in the UK.
   */
  const naturalizationWindowStartDate = computed(() => {
    if (!visaStartDate.value && !ilrApprovedDate.value) return ''

    let start
    if (ilrApprovedDate.value) {
      const ilrDate = parseDateUTC(ilrApprovedDate.value)
      if (!ilrDate) return ''
      start = new Date(ilrDate)
      start.setUTCFullYear(start.getUTCFullYear() - 4)
    } else {
      const vStart = parseDateUTC(visaStartDate.value)
      if (!vStart) return ''
      start = new Date(vStart)
      start.setUTCFullYear(start.getUTCFullYear() + 1)
    }

    // Ensure the qualifying window start date is NOT an absent day outside the UK
    let safetyCounter = 0
    while (isAbsentDay(start) && safetyCounter < 3650) {
      start.setUTCDate(start.getUTCDate() + 1)
      safetyCounter++
    }

    const y = start.getUTCFullYear()
    const m = String(start.getUTCMonth() + 1).padStart(2, '0')
    const day = String(start.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })

  /**
   * Target date for British Citizenship naturalisation application.
   * Exactly 5 years after the adjusted naturalizationWindowStartDate (ensuring the applicant
   * was present in the UK exactly 5 years prior to the application date).
   */
  const naturalizationTargetDate = computed(() => {
    if (!naturalizationWindowStartDate.value) return ''
    const start = parseDateUTC(naturalizationWindowStartDate.value)
    if (!start) return ''
    const target = new Date(start)
    target.setUTCFullYear(target.getUTCFullYear() + 5)
    const y = target.getUTCFullYear()
    const m = String(target.getUTCMonth() + 1).padStart(2, '0')
    const day = String(target.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })

  /**
   * Boolean indicating if the naturalisation window start date was shifted due to an absent day.
   */
  const isNaturalizationWindowShifted = computed(() => {
    if ((!visaStartDate.value && !ilrApprovedDate.value) || !naturalizationWindowStartDate.value)
      return false

    let unadjusted
    if (ilrApprovedDate.value) {
      const ilrDate = parseDateUTC(ilrApprovedDate.value)
      if (!ilrDate) return false
      unadjusted = new Date(ilrDate)
      unadjusted.setUTCFullYear(unadjusted.getUTCFullYear() - 4)
    } else {
      const vStart = parseDateUTC(visaStartDate.value)
      if (!vStart) return false
      unadjusted = new Date(vStart)
      unadjusted.setUTCFullYear(unadjusted.getUTCFullYear() + 1)
    }
    const y = unadjusted.getUTCFullYear()
    const m = String(unadjusted.getUTCMonth() + 1).padStart(2, '0')
    const day = String(unadjusted.getUTCDate()).padStart(2, '0')
    const unadjustedStr = `${y}-${m}-${day}`
    return naturalizationWindowStartDate.value !== unadjustedStr
  })

  /**
   * Total absent days in the 5 years immediately preceding naturalisation application.
   * Requirement: Must not exceed 450 days.
   */
  const naturalization5YearAbsence = computed(() => {
    if (!naturalizationWindowStartDate.value || !naturalizationTargetDate.value) return 0
    return queryAbsentDaysInRange(
      naturalizationWindowStartDate.value,
      naturalizationTargetDate.value,
    )
  })

  /**
   * Total absent days in the final 12 months before naturalisation application.
   * Requirement: Must not exceed 90 days.
   */
  const naturalizationFinal12MoAbsence = computed(() => {
    if (!naturalizationTargetDate.value) return 0
    const target = parseDateUTC(naturalizationTargetDate.value)
    if (!target) return 0
    const oneYearPrior = new Date(target)
    oneYearPrior.setUTCFullYear(oneYearPrior.getUTCFullYear() - 1)
    const y = oneYearPrior.getUTCFullYear()
    const m = String(oneYearPrior.getUTCMonth() + 1).padStart(2, '0')
    const day = String(oneYearPrior.getUTCDate()).padStart(2, '0')
    const startStr = `${y}-${m}-${day}`
    return queryAbsentDaysInRange(startStr, naturalizationTargetDate.value)
  })

  /**
   * Overall status color ('success', 'warning', 'error') for Naturalisation eligibility.
   */
  const naturalizationStatusColor = computed(() => {
    const f5 = naturalization5YearAbsence.value
    const f12 = naturalizationFinal12MoAbsence.value
    if (f5 > 450 || f12 > 90) return 'error'
    if (f5 >= 380 || f12 >= 75) return 'warning'
    return 'success'
  })

  /**
   * Boolean indicating if user is eligible for Naturalisation based on absence limits.
   */
  const isNaturalizationEligible = computed(() => {
    return naturalization5YearAbsence.value <= 450 && naturalizationFinal12MoAbsence.value <= 90
  })

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Sets or updates the BNO Visa start date.
   *
   * @param {string} dateStr - Date string in 'YYYY-MM-DD' format.
   */
  function setVisaStartDate(dateStr) {
    visaStartDate.value = dateStr || ''
    rebuildSegmentTree()
  }

  /**
   * Sets or updates the UK Arrival Date.
   *
   * @param {string} dateStr - Date string in 'YYYY-MM-DD' format.
   */
  function setUkArrivalDate(dateStr) {
    ukArrivalDate.value = dateStr || ''
  }

  /**
   * Sets or updates the ILR Approved Date.
   *
   * @param {string} dateStr - Date string in 'YYYY-MM-DD' format.
   */
  function setIlrApprovedDate(dateStr) {
    ilrApprovedDate.value = dateStr || ''
  }

  /**
   * Sets or updates key travel, visa, and settlement dates.
   *
   * @param {Object} payload
   * @param {string} payload.visaStartDate
   * @param {string} [payload.ukArrivalDate]
   * @param {string} [payload.ilrApprovedDate]
   */
  function setVisaAndArrivalDates({
    visaStartDate: vStart,
    ukArrivalDate: uArrival,
    ilrApprovedDate: iApproved,
  }) {
    visaStartDate.value = vStart || ''
    ukArrivalDate.value = uArrival || ''
    ilrApprovedDate.value = iApproved || ''
    rebuildSegmentTree()
  }

  /**
   * Helper algorithm to calculate full absent days within [qStart, qEnd]
   * by intersecting and merging trip intervals. Used as a fallback when segment tree is unavailable
   * or for query date sub-ranges falling outside segment tree array boundaries.
   *
   * @param {Date} qStart - UTC start date.
   * @param {Date} qEnd - UTC end date.
   * @returns {number} Total distinct full days absent.
   */
  function calculateIntervalAbsences(qStart, qEnd) {
    if (!qStart || !qEnd || isNaN(qStart.getTime()) || isNaN(qEnd.getTime()) || qEnd < qStart) {
      return 0
    }

    const intervals = []
    for (const item of absences.value) {
      if (!item.startDate || !item.endDate) continue
      const s = parseDateUTC(item.startDate)
      const e = parseDateUTC(item.endDate)
      if (!s || !e || e <= s) continue

      const firstAbsent = new Date(s.getTime() + 86400000)
      const lastAbsent = new Date(e.getTime() - 86400000)
      if (lastAbsent < firstAbsent) continue

      const intersectStart = firstAbsent > qStart ? firstAbsent : qStart
      const intersectEnd = lastAbsent < qEnd ? lastAbsent : qEnd

      if (intersectStart <= intersectEnd) {
        intervals.push({
          start: intersectStart.getTime(),
          end: intersectEnd.getTime(),
        })
      }
    }

    if (intervals.length === 0) return 0

    intervals.sort((a, b) => a.start - b.start)
    const merged = [intervals[0]]

    for (let i = 1; i < intervals.length; i++) {
      const current = intervals[i]
      const lastMerged = merged[merged.length - 1]

      if (current.start <= lastMerged.end + 86400000) {
        lastMerged.end = Math.max(lastMerged.end, current.end)
      } else {
        merged.push({ ...current })
      }
    }

    let totalDays = 0
    for (const range of merged) {
      const days = Math.round((range.end - range.start) / 86400000) + 1
      totalDays += Math.max(0, days)
    }

    return totalDays
  }

  /**
   * Efficiently queries the number of absent days within any arbitrary date range [startDate, endDate].
   * Utilizes the Segment Tree (O(log N)) whenever possible for lightning-fast range sum calculation.
   * Excludes departure and return days of each trip per Home Office full-day absence rules.
   *
   * @param {string|Date} startDate - Query range start date.
   * @param {string|Date} endDate - Query range end date.
   * @param {boolean} [excludeEndpoints=false] - Optional flag to trim boundary start/end days from the query range.
   * @returns {number} Total distinct full absent days spent outside the UK within the queried range.
   */
  function queryAbsentDaysInRange(startDate, endDate, excludeEndpoints = false) {
    const _v = segmentTreeVersion.value

    let qStart = parseDateUTC(startDate)
    let qEnd = parseDateUTC(endDate)

    if (!qStart || !qEnd || isNaN(qStart.getTime()) || isNaN(qEnd.getTime()) || qEnd < qStart)
      return 0

    // Optionally exclude query range endpoint dates (used for strict interior window queries)
    if (excludeEndpoints) {
      qStart = new Date(qStart.getTime() + 86400000)
      qEnd = new Date(qEnd.getTime() - 86400000)
      if (qEnd < qStart) return 0
    }

    // Fast Path: Utilize Segment Tree range sum query when available and visaStartDate is set
    if (segmentTree.value && visaStartDate.value && segmentTreeSize > 0) {
      const vStart = parseDateUTC(visaStartDate.value)
      if (vStart) {
        const qStartIdx = Math.round((qStart.getTime() - vStart.getTime()) / 86400000)
        const qEndIdx = Math.round((qEnd.getTime() - vStart.getTime()) / 86400000)

        // Case 1: Entire query range falls within segment tree coverage [0, segmentTreeSize - 1]
        if (qStartIdx >= 0 && qEndIdx < segmentTreeSize) {
          return segmentTree.value.query(qStartIdx, qEndIdx)
        }

        // Case 2: Query range overlaps segment tree coverage
        const inStart = Math.max(0, qStartIdx)
        const inEnd = Math.min(segmentTreeSize - 1, qEndIdx)

        let total = 0
        if (inStart <= inEnd) {
          total += segmentTree.value.query(inStart, inEnd)
        }

        // Add pre-segment tree range absences (before visa start date)
        if (qStartIdx < 0) {
          const endBefore = new Date(vStart.getTime() - 86400000)
          if (qStart <= endBefore) {
            total += calculateIntervalAbsences(qStart, endBefore)
          }
        }

        // Add post-segment tree range absences (after 10 years from visa start date)
        if (qEndIdx >= segmentTreeSize) {
          const startAfter = new Date(vStart.getTime() + segmentTreeSize * 86400000)
          if (startAfter <= qEnd) {
            total += calculateIntervalAbsences(startAfter, qEnd)
          }
        }

        return total
      }
    }

    // Fallback: Calculate absences using interval merging when segment tree is unavailable
    return calculateIntervalAbsences(qStart, qEnd)
  }

  /**
   * Validates whether an absence record satisfies date boundary constraints:
   * 1. Departure date must not be earlier than visa start date or UK arrival date.
   * 2. Return date must be within range segment tree can handle (no later than 10 years from visa start date).
   *
   * @param {Object} record
   * @param {string} record.startDate - Departure date (YYYY-MM-DD).
   * @param {string} record.endDate - Return date (YYYY-MM-DD).
   * @returns {{ valid: boolean, error: string }}
   */
  function validateAbsence({ startDate, endDate }) {
    if (!startDate || !endDate) {
      return { valid: false, error: 'Departure and return dates are required.' }
    }
    if (endDate < startDate) {
      return { valid: false, error: 'Return date cannot be earlier than departure date.' }
    }
    if (visaStartDate.value && startDate < visaStartDate.value) {
      return {
        valid: false,
        error: `Departure date cannot be earlier than visa start date (${visaStartDate.value}).`,
      }
    }
    if (ukArrivalDate.value && startDate < ukArrivalDate.value) {
      return {
        valid: false,
        error: `Departure date cannot be earlier than UK arrival date (${ukArrivalDate.value}).`,
      }
    }
    if (visaStartDate.value) {
      const maxReturn = getMaxSegmentTreeReturnDate(visaStartDate.value)
      if (maxReturn && endDate > maxReturn) {
        return {
          valid: false,
          error: `Return date cannot be later than 10 years from visa start date (${maxReturn}).`,
        }
      }
    }
    return { valid: true, error: '' }
  }

  /**
   * Adds a new absence entry to the store and incrementally updates the segment tree in O(D log N) time.
   *
   * @param {Object} payload - The absence details.
   * @param {string} payload.startDate - Start date string (YYYY-MM-DD).
   * @param {string} payload.endDate - End date string (YYYY-MM-DD).
   * @param {string} [payload.dest=''] - Destination or reason for the absence.
   * @returns {Object} The created absence entry object.
   */
  function addAbsence({ startDate, endDate, dest = '' }) {
    const validation = validateAbsence({ startDate, endDate })
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const newEntry = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2),
      startDate,
      endDate,
      dest,
      createdAt: new Date().toISOString(),
    }
    absences.value.push(newEntry)
    sortAbsencesArray(absences.value)

    // Incremental segment tree update (NO full rebuild)
    addRecordToSegmentTree(newEntry)

    return newEntry
  }

  /**
   * Updates an existing absence record by its ID and incrementally updates the segment tree.
   *
   * @param {string} id - The unique identifier of the absence entry to update.
   * @param {Object} updatedFields - Object containing the fields to update (e.g. startDate, endDate, dest).
   */
  function updateAbsence(id, updatedFields) {
    const index = absences.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      if (absences.value[index].isAutoArrival || id === AUTO_ARRIVAL_ID) {
        throw new Error(
          'Initial UK Entry record is automatically managed by Key Dates and cannot be manually edited.',
        )
      }

      const oldRecord = { ...absences.value[index] }
      const mergedRecord = {
        ...absences.value[index],
        ...updatedFields,
      }

      if (!mergedRecord.isAutoArrival) {
        const validation = validateAbsence(mergedRecord)
        if (!validation.valid) {
          throw new Error(validation.error)
        }
      }

      absences.value[index] = mergedRecord
      sortAbsencesArray(absences.value)

      // Incremental segment tree updates: remove old range, add new range (NO full rebuild)
      removeRecordFromSegmentTree(oldRecord)
      addRecordToSegmentTree(absences.value[index])
    }
  }

  /**
   * Removes an absence record by its unique ID and incrementally updates the segment tree.
   *
   * @param {string} id - The unique identifier of the absence entry to remove.
   */
  function removeAbsence(id) {
    const index = absences.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      if (absences.value[index].isAutoArrival || id === AUTO_ARRIVAL_ID) {
        throw new Error(
          'Initial UK Entry record is automatically managed by Key Dates and cannot be manually removed.',
        )
      }

      const targetRecord = absences.value[index]
      // Incremental segment tree update (NO full rebuild)
      removeRecordFromSegmentTree(targetRecord)

      absences.value.splice(index, 1)
    }
  }

  /**
   * Resets all absence data, key travel/visa dates, and segment tree.
   */
  function clearAbsences() {
    absences.value = []
    visaStartDate.value = ''
    ukArrivalDate.value = ''
    ilrApprovedDate.value = ''
    syncArrivalRecord()
    rebuildSegmentTree()
  }

  /**
   * Exports key travel/visa dates and user absence records to a YAML string.
   *
   * @returns {string} YAML formatted string containing visa_start_date, uk_arrival_date, ilr_approved_date, and absences.
   */
  function exportYAML() {
    const userAbsences = absences.value
      .filter((item) => !item.isAutoArrival && item.id !== 'auto_uk_arrival_record')
      .map((item) => ({
        startDate: item.startDate,
        endDate: item.endDate,
        dest: item.dest || '',
      }))

    const doc = new Document()
    doc.commentBefore = ' BNO 5+1 Absence Tracker - Data Export\n Format for all date fields: YYYY-MM-DD'

    const contentMap = doc.createNode({
      visa_start_date: visaStartDate.value || '',
      uk_arrival_date: ukArrivalDate.value || '',
      ilr_approved_date: ilrApprovedDate.value || '',
      absences: userAbsences,
    })

    if (contentMap && contentMap.items) {
      contentMap.items.forEach((pair, idx) => {
        const k = pair.key && pair.key.value !== undefined ? pair.key.value : pair.key
        if (k === 'visa_start_date') {
          pair.key.commentBefore = ' BNO Visa Start Date (YYYY-MM-DD)'
        } else if (k === 'uk_arrival_date') {
          pair.key.commentBefore = ' First UK Arrival Date under BNO Visa (YYYY-MM-DD)'
        } else if (k === 'ilr_approved_date') {
          pair.key.commentBefore = ' ILR Approved Date, if applicable (YYYY-MM-DD)'
        } else if (k === 'absences') {
          pair.key.commentBefore = ' List of UK Absences (Travel History)'
        }
        if (idx > 0) {
          pair.key.spaceBefore = true
        }
      })
    }

    doc.contents = contentMap

    return doc.toString()
  }

  /**
   * Imports absence records and visa/arrival dates from a YAML string.
   *
   * @param {string} yamlString - Raw YAML text content to import.
   * @returns {{ count: number, visaStartDate: string, ukArrivalDate: string, ilrApprovedDate: string }} Summary of imported data.
   */
  function importYAML(yamlString) {
    if (!yamlString || typeof yamlString !== 'string') {
      throw new Error('Invalid YAML file input.')
    }

    let parsed
    try {
      parsed = parse(yamlString)
    } catch (e) {
      throw new Error('Failed to parse YAML file: ' + e.message)
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed YAML content is empty or invalid.')
    }

    function normalizeYYYYMMDD(val) {
      if (!val) return ''
      if (val instanceof Date) {
        if (isNaN(val.getTime())) return ''
        const y = val.getUTCFullYear()
        const m = String(val.getUTCMonth() + 1).padStart(2, '0')
        const d = String(val.getUTCDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
      if (typeof val === 'string') {
        const cleanStr = val.split('T')[0]
        const parts = cleanStr.split('-')
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          const y = parts[0].padStart(4, '0')
          const m = String(parts[1]).padStart(2, '0')
          const d = String(parts[2]).padStart(2, '0')
          return `${y}-${m}-${d}`
        }
      }
      return String(val)
    }

    const importedVisaDate = normalizeYYYYMMDD(
      parsed.visa_start_date || parsed.visaStartDate || parsed.visa_date || parsed.visaDate || '',
    )
    const importedArrivalDate = normalizeYYYYMMDD(
      parsed.uk_arrival_date ||
        parsed.ukArrivalDate ||
        parsed.arrival_date ||
        parsed.arrivalDate ||
        '',
    )
    const importedIlrApprovedDate = normalizeYYYYMMDD(
      parsed.ilr_approved_date || parsed.ilrApprovedDate || parsed.ilr_date || parsed.ilrDate || '',
    )

    const rawAbsences = Array.isArray(parsed.absences)
      ? parsed.absences
      : Array.isArray(parsed.records)
        ? parsed.records
        : []

    const validNewEntries = []
    for (const item of rawAbsences) {
      if (!item || typeof item !== 'object') continue
      const startDate = normalizeYYYYMMDD(item.startDate || item.start_date || '')
      const endDate = normalizeYYYYMMDD(item.endDate || item.end_date || '')
      const dest = item.dest || item.destination || item.notes || ''

      if (startDate && endDate) {
        validNewEntries.push({
          id: crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).substring(2),
          startDate,
          endDate,
          dest,
          createdAt: new Date().toISOString(),
        })
      }
    }

    visaStartDate.value = importedVisaDate
    ukArrivalDate.value = importedArrivalDate
    ilrApprovedDate.value = importedIlrApprovedDate
    absences.value = validNewEntries

    sortAbsencesArray(absences.value)
    syncArrivalRecord()
    rebuildSegmentTree()

    if (
      parsed.documents ||
      parsed.addressHistory ||
      parsed.addresses ||
      parsed.lifeInUk ||
      parsed.englishTest ||
      parsed.residenceChecklist
    ) {
      const documentsStore = useDocumentsStore()
      documentsStore.importData(parsed)
    }

    return {
      count: validNewEntries.length,
      visaStartDate: importedVisaDate,
      ukArrivalDate: importedArrivalDate,
      ilrApprovedDate: importedIlrApprovedDate,
    }
  }

  return {
    absences,
    visaStartDate,
    isVisaDateSet,
    setVisaStartDate,
    ukArrivalDate,
    isArrivalDateSet,
    setUkArrivalDate,
    ilrApprovedDate,
    isIlrApprovedDateSet,
    setIlrApprovedDate,
    setVisaAndArrivalDates,
    segmentTree,
    queryAbsentDaysInRange,
    max12MonthAbsence,
    max12MonthAbsenceInfo,
    settlementTargetDate,
    earliestIlrApplicationDate,
    ruleStatusColor,
    isRuleExceeded,
    ilr5YearTotalAbsence,
    naturalizationTargetDate,
    naturalizationWindowStartDate,
    isNaturalizationWindowShifted,
    naturalization5YearAbsence,
    naturalizationFinal12MoAbsence,
    naturalizationStatusColor,
    isNaturalizationEligible,
    sortedAbsences,
    totalDaysAbsent,
    calculateDays,
    validateAbsence,
    getMaxSegmentTreeReturnDate,
    addAbsence,
    updateAbsence,
    removeAbsence,
    clearAbsences,
    exportYAML,
    importYAML,
  }
})
