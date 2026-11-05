import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

import { AbsenceSegmentTree, DEFAULT_SEGMENT_TREE_CAPACITY } from '../utils/segmentTree.js'
import {
  parseDateUTC,
  formatDateUTC,
  normalizeDate,
  getOneDayBefore,
  calculateDays,
  getMaxSegmentTreeReturnDate,
} from '../utils/date.js'
import { generateId } from '../utils/id.js'
import { exportAbsencesBackup, parseYAML } from '../services/backupService.js'
import * as dbService from '../services/dbService.js'
import * as profileService from '../services/profileService.js'

/**
 * Storage keys used to persist user data across browser sessions in IndexedDB.
 */
const STORAGE_KEY = 'bno_absences'
const STORAGE_VISA_KEY = 'bno_visa_start_date'
const STORAGE_VISA_EXPIRY_KEY = 'bno_visa_expire_date'
const STORAGE_ARRIVAL_KEY = 'bno_uk_arrival_date'
const STORAGE_ILR_APPROVED_KEY = 'bno_ilr_approved_date'

const AUTO_ARRIVAL_ID = 'auto_uk_arrival_record'

/**
 * Pinia store for managing absence records and calculating total days absent.
 * Maintains an incremental Segment Tree covering 20 years from visaStartDate for fast O(log N) range queries.
 */
