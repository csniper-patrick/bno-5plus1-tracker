import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

/**
 * LocalStorage key used to persist user absence records across browser sessions.
 */
const STORAGE_KEY = 'bno_absences'

/**
 * LocalStorage key used to persist user BNO Visa Start Date across browser sessions.
 */
const STORAGE_VISA_KEY = 'bno_visa_start_date'

/**
 * Segment Tree data structure for efficient O(log N) range sum queries over a 10-year period (day-by-day).
 * Supports O(log N) point updates for incremental tree modifications when records are added/updated/removed.
 */
export class AbsenceSegmentTree {
  constructor(size) {
    this.n = size
    this.tree = new Int32Array(4 * size)
  }

  build(arr) {
    this.n = arr.length
    if (this.n === 0) return
    this._build(arr, 0, 0, this.n - 1)
  }

  _build(arr, node, start, end) {
    if (start === end) {
      this.tree[node] = arr[start]
      return
    }
    const mid = Math.floor((start + end) / 2)
    const leftNode = 2 * node + 1
    const rightNode = 2 * node + 2
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
    this._updatePoint(0, 0, this.n - 1, idx, val)
  }

  _updatePoint(node, start, end, idx, val) {
    if (start === end) {
      this.tree[node] = val
      return
    }
    const mid = Math.floor((start + end) / 2)
    const leftNode = 2 * node + 1
    const rightNode = 2 * node + 2
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
    return this._query(0, 0, this.n - 1, clampedStart, clampedEnd)
  }

  _query(node, start, end, l, r) {
    if (r < start || end < l) return 0
    if (l <= start && end <= r) return this.tree[node]
    const mid = Math.floor((start + end) / 2)
    const leftSum = this._query(2 * node + 1, start, mid, l, r)
    const rightSum = this._query(2 * node + 2, mid + 1, end, l, r)
    return leftSum + rightSum
  }
}

/**
 * Helper to safely parse a 'YYYY-MM-DD' string to UTC midnight Date.
 */
