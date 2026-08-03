import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
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
  it('should correctly build and query range sums', () => {
    const arr = new Uint8Array([0, 1, 1, 0, 1, 0, 1]) // 7 days
    const tree = new AbsenceSegmentTree(7)
    tree.build(arr)

    assert.strictEqual(tree.query(0, 6), 4)
    assert.strictEqual(tree.query(1, 2), 2)
    assert.strictEqual(tree.query(3, 3), 0)
    assert.strictEqual(tree.query(4, 6), 2)
  })

  it('should support point updates', () => {
    const arr = new Uint8Array([0, 0, 0, 0, 0])
    const tree = new AbsenceSegmentTree(5)
    tree.build(arr)

    assert.strictEqual(tree.query(0, 4), 0)

    tree.updatePoint(2, 1)
    assert.strictEqual(tree.query(0, 4), 1)
    assert.strictEqual(tree.query(1, 3), 1)

    tree.updatePoint(2, 0)
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
