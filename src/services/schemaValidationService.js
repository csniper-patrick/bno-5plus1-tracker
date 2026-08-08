import { parseDateUTC } from '../utils/date.js'

/**
 * Service for schema validation and data enforcement for imported backup files (YAML / JSON / ZIP).
 */

const ALLOWED_HOUSING_STATUSES = ['rented', 'owned', 'with_family', 'other']
const ALLOWED_QUAL_STATUSES = ['not_started', 'scheduled', 'passed']
const ALLOWED_NIN_STATUSES = ['not_applied', 'applied', 'received']
const ALLOWED_ENGLISH_TYPES = ['b1_selt', 'uk_degree', 'enic_statement', 'exempt']
const ALLOWED_IMPORTANCE = ['essential', 'recommended', 'supporting']
const ALLOWED_CHECKLIST_STATUSES = ['pending', 'collected', 'not_applicable']

/**
 * Helper to check if a string is a valid ISO YYYY-MM-DD date.
 *
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isValidDateStr(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false
  const trimmed = dateStr.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false
  const d = parseDateUTC(trimmed)
  if (!d || isNaN(d.getTime())) return false
  // Confirm calendar month/day match (prevents e.g. 2023-02-29)
  const [y, m, day] = trimmed.split('-').map(Number)
  return d.getUTCFullYear() === y && d.getUTCMonth() === m - 1 && d.getUTCDate() === day
}

/**
 * Validates top-level and nested structure of imported backup object.
 *
 * @param {Object} data - Raw parsed backup payload.
 * @returns {{ isValid: boolean, errors: string[], warnings: string[], sanitized: Object }}
 */
