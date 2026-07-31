import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

/**
 * LocalStorage key used to persist user absence records across browser sessions.
 */
const STORAGE_KEY = 'bno_absences'

/**
 * Calculates the number of full days absent for a given period.
 * Departure (start) and return (end) days are partially spent in the UK and are excluded.
 * Only full 24-hour days spent entirely abroad are counted as days absent.
 *
 * @param {string} startDateStr - The start date string in 'YYYY-MM-DD' format (departure date).
 * @param {string} endDateStr - The end date string in 'YYYY-MM-DD' format (return date).
 * @returns {number} Total number of full days absent (returns 0 for invalid ranges or ranges with no full days absent).
 */
export function calculateDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)

  // Validate date objects and check if start date comes after end date
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0

  // Calculate difference in calendar days between start and end dates
  const diffTime = Math.abs(end - start)
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  // Exclude start date (departure) and end date (arrival); count only complete intermediate days
  return Math.max(0, diffDays - 1)
}

/**
 * Pinia store for managing absence records and calculating total days absent.
 * Handles state persistence with localStorage and reactive computations.
 */
export const useAbsentsStore = defineStore('absents', () => {
  // ---------------------------------------------------------------------------
  // State Initialization
  // ---------------------------------------------------------------------------

  // Attempt to restore previously saved absence records from browser storage
  const storedData = localStorage.getItem(STORAGE_KEY)
  const initialAbsences = storedData ? JSON.parse(storedData) : []

  /**
   * Primary reactive list of absence records.
   * Each record contains: id, startDate, endDate, dest, createdAt.
   */
  const absences = ref(initialAbsences)

  // ---------------------------------------------------------------------------
  // Persistence Watcher
  // ---------------------------------------------------------------------------

  // Automatically sync absence record modifications to localStorage
  watch(
    absences,
    (newVal) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
    },
    { deep: true },
  )

  // ---------------------------------------------------------------------------
  // Getters / Computed Properties
  // ---------------------------------------------------------------------------

  /**
   * Computed array of absences sorted chronologically by start date (ascending).
   */
  const sortedAbsences = computed(() => {
    return [...absences.value].sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
  })

  /**
   * Total number of days absent across all recorded absence entries.
   */
  const totalDaysAbsent = computed(() => {
    return absences.value.reduce((sum, item) => {
      return sum + calculateDays(item.startDate, item.endDate)
    }, 0)
  })

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Adds a new absence entry to the store.
   *
   * @param {Object} payload - The absence details.
   * @param {string} payload.startDate - Start date string (YYYY-MM-DD).
   * @param {string} payload.endDate - End date string (YYYY-MM-DD).
   * @param {string} [payload.dest=''] - Destination or reason for the absence.
   * @returns {Object} The created absence entry object.
   */
  function addAbsence({ startDate, endDate, dest = '' }) {
    const newEntry = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2),
      startDate,
      endDate,
      dest,
      createdAt: new Date().toISOString(),
    }
    absences.value.push(newEntry)
    return newEntry
  }

  /**
   * Updates an existing absence record by its ID with the provided fields.
   *
   * @param {string} id - The unique identifier of the absence entry to update.
   * @param {Object} updatedFields - Object containing the fields to update (e.g. startDate, endDate, dest).
   */
  function updateAbsence(id, updatedFields) {
    const index = absences.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      absences.value[index] = {
        ...absences.value[index],
        ...updatedFields,
      }
    }
  }

  /**
   * Removes an absence record by its unique ID.
   *
   * @param {string} id - The unique identifier of the absence entry to remove.
   */
  function removeAbsence(id) {
    absences.value = absences.value.filter((item) => item.id !== id)
  }

  /**
   * Clears all absence records from the store and localStorage.
   */
  function clearAbsences() {
    absences.value = []
  }

  return {
    absences,
    sortedAbsences,
    totalDaysAbsent,
    calculateDays,
    addAbsence,
    updateAbsence,
    removeAbsence,
    clearAbsences,
  }
})
