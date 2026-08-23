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
    if (parts.length !== 3 || parts.some((p) => isNaN(p))) return null
    const [y, m, d] = parts
    if (m < 1 || m > 12 || d < 1 || d > 31) return null
    const utcDate = new Date(Date.UTC(y, m - 1, d))
    if (
      utcDate.getUTCFullYear() !== y ||
      utcDate.getUTCMonth() !== m - 1 ||
      utcDate.getUTCDate() !== d
    ) {
      return null
    }
    return utcDate
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

/**
 * Calculates countdown breakdown (years, months, days) from reference date (defaults to today) to a target date.
 * Standardizes calculation in UTC to avoid local timezone offsets.
 * Returns null if target date is invalid, null, or not in the future (<= start date).
 *
 * @param {string|Date} targetDateInput - Target date in YYYY-MM-DD format or Date object.
 * @param {string|Date} [fromDateInput=null] - Reference start date (defaults to current date at UTC midnight).
 * @returns {{years: number, months: number, days: number}|null}
 */
export function getCountdownParts(targetDateInput, fromDateInput = null) {
  if (!targetDateInput) return null
  const target = parseDateUTC(targetDateInput)
  if (!target) return null

  let start
  if (fromDateInput) {
    start = parseDateUTC(fromDateInput)
  } else {
    const now = new Date()
    start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  }

  if (!start || target <= start) {
    return null
  }

  let years = target.getUTCFullYear() - start.getUTCFullYear()
  let months = target.getUTCMonth() - start.getUTCMonth()
  let days = target.getUTCDate() - start.getUTCDate()

  if (days < 0) {
    months -= 1
    // Get number of days in the month preceding target's current UTC month
    const prevMonthLastDay = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), 0),
    ).getUTCDate()
    days += prevMonthLastDay
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  if (years === 0 && months === 0 && days === 0) {
    return null
  }

  return { years, months, days }
}

/**
 * Formats a target date countdown into a human-readable string displaying the single most significant unit.
 * Example outputs:
 *  - '2 yrs to go' or '1 yr to go' (if years > 0)
 *  - '3 mos to go' or '1 mo to go' (if years === 0 and months > 0)
 *  - '12 days to go' or '1 day to go' (if years === 0, months === 0, and days > 0)
 *  - '剩餘 2 年' / '剩餘 3 個月' / '剩餘 12 日' (for zh-HK locale)
 *
 * @param {string|Date} targetDateInput - Target date.
 * @param {string} [locale='en-GB'] - Locale identifier ('en-GB' or 'zh-HK').
 * @param {string|Date} [fromDateInput=null] - Optional reference date (defaults to today).
 * @returns {string} Formatted countdown string or empty string if date is not in future.
 */
export function formatCountdown(targetDateInput, locale = 'en-GB', fromDateInput = null) {
  const parts = getCountdownParts(targetDateInput, fromDateInput)
  if (!parts) return ''

  const { years, months, days } = parts
  const isZh = locale && locale.startsWith('zh')

  if (years > 0) {
    if (isZh) {
      return `剩餘 ${years} 年`
    }
    return `${years} ${years === 1 ? 'yr' : 'yrs'} to go`
  }

  if (months > 0) {
    if (isZh) {
      return `剩餘 ${months} 個月`
    }
    return `${months} ${months === 1 ? 'mo' : 'mos'} to go`
  }

  if (days > 0) {
    if (isZh) {
      return `剩餘 ${days} 日`
    }
    return `${days} ${days === 1 ? 'day' : 'days'} to go`
  }

  return ''
}
