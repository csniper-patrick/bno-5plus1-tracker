# Testing & Quality Assurance Workflow

This document details the test strategy, execution commands, and test suites for **bno-5plus1-tracker**.

---

## 1. Testing Strategy & Philosophy

- **Rule 9 — Tests Verify Intent**: Tests must encode *why* behavior matters, not just *what* it does. Ensure tests break if business logic, statutory absence calculations, or continuous residence boundaries change unexpectedly.
- **Dual-Layer Verification**:
  1. **Unit & Store Logic**: Fast Node.js native test runner (`node --test`) covering mathematical algorithms, date manipulations, Segment Tree operations, and schema enforcement.
  2. **End-to-End Browser Tests**: Playwright browser tests covering full user flows, IndexedDB persistence, file dropzones, multi-stop forms, and UI rendering across locales.

---

## 2. Command Reference

| Command | Description |
|---|---|
| `npm test` | Runs the full combined test pipeline (unit tests + Playwright E2E suite). |
| `npm run test:unit` | Executes the 120+ unit tests across 30+ suites via Node.js native test runner. |
| `npm run test:e2e` | Runs headless Playwright E2E tests across Chromium, Firefox, and WebKit. |
| `npm run test:e2e:ui` | Launches Playwright's interactive UI test runner and inspector. |
| `npm run format` | Runs Prettier 3 to enforce uniform code styling across all test and source files. |

---

## 3. Unit Test Suites Overview (`tests/`)

- **[tracker.test.js](../../tests/tracker.test.js)**:
  - Core absence store reactivity (`useAbsentsStore`).
  - Rolling 180-day ILR limits and sliding 5-year window shifts.
  - Citizenship 450-day and 90-day physical presence checks.
  - Absence Segment Tree construction, interval updates, and $O(1)$ point queries.
  - Multi-stop trip serialization and YAML export/import.
- **[profiles.test.js](../../tests/profiles.test.js)**:
  - Multi-profile management (`profileService.js`, `useProfilesStore`).
  - Profile data swapping, copying, and renaming.
  - Companion absence sharing with visa start date eligibility validation (`syncSharedAbsenceProfiles`).
  - Two-way real-time trip synchronization (`syncUpdatedAbsenceAcrossProfiles`).
- **[components_and_e2e.test.js](../../tests/components_and_e2e.test.js)**:
  - User flows, component integrations, and file upload lifecycle.
- **[indexeddb_emulation.test.js](../../tests/indexeddb_emulation.test.js)**:
  - Database schema upgrades (v1 → v2).
  - Persistence across `app_state` (key-value) and `files` (binary blob store with `folderId` index).
- **[seo.test.js](../../tests/seo.test.js)**:
  - Dynamic `CI_PAGES_URL` resolution and canonical URL tags.
  - Route-specific Open Graph, Twitter cards, and Schema.org JSON-LD generation (`WebApplication`, `BreadcrumbList`, `FAQPage`, `HowTo`).
  - On-the-fly `sitemap.xml` and `robots.txt` generation.
- **[validation.test.js](../../tests/validation.test.js)**:
  - Strict YAML schema validation (`schemaValidationService.js`).
  - Corrupt or invalid backup data rejection.
  - UTC date validation, leap year boundaries, and segment tree edge cases.

---

## 4. Playwright E2E Configuration ([playwright.config.js](../../playwright.config.js))

- **Test Isolation**: By default, `npm run test:e2e` only executes `e2e/app-ui.spec.js`.
- **Screenshot Isolation**: `testIgnore: ['**/generate-instruction-screenshots.spec.js']` ensures the heavy user guide screenshot generator does not run during standard CI or regression test cycles.
- **Dev Server Auto-Launch**: Playwright automatically launches the local Vite dev server on `http://localhost:5173` via `webServer` configuration if not already running.

---

## 5. Adding New Tests

1. Place unit tests in `tests/<feature>.test.js`.
2. Use Node.js built-in `test` and `assert/strict` modules:
   ```javascript
   import { test, describe, it } from 'node:test'
   import assert from 'node:assert/strict'
   ```
3. Run `npm run test:unit` to verify passing assertions.
4. Run `npm run format` after authoring tests.

