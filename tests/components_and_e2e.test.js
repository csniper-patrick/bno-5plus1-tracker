import fs from 'node:fs'
import path from 'node:path'
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis
}
import 'fake-indexeddb/auto'
import { setActivePinia, createPinia } from 'pinia'

import { useAbsentsStore } from '../src/stores/absents.js'
import { useDocumentsStore, sanitizeResidenceChecklist } from '../src/stores/documents.js'
import { exportFullBackup, importBackup } from '../src/services/backupService.js'
import { calculateDays, getMaxSegmentTreeReturnDate } from '../src/utils/date.js'
import * as dbService from '../src/services/dbService.js'

describe('Component Logic & Reference Links Filtering', () => {
  const sampleLinks = [
    {
      id: 'bno-visa-extend',
      title: 'BNO Visa: Extend Your Visa (30 Months or 5 Years)',
      category: 'Visa Extension',
      url: 'https://www.gov.uk/british-national-overseas-bno-visa/extend-your-visa',
      isOfficial: true,
      description: 'Official UK Government guide and application portal for extending your BNO visa.',
      highlights: ['Apply online before current visa expires'],
    },
    {
      id: 'gitlab-repository',
      title: 'BNO 5+1 Tracker GitLab Repository',
      category: 'Tools & Source',
      url: 'https://gitlab.com/CSniper/bno-5plus1-tracker',
      isOfficial: false,
      description: 'Open-source repository for this BNO 5+1 Tracker web application.',
      highlights: ['Open-source web application for BNO visa holders'],
    },
  ]

  function filterLinks(links, searchQuery = '', selectedCategory = 'All', selectedSourceType = 'All') {
    return links.filter((link) => {
      const matchesCategory = selectedCategory === 'All' || link.category === selectedCategory
      const matchesSourceType =
        selectedSourceType === 'All' ||
        (selectedSourceType === 'Official' && link.isOfficial) ||
        (selectedSourceType === '3rd Party' && !link.isOfficial)

      const query = searchQuery.trim().toLowerCase()
      if (!query) return matchesCategory && matchesSourceType

      const matchesTitle = link.title.toLowerCase().includes(query)
      const matchesDesc = link.description.toLowerCase().includes(query)
      const matchesHighlights = link.highlights.some((h) => String(h).toLowerCase().includes(query))

      return matchesCategory && matchesSourceType && (matchesTitle || matchesDesc || matchesHighlights)
    })
  }

  it('should filter links by category correctly', () => {
    const filtered = filterLinks(sampleLinks, '', 'Visa Extension', 'All')
    assert.strictEqual(filtered.length, 1)
    assert.strictEqual(filtered[0].id, 'bno-visa-extend')
  })

  it('should filter links by source type correctly', () => {
    const officialOnly = filterLinks(sampleLinks, '', 'All', 'Official')
    assert.strictEqual(officialOnly.length, 1)
    assert.strictEqual(officialOnly[0].id, 'bno-visa-extend')

    const thirdPartyOnly = filterLinks(sampleLinks, '', 'All', '3rd Party')
    assert.strictEqual(thirdPartyOnly.length, 1)
    assert.strictEqual(thirdPartyOnly[0].id, 'gitlab-repository')
  })

  it('should filter links by search query matching title or description', () => {
    const filtered = filterLinks(sampleLinks, 'open-source', 'All', 'All')
    assert.strictEqual(filtered.length, 1)
    assert.strictEqual(filtered[0].id, 'gitlab-repository')
  })
})

describe('Absence Form & Validation Utilities', () => {
  it('should calculate form days absent for standard departure and return dates', () => {
    const startDate = '2024-03-01'
    const endDate = '2024-03-10'
    const days = calculateDays(startDate, endDate)
    assert.strictEqual(days, 8)
  })

  it('should compute segment tree max limit accurately', () => {
    const visaStartDate = '2021-06-15'
    const maxReturn = getMaxSegmentTreeReturnDate(visaStartDate)
    assert.strictEqual(maxReturn, '2031-06-15')
  })
})

describe('Absence Record Table Sorting Logic', () => {
  const records = [
    { id: '1', startDate: '2023-05-01', endDate: '2023-05-15', dest: 'Japan' }, // 13 days
    { id: '2', startDate: '2022-01-10', endDate: '2022-01-15', dest: 'France' }, // 4 days
    { id: '3', startDate: '2024-02-01', endDate: '2024-02-25', dest: 'Canada' }, // 23 days
  ]

  function sortDisplayAbsences(list, field = 'startDate', order = 'asc') {
    const isAsc = order === 'asc'
    return [...list].sort((a, b) => {
      if (field === 'startDate') {
        const valA = a.startDate || ''
        const valB = b.startDate || ''
        const cmp = valA.localeCompare(valB)
        if (cmp !== 0) return isAsc ? cmp : -cmp
        return (a.endDate || '').localeCompare(b.endDate || '')
      } else if (field === 'days') {
        const valA = calculateDays(a.startDate, a.endDate)
        const valB = calculateDays(b.startDate, b.endDate)
        const cmp = isAsc ? valA - valB : valB - valA
        if (cmp !== 0) return cmp
        return (a.startDate || '').localeCompare(b.startDate || '')
      }
      return 0
    })
  }

  it('should sort by departure date (timeline) by default in ascending order', () => {
    const sorted = sortDisplayAbsences(records, 'startDate', 'asc')
    assert.deepStrictEqual(
      sorted.map((r) => r.id),
      ['2', '1', '3'],
    )
  })

  it('should sort by absence days correctly', () => {
    const sortedAsc = sortDisplayAbsences(records, 'days', 'asc')
    assert.deepStrictEqual(
      sortedAsc.map((r) => r.id),
      ['2', '1', '3'],
    )

    const sortedDesc = sortDisplayAbsences(records, 'days', 'desc')
    assert.deepStrictEqual(
      sortedDesc.map((r) => r.id),
      ['3', '1', '2'],
    )
  })
})

