import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Polyfill window for Node.js test environment before importing fake-indexeddb
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis
}

import 'fake-indexeddb/auto'

import * as dbService from '../src/services/dbService.js'
import * as fileStorage from '../src/services/fileStorageService.js'
import { setActivePinia, createPinia } from 'pinia'
import { useAbsentsStore } from '../src/stores/absents.js'
import { useDocumentsStore } from '../src/stores/documents.js'
import { exportZipBackup, importZipBackup } from '../src/services/zipService.js'

describe('IndexedDB Emulation & Storage Unit Tests', () => {
  beforeEach(async () => {
    await dbService.clear()
    const allFiles = await fileStorage.getAllFilesMeta()
    for (const f of allFiles) {
      await fileStorage.deleteFile(f.id)
    }
    fileStorage.resetFileDBCache()
  })

  it('should detect simulated IndexedDB as available in Node test runner', () => {
    assert.strictEqual(dbService.isIndexedDBAvailable(), true)
    assert.notStrictEqual(globalThis.indexedDB, undefined)
    assert.notStrictEqual(globalThis.indexedDB, null)
  })

  it('should store, retrieve, and delete items from emulated IndexedDB app_state store', async () => {
    await dbService.setItem('test_key_1', { name: 'BNO Tracker', year: 2026 })
    const val = await dbService.getItem('test_key_1')

    assert.deepStrictEqual(val, { name: 'BNO Tracker', year: 2026 })

    await dbService.removeItem('test_key_1')
    const valAfterDelete = await dbService.getItem('test_key_1')
    assert.strictEqual(valAfterDelete, null)
  })

  it('should store and retrieve binary file blobs in emulated IndexedDB files store', async () => {
    const textData = new TextEncoder().encode('Sample PDF Binary Content').buffer

    const fileRecord = {
      id: 'file_test_100',
      name: 'PassportScan.pdf',
      folderId: 'year_1',
      mimeType: 'application/pdf',
      size: textData.byteLength,
      data: textData,
      uploadedAt: new Date().toISOString(),
      notes: 'Front page passport scan',
      linkedYear: 1,
      linkedItemId: 'passport_validity',
      linkedAddressId: null,
    }

    // 1. Save binary file record to IndexedDB
    await fileStorage.saveFile(fileRecord)

    // 2. Fetch metadata list
    const metadataList = await fileStorage.getAllFilesMeta()
    assert.strictEqual(metadataList.length, 1)
    assert.strictEqual(metadataList[0].id, 'file_test_100')
    assert.strictEqual(metadataList[0].data, undefined) // Metadata does not contain raw blob

    // 3. Fetch file with binary data
    const fetchedFile = await fileStorage.getFile('file_test_100')
    assert.strictEqual(fetchedFile.name, 'PassportScan.pdf')
    assert.strictEqual(fetchedFile.data.byteLength, textData.byteLength)

    const textDecoder = new TextDecoder()
    assert.strictEqual(textDecoder.decode(fetchedFile.data), 'Sample PDF Binary Content')

    // 4. Update file metadata
    await fileStorage.updateFileMeta('file_test_100', {
      notes: 'Updated notes description',
      linkedYear: 2,
    })

    const updatedFile = await fileStorage.getFile('file_test_100')
    assert.strictEqual(updatedFile.notes, 'Updated notes description')
    assert.strictEqual(updatedFile.linkedYear, 2)

    // 5. Delete file
    await fileStorage.deleteFile('file_test_100')
    const listAfterDelete = await fileStorage.getAllFilesMeta()
    assert.strictEqual(listAfterDelete.length, 0)
  })

  it('should manage files by folder accurately in emulated IndexedDB', async () => {
    const buf1 = new ArrayBuffer(1024)
    const buf2 = new ArrayBuffer(2048)

    await fileStorage.saveFile({
      id: 'stat_1',
      name: 'doc1.pdf',
      folderId: 'year_1',
      mimeType: 'application/pdf',
      size: 1024,
      data: buf1,
      uploadedAt: new Date().toISOString(),
    })

    await fileStorage.saveFile({
      id: 'stat_2',
      name: 'doc2.png',
      folderId: 'addresses',
      mimeType: 'image/png',
      size: 2048,
      data: buf2,
      uploadedAt: new Date().toISOString(),
    })

    const year1Files = await fileStorage.getFilesByFolder('year_1')
    assert.strictEqual(year1Files.length, 1)
    assert.strictEqual(year1Files[0].name, 'doc1.pdf')

    const addressFiles = await fileStorage.getFilesByFolder('addresses')
    assert.strictEqual(addressFiles.length, 1)
    assert.strictEqual(addressFiles[0].name, 'doc2.png')

    await fileStorage.deleteFilesByFolder('year_1')
    const year1AfterDelete = await fileStorage.getFilesByFolder('year_1')
    assert.strictEqual(year1AfterDelete.length, 0)
  })
})

