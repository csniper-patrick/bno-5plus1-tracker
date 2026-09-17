import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import enLocale from '../src/locales/en.js'
import zhLocale from '../src/locales/zh-HK.js'
import { SOCIAL_PLATFORM_CONFIG, getSocialPlatformConfig } from '../src/constants/social.js'

describe('Reference Guidance Resources Data Integrity', () => {
  const allowedCategories = [
    'Visa Extension',
    'BNO Settlement',
    'Policy & Guidance',
    'Tax & Residence',
    'Living & Rights',
    'Qualifications & Tests',
    'Citizenship',
    'Travel & Entry',
    'Tools & Source',
  ]

  const refViewContent = fs.readFileSync(
    path.join(process.cwd(), 'src/views/ReferenceView.vue'),
    'utf8',
  )

  const enLinks = enLocale.reference.links
  const zhLinks = zhLocale.reference.links

  it('should define reference links in ReferenceView.vue, en.js, and zh-HK.js', () => {
    assert.ok(Object.keys(enLinks).length >= 40, 'Should have at least 40 reference links in EN')
    assert.ok(Object.keys(zhLinks).length >= 40, 'Should have at least 40 reference links in ZH')
    assert.strictEqual(
      Object.keys(enLinks).length,
      Object.keys(zhLinks).length,
      'EN and ZH-HK must have identical reference links count',
    )
  })

  it('should have 1-to-1 matching keys between ReferenceView.vue and locale definitions', () => {
    const linkIdRegex = /id:\s*['"]([^'"]+)['"]/g
    const viewIds = []
    let match
    while ((match = linkIdRegex.exec(refViewContent)) !== null) {
      viewIds.push(match[1])
    }

    const enKeys = Object.keys(enLinks)
    const zhKeys = Object.keys(zhLinks)

    for (const id of viewIds) {
      const key = id.replace(/-/g, '_')
      assert.ok(
        enKeys.includes(key),
        `Missing EN translation for reference link ID: "${id}" (expected key: "${key}")`,
      )
      assert.ok(
        zhKeys.includes(key),
        `Missing ZH-HK translation for reference link ID: "${id}" (expected key: "${key}")`,
      )
    }

    for (const key of enKeys) {
      assert.ok(
        zhKeys.includes(key),
        `Key "${key}" present in EN locale but missing in ZH-HK locale`,
      )
    }
  })

  it('should ensure each reference link has valid categories, non-empty descriptions, badges, and highlights', () => {
    for (const [key, item] of Object.entries(enLinks)) {
      const zhItem = zhLinks[key]

      assert.ok(item.title && item.title.trim().length > 5, `EN Title for ${key} is too short`)
      assert.ok(zhItem.title && zhItem.title.trim().length > 3, `ZH Title for ${key} is too short`)

      assert.ok(
        allowedCategories.includes(item.category),
        `Category "${item.category}" for ${key} is not in allowed list`,
      )

      assert.ok(item.badge && item.badge.trim().length > 1, `EN Badge for ${key} is missing`)
      assert.ok(zhItem.badge && zhItem.badge.trim().length > 1, `ZH Badge for ${key} is missing`)

      assert.ok(
        item.description && item.description.trim().length > 20,
        `EN Description for ${key} is too short or missing`,
      )
      assert.ok(
        zhItem.description && zhItem.description.trim().length > 15,
        `ZH Description for ${key} is too short or missing`,
      )

      assert.ok(
        Array.isArray(item.highlights) && item.highlights.length >= 3,
        `EN Highlights for ${key} should have at least 3 items`,
      )
      assert.ok(
        Array.isArray(zhItem.highlights) && zhItem.highlights.length >= 3,
        `ZH Highlights for ${key} should have at least 3 items`,
      )
      assert.strictEqual(
        item.highlights.length,
        zhItem.highlights.length,
        `Highlights count mismatch for ${key} between EN (${item.highlights.length}) and ZH (${zhItem.highlights.length})`,
      )
    }
  })

  it('should ensure all URLs in ReferenceView are well-formed HTTPS URLs without whitespace', () => {
    const urlRegex = /url:\s*(?:import\.meta\.env\.VITE_CI_PROJECT_URL\s*\|\|\s*)?['"]([^'"]+)['"]/g
    let match
    let count = 0
    while ((match = urlRegex.exec(refViewContent)) !== null) {
      const url = match[1]
      count++
      assert.ok(url.startsWith('https://'), `URL "${url}" must start with https://`)
      assert.strictEqual(url.includes(' '), false, `URL "${url}" must not contain spaces`)
    }
    assert.ok(count >= 40, 'Should have validated at least 40 URLs')
  })

  it('should ensure non-government organizations define valid social media channels', () => {
    const allowedPlatforms = Object.keys(SOCIAL_PLATFORM_CONFIG)

    const socialBlockRegex = /socials:\s*\[([\s\S]*?)\]/g
    let match
    let totalSocials = 0

    while ((match = socialBlockRegex.exec(refViewContent)) !== null) {
      const block = match[1]
      // Resilient entry parser: matches each object `{ ... }` across single or multiple lines
      const entryRegex = /{([\s\S]*?)}/g
      let entryMatch
      while ((entryMatch = entryRegex.exec(block)) !== null) {
        const entryStr = entryMatch[1]
        const platformMatch = entryStr.match(/platform:\s*['"]([^'"]+)['"]/)
        const urlMatch = entryStr.match(/url:\s*['"]([^'"]+)['"]/)

        assert.ok(platformMatch, `Social entry missing platform in: ${entryStr}`)
        assert.ok(urlMatch, `Social entry missing url in: ${entryStr}`)

        const platform = platformMatch[1]
        const url = urlMatch[1]
        totalSocials++

        assert.ok(
          allowedPlatforms.includes(platform),
          `Unknown social platform "${platform}" in ReferenceView.vue`,
        )
        assert.ok(url.startsWith('https://'), `Social media URL "${url}" must start with https://`)
        assert.strictEqual(
          url.includes(' '),
          false,
          `Social media URL "${url}" must not contain spaces`,
        )
      }
    }

    assert.ok(totalSocials >= 15, `Expected at least 15 social links, found ${totalSocials}`)
  })

  it('should validate SOCIAL_PLATFORM_CONFIG data structure and theme colors', () => {
    const platforms = Object.keys(SOCIAL_PLATFORM_CONFIG)
    assert.ok(platforms.length >= 7, 'Should configure at least 7 social platforms')

    for (const [platform, config] of Object.entries(SOCIAL_PLATFORM_CONFIG)) {
      assert.ok(config.label && config.label.trim().length > 0, `Label missing for ${platform}`)
      assert.ok(
        (config.icon && config.icon.startsWith('mdi-')) ||
        (config.svgPath && config.svgPath.startsWith('M')),
        `Platform ${platform} must define a valid MDI icon or SVG path`,
      )
      if (config.colorLight) {
        assert.match(
          config.colorLight,
          /^#[0-9A-Fa-f]{6}$/,
          `Invalid colorLight hex for ${platform}`,
        )
      }
      if (config.colorDark) {
        assert.match(config.colorDark, /^#[0-9A-Fa-f]{6}$/, `Invalid colorDark hex for ${platform}`)
      }
    }

    const fallback = getSocialPlatformConfig('non_existent_platform')
    assert.strictEqual(fallback.label, 'non_existent_platform')
    assert.strictEqual(fallback.icon, 'mdi-open-in-new')
  })
})
