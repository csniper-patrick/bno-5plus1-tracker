/**
 * Centralized SEO Metadata and Structured Data (JSON-LD) Utility
 * Dynamically resolves the base URL from the GitLab CI environment (CI_PAGES_URL / VITE_CI_PAGES_URL)
 * and generates route-specific titles, descriptions, canonical URLs,
 * Open Graph / Twitter tags, and Schema.org rich snippets for BNO 5+1 Tracker.
 */

export const FALLBACK_BASE_URL = 'https://csniper.gitlab.io/bno-5plus1-tracker'
export const SITE_NAME = 'BNO 5+1 Tracker'

/**
 * Dynamically resolves the active deployment base URL.
 * Prioritizes CI_PAGES_URL / VITE_CI_PAGES_URL from GitLab CI environment variables,
 * falling back to the standard repository Pages domain.
 * @returns {string} Normalized base URL without trailing slash
 */
export function getBaseUrl() {
  let envUrl = null

  if (typeof process !== 'undefined' && process.env) {
    envUrl = process.env.VITE_CI_PAGES_URL || process.env.CI_PAGES_URL
  }

  if (!envUrl && typeof import.meta !== 'undefined' && import.meta.env) {
    envUrl = import.meta.env.VITE_CI_PAGES_URL || import.meta.env.CI_PAGES_URL
  }

  return String(envUrl || FALLBACK_BASE_URL)
    .trim()
    .replace(/\/+$/, '')
}

export const BASE_URL = getBaseUrl()
export const DEFAULT_OG_IMAGE = `${getBaseUrl()}/og-image.png`

/**
 * Returns dynamic route configuration dictionary based on target base URL.
 * @param {string} baseUrl
 * @returns {Record<string, object>}
 */
export function getSeoConfigBuilder(baseUrl = getBaseUrl()) {
  const normalizedBase = String(baseUrl).trim().replace(/\/+$/, '')
  const ogImageUrl = `${normalizedBase}/og-image.png`

  return {
    home: {
      title: 'BNO 5+1 Tracker - UK Absence & ILR Settlement Calculator (離英天數計算器)',
      description:
        'Free offline calculator for Hong Kong BNO visa holders. Track 180-day rolling absences for ILR settlement, 450-day limits for British citizenship, and milestone countdowns.',
      keywords:
        'BNO 5+1, BNO absence tracker, 180 day rolling rule, UK settlement calculator, ILR absence calculator, BNO naturalisation, 離英天數, BNO 離境計算機, BNO 5+1 永居, BNO 入籍 450日, UK continuous residence',
      path: '',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'BNO 5+1 Tracker',
        alternateName: 'BNO 5+1 離英天數計算器及永居追蹤器',
        url: `${normalizedBase}/`,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'All (Web, iOS, Android PWA)',
        browserRequirements: 'Requires JavaScript. Requires HTML5 IndexedDB storage.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'GBP',
        },
        description:
          'Client-side offline-first calculator for BNO visa holders tracking UK absences, 180-day rolling rule, 450-day citizenship limit, and ILR continuous residence evidence.',
        featureList: [
          '180-day continuous residence rolling window calculator',
          '450-day and 90-day British citizenship naturalisation tracking',
          'Settlement milestone and 28-day early application window countdown',
          'Encrypted local Document Vault and 5-Year continuous residence checklist',
          'Life in the UK & B1 English language qualification management',
          'Multi-profile family member absence sharing and companion synchronization',
          '100% offline device privacy with IndexedDB storage',
        ],
        screenshot: ogImageUrl,
      },
    },

    documents: {
      title: 'Document Checklist & Vault - BNO 5+1 Tracker (5年永居文件清單)',
      description:
        'Comprehensive 5-year UK continuous residence evidence checklist, Life in the UK test details (URN), B1 English requirement, National Insurance, and local encrypted Document Vault.',
      keywords:
        'BNO document checklist, BNO ILR documents, continuous residence proof UK, Life in the UK test URN, B1 English SELT, Council Tax proof, P60 evidence, BNO 永居 文件清單, BNO 居英證明',
      path: 'documents',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${normalizedBase}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Document Checklist & Vault',
            item: `${normalizedBase}/documents`,
          },
        ],
      },
    },

    reference: {
      title: 'Official Guidance & Policy Resources - BNO 5+1 Tracker (官方指引及法規)',
      description:
        'Curated official UK Home Office guidance, Appendix Continuous Residence rules, IHS fees, tax residence, and verified community support for BNO visa holders.',
      keywords:
        'BNO official guidance, GOV.UK BNO visa, Appendix HK, Appendix Continuous Residence, Statutory Residence Test, BNO visa extension fees, BNO 官方指引, 居英權法規',
      path: 'reference',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is the 180-day rolling rule for BNO ILR settlement?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Under UK Home Office Appendix Continuous Residence, applicants for Indefinite Leave to Remain (ILR) must not have been outside the UK for more than 180 days in any continuous 12-month rolling period during their 5-year qualifying period.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do departure and return travel days count as absences?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. Under UK Home Office rules, only full 24-hour days spent entirely outside the UK count toward your absence totals. Any calendar day where part of the 24 hours is spent in the UK (such as departure date and return date) is excluded from absence counts.',
            },
          },
          {
            '@type': 'Question',
            name: 'When can I submit my BNO ILR settlement application?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'You can apply for Indefinite Leave to Remain (ILR) up to 28 days before completing your 5-year continuous residence qualifying period.',
            },
          },
          {
            '@type': 'Question',
            name: 'What are the absence limits for British Citizenship (Naturalisation)?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'For British Citizenship naturalisation under the British Nationality Act 1981, you must not exceed 450 days absent across the 5-year qualifying period, and no more than 90 days absent in the final 12 months immediately preceding your application date.',
            },
          },
        ],
      },
    },

    instruction: {
      title: 'User Guide & Operation Manual - BNO 5+1 Tracker (使用教學及指南)',
      description:
        'Step-by-step tutorial with visual screen demonstrations for UK BNO 5+1 settlement tracking, 180-day calculation rules, and data backup instructions.',
      keywords:
        'BNO tracker guide, BNO absence calculator instructions, how to calculate BNO absences, BNO tracker tutorial, BNO 5+1 使用教學, 離英天數教學',
      path: 'instruction',
      schema: [
        {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to Track UK Absences & Continuous Residence on the BNO 5+1 Route',
          description:
            'Step-by-step guide to calculating rolling absences, monitoring ILR eligibility, and managing settlement documents for Hong Kong BNO visa holders.',
          step: [
            {
              '@type': 'HowToStep',
              name: 'Set Key Visa & Arrival Dates',
              text: 'Enter your BNO Visa Start Date and UK Arrival Date. The calculator initializes your 5-year qualifying window and 28-day early application date.',
              position: 1,
            },
            {
              '@type': 'HowToStep',
              name: 'Log Travel Absence Records',
              text: 'Add past or scheduled trips outside the UK. Departure and return dates are automatically excluded according to UK Home Office continuous residence rules.',
              position: 2,
            },
            {
              '@type': 'HowToStep',
              name: 'Check Document Readiness & Residence Checklist',
              text: 'Track your Life in the UK test URN, B1 English qualification, National Insurance number, and annual Council Tax / utility evidence checklist.',
              position: 3,
            },
            {
              '@type': 'HowToStep',
              name: 'Export Encrypted ZIP / YAML Backups',
              text: 'Export your entire tracker data and uploaded vault files to a safe ZIP backup archive stored locally on your device.',
              position: 4,
            },
            {
              '@type': 'HowToStep',
              name: 'Manage Multi-Applicant Family Profiles',
              text: 'Create profiles for spouse and dependants with individual visa dates and sync shared family travel journeys across profiles.',
              position: 5,
            },
          ],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Is my personal immigration data private and secure?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. All data entered is stored 100% locally inside your browser using IndexedDB. No dates, notes, or uploaded documents are transmitted to any external server.',
              },
            },
            {
              '@type': 'Question',
              name: 'How does the 180-day rolling rule calculation work?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'The tracker scans every possible continuous 365-day window across your 5-year qualifying period. If any single 365-day window exceeds 180 days absent, it calculates the delay required to restore continuous residence compliance.',
              },
            },
          ],
        },
      ],
    },
  }
}

