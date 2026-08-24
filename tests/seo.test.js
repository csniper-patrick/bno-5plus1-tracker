import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  SEO_CONFIG,
  getSeoMeta,
  getBaseUrl,
  generateSitemapXml,
  generateRobotsTxt,
  FALLBACK_BASE_URL,
  SITE_NAME,
} from '../src/utils/seo.js'

describe('SEO Metadata & JSON-LD Utilities', () => {
  test('should have defined SEO configurations for all primary routes', () => {
    const requiredRoutes = ['home', 'documents', 'reference', 'instruction']
    for (const route of requiredRoutes) {
      assert.ok(SEO_CONFIG[route], `Missing SEO configuration for ${route}`)
      assert.ok(SEO_CONFIG[route].title.length > 10, `${route} title should be descriptive`)
      assert.ok(SEO_CONFIG[route].description.length > 30, `${route} description should be descriptive`)
      assert.ok(SEO_CONFIG[route].keywords.length > 10, `${route} keywords should not be empty`)
      assert.ok(SEO_CONFIG[route].schema, `${route} should have Schema.org structured data`)
    }
  })

  test('should return complete Unhead metadata for home route', () => {
    const baseUrl = getBaseUrl()
    const meta = getSeoMeta('home')
    assert.ok(meta.title.includes('BNO 5+1 Tracker'))
    assert.ok(meta.title.includes('離英天數計算器'))

    // Check meta tags
    const descTag = meta.meta.find((m) => m.name === 'description')
    assert.ok(descTag && descTag.content.includes('BNO visa holders'))

    const ogTitle = meta.meta.find((m) => m.property === 'og:title')
    assert.equal(ogTitle.content, meta.title)

    const ogSiteName = meta.meta.find((m) => m.property === 'og:site_name')
    assert.equal(ogSiteName.content, SITE_NAME)

    const ogImage = meta.meta.find((m) => m.property === 'og:image')
    assert.equal(ogImage.content, `${baseUrl}/og-image.png`)

    const twitterCard = meta.meta.find((m) => m.name === 'twitter:card')
    assert.equal(twitterCard.content, 'summary_large_image')

    // Check canonical link
    assert.equal(meta.link[0].rel, 'canonical')
    assert.equal(meta.link[0].href, `${baseUrl}/`)

    // Check WebApplication JSON-LD schema
    assert.ok(meta.script.length > 0)
    const jsonLd = JSON.parse(meta.script[0].innerHTML)
    assert.equal(jsonLd['@context'], 'https://schema.org')
    assert.equal(jsonLd['@type'], 'WebApplication')
    assert.equal(jsonLd.name, 'BNO 5+1 Tracker')
    assert.equal(jsonLd.url, `${baseUrl}/`)
    assert.equal(jsonLd.screenshot, `${baseUrl}/og-image.png`)
    assert.ok(Array.isArray(jsonLd.featureList))
    assert.ok(jsonLd.featureList.length >= 5)
  })

  test('should return BreadcrumbList schema for documents route', () => {
    const baseUrl = getBaseUrl()
    const meta = getSeoMeta('documents')
    assert.ok(meta.title.includes('Document Checklist'))
    assert.equal(meta.link[0].href, `${baseUrl}/documents`)

    const jsonLd = JSON.parse(meta.script[0].innerHTML)
    assert.equal(jsonLd['@type'], 'BreadcrumbList')
    assert.equal(jsonLd.itemListElement.length, 2)
    assert.equal(jsonLd.itemListElement[0].item, `${baseUrl}/`)
    assert.equal(jsonLd.itemListElement[1].name, 'Document Checklist & Vault')
    assert.equal(jsonLd.itemListElement[1].item, `${baseUrl}/documents`)
  })

  test('should return FAQPage schema for reference route', () => {
    const baseUrl = getBaseUrl()
    const meta = getSeoMeta('reference')
    assert.ok(meta.title.includes('Official Guidance'))
    assert.equal(meta.link[0].href, `${baseUrl}/reference`)

    const jsonLd = JSON.parse(meta.script[0].innerHTML)
    assert.equal(jsonLd['@type'], 'FAQPage')
    assert.ok(jsonLd.mainEntity.length >= 3)
    assert.ok(jsonLd.mainEntity.some((q) => q.name.includes('180-day rolling rule')))
  })

  test('should return HowTo and FAQPage schemas for instruction route', () => {
    const baseUrl = getBaseUrl()
    const meta = getSeoMeta('instruction')
    assert.ok(meta.title.includes('User Guide'))
    assert.equal(meta.link[0].href, `${baseUrl}/instruction`)

    assert.equal(meta.script.length, 2)
    const howTo = JSON.parse(meta.script[0].innerHTML)
    const faq = JSON.parse(meta.script[1].innerHTML)

    assert.equal(howTo['@type'], 'HowTo')
    assert.ok(howTo.step.length >= 4)

    assert.equal(faq['@type'], 'FAQPage')
    assert.ok(faq.mainEntity.length >= 2)
  })

  test('should dynamically generate SEO metadata for custom CI_PAGES_URL', () => {
    const customUrl = 'https://custom-domain.example.com/subpath/'
    const normalized = 'https://custom-domain.example.com/subpath'
    const meta = getSeoMeta('documents', customUrl)

    assert.equal(meta.link[0].href, `${normalized}/documents`)
    const ogUrl = meta.meta.find((m) => m.property === 'og:url')
    assert.equal(ogUrl.content, `${normalized}/documents`)

    const ogImage = meta.meta.find((m) => m.property === 'og:image')
    assert.equal(ogImage.content, `${normalized}/og-image.png`)

    const jsonLd = JSON.parse(meta.script[0].innerHTML)
    assert.equal(jsonLd.itemListElement[1].item, `${normalized}/documents`)
  })

  test('should generate valid sitemap.xml for target URL', () => {
    const customUrl = 'https://custom-pages.example.com'
    const sitemap = generateSitemapXml(customUrl)

    assert.ok(sitemap.includes('<?xml version="1.0" encoding="UTF-8"?>'))
    assert.ok(sitemap.includes('<loc>https://custom-pages.example.com/</loc>'))
    assert.ok(sitemap.includes('<loc>https://custom-pages.example.com/documents</loc>'))
    assert.ok(sitemap.includes('<loc>https://custom-pages.example.com/reference</loc>'))
    assert.ok(sitemap.includes('<loc>https://custom-pages.example.com/instruction</loc>'))
  })

  test('should generate valid robots.txt with dynamic sitemap location', () => {
    const customUrl = 'https://custom-pages.example.com'
    const robots = generateRobotsTxt(customUrl)

    assert.ok(robots.includes('User-agent: *'))
    assert.ok(robots.includes('Allow: /'))
    assert.ok(robots.includes('Sitemap: https://custom-pages.example.com/sitemap.xml'))
  })

  test('should fallback gracefully to home for unknown route key', () => {
    const baseUrl = getBaseUrl()
    const fallbackMeta = getSeoMeta('unknown_route')
    assert.ok(fallbackMeta.title.includes('BNO 5+1 Tracker'))
    assert.equal(fallbackMeta.link[0].href, `${baseUrl}/`)
  })
})
