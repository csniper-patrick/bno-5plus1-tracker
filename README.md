# BNO 5+1 Tracker (Unofficial 3rd-Party App) 🇬🇧✈️

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4fc08d.svg?logo=vuedotjs)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646cff.svg?logo=vite)](https://vite.dev/)
[![Vuetify 3](https://img.shields.io/badge/Vuetify-3.7-1867c0.svg?logo=vuetify)](https://vuetifyjs.com/)
[![Pinia](https://img.shields.io/badge/Pinia-4.0-yellow.svg)](https://pinia.vuejs.org/)
[![vue-i18n](https://img.shields.io/badge/vue--i18n-11.4-green.svg)](https://vue-i18n.intlify.dev/)
[![i18n](https://img.shields.io/badge/i18n-English%20%7C%20%E7%B9%81%E9%AB%94%E4%B8%AD%E6%96%87-blue.svg)](src/locales)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8.svg?logo=pwa)](https://github.com/vite-pwa/vite-plugin-pwa)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An unofficial, 3rd-party web application designed for **British National (Overseas) (BNO) visa holders** to track, calculate, and manage travel absences, qualifications, supporting documents, and address history from the United Kingdom on the "5+1" route toward **Indefinite Leave to Remain (ILR / UK Settlement)** and **British Citizenship (Naturalisation)**.

*Note: This is an independent 3rd-party utility and is NOT affiliated with, endorsed by, or connected to the UK Home Office or the UK Government.*

---

## 🌟 Key Features

- **🌐 Full Internationalization (i18n) Support**
  - Complete dual-language support for **English (`en`)** and **Traditional Chinese (Hong Kong) (`zh-HK`)** across all UI views, forms, modals, tables, badges, and official guidance pages powered by `vue-i18n`.
  - Convenient top app bar language switcher button (`EN` / `繁`) with automatic `localStorage` (`bno_tracker_locale`) user preference persistence.
- **✈️ UK Home Office Rules-Aligned Absence Calculation**
  - Automatically excludes departure (start) and return (end) dates from full-day absence counts, matching UK Home Office guidance (days where part of the 24 hours is spent in the UK do not count as full days absent).
- **📅 Visa & Arrival Date Synchronization & Optional Visa Expiry**
  - Track your **BNO Visa Start Date**, optional **Visa Expiry Date** (defaults to 5 years after visa start), **UK Arrival Date**, and optional **ILR Approved Date**.
  - Supports users starting with a 30-month visa or custom visa extensions.
  - Automatically generates and syncs initial pre-arrival absence records if your UK arrival date differs from your visa start date.
- **🛡️ 5-Year Sliding Window ILR Limit Monitoring & Period Delay**
  - Evaluates absences across all continuous rolling 365-day windows during your 5-year qualifying period to ensure alignment with the **180-day maximum limit** for ILR.
  - If the 180-day rule cannot be satisfied within the baseline 5 years, the qualifying period automatically shifts/delays forward to the earliest subsequent compliant 5-year window, highlighted with yellow **"Delayed"** warnings and active peak absence scanning.
- **🇬🇧 British Citizenship (Naturalisation) Absence Limits & Chaining**
  - **Inherited ILR Chaining**: When ILR is delayed, the Naturalisation qualifying period baseline target date automatically inherits `ilrTargetDate + 1 year`.
  - Checks **5-Year Naturalisation Limit** (maximum **450 days** absent in the 5 years prior to application).
  - Checks **Final 12-Month Limit** (maximum **90 days** absent in the final year post-ILR).
  - Enforces physical presence requirement: Automatically checks if the applicant was present in the UK 5 years prior to application, advancing the window start date if it falls on an absent day.
- **🪪 BNO Visa Overview Card**
  - Summarizes Visa Start Date, Visa Expiry Date (with Default 5-Year / Custom badges and dynamic countdowns when in the future), Earliest ILR Settlement Date, and displays prominent yellow extension warning alerts if visa extension is needed before ILR qualification.
- **📋 Document & Qualification Tracker & Document Vault (`DocumentView`)**
  - **National Insurance Number (NI)**: Track your NIN format in standard UK space-delimited format (e.g., `QQ 12 34 56 A`), application status (auto-promoted to "Received" upon entering an NI number), and official HMRC confirmation letters.
  - **Life in the UK Test**: Track status (Not Started / Scheduled / Passed), test date, Unique Reference Number (URN), test center location, and notes.
  - **English Language Requirement (B1)**: Track pathway (B1 SELT Test, UK Degree, Ecctis/ENIC Statement, Exemption), provider, test date, and certificate reference.
  - **Adaptive 3-Tier Responsive Card Arrangement**: Layout automatically adapts across viewports (Wide: Title banner above 3 side-by-side cards with NI on left; Medium: Title + NI on top row, Life in UK + B1 English on second row; Mobile: vertically stacked single column).
  - **5-Year Continuous Residence Evidence Checklist**: Year-by-year checklist (Years 1 to 5) covering Council Tax, P60/Tax, Bank Statements, Housing proof, Utility Bills, and custom evidence items.
  - **UK Address History Log**: Log residential addresses lived at during your 5-year qualifying period (Move-in/out dates, postcode, tenure type) required for Home Office SET(O) and Naturalisation AN application forms.
  - **📁 Document Vault**: Drag-and-drop file upload zone supporting PDFs, images (JPG, PNG, WebP, HEIC), and text files up to 10 MB. Organize files into folders (`Year 1-5`, `Life in UK`, `English B1`, `Addresses`, `Other`), open files directly in a new browser tab (`window.open`), edit file notes, rename/move files, and link files directly to specific residence checklist items with paperclip count indicators.
- **📖 User Guide & Operation Manual (`InstructionView`)**
  - Interactive step-by-step tutorial with visual screen demonstrations, viewport mode switching (Desktop / Mobile), key dates configuration guidance, rolling 180-day rules explanation, document vault workflow, and an offline privacy & operation FAQ.
- **🔗 Reference & Official Guidance Page (`ReferenceView`)**
  - **Curated Official & NGO Resources**: Quick reference page presenting 30 curated official UK Home Office publications, statutory immigration rules (Appendix HK), HMRC tax residence guides, digital share codes, higher education rules, and verified non-commercial registered charities/NGOs in structured cards with search and category filtering.
  - **Category & Search Filters**: Instantly filter official resources by category (BNO Settlement, Policy & Guidance, Qualifications & Tests, Citizenship) or text search.
  - **Direct Links & One-Click Copy**: Convenient action buttons to visit official GOV.UK pages or copy URLs.
- **👥 Multi-Profile Management & Absence Sharing / Companion Sync**
  - Track multiple family members (e.g. Main Applicant, Spouse, Dependants) with independent key visa dates, travel records, continuous residence checklists, and document vaults in isolated profile environments.
  - **Shared Absence Journeys ("Shared With" / 「同行成員」)**: Conveniently share travel records across profiles using the "Shared With..." dialog with individual selection and select-all/clear capabilities.
  - **Visa Start & UK Arrival Date Eligibility Validation**: Automatically checks companion profiles' configured Visa Start Dates and UK Arrival Dates against absence departure dates, disabling ineligible profiles with high-contrast amber warnings (`Before visa start` / `Before UK arrival` / `Visa start date not set`) to prevent invalid cross-profile entries.
  - **Real-Time Cross-Profile Synchronization**: Edits made to a shared trip (dates, destinations, stops) automatically sync across all companion profiles sharing that record ID.
  - **Companion Avatar Chips & Dynamic Visibility**: The expanded table view displays profile avatar chips with initial letters and distinct colors for family members sharing each journey. The column automatically hides when only a single profile exists.
- **🧭 Right Navigation Drawer & Consolidated Data Management**
  - Quick-switch side drawer toggled via top bar hamburger menu (`mdi-menu`).
  - Unified **ZIP Backup Export & Flexible Import**: One-click export producing a `.zip` archive bundling structured data (`backup.yaml`), a YAML metadata index (`files-manifest.yaml`), and binary document files in a folder tree (`files/<folderId>/<filename>`). Import auto-detects both `.zip` archives and standalone `.yaml` files.
  - Global **Clear All Data** modal with safety confirmation.
- **⚡ High-Performance Segment Tree Engine (`AbsenceSegmentTree`)**
  - Utilizes a custom $O(\log N)$ **Segment Tree** data structure over a 10-year day-by-day array to deliver lightning-fast custom date range queries, $O(1)$ point queries (`queryPoint`), and real-time sliding window calculations.
- **📊 Settlement & Naturalisation Timeline**
  - Calculates your exact **Earliest ILR Settlement Date**, **Earliest ILR Application Date** (28 days prior), and **Target Naturalisation Date**, displaying dynamic countdowns in brackets (e.g., `2 yrs to go`, `3 mos to go`, `12 days to go`) for future dates.
- **🎨 Modern Responsive Vuetify 3 UI**
  - Features Union Jack Dark/Light theme toggling, 3-dots vertical action menus for table rows, context-aware form controls, status chips, and intuitive 2-line Key Dates modal forms.
- **💾 Local Device Storage & Data Privacy (IndexedDB Schema v2)**
  - All data input (travel dates, visa details, test certificates, continuous residence checklists, address history, and uploaded document blobs) is stored strictly locally on your device in browser `IndexedDB` (using `app_state` and `files` object stores). No data is uploaded, collected, or transmitted to any external server.
- **⚡ PWA Offline Support**
  - Progressive Web App capability via `vite-plugin-pwa` allowing full offline usage on mobile and desktop devices.

---

## 📐 UK Home Office Rules Overview

| Stage | Rule | Requirement / Limit | Description |
| :--- | :--- | :--- | :--- |
| **General** | **Full Day Absence** | Departure & Return Excluded | Only full 24-hour days spent entirely outside the UK count as days absent. Departure and arrival dates are excluded. |
| **ILR** | **Rolling 12-Month Limit** | Max **180 days** | No more than 180 days absent in any continuous rolling 365-day period across the qualifying period. |
| **ILR** | **Qualifying Period** | **5-Year Sliding Window** | 5 years continuous residence starting from BNO Visa Start / UK Arrival Date. Automatically delays forward if the 180-day rule is violated. |
| **ILR** | **Visa Validity & Extension** | Variable Expiry | Default 5-year valid period with optional custom expiry date. Displays yellow alert if extension is needed prior to earliest ILR settlement date. |
| **ILR** | **Earliest Application** | **28 Days Prior** | ILR application can be submitted up to 28 days before completing the 5-year qualifying period. |
| **Qualifications** | **Life in the UK & B1** | Mandatory Tests | Pass certificate / URN required for ILR (SET(O)) and Naturalisation (AN). |
| **Residence** | **Address History & Proof** | Full 5-Year History | Official evidence of address (Council tax, P60s, utilities) and complete address log required. |
| **Citizenship** | **5-Year Absence Limit** | Max **450 days** | Total absent days in the 5 years immediately preceding application date must not exceed 450 days. |
| **Citizenship** | **Final 12-Month Limit** | Max **90 days** | Total absent days in the 12 months immediately preceding application date must not exceed 90 days. |
| **Citizenship** | **Presence Requirement** | Physical presence in UK | Must have been physically present in the UK on the exact day 5 years prior to application. |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `^22.18.0` or `>=24.12.0`
- **npm**: `^10.0.0` or higher

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/bno-5plus1-tracker.git
   cd bno-5plus1-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 🛠️ NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite local development server with hot module reloading. |
| `npm run build` | Compiles production bundle into `dist/`. |
| `npm run preview` | Serves the locally built `dist/` production bundle. |
| `npm run test` | Runs the full test pipeline (Unit test suite + Playwright E2E tests). |
| `npm run test:unit` | Runs Node native unit test suite (`tests/*.test.js`). |
| `npm run test:e2e` | Runs Playwright end-to-end browser tests. |
| `npm run test:e2e:ui` | Runs Playwright test inspector in interactive UI mode. |
| `npm run capture:screenshots` | Runs Playwright screen capture script to generate desktop and mobile instruction guide screenshots (`public/instructions/`). |
| `npm run format` | Runs Prettier to format all source code files in `src/`. |

---

## 🏗️ Project Architecture

```
bno-5plus1-tracker/
├── e2e/                   # Playwright E2E UI & screenshot generation tests
│   ├── app-ui.spec.js                         # E2E application user flow & UI test suite
│   └── generate-instruction-screenshots.spec.js # Automated desktop & mobile user guide screenshot generator
├── public/                # Static assets, PWA icons & user guide instructions
│   └── instructions/      # Desktop (step*.png) & mobile (narrow_step*.png) screenshots
├── src/
│   ├── assets/            # Global styles (main.css)
│   ├── components/        # UI components
│   │   ├── ProfileDrawerSection.vue      # Side drawer multi-profile selector & management
│   │   ├── ProfileManagementDialog.vue   # Modal dialog for managing applicant profiles
│   │   └── ReloadPrompt.vue              # PWA service worker update notification prompt
│   ├── locales/           # i18n translation dictionaries
│   │   ├── en.js          # English localization dictionary
│   │   └── zh-HK.js       # Traditional Chinese (HK) localization dictionary
│   ├── plugins/           # Vuetify 3 theme & i18n configuration (vuetify.js, i18n.js)
│   ├── router/            # Vue Router routes (index.js)
│   ├── services/          # Services & Data I/O
│   │   ├── dbService.js               # IndexedDB initialisation & v2 schema migration
│   │   ├── fileStorageService.js      # IndexedDB binary blob CRUD service ('files' object store)
│   │   ├── backupService.js           # YAML export/import service with node-level comments
│   │   ├── zipService.js              # JSZip backup archiving & extraction service
│   │   ├── profileService.js          # Multi-profile management & data swapping engine
│   │   └── schemaValidationService.js # Strict YAML & backup schema validation engine
│   ├── stores/            # Pinia stores
│   │   ├── absents.js     # Absence store (useAbsentsStore) & segment tree syncing
│   │   ├── documents.js   # Document & file store (useDocumentsStore)
│   │   └── profiles.js    # Multi-profile store (useProfilesStore)
│   ├── utils/             # Helper utilities
│   │   ├── date.js        # Centralized UTC date parsing, formatting & day math
│   │   ├── segmentTree.js # AbsenceSegmentTree O(log N) data structure
│   │   ├── format.js      # Text formatting helper utilities
│   │   └── id.js          # Unique ID generator utility
│   ├── views/             # Application views
│   │   ├── AbsenceView.vue     # Absence tracker dashboard
│   │   ├── DocumentView.vue    # Qualifications, Document Vault & Residence proof checklist
│   │   ├── ReferenceView.vue   # Useful links & official guidance page
│   │   └── InstructionView.vue # User guide & operation manual with responsive screenshots
│   ├── App.vue            # Root layout with right navigation drawer & language switcher
│   └── main.js            # Vue app entrypoint with i18n plugin initialization
├── tests/                 # Automated unit test suite
│   ├── tracker.test.js            # Core absence store, segment tree & backup unit tests
│   ├── profiles.test.js           # Multi-profile isolation, swapping & companion sync tests
│   ├── components_and_e2e.test.js # E2E user flows & binary file upload integration tests
│   ├── indexeddb_emulation.test.js# IndexedDB app_state & files object store tests
│   └── validation.test.js         # Strict YAML schema validation & date utility edge case tests
├── .antigravity.md        # AI Agent workspace context & guidelines
├── .gitlab-ci.yml         # GitLab CI/CD pipeline for GitLab Pages
├── index.html             # HTML entry template
├── package.json           # App manifest and dependencies
├── playwright.config.js   # Playwright configuration with testIgnore isolation
└── vite.config.js         # Vite build configuration with Vuetify & VitePWA
```

### Key Modules & Data Structures

- **[AbsenceSegmentTree](file:///Users/csniper/Projects/bno-5plus1-tracker/src/utils/segmentTree.js)**: 1-indexed array-backed segment tree (`Int32Array`) using standard `leftNode = 2 * node` and `rightNode = 2 * node + 1` child indexing (0th index unused), initialized to zero by default, supporting $O(1)$ point queries (`queryPoint`), $O(1)$ per-step sliding window rolling updates, $O(D \log N)$ interval range updates (`updateRange`, $D = \text{range length}$), and $O(\log N)$ range sum queries (`query`) over a 10-year period (3,653 days).
- **[date.js](file:///Users/csniper/Projects/bno-5plus1-tracker/src/utils/date.js)**: Centralized UTC date parsing (`parseDateUTC`), formatting (`formatDateUTC`, `formatDisplayDate`), normalization (`normalizeDate`), day arithmetic (`calculateDays`, `getOneDayBefore`), and tree boundary calculations (`getMaxSegmentTreeReturnDate`).
- **[dbService.js](file:///Users/csniper/Projects/bno-5plus1-tracker/src/services/dbService.js)**: Database service managing IndexedDB open/upgrade transactions, supporting `app_state` (key-value) and `files` (file blobs with `folderId` index) object stores under DB Schema Version 2.
- **[fileStorageService.js](file:///Users/csniper/Projects/bno-5plus1-tracker/src/services/fileStorageService.js)**: Dedicated IndexedDB binary blob service handling file record persistence, on-demand blob retrieval, size formatting, object URL creation, and metadata queries.
- **[profileService.js](file:///Users/csniper/Projects/bno-5plus1-tracker/src/services/profileService.js)** & **[useProfilesStore](file:///Users/csniper/Projects/bno-5plus1-tracker/src/stores/profiles.js)**: Multi-profile management engine supporting isolated tracking for multiple family members, active profile switching, data swapping, duplication, renaming, cross-profile absence journey sharing with visa start date eligibility validation (`syncSharedAbsenceProfiles`), two-way real-time edit synchronization (`syncUpdatedAbsenceAcrossProfiles`), and companion lookup (`getProfilesSharingAbsence`).
- **[schemaValidationService.js](file:///Users/csniper/Projects/bno-5plus1-tracker/src/services/schemaValidationService.js)**: Strict schema validation engine enforcing YAML backup structure and ZIP manifest integrity (`backup.yaml` and `files-manifest.yaml`).
- **[backupService.js](file:///Users/csniper/Projects/bno-5plus1-tracker/src/services/backupService.js)**: Consolidated YAML backup service for structured data exports/imports with node-level comments.
- **[zipService.js](file:///Users/csniper/Projects/bno-5plus1-tracker/src/services/zipService.js)**: ZIP archiving engine using `jszip` and `yaml` serialization to package `backup.yaml`, `files-manifest.yaml`, and document file blobs into `.zip` archives.
- **[locales/](file:///Users/csniper/Projects/bno-5plus1-tracker/src/locales)**: Internationalization translation dictionaries (`en.js` & `zh-HK.js`) providing full English and Traditional Chinese (HK) translations for all application views, forms, dialogs, badges, and official link cards.
- **[useAbsentsStore](file:///Users/csniper/Projects/bno-5plus1-tracker/src/stores/absents.js)**: Pinia store handling absence records, visa/arrival/ILR dates, auto-arrival record sync, and $O(1)$ sliding-window rolling calculation getters (`max12MonthAbsenceInfo`, `naturalizationQualifyingPeriod`).
- **[useDocumentsStore](file:///Users/csniper/Projects/bno-5plus1-tracker/src/stores/documents.js)**: Pinia store managing Life in the UK test details, English B1 qualification, 5-year continuous residence checklist, UK address history log, and uploaded file metadata state.

### 🔄 Development & Maintenance Routines

- **Instruction Page & Responsive Screen Capture Procedure ([InstructionView.vue](file:///Users/csniper/Projects/bno-5plus1-tracker/src/views/InstructionView.vue))**:
  - Run `npm run capture:screenshots` to execute the automated Playwright script ([generate-instruction-screenshots.spec.js](file:///Users/csniper/Projects/bno-5plus1-tracker/e2e/generate-instruction-screenshots.spec.js)).
  - Automatically seeds realistic key dates, multi-stop absence records, qualification details, and address log.
  - Captures 7 desktop screenshots (`1280x800` -> `public/instructions/step*.png`) and 7 matching mobile screenshots (`390x844` -> `public/instructions/narrow_step*.png`).
  - `InstructionView.vue` dynamically switches between desktop and mobile screenshot sets (`imgPrefix`) using Vuetify's `$vuetify.display.smAndDown` breakpoint while offering manual `Desktop View` / `Mobile View` toggle overrides.
- **Automatic Documentation Maintenance Routine**:
  - Automatically triggered upon completing tasks that introduce architectural updates, store schema changes, new UI features, package dependency updates, or workflow/script edits.
  - Synchronizes feature descriptions, rules tables, script options, directory tree diagrams, module explanations, and developer guidelines across [README.md](file:///Users/csniper/Projects/bno-5plus1-tracker/README.md) and [.antigravity.md](file:///Users/csniper/Projects/bno-5plus1-tracker/.antigravity.md).

---

## 🔗 Useful Links & Official Resources

Below are key official UK Government (GOV.UK), UK Parliament, and verified non-commercial NGO resources for Hong Kong BNO visa holders, accessible within the application via the **Reference & Official Guidance** (`ReferenceView`) page:

- **[BNO Visa: Settle in the UK (ILR Guidance)](https://www.gov.uk/british-national-overseas-bno-visa/settle-in-the-uk)**  
  Official Home Office guidance on settlement eligibility, 5-year continuous residence requirements, 180-day absence limits, and required qualifications.
- **[Hong Kong BN(O) Route Caseworker Guidance](https://www.gov.uk/government/publications/hong-kong-british-national-overseas-route)**  
  Official Home Office staff decision-making manual for assessing entry clearance, extensions, adult children eligibility, and settlement.
- **[Immigration Rules Appendix Hong Kong BN(O)](https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-hong-kong-british-national-overseas)**  
  Statutory immigration rules enacted by UK Parliament establishing validity, suitability, continuous residence, and settlement criteria (HK 51.1–HK 64.1).
- **[HMRC Statutory Residence Test (SRT) Guidance (RDR3)](https://www.gov.uk/government/publications/rdr3-statutory-residence-test-srt)**  
  Official HMRC tax residence guide detailing day-counting rules (midnight rule), automatic overseas/UK tests, and split-year tax treatment.
- **[Prove Your Right to Work in the UK (Share Code Service)](https://www.gov.uk/prove-right-to-work)**  
  Official digital portal for generating employer share codes to verify employment permissions.
- **[Prove Your Right to Rent in the UK (Share Code Service)](https://www.gov.uk/prove-right-to-rent)**  
  Official digital portal for generating landlord share codes for tenancy checks in England.
- **[View & Prove Your Immigration Status (eVisa Account)](https://www.gov.uk/view-prove-immigration-status)**  
  Official UKVI digital portal for accessing eVisa records and updating linked passport details for travel.
- **[Register to Vote in the UK (Electoral Roll)](https://www.gov.uk/register-to-vote)**  
  Official voter registration portal (BNO citizens are Commonwealth citizens eligible to vote; registration builds UK credit history).
- **[NHS UK Global Health Insurance Card (GHIC) Application](https://www.nhs.uk/using-the-nhs/healthcare-abroad/apply-for-a-free-uk-global-health-insurance-card-ghic/)**  
  Official NHS portal to apply for or renew a free UK GHIC card for accessing state-provided healthcare during temporary visits to EU countries.
- **[Life in the UK Test Official Booking Portal](https://www.gov.uk/life-in-the-uk-test)**  
  Official booking portal, test center locator, ID guidelines, and fee information for the mandatory Life in the UK test.
- **[Prove Your Knowledge of English (B1 Level)](https://www.gov.uk/english-language)**  
  Official requirements and recognized SELT test providers (Trinity, IELTS SELT, PSI) for demonstrating B1 level English.
- **[Ecctis Qualification Recognition & English Verification](https://www.ecctis.com/)**  
  Official UK national agency designated for recognizing foreign university degrees and satisfying English requirements without SELT exams.
- **[Apply for British Citizenship by Naturalisation (Form AN)](https://www.gov.uk/apply-citizenship-indefinite-leave-to-remain)**  
  Official guidance and requirements for naturalisation after obtaining ILR, including the 450-day 5-year limit and 90-day final 12-month limit.
- **[Good Character Caseworker Guidance](https://www.gov.uk/government/publications/good-character-guidance)**  
  Home Office caseworker criteria for assessing character requirements (tax compliance, fines, legal conduct) during citizenship applications.
- **[Hongkongers in Britain (HKB)](https://www.hongkongers.org.uk/)**  
  Leading registered charity established by Hongkongers in the UK providing resettlement guides, employment workshops, CV clinics, and mental health support.
- **[Hong Kong Watch](https://www.hongkongwatch.org/)**  
  Registered non-governmental organization (NGO) advocating for BNO holders' rights, MPF pension withdrawal policy briefs, and student fee status.
- **[Citizens Advice UK](https://www.citizensadvice.org.uk/)**  
  UK's largest independent advice charity offering free, confidential advice on tenant rights, employment contracts, council tax, and NRPF support.
- **[Hong Kong Well UK](https://www.hongkongwell.uk/)**  
  Registered non-profit Community Interest Company (CIC) providing subsidized Cantonese mental health counseling and SEN educational advice for BNO families.
- **[The Migration Observatory (University of Oxford)](https://migrationobservatory.ox.ac.uk/)**  
  Independent, non-profit academic research unit based at Oxford University providing data-driven analysis of UK migration policy and BNO population trends.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ⚠️ Disclaimer & Privacy Notice

*This application is an **independent, 3rd-party utility** provided for informational and personal tracking purposes only. It is **NOT an official application**, nor is it affiliated with, endorsed by, or connected to the UK Home Office or the UK Government. It does not constitute official legal or immigration advice. All data input into this application (absence history, key dates, qualification details, address history) is stored strictly locally on your device in your browser's `IndexedDB`. No server or remote database is used, and no personal data is collected or transmitted to external services. Always verify your eligibility, rules, and dates against official UK Home Office guidelines before submitting an ILR or Naturalisation application.*
