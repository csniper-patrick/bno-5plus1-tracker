import { Document, parse } from 'yaml'

/**
 * Service for consolidating YAML backup generation, comment formatting, and backup parsing.
 */

/**
 * Generates a full application YAML backup string containing absence data and document tracker state with inline comments.
 *
 * @param {Object} absentsStore - Pinia absents store instance.
 * @param {Object} documentsStore - Pinia documents store instance.
 * @returns {string} Formatted YAML backup string.
 */
function mapAbsenceRecord(item) {
  const record = {
    startDate: item.startDate,
    endDate: item.endDate,
    dest: item.dest || '',
  }
  if (Array.isArray(item.stops) && item.stops.length >= 2) {
    record.stops = item.stops.map((s) => ({
      date: s.date || '',
      ...(s.dest ? { dest: s.dest } : {}),
    }))
  }
  return record
}

function resolveProfileName(profileNameOrStore, absentsStore) {
  if (typeof profileNameOrStore === 'string') {
    return profileNameOrStore
  }
  if (
    profileNameOrStore &&
    profileNameOrStore.activeProfile &&
    profileNameOrStore.activeProfile.name
  ) {
    return profileNameOrStore.activeProfile.name
  }
  if (profileNameOrStore && typeof profileNameOrStore.name === 'string') {
    return profileNameOrStore.name
  }
  if (absentsStore && absentsStore.profileName) {
    return absentsStore.profileName
  }
  return ''
}

export function exportFullBackup(absentsStore, documentsStore, profileNameOrStore = '') {
  const profileName = resolveProfileName(profileNameOrStore, absentsStore)
  const userAbsences = (absentsStore.absences || [])
    .filter((item) => !item.isAutoArrival && item.id !== 'auto_uk_arrival_record')
    .map(mapAbsenceRecord)

  const doc = new Document()
  doc.commentBefore =
    ' BNO 5+1 Tracker - Full Data Backup\n' +
    ' Date format for all dates: YYYY-MM-DD\n' +
    ' Keep this file safe as a backup for your ILR & Naturalisation applications.'

  const rootData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
  }
  if (profileName) {
    rootData.profile_name = profileName
  }
  Object.assign(rootData, {
    visa_start_date: absentsStore.visaStartDate || '',
    visa_expiry_date: absentsStore.visaExpiryDate || '',
    uk_arrival_date: absentsStore.ukArrivalDate || '',
    ilr_approved_date: absentsStore.ilrApprovedDate || '',
    absences: userAbsences,
    documents: {
      lifeInUk: documentsStore.lifeInUk,
      englishTest: documentsStore.englishTest,
      nationalInsurance: documentsStore.nationalInsurance,
      residenceChecklist: documentsStore.residenceChecklist,
      addressHistory: documentsStore.addressHistory,
    },
  })

  const rootMap = doc.createNode(rootData)

  if (rootMap && rootMap.items) {
    rootMap.items.forEach((pair, idx) => {
      const k = pair.key && pair.key.value !== undefined ? pair.key.value : pair.key
      if (k === 'version') {
        pair.key.commentBefore = ' Backup Schema Version'
      } else if (k === 'exportedAt') {
        pair.key.commentBefore = ' ISO Timestamp when backup was generated'
      } else if (k === 'profile_name') {
        pair.key.commentBefore = ' Profile Name'
      } else if (k === 'visa_start_date') {
        pair.key.commentBefore = ' BNO Visa Start Date (YYYY-MM-DD)'
      } else if (k === 'visa_expiry_date') {
        pair.key.commentBefore = ' BNO Visa Expiry Date (YYYY-MM-DD), if custom/extended'
      } else if (k === 'uk_arrival_date') {
        pair.key.commentBefore = ' First UK Arrival Date under BNO Visa (YYYY-MM-DD)'
      } else if (k === 'ilr_approved_date') {
        pair.key.commentBefore = ' ILR Approved Date (YYYY-MM-DD), if already granted'
      } else if (k === 'absences') {
        pair.key.commentBefore = ' List of UK Absences (Travel History Log)'
      } else if (k === 'documents') {
        pair.key.commentBefore = ' Document & Qualification Tracker State'

        if (pair.value && pair.value.items) {
          pair.value.items.forEach((docPair, docIdx) => {
            const docKey =
              docPair.key && docPair.key.value !== undefined ? docPair.key.value : docPair.key
            if (docKey === 'lifeInUk') {
              docPair.key.commentBefore =
                ' Life in the UK Test Status & Reference (status: not_started | scheduled | passed)'
            } else if (docKey === 'englishTest') {
              docPair.key.commentBefore =
                ' English B1 Language Requirement (type: b1_selt | uk_degree | enic_statement | exempt)'
            } else if (docKey === 'nationalInsurance') {
              docPair.key.commentBefore =
                ' National Insurance (NI) Record & Application Status (status: not_applied | applied | received)'
            } else if (docKey === 'residenceChecklist') {
              docPair.key.commentBefore =
                ' 5-Year Continuous Residence Evidence Checklist (Years 1 to 5, importance: essential | recommended | supporting)'
            } else if (docKey === 'addressHistory') {
              docPair.key.commentBefore =
                ' UK Address History Log (5-Year Residential History for SET(O) / Naturalisation)'
            }
            if (docIdx > 0) {
              docPair.key.spaceBefore = true
            }
          })
        }
      }
      if (idx > 0) {
        pair.key.spaceBefore = true
      }
    })
  }

  doc.contents = rootMap
  return doc.toString()
}

