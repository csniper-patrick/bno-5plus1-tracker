/**
 * Utility for generating unique string IDs.
 * Uses crypto.randomUUID when available, with a random fallback for older environments.
 *
 * @param {string} [prefix=''] - Optional prefix string for the generated ID.
 * @returns {string} Unique identifier string.
 */
export function generateId(prefix = '') {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).substring(2)

  return prefix ? `${prefix}_${randomPart}` : randomPart
}
