import { createI18n } from 'vue-i18n'
import en from '../locales/en.js'
import zhHK from '../locales/zh-HK.js'

/**
 * Checks whether a given language tag represents any Chinese locale.
 * Supports standard BCP 47 tags (e.g. 'zh', 'zh-HK', 'zh-TW', 'zh-CN', 'zh-SG', 'zh-MO', 'zh-Hant', 'zh-Hans', 'yue', 'yue-HK', etc.).
 *
 * @param {string} [lang] - Language tag to test.
 * @returns {boolean} True if the locale corresponds to Chinese.
 */
export function isChineseLocale(lang) {
  if (!lang || typeof lang !== 'string') return false
  const cleanLang = lang.trim().toLowerCase()
  if (!cleanLang) return false

  // Direct exact / prefix matching for Chinese language codes (zh, yue)
  if (
    cleanLang === 'zh' ||
    cleanLang.startsWith('zh-') ||
    cleanLang.startsWith('zh_') ||
    cleanLang === 'yue' ||
    cleanLang.startsWith('yue-') ||
    cleanLang.startsWith('yue_')
  ) {
    return true
  }

  // Script tags representing Traditional or Simplified Chinese (e.g. 'und-Hant', 'und-Hans')
  if (cleanLang.includes('hant') || cleanLang.includes('hans')) {
    return true
  }

  // Standard Intl.Locale inspection if supported in runtime
  if (typeof Intl !== 'undefined' && typeof Intl.Locale === 'function') {
    try {
      const parsed = new Intl.Locale(cleanLang)
      if (parsed.language === 'zh' || parsed.language === 'yue') {
        return true
      }
    } catch {
      // Ignore malformed locale tag error
    }
  }

  return false
}

/**
 * Determines starting locale from localStorage preference or browser language settings.
 * 1. Checks localStorage for explicit user preference ('zh-HK' or 'en').
 * 2. If not found, inspects browser languages (navigator.languages / navigator.language)
 *    and defaults to 'zh-HK' if any Chinese locale is detected.
 * 3. Fallback default is 'en'.
 *
 * @param {object} [customNavigator] - Optional custom navigator object (for testing / SSR).
 * @param {Storage|object} [customStorage] - Optional custom storage object (for testing).
 * @returns {'zh-HK'|'en'} Selected initial locale.
 */
export function getInitialLocale(customNavigator, customStorage) {
  // 1. Check saved preference in localStorage
  const storage =
    customStorage !== undefined
      ? customStorage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null

  if (storage) {
    try {
      const savedLocale = storage.getItem('bno_tracker_locale')
      if (savedLocale === 'zh-HK' || savedLocale === 'en') {
        return savedLocale
      }
    } catch {
      // Storage access may throw in restricted/sandboxed environments
    }
  }

  // 2. Detect from browser languages
  const nav =
    customNavigator !== undefined
      ? customNavigator
      : typeof navigator !== 'undefined'
        ? navigator
        : null

  if (nav) {
    const candidateLangs = []

    if (Array.isArray(nav.languages) && nav.languages.length > 0) {
      candidateLangs.push(...nav.languages)
    }
    if (nav.language) {
      candidateLangs.push(nav.language)
    }
    if (nav.userLanguage) {
      candidateLangs.push(nav.userLanguage)
    }
    if (nav.browserLanguage) {
      candidateLangs.push(nav.browserLanguage)
    }
    if (nav.systemLanguage) {
      candidateLangs.push(nav.systemLanguage)
    }

    if (candidateLangs.some((lang) => isChineseLocale(lang))) {
      return 'zh-HK'
    }
  }

  // 3. Default fallback
  return 'en'
}

const i18n = createI18n({
  legacy: false, // Use Composition API mode for vue-i18n
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  globalInjection: true, // Allow $t() in templates
  messages: {
    en,
    'zh-HK': zhHK,
  },
})

if (typeof window !== 'undefined') {
  window.__i18n__ = i18n
}

export default i18n
