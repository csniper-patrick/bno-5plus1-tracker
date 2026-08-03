import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setActivePinia, createPinia } from 'pinia'
import {
  parseDateUTC,
  formatDateUTC,
  normalizeDate,
  getOneDayBefore,
  calculateDays,
  getMaxSegmentTreeReturnDate,
  formatDisplayDate,
} from '../src/utils/date.js'
import { AbsenceSegmentTree } from '../src/utils/segmentTree.js'
import { generateId } from '../src/utils/id.js'
import { exportAbsencesBackup, exportFullBackup, parseYAML } from '../src/services/backupService.js'
import { useAbsentsStore } from '../src/stores/absents.js'

describe('Date Utilities', () => {
  it('should parse YYYY-MM-DD correctly in UTC', () => {
    const d = parseDateUTC('2024-01-15')
    assert.notStrictEqual(d, null)
    assert.strictEqual(d.getUTCFullYear(), 2024)
    assert.strictEqual(d.getUTCMonth(), 0)
    assert.strictEqual(d.getUTCDate(), 15)
  })

  it('should format Date objects to YYYY-MM-DD', () => {
    const d = new Date(Date.UTC(2024, 5, 20))
    assert.strictEqual(formatDateUTC(d), '2024-06-20')
  })

  it('should normalize various date inputs', () => {
    assert.strictEqual(normalizeDate('2024-03-05T12:00:00Z'), '2024-03-05')
    assert.strictEqual(normalizeDate(new Date(Date.UTC(2025, 0, 1))), '2025-01-01')
    assert.strictEqual(normalizeDate(null), '')
  })

  it('should get 1 day before a given YYYY-MM-DD date', () => {
    assert.strictEqual(getOneDayBefore('2024-01-01'), '2023-12-31')
  })

  it('should calculate full days absent (excluding departure & arrival days)', () => {
    // 2024-01-10 to 2024-01-15: departure 10th, return 15th -> full days spent abroad are 11, 12, 13, 14 (4 days)
    assert.strictEqual(calculateDays('2024-01-10', '2024-01-15'), 4)
    assert.strictEqual(calculateDays('2024-01-10', '2024-01-11'), 0)
    assert.strictEqual(calculateDays('2024-01-10', '2024-01-10'), 0)
  })

  it('should compute 10-year max segment tree return date', () => {
    assert.strictEqual(getMaxSegmentTreeReturnDate('2022-04-15'), '2032-04-15')
  })

  it('should format display date string', () => {
    assert.strictEqual(formatDisplayDate('2024-01-15'), '15 Jan 2024')
  })
})

