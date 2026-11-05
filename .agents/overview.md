# System Overview & Architecture - BNO 5+1 Tracker

## Project Overview

**bno-5plus1-tracker** is an unofficial, 3rd-party Vue 3 web application designed for UK British National (Overseas) (BNO) visa holders to track, calculate, and manage their travel absence days, qualifications, continuous residence evidence, and address history on the "5+1" route toward Indefinite Leave to Remain (ILR / Settlement) and British Citizenship (Naturalisation).

_Note: This application is an independent 3rd-party tool provided for personal tracking purposes only. It is not affiliated with, endorsed by, or connected to the UK Home Office or UK Government._

---

## Key Regulations & Application Data Tracked

1. **Full-Day Absence Rule**: Departure (start) and return (end) dates are partially spent in the UK and are excluded. Only complete 24-hour calendar days spent entirely abroad count as days absent.
2. **Rolling 12-Month Limit & 5-Year Sliding Window (ILR)**: Maximum **180 days** absent in any continuous rolling 365-day period during the 5-year qualifying period. If the 180-day rule cannot be satisfied within the baseline 5 years, the qualifying period automatically shifts/delays forward to the earliest subsequent compliant 5-year window, flagged with a yellow **"Delayed"** warning and active period peak scanning.
3. **5-Year Qualifying Period & Visa Expiry**: Calculated from BNO Visa Start Date or initial UK Arrival Date. Supports an optional **Visa Expiry Date** (defaults to 5 years after visa start), catering to 30-month initial visas or custom extensions, displaying extension warning alerts if visa expiry precedes the earliest ILR settlement date, and displaying a dynamic countdown in brackets (`X yrs to go`, `X mos to go`, or `X days to go`) for future dates.
4. **Auto UK Arrival Sync**: Automatic generation/updating of initial arrival absence record if UK Arrival Date > BNO Visa Start Date.
5. **Earliest Application Dates Countdown**: Applications for ILR can be submitted up to **28 days** prior to completing 5-year continuous residence. Both Earliest ILR Application Date and Earliest Naturalisation Date display a dynamic countdown in brackets for future dates showing the single most significant non-zero unit.
6. **Naturalisation Chaining & Absence Limits**:
   - Baseline Naturalisation target date automatically inherits `ilrTargetDate + 1 year` when ILR is delayed (or uses explicit `ilrApprovedDate` when available), with an inclusive lower bound of today (UTC midnight) so past candidate application dates are bounded to today.
   - Maximum **450 days** absent in the 5 years prior to naturalisation application.
   - Maximum **90 days** absent in the final 12 months prior to naturalisation application.
   - Physical Presence Requirement: Applicants must be physically present in the UK on the exact date 5 years prior to application. If the start date falls on an absent day, the start date automatically shifts to the earliest subsequent day present in the UK.
