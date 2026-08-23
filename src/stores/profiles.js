import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as profileService from '../services/profileService.js'
import { useAbsentsStore } from './absents.js'
import { useDocumentsStore } from './documents.js'

/**
 * Pinia Store for managing multi-profile state, active profile selection,
 * and triggering store updates upon profile swapping.
 */
export const useProfilesStore = defineStore('profiles', () => {
  const isInitialized = ref(false)
  const isLoading = ref(false)

  /** List of profile metadata objects [{ id, name, avatarColor, createdAt, updatedAt }] */
  const profilesList = ref([])

  /** Currently active profile ID */
  const activeProfileId = ref(profileService.DEFAULT_PROFILE_ID)

  /** Currently active profile metadata object */
  const activeProfile = computed(() => {
    const found = profilesList.value.find((p) => p.id === activeProfileId.value)
    if (found) {
      return { ...found }
    }
    return {
      id: profileService.DEFAULT_PROFILE_ID,
      name: profileService.DEFAULT_PROFILE_NAME,
      avatarColor: profileService.DEFAULT_PROFILE_COLOR,
    }
  })

  /**
   * Re-initializes connected reactive stores (absents, documents) after a profile swap.
   */
  async function reloadConnectedStores() {
    const absentsStore = useAbsentsStore()
    const documentsStore = useDocumentsStore()
    await absentsStore.initStore()
    await documentsStore.initStore()
  }

  /**
   * Initializes profiles store state from IndexedDB.
   */
  async function initStore() {
    isLoading.value = true
    try {
      const { activeId, metaList } = await profileService.initProfiles()
      activeProfileId.value = activeId
      profilesList.value = metaList.map((p) => ({ ...p }))
      isInitialized.value = true
    } catch (e) {
      console.error('profilesStore.initStore error:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Switches active profile to target profile ID and reloads active stores.
   *
   * @param {string} targetProfileId
   * @returns {Promise<boolean>}
   */
  async function switchProfile(targetProfileId) {
    if (targetProfileId === activeProfileId.value) return true
    isLoading.value = true
    try {
      const success = await profileService.switchProfile(targetProfileId)
      if (success) {
        activeProfileId.value = targetProfileId
        const { metaList } = await profileService.initProfiles()
        profilesList.value = metaList.map((p) => ({ ...p }))
        await reloadConnectedStores()
      }
      return success
    } catch (e) {
      console.error('profilesStore.switchProfile error:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Creates a new profile and automatically switches to it.
   *
   * @param {string} name
   * @param {string} [avatarColor]
   * @returns {Promise<Object|null>} Newly created profile metadata or null.
   */
  async function createProfile(name, avatarColor) {
    isLoading.value = true
    try {
      const newMeta = await profileService.createProfile(name, avatarColor)
      if (newMeta) {
        const { activeId, metaList } = await profileService.initProfiles()
        activeProfileId.value = activeId
        profilesList.value = metaList.map((p) => ({ ...p }))
        await reloadConnectedStores()
      }
      return newMeta
    } catch (e) {
      console.error('profilesStore.createProfile error:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Renames / updates active or specified profile metadata.
   *
   * @param {string} profileId
   * @param {Object} updates - { name, avatarColor }
   */
  async function updateProfile(profileId, updates) {
    try {
      const updatedList = await profileService.updateProfileMeta(profileId, updates)
      profilesList.value = updatedList.map((p) => ({ ...p }))
    } catch (e) {
      console.error('profilesStore.updateProfile error:', e)
    }
  }

  /**
   * Deletes a profile by ID.
   *
   * @param {string} profileId
   * @returns {Promise<boolean>}
   */
  async function deleteProfile(profileId) {
    isLoading.value = true
    try {
      const { success, newActiveId } = await profileService.deleteProfile(profileId)
      if (success) {
        const { activeId, metaList } = await profileService.initProfiles()
        activeProfileId.value = activeId
        profilesList.value = metaList
        await reloadConnectedStores()
      }
      return success
    } catch (e) {
      console.error('profilesStore.deleteProfile error:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Duplicates a profile by ID.
   *
   * @param {string} profileId
   * @returns {Promise<Object|null>}
   */
  async function duplicateProfile(profileId) {
    isLoading.value = true
    try {
      const newMeta = await profileService.duplicateProfile(profileId)
      if (newMeta) {
        const { activeId, metaList } = await profileService.initProfiles()
        activeProfileId.value = activeId
        profilesList.value = metaList
        await reloadConnectedStores()
      }
      return newMeta
    } catch (e) {
      console.error('profilesStore.duplicateProfile error:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Copies an absence record to one or more target profiles, preserving its ID and data integrity.
   *
   * @param {Object} record - Absence record to copy.
   * @param {string|Array<string>} targetProfileIds - Target profile ID or list of IDs.
   * @returns {Promise<{ success: boolean, count: number }>}
   */
  async function copyAbsenceToProfiles(record, targetProfileIds) {
    try {
      const result = await profileService.copyAbsenceToProfiles(record, targetProfileIds)
      return result
    } catch (e) {
      console.error('profilesStore.copyAbsenceToProfiles error:', e)
      return { success: false, count: 0 }
    }
  }

  /**
   * Copies an absence record to a single target profile.
   *
   * @param {Object} record - Absence record to copy.
   * @param {string} targetProfileId - Target profile ID.
   * @returns {Promise<{ success: boolean, count: number }>}
   */
  async function copyAbsenceToProfile(record, targetProfileId) {
    return copyAbsenceToProfiles(record, [targetProfileId])
  }

  return {
    isInitialized,
    isLoading,
    profilesList,
    activeProfileId,
    activeProfile,
    initStore,
    switchProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    duplicateProfile,
    copyAbsenceToProfiles,
    copyAbsenceToProfile,
  }
})