export const SEO_CONFIG = getSeoConfigBuilder()

/**
 * Returns Unhead-compatible head object with title, meta tags, canonical link, Open Graph, Twitter, and Schema.org JSON-LD.
 * @param {'home' | 'documents' | 'reference' | 'instruction'} routeKey
 * @param {string} [customBaseUrl]
 * @returns {object} Unhead configuration
 */
export function getSeoMeta(routeKey, customBaseUrl) {
  const baseUrl = customBaseUrl ? String(customBaseUrl).trim().replace(/\/+$/, '') : getBaseUrl()
  const config = getSeoConfigBuilder(baseUrl)[routeKey] || getSeoConfigBuilder(baseUrl).home
  const canonicalUrl = config.path ? `${baseUrl}/${config.path}` : `${baseUrl}/`
  const ogImageUrl = `${baseUrl}/og-image.png`

  const scripts = []
  if (config.schema) {
    const schemas = Array.isArray(config.schema) ? config.schema : [config.schema]
    for (const s of schemas) {
      scripts.push({
        type: 'application/ld+json',
        innerHTML: JSON.stringify(s),
      })
    }
  }

  return {
    title: config.title,
    meta: [
      { name: 'description', content: config.description },
      { name: 'keywords', content: config.keywords },
      { name: 'author', content: 'CSniper' },

      // Open Graph / Facebook
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: config.title },
      { property: 'og:description', content: config.description },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:image', content: ogImageUrl },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: config.title },

      // Twitter / X
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: config.title },
      { name: 'twitter:description', content: config.description },
      { name: 'twitter:image', content: ogImageUrl },
    ],
    link: [{ rel: 'canonical', href: canonicalUrl }],
    script: scripts,
  }
}

/**
 * Dynamically generates XML sitemap content.
 * @param {string} [baseUrl]
 * @returns {string} XML string
 */
export function generateSitemapXml(baseUrl = getBaseUrl()) {
  const normalizedBase = String(baseUrl).trim().replace(/\/+$/, '')
  const routes = [
    { path: '', changefreq: 'weekly', priority: '1.0' },
    { path: 'documents', changefreq: 'monthly', priority: '0.8' },
    { path: 'reference', changefreq: 'weekly', priority: '0.9' },
    { path: 'instruction', changefreq: 'monthly', priority: '0.8' },
  ]

  const items = routes
    .map(
      (r) => `  <url>
    <loc>${normalizedBase}/${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${items}
</urlset>
`
}

/**
 * Dynamically generates robots.txt content referencing the dynamic sitemap.
 * @param {string} [baseUrl]
 * @returns {string} robots.txt content
 */
export function generateRobotsTxt(baseUrl = getBaseUrl()) {
  const normalizedBase = String(baseUrl).trim().replace(/\/+$/, '')
  return `User-agent: *
Allow: /

Sitemap: ${normalizedBase}/sitemap.xml
`
}