7. **Life in the UK & English Language (B1) Tests**: Status, test dates, test centers, unique reference numbers (URN), and qualification pathways.
8. **National Insurance Number (NI) Tracking**: Record NIN format in standard UK space-delimited layout (`QQ 12 34 56 A`), with automatic status promotion to "Received" upon entering an NI number.
9. **5-Year Continuous Residence Checklist**: Supporting evidence checklists (Council tax, P60s, bank statements, utilities) structured across Years 1 to 5.
10. **UK Address History Log**: Full residential address entries (Move-in/out dates, postcode, tenure type) required for Home Office SET(O) and Naturalisation AN applications.
11. **Document Vault & Binary Blob Persistence**: Drag-and-drop file storage (PDFs, scans, photos up to 10 MB), organized into category/year folders (`Year 1-5`, `Life in UK`, `English B1`, `Addresses`, `Other`), linked directly to continuous residence checklist items and address history, with direct new-tab browser file viewing (`window.open`) and IndexedDB blob persistence.
12. **User Guide & Operation Manual (`InstructionView.vue`)**: Step-by-step interactive manual with desktop/mobile screenshot toggle, detailed feature steps (Key Dates, Absences, Documents/NIN, Backups), and an extended FAQ section.
13. **Unified ZIP Backup & Flexible Import**: One-click export packaging structured data (`backup.yaml`), file manifest index (`files-manifest.yaml`), and binary document files in a folder hierarchy (`files/<folderId>/<filename>`). Import handles both `.zip` archives and standalone `.yaml` files.
14. **Multi-Profile Management & Companion Absence Sharing**: Independent data environments per family member with cross-profile travel sharing (`syncSharedAbsenceProfiles`), Visa Start & UK Arrival Date eligibility validation (`isProfileShareable`), two-way real-time edit synchronization (`syncUpdatedAbsenceAcrossProfiles`), and companion avatar chip indicators in the expanded records table with dynamic column visibility.
15. **Search Engine Optimization (SEO) & Social Sharing Cards**:
    - Route-level metadata (`<title>`, `<meta name="description">`, keywords, canonical `<link>`) injected via `@unhead/vue` and static site generation (`vite-ssg`).
    - 1200×630px high-resolution Open Graph social preview banner (`og-image.png` / `og-image.svg`) featuring the official app favicon and Union Jack branding.
    - Schema.org JSON-LD structured data: `WebApplication` on `/`, `BreadcrumbList` on `/documents`, `FAQPage` on `/reference`, and `HowTo` + `FAQPage` on `/instruction`.
    - Dynamic `CI_PAGES_URL` integration: Automatically resolves deployment URLs from GitLab CI environment variables, dynamically generating XML sitemaps (`sitemap.xml`) and crawler rules (`robots.txt`) at build time.
16. **Curated Official Guidance & Verified NGO Social Channels (`ReferenceView.vue`)**:
    - Curated repository of 40+ official UK Government immigration guidance rules, caseworker decision manuals, statutory residence tax publications, and verified non-profit NGO resources.
    - Verified NGO Social Channels: Direct access to verified social media handles and channels for non-government organizations and community support groups.
    - Centralized platform configuration (`SOCIAL_PLATFORM_CONFIG` in `src/constants/social.js`) and instant keyword search and category filtering.

---

## Tech Stack & Dependencies

- **Framework**: Vue 3 (Options API for `AbsenceView.vue`, `DocumentView.vue`, and modular subcomponents in `src/components/absence/` and `src/components/document/`; Composition API `<script setup>` for `App.vue`, `ProfileDrawerSection.vue`, `ProfileManagementDialog.vue`, and `ReloadPrompt.vue`)
- **SEO & Head Management**: `@unhead/vue` v2 / `unhead` with pre-rendering support via `vite-ssg`
- **Internationalization**: `vue-i18n` v11 (`src/locales/en.js` & `src/locales/zh-HK.js`, `src/plugins/i18n.js`) with top bar language switcher button (`EN` / `繁`) and `localStorage` preference persistence (`bno_tracker_locale`)
- **State Management**: Pinia (`useAbsentsStore` in `absents.js`, `useDocumentsStore` in `documents.js`, `useProfilesStore` in `profiles.js`)
- **UI Framework**: Vuetify 3 (`vuetify`, `@mdi/font`) with 3-dots vertical action menus (`v-menu`) on table rows
- **PWA & Caching**: Progressive Web App via `vite-plugin-pwa` with `ReloadPrompt.vue` component
- **Build System**: Vite 8 with `@vitejs/plugin-vue`, `vite-plugin-vuetify`, `@vitejs/plugin-vue-jsx`, `vite-ssg`
- **Routing**: Vue Router 5 (`/` for Absence Tracker, `/documents` for Document Tracker, `/reference` for Official Guidance, `/instruction` & `/guide` for User Guide & Operation Manual, `/info` for Project Overview)
- **YAML Engine**: `yaml` package (`Document`, `parse`, `stringify`) for commented YAML backups and manifest serialization
- **ZIP Engine**: `jszip` for creating and parsing `.zip` backup archives containing `backup.yaml`, `files-manifest.yaml`, and document file blobs
- **Formatter & Test Runner**: Prettier 3 & Node.js native test runner (`node --test tests/*.test.js`)

---

## Workspace Structure