/**
 * Generates an absence-only YAML backup string.
 *
 * @param {Object} absentsStore - Pinia absents store instance.
 * @param {string|Object} [profileNameOrStore=''] - Active profile name or profile store.
 * @returns {string} Formatted YAML string.
 */
export function exportAbsencesBackup(absentsStore, profileNameOrStore = '') {
  const profileName = resolveProfileName(profileNameOrStore, absentsStore)
  const userAbsences = (absentsStore.absences || [])
    .filter((item) => !item.isAutoArrival && item.id !== 'auto_uk_arrival_record')
    .map(mapAbsenceRecord)

  const doc = new Document()
  doc.commentBefore =
    ' BNO 5+1 Absence Tracker - Data Export\n Format for all date fields: YYYY-MM-DD'

  const contentData = {}
  if (profileName) {
    contentData.profile_name = profileName
  }
  Object.assign(contentData, {
    visa_start_date: absentsStore.visaStartDate || '',
    visa_expiry_date: absentsStore.visaExpiryDate || '',
    uk_arrival_date: absentsStore.ukArrivalDate || '',
    ilr_approved_date: absentsStore.ilrApprovedDate || '',
    absences: userAbsences,
  })

  const contentMap = doc.createNode(contentData)

  if (contentMap && contentMap.items) {
    contentMap.items.forEach((pair, idx) => {
      const k = pair.key && pair.key.value !== undefined ? pair.key.value : pair.key
      if (k === 'profile_name') {
        pair.key.commentBefore = ' Profile Name'
      } else if (k === 'visa_start_date') {
        pair.key.commentBefore = ' BNO Visa Start Date (YYYY-MM-DD)'
      } else if (k === 'visa_expiry_date') {
        pair.key.commentBefore = ' BNO Visa Expiry Date, if applicable (YYYY-MM-DD)'
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

import { validateBackupData } from './schemaValidationService.js'

/**
 * Parses raw YAML text into a JS object and enforces schema validation.
 *
 * @param {string} yamlString - Raw YAML string.
 * @param {Object} [options={}] - Validation options (e.g. { strict: true }).
 * @returns {Object} Parsed and validated JS object.
 */
export function parseYAML(yamlString, options = { strict: true }) {
  if (!yamlString || typeof yamlString !== 'string') {
    throw new Error('Invalid YAML input: content must be a non-empty string.')
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

  const validation = validateBackupData(parsed)
  if (options.strict !== false && !validation.isValid) {
    throw new Error('Validation error in import payload:\n- ' + validation.errors.join('\n- '))
  }

  return validation.sanitized || parsed
}

/**
 * Imports a full YAML backup, parsing once and dispatching to both stores.
 *
 * @param {string} yamlString - Raw YAML string.
 * @param {Object} absentsStore - Pinia absents store instance.
 * @param {Object} documentsStore - Pinia documents store instance.
 * @returns {{ absenceCount: number, docsImported: boolean }} Import result summary.
 */
export function importBackup(yamlString, absentsStore, documentsStore) {
  const parsed = parseYAML(yamlString)

  const absenceResult = absentsStore.importYAML(parsed)
  const docsImported = documentsStore.importData(parsed)

  return {
    absenceCount: absenceResult.count,
    docsImported: !!docsImported,
  }
}