describe('End-to-End User Flow 1: Absence Tracking & Rolling Rule Compliance', () => {
  let absentsStore

  beforeEach(async () => {
    await dbService.clear()
    setActivePinia(createPinia())
    absentsStore = useAbsentsStore()
    await absentsStore.initStore()
    absentsStore.clearAbsences()
  })

  it('should execute end-to-end flow: setup key dates, add multi-stop trip, query dates, and backup', async () => {
    // 1. Setup Key Visa & Arrival Dates
    absentsStore.setVisaAndArrivalDates({
      visaStartDate: '2021-06-01',
      visaExpiryDate: '2026-06-01',
      ukArrivalDate: '2021-06-15',
    })

    assert.strictEqual(absentsStore.visaStartDate, '2021-06-01')
    assert.strictEqual(absentsStore.ukArrivalDate, '2021-06-15')
    assert.strictEqual(absentsStore.earliestIlrApplicationDate, '2026-05-04')

    // 2. Add Absence Trips (including a multi-stop trip)
    absentsStore.addAbsence({
      startDate: '2022-07-01',
      endDate: '2022-07-20',
      dest: 'France ➔ Spain',
      stops: [
        { date: '2022-07-01', dest: 'France' },
        { date: '2022-07-10', dest: 'Spain' },
        { date: '2022-07-20', dest: '' },
      ],
    })

    absentsStore.addAbsence({
      startDate: '2023-08-10',
      endDate: '2023-08-25',
      dest: 'Japan',
    })

    const userTrips = absentsStore.absences.filter((a) => !a.isAutoArrival)
    assert.strictEqual(userTrips.length, 2)

    // 3. Query absent days in custom date range
    const daysIn2022 = absentsStore.queryAbsentDaysInRange('2022-01-01', '2022-12-31')
    assert.strictEqual(daysIn2022, 18) // 1st to 20th July -> 18 full days spent abroad

    // 4. Verify Rule Compliance Status
    assert.strictEqual(absentsStore.max12MonthAbsence <= 180, true)
    assert.strictEqual(absentsStore.ruleStatusColor, 'success')

    // 5. Export YAML backup & verify restore
    const yamlExport = absentsStore.exportYAML()
    absentsStore.clearAbsences()

    const importResult = absentsStore.importYAML(yamlExport)
    assert.strictEqual(importResult.count >= 2, true)
    assert.strictEqual(absentsStore.visaStartDate, '2021-06-01')
  })
})