```text
bno-5plus1-tracker/
├── AGENTS.md                  # Minimal entry point / context router
├── .agents/                   # Modular rules, workflows & documentation
│   ├── overview.md            # System architecture & core philosophy
│   ├── references.md          # Official UK Government & verified NGO links
│   ├── rules/                 # Constraints, syntax & guardrails
│   │   ├── coding-style.md
│   │   ├── security.md
│   │   ├── dependencies.md
│   │   └── ui-styling.md
│   ├── workflows/             # Multi-step runbooks & SOPs
│   │   ├── deployment.md
│   │   ├── testing.md
│   │   ├── git-standards.md
│   │   ├── screenshots.md
│   │   └── documentation.md
│   ├── skills/                # Agent skills & procedural knowledge
│   │   └── simple-english/    # ASD-STE100 plain English writing skill & references
│   └── personas/              # Role-specific directives
│       ├── reviewer.md
│       └── test-engineer.md
├── .gitlab-ci.yml             # GitLab CI/CD pipeline for GitLab Pages deployment
├── .devcontainer/             # Dev container settings
├── .vscode/                   # VS Code workspace settings
├── e2e/                       # Playwright E2E UI & screenshot generation tests
│   ├── app-ui.spec.js                             # E2E application user flow & UI test suite
│   └── generate-instruction-screenshots.spec.js   # Automated desktop & mobile user guide screenshot generator
├── public/                    # Static assets, PWA icons, OG social banner & instruction screenshots
│   ├── instructions/          # User guide screen captures (step*.png & narrow_step*.png)
│   ├── og-image.png           # 1200x630px high-resolution Open Graph social preview banner
│   └── og-image.svg           # Vector source for Open Graph social banner
├── src/
│   ├── assets/                # Global stylesheets (main.css)
│   ├── components/            # Vue UI components
│   │   ├── absence/           # Modular Absence Tracker subcomponents (Options API)
│   │   │   ├── AbsenceFormCard.vue               # Multi-stop graph timeline flow editor
│   │   │   ├── AbsenceOverviewHeader.vue         # Title card & BNO Visa overview header
│   │   │   ├── AbsenceRecordsTable.vue           # Absence list with full/compact timeline modes
│   │   │   ├── AbsenceRuleStatusCards.vue        # ILR rolling 180-day & Citizenship 450/90-day status cards
│   │   │   ├── AbsenceShareDialog.vue            # Companion profile journey sharing modal
│   │   │   ├── DateRangeQueryCard.vue            # Segment Tree custom range query tool
│   │   │   └── KeyDatesDialog.vue                # Key Visa start, expiry, arrival & ILR dates modal
│   │   ├── document/          # Modular Document Readiness subcomponents (Options API)
│   │   │   ├── AddressHistorySection.vue         # UK address history table & add/edit/delete modals
│   │   │   ├── DocumentHeaderCard.vue            # Readiness circular chart & requirement summaries
│   │   │   ├── DocumentVaultSection.vue          # Document vault with dropzone, table & file modals
│   │   │   ├── EnglishLanguageCard.vue           # English B1 requirement pathway, provider & status
│   │   │   ├── LifeInUkCard.vue                  # Life in the UK test status, date & URN
│   │   │   ├── NationalInsuranceCard.vue         # NIN status toggle & auto-formatting input
│   │   │   └── ResidenceChecklistSection.vue     # 5-Year continuous residence accordion & custom items
│   │   ├── ProfileDrawerSection.vue              # Side drawer multi-profile selector & management
│   │   ├── ProfileManagementDialog.vue           # Modal dialog for managing applicant profiles
│   │   └── ReloadPrompt.vue                      # PWA service worker update notification prompt
│   ├── locales/               # i18n translation dictionaries (en.js, zh-HK.js)
│   ├── plugins/               # Vuetify 3 theme & i18n setup (vuetify.js, i18n.js)
│   ├── router/                # Vue Router definitions (index.js)
│   ├── services/              # Services & Data I/O
│   │   ├── dbService.js               # IndexedDB initialisation & v2 schema migration
│   │   ├── fileStorageService.js      # IndexedDB file blob CRUD service ('files' object store)
│   │   ├── backupService.js           # YAML export/import service with node-level comments
│   │   ├── zipService.js              # JSZip backup archiving & extraction service
│   │   ├── profileService.js          # Multi-profile management & data swapping engine
│   │   └── schemaValidationService.js # Strict YAML & backup schema validation engine
│   ├── stores/                # Pinia stores (absents.js, documents.js, profiles.js)
│   ├── utils/                 # Modular utilities (date.js, segmentTree.js, seo.js, format.js, id.js)
│   ├── views/                 # Page views (AbsenceView.vue, DocumentView.vue, ReferenceView.vue, InstructionView.vue)
│   ├── App.vue                # Main application layout with right navigation drawer & language switcher
│   └── main.js                # App initialization entrypoint with i18n plugin setup
├── tests/                     # Automated unit tests
│   ├── tracker.test.js                # Core absence store, segment tree & backup unit tests
│   ├── profiles.test.js               # Multi-profile isolation, swapping & companion sync tests
│   ├── components_and_e2e.test.js     # E2E user flows & binary file upload integration tests
│   ├── indexeddb_emulation.test.js    # IndexedDB app_state & files object store tests
│   ├── seo.test.js                    # SEO metadata, dynamic CI_PAGES_URL, sitemap.xml & Schema.org JSON-LD tests
│   └── validation.test.js             # Strict YAML schema validation & date utility edge case tests
├── index.html                 # HTML entry template
├── package.json               # Project dependencies and scripts
├── playwright.config.js       # Playwright configuration with testIgnore isolation
└── vite.config.js             # Vite build setup with Vuetify & VitePWA plugins
```