describe('AbsenceSegmentTree', () => {
  it('should correctly build from an array of intervals and a target val', () => {
    const intervals = [
      { startIdx: 1, endIdx: 2 },
      [4, 4],
      { start: 6, end: 6 },
    ]
    const tree = new AbsenceSegmentTree(7)
    tree.build(intervals, 1)

    assert.strictEqual(tree.query(0, 6), 4)
    assert.strictEqual(tree.query(1, 2), 2)
    assert.strictEqual(tree.query(3, 3), 0)
    assert.strictEqual(tree.query(4, 6), 2)
  })

  it('should correctly build and query range sums from 1D array fallback', () => {
    const arr = new Uint8Array([0, 1, 1, 0, 1, 0, 1]) // 7 days
    const tree = new AbsenceSegmentTree(7)
    tree.build(arr)

    assert.strictEqual(tree.query(0, 6), 4)
    assert.strictEqual(tree.query(1, 2), 2)
    assert.strictEqual(tree.query(3, 3), 0)
    assert.strictEqual(tree.query(4, 6), 2)
  })

  it('should support point updates via updateRange', () => {
    const arr = new Uint8Array([0, 0, 0, 0, 0])
    const tree = new AbsenceSegmentTree(5)
    tree.build(arr)

    assert.strictEqual(tree.query(0, 4), 0)

    tree.updateRange(2, 2, 1)
    assert.strictEqual(tree.query(0, 4), 1)
    assert.strictEqual(tree.query(1, 3), 1)

    tree.updateRange(2, 2, -1)
    assert.strictEqual(tree.query(0, 4), 0)
  })

  it('should store pre-calculated leafMap node indices', () => {
    const arr = new Uint8Array([0, 1, 1, 0, 1, 0, 1]) // 7 days
    const tree = new AbsenceSegmentTree(7)
    tree.build(arr)

    assert.ok(tree.leafMap[0] > 0)
    assert.ok(tree.leafMap[6] > 0)
    assert.strictEqual(tree.leafMap[0], 8) // leaf 0 at node 8
    assert.strictEqual(tree.leafMap[6], 7) // leaf 6 at node 7
    assert.strictEqual(tree._getLeafNode(7), -1) // targetIdx out of bounds
    assert.strictEqual(tree._getLeafNode(-1), -1) // negative index
  })

  it('should support O(1) point queries via queryPoint', () => {
    const arr = new Uint8Array([0, 1, 1, 0, 1, 0, 1]) // 7 days
    const tree = new AbsenceSegmentTree(7)
    tree.build(arr)

    assert.strictEqual(tree.queryPoint(0), 0)
    assert.strictEqual(tree.queryPoint(1), 1)
    assert.strictEqual(tree.queryPoint(2), 1)
    assert.strictEqual(tree.queryPoint(3), 0)
    assert.strictEqual(tree.queryPoint(4), 1)
    assert.strictEqual(tree.queryPoint(5), 0)
    assert.strictEqual(tree.queryPoint(-1), 0)
    assert.strictEqual(tree.queryPoint(7), 0)
  })

  it('should retrieve the whole input array using queryPoint', () => {
    const originalArr = new Uint8Array([0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1])
    const tree = new AbsenceSegmentTree(originalArr.length)
    tree.build(originalArr)

    const retrievedArr = new Uint8Array(originalArr.length)
    for (let i = 0; i < originalArr.length; i++) {
      retrievedArr[i] = tree.queryPoint(i)
    }

    assert.deepStrictEqual(retrievedArr, originalArr)
  })

  it('should initialize to zero and support range-by-range updates with overlapping intervals', () => {
    const tree = new AbsenceSegmentTree(10)
    assert.strictEqual(tree.query(0, 9), 0)

    // Add interval [1, 3]
    tree.updateRange(1, 3, 1)
    assert.strictEqual(tree.query(0, 9), 3)
    assert.strictEqual(tree.queryPoint(1), 1)
    assert.strictEqual(tree.queryPoint(3), 1)
    assert.strictEqual(tree.queryPoint(0), 0)
    assert.strictEqual(tree.queryPoint(4), 0)

    // Add overlapping interval [2, 5]
    tree.updateRange(2, 5, 1)
    assert.strictEqual(tree.query(0, 9), 5) // days 1, 2, 3, 4, 5 covered

    // Remove interval [1, 3]
    tree.updateRange(1, 3, -1)
    assert.strictEqual(tree.query(0, 9), 4) // days 2, 3, 4, 5 covered
    assert.strictEqual(tree.queryPoint(1), 0)
    assert.strictEqual(tree.queryPoint(2), 1)

    // Remove interval [2, 5]
    tree.updateRange(2, 5, -1)
    assert.strictEqual(tree.query(0, 9), 0)
  })
})

describe('ID Utility', () => {
  it('should generate valid string IDs with prefix', () => {
    const id1 = generateId('addr')
    assert.ok(id1.startsWith('addr_'))
    const id2 = generateId()
    assert.ok(id2.length > 0)
  })
})