export function validateBackupData(data) {
  const errors = []
  const warnings = []

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      isValid: false,
      errors: ['Import data must be a valid JSON/YAML object.'],
      warnings: [],
      sanitized: null,
    }
  }

  const sanitized = { ...data }

  // 1. Validate Top-Level Key Dates
  const visaStartDate = data.visa_start_date || data.visaStartDate || ''
  if (visaStartDate && !isValidDateStr(visaStartDate)) {
    errors.push(`Invalid "visa_start_date": "${visaStartDate}". Expected format YYYY-MM-DD.`)
  }

  const visaExpiryDate = data.visa_expiry_date || data.visaExpiryDate || ''
  if (visaExpiryDate && !isValidDateStr(visaExpiryDate)) {
    errors.push(`Invalid "visa_expiry_date": "${visaExpiryDate}". Expected format YYYY-MM-DD.`)
  }

  const ukArrivalDate = data.uk_arrival_date || data.ukArrivalDate || ''
  if (ukArrivalDate && !isValidDateStr(ukArrivalDate)) {
    errors.push(`Invalid "uk_arrival_date": "${ukArrivalDate}". Expected format YYYY-MM-DD.`)
  }

  const ilrApprovedDate = data.ilr_approved_date || data.ilrApprovedDate || ''
  if (ilrApprovedDate && !isValidDateStr(ilrApprovedDate)) {
    errors.push(`Invalid "ilr_approved_date": "${ilrApprovedDate}". Expected format YYYY-MM-DD.`)
  }

  // 2. Validate Absences Records
  const rawAbsences = Array.isArray(data.absences)
    ? data.absences
    : Array.isArray(data.records)
      ? data.records
      : null

  if (rawAbsences) {
    rawAbsences.forEach((rec, idx) => {
      if (!rec || typeof rec !== 'object') {
        errors.push(`absences[${idx}]: Record must be an object.`)
        return
      }

      const sDate = rec.startDate || rec.start_date || ''
      const eDate = rec.endDate || rec.end_date || ''

      if (!sDate) {
        errors.push(`absences[${idx}]: Missing required "startDate".`)
      } else if (!isValidDateStr(sDate)) {
        errors.push(`absences[${idx}]: Invalid "startDate" ("${sDate}"). Expected format YYYY-MM-DD.`)
      }

      if (!eDate) {
        errors.push(`absences[${idx}]: Missing required "endDate".`)
      } else if (!isValidDateStr(eDate)) {
        errors.push(`absences[${idx}]: Invalid "endDate" ("${eDate}"). Expected format YYYY-MM-DD.`)
      }

      if (sDate && eDate && isValidDateStr(sDate) && isValidDateStr(eDate)) {
        if (eDate < sDate) {
          errors.push(
            `absences[${idx}]: "endDate" (${eDate}) cannot be earlier than "startDate" (${sDate}).`,
          )
        }
      }

      if (rec.stops && Array.isArray(rec.stops)) {
        rec.stops.forEach((stop, stopIdx) => {
          if (!stop || typeof stop !== 'object') {
            errors.push(`absences[${idx}].stops[${stopIdx}]: Stop record must be an object.`)
            return
          }
          if (stop.date && !isValidDateStr(stop.date)) {
            errors.push(
              `absences[${idx}].stops[${stopIdx}]: Invalid stop date ("${stop.date}"). Expected format YYYY-MM-DD.`,
            )
          }
        })
      }
    })
  }

  // 3. Validate Documents & Qualifications Tracker State
  const docObj = data.documents && typeof data.documents === 'object' ? data.documents : data

  if (docObj.lifeInUk && typeof docObj.lifeInUk === 'object') {
    const { status, testDate } = docObj.lifeInUk
    if (status && !ALLOWED_QUAL_STATUSES.includes(status)) {
      warnings.push(`documents.lifeInUk: Unknown status "${status}". Resetting to default.`)
    }
    if (testDate && !isValidDateStr(testDate)) {
      errors.push(`documents.lifeInUk: Invalid "testDate" ("${testDate}"). Expected format YYYY-MM-DD.`)
    }
  }

  if (docObj.englishTest && typeof docObj.englishTest === 'object') {
    const { type, status, testDate } = docObj.englishTest
    if (type && !ALLOWED_ENGLISH_TYPES.includes(type)) {
      warnings.push(`documents.englishTest: Unknown type "${type}". Resetting to default.`)
    }
    if (status && !ALLOWED_QUAL_STATUSES.includes(status)) {
      warnings.push(`documents.englishTest: Unknown status "${status}". Resetting to default.`)
    }
    if (testDate && !isValidDateStr(testDate)) {
      errors.push(`documents.englishTest: Invalid "testDate" ("${testDate}"). Expected format YYYY-MM-DD.`)
    }
  }

  if (docObj.nationalInsurance && typeof docObj.nationalInsurance === 'object') {
    const { status } = docObj.nationalInsurance
    if (status && !ALLOWED_NIN_STATUSES.includes(status)) {
      warnings.push(`documents.nationalInsurance: Unknown status "${status}". Resetting to default.`)
    }
  }

  const rawAddresses = Array.isArray(docObj.addressHistory)
    ? docObj.addressHistory
    : Array.isArray(docObj.addresses)
      ? docObj.addresses
      : null

  if (rawAddresses) {
    rawAddresses.forEach((addr, idx) => {
      if (!addr || typeof addr !== 'object') {
        errors.push(`addressHistory[${idx}]: Address record must be an object.`)
        return
      }

      const sDate = addr.startDate || addr.start_date || ''
      const eDate = addr.endDate || addr.end_date || ''

      if (!sDate) {
        errors.push(`addressHistory[${idx}]: Missing required "startDate".`)
      } else if (!isValidDateStr(sDate)) {
        errors.push(`addressHistory[${idx}]: Invalid "startDate" ("${sDate}"). Expected format YYYY-MM-DD.`)
      }

      if (eDate && !isValidDateStr(eDate)) {
        errors.push(`addressHistory[${idx}]: Invalid "endDate" ("${eDate}"). Expected format YYYY-MM-DD.`)
      }

      if (sDate && eDate && isValidDateStr(sDate) && isValidDateStr(eDate)) {
        if (eDate < sDate) {
          errors.push(
            `addressHistory[${idx}]: "endDate" (${eDate}) cannot be earlier than "startDate" (${sDate}).`,
          )
        }
      }

      if (addr.housingStatus && !ALLOWED_HOUSING_STATUSES.includes(addr.housingStatus)) {
        warnings.push(
          `addressHistory[${idx}]: Unknown housingStatus "${addr.housingStatus}". Defaulting to "other".`,
        )
      }
    })
  }

  if (docObj.residenceChecklist && typeof docObj.residenceChecklist === 'object') {
    Object.keys(docObj.residenceChecklist).forEach((year) => {
      const yearNum = Number(year)
      if (isNaN(yearNum) || yearNum < 1 || yearNum > 5) {
        warnings.push(`residenceChecklist: Year key "${year}" is outside standard 1-5 range.`)
      }
      const items = docObj.residenceChecklist[year]
      if (Array.isArray(items)) {
        items.forEach((item, itemIdx) => {
          if (!item || typeof item !== 'object') return
          if (item.importance && !ALLOWED_IMPORTANCE.includes(item.importance)) {
            warnings.push(
              `residenceChecklist[${year}][${itemIdx}]: Unknown importance "${item.importance}".`,
            )
          }
          if (item.status && !ALLOWED_CHECKLIST_STATUSES.includes(item.status)) {
            warnings.push(
              `residenceChecklist[${year}][${itemIdx}]: Unknown status "${item.status}". Defaulting to "pending".`,
            )
          }
        })
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  }
}

/**
 * Validates ZIP files-manifest array structure.
 *
 * @param {Array} manifest
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateZipManifest(manifest) {
  const errors = []
  if (!Array.isArray(manifest)) {
    return { isValid: false, errors: ['Manifest content must be an array of file entries.'] }
  }

  manifest.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`manifest[${idx}]: File entry must be an object.`)
      return
    }
    if (!entry.name || typeof entry.name !== 'string') {
      errors.push(`manifest[${idx}]: Missing required string "name".`)
    }
    if (typeof entry.size === 'number' && entry.size < 0) {
      errors.push(`manifest[${idx}]: Invalid negative file "size".`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}
