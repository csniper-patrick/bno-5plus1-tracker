import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useDocumentsStore } from './documents.js'
import { AbsenceSegmentTree } from '../utils/segmentTree.js'
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

// Re-export utilities for backwards compatibility
export { AbsenceSegmentTree, calculateDays, getMaxSegmentTreeReturnDate }

/**
 * LocalStorage keys used to persist user data across browser sessions.
 */
const STORAGE_KEY = 'bno_absences'
const STORAGE_VISA_KEY = 'bno_visa_start_date'
const STORAGE_ARRIVAL_KEY = 'bno_uk_arrival_date'
const STORAGE_ILR_APPROVED_KEY = 'bno_ilr_approved_date'

const AUTO_ARRIVAL_ID = 'auto_uk_arrival_record'

/**
 * Pinia store for managing absence records and calculating total days absent.
 * Maintains an incremental Segment Tree covering 10 years from visaStartDate for fast O(log N) range queries.
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
    return arr.sort((a, b) => {
      const startDiff = (a.startDate || '').localeCompare(b.startDate || '')
      if (startDiff !== 0) return startDiff
      return (a.endDate || '').localeCompare(b.endDate || '')
    })
  }

  // ---------------------------------------------------------------------------
  // State Initialization
  // ---------------------------------------------------------------------------

  const storedData = localStorage.getItem(STORAGE_KEY)
  const initialAbsences = storedData ? JSON.parse(storedData) : []
  sortAbsencesArray(initialAbsences)

  /** Primary reactive list of absence records, maintained in chronological order. */
  const absences = ref(initialAbsences)

  /** The start date of the user's BNO visa (YYYY-MM-DD format). */
  const visaStartDate = ref(localStorage.getItem(STORAGE_VISA_KEY) || '')

  /** The UK arrival date of the user (YYYY-MM-DD format). */
  const ukArrivalDate = ref(localStorage.getItem(STORAGE_ARRIVAL_KEY) || '')

  /** The ILR approved date of the user (YYYY-MM-DD format). */
  const ilrApprovedDate = ref(localStorage.getItem(STORAGE_ILR_APPROVED_KEY) || '')

  // Persistent Segment Tree & Coverage Tracking State
  const segmentTree = ref(null)
  const segmentTreeVersion = ref(0)
  let coverageCount = null
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

    if (endIdx < 0 || startIdx >= n) return null
    return {
      startIdx: Math.max(0, startIdx),
      endIdx: Math.min(n - 1, endIdx),
    }
  }

  /**
   * Rebuilds the segment tree from scratch for the 10-year period.
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

    // 10-year window from visa start date
    const vEnd = new Date(vStart)
    vEnd.setUTCFullYear(vEnd.getUTCFullYear() + 10)

    const n = Math.round((vEnd.getTime() - vStart.getTime()) / 86400000)
    if (n <= 0) {
      segmentTree.value = null
      segmentTreeSize = 0
      segmentTreeVersion.value++
      return
    }

    segmentTreeSize = n
    const tree = new AbsenceSegmentTree(n)

    const intervals = []
    for (const item of absences.value) {
      const range = getRecordIndexRange(item, vStart, n)
      if (range) intervals.push(range)
    }
    tree.build(intervals, 1)

    segmentTree.value = tree
    segmentTreeVersion.value++
  }

  /**
   * Incrementally updates the segment tree in O(log N) time when a record is added.
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
   * Incrementally updates the segment tree in O(log N) time when a record is removed.
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
    },
    { deep: true },
  )

  watch(visaStartDate, (newVal) => {
    if (newVal) {
      localStorage.setItem(STORAGE_VISA_KEY, newVal)
    } else {
      localStorage.removeItem(STORAGE_VISA_KEY)
    }
    syncArrivalRecord()
    rebuildSegmentTree()
  })

  watch(ukArrivalDate, (newVal) => {
    if (newVal) {
      localStorage.setItem(STORAGE_ARRIVAL_KEY, newVal)
    } else {
      localStorage.removeItem(STORAGE_ARRIVAL_KEY)
    }
    syncArrivalRecord()
    rebuildSegmentTree()
  })

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

  const isVisaDateSet = computed(() => Boolean(visaStartDate.value))
  const isArrivalDateSet = computed(() => Boolean(ukArrivalDate.value))
  const isIlrApprovedDateSet = computed(() => Boolean(ilrApprovedDate.value))

  const sortedAbsences = computed(() => sortAbsencesArray([...absences.value]))

  /**
   * Total number of distinct full days absent across all recorded entries.
   * Utilizes the Segment Tree (O(1)) when available for fast & accurate count of unique absent days.
   */
  const totalDaysAbsent = computed(() => {
    if (segmentTree.value && visaStartDate.value && segmentTreeSize > 0) {
      const vStart = parseDateUTC(visaStartDate.value)
      if (vStart) {
        // Direct O(1) query of the entire segment tree root
        return segmentTree.value.query(0, segmentTreeSize - 1)
      }
    }
    return absences.value.reduce((sum, item) => {
      return sum + calculateDays(item.startDate, item.endDate)
    }, 0)
  })

  /**
   * Computes the peak rolling 12-month (365-day) absence across the 5-year ILR qualifying period.
   * Uses O(log N) Segment Tree range sum queries per rolling window for maximum calculation speed.
   */
  const max12MonthAbsenceInfo = computed(() => {
    if (!visaStartDate.value || !settlementTargetDate.value) {
      return { maxDays: 0, peakStartDate: null, peakEndDate: null }
    }

    const vStart = parseDateUTC(visaStartDate.value)
    const targetDate = parseDateUTC(settlementTargetDate.value)
    if (!vStart || !targetDate || targetDate <= vStart) {
      return { maxDays: 0, peakStartDate: null, peakEndDate: null }
    }

    let maxDays = 0
    let peakStart = vStart
    let peakEnd = new Date(vStart.getTime() + 364 * 86400000)

    const totalQualifyingDays = Math.round((targetDate.getTime() - vStart.getTime()) / 86400000)
    const limit = Math.max(0, totalQualifyingDays - 364)

    const hasTree = segmentTree.value && segmentTreeSize > 0

    let currentWindowDays = 0
    if (hasTree) {
      const endIdx = Math.min(segmentTreeSize - 1, 364)
      currentWindowDays = segmentTree.value.query(0, endIdx)
    }

    for (let i = 0; i <= limit; i++) {
      let days = 0

      // Fast Path: Direct Segment Tree O(1) sliding window update using queryPoint
      if (hasTree && i < segmentTreeSize) {
        if (i === 0) {
          days = currentWindowDays
        } else {
          // O(1) sliding window update: subtract day exiting window (i - 1), add day entering window (i + 364)
          currentWindowDays += segmentTree.value.queryPoint(i + 364) - segmentTree.value.queryPoint(i - 1)
          days = currentWindowDays
        }
      } else {
        const windowStart = new Date(vStart.getTime() + i * 86400000)
        const windowEnd = new Date(vStart.getTime() + (i + 364) * 86400000)
        const qStart = windowStart < vStart ? vStart : windowStart
        const qEnd = windowEnd > targetDate ? targetDate : windowEnd
        days = queryAbsentDaysInRange(qStart, qEnd)
      }

      if (days > maxDays) {
        maxDays = days
        peakStart = new Date(vStart.getTime() + i * 86400000)
        peakEnd = new Date(vStart.getTime() + (i + 364) * 86400000)
      }
    }

    return {
      maxDays,
      peakStartDate: formatDateUTC(peakStart),
      peakEndDate: formatDateUTC(peakEnd),
    }
  })

  const max12MonthAbsence = computed(() => max12MonthAbsenceInfo.value.maxDays)

  /** Calculates the 5-year target settlement date (YYYY-MM-DD) from visaStartDate. */
  const settlementTargetDate = computed(() => {
    if (!visaStartDate.value) return ''
    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return ''
    const target = new Date(vStart)
    target.setUTCFullYear(target.getUTCFullYear() + 5)
    return formatDateUTC(target)
  })

  /** Calculates earliest ILR application date (28 days prior to 5 years). */
  const earliestIlrApplicationDate = computed(() => {
    if (!visaStartDate.value) return ''
    const vStart = parseDateUTC(visaStartDate.value)
    if (!vStart) return ''
    const target = new Date(vStart)
    target.setUTCFullYear(target.getUTCFullYear() + 5)
    target.setUTCDate(target.getUTCDate() - 28)
    return formatDateUTC(target)
  })

  const ruleStatusColor = computed(() => {
    const days = max12MonthAbsence.value
    if (days > 180) return 'error'
    if (days >= 150) return 'warning'
    return 'success'
  })

  const isRuleExceeded = computed(() => max12MonthAbsence.value > 180)

  const ilr5YearTotalAbsence = computed(() => {
    if (!visaStartDate.value || !settlementTargetDate.value) return 0
    return queryAbsentDaysInRange(visaStartDate.value, settlementTargetDate.value)
  })

  // ---------------------------------------------------------------------------
  // Section 2: Naturalisation / British Citizenship Getters
  // ---------------------------------------------------------------------------

  /** Checks if a UTC Date object falls on a full absent day outside the UK. */
  function isAbsentDay(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return false

    if (segmentTree.value && visaStartDate.value && segmentTreeSize > 0) {
      const vStart = parseDateUTC(visaStartDate.value)
      if (vStart) {
        const idx = Math.round((dateObj.getTime() - vStart.getTime()) / 86400000)
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
   * Utilizes Segment Tree range queries during day-by-day shifting evaluation.
   */
  const naturalizationQualifyingPeriod = computed(() => {
    if (!visaStartDate.value && !ilrApprovedDate.value) {
      return {
        baselineTargetDate: '',
        baselineWindowStartDate: '',
        windowStartDate: '',
        targetDate: '',
        isShifted: false,
        is10YearExceeded: false,
        fiveYearAbsence: 0,
        final12MoAbsence: 0,
        tenYearDeadlineDate: '',
        initialViolations: [],
      }
    }

    let baselineStart
    if (ilrApprovedDate.value) {
      const ilrDate = parseDateUTC(ilrApprovedDate.value)
      if (!ilrDate) return null
      baselineStart = new Date(ilrDate)
      baselineStart.setUTCFullYear(baselineStart.getUTCFullYear() - 4)
    } else {
      const vStart = parseDateUTC(visaStartDate.value)
      if (!vStart) return null
      baselineStart = new Date(vStart)
      baselineStart.setUTCFullYear(baselineStart.getUTCFullYear() + 1)
    }

    const baselineStartStr = formatDateUTC(baselineStart)
    const baselineTarget = new Date(baselineStart)
    baselineTarget.setUTCFullYear(baselineTarget.getUTCFullYear() + 5)
    const baselineTargetStr = formatDateUTC(baselineTarget)

    let tenYearDeadline = null
    if (visaStartDate.value) {
      const vStart = parseDateUTC(visaStartDate.value)
      if (vStart) {
        tenYearDeadline = new Date(vStart)
        tenYearDeadline.setUTCFullYear(tenYearDeadline.getUTCFullYear() + 10)
      }
    } else if (ilrApprovedDate.value) {
      const ilrDate = parseDateUTC(ilrApprovedDate.value)
      if (ilrDate) {
        tenYearDeadline = new Date(ilrDate)
        tenYearDeadline.setUTCFullYear(tenYearDeadline.getUTCFullYear() + 5)
      }
    }
    const tenYearDeadlineStr = tenYearDeadline ? formatDateUTC(tenYearDeadline) : ''

    let currentStart = new Date(baselineStart)
    let safetyCounter = 0
    let foundValid = false

    let finalStartStr = baselineStartStr
    let finalTargetStr = baselineTargetStr
    let fiveYearAbs = 0
    let final12MoAbs = 0
    const initialViolations = []

    const hasTree = segmentTree.value && visaStartDate.value && segmentTreeSize > 0
    const vStart = hasTree ? parseDateUTC(visaStartDate.value) : null

    let currentF5 = 0
    let currentF12 = 0
    let prevStartIdx = -1
    let prevTargetIdx = -1
    let prevF12StartIdx = -1

    while (safetyCounter < 3650) {
      const targetDate = new Date(currentStart)
      targetDate.setUTCFullYear(targetDate.getUTCFullYear() + 5)

      const final12MoStartDate = new Date(targetDate)
      final12MoStartDate.setUTCFullYear(final12MoStartDate.getUTCFullYear() - 1)

      let isAbsentOnStart = false
      let f5 = 0
      let f12 = 0

      if (hasTree && vStart) {
        const startIdx = Math.round((currentStart.getTime() - vStart.getTime()) / 86400000)
        const targetIdx = Math.round((targetDate.getTime() - vStart.getTime()) / 86400000)
        const f12StartIdx = Math.round((final12MoStartDate.getTime() - vStart.getTime()) / 86400000)

        if (startIdx >= 0 && targetIdx < segmentTreeSize) {
          isAbsentOnStart = segmentTree.value.queryPoint(startIdx) === 1

          if (safetyCounter === 0) {
            f5 = segmentTree.value.query(startIdx, targetIdx)
            f12 = segmentTree.value.query(f12StartIdx, targetIdx)
            currentF5 = f5
            currentF12 = f12
          } else {
            // O(1) sliding window update using queryPoint
            currentF5 += segmentTree.value.queryPoint(targetIdx) - segmentTree.value.queryPoint(prevStartIdx)
            if (targetIdx !== prevTargetIdx + 1) {
              currentF5 += segmentTree.value.query(prevTargetIdx + 1, targetIdx)
            }
            f5 = currentF5

            currentF12 += segmentTree.value.queryPoint(targetIdx) - segmentTree.value.queryPoint(prevF12StartIdx)
            if (f12StartIdx !== prevF12StartIdx + 1) {
              currentF12 -= segmentTree.value.query(prevF12StartIdx, f12StartIdx - 1)
            }
            f12 = currentF12
          }

          prevStartIdx = startIdx
          prevTargetIdx = targetIdx
          prevF12StartIdx = f12StartIdx
        } else {
          isAbsentOnStart = isAbsentDay(currentStart)
          f5 = queryAbsentDaysInRange(currentStart, targetDate)
          f12 = queryAbsentDaysInRange(final12MoStartDate, targetDate)
        }
      } else {
        isAbsentOnStart = isAbsentDay(currentStart)
        f5 = queryAbsentDaysInRange(currentStart, targetDate)
        f12 = queryAbsentDaysInRange(final12MoStartDate, targetDate)
      }

      if (safetyCounter === 0) {
        if (isAbsentOnStart)
          initialViolations.push('Physical presence requirement on window start date')
        if (f5 > 450) initialViolations.push('5-year absence limit (> 450 days)')
        if (f12 > 90) initialViolations.push('Final 12-month absence limit (> 90 days)')
      }

      if (!isAbsentOnStart && f5 <= 450 && f12 <= 90) {
        foundValid = true
        finalStartStr = formatDateUTC(currentStart)
        finalTargetStr = formatDateUTC(targetDate)
        fiveYearAbs = f5
        final12MoAbs = f12
        break
      }

      if (tenYearDeadline && targetDate > tenYearDeadline) {
        finalStartStr = formatDateUTC(currentStart)
        finalTargetStr = formatDateUTC(targetDate)
        fiveYearAbs = f5
        final12MoAbs = f12
        break
      }

      currentStart.setUTCDate(currentStart.getUTCDate() + 1)
      safetyCounter++
    }

    const isShifted = finalTargetStr !== baselineTargetStr
    let is10YearExceeded = false
    if (tenYearDeadline && finalTargetStr) {
      const finalTargetDateObj = parseDateUTC(finalTargetStr)
      if (finalTargetDateObj && finalTargetDateObj > tenYearDeadline) {
        is10YearExceeded = true
      }
    }

    return {
      baselineTargetDate: baselineTargetStr,
      baselineWindowStartDate: baselineStartStr,
      windowStartDate: finalStartStr,
      targetDate: finalTargetStr,
      isShifted,
      is10YearExceeded,
      fiveYearAbsence: fiveYearAbs,
      final12MoAbsence: final12MoAbs,
      tenYearDeadlineDate: tenYearDeadlineStr,
      initialViolations,
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
  const isNaturalization10YearExceeded = computed(
    () => naturalizationQualifyingPeriod.value?.is10YearExceeded || false,
  )
  const naturalization5YearAbsence = computed(
    () => naturalizationQualifyingPeriod.value?.fiveYearAbsence || 0,
  )
  const naturalizationFinal12MoAbsence = computed(
    () => naturalizationQualifyingPeriod.value?.final12MoAbsence || 0,
  )

  const naturalizationStatusColor = computed(() => {
    if (isNaturalization10YearExceeded.value) return 'error'
    if (isNaturalizationWindowShifted.value) return 'warning'
    const f5 = naturalization5YearAbsence.value
    const f12 = naturalizationFinal12MoAbsence.value
    if (f5 >= 380 || f12 >= 75) return 'warning'
    return 'success'
  })

  const isNaturalizationEligible = computed(() => !isNaturalization10YearExceeded.value)

  // ---------------------------------------------------------------------------
  // Actions & Helper Algorithms
  // ---------------------------------------------------------------------------

  function setVisaStartDate(dateStr) {
    visaStartDate.value = dateStr || ''
    rebuildSegmentTree()
  }

  function setUkArrivalDate(dateStr) {
    ukArrivalDate.value = dateStr || ''
  }

  function setIlrApprovedDate(dateStr) {
    ilrApprovedDate.value = dateStr || ''
  }

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
   * Helper algorithm to calculate full absent days within [qStart, qEnd] by merging intervals.
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

    if (segmentTree.value && visaStartDate.value && segmentTreeSize > 0) {
      const vStart = parseDateUTC(visaStartDate.value)
      if (vStart) {
        const qStartIdx = Math.round((qStart.getTime() - vStart.getTime()) / 86400000)
        const qEndIdx = Math.round((qEnd.getTime() - vStart.getTime()) / 86400000)

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
          const endBefore = new Date(vStart.getTime() - 86400000)
          if (qStart <= endBefore) {
            total += calculateIntervalAbsences(qStart, endBefore)
          }
        }

        if (qEndIdx >= segmentTreeSize) {
          const startAfter = new Date(vStart.getTime() + segmentTreeSize * 86400000)
          if (startAfter <= qEnd) {
            total += calculateIntervalAbsences(startAfter, qEnd)
          }
        }

        return total
      }
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
          error: `Return date cannot be later than 10 years from visa start date (${maxReturn}).`,
        }
      }
    }
    return { valid: true, error: '' }
  }

  function addAbsence({ startDate, endDate, dest = '' }) {
    const validation = validateAbsence({ startDate, endDate })
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const newEntry = {
      id: generateId(),
      startDate,
      endDate,
      dest,
      createdAt: new Date().toISOString(),
    }
    absences.value.push(newEntry)
    sortAbsencesArray(absences.value)
    addRecordToSegmentTree(newEntry)

    return newEntry
  }

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
      removeRecordFromSegmentTree(oldRecord)
      addRecordToSegmentTree(absences.value[index])
    }
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

  function clearAbsences() {
    absences.value = []
    visaStartDate.value = ''
    ukArrivalDate.value = ''
    ilrApprovedDate.value = ''
    syncArrivalRecord()
    rebuildSegmentTree()
  }

  /** Exports key dates and absence records to a YAML string. */
  function exportYAML() {
    return exportAbsencesBackup({
      absences: absences.value,
      visaStartDate: visaStartDate.value,
      ukArrivalDate: ukArrivalDate.value,
      ilrApprovedDate: ilrApprovedDate.value,
    })
  }

  /** Imports absence records and visa/arrival dates from a YAML string. */
  function importYAML(yamlString) {
    const parsed = parseYAML(yamlString)

    const importedVisaDate = normalizeDate(
      parsed.visa_start_date || parsed.visaStartDate || parsed.visa_date || parsed.visaDate || '',
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
    for (const item of rawAbsences) {
      if (!item || typeof item !== 'object') continue
      const startDate = normalizeDate(item.startDate || item.start_date || '')
      const endDate = normalizeDate(item.endDate || item.end_date || '')
      const dest = item.dest || item.destination || item.notes || ''

      if (startDate && endDate) {
        validNewEntries.push({
          id: generateId(),
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
    naturalizationQualifyingPeriod,
    naturalizationTargetDate,
    naturalizationWindowStartDate,
    naturalizationCalculatedEarliestDate,
    isNaturalizationWindowShifted,
    isNaturalization10YearExceeded,
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
