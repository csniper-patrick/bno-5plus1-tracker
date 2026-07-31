import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'bno_absences'

/**
 * Calculates the number of full days absent for a given period.
 * Dates are expected in 'YYYY-MM-DD' format.
 */
export function calculateDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0
  const diffTime = Math.abs(end - start)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays
}

export const useAbsentsStore = defineStore('absents', () => {
  // Load initial state from localStorage if available
  const storedData = localStorage.getItem(STORAGE_KEY)
  const initialAbsences = storedData ? JSON.parse(storedData) : []

  const absences = ref(initialAbsences)

  // Save changes to localStorage automatically
  watch(
    absences,
    (newVal) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
    },
    { deep: true },
  )

  // Getters
  const sortedAbsences = computed(() => {
    return [...absences.value].sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
  })

  const totalDaysAbsent = computed(() => {
    return absences.value.reduce((sum, item) => {
      return sum + calculateDays(item.startDate, item.endDate)
    }, 0)
  })

  // Actions
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

  function updateAbsence(id, updatedFields) {
    const index = absences.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      absences.value[index] = {
        ...absences.value[index],
        ...updatedFields,
      }
    }
  }

  function removeAbsence(id) {
    absences.value = absences.value.filter((item) => item.id !== id)
  }

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
