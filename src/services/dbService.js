const DB_NAME = 'bno_5plus1_tracker_db'
const DB_VERSION = 2
const STORE_NAME = 'app_state'

let dbPromise = null
const memoryFallback = new Map()

/**
 * Checks if IndexedDB is available in the current environment.
 *
 * @returns {boolean} True if IndexedDB is supported.
 */
export function isIndexedDBAvailable() {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null
}

/**
 * Opens and returns the IndexedDB database instance wrapped in a Promise.
 *
 * @returns {Promise<IDBDatabase|null>}
 */
function getDB() {
  if (!isIndexedDBAvailable()) {
    return Promise.resolve(null)
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        }
        // v2: Add files object store for binary document blob storage
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' })
          filesStore.createIndex('folderId', 'folderId', { unique: false })
        }
      }
      request.onsuccess = (event) => {
        resolve(event.target.result)
      }
      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error)
        reject(event.target.error)
      }
    })
  }
  return dbPromise
}

/**
 * Gets a value from IndexedDB by key.
 *
 * @param {string} key
 * @returns {Promise<any>} The stored value or null.
 */
export async function getItem(key) {
  if (!isIndexedDBAvailable()) {
    return memoryFallback.has(key) ? memoryFallback.get(key) : null
  }
  try {
    const db = await getDB()
    if (!db) return memoryFallback.has(key) ? memoryFallback.get(key) : null
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => {
        resolve(req.result ? req.result.value : null)
      }
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    console.error(`dbService.getItem error for key "${key}":`, e)
    return memoryFallback.has(key) ? memoryFallback.get(key) : null
  }
}

/**
 * Sets a value in IndexedDB by key.
 *
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function setItem(key, value) {
  if (!isIndexedDBAvailable()) {
    memoryFallback.set(key, value)
    return
  }
  try {
    const db = await getDB()
    if (!db) {
      memoryFallback.set(key, value)
      return
    }
    let cloneableValue = value
    if (value !== undefined && value !== null && typeof value === 'object') {
      try {
        cloneableValue = JSON.parse(JSON.stringify(value))
      } catch {
        cloneableValue = value
      }
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put({ key, value: cloneableValue })
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    console.error(`dbService.setItem error for key "${key}":`, e)
    memoryFallback.set(key, value)
  }
}

/**
 * Removes an item from IndexedDB by key.
 *
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function removeItem(key) {
  if (!isIndexedDBAvailable()) {
    memoryFallback.delete(key)
    return
  }
  try {
    const db = await getDB()
    if (!db) {
      memoryFallback.delete(key)
      return
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    console.error(`dbService.removeItem error for key "${key}":`, e)
    memoryFallback.delete(key)
  }
}

/**
 * Gets multiple items from IndexedDB by array of keys.
 *
 * @param {Array<string>} keys
 * @returns {Promise<Object>} Object mapping key -> stored value.
 */
export async function getItems(keys) {
  const result = {}
  if (!isIndexedDBAvailable()) {
    for (const key of keys) {
      result[key] = memoryFallback.has(key) ? memoryFallback.get(key) : null
    }
    return result
  }
  try {
    const db = await getDB()
    if (!db) {
      for (const key of keys) {
        result[key] = memoryFallback.has(key) ? memoryFallback.get(key) : null
      }
      return result
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      let pending = keys.length
      if (pending === 0) return resolve(result)

      keys.forEach((key) => {
        const req = store.get(key)
        req.onsuccess = () => {
          result[key] = req.result ? req.result.value : null
          pending--
          if (pending === 0) resolve(result)
        }
        req.onerror = () => reject(req.error)
      })
    })
  } catch (e) {
    console.error('dbService.getItems error:', e)
    for (const key of keys) {
      result[key] = memoryFallback.has(key) ? memoryFallback.get(key) : null
    }
    return result
  }
}

/**
 * Sets multiple items in IndexedDB in a single transaction.
 *
 * @param {Object} itemsMap - Object with key-value pairs to store.
 * @returns {Promise<void>}
 */
export async function setItems(itemsMap) {
  if (!itemsMap || typeof itemsMap !== 'object') return
  const keys = Object.keys(itemsMap)
  if (keys.length === 0) return

  if (!isIndexedDBAvailable()) {
    for (const key of keys) {
      memoryFallback.set(key, itemsMap[key])
    }
    return
  }
  try {
    const db = await getDB()
    if (!db) {
      for (const key of keys) {
        memoryFallback.set(key, itemsMap[key])
      }
      return
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      keys.forEach((key) => {
        let value = itemsMap[key]
        let cloneableValue = value
        if (value !== undefined && value !== null && typeof value === 'object') {
          try {
            cloneableValue = JSON.parse(JSON.stringify(value))
          } catch {
            cloneableValue = value
          }
        }
        store.put({ key, value: cloneableValue })
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    console.error('dbService.setItems error:', e)
    for (const key of keys) {
      memoryFallback.set(key, itemsMap[key])
    }
  }
}

/**
 * Clears all data from IndexedDB object store and memory fallback.
 *
 * @returns {Promise<void>}
 */
export async function clear() {
  memoryFallback.clear()
  if (!isIndexedDBAvailable()) return
  try {
    const db = await getDB()
    if (!db) return
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    console.error('dbService.clear error:', e)
  }
}

/**
 * Automatically migrates specified keys from localStorage to IndexedDB if present.
 * Clears migrated keys from localStorage upon completion.
 *
 * @param {Array<string>} keys - Array of localStorage key names.
 * @returns {Promise<void>}
 */
export async function migrateFromLocalStorage(keys) {
  if (typeof globalThis.localStorage === 'undefined') return
  for (const key of keys) {
    try {
      const lsVal = globalThis.localStorage.getItem(key)
      if (lsVal !== null) {
        const existingIdbVal = await getItem(key)
        if (existingIdbVal === null) {
          let valToSave = lsVal
          try {
            valToSave = JSON.parse(lsVal)
          } catch {
            valToSave = lsVal
          }
          await setItem(key, valToSave)
        }
        globalThis.localStorage.removeItem(key)
      }
    } catch (e) {
      console.error(`Migration error for key "${key}":`, e)
    }
  }
}

/**
 * Resets internal database connection cache (useful for test suites).
 */
export function resetDBCache() {
  dbPromise = null
  memoryFallback.clear()
}
