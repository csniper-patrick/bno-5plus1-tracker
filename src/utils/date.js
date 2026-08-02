/**
 * Centralized Date Utilities for BNO 5+1 Tracker
 * Standardizes date parsing, UTC calculations, formatting, and day-range arithmetic.
 */

/**
 * Safely parses a 'YYYY-MM-DD' string or Date object to a UTC midnight Date object.
 * Standardizes date calculations to UTC to prevent local timezone offsets.
 *
 * @param {string|Date} dateInput - Input date string ('YYYY-MM-DD' or ISO string) or JS Date object.
 * @returns {Date|null} UTC midnight Date object or null if invalid.
 */
export function parseDateUTC(dateInput) {
  if (!dateInput) return null
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null
    return new Date(
      Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()),
    )
  }
  if (typeof dateInput === 'string') {
    const cleanStr = dateInput.split('T')[0]
    const parts = cleanStr.split('-').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return null
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  }
  return null
}

/**
 * Formats a Date object to 'YYYY-MM-DD' in UTC.
 *
 * @param {Date} dateObj - UTC Date object.
 * @returns {string} Date string in 'YYYY-MM-DD' format or empty string.
 */
export function formatDateUTC(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return ''
  const y = dateObj.getUTCFullYear()
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dateObj.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Normalizes any date value (Date object, string, ISO format) to a strict 'YYYY-MM-DD' string.
 *
 * @param {any} val - Input date.
 * @returns {string} Normalized YYYY-MM-DD string or empty string.
 */
export function normalizeDate(val) {
  if (!val) return ''
  if (val instanceof Date) {
    return formatDateUTC(val)
  }
  if (typeof val === 'string') {
    const cleanStr = val.split('T')[0]
    const parts = cleanStr.split('-')
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const y = parts[0].padStart(4, '0')
      const m = String(parts[1]).padStart(2, '0')
      const d = String(parts[2]).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  return String(val)
}

/**
 * Returns a 'YYYY-MM-DD' date string corresponding to 1 day before the given date string.
 *
 * @param {string} dateStr - Target date string in YYYY-MM-DD format.
 * @returns {string} YYYY-MM-DD date string for 1 day prior, or empty string if invalid.
 */
export function getOneDayBefore(dateStr) {
  const date = parseDateUTC(dateStr)
  if (!date) return ''
  date.setUTCDate(date.getUTCDate() - 1)
  return formatDateUTC(date)
}

/**
 * Calculates the maximum return date (10 years from visa start date) for Segment Tree boundaries.
 *
 * @param {string} visaStartDateStr - The visa start date string in 'YYYY-MM-DD' format.
 * @returns {string|null} Maximum return date in 'YYYY-MM-DD' format, or null if invalid.
 */
export function getMaxSegmentTreeReturnDate(visaStartDateStr) {
  const vStart = parseDateUTC(visaStartDateStr)
  if (!vStart) return null
  const maxDate = new Date(vStart)
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 10)
  return formatDateUTC(maxDate)
}

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
  const start = parseDateUTC(startDateStr)
  const end = parseDateUTC(endDateStr)

  if (!start || !end || end <= start) return 0

  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.round(diffTime / 86400000)

  return Math.max(0, diffDays - 1)
}

/**
 * Formats a YYYY-MM-DD date string to a human-readable locale display date.
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD format.
 * @param {string} [locale='en-GB'] - Locale identifier.
 * @returns {string} Formatted date string (e.g. '15 Jan 2024') or empty string.
 */
export function formatDisplayDate(dateStr, locale = 'en-GB') {
  const parsed = parseDateUTC(dateStr)
  if (!parsed) return ''
  return parsed.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
