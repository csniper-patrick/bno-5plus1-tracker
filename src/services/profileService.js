/**
 * Profile Service — Multi-Profile Data Management & IndexedDB Swapping Service.
 *
 * Manages active profile selection, profile metadata list, and atomic swapping of
 * profile-specific data in IndexedDB ('app_state' store).
 */

import * as dbService from './dbService.js'
import { generateId } from '../utils/id.js'

export const ACTIVE_PROFILE_KEY = 'bno_active_profile_id'
export const PROFILES_META_KEY = 'bno_profiles_meta'
export const PROFILES_DATA_KEY = 'bno_profiles_data'

export const DEFAULT_PROFILE_ID = 'profile_default'
export const DEFAULT_PROFILE_NAME = 'Main Applicant'
export const DEFAULT_PROFILE_COLOR = '#1976D2'

/** Active data keys that get swapped in and out of app_state per profile */
export const ACTIVE_DATA_KEYS = [
  'bno_absences',
  'bno_visa_start_date',
  'bno_visa_expire_date',
  'bno_uk_arrival_date',
  'bno_ilr_approved_date',
  'bno_tracker_documents_v1',
]

/**
 * Color options for profile avatars
 */
export const PROFILE_COLOR_OPTIONS = [
  '#1976D2', // Blue
  '#E91E63', // Pink / Magenta
  '#2E7D32', // Green
  '#9C27B0', // Purple
  '#ED6C02', // Orange
  '#00838F', // Cyan / Teal
  '#673AB7', // Deep Purple
  '#D32F2F', // Red
]

/**
 * Snapshots current active keys into a profile payload object.
 *
 * @returns {Promise<Object>} Profile payload containing all active tracker data.
 */
export async function snapshotActivePayload() {
  const activeItems = await dbService.getItems(ACTIVE_DATA_KEYS)
  return {
    absences: activeItems['bno_absences'] || [],
    visaStartDate: activeItems['bno_visa_start_date'] || '',
    visaExpiryDate: activeItems['bno_visa_expire_date'] || '',
    ukArrivalDate: activeItems['bno_uk_arrival_date'] || '',
    ilrApprovedDate: activeItems['bno_ilr_approved_date'] || '',
    documents: activeItems['bno_tracker_documents_v1'] || null,
  }
}

/**
 * Restores a profile payload object into active IndexedDB keys.
 *
 * @param {Object} payload - Profile payload containing absences, visa dates, documents.
 * @returns {Promise<void>}
 */
export async function restoreActivePayload(payload) {
  const safePayload = payload || {}
  const itemsToSave = {
    bno_absences: Array.isArray(safePayload.absences) ? safePayload.absences : [],
    bno_visa_start_date: safePayload.visaStartDate || '',
    bno_visa_expire_date: safePayload.visaExpiryDate || '',
    bno_uk_arrival_date: safePayload.ukArrivalDate || '',
    bno_ilr_approved_date: safePayload.ilrApprovedDate || '',
    bno_tracker_documents_v1: safePayload.documents || null,
  }
  await dbService.setItems(itemsToSave)
}

/**
 * Initializes profile metadata and structure if running for the first time.
 * Migrates single-profile data seamlessly into the default "Main Applicant" profile.
 *
 * @returns {Promise<{ activeId: string, metaList: Array }>} Current profile configuration.
 */
