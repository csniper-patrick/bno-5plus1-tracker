# Deployment & Build Workflow

This document outlines the deployment lifecycle, Static Site Generation (SSG) process, and GitLab Pages pipeline for **bno-5plus1-tracker**.

---

## 1. GitLab CI/CD Pipeline Architecture ([.gitlab-ci.yml](../../.gitlab-ci.yml))

The deployment pipeline is automated via GitLab CI/CD using three core stages:

```text
review  ➔  test  ➔  deploy
```

### Stages & Jobs

1. **Review Stage (`code-review.yml`)**:
   - Automated merge request review and lint checks included from the parent CI management configuration (`$CI_PROJECT_NAMESPACE/ci-mgmt`).
2. **Test Stage (`test`)**:
   - Container Image: `mcr.microsoft.com/playwright:v1.65.0-noble`
   - Pre-configures UTF-8 locales (`en_GB.UTF-8`, `zh_HK.UTF-8`, `en_HK.UTF-8`).
   - Runs deterministic install: `npm ci --cache .npm --prefer-offline`
   - Executes full test suite: `npm test` (Unit tests + Playwright E2E browser tests).
   - Preserves `playwright-report/` and `test-results/` as build artifacts.
3. **Deploy Stage (`pages`)**:
   - Executes only on default branch (`main`).
   - Injects CI environment variables:
     ```bash
     export VITE_CI_PROJECT_URL=$CI_PROJECT_URL
     export VITE_CI_PAGES_URL=$CI_PAGES_URL
     export CI_PAGES_URL=$CI_PAGES_URL
     ```
   - Executes `npm run build` (`vite-ssg build`).
   - Moves compiled `dist/` directory to `public/` for GitLab Pages publishing.

---

## 2. Dynamic SEO & Static Site Generation (SSG)

- **Dynamic Deployment URL Resolution (`getBaseUrl` in [seo.js](../../src/utils/seo.js))**:
  - Automatically resolves base URLs by prioritizing GitLab CI environment variables (`process.env.VITE_CI_PAGES_URL || process.env.CI_PAGES_URL`), falling back to `https://csniper.gitlab.io/bno-5plus1-tracker`.
- **Pre-rendering Routes (`vite.config.js`)**:
  - Pre-renders static HTML for all main routes: `/`, `/documents`, `/reference`, `/instruction`, `/info`.
  - Injects canonical links, Open Graph tags (`og:title`, `og:image`, `og:url`), Twitter cards, and Schema.org JSON-LD scripts (`WebApplication`, `BreadcrumbList`, `FAQPage`, `HowTo`).
- **Dynamic Build & Dev Generator (`dynamic-seo-plugin`)**:
  - Serves dynamic `/sitemap.xml` and `/robots.txt` during local development (`npm run dev`).
  - Writes `dist/sitemap.xml` and `dist/robots.txt` during production builds (`vite-ssg build` `onFinished` hook) without requiring static XML files in `public/`.

---

## 3. Local Build & Verification Commands

Before opening a merge request or deploying changes, run:

```bash
# 1. Clean build using Vite SSG
npm run build

# 2. Preview the production build locally (served at http://localhost:4173)
npm run preview

# 3. Verify that tests pass against the build
npm run test:unit
```

---

## 4. Pre-Deployment Checklist

- [ ] All unit tests pass (`npm run test:unit`)
- [ ] Playwright E2E tests pass (`npm run test:e2e`)
- [ ] SSG build succeeds with zero errors (`npm run build`)
- [ ] No unformatted files (`npm run format`)
- [ ] `package.json` and `package-lock.json` are in sync
- [ ] No secrets, PII, or personal tracking tokens committed