---

## Key Modules & Technical Architecture

### 1. High-Performance Absence Segment Tree ([segmentTree.js](../src/utils/segmentTree.js))

To evaluate arbitrary date ranges efficiently over a 20-year period (native power-of-2 capacity of 8,192 days, $\approx 22.4$ years):

- A **canonical power-of-2 iterative Segment Tree** operating on standard **0-indexed day offsets** ($[0, \text{cap} - 1]$ from Visa Start Date), backed by an `Int32Array` buffer of size $2 \times \text{cap} = 16,384$ (where $\text{cap} = 8,192 = 2^{13}$, leaves positioned at contiguous indices $\text{cap} + \text{idx}$).
- **Direct Arithmetic Point Access**: Provides $O(1)$ point queries via direct arithmetic (`cap + idx`) without auxiliary lookup tables or recursive initializations.
- **Sliding Window Optimization**: Enables $O(1)$ constant-time sliding window updates in `useAbsentsStore` (`max12MonthAbsenceInfo` & `naturalizationQualifyingPeriod`) by subtracting exiting days (`queryPoint(i - 1)`) and adding entering days (`queryPoint(i + 364)`).
- **Iterative Range Updates**: Updates leaf coverage and pulls ancestor node sums iteratively in $O(D + \log K)$ time via `updateRange(qstart, qend, val)`.
- **Single-Pass $O(K)$ Batch Build**: `build(intervals, val)` marks all coverage intervals on `leafCover` and computes the complete tree in a single bottom-up linear sweep without repeated tree descents.
- **Branchless Iterative Range Queries**: Non-recursive $O(\log K)$ bitwise range sum queries (`query(qstart, qend)`) traversing from leaves to root (`l >>= 1, r >>= 1`) without stack overhead.
- **Leaf Coverage Array**: An `Int32Array` (`leafCover` of size $\text{cap}$) tracks trip coverage count per day, ensuring leaf values in `tree` transition between `0` and `1` accurately when adding or deleting overlapping trips.

### 2. Centralized Date Utilities ([date.js](../src/utils/date.js))

- **`parseDateUTC(input)` / `formatDateUTC(dateObj)` / `normalizeDate(val)`**: Prevents timezone offset shifts by strictly converting inputs to UTC midnight Date objects and validating year, month ($1\text{--}12$), and day ($1\text{--}31$) bounds to prevent JS `Date` overflow/rollover.
- **`calculateDays(startDateStr, endDateStr)`**: Full 24-hour day calculations excluding departure & return days.

### 3. IndexedDB Binary Blob Storage & Schema Migration ([dbService.js](../src/services/dbService.js) & [fileStorageService.js](../src/services/fileStorageService.js))

