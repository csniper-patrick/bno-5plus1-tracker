/**
 * Formatting Utility Functions for BNO 5+1 Tracker
 */

/**
 * Formats a National Insurance Number (NIN / NINO) into standard UK format: 'AA 12 34 56 A'.
 * Converts input to uppercase, strips non-alphanumeric characters, and inserts space delimiters.
 *
 * @param {string} val - Raw NIN input string.
 * @returns {string} Formatted NIN string (e.g. 'QQ 12 34 56 A').
 */
export function formatNin(val) {
  if (!val) return ''
  const clean = String(val).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9)
  if (!clean) return ''

  if (clean.length <= 2) return clean
  if (clean.length <= 4) return `${clean.slice(0, 2)} ${clean.slice(2)}`
  if (clean.length <= 6) return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4)}`
  if (clean.length <= 8) return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6)}`
  return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)} ${clean.slice(8)}`
}