describe('End-to-End Emulated ZIP Archive Backup & Restore Unit Tests', () => {
  let absentsStore
  let documentsStore

  beforeEach(async () => {
    await dbService.clear()
    const allFiles = await fileStorage.getAllFilesMeta()
    for (const f of allFiles) {
      await fileStorage.deleteFile(f.id)
    }
    fileStorage.resetFileDBCache()
    setActivePinia(createPinia())
    absentsStore = useAbsentsStore()
    documentsStore = useDocumentsStore()
    await absentsStore.initStore()
    await documentsStore.initStore()
    absentsStore.clearAbsences()
    await documentsStore.resetAll()
  })

  it('should export full ZIP archive (including binary files from emulated IndexedDB) and restore completely', async () => {
    // 1. Setup Absence & Address records
    absentsStore.setVisaAndArrivalDates({
      visaStartDate: '2022-01-01',
      visaExpiryDate: '2027-01-01',
      ukArrivalDate: '2022-01-15',
    })

    absentsStore.addAbsence({
      startDate: '2023-06-01',
      endDate: '2023-06-15',
      dest: 'Switzerland',
    })

    documentsStore.addAddress({
      addressLine1: '221B Baker Street',
      city: 'London',
      postcode: 'NW1 6XE',
      startDate: '2022-01-15',
      isCurrent: true,
      housingStatus: 'rented',
    })

    const addrId = documentsStore.addressHistory[0].id

    // 2. Upload Binary File to Vault backed by emulated IndexedDB
    const binaryData = new TextEncoder().encode('Tenancy Agreement binary document data').buffer
    const mockBlob = new Blob([binaryData], { type: 'application/pdf' })
    const mockFile = new File([mockBlob], 'BakerStreetTenancy.pdf', { type: 'application/pdf' })

    const uploaded = await documentsStore.uploadFile(mockFile, 'addresses', {
      linkedAddressId: addrId,
      notes: 'London tenancy agreement scan',
    })

    assert.strictEqual(documentsStore.uploadedFiles.length, 1)
    assert.strictEqual(uploaded.name, 'BakerStreetTenancy.pdf')

    // 3. Export ZIP Archive containing backup.yaml, files-manifest.yaml, and binary files
    const { blob, fileCount } = await exportZipBackup(absentsStore, documentsStore)
    assert.strictEqual(fileCount, 1)
    assert.strictEqual(blob instanceof Blob, true)

    // 4. Reset Stores and Clear Emulated IndexedDB Storage
    await documentsStore.resetAll()
    absentsStore.clearAbsences()
    await dbService.clear()
    const currentFiles = await fileStorage.getAllFilesMeta()
    for (const f of currentFiles) {
      await fileStorage.deleteFile(f.id)
    }
    fileStorage.resetFileDBCache()

    assert.strictEqual(documentsStore.addressHistory.length, 0)
    assert.strictEqual(documentsStore.uploadedFiles.length, 0)

    // 5. Restore from exported ZIP File (convert blob to arrayBuffer for JSZip)
    const zipArrayBuffer = await blob.arrayBuffer()
    const result = await importZipBackup(zipArrayBuffer, absentsStore, documentsStore)
    await documentsStore.initStore()

    assert.strictEqual(result.docsImported, true)
    assert.strictEqual(result.filesImported, 1)

    // 6. Verify restored store state and binary file contents in emulated IndexedDB
    assert.strictEqual(absentsStore.visaStartDate, '2022-01-01')
    assert.strictEqual(documentsStore.addressHistory.length, 1)
    assert.strictEqual(documentsStore.addressHistory[0].addressLine1, '221B Baker Street')

    assert.strictEqual(documentsStore.uploadedFiles.length, 1)
    assert.strictEqual(documentsStore.uploadedFiles[0].name, 'BakerStreetTenancy.pdf')

    const restoredBinary = await fileStorage.getFile(documentsStore.uploadedFiles[0].id)
    assert.notStrictEqual(restoredBinary, null)
    assert.strictEqual(new TextDecoder().decode(restoredBinary.data), 'Tenancy Agreement binary document data')
  })
})
