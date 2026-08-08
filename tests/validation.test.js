import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  isValidDateStr,
  validateBackupData,
  validateZipManifest,
} from '../src/services/schemaValidationService.js'
import { parseYAML } from '../src/services/backupService.js'

describe('Data Validation & Schema Enforcement Unit Tests', () => {
  describe('isValidDateStr Utility', () => {
    it('should validate correct ISO YYYY-MM-DD date strings', () => {
      assert.strictEqual(isValidDateStr('2024-01-15'), true)
      assert.strictEqual(isValidDateStr('2024-02-29'), true) // 2024 is a leap year
      assert.strictEqual(isValidDateStr('2000-12-31'), true)
    })

    it('should reject invalid calendar dates or malformed date strings', () => {
      assert.strictEqual(isValidDateStr('2023-02-29'), false) // 2023 is not a leap year
      assert.strictEqual(isValidDateStr('2024-13-01'), false) // month 13
      assert.strictEqual(isValidDateStr('2024-04-31'), false) // April has 30 days
      assert.strictEqual(isValidDateStr('invalid-date'), false)
      assert.strictEqual(isValidDateStr('2024/01/15'), false)
      assert.strictEqual(isValidDateStr(''), false)
      assert.strictEqual(isValidDateStr(null), false)
    })
  })

  describe('validateBackupData Schema Enforcement', () => {
    it('should pass valid full backup schema', () => {
      const validBackup = {
        version: 1,
        visa_start_date: '2021-06-01',
        visa_expiry_date: '2026-06-01',
        uk_arrival_date: '2021-06-15',
        ilr_approved_date: '',
        absences: [
          {
            startDate: '2022-07-01',
            endDate: '2022-07-20',
            dest: 'France',
            stops: [
              { date: '2022-07-01', dest: 'France' },
              { date: '2022-07-20', dest: '' },
            ],
          },
        ],
        documents: {
          lifeInUk: { status: 'passed', testDate: '2024-05-10', urn: 'LITUK-123456' },
          englishTest: { type: 'b1_selt', status: 'passed', provider: 'Trinity', referenceNo: 'REF-123' },
          nationalInsurance: { number: 'QQ 12 34 56 A', status: 'received' },
          addressHistory: [
            {
              addressLine1: '10 Downing Street',
              city: 'London',
              postcode: 'SW1A 2AA',
              startDate: '2021-06-15',
              isCurrent: true,
              housingStatus: 'rented',
            },
          ],
        },
      }

      const res = validateBackupData(validBackup)
      assert.strictEqual(res.isValid, true)
      assert.strictEqual(res.errors.length, 0)
    })

    it('should detect invalid top-level key date formats', () => {
      const badBackup = {
        visa_start_date: '2021-13-01', // Invalid month 13
        visa_expiry_date: '2026-02-30', // Feb 30 does not exist
      }

      const res = validateBackupData(badBackup)
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.errors.length, 2)
      assert.strictEqual(res.errors[0].includes('visa_start_date'), true)
      assert.strictEqual(res.errors[1].includes('visa_expiry_date'), true)
    })

    it('should detect absence record date validation errors (missing startDate, endDate < startDate)', () => {
      const badAbsences = {
        absences: [
          {
            startDate: '2023-08-20',
            endDate: '2023-08-10', // End before start
            dest: 'Spain',
          },
          {
            startDate: '', // Missing start date
            endDate: '2023-09-10',
            dest: 'Japan',
          },
        ],
      }

      const res = validateBackupData(badAbsences)
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.errors.length >= 2, true)
      assert.strictEqual(res.errors.some((e) => e.includes('cannot be earlier than')), true)
      assert.strictEqual(res.errors.some((e) => e.includes('Missing required "startDate"')), true)
    })

    it('should detect address history date errors and handle unknown housingStatus with warnings', () => {
      const badAddress = {
        documents: {
          addressHistory: [
            {
              addressLine1: 'Baker Street',
              startDate: '2024-05-10',
              endDate: '2024-05-01', // End before start
              housingStatus: 'custom_status', // Unknown enum
            },
          ],
        },
      }

      const res = validateBackupData(badAddress)
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.errors.some((e) => e.includes('cannot be earlier than')), true)
      assert.strictEqual(res.warnings.some((w) => w.includes('housingStatus')), true)
    })

    it('should detect invalid test dates in lifeInUk and englishTest objects', () => {
      const badQuals = {
        documents: {
          lifeInUk: { status: 'passed', testDate: 'invalid-date' },
          englishTest: { status: 'passed', testDate: '2024-00-00' },
        },
      }

      const res = validateBackupData(badQuals)
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.errors.length, 2)
      assert.strictEqual(res.errors[0].includes('lifeInUk'), true)
      assert.strictEqual(res.errors[1].includes('englishTest'), true)
    })
  })

  describe('validateZipManifest Enforcement', () => {
    it('should validate valid manifest entry array', () => {
      const manifest = [
        { id: 'f1', name: 'passport.pdf', folderId: 'year_1', size: 1024, zipPath: 'year_1/passport.pdf' },
      ]
      const res = validateZipManifest(manifest)
      assert.strictEqual(res.isValid, true)
      assert.strictEqual(res.errors.length, 0)
    })

    it('should reject non-array or invalid manifest entries', () => {
      assert.strictEqual(validateZipManifest('not-an-array').isValid, false)

      const badManifest = [{ id: 'f1', name: 12345, size: -50 }]
      const res = validateZipManifest(badManifest)
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.errors.length >= 2, true)
    })
  })

  describe('Strict Schema Enforcement in parseYAML', () => {
    it('should parse valid YAML content seamlessly', () => {
      const validYaml = `
visa_start_date: '2021-06-01'
absences:
  - startDate: '2022-07-01'
    endDate: '2022-07-15'
    dest: 'Italy'
`
      const parsed = parseYAML(validYaml)
      assert.strictEqual(parsed.visa_start_date, '2021-06-01')
      assert.strictEqual(parsed.absences.length, 1)
    })

    it('should throw explicit validation error when parsing invalid YAML data in strict mode', () => {
      const invalidYaml = `
visa_start_date: '2021-99-99'
absences:
  - startDate: '2022-07-15'
    endDate: '2022-07-01'
`
      assert.throws(() => parseYAML(invalidYaml), /Validation error in import payload/)
    })
  })
})