export async function initProfiles() {
  let activeId = await dbService.getItem(ACTIVE_PROFILE_KEY)
  let metaList = (await dbService.getItem(PROFILES_META_KEY)) || []
  let profilesData = (await dbService.getItem(PROFILES_DATA_KEY)) || {}

  // Migrate existing single profile data into default profile if meta is empty
  if (!Array.isArray(metaList) || metaList.length === 0) {
    activeId = DEFAULT_PROFILE_ID
    const defaultMeta = {
      id: DEFAULT_PROFILE_ID,
      name: DEFAULT_PROFILE_NAME,
      avatarColor: DEFAULT_PROFILE_COLOR,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    metaList = [defaultMeta]

    // Save initial profile metadata and active profile ID
    await dbService.setItem(ACTIVE_PROFILE_KEY, activeId)
    await dbService.setItem(PROFILES_META_KEY, metaList)
    await dbService.setItem(PROFILES_DATA_KEY, profilesData)
  } else if (!activeId || !metaList.some((m) => m.id === activeId)) {
    activeId = metaList[0].id
    await dbService.setItem(ACTIVE_PROFILE_KEY, activeId)
  }

  return { activeId, metaList: metaList.map((m) => ({ ...m })) }
}

/**
 * Atomically switches current active profile to target profile ID.
 *
 * @param {string} targetProfileId - The ID of the profile to switch to.
 * @returns {Promise<boolean>} True if switch succeeded.
 */
export async function switchProfile(targetProfileId) {
  const currentActiveId = (await dbService.getItem(ACTIVE_PROFILE_KEY)) || DEFAULT_PROFILE_ID
  if (currentActiveId === targetProfileId) return true

  let metaList = (await dbService.getItem(PROFILES_META_KEY)) || []
  const targetMeta = metaList.find((m) => m.id === targetProfileId)
  if (!targetMeta) {
    console.error(`switchProfile error: Target profile "${targetProfileId}" does not exist.`)
    return false
  }

  let profilesData = (await dbService.getItem(PROFILES_DATA_KEY)) || {}

  // 1. Snapshot current active data into profilesData dictionary
  const currentPayload = await snapshotActivePayload()
  profilesData[currentActiveId] = currentPayload

  // 2. Retrieve target profile payload from dictionary
  const targetPayload = profilesData[targetProfileId] || {
    absences: [],
    visaStartDate: '',
    visaExpiryDate: '',
    ukArrivalDate: '',
    ilrApprovedDate: '',
    documents: null,
  }

  // 3. Write target payload to active keys
  await restoreActivePayload(targetPayload)

  // 4. Remove active target payload from profilesData dictionary (since it's now active)
  delete profilesData[targetProfileId]

  // 5. Update active profile ID and save profilesData dictionary
  await dbService.setItem(ACTIVE_PROFILE_KEY, targetProfileId)
  await dbService.setItem(PROFILES_DATA_KEY, profilesData)

  return true
}

/**
 * Creates a new profile and automatically switches to it.
 *
 * @param {string} name - Display name of the new profile.
 * @param {string} [avatarColor] - Color hex code for avatar badge.
 * @returns {Promise<Object>} Newly created profile metadata object.
 */
export async function createProfile(name, avatarColor) {
  const metaList = (await dbService.getItem(PROFILES_META_KEY)) || []
  const chosenColor =
    avatarColor || PROFILE_COLOR_OPTIONS[metaList.length % PROFILE_COLOR_OPTIONS.length]
  const newId = `profile_${Date.now()}_${generateId(4)}`

  const newMeta = {
    id: newId,
    name: name.trim() || `Profile ${metaList.length + 1}`,
    avatarColor: chosenColor,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Snapshot current profile before switching
  const currentActiveId = (await dbService.getItem(ACTIVE_PROFILE_KEY)) || DEFAULT_PROFILE_ID
  let profilesData = (await dbService.getItem(PROFILES_DATA_KEY)) || {}
  const currentPayload = await snapshotActivePayload()
  profilesData[currentActiveId] = currentPayload

  // Update metadata list
  metaList.push(newMeta)
  await dbService.setItem(PROFILES_META_KEY, metaList)
  await dbService.setItem(PROFILES_DATA_KEY, profilesData)

  // Initialize empty target payload for new profile into active keys
  await restoreActivePayload({
    absences: [],
    visaStartDate: '',
    visaExpiryDate: '',
    ukArrivalDate: '',
    ilrApprovedDate: '',
    documents: null,
  })

  // Set new active profile ID
  await dbService.setItem(ACTIVE_PROFILE_KEY, newId)

  return newMeta
}

/**
 * Updates profile metadata (name or color).
 *
 * @param {string} profileId - Target profile ID.
 * @param {Object} updates - Metadata properties to update ({ name, avatarColor }).
 * @returns {Promise<Array>} Updated metaList.
 */
export async function updateProfileMeta(profileId, updates) {
  let metaList = (await dbService.getItem(PROFILES_META_KEY)) || []
  const profile = metaList.find((m) => m.id === profileId)
  if (!profile) return metaList.map((m) => ({ ...m }))

  if (typeof updates.name === 'string' && updates.name.trim()) {
    profile.name = updates.name.trim()
  }
  if (typeof updates.avatarColor === 'string' && updates.avatarColor.trim()) {
    profile.avatarColor = updates.avatarColor.trim()
  }
  profile.updatedAt = new Date().toISOString()

  await dbService.setItem(PROFILES_META_KEY, metaList)
  return metaList.map((m) => ({ ...m }))
}

/**
 * Deletes a profile. If deleting current active profile, switches to another profile first.
 * Safety check: Prevents deleting if only 1 profile remains.
 *
 * @param {string} profileId - ID of profile to delete.
 * @returns {Promise<{ success: boolean, newActiveId: string|null }>} Result status.
 */
export async function deleteProfile(profileId) {
  let metaList = (await dbService.getItem(PROFILES_META_KEY)) || []
  if (metaList.length <= 1) {
    return { success: false, newActiveId: null }
  }

  const currentActiveId = (await dbService.getItem(ACTIVE_PROFILE_KEY)) || DEFAULT_PROFILE_ID
  let newActiveId = currentActiveId

  // If deleting active profile, switch to the first remaining profile first
  if (currentActiveId === profileId) {
    const remaining = metaList.find((m) => m.id !== profileId)
    if (remaining) {
      await switchProfile(remaining.id)
      newActiveId = remaining.id
    }
  }

  // Reload metaList & profilesData after potential switch
  metaList = (await dbService.getItem(PROFILES_META_KEY)) || []
  metaList = metaList.filter((m) => m.id !== profileId)

  let profilesData = (await dbService.getItem(PROFILES_DATA_KEY)) || {}
  delete profilesData[profileId]

  await dbService.setItem(PROFILES_META_KEY, metaList)
  await dbService.setItem(PROFILES_DATA_KEY, profilesData)

  return { success: true, newActiveId }
}

/**
 * Duplicates a profile's data and metadata into a new profile.
 *
 * @param {string} profileId - ID of profile to duplicate.
 * @returns {Promise<Object|null>} Metadata of newly created duplicate profile.
 */
export async function duplicateProfile(profileId) {
  let metaList = (await dbService.getItem(PROFILES_META_KEY)) || []
  const sourceMeta = metaList.find((m) => m.id === profileId)
  if (!sourceMeta) return null

  const currentActiveId = (await dbService.getItem(ACTIVE_PROFILE_KEY)) || DEFAULT_PROFILE_ID
  let sourcePayload = null

  if (currentActiveId === profileId) {
    sourcePayload = await snapshotActivePayload()
  } else {
    let profilesData = (await dbService.getItem(PROFILES_DATA_KEY)) || {}
    sourcePayload = profilesData[profileId] || null
  }

  const newName = `${sourceMeta.name} (Copy)`
  const newMeta = await createProfile(newName, sourceMeta.avatarColor)

  if (sourcePayload) {
    await restoreActivePayload(sourcePayload)
  }

  return newMeta
}