export const useAbsentsStore = defineStore('absents', () => {
  // ---------------------------------------------------------------------------
  // Helper Functions
  // ---------------------------------------------------------------------------

  /**
   * Sorts absences array chronologically by start date (ascending).
   *
   * @param {Array} arr - List of absence records.
   * @returns {Array} Sorted absence array.
   */
  function sortAbsencesArray(arr) {
    if (!Array.isArray(arr)) return []
    return arr.sort((a, b) => {
      const startA = (a && a.startDate) || ''
      const startB = (b && b.startDate) || ''
      if (startA !== startB) return startA < startB ? -1 : 1
      const endA = (a && a.endDate) || ''
      const endB = (b && b.endDate) || ''
      return endA < endB ? -1 : endA > endB ? 1 : 0
    })
  }

  /**
   * Returns a Date object representing today's UTC midnight (00:00:00.000Z).
   *
   * @returns {Date}
   */
  function getTodayUTC() {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  }

  // ---------------------------------------------------------------------------
  // State Initialization
  // ---------------------------------------------------------------------------

  const isInitialized = ref(false)
  const dataImportVersion = ref(0)

  /** Primary reactive list of absence records, maintained in chronological order. */
  const absences = ref([])

  /** The start date of the user's BNO visa (YYYY-MM-DD format). */
  const visaStartDate = ref('')

  /** The optional expiry date of the user's BNO visa (YYYY-MM-DD format). */
  const visaExpiryDate = ref('')

  /** The UK arrival date of the user (YYYY-MM-DD format). */
  const ukArrivalDate = ref('')

  /** The ILR approved date of the user (YYYY-MM-DD format). */
  const ilrApprovedDate = ref('')

  /** Loads state from IndexedDB (migrating from localStorage if needed). */
  async function initStore() {
    await dbService.migrateFromLocalStorage([
      STORAGE_KEY,
      STORAGE_VISA_KEY,
      STORAGE_VISA_EXPIRY_KEY,
      STORAGE_ARRIVAL_KEY,
      STORAGE_ILR_APPROVED_KEY,
    ])

    const [loadedAbsences, loadedVisaStart, loadedVisaExpiry, loadedArrival, loadedIlrApproved] =
      await Promise.all([
        dbService.getItem(STORAGE_KEY),
        dbService.getItem(STORAGE_VISA_KEY),
        dbService.getItem(STORAGE_VISA_EXPIRY_KEY),
        dbService.getItem(STORAGE_ARRIVAL_KEY),
        dbService.getItem(STORAGE_ILR_APPROVED_KEY),
      ])

    if (Array.isArray(loadedAbsences)) {
      const sorted = [...loadedAbsences]
      sortAbsencesArray(sorted)
      absences.value = sorted
    } else {
      absences.value = []
    }
    visaStartDate.value = typeof loadedVisaStart === 'string' ? loadedVisaStart : ''
    visaExpiryDate.value = typeof loadedVisaExpiry === 'string' ? loadedVisaExpiry : ''
    ukArrivalDate.value = typeof loadedArrival === 'string' ? loadedArrival : ''
    ilrApprovedDate.value = typeof loadedIlrApproved === 'string' ? loadedIlrApproved : ''

    syncArrivalRecord()
    rebuildSegmentTree()
    dataImportVersion.value++
    isInitialized.value = true
    await dbService.setItem(STORAGE_KEY, absences.value)
  }

  // Persistent Segment Tree & Coverage Tracking State
  const segmentTree = ref(null)
  const segmentTreeVersion = ref(0)
  const visaStartMs = computed(() => {
    const parsed = parseDateUTC(visaStartDate.value)
    return parsed ? parsed.getTime() : NaN
  })
  let segmentTreeSize = 0

  // ---------------------------------------------------------------------------
  // Auto UK Arrival Absence Record Sync
  // ---------------------------------------------------------------------------

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
          stops: [
            { date: oneDayBeforeVisa, dest: 'UK Arrival' },
            { date: uArrival, dest: '' },
          ],
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
          stops: [
            { date: oneDayBeforeVisa, dest: 'UK Arrival' },
            { date: uArrival, dest: '' },
          ],
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

    if (endIdx < 0 || startIdx >= n) return null
    return {
      startIdx: Math.max(0, startIdx),
      endIdx: Math.min(n - 1, endIdx),
    }
  }

  /**
   * Rebuilds the segment tree from scratch for the power-of-2 tracking period (8,192 days).
   * Called when visaStartDate changes or during initial setup.
   */
  function rebuildSegmentTree() {
    if (!visaStartDate.value) {
      segmentTree.value = null
      segmentTreeSize = 0
      segmentTreeVersion.value++
      return
    }

    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) {
      segmentTree.value = null
      segmentTreeSize = 0
      segmentTreeVersion.value++
      return
    }

    segmentTreeSize = DEFAULT_SEGMENT_TREE_CAPACITY
    const tree = new AbsenceSegmentTree(DEFAULT_SEGMENT_TREE_CAPACITY)

    const intervals = []
    for (const item of absences.value) {
      const range = getRecordIndexRange(item, vStart, DEFAULT_SEGMENT_TREE_CAPACITY)
      if (range) intervals.push(range)
    }
    tree.build(intervals, 1)

    segmentTree.value = tree
    segmentTreeVersion.value++
  }

  /**
   * Incrementally updates the segment tree in O(D log N) time (D = trip days) when a record is added.
   */
  function addRecordToSegmentTree(record) {
    if (!visaStartDate.value || !segmentTree.value) {
      rebuildSegmentTree()
      return
    }

    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return

    const range = getRecordIndexRange(record, vStart, segmentTreeSize)
    if (!range) return

    segmentTree.value.updateRange(range.startIdx, range.endIdx, 1)
    segmentTreeVersion.value++
  }

  /**
   * Incrementally updates the segment tree in O(D log N) time (D = trip days) when a record is removed.
   */
  function removeRecordFromSegmentTree(record) {
    if (!visaStartDate.value || !segmentTree.value) return

    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return

    const range = getRecordIndexRange(record, vStart, segmentTreeSize)
    if (!range) return

    segmentTree.value.updateRange(range.startIdx, range.endIdx, -1)
    segmentTreeVersion.value++
  }

  // Initialize Segment Tree and Auto Arrival Record on store setup
  syncArrivalRecord()
  rebuildSegmentTree()

  // ---------------------------------------------------------------------------
  // Persistence Watchers
  // ---------------------------------------------------------------------------

  watch(
    absences,
    (newVal) => {
      if (!isInitialized.value) return
      dbService.setItem(STORAGE_KEY, newVal)
    },
    { deep: true },
  )

  watch(visaStartDate, (newVal) => {
    if (!isInitialized.value) return
    if (newVal) {
      dbService.setItem(STORAGE_VISA_KEY, newVal)
    } else {
      dbService.removeItem(STORAGE_VISA_KEY)
    }
    syncArrivalRecord()
    rebuildSegmentTree()
  })

  watch(visaExpiryDate, (newVal) => {
    if (!isInitialized.value) return
    if (newVal) {
      dbService.setItem(STORAGE_VISA_EXPIRY_KEY, newVal)
    } else {
      dbService.removeItem(STORAGE_VISA_EXPIRY_KEY)
    }
  })

  watch(ukArrivalDate, (newVal) => {
    if (!isInitialized.value) return
    if (newVal) {
      dbService.setItem(STORAGE_ARRIVAL_KEY, newVal)
    } else {
      dbService.removeItem(STORAGE_ARRIVAL_KEY)
    }
    syncArrivalRecord()
    rebuildSegmentTree()
  })

  watch(ilrApprovedDate, (newVal) => {
    if (!isInitialized.value) return
    if (newVal) {
      dbService.setItem(STORAGE_ILR_APPROVED_KEY, newVal)
    } else {
      dbService.removeItem(STORAGE_ILR_APPROVED_KEY)
    }
  })

  // ---------------------------------------------------------------------------
  // Getters / Computed Properties
  // ---------------------------------------------------------------------------

  const isVisaDateSet = computed(() => Boolean(visaStartDate.value))
  const isVisaExpiryDateSet = computed(() => Boolean(visaExpiryDate.value))
  const isArrivalDateSet = computed(() => Boolean(ukArrivalDate.value))
  const isIlrApprovedDateSet = computed(() => Boolean(ilrApprovedDate.value))

  /**
   * Effective visa expiry date: user-defined expiry date if set, or default 5 years from visaStartDate.
   */
  const effectiveVisaExpiryDate = computed(() => {
    if (visaExpiryDate.value) return visaExpiryDate.value
    if (!visaStartDate.value) return ''
    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return ''
    const vEnd = new Date(vStart)
    vEnd.setUTCFullYear(vEnd.getUTCFullYear() + 5)
    return formatDateUTC(vEnd)
  })

  /**
   * Checks if effective visa expiry date has passed relative to current UTC date.
   */
  const isVisaExpired = computed(() => {
    if (!effectiveVisaExpiryDate.value) return false
    const now = new Date()
    const todayStr = formatDateUTC(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
    )
    return effectiveVisaExpiryDate.value < todayStr
  })

  const sortedAbsences = computed(() => sortAbsencesArray([...absences.value]))

  /**
   * Total number of distinct full days absent across all recorded entries.
   * Utilizes the Segment Tree (O(1)) when available for fast & accurate count of unique absent days.
   */
  const totalDaysAbsent = computed(() => {
    const _v = segmentTreeVersion.value
    if (segmentTree.value && !isNaN(visaStartMs.value) && segmentTreeSize > 0) {
      // Direct O(1) query of the entire segment tree root
      return segmentTree.value.query(0, segmentTreeSize - 1)
    }
    return absences.value.reduce((sum, item) => {
      return sum + calculateDays(item.startDate, item.endDate)
    }, 0)
  })

  /**
   * Helper algorithm to calculate peak 12-month rolling absence in a 5-year window [wStart, wTarget].
   * Scans date-to-date 12-month periods using direct Segment Tree range queries with a zero-absence
   * early exit and tracks the latest >180-day violating start timestamp for fast window shifting.
   */
  function calcPeak12MoInWindow(wStart, wTarget) {
    if (!wStart || !wTarget || wTarget <= wStart) {
      return { maxDays: 0, peakStartDate: null, peakEndDate: null, lastViolatingStartMs: -1 }
    }

    const wStartMs = wStart.getTime()
    const wTargetMs = wTarget.getTime()

    const scratchEnd = new Date(wStartMs)
    scratchEnd.setUTCFullYear(scratchEnd.getUTCFullYear() + 1)
    let peakStartMs = wStartMs
    let peakEndMs = scratchEnd.getTime() > wTargetMs ? wTargetMs : scratchEnd.getTime()

    if (queryAbsentDaysInRange(wStart, wTarget) === 0) {
      return {
        maxDays: 0,
        peakStartDate: formatDateUTC(new Date(peakStartMs)),
        peakEndDate: formatDateUTC(new Date(peakEndMs)),
        lastViolatingStartMs: -1,
      }
    }

    const vStartMs = visaStartMs.value
    const tree = segmentTree.value
    const hasTree = tree !== null && !isNaN(vStartMs) && segmentTreeSize > 0

    let maxDays = 0
    let lastViolatingStartMs = -1
    let currStartMs = wStartMs
    const scratchStart = new Date(0)
    let safetyCounter = 0

    while (safetyCounter < DEFAULT_SEGMENT_TREE_CAPACITY) {
      scratchEnd.setTime(currStartMs)
      scratchEnd.setUTCFullYear(scratchEnd.getUTCFullYear() + 1)
      const currEndMs = scratchEnd.getTime()

      if (currEndMs > wTargetMs) {
        break
      }

      let days = 0
      const currStartIdx = hasTree ? Math.round((currStartMs - vStartMs) / 86400000) : -1
      const currEndIdx = hasTree ? Math.round((currEndMs - vStartMs) / 86400000) : -1

      if (hasTree && currStartIdx >= 0 && currEndIdx < segmentTreeSize) {
        days = tree.query(currStartIdx, currEndIdx)
      } else {
        scratchStart.setTime(currStartMs)
        days = queryAbsentDaysInRange(scratchStart, scratchEnd)
      }

      if (days > maxDays) {
        maxDays = days
        peakStartMs = currStartMs
        peakEndMs = currEndMs
      }
      if (days > 180) {
        lastViolatingStartMs = currStartMs
      }

      currStartMs += 86400000
      safetyCounter++
    }

    return {
      maxDays,
      peakStartDate: formatDateUTC(new Date(peakStartMs)),
      peakEndDate: formatDateUTC(new Date(peakEndMs)),
      lastViolatingStartMs,
    }
  }

  /**
   * 5-year sliding window calculation for Indefinite Leave to Remain (ILR).
   * Evaluates rolling 12-month absence limits (<= 180 days). If the condition
   * is violated in the baseline 5-year period, automatically shifts the window forward
   * to the earliest compliant 5-year period.
   */
  const ilrQualifyingPeriod = computed(() => {
    const _v = segmentTreeVersion.value
    if (!visaStartDate.value) {
      return {
        baselineWindowStartDate: '',
        baselineTargetDate: '',
        baselineEarliestAppDate: '',
        baselineMax12MonthAbsence: 0,
        windowStartDate: '',
        targetDate: '',
        earliestApplicationDate: '',
        isShifted: false,
        isLimitExceeded: false,
        max12MonthAbsence: 0,
        peakStartDate: null,
        peakEndDate: null,
        total5YearAbsence: 0,
      }
    }

    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) {
      return {
        baselineWindowStartDate: '',
        baselineTargetDate: '',
        baselineEarliestAppDate: '',
        baselineMax12MonthAbsence: 0,
        windowStartDate: '',
        targetDate: '',
        earliestApplicationDate: '',
        isShifted: false,
        isLimitExceeded: false,
        max12MonthAbsence: 0,
        peakStartDate: null,
        peakEndDate: null,
        total5YearAbsence: 0,
      }
    }

    const baselineStartStr = formatDateUTC(vStart)
    const baselineTarget = new Date(vStart)
    baselineTarget.setUTCFullYear(baselineTarget.getUTCFullYear() + 5)
    const baselineTargetStr = formatDateUTC(baselineTarget)

    const baselineAppDate = new Date(baselineTarget)
    baselineAppDate.setUTCDate(baselineAppDate.getUTCDate() - 28)
    const baselineAppDateStr = formatDateUTC(baselineAppDate)

    const trackerDeadline = new Date(vStart.getTime() + DEFAULT_SEGMENT_TREE_CAPACITY * 86400000)

    const baselinePeakInfo = calcPeak12MoInWindow(vStart, baselineTarget)

    let currentStart = new Date(vStart)
    let safetyCounter = 0

    let finalStartStr = baselineStartStr
    let finalTargetStr = baselineTargetStr
    let finalTargetMs = baselineTarget.getTime()
    let finalPeakInfo = baselinePeakInfo
    let finalTotalAbsence = 0

    if (baselinePeakInfo.maxDays <= 180) {
      finalStartStr = baselineStartStr
      finalTargetStr = baselineTargetStr
      finalTargetMs = baselineTarget.getTime()
      finalPeakInfo = baselinePeakInfo
      finalTotalAbsence = queryAbsentDaysInRange(vStart, baselineTarget)
    } else {
      const trackerDeadlineMs = trackerDeadline.getTime()
      const firstDeadlineStart = new Date(trackerDeadlineMs)
      firstDeadlineStart.setUTCFullYear(firstDeadlineStart.getUTCFullYear() - 5)
      const scratchDeadlineTarget = new Date(firstDeadlineStart)
      scratchDeadlineTarget.setUTCFullYear(scratchDeadlineTarget.getUTCFullYear() + 5)
      while (scratchDeadlineTarget.getTime() <= trackerDeadlineMs) {
        firstDeadlineStart.setUTCDate(firstDeadlineStart.getUTCDate() + 1)
        scratchDeadlineTarget.setTime(firstDeadlineStart.getTime())
        scratchDeadlineTarget.setUTCFullYear(scratchDeadlineTarget.getUTCFullYear() + 5)
      }
      const firstDeadlineStartMs = firstDeadlineStart.getTime()

      let nextStartMs =
        baselinePeakInfo.lastViolatingStartMs >= vStart.getTime()
          ? baselinePeakInfo.lastViolatingStartMs + 86400000
          : vStart.getTime() + 86400000
      if (nextStartMs > firstDeadlineStartMs) {
        nextStartMs = firstDeadlineStartMs
      }
      currentStart.setTime(nextStartMs)
      safetyCounter = Math.max(1, Math.round((nextStartMs - vStart.getTime()) / 86400000))

      const currentTarget = new Date(0)
      while (safetyCounter < DEFAULT_SEGMENT_TREE_CAPACITY) {
        const currStartMs = currentStart.getTime()
        currentTarget.setTime(currStartMs)
        currentTarget.setUTCFullYear(currentTarget.getUTCFullYear() + 5)
        const currTargetMs = currentTarget.getTime()

        const peakInfo = calcPeak12MoInWindow(currentStart, currentTarget)

        if (peakInfo.maxDays <= 180) {
          finalStartStr = formatDateUTC(currentStart)
          finalTargetStr = formatDateUTC(currentTarget)
          finalTargetMs = currTargetMs
          finalPeakInfo = peakInfo
          finalTotalAbsence = queryAbsentDaysInRange(currentStart, currentTarget)
          break
        }

        if (currTargetMs > trackerDeadlineMs) {
          finalStartStr = formatDateUTC(currentStart)
          finalTargetStr = formatDateUTC(currentTarget)
          finalTargetMs = currTargetMs
          finalPeakInfo = peakInfo
          finalTotalAbsence = queryAbsentDaysInRange(currentStart, currentTarget)
          break
        }

        let jumpMs =
          peakInfo.lastViolatingStartMs >= currStartMs
            ? peakInfo.lastViolatingStartMs + 86400000
            : currStartMs + 86400000
        if (currStartMs < firstDeadlineStartMs && jumpMs > firstDeadlineStartMs) {
          jumpMs = firstDeadlineStartMs
        }
        const stepDays = Math.max(1, Math.round((jumpMs - currStartMs) / 86400000))
        currentStart.setTime(jumpMs)
        safetyCounter += stepDays
      }
    }

    const isShifted = finalTargetStr !== baselineTargetStr
    const isLimitExceeded = finalTargetMs > trackerDeadline.getTime()

    const appDate = new Date(finalTargetMs)
    appDate.setUTCDate(appDate.getUTCDate() - 28)
    const earliestAppDateStr = formatDateUTC(appDate)

    return {
      baselineWindowStartDate: baselineStartStr,
      baselineTargetDate: baselineTargetStr,
      baselineEarliestAppDate: baselineAppDateStr,
      baselineMax12MonthAbsence: baselinePeakInfo.maxDays,
      windowStartDate: finalStartStr,
      targetDate: finalTargetStr,
      earliestApplicationDate: earliestAppDateStr,
      isShifted,
      isLimitExceeded,
      max12MonthAbsence: finalPeakInfo.maxDays,
      peakStartDate: finalPeakInfo.peakStartDate,
      peakEndDate: finalPeakInfo.peakEndDate,
      total5YearAbsence: finalTotalAbsence,
    }
  })

  const max12MonthAbsenceInfo = computed(() => ({
    maxDays: ilrQualifyingPeriod.value.max12MonthAbsence,
    peakStartDate: ilrQualifyingPeriod.value.peakStartDate,
    peakEndDate: ilrQualifyingPeriod.value.peakEndDate,
  }))

  const max12MonthAbsence = computed(() => ilrQualifyingPeriod.value.max12MonthAbsence)
  const settlementTargetDate = computed(() => ilrQualifyingPeriod.value.targetDate)
  const earliestIlrApplicationDate = computed(
    () => ilrQualifyingPeriod.value.earliestApplicationDate,
  )
  const isIlrWindowShifted = computed(() => ilrQualifyingPeriod.value.isShifted)
  const ilr5YearTotalAbsence = computed(() => ilrQualifyingPeriod.value.total5YearAbsence)

  const ruleStatusColor = computed(() => {
    if (ilrQualifyingPeriod.value.isLimitExceeded) return 'error'
    if (isIlrWindowShifted.value) return 'warning'
    const days = max12MonthAbsence.value
    if (days > 180) return 'error'
    if (days >= 150) return 'warning'
    return 'success'
  })

  const isRuleExceeded = computed(() => {
    return (
      ilrQualifyingPeriod.value.baselineMax12MonthAbsence > 180 || max12MonthAbsence.value > 180
    )
  })

  /**
   * Checks if current effective visa expiry date is earlier than the required ILR settlement target date.
   */
  const isVisaExtensionNeeded = computed(() => {
    if (!visaStartDate.value || !settlementTargetDate.value) return false
    const effExpiry = effectiveVisaExpiryDate.value
    if (!effExpiry) return false
    return effExpiry < settlementTargetDate.value
  })

  // ---------------------------------------------------------------------------
  // Section 2: Naturalisation / British Citizenship Getters
  // ---------------------------------------------------------------------------

  /** Checks if a UTC Date object falls on a full absent day outside the UK. */
  function isAbsentDay(dateObj) {
    const _v = segmentTreeVersion.value
    if (!dateObj || isNaN(dateObj.getTime())) return false

    const vStartMs = visaStartMs.value
    if (segmentTree.value && !isNaN(vStartMs) && segmentTreeSize > 0) {
      const idx = Math.round((dateObj.getTime() - vStartMs) / 86400000)
      if (idx >= 0 && idx < segmentTreeSize) {
        return segmentTree.value.queryPoint(idx) === 1
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
   * Comprehensive validation and calculation of the 5-year qualifying period for British Citizenship.
   * Inherits baseline window start from shifted ILR target date if ilrApprovedDate is not explicitly set.
   * Utilizes Segment Tree range queries during day-by-day shifting evaluation.
   */
  const naturalizationQualifyingPeriod = computed(() => {
    const _v = segmentTreeVersion.value
    if (!visaStartDate.value && !ilrApprovedDate.value) {
      return {
        baselineTargetDate: '',
        baselineWindowStartDate: '',
        windowStartDate: '',
        targetDate: '',
        isShifted: false,
        isLimitExceeded: false,
        fiveYearAbsence: 0,
        final12MoAbsence: 0,
        baseline5YearAbsence: 0,
        baselineFinal12MoAbsence: 0,
        isAbsentOnBaselineStart: false,
        trackerDeadlineDate: '',
      }
    }

    const emptyResult = {
      baselineTargetDate: '',
      baselineWindowStartDate: '',
      windowStartDate: '',
      targetDate: '',
      isShifted: false,
      isLimitExceeded: false,
      fiveYearAbsence: 0,
      final12MoAbsence: 0,
      baseline5YearAbsence: 0,
      baselineFinal12MoAbsence: 0,
      isAbsentOnBaselineStart: false,
      trackerDeadlineDate: '',
    }

    let baselineStart
    if (ilrApprovedDate.value) {
      const ilrDate = parseDateUTC(ilrApprovedDate.value)
      if (!ilrDate) return emptyResult
      baselineStart = new Date(ilrDate)
      baselineStart.setUTCFullYear(baselineStart.getUTCFullYear() - 4)
    } else {
      const ilrTargetStr = ilrQualifyingPeriod.value?.targetDate
      if (!ilrTargetStr) return emptyResult
      const ilrTarget = parseDateUTC(ilrTargetStr)
      if (!ilrTarget) return emptyResult
      baselineStart = new Date(ilrTarget)
      baselineStart.setUTCFullYear(baselineStart.getUTCFullYear() - 4)
    }

    let baselineTarget = new Date(baselineStart)
    baselineTarget.setUTCFullYear(baselineTarget.getUTCFullYear() + 5)

    const todayUTC = getTodayUTC()

    if (baselineTarget < todayUTC) {
      baselineStart = new Date(todayUTC)
      baselineStart.setUTCFullYear(baselineStart.getUTCFullYear() - 5)
      baselineTarget = new Date(baselineStart)
      baselineTarget.setUTCFullYear(baselineTarget.getUTCFullYear() + 5)
      while (baselineTarget < todayUTC) {
        baselineStart.setUTCDate(baselineStart.getUTCDate() + 1)
        baselineTarget = new Date(baselineStart)
        baselineTarget.setUTCFullYear(baselineTarget.getUTCFullYear() + 5)
      }
    }

    const baselineStartStr = formatDateUTC(baselineStart)
    const baselineTargetStr = formatDateUTC(baselineTarget)

    let trackerDeadline = null
    if (!isNaN(visaStartMs.value)) {
      trackerDeadline = new Date(visaStartMs.value + DEFAULT_SEGMENT_TREE_CAPACITY * 86400000)
    } else if (ilrApprovedDate.value) {
      const ilrDate = parseDateUTC(ilrApprovedDate.value)
      if (ilrDate) {
        trackerDeadline = new Date(
          ilrDate.getTime() + (DEFAULT_SEGMENT_TREE_CAPACITY - 5 * 365) * 86400000,
        )
      }
    }
    const trackerDeadlineStr = trackerDeadline ? formatDateUTC(trackerDeadline) : ''
    const trackerDeadlineMs = trackerDeadline ? trackerDeadline.getTime() : NaN

    let safetyCounter = 0

    let fiveYearAbsence = 0
    let final12MoAbsence = 0
    let baseline5YearAbs = 0
    let baselineFinal12MoAbs = 0
    let isAbsentOnBaselineStart = false

    const vStartMs = visaStartMs.value
    const tree = segmentTree.value
    const hasTree = tree !== null && !isNaN(vStartMs) && segmentTreeSize > 0

    const baselineStartMs = baselineStart.getTime()
    const baselineTargetMs = baselineTarget.getTime()
    let currStartMs = baselineStartMs
    let finalStartMs = baselineStartMs
    let finalTargetMs = baselineTargetMs

    const scratchStart = new Date(0)
    const scratchTarget = new Date(0)
    const scratchF12Start = new Date(0)

    while (safetyCounter < DEFAULT_SEGMENT_TREE_CAPACITY) {
      scratchTarget.setTime(currStartMs)
      scratchTarget.setUTCFullYear(scratchTarget.getUTCFullYear() + 5)
      const targetMs = scratchTarget.getTime()

      scratchF12Start.setTime(targetMs)
      scratchF12Start.setUTCFullYear(scratchF12Start.getUTCFullYear() - 1)
      const f12StartMs = scratchF12Start.getTime()

      let isAbsentOnStart = false
      let fiveYearAbs = 0
      let final12MoAbs = 0

      const startIdx = hasTree ? Math.round((currStartMs - vStartMs) / 86400000) : -1
      const targetIdx = hasTree ? Math.round((targetMs - vStartMs) / 86400000) : -1

      if (hasTree && startIdx >= 0 && targetIdx < segmentTreeSize) {
        const f12StartIdx = Math.round((f12StartMs - vStartMs) / 86400000)
        isAbsentOnStart = tree.queryPoint(startIdx) === 1
        fiveYearAbs = tree.query(startIdx, targetIdx)
        final12MoAbs = tree.query(f12StartIdx, targetIdx)
      } else {
        scratchStart.setTime(currStartMs)
        isAbsentOnStart = isAbsentDay(scratchStart)
        fiveYearAbs = queryAbsentDaysInRange(scratchStart, scratchTarget)
        final12MoAbs = queryAbsentDaysInRange(scratchF12Start, scratchTarget)
      }

      if (safetyCounter === 0) {
        baseline5YearAbs = fiveYearAbs
        baselineFinal12MoAbs = final12MoAbs
        isAbsentOnBaselineStart = isAbsentOnStart
        fiveYearAbsence = fiveYearAbs
        final12MoAbsence = final12MoAbs
      } else if (isAbsentOnStart || fiveYearAbs > 450 || final12MoAbs > 90) {
        if (fiveYearAbs > 450 && fiveYearAbs > baseline5YearAbs) {
          baseline5YearAbs = fiveYearAbs
        }
        if (final12MoAbs > 90 && final12MoAbs > baselineFinal12MoAbs) {
          baselineFinal12MoAbs = final12MoAbs
        }
      }

      if (!isAbsentOnStart && fiveYearAbs <= 450 && final12MoAbs <= 90) {
        finalStartMs = currStartMs
        finalTargetMs = targetMs
        fiveYearAbsence = fiveYearAbs
        final12MoAbsence = final12MoAbs
        break
      }

      if (!isNaN(trackerDeadlineMs) && targetMs > trackerDeadlineMs) {
        finalStartMs = currStartMs
        finalTargetMs = targetMs
        fiveYearAbsence = fiveYearAbs
        final12MoAbsence = final12MoAbs
        break
      }

      currStartMs += 86400000
      safetyCounter++
    }

    const finalStartStr =
      finalStartMs === baselineStartMs ? baselineStartStr : formatDateUTC(new Date(finalStartMs))
    const finalTargetStr =
      finalTargetMs === baselineTargetMs
        ? baselineTargetStr
        : formatDateUTC(new Date(finalTargetMs))
    const isShifted = finalTargetStr !== baselineTargetStr
    const isLimitExceeded = !isNaN(trackerDeadlineMs) && finalTargetMs > trackerDeadlineMs

    return {
      baselineTargetDate: baselineTargetStr,
      baselineWindowStartDate: baselineStartStr,
      windowStartDate: finalStartStr,
      targetDate: finalTargetStr,
      isShifted,
      isLimitExceeded,
      fiveYearAbsence,
      final12MoAbsence,
      baseline5YearAbsence: baseline5YearAbs,
      baselineFinal12MoAbsence: baselineFinal12MoAbs,
      isAbsentOnBaselineStart,
      trackerDeadlineDate: trackerDeadlineStr,
    }
  })

  const naturalizationWindowStartDate = computed(
    () => naturalizationQualifyingPeriod.value?.windowStartDate || '',
  )
  const naturalizationTargetDate = computed(
    () => naturalizationQualifyingPeriod.value?.targetDate || '',
  )
  const naturalizationCalculatedEarliestDate = computed(
    () => naturalizationQualifyingPeriod.value?.baselineTargetDate || '',
  )
  const isNaturalizationWindowShifted = computed(
    () => naturalizationQualifyingPeriod.value?.isShifted || false,
  )
  const isNaturalizationLimitExceeded = computed(
    () => naturalizationQualifyingPeriod.value?.isLimitExceeded || false,
  )
  const naturalization5YearAbsence = computed(
    () => naturalizationQualifyingPeriod.value?.fiveYearAbsence ?? 0,
  )
  const naturalizationFinal12MoAbsence = computed(
    () => naturalizationQualifyingPeriod.value?.final12MoAbsence ?? 0,
  )
  const isAbsentOnBaselineStart = computed(
    () => naturalizationQualifyingPeriod.value?.isAbsentOnBaselineStart || false,
  )
  const naturalizationBaselineWindowStartDate = computed(
    () => naturalizationQualifyingPeriod.value?.baselineWindowStartDate || '',
  )
  const naturalizationBaselineTargetDate = computed(
    () => naturalizationQualifyingPeriod.value?.baselineTargetDate || '',
  )

  const isNaturalization5YearLimitViolated = computed(() => {
    const baseline5 = naturalizationQualifyingPeriod.value?.baseline5YearAbsence ?? 0
    return baseline5 > 450
  })

  const isNaturalizationFinal12MoLimitViolated = computed(() => {
    const baseline12 = naturalizationQualifyingPeriod.value?.baselineFinal12MoAbsence ?? 0
    return baseline12 > 90
  })

  const naturalization5YearRuleColor = computed(() => {
    if (naturalization5YearAbsence.value > 450) return 'error'
    if (isNaturalizationWindowShifted.value) {
      return isNaturalization5YearLimitViolated.value ? 'warning' : 'success'
    }
    if (naturalization5YearAbsence.value >= 380) return 'warning'
    return 'success'
  })

  const naturalizationFinal12MoRuleColor = computed(() => {
    if (naturalizationFinal12MoAbsence.value > 90) return 'error'
    if (isNaturalizationWindowShifted.value) {
      return isNaturalizationFinal12MoLimitViolated.value ? 'warning' : 'success'
    }
    if (naturalizationFinal12MoAbsence.value >= 75) return 'warning'
    return 'success'
  })

  const isNaturalizationDateToday = computed(() => {
    if (!naturalizationTargetDate.value) return false
    const todayStr = formatDateUTC(getTodayUTC())
    return naturalizationTargetDate.value === todayStr
  })

  const isEarliestIlrDateTodayOrPast = computed(() => {
    if (!earliestIlrApplicationDate.value) return false
    const todayStr = formatDateUTC(getTodayUTC())
    return earliestIlrApplicationDate.value <= todayStr
  })

  const naturalizationStatusColor = computed(() => {
    if (isNaturalizationLimitExceeded.value) return 'error'
    if (isNaturalizationWindowShifted.value) return 'warning'
    const f5 = naturalization5YearAbsence.value
    const f12 = naturalizationFinal12MoAbsence.value
    if (f5 >= 380 || f12 >= 75) return 'warning'
    return 'success'
  })

  const isNaturalizationEligible = computed(() => !isNaturalizationLimitExceeded.value)

  // ---------------------------------------------------------------------------
  // Actions & Helper Algorithms
  // ---------------------------------------------------------------------------

  function setVisaStartDate(dateStr) {
    visaStartDate.value = dateStr || ''
    rebuildSegmentTree()
    dataImportVersion.value++
  }

  function setVisaExpiryDate(dateStr) {
    visaExpiryDate.value = dateStr || ''
  }

  function setUkArrivalDate(dateStr) {
    ukArrivalDate.value = dateStr || ''
  }

  function setIlrApprovedDate(dateStr) {
    ilrApprovedDate.value = dateStr || ''
  }

  function setVisaAndArrivalDates({
    visaStartDate: vStart,
    visaExpiryDate: vExpiry,
    ukArrivalDate: uArrival,
    ilrApprovedDate: iApproved,
  }) {
    visaStartDate.value = vStart || ''
    visaExpiryDate.value = vExpiry || ''
    ukArrivalDate.value = uArrival || ''
    ilrApprovedDate.value = iApproved || ''
    rebuildSegmentTree()
    dataImportVersion.value++
  }

  /**
   * Helper algorithm to calculate full absent days within [qStart, qEnd] by merging intervals.
   */
  function calculateIntervalAbsences(qStart, qEnd) {
    if (!qStart || !qEnd) return 0
    const qStartMs = qStart.getTime()
    const qEndMs = qEnd.getTime()
    if (isNaN(qStartMs) || isNaN(qEndMs) || qEndMs < qStartMs) {
      return 0
    }

    const intervals = []
    for (const item of absences.value) {
      if (!item.startDate || !item.endDate) continue
      const s = parseDateUTC(item.startDate)
      const e = parseDateUTC(item.endDate)
      if (!s || !e) continue
      const sMs = s.getTime()
      const eMs = e.getTime()
      if (eMs <= sMs) continue

      const firstAbsentMs = sMs + 86400000
      const lastAbsentMs = eMs - 86400000
      if (lastAbsentMs < firstAbsentMs) continue

      const intersectStart = firstAbsentMs > qStartMs ? firstAbsentMs : qStartMs
      const intersectEnd = lastAbsentMs < qEndMs ? lastAbsentMs : qEndMs

      if (intersectStart <= intersectEnd) {
        intervals.push({
          start: intersectStart,
          end: intersectEnd,
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
        if (current.end > lastMerged.end) lastMerged.end = current.end
      } else {
        merged.push(current)
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
   * Queries absent days within any date range [startDate, endDate].
   * Utilizes Segment Tree (O(log N)) when available.
   */
  function queryAbsentDaysInRange(startDate, endDate, excludeEndpoints = false) {
    const _v = segmentTreeVersion.value

    let qStart = parseDateUTC(startDate)
    let qEnd = parseDateUTC(endDate)

    if (!qStart || !qEnd || isNaN(qStart.getTime()) || isNaN(qEnd.getTime()) || qEnd < qStart)
      return 0

    if (excludeEndpoints) {
      qStart = new Date(qStart.getTime() + 86400000)
      qEnd = new Date(qEnd.getTime() - 86400000)
      if (qEnd < qStart) return 0
    }

    const vStartMs = visaStartMs.value
    if (segmentTree.value && !isNaN(vStartMs) && segmentTreeSize > 0) {
      const qStartIdx = Math.round((qStart.getTime() - vStartMs) / 86400000)
      const qEndIdx = Math.round((qEnd.getTime() - vStartMs) / 86400000)

      if (qStartIdx >= 0 && qEndIdx < segmentTreeSize) {
        if (qStartIdx === qEndIdx) return segmentTree.value.queryPoint(qStartIdx)
        return segmentTree.value.query(qStartIdx, qEndIdx)
      }

      const inStart = Math.max(0, qStartIdx)
      const inEnd = Math.min(segmentTreeSize - 1, qEndIdx)

      let total = 0
      if (inStart <= inEnd) {
        total += segmentTree.value.query(inStart, inEnd)
      }

      if (qStartIdx < 0) {
        const endBefore = new Date(vStartMs - 86400000)
        if (qStart <= endBefore) {
          total += calculateIntervalAbsences(qStart, endBefore)
        }
      }

      if (qEndIdx >= segmentTreeSize) {
        const startAfter = new Date(vStartMs + segmentTreeSize * 86400000)
        if (startAfter <= qEnd) {
          total += calculateIntervalAbsences(startAfter, qEnd)
        }
      }

      return total
    }

    return calculateIntervalAbsences(qStart, qEnd)
  }

  /**
   * Validates whether an absence record satisfies date boundary constraints.
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
          error: `Return date cannot be later than 20 years from visa start date (${maxReturn}).`,
        }
      }
    }
    return { valid: true, error: '' }
  }

  function addAbsence({ id = '', startDate, endDate, dest = '', stops = null }) {
    const validation = validateAbsence({ startDate, endDate })
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const defaultStops = [
      { date: startDate, dest },
      { date: endDate, dest: '' },
    ]

    const newEntry = {
      id: id && String(id).trim() ? String(id).trim() : generateId(),
      startDate,
      endDate,
      dest,
      stops: Array.isArray(stops) && stops.length >= 2 ? stops : defaultStops,
      createdAt: new Date().toISOString(),
    }
    absences.value.push(newEntry)
    sortAbsencesArray(absences.value)
    addRecordToSegmentTree(newEntry)

    return newEntry
  }

  function updateAbsence(id, updatedFields) {
    if (!id || typeof id !== 'string') {
      throw new Error('[useAbsentsStore] updateAbsence called without valid record ID.')
    }

    const index = absences.value.findIndex((item) => item.id === id)
    if (index === -1) {
      throw new Error(`[useAbsentsStore] Absence record with ID "${id}" not found for update.`)
    }

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
    removeRecordFromSegmentTree(oldRecord)
    addRecordToSegmentTree(mergedRecord)

    profileService.syncUpdatedAbsenceAcrossProfiles(mergedRecord).catch((err) => {
      console.error('Failed to sync updated absence across profiles:', err)
    })

    return mergedRecord
  }

  function removeAbsence(id) {
    const index = absences.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      if (absences.value[index].isAutoArrival || id === AUTO_ARRIVAL_ID) {
        throw new Error(
          'Initial UK Entry record is automatically managed by Key Dates and cannot be manually removed.',
        )
      }

      const targetRecord = absences.value[index]
      removeRecordFromSegmentTree(targetRecord)
      absences.value.splice(index, 1)
    }
  }

  async function clearAbsences() {
    absences.value = []
    visaStartDate.value = ''
    visaExpiryDate.value = ''
    ukArrivalDate.value = ''
    ilrApprovedDate.value = ''
    await Promise.all([
      dbService.removeItem(STORAGE_KEY),
      dbService.removeItem(STORAGE_VISA_KEY),
      dbService.removeItem(STORAGE_VISA_EXPIRY_KEY),
      dbService.removeItem(STORAGE_ARRIVAL_KEY),
      dbService.removeItem(STORAGE_ILR_APPROVED_KEY),
    ])
    syncArrivalRecord()
    rebuildSegmentTree()
  }

  /** Exports key dates and absence records to a YAML string. */
  function exportYAML(profileNameOrStore = '') {
    return exportAbsencesBackup(
      {
        absences: absences.value,
        visaStartDate: visaStartDate.value,
        visaExpiryDate: visaExpiryDate.value,
        ukArrivalDate: ukArrivalDate.value,
        ilrApprovedDate: ilrApprovedDate.value,
      },
      profileNameOrStore,
    )
  }

  /** Imports absence records and visa/arrival dates from a YAML string or pre-parsed object. */
  function importYAML(input) {
    const parsed = typeof input === 'string' ? parseYAML(input) : input

    const importedVisaDate = normalizeDate(
      parsed.visa_start_date || parsed.visaStartDate || parsed.visa_date || parsed.visaDate || '',
    )
    const importedVisaExpiryDate = normalizeDate(
      parsed.visa_expiry_date ||
        parsed.visaExpiryDate ||
        parsed.visa_expire_date ||
        parsed.visaExpireDate ||
        '',
    )
    const importedArrivalDate = normalizeDate(
      parsed.uk_arrival_date ||
        parsed.ukArrivalDate ||
        parsed.arrival_date ||
        parsed.arrivalDate ||
        '',
    )
    const importedIlrApprovedDate = normalizeDate(
      parsed.ilr_approved_date || parsed.ilrApprovedDate || parsed.ilr_date || parsed.ilrDate || '',
    )

    const rawAbsences = Array.isArray(parsed.absences)
      ? parsed.absences
      : Array.isArray(parsed.records)
        ? parsed.records
        : []

    const validNewEntries = []
    const seenIds = new Set()
    for (const item of rawAbsences) {
      if (!item || typeof item !== 'object') continue
      let startDate = normalizeDate(item.startDate || item.start_date || '')
      let endDate = normalizeDate(item.endDate || item.end_date || '')
      let dest = item.dest || item.destination || item.notes || ''
      let stops = []

      if (Array.isArray(item.stops) && item.stops.length >= 2) {
        stops = item.stops.map((s) => ({
          date: normalizeDate(s.date || s.startDate || s.start_date || ''),
          dest: s.dest || s.destination || '',
        }))
        if (stops[0].date && !startDate) startDate = stops[0].date
        if (stops[stops.length - 1].date && !endDate) endDate = stops[stops.length - 1].date
      }

      if (!stops || stops.length < 2) {
        stops = [
          { date: startDate, dest: dest },
          { date: endDate, dest: '' },
        ]
      }

      if (!dest && stops.length > 0) {
        dest = stops
          .map((s) => s.dest)
          .filter(Boolean)
          .join(' ➔ ')
      }

      if (startDate && endDate) {
        let entryId =
          item.id !== undefined && item.id !== null && String(item.id).trim()
            ? String(item.id).trim()
            : generateId()
        if (seenIds.has(entryId) || entryId === AUTO_ARRIVAL_ID) {
          entryId = generateId()
        }
        seenIds.add(entryId)

        validNewEntries.push({
          id: entryId,
          startDate,
          endDate,
          dest,
          stops,
          createdAt: item.createdAt || new Date().toISOString(),
        })
      }
    }

    visaStartDate.value = importedVisaDate
    visaExpiryDate.value = importedVisaExpiryDate
    ukArrivalDate.value = importedArrivalDate
    ilrApprovedDate.value = importedIlrApprovedDate
    absences.value = validNewEntries

    sortAbsencesArray(absences.value)
    syncArrivalRecord()
    rebuildSegmentTree()
    dataImportVersion.value++

    return {
      count: validNewEntries.length,
      visaStartDate: importedVisaDate,
      visaExpiryDate: importedVisaExpiryDate,
      ukArrivalDate: importedArrivalDate,
      ilrApprovedDate: importedIlrApprovedDate,
    }
  }

  return {
    isInitialized,
    initStore,
    dataImportVersion,
    absences,
    visaStartDate,
    isVisaDateSet,
    setVisaStartDate,
    visaExpiryDate,
    isVisaExpiryDateSet,
    effectiveVisaExpiryDate,
    isVisaExpired,
    setVisaExpiryDate,
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
    ilrQualifyingPeriod,
    settlementTargetDate,
    earliestIlrApplicationDate,
    isIlrWindowShifted,
    isVisaExtensionNeeded,
    ruleStatusColor,
    isRuleExceeded,
    ilr5YearTotalAbsence,
    naturalizationQualifyingPeriod,
    naturalizationTargetDate,
    naturalizationWindowStartDate,
    naturalizationCalculatedEarliestDate,
    naturalizationBaselineWindowStartDate,
    naturalizationBaselineTargetDate,
    isNaturalizationWindowShifted,
    isNaturalizationLimitExceeded,
    naturalization5YearAbsence,
    naturalizationFinal12MoAbsence,
    isAbsentOnBaselineStart,
    naturalizationStatusColor,
    isNaturalization5YearLimitViolated,
    isNaturalizationFinal12MoLimitViolated,
    naturalization5YearRuleColor,
    naturalizationFinal12MoRuleColor,
    isNaturalizationDateToday,
    isEarliestIlrDateTodayOrPast,
    isNaturalizationEligible,
    sortedAbsences,
    totalDaysAbsent,
    isAbsentDay,
    queryAbsentDaysInRange,
    calculateDays,
    validateAbsence,
    getMaxSegmentTreeReturnDate,
    addAbsence,
    updateAbsence,
    removeAbsence,
    clearAbsences,
    exportYAML,
    importYAML,
    syncUpdatedAbsenceAcrossProfiles: profileService.syncUpdatedAbsenceAcrossProfiles,
  }
})
