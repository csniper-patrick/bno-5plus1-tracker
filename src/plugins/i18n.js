import { createI18n } from 'vue-i18n'
import en from '../locales/en.js'
import zhHK from '../locales/zh-HK.js'

/**
 * Determines starting locale from localStorage preference or browser language.
 * Default is 'zh-HK' if browser prefers Chinese (HK/TW/ZH), otherwise 'en'.
 */
function getInitialLocale() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedLocale = window.localStorage.getItem('bno_tracker_locale')
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'zh-HK')) {
      return savedLocale
    }
  }

  if (typeof navigator !== 'undefined') {
    const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase()
    if (navLang.includes('zh') || navLang.includes('hk') || navLang.includes('tw')) {
      return 'zh-HK'
    }
  }

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

export default i18n