- **Schema Version 2**: `dbService.js` manages DB upgrades from v1 → v2, creating a dedicated `files` object store with `keyPath: 'id'` and an index on `folderId`.
- **Binary Blob Storage**: `fileStorageService.js` handles saving and loading raw file `ArrayBuffer` data, creating temporary Blob Object URLs for inline previews/downloads, updating metadata, and enforcing a 10 MB per-file limit.

### 4. ZIP & YAML Backup Services ([backupService.js](../src/services/backupService.js) & [zipService.js](../src/services/zipService.js))

- **ZIP Archiving**: `zipService.js` packages `backup.yaml` (full application state), `files-manifest.yaml` (file metadata index), and binary document files inside a `files/<folderId>/<filename>` folder hierarchy.
- **Flexible Import**: Auto-detects ZIP archives vs standalone YAML files, restoring absence logs, visa dates, qualifications, address history, and reconstructing document file blobs into IndexedDB.

### 5. Document & Qualification Store ([documents.js](../src/stores/documents.js))

Manages non-absence settlement requirements and document vault metadata:

- **Storage Key**: `bno_tracker_documents_v1`
- **Data Sections**: `lifeInUk`, `englishTest`, `residenceChecklist` (Years 1-5), `addressHistory`, `uploadedFiles`, `folders`.
- **Address History & Sorting**: `sortAddresses` maintains chronological order by move-in date. `addAddress` returns the newly created record.
- **File Metadata Hydration**: Hydrates `uploadedFiles` metadata array from IndexedDB on startup without loading full binary blobs into memory until requested.

### 6. Multi-Profile Engine & Strict Schema Validation ([profileService.js](../src/services/profileService.js), [schemaValidationService.js](../src/services/schemaValidationService.js) & [profiles.js](../src/stores/profiles.js))

- **Multi-Profile Management**: `profileService.js` and `useProfilesStore` provide isolated tracking data for multiple family members, active profile switching, data swapping, duplication, renaming, and profile metadata persistence.
- **Companion Absence Sharing & Synchronization**:
  - `syncSharedAbsenceProfiles(record, targetProfileIds)`: Synchronizes absence records across selected profiles, enforcing that only target profiles with a configured `visaStartDate` and `record.startDate >= visaStartDate` (and `record.startDate >= ukArrivalDate` if set) receive the shared trip.
  - `syncUpdatedAbsenceAcrossProfiles(updatedRecord)`: Real-time two-way synchronization of edited trip details across all profiles sharing the same record ID.
  - `getProfilesSharingAbsence(absenceId)`: Queries other profiles in storage sharing an absence ID for avatar chip rendering in the expanded table view.
- **Strict Schema Enforcement**: `schemaValidationService.js` validates full application state YAML schemas and ZIP manifest files upon import to ensure integrity and reject corrupted backup data.

### 7. Search Engine Optimization (SEO) & Structured Data Engine ([seo.js](../src/utils/seo.js))

- **Dynamic Deployment URL Resolution (`getBaseUrl`)**:
  - Automatically resolves base URLs by prioritizing GitLab CI environment variables (`process.env.VITE_CI_PAGES_URL || process.env.CI_PAGES_URL`), falling back to `https://csniper.gitlab.io/bno-5plus1-tracker`.
- **Route Head Metadata & Structured Data (`getSeoMeta`)**:
  - Injected via `useHead()` across all primary routes (`/`, `/documents`, `/reference`, `/instruction`).
  - Pre-rendered into static HTML files by `vite-ssg`.
  - Injects canonical links, Open Graph tags (`og:title`, `og:image`, `og:url`), Twitter cards (`summary_large_image`), and Schema.org JSON-LD scripts (`WebApplication`, `BreadcrumbList`, `FAQPage`, `HowTo`).
- **Dynamic Build & Dev Generator (`vite.config.js`)**:
  - **`dynamic-seo-plugin`**: Serves on-the-fly dynamic `/sitemap.xml` and `/robots.txt` during local development (`npm run dev`) and writes `dist/sitemap.xml` and `dist/robots.txt` during production builds.
  - **`onFinished` Hook**: Populates `dist/sitemap.xml` and `dist/robots.txt` during static site generation (`vite-ssg build`) without requiring static XML files in `public/`.