describe('End-to-End User Flow 2: Document Vault, Address Log & Backup Restores', () => {
  let absentsStore
  let documentsStore

  beforeEach(async () => {
    await dbService.clear()
    setActivePinia(createPinia())
    absentsStore = useAbsentsStore()
    documentsStore = useDocumentsStore()
    await absentsStore.initStore()
    await documentsStore.initStore()
    absentsStore.clearAbsences()
    await documentsStore.resetAll()
  })

  it('should execute end-to-end flow: log address, update qualifications, add custom evidence, export & import backup package', async () => {
    // 1. Log Address Entry
    documentsStore.addAddress({
      addressLine1: '10 Downing Street',
      city: 'London',
      postcode: 'SW1A 2AA',
      startDate: '2021-06-15',
      isCurrent: true,
      housingStatus: 'rented',
    })

    await new Promise((r) => setTimeout(r, 50))
    assert.strictEqual(documentsStore.addressHistory.length, 1)

    // 2. Update Qualifications
    documentsStore.updateLifeInUk({
      status: 'passed',
      testDate: '2024-05-10',
      urn: 'LITUK-99887766',
    })

    documentsStore.updateEnglishTest({
      type: 'b1_selt',
      provider: 'Trinity College London',
      status: 'passed',
      referenceNo: 'TCL-12345678',
    })

    assert.strictEqual(documentsStore.lifeInUk.status, 'passed')
    assert.strictEqual(documentsStore.lifeInUk.urn, 'LITUK-99887766')
    assert.strictEqual(documentsStore.englishTest.referenceNo, 'TCL-12345678')

    // 3. Add Custom Evidence Item to Residence Checklist Year 1
    documentsStore.addCustomDocumentItem(1, {
      title: 'Tenancy Agreement Copy',
      category: 'Housing',
    })

    const customItem = documentsStore.residenceChecklist[1].find((i) => i.title === 'Tenancy Agreement Copy')
    assert.notStrictEqual(customItem, undefined)
    assert.strictEqual(customItem.title, 'Tenancy Agreement Copy')

    // Update item status
    documentsStore.updateDocumentItem(1, customItem.id, { status: 'collected' })
    const itemInStore = documentsStore.residenceChecklist[1].find((i) => i.id === customItem.id)
    assert.strictEqual(itemInStore.status, 'collected')

    // 4. Export Full Backup YAML
    const yamlContent = exportFullBackup(absentsStore, documentsStore)
    assert.strictEqual(typeof yamlContent, 'string')
    assert.strictEqual(yamlContent.includes('10 Downing Street'), true)
    assert.strictEqual(yamlContent.includes('LITUK-99887766'), true)

    // 5. Reset Store and Import Full Backup Package
    await documentsStore.resetAll()
    await new Promise((r) => setTimeout(r, 50))
    assert.strictEqual(documentsStore.addressHistory.length, 0)

    const restoreResult = importBackup(yamlContent, absentsStore, documentsStore)
    assert.strictEqual(restoreResult.docsImported, true)

    // Verify restored state
    assert.strictEqual(documentsStore.addressHistory.length, 1)
    assert.strictEqual(documentsStore.addressHistory[0].addressLine1, '10 Downing Street')
    assert.strictEqual(documentsStore.lifeInUk.urn, 'LITUK-99887766')
    assert.strictEqual(documentsStore.englishTest.referenceNo, 'TCL-12345678')
    const restoredCustomItem = documentsStore.residenceChecklist[1].find((i) => i.title === 'Tenancy Agreement Copy')
    assert.notStrictEqual(restoredCustomItem, undefined)
    assert.strictEqual(restoredCustomItem.status, 'collected')
  })

  it('should sanitize loaded residence checklist data by preserving standard items and pruning untouched obsolete items', () => {
    const legacyChecklist = {
      1: [
        { id: 'year_1_council_tax', title: 'Council Tax Bill', status: 'collected' },
        { id: 'year_1_employer_letter', title: 'Employer Letter', status: 'pending', notes: '' }, // Obsolete & untouched -> should prune
        { id: 'year_1_gp_nhs_letter', title: 'GP Letter', status: 'collected', notes: 'Saved' }, // Obsolete but modified -> should keep as custom
      ]
    }

    const sanitized = sanitizeResidenceChecklist(legacyChecklist, [])
    const year1 = sanitized[1]

    // Must contain 4 standard default items + 1 preserved modified legacy item (GP Letter) = 5 items total
    assert.strictEqual(year1.length, 5)

    // Standard items must exist
    assert.ok(year1.some((i) => i.id === 'year_1_council_tax' && i.status === 'collected'))
    assert.ok(year1.some((i) => i.id === 'year_1_p60_employment'))
    assert.ok(year1.some((i) => i.id === 'year_1_housing_proof'))
    assert.ok(year1.some((i) => i.id === 'year_1_bank_statements'))

    // Untouched obsolete item must be pruned
    assert.strictEqual(year1.some((i) => i.id.includes('employer_letter')), false)

    // Modified obsolete item must be preserved as custom
    const preservedGp = year1.find((i) => i.id.includes('gp_nhs_letter'))
    assert.notStrictEqual(preservedGp, undefined)
    assert.strictEqual(preservedGp.isCustom, true)
    assert.strictEqual(preservedGp.notes, 'Saved')
  })

  it('should store, retrieve, and process PDF binary file data (eagle-2.pdf test material)', async () => {
    const pdfPath = path.join(process.cwd(), 'eagle-2.pdf')
    assert.strictEqual(fs.existsSync(pdfPath), true, 'eagle-2.pdf must exist in project root')

    const fileBuffer = fs.readFileSync(pdfPath)
    const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)

    const pinia = createPinia()
    setActivePinia(pinia)
    const documentsStore = useDocumentsStore()
    await documentsStore.initStore()

    const mockFileObj = {
      name: 'eagle-2.pdf',
      type: 'application/pdf',
      size: fileBuffer.length,
      arrayBuffer: async () => arrayBuffer,
    }

    const savedRecord = await documentsStore.uploadFile(mockFileObj, 'year_1')
    assert.ok(savedRecord.id)
    assert.strictEqual(savedRecord.mimeType, 'application/pdf')
    assert.strictEqual(savedRecord.name, 'eagle-2.pdf')

    const fullRecord = await documentsStore.getFullFileRecord(savedRecord.id)
    assert.notStrictEqual(fullRecord, null)
    assert.ok(fullRecord.data instanceof ArrayBuffer || fullRecord.data instanceof Uint8Array)
    assert.strictEqual(fullRecord.data.byteLength, fileBuffer.length)
  })
})
