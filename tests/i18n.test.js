import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isChineseLocale, getInitialLocale } from '../src/plugins/i18n.js'

describe('Chinese Locale Detection (isChineseLocale)', () => {
  it('should identify standard Chinese language tags and regions', () => {
    const chineseLocales = [
      'zh',
      'zh-HK',
      'zh-hk',
      'ZH-HK',
      'zh-TW',
      'zh-tw',
      'zh-CN',
      'zh-cn',
      'zh-SG',
      'zh-sg',
      'zh-MO',
      'zh-mo',
      'zh-Hans',
      'zh-Hant',
      'zh-Hant-HK',
      'zh-Hant-TW',
      'zh-Hans-CN',
      'zh_HK',
      'zh_TW',
      'zh_CN',
    ]

    for (const locale of chineseLocales) {
      assert.strictEqual(
        isChineseLocale(locale),
        true,
        `Expected ${locale} to be recognized as a Chinese locale`,
      )
    }
  })

  it('should identify Cantonese and script variant tags', () => {
    const cantoneseAndScripts = [
      'yue',
      'yue-HK',
      'yue-hk',
      'yue-Hant',
      'yue-Hans',
      'zh-yue',
      'und-Hant',
      'und-Hans',
    ]

    for (const locale of cantoneseAndScripts) {
      assert.strictEqual(
        isChineseLocale(locale),
        true,
        `Expected ${locale} to be recognized as a Chinese locale`,
      )
    }
  })

  it('should reject non-Chinese languages including regional English', () => {
    const nonChineseLocales = [
      'en',
      'en-US',
      'en-GB',
      'en-HK', // English in Hong Kong -> not Chinese
      'en-TW',
      'en-CA',
      'en-AU',
      'fr',
      'fr-FR',
      'de-DE',
      'ja',
      'ja-JP',
      'ko-KR',
      'es-ES',
      'pt-BR',
      'it-IT',
    ]

    for (const locale of nonChineseLocales) {
      assert.strictEqual(
        isChineseLocale(locale),
        false,
        `Expected ${locale} NOT to be recognized as a Chinese locale`,
      )
    }
  })

  it('should handle falsy, non-string, or malformed inputs safely', () => {
    assert.strictEqual(isChineseLocale(null), false)
    assert.strictEqual(isChineseLocale(undefined), false)
    assert.strictEqual(isChineseLocale(''), false)
    assert.strictEqual(isChineseLocale('   '), false)
    assert.strictEqual(isChineseLocale(123), false)
    assert.strictEqual(isChineseLocale({}), false)
    assert.strictEqual(isChineseLocale(['zh']), false)
  })
})

describe('Initial Locale Resolution (getInitialLocale)', () => {
  function createMockStorage(store = {}) {
    return {
      getItem(key) {
        return store[key] || null
      },
      setItem(key, value) {
        store[key] = String(value)
      },
    }
  }

  it('should prioritize localStorage saved choice over browser language', () => {
    // User explicitly saved 'en' even though browser is 'zh-HK'
    const storageEn = createMockStorage({ bno_tracker_locale: 'en' })
    const navZh = { language: 'zh-HK', languages: ['zh-HK', 'en'] }
    assert.strictEqual(getInitialLocale(navZh, storageEn), 'en')

    // User explicitly saved 'zh-HK' even though browser is 'en-GB'
    const storageZh = createMockStorage({ bno_tracker_locale: 'zh-HK' })
    const navEn = { language: 'en-GB', languages: ['en-GB', 'en'] }
    assert.strictEqual(getInitialLocale(navEn, storageZh), 'zh-HK')
  })

  it('should ignore invalid or unknown values in localStorage and fallback to browser detection', () => {
    const storageInvalid = createMockStorage({ bno_tracker_locale: 'fr' })
    const navZh = { language: 'zh-CN', languages: ['zh-CN'] }
    assert.strictEqual(getInitialLocale(navZh, storageInvalid), 'zh-HK')

    const navEn = { language: 'en-US', languages: ['en-US'] }
    assert.strictEqual(getInitialLocale(navEn, storageInvalid), 'en')
  })

  it('should detect Chinese locale from navigator.languages list', () => {
    const emptyStorage = createMockStorage()

    // Chinese as preferred secondary language
    const nav1 = { language: 'en-US', languages: ['en-US', 'zh-HK'] }
    assert.strictEqual(getInitialLocale(nav1, emptyStorage), 'zh-HK')

    // Chinese as primary language
    const nav2 = { language: 'zh-TW', languages: ['zh-TW', 'en'] }
    assert.strictEqual(getInitialLocale(nav2, emptyStorage), 'zh-HK')

    // Cantonese language in list
    const nav3 = { language: 'yue-HK', languages: ['yue-HK', 'en'] }
    assert.strictEqual(getInitialLocale(nav3, emptyStorage), 'zh-HK')
  })

  it('should detect Chinese locale from navigator.language, userLanguage, browserLanguage, or systemLanguage', () => {
    const emptyStorage = createMockStorage()

    assert.strictEqual(getInitialLocale({ language: 'zh-CN' }, emptyStorage), 'zh-HK')
    assert.strictEqual(getInitialLocale({ userLanguage: 'zh-HK' }, emptyStorage), 'zh-HK')
    assert.strictEqual(getInitialLocale({ browserLanguage: 'zh-TW' }, emptyStorage), 'zh-HK')
    assert.strictEqual(getInitialLocale({ systemLanguage: 'zh-SG' }, emptyStorage), 'zh-HK')
  })

  it('should fallback to English when browser language is not Chinese', () => {
    const emptyStorage = createMockStorage()

    assert.strictEqual(getInitialLocale({ language: 'en-US', languages: ['en-US'] }, emptyStorage), 'en')
    assert.strictEqual(getInitialLocale({ language: 'en-GB', languages: ['en-GB'] }, emptyStorage), 'en')
    assert.strictEqual(getInitialLocale({ language: 'en-HK', languages: ['en-HK'] }, emptyStorage), 'en')
    assert.strictEqual(getInitialLocale({ language: 'ja-JP', languages: ['ja-JP'] }, emptyStorage), 'en')
    assert.strictEqual(getInitialLocale({ language: 'fr-FR', languages: ['fr-FR'] }, emptyStorage), 'en')
  })

  it('should fallback to English when navigator and storage are null or undefined', () => {
    assert.strictEqual(getInitialLocale(null, null), 'en')
    assert.strictEqual(getInitialLocale(undefined, undefined), 'en')
    assert.strictEqual(getInitialLocale({}, {}), 'en')
  })

  it('should gracefully handle localStorage throwing access exceptions', () => {
    const throwingStorage = {
      getItem() {
        throw new Error('Access denied / Private browsing mode')
      },
    }
    const navZh = { language: 'zh-TW', languages: ['zh-TW'] }
    assert.strictEqual(getInitialLocale(navZh, throwingStorage), 'zh-HK')

    const navEn = { language: 'en-US', languages: ['en-US'] }
    assert.strictEqual(getInitialLocale(navEn, throwingStorage), 'en')
  })
})

