import JSZip from 'jszip'
import { stringify, parse } from 'yaml'
import { exportFullBackup, importBackup } from './backupService.js'
import { getAllFilesWithData, saveFile } from './fileStorageService.js'
import { generateId } from '../utils/id.js'

/**
 * Service for generating and parsing ZIP backup archives bundling backup.yaml, files-manifest.yaml, and document file blobs.
 */

/**
 * Creates a ZIP archive containing YAML backup data and all stored document files.
 *
 * @param {Object} absentsStore - Pinia absents store instance.
 * @param {Object} documentsStore - Pinia documents store instance.
 * @returns {Promise<{ blob: Blob, fileCount: number }>}
 */
export async function exportZipBackup(absentsStore, documentsStore) {
  const zip = new JSZip()

  // 1. Generate full YAML backup string and add to root of zip
  const yamlContent = exportFullBackup(absentsStore, documentsStore)
  zip.file('backup.yaml', yamlContent)

  // 2. Fetch all document files with binary data from IndexedDB
  const files = await getAllFilesWithData()
  const manifest = []

  const filesFolder = zip.folder('files')

  files.forEach((file) => {
    // Sanitize filename for zip path
    const folderName = file.folderId || 'other'
    const safeId = file.id || generateId('file')
    const safeName = (file.name || 'unnamed').replace(/[/\\]/g, '_')
    const zipPath = `${folderName}/${safeName}`

    manifest.push({
      id: safeId,
      name: file.name,
      folderId: folderName,
      mimeType: file.mimeType || 'application/octet-stream',
      size: file.size || 0,
      uploadedAt: file.uploadedAt || new Date().toISOString(),
      notes: file.notes || '',
      linkedYear: file.linkedYear || null,
      linkedItemId: file.linkedItemId || null,
      zipPath,
    })

    if (file.data) {
      filesFolder.file(`${folderName}/${safeName}`, file.data)
    }
  })

  // 3. Store metadata manifest in zip using YAML format
  const manifestYaml = stringify(manifest)
  zip.file('files-manifest.yaml', manifestYaml)

  // 4. Generate ZIP blob
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  return { blob, fileCount: files.length }
}

/**
 * Imports a ZIP archive containing backup YAML and uploaded documents.
 *
 * @param {Blob|File} zipBlob - Uploaded ZIP file.
 * @param {Object} absentsStore - Pinia absents store instance.
 * @param {Object} documentsStore - Pinia documents store instance.
 * @returns {Promise<{ absenceCount: number, docsImported: boolean, filesImported: number }>}
 */
export async function importZipBackup(zipBlob, absentsStore, documentsStore) {
  const zip = await JSZip.loadAsync(zipBlob)

  let absenceCount = 0
  let docsImported = false
  let filesImported = 0

  // 1. Find and process backup.yaml
  let yamlFile = zip.file('backup.yaml') || zip.file('backup.yml')
  if (!yamlFile) {
    // Search for any .yaml / .yml file at root (excluding manifest files)
    const matchedFiles = zip.file(/^[^/]+\.ya?ml$/i).filter((f) => !f.name.includes('manifest'))
    if (matchedFiles.length > 0) {
      yamlFile = matchedFiles[0]
    }
  }

  if (yamlFile) {
    const yamlText = await yamlFile.async('string')
    const result = importBackup(yamlText, absentsStore, documentsStore)
    absenceCount = result.absenceCount
    docsImported = result.docsImported
  }

  // 2. Find and process files-manifest.yaml (or files-manifest.json for backwards compatibility)
  const manifestFile =
    zip.file('files-manifest.yaml') ||
    zip.file('files-manifest.yml') ||
    zip.file('files-manifest.json') ||
    zip.file('files_manifest.yaml') ||
    zip.file('files_manifest.yml') ||
    zip.file('files_manifest.json')

  if (manifestFile) {
    const manifestText = await manifestFile.async('string')
    try {
      let manifest = parse(manifestText)
      if (!manifest && manifestText.trim().startsWith('[')) {
        manifest = JSON.parse(manifestText)
      }
      if (Array.isArray(manifest)) {
        for (const entry of manifest) {
          const zipPath = entry.zipPath ? `files/${entry.zipPath}` : null
          let zipFileRef = zipPath ? zip.file(zipPath) : null

          if (!zipFileRef) {
            // Fallback search by folder and filename pattern
            const safeFolder = (entry.folderId || '').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
            const pattern = new RegExp(
              `files/${safeFolder}/.*${entry.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`,
              'i',
            )
            const matches = zip.file(pattern)
            if (matches.length > 0) {
              zipFileRef = matches[0]
            }
          }

          if (zipFileRef) {
            const dataBuffer = await zipFileRef.async('arraybuffer')
            const fileRecord = {
              id: entry.id || generateId('file'),
              name: entry.name,
              folderId: entry.folderId || 'other',
              mimeType: entry.mimeType || 'application/octet-stream',
              size: entry.size || dataBuffer.byteLength,
              data: dataBuffer,
              uploadedAt: entry.uploadedAt || new Date().toISOString(),
              notes: entry.notes || '',
              linkedYear: entry.linkedYear || null,
              linkedItemId: entry.linkedItemId || null,
            }
            await saveFile(fileRecord)
            filesImported++
          }
        }
      }
    } catch (err) {
      console.error('Error parsing files-manifest from ZIP:', err)
    }
  } else {
    // Legacy / manual zip structure fallback: read files directly from files/ folder
    const fileEntries = zip.file(/^files\/.+/)
    for (const fileEntry of fileEntries) {
      if (fileEntry.dir) continue
      const parts = fileEntry.name.split('/')
      if (parts.length >= 3) {
        const folderId = parts[1]
        const fullName = parts.slice(2).join('/')
        const dataBuffer = await fileEntry.async('arraybuffer')
        const fileRecord = {
          id: generateId('file'),
          name: fullName,
          folderId: folderId || 'other',
          mimeType: 'application/octet-stream',
          size: dataBuffer.byteLength,
          data: dataBuffer,
          uploadedAt: new Date().toISOString(),
          notes: '',
          linkedYear: null,
          linkedItemId: null,
        }
        await saveFile(fileRecord)
        filesImported++
      }
    }
  }

  // Refresh documentsStore reactive file metadata from IndexedDB
  if (documentsStore && typeof documentsStore.initStore === 'function') {
    await documentsStore.initStore()
  }

  return {
    absenceCount,
    docsImported,
    filesImported,
  }
}
