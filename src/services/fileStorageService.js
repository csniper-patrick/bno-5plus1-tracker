/**
 * File Storage Service — IndexedDB-backed binary document storage.
 *
 * Stores uploaded file blobs in a dedicated 'files' object store,
 * separate from the app's key-value state store.
 *
 * File record schema:
 * {
 *   id: string,           // Unique file ID (generated via generateId)
 *   name: string,         // Display filename
 *   folderId: string,     // Folder assignment ('year_1', 'year_2', ..., 'life_in_uk', etc.)
 *   mimeType: string,     // MIME type (e.g. 'application/pdf', 'image/jpeg')
 *   size: number,         // File size in bytes
 *   data: ArrayBuffer,    // Raw file data
 *   uploadedAt: string,   // ISO timestamp
 *   notes: string,        // User notes
 *   linkedYear: number|null,   // Linked residence checklist year (1-5) or null
 *   linkedItemId: string|null, // Linked checklist item ID or null
 *   linkedAddressId: string|null, // Linked UK address ID or null
 * }
 */

import { isIndexedDBAvailable } from './dbService.js'

const DB_NAME = 'bno_5plus1_tracker_db'
const DB_VERSION = 2
const FILES_STORE = 'files'

/** Maximum file size: 10 MB */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Allowed MIME types for upload */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'text/plain',
]

/** Human-readable allowed extensions */
export const ALLOWED_EXTENSIONS = '.pdf, .jpg, .jpeg, .png, .webp, .heic, .txt'

let dbPromise = null

/**
 * Opens the shared IndexedDB database.
 * @returns {Promise<IDBDatabase|null>}
 */
function getDB() {
  if (!isIndexedDBAvailable()) return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('app_state')) {
          db.createObjectStore('app_state', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const filesStore = db.createObjectStore(FILES_STORE, { keyPath: 'id' })
          filesStore.createIndex('folderId', 'folderId', { unique: false })
        }
      }
      request.onsuccess = (event) => resolve(event.target.result)
      request.onerror = (event) => {
        console.error('FileStorage DB open error:', event.target.error)
        reject(event.target.error)
      }
    })
  }
  return dbPromise
}

/**
 * Saves a file record (including blob data) to IndexedDB.
 *
 * @param {Object} fileRecord - Full file record with data property.
 * @returns {Promise<void>}
 */
export async function saveFile(fileRecord) {
  const db = await getDB()
  if (!db) return

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readwrite')
    const store = tx.objectStore(FILES_STORE)
    const req = store.put(fileRecord)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * Retrieves a file record (including blob data) by ID.
 *
 * @param {string} id - File ID.
 * @returns {Promise<Object|null>} File record or null.
 */
export async function getFile(id) {
  const db = await getDB()
  if (!db) return null

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readonly')
    const store = tx.objectStore(FILES_STORE)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Retrieves all file records in a specific folder.
 *
 * @param {string} folderId - Folder ID to query.
 * @returns {Promise<Array<Object>>} Array of file records.
 */
export async function getFilesByFolder(folderId) {
  const db = await getDB()
  if (!db) return []

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readonly')
    const store = tx.objectStore(FILES_STORE)
    const index = store.index('folderId')
    const req = index.getAll(folderId)
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

/**
 * Retrieves all file metadata (without blob data) for fast listing.
 *
 * @returns {Promise<Array<Object>>} Array of file metadata objects.
 */
export async function getAllFilesMeta() {
  const db = await getDB()
  if (!db) return []

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readonly')
    const store = tx.objectStore(FILES_STORE)
    const req = store.getAll()
    req.onsuccess = () => {
      const files = (req.result || []).map((f) => ({
        id: f.id,
        name: f.name,
        folderId: f.folderId,
        mimeType: f.mimeType,
        size: f.size,
        uploadedAt: f.uploadedAt,
        notes: f.notes || '',
        linkedYear: f.linkedYear || null,
        linkedItemId: f.linkedItemId || null,
        linkedAddressId: f.linkedAddressId || null,
      }))
      resolve(files)
    }
    req.onerror = () => reject(req.error)
  })
}

/**
 * Retrieves all full file records (including binary blob data) for ZIP export.
 *
 * @returns {Promise<Array<Object>>} Array of full file objects.
 */
export async function getAllFilesWithData() {
  const db = await getDB()
  if (!db) return []

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readonly')
    const store = tx.objectStore(FILES_STORE)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

/**
 * Deletes a file record by ID.
 *
 * @param {string} id - File ID to delete.
 * @returns {Promise<void>}
 */
export async function deleteFile(id) {
  const db = await getDB()
  if (!db) return

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readwrite')
    const store = tx.objectStore(FILES_STORE)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * Deletes all file records in a specific folder.
 *
 * @param {string} folderId - Folder ID.
 * @returns {Promise<void>}
 */
export async function deleteFilesByFolder(folderId) {
  const db = await getDB()
  if (!db) return

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readwrite')
    const store = tx.objectStore(FILES_STORE)
    const index = store.index('folderId')
    const req = index.openCursor(folderId)
    req.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Updates metadata fields on a file record (without rewriting the blob).
 *
 * @param {string} id - File ID.
 * @param {Object} updates - Partial metadata to merge (name, folderId, notes, linkedYear, linkedItemId).
 * @returns {Promise<void>}
 */
export async function updateFileMeta(id, updates) {
  const db = await getDB()
  if (!db) return

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readwrite')
    const store = tx.objectStore(FILES_STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const existing = getReq.result
      if (!existing) {
        reject(new Error(`File not found: ${id}`))
        return
      }
      const updated = { ...existing, ...updates, id }
      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

/**
 * Reads a browser File object into an ArrayBuffer.
 *
 * @param {File} file - Browser File object.
 * @returns {Promise<ArrayBuffer>}
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      if (file && typeof file.arrayBuffer === 'function') {
        return resolve(file.arrayBuffer())
      }
      return resolve(new ArrayBuffer((file && file.size) || 0))
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Creates an Object URL from a file record's data for preview/download.
 *
 * @param {Object} fileRecord - File record with data and mimeType.
 * @returns {string} Object URL (caller must revoke when done).
 */
export function createFileURL(fileRecord) {
  const blob = new Blob([fileRecord.data], { type: fileRecord.mimeType })
  return URL.createObjectURL(blob)
}

/**
 * Formats bytes into human-readable size string.
 *
 * @param {number} bytes - File size in bytes.
 * @returns {string} Formatted size (e.g. '2.4 MB').
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)
  return `${size} ${units[i]}`
}

/**
 * Resets internal DB connection cache (for testing).
 */
export function resetFileDBCache() {
  dbPromise = null
}