function parseDateUTC(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return null
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
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

  // Persistent Segment Tree & Coverage Tracking State
  const segmentTree = ref(null)
  const segmentTreeVersion = ref(0)
  let coverageCount = null
  let segmentTreeSize = 0

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

  // Initialize Segment Tree on store setup
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
    rebuildSegmentTree()
  })

  // ---------------------------------------------------------------------------
  // Getters / Computed Properties
  // ---------------------------------------------------------------------------

  /**
   * Boolean indicating whether the Visa Start Date has been set.
   */
  const isVisaDateSet = computed(() => Boolean(visaStartDate.value))

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
   * Computes the peak rolling 12-month (365-day) absence across the visa period using the Segment Tree.
   * Scans rolling 365-day windows using Segment Tree range queries and returns { maxDays, peakStartDate, peakEndDate }.
   */
  const max12MonthAbsenceInfo = computed(() => {
    // Track reactive version of Segment Tree for point update re-evaluation
    const _v = segmentTreeVersion.value

    if (!visaStartDate.value || !segmentTree.value || segmentTreeSize < 365) {
      return { maxDays: 0, peakStartDate: null, peakEndDate: null }
    }

    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return { maxDays: 0, peakStartDate: null, peakEndDate: null }

    let maxDays = 0
    let peakStartIdx = 0

    // Evaluate rolling 365-day windows across the 5-year visa path (or up to 10-year window size)
    const maxSearchWindow = Math.min(segmentTreeSize - 365, 1826 - 365)
    const limit = Math.max(0, maxSearchWindow >= 0 ? maxSearchWindow : segmentTreeSize - 365)

    for (let i = 0; i <= limit; i++) {
      const days = segmentTree.value.query(i, i + 364)
      if (days > maxDays) {
        maxDays = days
        peakStartIdx = i
      }
    }

    const peakStart = new Date(vStart.getTime() + peakStartIdx * 86400000)
    const peakEnd = new Date(vStart.getTime() + (peakStartIdx + 364) * 86400000)

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
   * Target date for British Citizenship naturalisation application (6 years from visaStartDate).
   */
  const naturalizationTargetDate = computed(() => {
    if (!visaStartDate.value) return ''
    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return ''
    const target = new Date(vStart)
    target.setUTCFullYear(target.getUTCFullYear() + 6)
    const y = target.getUTCFullYear()
    const m = String(target.getUTCMonth() + 1).padStart(2, '0')
    const day = String(target.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })

  /**
   * Start date of the 5-year qualifying window for naturalisation (1 year after visaStartDate).
   */
  const naturalizationWindowStartDate = computed(() => {
    if (!visaStartDate.value) return ''
    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return ''
    const start = new Date(vStart)
    start.setUTCFullYear(start.getUTCFullYear() + 1)
    const y = start.getUTCFullYear()
    const m = String(start.getUTCMonth() + 1).padStart(2, '0')
    const day = String(start.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })

  /**
   * Total absent days in the 5 years immediately preceding naturalisation application [Year 1 to Year 6].
   * Requirement: Must not exceed 450 days.
   */
  const naturalization5YearAbsence = computed(() => {
    if (!naturalizationWindowStartDate.value || !naturalizationTargetDate.value) return 0
    return queryAbsentDaysInRange(
      naturalizationWindowStartDate.value,
      naturalizationTargetDate.value
    )
  })

  /**
   * Total absent days in the final 12 months before naturalisation application [Year 5 to Year 6].
   * Requirement: Must not exceed 90 days.
   */
  const naturalizationFinal12MoAbsence = computed(() => {
    if (!settlementTargetDate.value || !naturalizationTargetDate.value) return 0
    return queryAbsentDaysInRange(
      settlementTargetDate.value,
      naturalizationTargetDate.value
    )
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
   * Efficiently queries the number of absent days in any date range within 10 years of visaStartDate
   * using the Segment Tree in O(log N) time.
   *
   * @param {string|Date} startDate - Range start date.
   * @param {string|Date} endDate - Range end date.
   * @param {boolean} [excludeEndpoints=false] - Whether to exclude start/end dates from the query.
   * @returns {number} Total absent days within the range.
   */
  function queryAbsentDaysInRange(startDate, endDate, excludeEndpoints = false) {
    const _v = segmentTreeVersion.value

    if (!visaStartDate.value || !segmentTree.value) return 0

    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return 0

    let s = typeof startDate === 'string' ? parseDateUTC(startDate) : new Date(startDate)
    let e = typeof endDate === 'string' ? parseDateUTC(endDate) : new Date(endDate)

    if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0

    if (excludeEndpoints) {
      s = new Date(s.getTime() + 86400000)
      e = new Date(e.getTime() - 86400000)
      if (e < s) return 0
    }

    const qStartIdx = Math.round((s.getTime() - vStart.getTime()) / 86400000)
    const qEndIdx = Math.round((e.getTime() - vStart.getTime()) / 86400000)

    return segmentTree.value.query(qStartIdx, qEndIdx)
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
      const oldRecord = { ...absences.value[index] }

      absences.value[index] = {
        ...absences.value[index],
        ...updatedFields,
      }
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
      const targetRecord = absences.value[index]
      // Incremental segment tree update (NO full rebuild)
      removeRecordFromSegmentTree(targetRecord)

      absences.value.splice(index, 1)
    }
  }

  /**
   * Clears all absence records from the store and resets the segment tree.
   */
  function clearAbsences() {
    absences.value = []
    rebuildSegmentTree()
  }

  return {
    absences,
    visaStartDate,
    isVisaDateSet,
    setVisaStartDate,
    segmentTree,
    queryAbsentDaysInRange,
    max12MonthAbsence,
    max12MonthAbsenceInfo,
    settlementTargetDate,
    ruleStatusColor,
    isRuleExceeded,
    ilr5YearTotalAbsence,
    naturalizationTargetDate,
    naturalizationWindowStartDate,
    naturalization5YearAbsence,
    naturalizationFinal12MoAbsence,
    naturalizationStatusColor,
    isNaturalizationEligible,
    sortedAbsences,
    totalDaysAbsent,
    calculateDays,
    addAbsence,
    updateAbsence,
    removeAbsence,
    clearAbsences,
  }
})