describe('Backup Service', () => {
  it('should export and parse YAML backup data correctly', () => {
    const fakeAbsentsStore = {
      absences: [
        { id: '1', startDate: '2023-05-10', endDate: '2023-05-20', dest: 'Japan' },
        { id: 'auto_uk_arrival_record', isAutoArrival: true, startDate: '2022-01-01', endDate: '2022-01-10' },
      ],
      visaStartDate: '2022-01-01',
      ukArrivalDate: '2022-01-10',
      ilrApprovedDate: '',
    }

    const yamlStr = exportAbsencesBackup(fakeAbsentsStore)
    assert.ok(yamlStr.includes('2022-01-01'))
    assert.ok(yamlStr.includes('Japan'))
    assert.ok(!yamlStr.includes('auto_uk_arrival_record'))

    const parsed = parseYAML(yamlStr)
    assert.strictEqual(parsed.visa_start_date, '2022-01-01')
    assert.strictEqual(parsed.absences.length, 1)
    assert.strictEqual(parsed.absences[0].dest, 'Japan')
  })
})

describe('Absents Store Reactivity', () => {
  if (typeof globalThis.localStorage === 'undefined') {
    const storage = new Map()
    globalThis.localStorage = {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
      clear: () => storage.clear(),
    }
  }

  it('should update ILR and Naturalisation computed properties when absence records change', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useAbsentsStore()

    store.setVisaStartDate('2020-01-01')
    store.setUkArrivalDate('2020-01-01')

    assert.strictEqual(store.max12MonthAbsence, 0)
    assert.strictEqual(store.isRuleExceeded, false)
    assert.strictEqual(store.naturalization5YearAbsence, 0)
    assert.strictEqual(store.totalDaysAbsent, 0)

    // Add absence record with 190 days absent (2021-01-01 to 2021-07-11)
    store.addAbsence({
      startDate: '2021-01-01',
      endDate: '2021-07-11',
      dest: 'Long Vacation',
    })

    // Baseline peak was 190 days; window delays so peak within the delayed 5-year qualifying period becomes 180 days
    assert.strictEqual(store.totalDaysAbsent, 190)
    assert.strictEqual(store.ilrQualifyingPeriod.baselineMax12MonthAbsence, 190)
    assert.strictEqual(store.max12MonthAbsence, 180)
    assert.strictEqual(store.isRuleExceeded, true)
    assert.strictEqual(store.ruleStatusColor, 'warning')

    // Naturalisation 5-year window shifts with ILR target date
    assert.strictEqual(store.naturalization5YearAbsence, 0)

    // Remove the absence record
    const record = store.absences.find((a) => !a.isAutoArrival)
    assert.ok(record)
    store.removeAbsence(record.id)

    // Should revert back to 0 days
    assert.strictEqual(store.totalDaysAbsent, 0)
    assert.strictEqual(store.max12MonthAbsence, 0)
    assert.strictEqual(store.isRuleExceeded, false)
    assert.strictEqual(store.naturalization5YearAbsence, 0)

    // Add a new trip (150 days)
    const newRecord = store.addAbsence({
      startDate: '2021-01-01',
      endDate: '2021-06-01',
      dest: 'Trip 1',
    })
    assert.strictEqual(store.totalDaysAbsent, 150)
    assert.strictEqual(store.max12MonthAbsence, 150)
    assert.strictEqual(store.isRuleExceeded, false)

    // Update the absence record to extend trip (200 days)
    store.updateAbsence(newRecord.id, {
      startDate: '2021-01-01',
      endDate: '2021-07-21',
      dest: 'Extended Trip',
    })
    assert.strictEqual(store.totalDaysAbsent, 200)
    assert.strictEqual(store.ilrQualifyingPeriod.baselineMax12MonthAbsence, 200)
    assert.strictEqual(store.max12MonthAbsence, 180)
    assert.strictEqual(store.isRuleExceeded, true)

    // Clear absences
    store.clearAbsences()
    assert.strictEqual(store.totalDaysAbsent, 0)
    assert.strictEqual(store.max12MonthAbsence, 0)

    // Import YAML
    const yamlData = `
visa_start_date: '2020-01-01'
visa_expiry_date: '2022-07-01'
uk_arrival_date: '2020-01-01'
absences:
  - startDate: '2021-03-01'
    endDate: '2021-09-17'
    dest: 'Summer Away'
`
    store.importYAML(yamlData)
    assert.strictEqual(store.visaExpiryDate, '2022-07-01')
    assert.strictEqual(store.totalDaysAbsent, 199)
    assert.strictEqual(store.isRuleExceeded, true)
    assert.strictEqual(store.isVisaExtensionNeeded, true)
  })

  it('should support default vs custom visa expiry dates and visa extension warnings', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useAbsentsStore()

    store.setVisaStartDate('2020-01-01')
    // Default visa expiry should be 5 years after visa start (2025-01-01)
    assert.strictEqual(store.effectiveVisaExpiryDate, '2025-01-01')
    assert.strictEqual(store.isVisaExpiryDateSet, false)
    assert.strictEqual(store.isVisaExtensionNeeded, false)

    // Set 30-month visa expiry date (2.5 years)
    store.setVisaExpiryDate('2022-07-01')
    assert.strictEqual(store.effectiveVisaExpiryDate, '2022-07-01')
    assert.strictEqual(store.isVisaExpiryDateSet, true)
    assert.strictEqual(store.isVisaExtensionNeeded, true)

    // Clear visa expiry date -> reverts to default 5 years
    store.setVisaExpiryDate('')
    assert.strictEqual(store.effectiveVisaExpiryDate, '2025-01-01')
    assert.strictEqual(store.isVisaExtensionNeeded, false)
  })

  it('should shift ILR qualifying period and chain Naturalisation when rolling 180-day rule is violated', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useAbsentsStore()

    store.setVisaStartDate('2020-01-01')
    store.setUkArrivalDate('2020-01-01')

    // Baseline window: 2020-01-01 to 2025-01-01
    assert.strictEqual(store.settlementTargetDate, '2025-01-01')
    assert.strictEqual(store.isIlrWindowShifted, false)

    // Add absence trip of 190 days (2021-01-01 to 2021-07-11)
    store.addAbsence({
      startDate: '2021-01-01',
      endDate: '2021-07-11',
      dest: 'Over 180 Days Abroad',
    })

    // ILR window should shift to earliest compliant 5-year window
    assert.strictEqual(store.isIlrWindowShifted, true)
    assert.strictEqual(store.ruleStatusColor, 'warning')
    assert.ok(store.settlementTargetDate > '2025-01-01')

    // Naturalisation baseline target should be 1 year after the shifted ILR target date
    const natPeriod = store.naturalizationQualifyingPeriod
    assert.ok(natPeriod)
    assert.strictEqual(natPeriod.baselineTargetDate, store.naturalizationQualifyingPeriod.targetDate)
    assert.ok(natPeriod.targetDate > '2026-01-01')
  })

  it('should accurately calculate multi-trip rolling 12-month absences and trigger window delay when limit is exceeded', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useAbsentsStore()

    store.setVisaStartDate('2022-01-01')
    store.setUkArrivalDate('2022-01-01')

    // Add 3 separate trips in 2022 total 180 days (60 days each)
    store.addAbsence({ startDate: '2022-02-01', endDate: '2022-04-03', dest: 'Trip A' }) // 60 days
    store.addAbsence({ startDate: '2022-05-01', endDate: '2022-07-01', dest: 'Trip B' }) // 60 days
    store.addAbsence({ startDate: '2022-08-01', endDate: '2022-10-01', dest: 'Trip C' }) // 60 days

    assert.strictEqual(store.max12MonthAbsence, 180)
    assert.strictEqual(store.isRuleExceeded, false)
    assert.strictEqual(store.isIlrWindowShifted, false)

    // Add 4th trip adding 1 more day (181 days total in 12 months)
    const trip4 = store.addAbsence({ startDate: '2022-11-01', endDate: '2022-11-03', dest: 'Trip D' }) // 1 day
    assert.strictEqual(store.ilrQualifyingPeriod.baselineMax12MonthAbsence, 181)
    assert.strictEqual(store.isRuleExceeded, true)
    assert.strictEqual(store.isIlrWindowShifted, true)

    // Remove trip 4 -> should return to baseline unshifted window
    store.removeAbsence(trip4.id)
    assert.strictEqual(store.max12MonthAbsence, 180)
    assert.strictEqual(store.isRuleExceeded, false)
    assert.strictEqual(store.isIlrWindowShifted, false)
  })

  it('should verify physical presence and 450-day / 90-day rules for Naturalisation', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useAbsentsStore()

    store.setVisaStartDate('2020-01-01')
    store.setUkArrivalDate('2020-01-01')

    // Baseline Naturalisation Target: 2026-01-01 (window: 2021-01-01 to 2026-01-01)
    assert.strictEqual(store.naturalizationTargetDate, '2026-01-01')

    // Add a trip where applicant is abroad on naturalisation start date (2021-01-01)
    store.addAbsence({ startDate: '2020-12-25', endDate: '2021-01-05', dest: 'New Year Abroad' })

    // Window must shift forward because of start date physical presence requirement
    assert.strictEqual(store.isNaturalizationWindowShifted, true)
    assert.ok(store.naturalizationWindowStartDate > '2021-01-01')

    // Set explicit ILR approved date
    store.setIlrApprovedDate('2025-06-01')
    // Naturalisation window start should now be 4 years after ILR approved date (2021-06-01 to 2026-06-01)
    assert.strictEqual(store.naturalizationWindowStartDate, '2021-06-01')
    assert.strictEqual(store.naturalizationTargetDate, '2026-06-01')
  })

  it('should test queryAbsentDaysInRange and isAbsentDay Segment Tree queries', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useAbsentsStore()

    store.setVisaStartDate('2020-01-01')
    store.addAbsence({ startDate: '2020-01-10', endDate: '2020-01-15', dest: 'Trip 1' }) // 11, 12, 13, 14 (4 days)

    // Segment tree O(1) point query
    assert.strictEqual(store.isAbsentDay(parseDateUTC('2020-01-09')), false)
    assert.strictEqual(store.isAbsentDay(parseDateUTC('2020-01-10')), false) // departure day excluded
    assert.strictEqual(store.isAbsentDay(parseDateUTC('2020-01-11')), true)
    assert.strictEqual(store.isAbsentDay(parseDateUTC('2020-01-14')), true)
    assert.strictEqual(store.isAbsentDay(parseDateUTC('2020-01-15')), false) // return day excluded

    // Segment tree range query
    assert.strictEqual(store.queryAbsentDaysInRange('2020-01-01', '2020-01-31'), 4)
    assert.strictEqual(store.queryAbsentDaysInRange('2020-01-12', '2020-01-13'), 2)
  })

  it('should preserve all backup fields including visa_expiry_date in full backup export and import', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useAbsentsStore()

    store.setVisaAndArrivalDates({
      visaStartDate: '2021-03-01',
      visaExpiryDate: '2023-09-01',
      ukArrivalDate: '2021-03-10',
      ilrApprovedDate: '2026-03-01',
    })

    store.addAbsence({ startDate: '2022-01-05', endDate: '2022-01-20', dest: 'Winter Break' })

    const fullYaml = exportFullBackup(store, { getDocumentsExportData: () => [] })
    assert.ok(fullYaml.includes('visa_expiry_date: 2023-09-01') || fullYaml.includes('visa_expiry_date: \'2023-09-01\''))
    assert.ok(fullYaml.includes('ilr_approved_date: 2026-03-01') || fullYaml.includes('ilr_approved_date: \'2026-03-01\''))

    // Clear store and re-import
    store.clearAbsences()
    store.importYAML(fullYaml)

    assert.strictEqual(store.visaStartDate, '2021-03-01')
    assert.strictEqual(store.visaExpiryDate, '2023-09-01')
    assert.strictEqual(store.ukArrivalDate, '2021-03-10')
    assert.strictEqual(store.ilrApprovedDate, '2026-03-01')
    assert.strictEqual(store.absences.filter((a) => !a.isAutoArrival).length, 1)
  })
})
